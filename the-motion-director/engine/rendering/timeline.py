"""Timeline: load, validate, and compile an edit into frame-exact segments.

Timeline JSON (project/08_edit_timelines/<name>.timeline.json). All source paths are project-relative.
Times are seconds; the compiler converts to whole frames so every cut lands exactly on a frame.

clips[]: {
  id, src, kind: "video"|"still",
  in, out  | in, dur            source range (video) / duration (still)
  speed: 1.0, ramp: {from,to,steps}, freeze: false, interp: "none"|"blend"|"mci"
  focus: {x,y}, focus_to: {x,y}, zoom: {from,to}, focus_by_aspect: {"4:5": {x,y}, ...}
  grade: {look, brightness, ...} | "auto": true
  audio: {mode: "keep"|"mute", lead: 0, tail: 0, gain_db: 0, dialogue: false}
  fade_in, fade_out        (dip to/from black, seconds)
  flash_in {color, dur}    (frame-exact flash on the cut)
  role, label, notes, factual_incident: false, integrity_note: ""
}
audio_layers[]: {id, kind: "music_guide"|"music_licensed"|"designed"|"ambience", src, track_id, start, in, dur, gain_db, fade_in, fade_out, duck}
overlays[]: {id, composition: "TypeCard"|"Stamp", props, start, dur, region?: {x,y,w,h}}
captions: path to captions.json (optional)
intentional_silence[]: [[start,end], ...]
"""
from __future__ import annotations

import copy
from pathlib import Path

from engine.utilities.common import Project, TMDError, read_json, tc, write_json
from engine.video.probe import probe

ASPECTS = {"9:16": (1080, 1920), "4:5": (1080, 1350), "1:1": (1080, 1080), "16:9": (1920, 1080)}


def load(project: Project, name: str) -> dict:
    p = project.timelines / (name if name.endswith(".json") else f"{name}.timeline.json")
    tl = read_json(p)
    if tl is None:
        raise TMDError(f"Timeline not found: {p}")
    tl.setdefault("name", p.name.replace(".timeline.json", ""))
    return tl


def list_timelines(project: Project) -> list[str]:
    return sorted(p.name.replace(".timeline.json", "") for p in project.timelines.glob("*.timeline.json"))


def save(project: Project, tl: dict) -> Path:
    p = project.timelines / f"{tl['name']}.timeline.json"
    if p.exists():  # keep history, never overwrite silently
        hist = project.timelines / ".history"
        hist.mkdir(exist_ok=True)
        import time
        write_json(hist / f"{tl['name']}.{time.strftime('%Y%m%d-%H%M%S')}.json", read_json(p))
    write_json(p, tl)
    return p


