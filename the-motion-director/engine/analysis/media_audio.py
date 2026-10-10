"""Audio facts about a media file: loudness, true peak, silence, clipping, transient events."""
from __future__ import annotations

import re
import subprocess

import numpy as np

from engine.utilities.common import run


def loudness(path, start: float | None = None, dur: float | None = None) -> dict:
    """EBU R128 summary through ffmpeg's ebur128 filter (integrated, LRA, true peak)."""
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-nostats"]
    if start is not None:
        cmd += ["-ss", f"{start:.3f}"]
    if dur is not None:
        cmd += ["-t", f"{dur:.3f}"]
    cmd += ["-i", str(path), "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]
    p = run(cmd, check=False)
    txt = p.stderr
    tail = txt[txt.rfind("Summary:"):] if "Summary:" in txt else ""

    def grab(label, unit):
        m = re.search(rf"{label}:\s+(-?inf|-?[\d.]+)\s*{unit}", tail)
        if not m:
            return None
        return -120.0 if "inf" in m.group(1) else float(m.group(1))

    return {"integrated_lufs": grab("I", "LUFS"), "lra": grab("LRA", "LU"), "true_peak_dbtp": grab("Peak", "dBFS")}


def silences(path, noise_db: float = -45.0, min_dur: float = 0.5) -> list[dict]:
    p = run(["ffmpeg", "-hide_banner", "-nostdin", "-i", str(path), "-vn", "-af",
             f"silencedetect=noise={noise_db}dB:d={min_dur}", "-f", "null", "-"], check=False)
    out, cur = [], None
    for line in p.stderr.splitlines():
        m = re.search(r"silence_start: (-?[\d.]+)", line)
        if m:
            cur = max(0.0, float(m.group(1)))
        m = re.search(r"silence_end: ([\d.]+) \| silence_duration: ([\d.]+)", line)
        if m and cur is not None:
            out.append({"start": round(cur, 3), "end": round(float(m.group(1)), 3), "duration": round(float(m.group(2)), 3)})
            cur = None
    return out


def clipping(path) -> dict:
    """Number of samples at digital full scale, from astats."""
    p = run(["ffmpeg", "-hide_banner", "-nostdin", "-i", str(path), "-vn", "-af",
             "astats=metadata=0:reset=0", "-f", "null", "-"], check=False)
    txt = p.stderr
    tail = txt[txt.rfind("Overall"):] if "Overall" in txt else txt
    peak = re.search(r"Peak level dB:\s+(-?[\d.]+|-inf)", tail)
    flat = re.search(r"Flat factor:\s+([\d.]+)", tail)
    pcount = re.search(r"Peak count:\s+([\d.]+)", tail)
    peak_db = None if not peak else (-120.0 if peak.group(1) == "-inf" else float(peak.group(1)))
    return {"peak_db": peak_db, "flat_factor": float(flat.group(1)) if flat else None,
            "peak_count": float(pcount.group(1)) if pcount else None}


def decode_mono(path, sr: int = 16000, start: float | None = None, dur: float | None = None) -> np.ndarray:
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-loglevel", "error"]
    if start is not None:
        cmd += ["-ss", f"{start:.3f}"]
    if dur is not None:
        cmd += ["-t", f"{dur:.3f}"]
    cmd += ["-i", str(path), "-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]
    p = subprocess.run(cmd, capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.float32) if p.returncode == 0 else np.zeros(0, np.float32)


def transients(y: np.ndarray, sr: int = 16000, min_rise_db: float = 16.0, max_events: int = 24) -> list[dict]:
    """Sudden, loud events (door, clap, impact, shout) found as peaks of the 10 ms RMS envelope
    that rise well above the local baseline. Heuristic: tells you where to listen, not what it is."""
    if y.size < sr:
        return []
    hop = int(sr * 0.01)
    n = y.size // hop
    rms = np.sqrt(np.mean(y[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms + 1e-9)
    win = 100  # 1 s baseline
    base = np.array([np.percentile(db[max(0, i - win): i + win], 30) for i in range(0, n, 10)])
    base = np.repeat(base, 10)[:n]
    rise = db - base
    ev, i = [], 0
    while i < n:
        if rise[i] >= min_rise_db and db[i] > -40:
            j = i
            while j < n and rise[j] >= min_rise_db * 0.5:
                j += 1
            k = i + int(np.argmax(db[i:j]))
            ev.append({"t": round(k * 0.01, 3), "level_db": round(float(db[k]), 1), "rise_db": round(float(rise[k]), 1)})
            i = j + 20
        else:
            i += 1
    ev.sort(key=lambda e: -e["rise_db"])
    return sorted(ev[:max_events], key=lambda e: e["t"])
