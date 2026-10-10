"""Create a new, independent project folder."""
from __future__ import annotations

from engine.utilities.common import FOLDERS, PROJECTS, TMDError, now_iso, slugify, write_json, read_json, DESIGN

BRIEF_TEMPLATE = """# Brief: {title}

> Fill what you know. Leave the rest blank; the Motion Director will ask for one thing at a time, only if it is essential.

## What is this about?

## Who is it for, and where will it be published?
(Default: Instagram Reels, organic, 9:16.)

## What must a viewer understand? What should stay unresolved?

## Material supplied
- Footage:
- Photographs:
- Audio / voice recordings:
- Music references (Spotify links):
- Reference videos:

## Is this documentary / real-world material?
(If yes, set `documentary_mode` in project.json. Speed changes and re-ordering of factual footage are then controlled.)

## Constraints
People who must not be identifiable, claims that must be attributed, legal or cultural sensitivities:

## Music intent
Organic post, branded, sponsored, or intended for boosting? Account type and region:
"""


def new_project(name: str, title: str | None = None, documentary: bool = False, fps: int = 30) -> str:
    slug = slugify(name)
    d = PROJECTS / slug
    if d.exists():
        raise TMDError(f"Project already exists: {slug}")
    for f in FOLDERS:
        (d / f).mkdir(parents=True)
        (d / f / ".gitkeep").write_text("")
    (d / "00_brief" / "brief.md").write_text(BRIEF_TEMPLATE.format(title=title or slug))
    (d / "01_original_footage" / "README.md").write_text(
        "# Original footage\n\nDrop untouched camera originals here. The engine reads them and never writes to this folder.\n"
        "Nothing in this folder is committed to Git (see `.gitignore`). Keep your own backup.\n")
    (d / "03_music_references" / "audio").mkdir(exist_ok=True)
    write_json(d / "03_music_references" / "shortlist.json", {"tracks": [], "_note":
        "Empty on purpose. Tracks are added only after they have been researched. Nothing here is invented."})
    write_json(d / "12_subtitles" / "captions.json", {"style": "minimal_editorial", "items": []})
    write_json(d / "09_motion_graphics" / "visual_system.json", {
        **{k: v for k, v in (read_json(DESIGN / "colour" / "palette.json") or {}).items() if not k.startswith("_")},
        "fonts": {"display": "Instrument Serif", "text": "Hanken Grotesk", "mono": "DM Mono"},
        "grain": 0.0, "caption_style": "minimal_editorial"})
    write_json(d / "project.json", {
        "name": slug, "title": title or slug, "created": now_iso(), "status": "awaiting_footage",
        "platform": "instagram_reels", "documentary_mode": documentary,
        "canvas": {"width": 1080, "height": 1920, "fps": fps},
        "loudness": {"integrated_lufs": -14.0, "true_peak_dbtp": -1.0},
        "music_intent": {"post_type": "organic", "boosted": False, "account_type": "NOT VERIFIED", "region": "NOT VERIFIED"},
        "treatments": {"A": "The Impact Cut", "B": "The Cinematic Cut", "C": "The Experimental Editorial Cut"},
        "chosen_treatment": None,
    })
    return slug