def validate(project: Project, tl: dict) -> tuple[list[str], list[str]]:
    errs: list[str] = []
    warns: list[str] = []
    meta = project.meta
    doc = bool(tl.get("documentary_mode", meta.get("documentary_mode")))
    if not tl.get("clips"):
        errs.append("timeline has no clips")
    ids = set()
    for i, c in enumerate(tl.get("clips", [])):
        cid = c.get("id") or f"#{i + 1}"
        if cid in ids:
            errs.append(f"duplicate clip id {cid}")
        ids.add(cid)
        src = c.get("src")
        if not src:
            errs.append(f"{cid}: missing src")
            continue
        fp = project.dir / src
        if not fp.is_file():
            errs.append(f"{cid}: source file missing: {src}")
            continue
        if "../" in src:
            errs.append(f"{cid}: src must stay inside the project")
        if c.get("kind", "video") == "video":
            if "in" not in c or ("out" not in c and "dur" not in c):
                errs.append(f"{cid}: needs 'in' and 'out' (or 'dur')")
            else:
                try:
                    info = probe(fp)
                except TMDError as e:
                    errs.append(f"{cid}: unreadable source ({e})")
                    continue
                out = c.get("out", c["in"] + c.get("dur", 0) * c.get("speed", 1.0))
                if c["in"] < 0 or out > info["duration"] + 0.05:
                    errs.append(f"{cid}: range {c['in']}-{out:.2f}s is outside the source ({info['duration']:.2f}s)")
                if out <= c["in"]:
                    errs.append(f"{cid}: out must be after in")
        elif c.get("kind") == "still" and not c.get("dur"):
            errs.append(f"{cid}: still needs dur")
        sp = c.get("speed", 1.0)
        if not (0.1 <= sp <= 8):
            errs.append(f"{cid}: speed {sp} outside 0.1-8")
        changed = sp != 1.0 or c.get("ramp") or c.get("freeze") or c.get("interp", "none") != "none"
        if doc and changed and c.get("factual_incident", True):
            if c.get("interp", "none") in ("mci",):
                errs.append(f"{cid}: optical-flow interpolation is not allowed on factual footage in documentary mode")
            if not c.get("integrity_note"):
                errs.append(f"{cid}: documentary mode: a speed change/freeze on factual footage needs an integrity_note "
                            f"explaining why it does not misrepresent timing (or set factual_incident:false for non-incident material)")
    for l in tl.get("audio_layers", []):
        if l.get("kind") in ("music_guide", "music_licensed", "designed", "ambience"):
            if not (project.dir / l.get("src", "")).is_file():
                errs.append(f"audio layer {l.get('id')}: file missing: {l.get('src')}")
        else:
            errs.append(f"audio layer {l.get('id')}: unknown kind {l.get('kind')}")
        if l.get("kind") == "music_licensed" and not l.get("track_id"):
            errs.append(f"audio layer {l.get('id')}: music_licensed must reference a shortlist track_id")
    from engine.rendering import credits
    for n in credits.missing(project, tl):
        warns.append(f"photo {n}: no photographer/licence on record in 16_licences/photo_credits.json. Draft only: do not publish until cleared.")
    if doc and not tl.get("clips", [{}])[0].get("src"):
        warns.append("documentary mode with no clips")
    if tl.get("canvas", {}).get("fps") and tl["canvas"]["fps"] != meta.get("canvas", {}).get("fps"):
        warns.append("timeline fps differs from project fps")
    return errs, warns


def _even(n: float) -> int:
    return max(2, int(round(n / 2)) * 2)


