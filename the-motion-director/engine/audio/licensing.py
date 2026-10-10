"""Soundtrack shortlist and licensing gate.

The shortlist starts EMPTY. Entries are added only after research, and every licensing field
defaults to NOT VERIFIED. A track may be embedded in an exported file only when
licence_status == LICENSED_EMBEDDABLE and a licence document exists in 16_licences/.
Spotify availability is never treated as permission.
"""
from __future__ import annotations

from engine.utilities.common import Project, read_json, write_json

INSTAGRAM_STATUS = ["NOT VERIFIED", "AVAILABLE IN INSTAGRAM LIBRARY (verified)", "NOT AVAILABLE"]
LICENCE_STATUS = ["NOT VERIFIED", "INSTAGRAM_NATIVE_ONLY", "LICENSED_EMBEDDABLE", "NOT_LICENSED"]
FIELDS = ["id", "title", "artist", "spotify_url", "genre", "bpm_or_feel", "why_it_suits", "suggested_section",
          "potential_edit_accents", "instagram_status", "instagram_checked_on", "region_checked", "account_type_checked",
          "licence_status", "licence_evidence", "approved_use", "restrictions", "local_file"]


def load(project: Project) -> dict:
    return read_json(project.music / "shortlist.json", {"tracks": []}) or {"tracks": []}


def validate_track(project: Project, t: dict) -> list[str]:
    errs = []
    if not t.get("title") or not t.get("artist"):
        errs.append("title and artist are required")
    if t.get("instagram_status", "NOT VERIFIED") not in INSTAGRAM_STATUS:
        errs.append(f"instagram_status must be one of {INSTAGRAM_STATUS}")
    if t.get("licence_status", "NOT VERIFIED") not in LICENCE_STATUS:
        errs.append(f"licence_status must be one of {LICENCE_STATUS}")
    if t.get("instagram_status", "").startswith("AVAILABLE") and not (t.get("instagram_checked_on") and t.get("region_checked") and t.get("account_type_checked")):
        errs.append("a verified Instagram status needs the date checked, the region and the account type it was checked from")
    if t.get("licence_status") == "LICENSED_EMBEDDABLE":
        ev = t.get("licence_evidence")
        if not ev or not (project.dir / ev).is_file():
            errs.append("LICENSED_EMBEDDABLE needs licence_evidence pointing at a real file inside 16_licences/")
    return errs


def save_track(project: Project, t: dict) -> dict:
    data = load(project)
    errs = validate_track(project, t)
    if errs:
        return {"ok": False, "errors": errs}
    t = {k: t.get(k, "NOT VERIFIED" if k in ("instagram_status", "licence_status") else "") for k in FIELDS} | {k: v for k, v in t.items() if k in FIELDS}
    if not t["id"]:
        t["id"] = f"T{len(data['tracks']) + 1:02d}"
    data["tracks"] = [x for x in data["tracks"] if x.get("id") != t["id"]] + [t]
    data["tracks"].sort(key=lambda x: x["id"])
    write_json(project.music / "shortlist.json", data)
    return {"ok": True, "track": t}


def delete_track(project: Project, tid: str) -> None:
    data = load(project)
    data["tracks"] = [x for x in data["tracks"] if x.get("id") != tid]
    write_json(project.music / "shortlist.json", data)


def can_embed(project: Project, track_id: str | None) -> tuple[bool, str]:
    if not track_id:
        return False, "layer is not linked to a shortlist track"
    t = next((x for x in load(project)["tracks"] if x.get("id") == track_id), None)
    if not t:
        return False, f"track {track_id} is not on the shortlist"
    if validate_track(project, t):
        return False, "track record is invalid"
    if t.get("licence_status") != "LICENSED_EMBEDDABLE":
        return False, f"licence_status is {t.get('licence_status')}"
    return True, "licensed for embedding"
