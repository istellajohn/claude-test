"""Rough-cut assembly: a MACHINE-MADE STARTING POINT from the inventory (and a beat grid if one exists).

It chooses the strongest usable windows and sets shot lengths from the music. It cannot know what the
footage means. The three treatments differ in rhythm and structure so a director can react to real
alternatives, but every choice still needs a human pass. Documentary mode keeps footage in source
(chronological) order by default so that nothing implies a sequence that did not happen.
"""
from __future__ import annotations

from pathlib import Path

from engine.rendering import timeline as T
from engine.utilities.common import Project, TMDError, read_json

TREATMENTS = {
    "A": {"name": "impact", "label": "The Impact Cut", "beats": (1, 2, 3), "target": 30.0, "syncopate": True},
    "B": {"name": "cinematic", "label": "The Cinematic Cut", "beats": (4, 6, 8), "target": 40.0, "syncopate": False},
    "C": {"name": "experimental", "label": "The Experimental Editorial Cut", "beats": (1, 3, 6, 2, 8), "target": 30.0, "syncopate": True},
}


def draft(project: Project, treatment: str = "A", music_analysis: str | None = None, target: float | None = None, name: str | None = None) -> dict:
    inv = read_json(project.analysis / "inventory.json")
    if not inv:
        raise TMDError("Run ingest first: there is no inventory.json.")
    tr = TREATMENTS[treatment]
    fps = project.meta.get("canvas", {}).get("fps", 30)
    amap = {a["id"]: a for a in inv["assets"]}
    shots = [s for s in inv["shots"] if "technical_problem" not in s["tags"] and amap.get(s["asset"], {}).get("kind") == "video"]
    if not shots:
        shots = [s for s in inv["shots"] if amap.get(s["asset"], {}).get("kind") == "video"]
    if not shots:
        raise TMDError("No usable video shots in the inventory.")
    beat = None
    grid = []
    if music_analysis:
        ma = read_json(project.dir / music_analysis)
        if ma:
            grid = ma["beats"]
            beat = 60.0 / ma["tempo_bpm"]
    beat = beat or 0.5
    tgt = target or tr["target"]
    doc = project.meta.get("documentary_mode")
    pool = sorted(shots, key=lambda s: -s["score"])
    chosen, total, k, i = [], 0.0, 0, 0
    used_asset_count: dict[str, int] = {}
    while total < tgt and i < len(pool) * 3:
        s = pool[i % len(pool)]
        i += 1
        win = s.get("best_window") or {"start": s["start"], "end": s["end"]}
        avail = win["end"] - win["start"]
        beats = tr["beats"][k % len(tr["beats"])]
        dur = beats * beat
        if dur > avail + 0.001:
            dur = max(beat, int(avail / beat) * beat)
        if dur < 0.3 or any(c["shot"] == s["id"] and abs(c["in"] - win["start"]) < dur for c in chosen):
            if i > len(pool) * 2:
                break
            continue
        chosen.append({"shot": s["id"], "asset": s["asset"], "in": round(win["start"], 3), "dur": round(dur, 3), "focus": s["focus"], "score": s["score"]})
        total += dur
        k += 1
    if doc:  # keep real order: by file then time
        chosen.sort(key=lambda c: (amap[c["asset"]]["rel_path"], c["in"]))
    clips = []
    for n, c in enumerate(chosen, 1):
        a = amap[c["asset"]]
        # keep the cut on whole frames, optionally nudging one frame early for syncopation
        dur = round(c["dur"] * fps) / fps
        if tr["syncopate"] and n % 4 == 0:
            dur = max(2 / fps, dur - 1 / fps)
        sh = next(s for s in shots if s["id"] == c["shot"])
        clips.append({"id": f"c{n}", "src": a["rel_path"], "kind": "video", "in": c["in"], "dur": round(dur, 4), "speed": 1.0,
                      "focus": {"x": c["focus"]["x"], "y": c["focus"]["y"]}, "auto": True, "role": "hero" if "hero_candidate" in sh["tags"] else "",
                      "label": c["shot"], "factual_incident": bool(doc), "notes": "machine draft: confirm the in/out by eye"})
    if not clips:
        raise TMDError("Could not assemble any clips.")
    tl = {"name": name or f"edit-{treatment.lower()}-{tr['name']}", "treatment": treatment, "treatment_label": tr["label"],
          "status": "DRAFT: machine-assembled starting point, not a directed edit", "documentary_mode": bool(doc),
          "clips": clips, "audio_layers": [], "overlays": [], "captions": "12_subtitles/captions.json", "intentional_silence": [],
          "canvas": {**project.meta.get("canvas", {})}}
    return tl
