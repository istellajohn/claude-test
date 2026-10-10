"""Storyboard frames for a timeline: one still per clip from the middle of its source range."""
from __future__ import annotations

from engine.rendering import timeline as T
from engine.utilities.common import Project, ffmpeg, tc, write_json


def build(project: Project, tl_name: str) -> dict:
    tl = T.load(project, tl_name)
    plan = T.compile_plan(project, tl)
    out_dir = project.storyboards / tl["name"]
    out_dir.mkdir(parents=True, exist_ok=True)
    cards, seen = [], set()
    for s in plan["segments"]:
        if s["parent"] in seen:
            continue
        seen.add(s["parent"])
        f = out_dir / f"{s['parent']}.jpg"
        src = project.dir / s["src"]
        if s["kind"] == "video":
            mid = s["src_in"] + s["src_dur"] / 2
            ffmpeg(["-ss", f"{mid:.3f}", "-i", str(src), "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "3", str(f)], check=False)
        else:
            ffmpeg(["-i", str(src), "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "3", str(f)], check=False)
        total = sum(x["frames"] for x in plan["segments"] if x["parent"] == s["parent"])
        cards.append({"id": s["parent"], "image": f"07_storyboards/{tl['name']}/{s['parent']}.jpg", "start": round(s["start_frame"] / plan["fps"], 3),
                      "dur": round(total / plan["fps"], 3), "timecode": tc(s["start_frame"] / plan["fps"], plan["fps"]), "role": s.get("role"),
                      "label": s.get("label"), "notes": s.get("notes"), "src": s["src"], "src_in": round(s["src_in"], 3)})
    write_json(out_dir / "storyboard.json", {"timeline": tl["name"], "duration": plan["duration"], "cards": cards})
    return {"cards": len(cards)}
