"""Photo credits. Photographs are other people's work: every still must have a photographer, a source and a
licence on record before a public release. 16_licences/photo_credits.json maps file name -> record."""
from __future__ import annotations

from pathlib import Path

from engine.utilities.common import Project, read_json, write_json

REQUIRED = ("photographer", "licence")


def load(project: Project) -> dict:
    return (read_json(project.licences / "photo_credits.json", {}) or {}).get("photos", {})


def template(project: Project) -> None:
    """Create the credits file with one blank record per photograph found. Never overwrites what is filled in."""
    cur = load(project)
    for p in project.files("04_photographs", {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic"}):
        cur.setdefault(p.name, {"photographer": "", "source_url": "", "licence": "", "licence_evidence": "", "caption_as_published": "", "date_taken_claimed": ""})
    write_json(project.licences / "photo_credits.json", {"_note": "licence: e.g. 'own work', 'commissioned: written agreement', 'CC BY 4.0', 'agency licence #123'. Without this, the photo is draft-only.", "photos": cur})


def missing(project: Project, tl: dict) -> list[str]:
    cr = load(project)
    out = []
    for c in tl.get("clips", []):
        if c.get("kind") == "still":
            name = Path(c["src"]).name
            rec = cr.get(name)
            if not rec or any(not str(rec.get(k, "")).strip() for k in REQUIRED):
                out.append(name)
    return sorted(set(out))


def write_credits_md(project: Project, tl: dict, dst: Path) -> None:
    cr = load(project)
    names = sorted({Path(c["src"]).name for c in tl.get("clips", []) if c.get("kind") == "still"})
    lines = ["# Photograph credits\n"]
    for n in names:
        r = cr.get(n, {})
        lines.append(f"- **{n}**: {r.get('photographer') or 'PHOTOGRAPHER NOT RECORDED'} · {r.get('licence') or 'LICENCE NOT RECORDED'}" + (f" · {r['source_url']}" if r.get("source_url") else ""))
    dst.write_text("\n".join(lines) + "\n", encoding="utf-8")