def compile_plan(project: Project, tl: dict, canvas: dict | None = None) -> dict:
    """Expand ramps, convert times to frames, compute start frames and source maps."""
    meta = project.meta
    cv = {**meta.get("canvas", {"width": 1080, "height": 1920, "fps": 30}), **tl.get("canvas", {}), **(canvas or {})}
    fps = cv["fps"]
    segs: list[dict] = []
    cursor = 0
    infos: dict[str, dict] = {}
    for c in tl["clips"]:
        src = project.dir / c["src"]
        kind = c.get("kind", "video")
        info = infos.get(c["src"]) or infos.setdefault(c["src"], probe(src) if kind == "video" else {"width": None, "height": None})
        speed = float(c.get("speed", 1.0))
        if kind == "video":
            if "dur" in c:
                out_dur = float(c["dur"])
                src_in = float(c["in"])
            else:
                src_in = float(c["in"])
                out_dur = (float(c["out"]) - src_in) / speed
        else:
            src_in, out_dur = 0.0, float(c["dur"])
        nframes = max(1, round(out_dur * fps))
        base = {k: c.get(k) for k in ("id", "role", "label", "notes", "grade", "auto", "audio", "fade_in", "fade_out", "dissolve_in",
                                       "focus", "focus_to", "zoom", "focus_by_aspect", "factual_incident", "integrity_note", "interp", "flash_in")}
        ramp = c.get("ramp")
        if ramp and kind == "video":
            n = int(ramp.get("steps", 8))
            frames_each = [nframes // n + (1 if i < nframes % n else 0) for i in range(n)]
            u = src_in
            z0, z1 = (c.get("zoom") or {}).get("from", 1.0), (c.get("zoom") or {}).get("to", 1.0)
            done = 0
            for i, fe in enumerate(frames_each):
                if fe == 0:
                    continue
                sp = ramp["from"] + (ramp["to"] - ramp["from"]) * (i + 0.5) / n
                segs.append({**base, "id": f"{c['id']}.r{i + 1}", "parent": c["id"], "kind": "video", "src": c["src"], "info": info,
                             "src_in": u, "speed": sp, "frames": fe, "start_frame": cursor + done,
                             "zoom": {"from": z0 + (z1 - z0) * done / nframes, "to": z0 + (z1 - z0) * (done + fe) / nframes} if c.get("zoom") else None,
                             "fade_in": c.get("fade_in") if i == 0 else None, "fade_out": c.get("fade_out") if i == n - 1 else None,
                             "dissolve_in": c.get("dissolve_in") if i == 0 else None,
                             "audio": {"mode": "mute"}, "src_dur": fe / fps * sp})
                u += fe / fps * sp
                done += fe
        else:
            segs.append({**base, "kind": kind, "parent": c["id"], "src": c["src"], "info": info, "src_in": src_in, "speed": speed,
                         "freeze": bool(c.get("freeze")), "frames": nframes, "start_frame": cursor, "src_dur": nframes / fps * speed})
        cursor += nframes
    return {"canvas": {**cv, "width": int(cv["width"]), "height": int(cv["height"])}, "fps": fps, "segments": segs,
            "total_frames": cursor, "duration": cursor / fps}


def source_map(plan: dict) -> list[dict]:
    """Human-readable record of where every frame in the edit came from."""
    fps = plan["fps"]
    out = []
    for s in plan["segments"]:
        if s["kind"] != "video":
            out.append({"clip": s["id"], "type": "still", "source": s["src"], "timeline_in": tc(s["start_frame"] / fps, fps),
                        "timeline_out": tc((s["start_frame"] + s["frames"]) / fps, fps)})
            continue
        out.append({"clip": s["id"], "source": s["src"], "source_in": tc(s["src_in"], s["info"].get("fps") or fps),
                    "source_out": tc(s["src_in"] + s["src_dur"], s["info"].get("fps") or fps),
                    "source_in_seconds": round(s["src_in"], 3), "source_out_seconds": round(s["src_in"] + s["src_dur"], 3),
                    "speed": round(s["speed"], 3), "timeline_in": tc(s["start_frame"] / fps, fps),
                    "timeline_out": tc((s["start_frame"] + s["frames"]) / fps, fps),
                    "factual_incident": s.get("factual_incident"), "integrity_note": s.get("integrity_note")})
    return out


def write_edl(plan: dict, title: str, dst: Path) -> None:
    """CMX 3600 EDL (non-drop). Opens in Resolve/Premiere for conform; reel names are file stems."""
    fps = plan["fps"]
    lines = [f"TITLE: {title}", "FCM: NON-DROP FRAME", ""]
    n = 0
    for s in plan["segments"]:
        if s["kind"] != "video":
            continue
        n += 1
        sfps = s["info"].get("fps") or fps
        reel = Path(s["src"]).stem[:8].upper().replace(" ", "_").ljust(8)
        lines.append(f"{n:03d}  {reel} V     C        {tc(s['src_in'], sfps)} {tc(s['src_in'] + s['src_dur'], sfps)} "
                     f"{tc(s['start_frame'] / fps, fps)} {tc((s['start_frame'] + s['frames']) / fps, fps)}")
        lines.append(f"* FROM CLIP NAME: {Path(s['src']).name}")
        if abs(s["speed"] - 1.0) > 1e-6:
            lines.append(f"M2   {reel}   {s['speed'] * sfps:05.1f}              {tc(s['src_in'], sfps)}")
        lines.append("")
    dst.write_text("\n".join(lines), encoding="utf-8")


def crop_report(plan: dict) -> list[dict]:
    """How much of each source frame is visible in the current canvas (warns on heavy cropping)."""
    cw, ch = plan["canvas"]["width"], plan["canvas"]["height"]
    out = []
    for s in plan["segments"]:
        iw, ih = s["info"].get("width"), s["info"].get("height")
        if not iw:
            continue
        k = max(cw / iw, ch / ih) * ((s.get("zoom") or {}).get("to", 1.0) or 1.0)
        out.append({"clip": s["parent"], "visible_fraction": round((cw / k * ch / k) / (iw * ih), 3)})
    seen: dict[str, dict] = {}
    for o in out:
        seen.setdefault(o["clip"], o)
    return list(seen.values())


def cuts_from_plan(plan: dict) -> list[dict]:
    """One entry per authored clip (speed-ramp sub-segments are merged back into their parent)."""
    fps = plan["fps"]
    out: dict[str, dict] = {}
    for s in plan["segments"]:
        c = out.get(s["parent"])
        if c is None:
            out[s["parent"]] = {"id": s["parent"], "start": s["start_frame"] / fps, "dur": s["frames"] / fps, "role": s.get("role"),
                                "label": s.get("label"), "src": s["src"], "src_in": s["src_in"]}
        else:
            c["dur"] += s["frames"] / fps
    return list(out.values())
