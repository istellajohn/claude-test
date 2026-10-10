"""Shared helpers: paths, subprocess, JSON, timecode, the Project object."""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROJECTS = ROOT / "projects"
DESIGN = ROOT / "design-system"
FONTS_DIR = DESIGN / "typography"

VIDEO_EXT = {".mp4", ".mov", ".m4v", ".mkv", ".avi", ".mxf", ".webm", ".mts", ".m2ts", ".3gp"}
AUDIO_EXT = {".wav", ".mp3", ".m4a", ".aac", ".flac", ".aif", ".aiff", ".ogg", ".opus"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic", ".bmp"}

FOLDERS = [
    "00_brief", "01_original_footage", "02_audio", "03_music_references", "04_photographs",
    "05_transcripts", "06_footage_analysis", "07_storyboards", "08_edit_timelines",
    "09_motion_graphics", "10_colour", "11_sound_design", "12_subtitles", "13_previews",
    "14_final_exports", "15_thumbnails", "16_licences",
]


class TMDError(Exception):
    """A problem the user can act on (missing file, bad timeline, missing tool)."""


def log(msg: str) -> None:
    print(msg, flush=True)


def progress(frac: float, stage: str) -> None:
    """Machine-readable progress line, parsed by the dashboard job runner."""
    print(f"##PROGRESS {max(0.0, min(1.0, frac)):.3f} {stage}", flush=True)


def run(cmd: list[str], check: bool = True, capture: bool = True, cwd: Path | None = None,
        input_text: str | None = None) -> subprocess.CompletedProcess:
    cmd = [str(c) for c in cmd]
    p = subprocess.run(cmd, capture_output=capture, text=True, cwd=cwd, input=input_text)
    if check and p.returncode != 0:
        tail = (p.stderr or "")[-1800:]
        raise TMDError(f"Command failed ({p.returncode}): {' '.join(cmd[:6])} ...\n{tail}")
    return p


def ffmpeg(args: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error", *args], check=check)


def need(tool: str) -> str:
    p = shutil.which(tool)
    if not p:
        raise TMDError(f"Required tool not found on PATH: {tool}")
    return p


def read_json(path: Path, default=None):
    path = Path(path)
    if not path.exists():
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data, indent: int = 2) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)


def sha(*parts) -> str:
    h = hashlib.sha1()
    for p in parts:
        h.update(json.dumps(p, sort_keys=True, default=str).encode())
    return h.hexdigest()[:16]


def file_sig(path: Path) -> list:
    st = Path(path).stat()
    return [str(path), st.st_size, int(st.st_mtime)]


def tc(seconds: float, fps: float = 30.0) -> str:
    """HH:MM:SS:FF timecode (non-drop)."""
    fps_i = max(1, round(fps))
    total = int(round(seconds * fps))
    ff = total % fps_i
    s = total // fps_i
    return f"{s // 3600:02d}:{(s // 60) % 60:02d}:{s % 60:02d}:{ff:02d}"


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")


def slugify(name: str) -> str:
    out = "".join(c if c.isalnum() else "-" for c in name.strip()).strip("-")
    while "--" in out:
        out = out.replace("--", "-")
    return out or "project"


class Project:
    """A project folder under projects/. All paths come from here."""

    def __init__(self, name: str):
        self.name = name
        self.dir = PROJECTS / name
        if not self.dir.is_dir():
            raise TMDError(f"Project not found: {name} (looked in {PROJECTS})")

    def __getattr__(self, attr):  # project.footage, project.timelines, ...
        names = {
            "brief": "00_brief", "footage": "01_original_footage", "audio": "02_audio",
            "music": "03_music_references", "photos": "04_photographs",
            "transcripts": "05_transcripts", "analysis": "06_footage_analysis",
            "storyboards": "07_storyboards", "timelines": "08_edit_timelines",
            "motion": "09_motion_graphics", "colour": "10_colour", "sound": "11_sound_design",
            "subtitles": "12_subtitles", "previews": "13_previews", "exports": "14_final_exports",
            "thumbs": "15_thumbnails", "licences": "16_licences",
        }
        if attr in names:
            return self.dir / names[attr]
        raise AttributeError(attr)

    @property
    def work(self) -> Path:
        p = self.dir / ".work"
        p.mkdir(exist_ok=True)
        return p

    @property
    def meta(self) -> dict:
        return read_json(self.dir / "project.json", {}) or {}

    def save_meta(self, meta: dict) -> None:
        write_json(self.dir / "project.json", meta)

    def resolve(self, rel: str) -> Path:
        """Resolve a project-relative path, refusing anything that escapes the project."""
        p = (self.dir / rel).resolve()
        if self.dir.resolve() not in p.parents and p != self.dir.resolve():
            raise TMDError(f"Path escapes the project folder: {rel}")
        return p

    def files(self, folder: str, exts: set[str]) -> list[Path]:
        d = self.dir / folder
        if not d.is_dir():
            return []
        return sorted(p for p in d.rglob("*") if p.is_file() and p.suffix.lower() in exts
                      and not any(part.startswith(".") for part in p.relative_to(d).parts))


def list_projects() -> list[str]:
    if not PROJECTS.is_dir():
        return []
    return sorted(p.name for p in PROJECTS.iterdir() if (p / "project.json").exists())


def die(msg: str, code: int = 1):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)
