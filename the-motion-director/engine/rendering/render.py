"""The renderer: timeline -> frame-exact segments -> concat -> audio mix -> overlays/captions -> final MP4.

Design choices worth knowing:
- Picture and sound are built separately, so J/L cuts and sound bridges are exact.
- Every clip is rendered to its own intermediate with an exact frame count (cached by content hash),
  so a cut can never drift by a frame.
- Guide music never enters a final export (only previews). A track is embedded only when the
  licensing gate says it is LICENSED_EMBEDDABLE.
"""
from __future__ import annotations

import json
import math
import re
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from engine.audio import licensing
from engine.colour import grade as G
from engine.rendering import timeline as T
from engine.subtitles import captions as C
from engine.utilities.common import (FONTS_DIR, ROOT, Project, TMDError, ffmpeg, file_sig, log, now_iso, progress, read_json, run, sha,
                                     write_json)

SEG_CRF = 12


def _clip(x: str) -> str:
    return x


def reframe_filter(iw: int, ih: int, cw: int, ch: int, focus, focus_to, zoom, nframes: int, fps: float) -> str:
    fx, fy = (focus or {}).get("x", 0.5), (focus or {}).get("y", 0.5)
    tx, ty = (focus_to or {}).get("x", fx), (focus_to or {}).get("y", fy)
    z0, z1 = (zoom or {}).get("from", 1.0), (zoom or {}).get("to", 1.0)
    k = max(cw / iw, ch / ih)
    if abs(z0 - z1) < 1e-6 and abs(tx - fx) < 1e-6 and abs(ty - fy) < 1e-6:
        sw, sh = max(cw, math.ceil(iw * k * z0)), max(ch, math.ceil(ih * k * z0))
        x = min(max(fx * sw - cw / 2, 0), sw - cw)
        y = min(max(fy * sh - ch / 2, 0), sh - ch)
        return f"scale={sw}:{sh}:flags=lanczos,crop={cw}:{ch}:{x:.2f}:{y:.2f}"
    D = max(nframes / fps, 1e-3)
    p = f"min(t/{D:.4f},1)"
    Z = f"({z0:.5f}+({z1 - z0:.5f})*{p})"
    FX = f"({fx:.5f}+({tx - fx:.5f})*{p})"
    FY = f"({fy:.5f}+({ty - fy:.5f})*{p})"
    return (f"scale=w='max({cw},ceil({iw * k:.4f}*{Z}))':h='max({ch},ceil({ih * k:.4f}*{Z}))':eval=frame:flags=lanczos,"
            f"crop={cw}:{ch}:x='clip({FX}*iw-ow/2,0,iw-ow)':y='clip({FY}*ih-oh/2,0,ih-oh)'")


def aspect_key(cw: int, ch: int) -> str:
    for k, (w, h) in T.ASPECTS.items():
        if abs(cw / ch - w / h) < 0.01:
            return k
    return "custom"


