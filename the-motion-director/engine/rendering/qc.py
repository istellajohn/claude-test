"""Quality control on a rendered file. A render that completed is not a render that is right."""
from __future__ import annotations

import re
from pathlib import Path

import numpy as np

from engine.analysis import media_audio as ma
from engine.utilities.common import Project, now_iso, read_json, run, write_json, ffmpeg
from engine.video.probe import probe


def _detect(path: Path, vf: str | None, af: str | None) -> str:
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-i", str(path)]
    cmd += ["-vf", vf, "-an"] if vf else ["-af", af, "-vn"]
    return run(cmd + ["-f", "null", "-"], check=False).stderr


def check(project: Project, mp4: Path, expect: dict | None = None, plan_summary: dict | None = None, render_report: dict | None = None) -> dict:
    expect = expect or {}
    info = probe(mp4)
    items: list[dict] = []

    def add(name, ok, detail, level="error"):
        items.append({"check": name, "status": "pass" if ok else level, "detail": detail})

    cw, ch, fps = expect.get("width", 1080), expect.get("height", 1920), expect.get("fps", 30)
    add("resolution", (info["width"], info["height"]) == (cw, ch), f"{info['width']}x{info['height']} (expected {cw}x{ch})")
    add("frame_rate", abs(info["fps"] - fps) < 0.01 and not info["vfr"], f"{info['fps']} fps, vfr={info['vfr']} (expected {fps} constant)")
    add("codec", info["vcodec"] == "h264" and info["pix_fmt"] == "yuv420p", f"{info['vcodec']} {info.get('profile')} {info['pix_fmt']}")
    add("colour_tags", info.get("color_space") in ("bt709", None) and info.get("color_primaries") in ("bt709", None), f"space={info.get('color_space')} primaries={info.get('color_primaries')} range={info.get('color_range')}", "warn")
    if expect.get("audio", True):
        add("audio_stream", info["has_audio"] and info.get("acodec") == "aac" and info.get("sample_rate") == 48000, f"{info.get('acodec')} {info.get('sample_rate')} Hz {info.get('channels')} ch")
    else:
        add("audio_stream", not info["has_audio"], "muted variant has no audio" if not info["has_audio"] else "unexpected audio stream")
    if plan_summary:
        add("duration_vs_plan", abs(info["duration"] - plan_summary["duration"]) < 0.1, f"{info['duration']:.3f}s vs planned {plan_summary['duration']:.3f}s")
        if info.get("nb_frames"):
            add("frame_count", abs(info["nb_frames"] - round(plan_summary["duration"] * plan_summary["fps"])) <= 1, f"{info['nb_frames']} frames vs {round(plan_summary['duration'] * plan_summary['fps'])}")
    # picture
    black = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", _detect(mp4, "blackdetect=d=0.1:pic_th=0.98:pix_th=0.10", None))
    intentional_black = expect.get("allow_black", [])
    bad_black = [(float(a), float(b)) for a, b in black if not any(abs(float(a) - x) < 0.5 or float(a) <= 0.05 for x, _ in intentional_black)]
    add("black_frames", not bad_black, "none" if not bad_black else f"black spans at {[(round(a, 2), round(b, 2)) for a, b in bad_black]}", "warn")
    frz = re.findall(r"freeze_start: ([\d.]+)", _detect(mp4, "freezedetect=n=-60dB:d=0.7", None))
    add("frozen_picture", not frz or expect.get("has_stills"), "none" if not frz else f"frozen at {[float(x) for x in frz]} (fine if deliberate: stills/freeze frames)", "warn")
    # sound
    if info["has_audio"]:
        lo = ma.loudness(mp4)
        tgt = expect.get("lufs", -14.0)
        add("loudness", lo["integrated_lufs"] is not None and abs(lo["integrated_lufs"] - tgt) <= 1.5 or (lo["integrated_lufs"] or 0) < -60,
            f"{lo['integrated_lufs']} LUFS integrated (target {tgt}), LRA {lo['lra']}", "warn")
        add("true_peak", lo["true_peak_dbtp"] is not None and lo["true_peak_dbtp"] <= -0.9, f"{lo['true_peak_dbtp']} dBTP (ceiling -1.0)")
        cl = ma.clipping(mp4)
        add("clipping", not (cl["peak_db"] is not None and cl["peak_db"] >= -0.05 and (cl["peak_count"] or 0) > 2), f"peak {cl['peak_db']} dB, peak count {cl['peak_count']}")
        sil = ma.silences(mp4, -55.0, 0.4)
        allowed = expect.get("intentional_silence", [])
        unplanned = [s for s in sil if not any(a - 0.25 <= s["start"] and s["end"] <= b + 0.25 for a, b in allowed)]
        add("accidental_silence", not unplanned, "none" if not unplanned else f"silent spans (not marked intentional): {[(s['start'], s['end']) for s in unplanned]}", "warn")
        add("av_duration", abs(info["duration"] - float(run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=duration', '-of', 'csv=p=0', str(mp4)]).stdout.strip() or info["duration"])) < 0.1, "audio and video durations agree")
    # captions and crop
    if render_report:
        for issue in render_report.get("caption_issues", []):
            add("caption_safe_area", False, issue, "warn")
        small = [c for c in render_report.get("crop_report", []) if c["visible_fraction"] < 0.35]
        add("crop", not small, "all clips keep at least 35% of the source frame" if not small else f"heavy crop on {[c['clip'] + ' ' + str(c['visible_fraction']) for c in small]}: check the framing is intentional", "warn")
        for w in render_report.get("warnings", []):
            if "NOT embedded" in w or "timeline fps" in w:
                add("render_warning", False, w, "warn")
    # pacing stats from plan
    pacing = None
    if plan_summary and plan_summary.get("cuts"):
        d = np.array([c["dur"] for c in plan_summary["cuts"]])
        pacing = {"cuts": len(d), "median_shot_s": round(float(np.median(d)), 2), "shortest_s": round(float(d.min()), 2), "longest_s": round(float(d.max()), 2),
                  "cuts_per_10s": round(len(d) / max(0.1, plan_summary["duration"]) * 10, 1)}
    status = "fail" if any(i["status"] == "error" for i in items) else ("pass_with_warnings" if any(i["status"] == "warn" for i in items) else "pass")
    res = {"file": mp4.name, "checked": now_iso(), "status": status, "items": items, "pacing": pacing,
           "not_automated": ["Frame-accurate cut feel and emotional pacing (watch it)", "Factual accuracy of captions and context", "Whether the music choice serves the footage",
                             "Identity/safety review of people shown", "Licensing of any embedded music (see MUSIC_NOTES.md)"]}
    write_json(mp4.with_suffix(".qc.json"), res)
    return res


def contact_sheet(mp4: Path, dst: Path, every: float = 1.0, cols: int = 8, tile_w: int = 160) -> None:
    ffmpeg(["-i", str(mp4), "-vf", f"fps=1/{every},scale={tile_w}:-2,tile={cols}x{max(1, int(np.ceil((probe(mp4)['duration'] / every) / cols)))}", "-frames:v", "1", str(dst)], check=False)


def pick_poster(mp4: Path, dst: Path, avoid_edges: float = 0.4) -> dict:
    """Choose the sharpest, well-exposed frame away from the edges, preferring a face if one is found."""
    import cv2
    info = probe(mp4)
    cc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    best, best_t = -1.0, None
    n = max(6, int(info["duration"] * 3))
    tmp = dst.with_suffix(".tmp.png")
    for i in range(n):
        t = avoid_edges + (info["duration"] - 2 * avoid_edges) * i / max(1, n - 1)
        ffmpeg(["-ss", f"{t:.3f}", "-i", str(mp4), "-frames:v", "1", "-vf", "scale=360:-2", str(tmp)], check=False)
        im = cv2.imread(str(tmp))
        if im is None:
            continue
        g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        sharp = float(cv2.Laplacian(g, cv2.CV_64F).var())
        luma = float(g.mean())
        expo = 1 - min(1.0, abs(luma - 118) / 118)
        faces = len(cc.detectMultiScale(g, 1.15, 5, minSize=(30, 30)))
        sc = np.log1p(sharp) * (0.4 + expo) * (1.4 if faces else 1.0)
        if sc > best:
            best, best_t = sc, t
    if tmp.exists():
        tmp.unlink()
    if best_t is None:
        return {}
    ffmpeg(["-ss", f"{best_t:.3f}", "-i", str(mp4), "-frames:v", "1", "-q:v", "2", str(dst)])
    return {"time": round(best_t, 3), "file": dst.name}
