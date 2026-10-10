"""Ingest: inspect every asset and build a structured, searchable inventory and shot log.

Everything this produces is a MACHINE SUGGESTION for a human editor to review. Tags such as
'hero_candidate' or 'human' are heuristics (sharpness, exposure, face detection, optical flow),
never judgements of meaning.
"""
from __future__ import annotations

import bisect
import csv
import subprocess
from pathlib import Path

import numpy as np

from engine.analysis import media_audio as ma
from engine.utilities.common import (AUDIO_EXT, IMAGE_EXT, VIDEO_EXT, Project, TMDError, file_sig, ffmpeg, log,
                                     now_iso, progress, read_json, tc, write_json)
from engine.video.probe import probe

ANALYSIS_VERSION = 3
SAMPLE_FPS = 12
THUMB_W = 360


def _cv():
    try:
        import cv2
        return cv2
    except ImportError as e:  # pragma: no cover
        raise TMDError("opencv is required for ingest: pip install opencv-python-headless") from e


def detect_scenes(path: Path, duration: float) -> list[tuple[float, float]]:
    try:
        from scenedetect import AdaptiveDetector, detect
    except ImportError as e:  # pragma: no cover
        raise TMDError("PySceneDetect is required for ingest: pip install scenedetect") from e
    scenes = detect(str(path), AdaptiveDetector(adaptive_threshold=3.0, min_scene_len=8), show_progress=False)
    if not scenes:
        return [(0.0, duration)]
    out = [(s.get_seconds(), e.get_seconds()) for s, e in scenes]
    out[0] = (0.0, out[0][1])
    out[-1] = (out[-1][0], max(out[-1][1], duration))
    return out


def stream_frames(path: Path, w: int, h: int, fps: int = SAMPLE_FPS):
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-loglevel", "error", "-i", str(path), "-an",
           "-vf", f"fps={fps},scale={w}:{h}:flags=area", "-pix_fmt", "bgr24", "-f", "rawvideo", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    size = w * h * 3
    try:
        while True:
            buf = p.stdout.read(size)
            if len(buf) < size:
                break
            yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)
    finally:
        p.stdout.close()
        p.terminate()
        p.wait()


def analyse_frames(path: Path, info: dict, scenes: list[tuple[float, float]], thumb_dir: Path, asset_id: str):
    cv2 = _cv()
    w = THUMB_W
    h = int(round(w * info["height"] / info["width"] / 2) * 2)
    face_cc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    starts = [s for s, _ in scenes]
    per = [dict(luma=[], hi=[], lo=[], sharp=[], tx=[], ty=[], resid=[], faces=[], edge=[], t=[], r=[], g=[], b=[]) for _ in scenes]
    best_thumb: list[tuple[float, np.ndarray] | None] = [None] * len(scenes)
    prev, prev_si = None, -1
    total = max(1, int(info["duration"] * SAMPLE_FPS))
    for i, fr in enumerate(stream_frames(path, w, h)):
        t = i / SAMPLE_FPS
        si = max(0, bisect.bisect_right(starts, t + 1e-6) - 1)
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        d = per[si]
        d["t"].append(t)
        d["luma"].append(float(g.mean()))
        d["hi"].append(float((g >= 250).mean()))
        d["lo"].append(float((g <= 5).mean()))
        lap = cv2.Laplacian(g, cv2.CV_64F)
        d["sharp"].append(float(lap.var()))
        d["r"].append(float(fr[..., 2].mean())); d["g"].append(float(fr[..., 1].mean())); d["b"].append(float(fr[..., 0].mean()))
        if prev is not None and prev_si == si:
            flow = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 2, 15, 2, 5, 1.2, 0)
            gx, gy = float(np.median(flow[..., 0])), float(np.median(flow[..., 1]))
            res = np.hypot(flow[..., 0] - gx, flow[..., 1] - gy)
            d["tx"].append(gx); d["ty"].append(gy); d["resid"].append(float(res.mean()))
        else:
            d["tx"].append(0.0); d["ty"].append(0.0); d["resid"].append(0.0)
        fl = []
        if i % 3 == 0:
            for (x, y, fw, fh) in face_cc.detectMultiScale(g, 1.15, 5, minSize=(int(w * 0.07), int(w * 0.07))):
                fl.append(((x + fw / 2) / w, (y + fh / 2) / h, (fw * fh) / (w * h)))
        d["faces"].append(fl)
        sx = cv2.Sobel(g, cv2.CV_32F, 1, 0); sy = cv2.Sobel(g, cv2.CV_32F, 0, 1)
        mag = np.hypot(sx, sy)
        tot = float(mag.sum())
        if tot < 1.0:  # featureless frame: no meaningful point of interest
            d["edge"].append((0.5, 0.5))
        else:
            yy, xx = np.mgrid[0:h, 0:w]
            d["edge"].append((float((mag * xx).sum() / tot / w), float((mag * yy).sum() / tot / h)))
        mid = (scenes[si][0] + scenes[si][1]) / 2
        score = -abs(t - mid)
        if best_thumb[si] is None or score > best_thumb[si][0]:
            best_thumb[si] = (score, fr.copy())
        prev, prev_si = g, si
        if i % 60 == 0:
            progress(min(0.95, i / total), f"analysing {asset_id}")
    thumb_dir.mkdir(parents=True, exist_ok=True)
    for si, bt in enumerate(best_thumb):
        if bt is not None:
            cv2.imwrite(str(thumb_dir / f"S{si + 1:03d}.jpg"), bt[1], [cv2.IMWRITE_JPEG_QUALITY, 82])
    return per, (w, h)


