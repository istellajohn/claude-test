"""ffprobe wrapper returning the facts the rest of the engine needs."""
from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

from engine.utilities.common import TMDError, run


def _frac(s: str | None) -> float:
    try:
        return float(Fraction(s)) if s and s != "0/0" else 0.0
    except (ValueError, ZeroDivisionError):
        return 0.0


def probe(path: Path) -> dict:
    p = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
            check=False)
    if p.returncode != 0:
        raise TMDError(f"ffprobe cannot read {path}: {(p.stderr or '').strip()[-300:]}")
    j = json.loads(p.stdout)
    v = next((s for s in j.get("streams", []) if s.get("codec_type") == "video"
              and s.get("disposition", {}).get("attached_pic", 0) == 0), None)
    a = next((s for s in j.get("streams", []) if s.get("codec_type") == "audio"), None)
    fmt = j.get("format", {})
    out: dict = {
        "path": str(path),
        "container": fmt.get("format_name"),
        "duration": float(fmt.get("duration") or (v or {}).get("duration") or 0),
        "size_bytes": int(fmt.get("size") or 0),
        "bit_rate": int(fmt.get("bit_rate") or 0),
        "has_video": v is not None,
        "has_audio": a is not None,
    }
    if v:
        rot = 0
        for sd in v.get("side_data_list", []) or []:
            if "rotation" in sd:
                rot = int(sd["rotation"])
        rot = (rot % 360 + 360) % 360
        if v.get("tags", {}).get("rotate"):
            rot = int(v["tags"]["rotate"]) % 360
        w, h = int(v["width"]), int(v["height"])
        dw, dh = (h, w) if rot in (90, 270) else (w, h)
        avg, r = _frac(v.get("avg_frame_rate")), _frac(v.get("r_frame_rate"))
        trc = v.get("color_transfer") or ""
        prim = v.get("color_primaries") or ""
        out.update({
            "vcodec": v.get("codec_name"), "profile": v.get("profile"), "pix_fmt": v.get("pix_fmt"),
            "coded_width": w, "coded_height": h, "rotation": rot,
            "width": dw, "height": dh,
            "orientation": "vertical" if dh > dw else ("square" if dh == dw else "horizontal"),
            "fps": round(avg or r, 4), "r_fps": round(r, 4),
            "vfr": bool(avg and r and abs(avg - r) / max(avg, r) > 0.02),
            "nb_frames": int(v["nb_frames"]) if str(v.get("nb_frames", "")).isdigit() else None,
            "color_space": v.get("color_space"), "color_transfer": trc, "color_primaries": prim,
            "color_range": v.get("color_range"),
            "is_hdr": trc in ("smpte2084", "arib-std-b67") or prim == "bt2020",
            "bit_depth": int(v.get("bits_per_raw_sample") or 8),
            "timecode_start": (v.get("tags") or {}).get("timecode") or (fmt.get("tags") or {}).get("timecode"),
            "creation_time": (fmt.get("tags") or {}).get("creation_time"),
        })
        if not out["duration"] and v.get("duration"):
            out["duration"] = float(v["duration"])
    if a:
        out.update({"acodec": a.get("codec_name"), "sample_rate": int(a.get("sample_rate") or 0),
                    "channels": int(a.get("channels") or 0)})
    return out