def halftone(src_png: Path, dst: Path, cell: int = 7) -> Path:
    """Red halftone print: dot size follows darkness on a black ground, like a screen-printed poster."""
    import cv2
    import numpy as np
    im = cv2.imread(str(src_png), cv2.IMREAD_GRAYSCALE)
    h, w = im.shape
    im = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(im)
    cell = max(4, int(round(w / 190)))
    out = np.zeros((h, w, 3), np.uint8)
    small = cv2.resize(im, (w // cell, h // cell), interpolation=cv2.INTER_AREA)
    for yy in range(small.shape[0]):
        for xx in range(small.shape[1]):
            v = small[yy, xx] / 255.0
            r = int(round(cell * 0.62 * (v ** 0.8)))
            if r > 0:
                cv2.circle(out, (xx * cell + cell // 2, yy * cell + cell // 2), r, (31, 20, 224), -1, cv2.LINE_AA)  # BGR red
    cv2.imwrite(str(dst), out)
    return dst


def _seg_cmd(project: Project, tl: dict, s: dict, plan: dict, dst: Path, vs_grain: float) -> list[str]:
    cv, fps = plan["canvas"], plan["fps"]
    cw, ch = cv["width"], cv["height"]
    N = s["frames"]
    src = project.dir / s["src"]
    info = s["info"]
    fb = (s.get("focus_by_aspect") or {}).get(aspect_key(cw, ch))
    focus = fb or s.get("focus")
    chain: list[str] = []
    if s["kind"] == "still":
        from PIL import Image, ImageOps
        norm = project.work / "stills" / f"{sha(file_sig(src))}.png"
        if not norm.exists():
            norm.parent.mkdir(exist_ok=True)
            im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
            m = max(cw, ch) * 1.6 / max(im.size)
            if m < 1:
                im = im.resize((round(im.width * m), round(im.height * m)), Image.LANCZOS)
            im.save(norm)
        if s.get("treat") == "halftone_red":
            ht = project.work / "stills" / f"{sha(file_sig(src), 'halftone-v1')}.png"
            if not ht.exists():
                halftone(norm, ht)
            norm = ht
        with Image.open(norm) as im:
            iw, ih = im.size
        inp = ["-loop", "1", "-framerate", str(fps), "-i", str(norm)]
        chain.append(f"fps={fps}")
    else:
        iw, ih = info["width"], info["height"]
        inp = ["-ss", f"{s['src_in']:.4f}", "-t", f"{s['src_dur'] + 0.6:.4f}", "-i", str(src)]
        if s.get("freeze"):
            chain += ["trim=end_frame=1", "loop=loop=-1:size=1:start=0", f"fps={fps}"]
        else:
            chain.append(f"setpts=(PTS-STARTPTS)/{s['speed']:.5f}")
            interp = s.get("interp") or "none"
            chain.append(f"minterpolate=fps={fps}:mi_mode={interp}" if interp in ("blend", "mci") else f"fps={fps}")
    cr = s.get("crop")  # {"x","y","w","h"} as fractions of the source: trims blur-padding, borders, watermark margins
    if cr:
        cx, cy, cwf, chf = (int(round(iw * cr["x"])), int(round(ih * cr["y"])), int(round(iw * cr["w"])) // 2 * 2, int(round(ih * cr["h"])) // 2 * 2)
        chain.append(f"crop={cwf}:{chf}:{cx}:{cy}")
        iw, ih = cwf, chf
    chain.append(reframe_filter(iw, ih, cw, ch, focus, s.get("focus_to"), s.get("zoom"), N, fps))
    if s.get("treat") and G.TREATS.get(s["treat"]):
        chain.append(G.TREATS[s["treat"]])
    g = s.get("grade")
    if s.get("auto") and s.get("auto_grade"):
        g = G.merge(s["auto_grade"], g)
    chain += G.filters(G.resolve(g, tl.get("grade")))
    if vs_grain:
        chain.append(f"noise=alls={int(vs_grain)}:allf=t")
    fl = s.get("flash_in")  # {"color": "white"|"black", "dur": seconds}: a frame-exact flash on the cut
    if fl:
        chain.append(f"fade=t=in:st=0:d={fl.get('dur', 0.08)}:color={fl.get('color', 'white')}")
    fi, fo = s.get("fade_in"), s.get("fade_out")
    if fi:
        chain.append(f"fade=t=in:st=0:d={fi}")
    if fo:
        chain.append(f"fade=t=out:st={max(0, N / fps - fo):.4f}:d={fo}")
    chain += ["format=yuv420p", "setsar=1"]
    return ["-hide_banner", "-nostdin", "-y", "-loglevel", "error", *inp, "-an", "-vf", ",".join(chain), "-frames:v", str(N), "-r", str(fps),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", str(SEG_CRF), "-pix_fmt", "yuv420p", "-g", str(int(fps)),
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", str(dst)]


def render_segments(project: Project, tl: dict, plan: dict, work: Path, vs: dict) -> list[Path]:
    seg_dir = work / "segments"
    seg_dir.mkdir(parents=True, exist_ok=True)
    auto = {}
    inv = read_json(project.analysis / "inventory.json") or {}
    shots = {a["rel_path"]: [s for s in inv.get("shots", []) if s["asset"] == a["id"]] for a in inv.get("assets", [])}
    jobs = []
    for s in plan["segments"]:
        if s.get("auto") and s["kind"] == "video":
            cand = [x for x in shots.get(s["src"], []) if x["start"] - 0.05 <= s["src_in"] <= x["end"]]
            if cand:
                s["auto_grade"] = G.auto_correct(cand[0])
        cmd = _seg_cmd(project, tl, s, plan, Path("SEG"), float(vs.get("grain", 0) or 0))
        key = sha(cmd, file_sig(project.dir / s["src"]))
        dst = seg_dir / f"{key}.mp4"
        s["_seg"] = dst
        if not dst.exists():
            cmd[-1] = str(dst.with_suffix(".part.mp4"))
            jobs.append((s, cmd, dst))
    done = 0

    def work_one(job):
        s, cmd, dst = job
        p = subprocess.run(["ffmpeg", *cmd], capture_output=True, text=True)
        if p.returncode != 0:
            raise TMDError(f"segment render failed for clip {s['id']}:\n{p.stderr[-1200:]}")
        dst.with_suffix(".part.mp4").rename(dst)

    with ThreadPoolExecutor(max_workers=2) as ex:
        for _ in ex.map(work_one, jobs):
            done += 1
            progress(0.05 + 0.4 * done / max(1, len(jobs)), f"segments {done}/{len(jobs)}")
    return [s["_seg"] for s in plan["segments"]]


def concat(segs: list[Path], dst: Path) -> None:
    lst = dst.with_suffix(".txt")
    lst.write_text("".join(f"file '{p}'\n" for p in segs))
    ffmpeg(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(dst)])


def _atempo(speed: float) -> str:
    parts = []
    while speed > 2.0:
        parts.append("atempo=2.0"); speed /= 2
    while speed < 0.5:
        parts.append("atempo=0.5"); speed /= 0.5
    parts.append(f"atempo={speed:.5f}")
    return ",".join(parts)


def build_audio_pieces(project: Project, tl: dict, plan: dict, work: Path, variant: dict, mode: str, warnings: list[str]) -> list[dict]:
    fps = plan["fps"]
    total = plan["duration"]
    pieces: list[dict] = []
    adir = work / "audio_pieces"
    adir.mkdir(exist_ok=True)
    buses = variant.get("buses", {"natural", "designed", "music"})
    # natural sound per original clip
    parents: dict[str, list[dict]] = {}
    for s in plan["segments"]:
        parents.setdefault(s["parent"], []).append(s)
    clip_by_id = {c["id"]: c for c in tl["clips"]}
    for pid, segs in parents.items():
        c = clip_by_id[pid]
        s0 = segs[0]
        if s0["kind"] != "video" or not s0["info"].get("has_audio") or "natural" not in buses:
            continue
        a = c.get("audio") or {}
        speed = float(c.get("speed", 1.0))
        mode_a = a.get("mode") or ("keep" if (speed == 1.0 and not c.get("ramp") and not c.get("freeze")) else "mute")
        if mode_a == "mute":
            continue
        if c.get("ramp") or c.get("freeze"):
            warnings.append(f"{pid}: sound is muted on ramped/frozen clips")
            continue
        start = s0["start_frame"] / fps
        dur_out = sum(x["frames"] for x in segs) / fps
        lead = min(float(a.get("lead", 0.0)), start, s0["src_in"])
        tail = float(a.get("tail", 0.0))
        t0 = s0["src_in"] - lead
        win = lead + dur_out * speed + tail
        gain = float(a.get("gain_db", 0.0))
        dst = adir / f"nat_{sha(file_sig(project.dir / s0['src']), t0, win, gain, speed)}.wav"
        if not dst.exists():
            af = ["aresample=48000", "aformat=sample_fmts=fltp:channel_layouts=stereo"]
            if speed != 1.0:
                af.append(_atempo(speed))
            af += [f"volume={gain}dB", "afade=t=in:d=0.012", f"afade=t=out:st={max(0, win / speed - 0.012):.4f}:d=0.012"]
            ffmpeg(["-ss", f"{t0:.4f}", "-t", f"{win / speed:.4f}", "-i", str(project.dir / s0["src"]), "-vn", "-af", ",".join(af), "-c:a", "pcm_f32le", str(dst)])
        pieces.append({"bus": "dialogue" if a.get("dialogue") else "natural", "file": dst, "start": start - lead, "id": f"clip:{pid}"})
    # layers
    for l in tl.get("audio_layers", []):
        kind = l["kind"]
        if kind == "voiceover":
            bus = "dialogue"
        elif kind in ("music_guide", "music_licensed"):
            if "music" not in buses:
                continue
            if kind == "music_guide" and mode != "preview":
                continue  # guide tracks never ship in a final export
            if kind == "music_licensed":
                ok, why = licensing.can_embed(project, l.get("track_id"))
                if not ok:
                    warnings.append(f"layer {l['id']}: NOT embedded ({why}); use Instagram's own music library instead")
                    if mode != "preview":
                        continue
            bus = "music"
        elif kind in ("designed", "ambience"):
            if "designed" not in buses:
                continue
            bus = "designed"
        else:
            continue
        start = float(l.get("start", 0.0))
        dur = float(l.get("dur", total - start))
        dur = min(dur, total - start)
        t0 = float(l.get("in", 0.0))
        gain = float(l.get("gain_db", -6.0 if bus == "music" else 0.0))
        fi, fo = float(l.get("fade_in", 0.0)), float(l.get("fade_out", 0.0))
        dst = adir / f"layer_{sha(file_sig(project.dir / l['src']), t0, dur, gain, fi, fo)}.wav"
        if not dst.exists():
            af = ["aresample=48000", "aformat=sample_fmts=fltp:channel_layouts=stereo"]
            if kind == "voiceover":  # clean up a synthetic read: rumble out, gentle compression, a little presence
                af += ["highpass=f=90", "acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=3", "equalizer=f=3200:t=q:w=1:g=2"]
            af.append(f"volume={gain}dB")
            af.append(f"afade=t=in:d={fi or 0.012}")
            af.append(f"afade=t=out:st={max(0, dur - (fo or 0.012)):.4f}:d={fo or 0.012}")
            ffmpeg(["-ss", f"{t0:.4f}", "-t", f"{dur:.4f}", "-i", str(project.dir / l["src"]), "-vn", "-af", ",".join(af), "-c:a", "pcm_f32le", str(dst)])
        pieces.append({"bus": bus, "file": dst, "start": start, "id": f"layer:{l['id']}", "duck": bool(l.get("duck", bus == "music"))})
    return pieces


def mix_audio(pieces: list[dict], total: float, dst: Path, loud: dict, report: dict) -> bool:
    if not pieces:
        return False
    inputs, fc, bus_in = [], [], {}
    for i, p in enumerate(pieces):
        inputs += ["-i", str(p["file"])]
        ms = int(round(max(0.0, p["start"]) * 1000))
        fc.append(f"[{i}:a]adelay={ms}|{ms}[p{i}]")
        bus_in.setdefault(p["bus"], []).append(f"[p{i}]")
    names = {}
    for bus, ins in bus_in.items():
        fc.append("".join(ins) + f"amix=inputs={len(ins)}:normalize=0:duration=longest[{bus}]")
        names[bus] = f"[{bus}]"
    duck = any(p.get("duck") for p in pieces if p["bus"] == "music")
    if duck and "dialogue" in names and "music" in names:
        fc.append(f"[dialogue]apad=whole_dur={total:.4f},asplit=2[dialogue][dlg_sc]")  # pad: sidechain must not end before the music
        fc.append("[music][dlg_sc]sidechaincompress=threshold=0.02:ratio=6:attack=15:release=400:makeup=1[music]")
        names["music"] = "[music]"
        report["ducking"] = "music ducked under dialogue"
    mixed = "".join(f"[{b}]" for b in names)
    fc.append(f"{mixed}amix=inputs={len(names)}:normalize=0:duration=longest,apad=whole_dur={total:.4f},atrim=0:{total:.4f},alimiter=limit=0.97[mix]")
    pre = dst.with_name(dst.stem + "_pre.wav")
    ffmpeg([*inputs, "-filter_complex", ";".join(fc), "-map", "[mix]", "-c:a", "pcm_f32le", "-ar", "48000", str(pre)])
    I = loud.get("integrated_lufs", -14.0)
    TP = loud.get("true_peak_dbtp", -1.0) - 0.6  # AAC encoding overshoots the pre-encode peak; leave margin so the delivered file stays under the ceiling
    p = run(["ffmpeg", "-hide_banner", "-nostdin", "-i", str(pre), "-af", f"loudnorm=I={I}:TP={TP}:LRA=11:print_format=json", "-f", "null", "-"], check=False)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    if not m:
        shutil.copy(pre, dst)
        report["loudnorm"] = "measurement failed; mix left un-normalised"
        return True
    meas = json.loads(m.group(0))
    if meas["input_i"] in ("-inf", "inf") or float(meas["input_i"]) < -60:
        shutil.copy(pre, dst)
        report["loudnorm"] = "programme is effectively silent; not normalised"
        return True
    gain = I - float(meas["input_i"])
    report["loudnorm"] = {"measured_lufs": float(meas["input_i"]), "measured_tp": float(meas["input_tp"]), "gain_applied_db": round(gain, 1), "target_lufs": I, "target_tp": TP}
    if gain > 12:
        report.setdefault("warnings", []).append(f"loudness normalisation added {gain:.1f} dB: the source mix is very quiet, so noise will be raised too. Check it by ear.")
    ln = (f"loudnorm=I={I}:TP={TP}:LRA=11:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:measured_LRA={meas['input_lra']}"
          f":measured_thresh={meas['input_thresh']}:offset={meas['target_offset']}:linear=true")
    ffmpeg(["-i", str(pre), "-af", ln + ",aresample=48000", "-c:a", "pcm_f32le", str(dst)])
    return True


def esc_filter_path(p: Path) -> str:
    return str(p).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'").replace(",", "\\,")


def make_top_band(cfg: dict, w: int, h: int, dst: Path) -> Path:
    """A red band across the top of the frame: solid at the edge, bleeding down into the picture, with grain so it
    belongs to the photocopy texture instead of sitting on top of it like a UI bar."""
    import numpy as np
    from PIL import Image
    col = cfg.get("color", "#D90F1B").lstrip("#")
    rgb = np.array([int(col[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)
    solid, fade = float(cfg.get("solid", 0.07)), float(cfg.get("height", 0.2))
    y = np.arange(h, dtype=np.float32) / h
    a = np.where(y <= solid, 1.0, np.clip(1 - (y - solid) / max(1e-3, fade - solid), 0, 1) ** 1.6) * float(cfg.get("opacity", 0.94))
    rng = np.random.default_rng(3)
    grain = rng.normal(0, 14, (h, w, 1)).astype(np.float32)
    img = np.clip(rgb[None, None, :] + grain, 0, 255)
    # dark, uneven edge along the solid part: ink-on-paper bleed
    streak = (rng.random((h, 1)) * 0.25)[:, :] * (y[:, None] < solid + 0.02)
    img = img * (1 - streak[:, :, None])
    alpha = np.clip(a[:, None] * (1 + rng.normal(0, 0.05, (h, w))), 0, 1)
    out = np.dstack([img, alpha[:, :, None] * 255]).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(dst)
    return dst


def render_overlay(project: Project, ov: dict, canvas: dict, vs: dict, work: Path) -> Path:
    props = {**ov.get("props", {}), "composition": ov["composition"], "visual": vs}
    fps = canvas["fps"]
    frames = max(1, round(float(ov["dur"]) * fps))
    key = sha(props, canvas, frames)
    out = project.motion / "renders" / f"{ov['composition']}_{key}.mov"
    if out.exists():
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    pj = work / f"props_{key}.json"
    write_json(pj, props)
    node = shutil.which("node")
    if not node:
        raise TMDError("node is required for motion graphics overlays (Remotion).")
    mot = ROOT / "engine" / "motion"
    if not (mot / "node_modules").is_dir():
        raise TMDError("Remotion is not installed. Run: cd engine/motion && npm install")
    p = subprocess.run([node, str(mot / "render.mjs"), "--comp", ov["composition"], "--props", str(pj), "--out", str(out),
                        "--width", str(canvas["width"]), "--height", str(canvas["height"]), "--fps", str(fps), "--frames", str(frames)],
                       capture_output=True, text=True, cwd=mot, timeout=600)
    if p.returncode != 0 or not out.exists():
        raise TMDError(f"Remotion overlay '{ov.get('id')}' failed:\n{(p.stderr or p.stdout)[-1500:]}")
    return out


VARIANTS = {
    "full": {"captions": True, "overlays": True, "buses": {"natural", "designed", "music"}},
    "clean": {"captions": False, "overlays": True, "buses": {"natural", "designed", "music"}},
    "muted": {"captions": True, "overlays": True, "buses": set()},
    "natural_only": {"captions": True, "overlays": True, "buses": {"natural"}},
}


def render(project: Project, tl_name: str, mode: str = "final", variant: str = "full", aspect: str | None = None,
           scale: float | None = None) -> dict:
    """mode 'preview': half-size, guide music included, fast. mode 'final': full size, no guide music."""
    tl = T.load(project, tl_name)
    errs, warns = T.validate(project, tl)
    if errs:
        raise TMDError("Timeline is not valid:\n  - " + "\n  - ".join(errs))
    vsys = read_json(project.motion / "visual_system.json", {}) or {}
    vcfg = VARIANTS[variant]
    aspect = aspect or project.meta.get("default_aspect", "9:16")
    if aspect not in T.ASPECTS:
        raise TMDError(f"Unknown aspect '{aspect}'. Available: {', '.join(T.ASPECTS)}")
    base_w, base_h = T.ASPECTS[aspect]
    cv0 = project.meta.get("canvas", {})
    if scale is None:
        scale = 0.5 if mode == "preview" else 1.0
    cw, ch = T._even(base_w * scale), T._even(base_h * scale)
    canvas = {"width": cw, "height": ch, "fps": tl.get("canvas", {}).get("fps", cv0.get("fps", 30))}
    plan = T.compile_plan(project, tl, canvas)
    work = project.work / tl["name"]
    work.mkdir(parents=True, exist_ok=True)
    report: dict = {"timeline": tl["name"], "mode": mode, "variant": variant, "aspect": aspect, "canvas": canvas, "started": now_iso(), "warnings": list(warns)}
    progress(0.02, "compiling")
    segs = render_segments(project, tl, plan, work, vsys)
    silent = work / f"video_{cw}x{ch}.mp4"
    concat(segs, silent)
    progress(0.5, "audio")
    awarn: list[str] = []
    pieces = build_audio_pieces(project, tl, plan, work, vcfg, mode, awarn)
    report["warnings"] += awarn
    audio = work / f"mix_{variant}_{mode}.wav"
    has_audio = mix_audio(pieces, plan["duration"], audio, project.meta.get("loudness", {}), report) if vcfg["buses"] else False
    progress(0.65, "motion graphics")
    inputs = ["-i", str(silent)]
    fc, last = [], "[0:v]"
    n_in = 1
    ovs = tl.get("overlays", []) if vcfg["overlays"] else []
    if tl.get("top_band"):
        band = make_top_band({**{"color": vsys.get("accent", "#D90F1B")}, **tl["top_band"]}, cw, ch, work / f"top_band_{cw}x{ch}.png")
        inputs += ["-loop", "1", "-framerate", str(canvas["fps"]), "-i", str(band)]
        fc.append(f"{last}[{n_in}:v]overlay=0:0:shortest=1[vb]")
        last = "[vb]"
        n_in += 1
    for i, ov in enumerate(ovs):
        mov = render_overlay(project, ov, canvas, vsys, work)
        inputs += ["-i", str(mov)]
        st, en = float(ov["start"]), float(ov["start"]) + float(ov["dur"])
        fc.append(f"[{n_in}:v]setpts=PTS-STARTPTS+{st:.4f}/TB,format=yuva420p[ov{i}]")
        fc.append(f"{last}[ov{i}]overlay=0:0:eof_action=pass:enable='between(t,{st:.4f},{en:.4f})'[v{i}]")
        last = f"[v{i}]"
        n_in += 1
    layout = []
    cap_path = tl.get("captions")
    if vcfg["captions"] and cap_path:
        caps = read_json(project.dir / cap_path, {}) or {}
        if caps.get("items"):
            ass, layout = C.build_ass(caps, canvas, vsys)
            ass_f = work / f"captions_{cw}x{ch}.ass"
            ass_f.write_text(ass, encoding="utf-8")
            fc.append(f"{last}ass=filename='{esc_filter_path(ass_f)}':fontsdir='{esc_filter_path(FONTS_DIR)}'[vc]")
            last = "[vc]"
            report["caption_issues"] = C.check_layout(layout, canvas)
            report["warnings"] += report["caption_issues"]
    if not fc:
        fc.append(f"{last}null[vout]")
    else:
        fc.append(f"{last}null[vout]")
    if has_audio:
        inputs += ["-i", str(audio)]
    out_dir = project.previews if mode == "preview" else project.exports / tl["name"]
    out_dir.mkdir(parents=True, exist_ok=True)
    from engine.rendering import credits as _cr
    uncleared = _cr.missing(project, tl)
    if uncleared:
        report["warnings"].append(f"{len(uncleared)} photograph(s) have no photographer/licence on record: this file is marked UNCLEARED-DRAFT and must not be published until they are cleared.")
    report["uncleared_photos"] = uncleared
    stem = f"{tl['name']}_{variant}_{aspect.replace(':', 'x')}" + ("_UNCLEARED-DRAFT" if uncleared else "")
    out = out_dir / (f"{tl['name']}_preview.mp4" if mode == "preview" and variant == "full" and aspect == project.meta.get("default_aspect", "9:16") and not uncleared else f"{stem}{'_preview' if mode == 'preview' else ''}.mp4")
    crf = "24" if mode == "preview" else "15"
    cmd = [*inputs, "-filter_complex", ";".join(fc), "-map", "[vout]"]
    if has_audio:
        cmd += ["-map", f"{n_in}:a", "-c:a", "aac", "-b:a", "192k" if mode != "preview" else "128k", "-ar", "48000", "-ac", "2"]
    else:
        cmd += ["-an"]
    cmd += ["-t", f"{plan['duration']:.4f}", "-r", str(canvas["fps"]), "-c:v", "libx264", "-preset", "medium" if mode == "final" else "veryfast",
            "-crf", crf, "-profile:v", "high", "-pix_fmt", "yuv420p", "-maxrate", "16M" if mode == "final" else "6M", "-bufsize", "32M" if mode == "final" else "12M",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart", str(out)]
    progress(0.8, "encoding")
    ffmpeg(cmd)
    # sidecar records
    T.write_edl(plan, tl["name"], out_dir / f"{tl['name']}.edl") if mode == "final" else None
    write_json(out_dir / f"{tl['name']}.source_map.json", T.source_map(plan)) if mode == "final" else None
    write_json(work / "plan_summary.json", {"cuts": T.cuts_from_plan(plan), "duration": plan["duration"], "fps": plan["fps"], "canvas": canvas})
    if mode == "final":
        music_notes(project, tl, out_dir)
        from engine.rendering import credits
        credits.write_credits_md(project, tl, out_dir / "CREDITS.md")
    report.update({"output": str(out.relative_to(project.dir)), "duration": plan["duration"], "frames": plan["total_frames"], "caption_layout": layout,
                   "crop_report": T.crop_report(plan), "finished": now_iso()})
    write_json(out.with_suffix(".render.json"), report)
    progress(1.0, "done")
    return report


def music_notes(project: Project, tl: dict, out_dir: Path) -> None:
    layers = [l for l in tl.get("audio_layers", []) if l["kind"] in ("music_guide", "music_licensed")]
    tracks = {t["id"]: t for t in licensing.load(project)["tracks"]}
    lines = ["# Music notes\n", "The exported video does not contain any music that is not cleared for embedding.\n"]
    if not layers:
        lines.append("No music layers in this timeline.\n")
    for l in layers:
        t = tracks.get(l.get("track_id") or "", {})
        ok, why = licensing.can_embed(project, l.get("track_id")) if l["kind"] == "music_licensed" else (False, "guide track")
        lines.append(f"## {t.get('title') or l.get('src')} {('by ' + t['artist']) if t.get('artist') else ''}")
        lines.append(f"- Layer: `{l['id']}` ({l['kind']}), embedded in final: **{'yes' if ok else 'no'}** ({why})")
        lines.append(f"- Starts in the video at {float(l.get('start', 0)):.2f}s, using the track from {float(l.get('in', 0)):.2f}s")
        lines.append(f"- Instagram availability: {t.get('instagram_status', 'NOT VERIFIED')}; licence: {t.get('licence_status', 'NOT VERIFIED')}")
        if not ok:
            lines.append(f"- To use it: upload this export (it carries no music), then in Instagram's editor choose Audio and search for the track. "
                         f"Set Instagram's start point to {float(l.get('in', 0)):.1f}s so the song's phrase lands where this edit expects it, "
                         f"and align the track's first cue to {float(l.get('start', 0)):.1f}s in the video. Check that it is available for your account type and region first; "
                         f"availability and permitted use differ for business/commercial accounts and for boosted posts.")
        lines.append("")
    (out_dir / "MUSIC_NOTES.md").write_text("\n".join(lines), encoding="utf-8")
