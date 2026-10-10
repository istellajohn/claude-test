"""Synthetic test fixtures. They exist ONLY to prove the pipeline works (selftest).
They are generated procedurally, are clearly not documentary footage, and must never be
presented as a project's material."""
from __future__ import annotations

from pathlib import Path

from engine.utilities.common import ffmpeg


def make_video(dst: Path, kind: str, seconds: float = 6.0, w: int = 1920, h: int = 1080, fps: int = 30, tone: float = 220.0) -> None:
    src = {
        "bars": f"smptehdbars=size={w}x{h}:rate={fps}",
        "mandel": f"mandelbrot=size={w}x{h}:rate={fps}:start_scale=3:end_scale=0.01",
        "life": f"testsrc2=size={w}x{h}:rate={fps}",
        "grad": f"gradients=size={w}x{h}:rate={fps}:speed=0.02:nb_colors=3",
        "dark": f"color=c=0x101010:size={w}x{h}:rate={fps}",
    }[kind]
    # a short click at 1.0 s and 3.5 s gives the transient detector something real to find
    audio = (f"aevalsrc='0.05*sin({tone}*2*PI*t)+0.9*sin(2*PI*1800*t)*exp(-60*mod(t-1,2.5))*gte(mod(t-1,2.5),0)':s=48000:d={seconds}")
    ffmpeg(["-f", "lavfi", "-i", src, "-f", "lavfi", "-i", audio, "-t", str(seconds), "-c:v", "libx264", "-preset", "veryfast",
            "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", str(dst)])


def make_guide_track(dst: Path, bpm: int = 120, seconds: float = 30.0) -> None:
    """A plain kick/hat/bass loop used as a stand-in 'guide track' for testing beat analysis."""
    beat = 60.0 / bpm
    kick = f"0.8*sin(2*PI*(55+110*exp(-30*mod(t,{beat})))*mod(t,{beat}))*exp(-9*mod(t,{beat}))"
    hat = f"0.12*(random(0)-0.5)*exp(-70*mod(t+{beat/2},{beat}))"
    bass = f"0.22*sin(2*PI*55*t)*(0.6+0.4*sin(2*PI*t/{beat*4}))"
    ffmpeg(["-f", "lavfi", "-i", f"aevalsrc='{kick}+{hat}+{bass}':s=48000:d={seconds}:c=stereo", "-c:a", "pcm_s16le", str(dst)])


def make_photo(dst: Path, w: int = 3000, h: int = 4000) -> None:
    ffmpeg(["-f", "lavfi", "-i", f"gradients=size={w}x{h}:duration=1:rate=1:speed=0.05:nb_colors=4", "-frames:v", "1", "-q:v", "2", str(dst)])