def _med(a, default=0.0):
    return float(np.median(a)) if len(a) else default


def shot_record(asset_id: str, idx: int, start: float, end: float, d: dict, info: dict, size) -> dict:
    w, h = size
    fps = info["fps"] or 30.0
    sharp = _med(d["sharp"]); luma = _med(d["luma"])
    hi = float(np.mean(d["hi"])) if d["hi"] else 0.0; lo = float(np.mean(d["lo"])) if d["lo"] else 0.0
    tx, ty = np.array(d["tx"]), np.array(d["ty"])
    speed = np.hypot(tx, ty) * SAMPLE_FPS / w  # frame-widths per second
    smooth = np.convolve(speed, np.ones(3) / 3, mode="same") if len(speed) >= 3 else speed
    hp = speed - smooth
    shake = float(np.sqrt(np.mean(hp ** 2))) if len(hp) else 0.0
    resid = _med(d["resid"])
    lm = np.array(d["luma"])
    flicker = float(np.std(lm - np.convolve(lm, np.ones(3) / 3, mode="same")) / (lm.mean() + 1e-6)) if len(lm) > 6 else 0.0
    faces = [f for fl in d["faces"] for f in fl]
    sampled = max(1, -(-len(d["faces"]) // 3))  # faces are only searched on every 3rd frame
    face_frac = float(min(1.0, sum(1 for fl in d["faces"] if fl) / sampled))
    if faces:
        focus = {"x": round(float(np.median([f[0] for f in faces])), 3), "y": round(float(np.median([f[1] for f in faces])), 3), "source": "faces"}
    elif d["edge"]:
        focus = {"x": round(float(np.median([e[0] for e in d["edge"]])), 3), "y": round(float(np.median([e[1] for e in d["edge"]])), 3), "source": "detail"}
    else:
        focus = {"x": 0.5, "y": 0.5, "source": "centre"}
    events = []
    thr_pan, thr_whip = 0.15, 1.2
    i = 0
    while i < len(smooth):
        if smooth[i] >= thr_pan:
            j = i
            while j < len(smooth) and smooth[j] >= thr_pan * 0.7:
                j += 1
            k = i + int(np.argmax(smooth[i:j]))
            if j - i >= 3:
                horiz = abs(tx[i:j].sum()) >= abs(ty[i:j].sum())
                kind = "whip_pan" if smooth[k] >= thr_whip and horiz else ("pan" if horiz else "tilt")
                events.append({"type": kind, "t": round(d["t"][k], 3), "t_end": round(d["t"][min(j, len(d["t"])) - 1], 3),
                               "peak_widths_per_s": round(float(smooth[k]), 2)})
            i = j
        else:
            i += 1
    cast = None
    if d["r"]:
        r_, g_, b_ = np.mean(d["r"]), np.mean(d["g"]), np.mean(d["b"])
        cast = {"r_over_b": round(float(r_ / (b_ + 1e-6)), 3), "g_over_avg": round(float(g_ / ((r_ + b_) / 2 + 1e-6)), 3)}
    # best 3 s window by sharpness x exposure x low shake
    best = None
    if len(d["t"]) >= 6:
        win = min(len(d["t"]), 3 * SAMPLE_FPS)
        sc = np.array(d["sharp"]) * (1 - np.abs(lm - 118) / 160).clip(0.1, 1) / (1 + 25 * np.abs(hp if len(hp) == len(lm) else np.zeros(len(lm))))
        cs = np.convolve(sc, np.ones(win) / win, mode="valid")
        k = int(np.argmax(cs))
        best = {"start": round(d["t"][k], 3), "end": round(d["t"][min(k + win - 1, len(d["t"]) - 1)] + 1 / SAMPLE_FPS, 3)}
    base = info.get("timecode_start")
    return {
        "id": f"{asset_id}_S{idx + 1:03d}", "asset": asset_id, "index": idx + 1,
        "start": round(start, 3), "end": round(end, 3), "duration": round(end - start, 3),
        "tc_in": tc(start, fps), "tc_out": tc(end, fps), "source_timecode_start": base,
        "metrics": {"sharpness": round(sharp, 1), "luma": round(luma, 1), "clip_hi": round(hi, 4), "clip_lo": round(lo, 4),
                    "shake": round(shake, 3), "flicker": round(flicker, 4), "subject_motion": round(resid, 3),
                    "camera_speed": round(float(np.median(speed)) if len(speed) else 0.0, 3),
                    "face_fraction": round(face_frac, 2), "face_area": round(float(np.mean([f[2] for f in faces])) if faces else 0.0, 4),
                    "colour_cast": cast},
        "focus": focus, "motion_events": events, "best_window": best,
        "tags": [], "defects": [], "score": 0.0, "notes": "",
        "thumb": f"06_footage_analysis/thumbs/{asset_id}/S{idx + 1:03d}.jpg",
    }


def classify(shots: list[dict], assets: dict) -> None:
    if not shots:
        return
    sharps = np.array([s["metrics"]["sharpness"] for s in shots])
    for s in shots:
        m, df = s["metrics"], s["defects"]
        a = assets[s["asset"]]
        med_sharp = float(np.median([x["metrics"]["sharpness"] for x in shots if x["asset"] == s["asset"]]))
        if m["sharpness"] < 40 or (m["sharpness"] < 0.3 * med_sharp and m["sharpness"] < 120 and s["duration"] > 0.5):
            df.append({"type": "soft_focus", "severity": "high" if m["sharpness"] < 20 else "medium",
                       "detail": f"Laplacian variance {m['sharpness']} (low relative to this asset or absolute)."})
        if m["luma"] < 45:
            df.append({"type": "underexposed", "severity": "high" if m["luma"] < 30 else "medium", "detail": f"mean luma {m['luma']}/255"})
        if m["luma"] > 200 or m["clip_hi"] > 0.08:
            df.append({"type": "overexposed", "severity": "high" if m["clip_hi"] > 0.2 else "medium", "detail": f"mean luma {m['luma']}, {m['clip_hi']*100:.1f}% pixels clipped"})
        if m["shake"] > 0.12:
            df.append({"type": "camera_shake", "severity": "high" if m["shake"] > 0.3 else "medium", "detail": f"high-frequency camera jitter {m['shake']} frame-widths/s (12 fps sampling, may under-read fast shake)"})
        if m["flicker"] > 0.03:
            df.append({"type": "flicker", "severity": "medium", "detail": f"luma instability {m['flicker']}"})
        if s["duration"] < 0.4:
            df.append({"type": "very_short_shot", "severity": "low", "detail": "possible false cut or a flash frame"})
        if a.get("height") and min(a["width"], a["height"]) < 720:
            df.append({"type": "low_resolution", "severity": "medium", "detail": f"{a['width']}x{a['height']}"})
        a_aud = a.get("audio_analysis") or {}
        if a_aud.get("clipped"):
            df.append({"type": "audio_clipping", "severity": "high", "detail": "samples at digital full scale somewhere in this asset"})
        major = any(x["severity"] == "high" for x in df)
        expo_ok = 1.0 - min(1.0, abs(m["luma"] - 118) / 118)
        sharp_n = float((sharps < m["sharpness"]).mean())
        face_s = min(1.0, m["face_fraction"] * (0.5 + min(1.0, m["face_area"] * 12)))
        motion_s = 1.0 - min(1.0, abs(m["subject_motion"] - 0.8) / 1.5)
        s["score"] = round(0.3 * sharp_n + 0.2 * expo_ok + 0.25 * face_s + 0.15 * motion_s + 0.1 * (0 if major else 1), 3)
        tags = s["tags"]
        if m["face_fraction"] >= 0.3:
            tags.append("human")
        if m["face_fraction"] < 0.1 and m["subject_motion"] < 0.5 and m["shake"] < 0.1 and s["duration"] >= 1.0:
            tags.append("atmosphere")
        if any(e["type"] in ("pan", "whip_pan", "tilt") for e in s["motion_events"]):
            tags.append("motion_opportunity")
        if a.get("sound_events") and any(s["start"] <= e["t"] < s["end"] for e in a["sound_events"]):
            tags.append("sound_opportunity")
        if major:
            tags.append("technical_problem")
        elif df:
            tags.append("technical_problem_minor")
    cut = float(np.percentile([s["score"] for s in shots], 85)) if len(shots) >= 6 else max(s["score"] for s in shots)
    for s in shots:
        if s["score"] >= cut and "technical_problem" not in s["tags"]:
            s["tags"].append("hero_candidate")


def ingest(project: Project, force: bool = False, proxies: bool = True) -> dict:
    ana = project.analysis
    ana.mkdir(exist_ok=True)
    inv_path = ana / "inventory.json"
    prev = read_json(inv_path, {}) or {}
    prev_assets = {a["rel_path"]: a for a in prev.get("assets", [])}
    prev_shots = {}
    for s in prev.get("shots", []):
        prev_shots.setdefault(s["asset"], []).append(s)
    videos = project.files("01_original_footage", VIDEO_EXT)
    photos = project.files("04_photographs", IMAGE_EXT)
    audios = project.files("02_audio", AUDIO_EXT)
    if not (videos or photos or audios):
        raise TMDError("No source material found. Drop footage in 01_original_footage/, photographs in "
                       "04_photographs/ and recordings in 02_audio/, then run ingest again.")
    assets, shots = [], []
    next_n = 1 + max([int(a["id"][1:]) for a in prev_assets.values() if a["id"][1:].isdigit()] + [0])
    for n, path in enumerate(videos + audios + photos):
        rel = str(path.relative_to(project.dir))
        kind = "video" if path.suffix.lower() in VIDEO_EXT else ("audio" if path.suffix.lower() in AUDIO_EXT else "photo")
        old = prev_assets.get(rel)
        sig = file_sig(path)[1:]
        if old and not force and old.get("sig") == sig and old.get("analysis_version") == ANALYSIS_VERSION:
            assets.append(old)
            shots += prev_shots.get(old["id"], [])
            log(f"[cached] {rel}")
            continue
        aid = old["id"] if old else f"{'A' if kind == 'video' else ('R' if kind == 'audio' else 'P')}{next_n:03d}"
        if not old:
            next_n += 1
        log(f"[ingest] {aid} {rel}")
        progress(n / max(1, len(videos + audios + photos)), f"ingest {aid}")
        try:
            if kind == "photo":
                assets.append(ingest_photo(project, path, rel, aid, sig)); continue
            info = probe(path)
        except TMDError as e:
            assets.append({"id": aid, "rel_path": rel, "kind": kind, "sig": sig, "error": str(e), "analysis_version": ANALYSIS_VERSION})
            log(f"  ! unreadable: {e}")
            continue
        a = {**info, "id": aid, "rel_path": rel, "kind": kind, "sig": sig, "filename": path.name, "analysis_version": ANALYSIS_VERSION, "warnings": []}
        a.pop("path", None)
        if info.get("is_hdr"):
            a["warnings"].append("HDR / wide-gamut source detected. The engine renders SDR Rec.709 and does not tone-map; highlights and colour will look wrong until a proper HDR to SDR conversion is applied.")
        if info.get("vfr"):
            a["warnings"].append("Variable frame rate. Renders resample to the project frame rate; check sync on long clips.")
        if info.get("has_audio"):
            lo = ma.loudness(path)
            cl = ma.clipping(path)
            y = ma.decode_mono(path)
            a["audio_analysis"] = {**lo, "silences": ma.silences(path), "peak_db": cl["peak_db"],
                                   "clipped": bool(cl["peak_db"] is not None and cl["peak_db"] >= -0.1 and (cl["peak_count"] or 0) > 3),
                                   "mostly_silent": bool(lo["integrated_lufs"] is not None and lo["integrated_lufs"] < -60)}
            a["sound_events"] = ma.transients(y)
        if kind == "audio":
            assets.append(a); continue
        scenes = detect_scenes(path, info["duration"])
        thumb_dir = ana / "thumbs" / aid
        per, size = analyse_frames(path, info, scenes, thumb_dir, aid)
        recs = [shot_record(aid, i, s, e, per[i], info, size) for i, (s, e) in enumerate(scenes)]
        a["shot_count"] = len(recs)
        a["analysis_size"] = list(size)
        assets.append(a)
        shots += recs
        if proxies:
            make_proxy(path, ana / "proxies" / f"{aid}.mp4")
            a["proxy"] = f"06_footage_analysis/proxies/{aid}.mp4"
    amap = {a["id"]: a for a in assets}
    vs = [s for s in shots if s["asset"] in amap]
    for s in vs:
        s["tags"], s["defects"] = [], []
    classify(vs, amap)
    inv = {"version": ANALYSIS_VERSION, "generated": now_iso(), "note": "Machine suggestions for human review. Tags are heuristics, not judgements.",
           "assets": assets, "shots": shots, "summary": summarise(assets, shots)}
    write_json(inv_path, inv)
    write_shot_log(project, inv)
    meta = project.meta
    if meta.get("status") == "awaiting_footage":
        meta["status"] = "ingested"
        project.save_meta(meta)
    progress(1.0, "ingest complete")
    return inv


def ingest_photo(project, path, rel, aid, sig):
    from PIL import Image, ImageOps
    cv2 = _cv()
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    w, h = im.size
    arr = np.array(im.resize((THUMB_W, int(THUMB_W * h / w))))
    g = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    faces = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml").detectMultiScale(g, 1.15, 5, minSize=(24, 24))
    fx = [(x + fw / 2) / g.shape[1] for x, y, fw, fh in faces]; fy = [(y + fh / 2) / g.shape[0] for x, y, fw, fh in faces]
    focus = {"x": round(float(np.median(fx)), 3), "y": round(float(np.median(fy)), 3), "source": "faces"} if len(faces) else {"x": 0.5, "y": 0.5, "source": "centre"}
    tdir = project.analysis / "thumbs" / aid
    tdir.mkdir(parents=True, exist_ok=True)
    im.resize((THUMB_W, int(THUMB_W * h / w))).save(tdir / "S001.jpg", quality=85)
    return {"id": aid, "rel_path": rel, "kind": "photo", "sig": sig, "filename": path.name, "width": w, "height": h,
            "orientation": "vertical" if h > w else ("square" if h == w else "horizontal"), "analysis_version": ANALYSIS_VERSION,
            "sharpness": round(float(cv2.Laplacian(g, cv2.CV_64F).var()), 1), "faces": int(len(faces)), "focus": focus,
            "thumb": f"06_footage_analysis/thumbs/{aid}/S001.jpg", "warnings": []}


def make_proxy(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg(["-i", str(src), "-vf", "scale='min(540,iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(dst)], check=False)


def summarise(assets, shots) -> dict:
    tags: dict[str, int] = {}
    for s in shots:
        for t in s["tags"]:
            tags[t] = tags.get(t, 0) + 1
    return {"assets": len(assets), "videos": sum(1 for a in assets if a["kind"] == "video"),
            "photos": sum(1 for a in assets if a["kind"] == "photo"), "audio_files": sum(1 for a in assets if a["kind"] == "audio"),
            "unreadable": sum(1 for a in assets if a.get("error")), "shots": len(shots),
            "total_video_seconds": round(sum(a.get("duration", 0) for a in assets if a["kind"] == "video"), 2), "tags": tags}


def write_shot_log(project: Project, inv: dict) -> None:
    amap = {a["id"]: a for a in inv["assets"]}
    with open(project.analysis / "shot_log.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["shot", "file", "tc_in", "tc_out", "seconds", "tags", "defects", "score", "face_fraction", "luma", "sharpness", "notes"])
        for s in inv["shots"]:
            a = amap.get(s["asset"], {})
            w.writerow([s["id"], a.get("filename"), s["tc_in"], s["tc_out"], s["duration"], " ".join(s["tags"]),
                        "; ".join(f"{d['type']}({d['severity']})" for d in s["defects"]), s["score"],
                        s["metrics"]["face_fraction"], s["metrics"]["luma"], s["metrics"]["sharpness"], s["notes"]])
