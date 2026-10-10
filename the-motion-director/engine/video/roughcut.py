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
    if not any(a["kind"] == "video" and not a.get("error") for a in inv["assets"]) and any(a["kind"] == "photo" for a in inv["assets"]):
        return draft_photos(project, treatment, music_analysis, target, name)
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


# ---------------------------------------------------------------------------------------------------------
# Photo montage mode: fast, hard-cut still-image edits. Used when the project has photographs and no video.
# ---------------------------------------------------------------------------------------------------------
PHOTO_LOOK = {"A": "grunge_mono", "B": "grunge_ember", "C": "grunge_mono"}
SECTION_PATTERNS = {  # beats per photo, by section of the score
    "A": {"intro": [2, 2], "build": [1, 1, 0.5, 0.5], "drop": [1, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5], "break": [8], "outro": [1, 1, 2]},
    "B": {"intro": [4], "build": [3, 3], "drop": [2, 2, 3], "break": [8], "outro": [4]},
    "C": {"intro": [1, 3, 0.5], "build": [0.5, 0.5, 2, 0.5], "drop": [0.5, 0.5, 0.5, 2, 0.25, 0.25, 0.5, 1], "break": [6], "outro": [0.5, 0.5, 3]},
}


def _exif_key(a: dict):
    t = a.get("exif_taken")
    return (0, str(t).replace(":", "").replace(" ", "")) if t else (1, a["rel_path"])


def draft_photos(project: Project, treatment: str, music_analysis: str | None, target: float | None, name: str | None) -> dict:
    inv = read_json(project.analysis / "inventory.json")
    photos = [a for a in (inv or {}).get("assets", []) if a["kind"] == "photo" and not a.get("error")]
    if not photos:
        raise TMDError("No photographs in the inventory. Put them in 04_photographs/ and run ingest.")
    tr = TREATMENTS[treatment]
    fps = project.meta.get("canvas", {}).get("fps", 30)
    ana = read_json(project.dir / music_analysis) if music_analysis else None
    beat = 60.0 / ana["tempo_bpm"] if ana else 0.5
    total_t = (ana["duration"] if ana else None) or target or tr["target"]
    if target:
        total_t = min(total_t, target)
    secs = [s for s in (ana or {}).get("sections", []) if s.get("label")] or [{"start": 0, "end": total_t, "label": "drop"}]
    notes = read_json(project.brief / "photo_edit_notes.json", {}) or {}
    photos = [a for a in photos if a["filename"] not in set(notes.get("exclude", []))]
    ordered = sorted(photos, key=_exif_key)  # documentary: real order of capture where EXIF has it, never reshuffled for effect
    docs = bool(project.meta.get("documentary_mode"))
    if notes.get("order"):  # an editor's arrangement, recorded as such; it is NOT claimed to be chronological
        rank = {n: i for i, n in enumerate(notes["order"])}
        ordered = sorted(photos, key=lambda a: rank.get(a["filename"], 999))
    elif not docs:
        ordered = sorted(photos, key=lambda a: -(a.get("sharpness") or 0))
    clips, cur_beats, k, n_photo = [], 0.0, 0, 0
    end_frames_prev = 0
    flip = False
    while cur_beats * beat < total_t - 1e-6:
        t_now = cur_beats * beat
        sec = next((s for s in secs if s["start"] - 1e-6 <= t_now < s["end"]), secs[-1])
        pat = SECTION_PATTERNS[treatment][sec["label"]]
        b = pat[k % len(pat)]; k += 1
        end_beats = min(cur_beats + b, total_t / beat)
        ef = round(end_beats * beat * fps)
        nf = ef - end_frames_prev
        if nf < 2:
            cur_beats = end_beats
            continue
        a = ordered[n_photo % len(ordered)]
        cycle = n_photo // len(ordered)
        if sec["label"] == "break" and notes.get("hold"):
            a = next((x for x in photos if x["filename"] == notes["hold"]), a)
            cycle = 0
        fx, fy = (notes.get("focus", {}).get(a["filename"]) or a["focus"])["x"], (notes.get("focus", {}).get(a["filename"]) or a["focus"])["y"]
        zoom = {"from": 1.0, "to": 1.12} if not flip else {"from": 1.12, "to": 1.0}
        if cycle >= 1 or (treatment == "C" and n_photo % 3 == 2):  # a repeat is a different crop of the same frame, never a new "event"
            zoom = {"from": 1.7, "to": 1.9}
            fy = 0.28 if cycle % 2 == 0 else 0.72
            fx = fx if cycle < 2 else 1 - fx
        if treatment == "B":
            zoom = {"from": 1.0, "to": 1.07}
        clip = {"id": f"p{len(clips) + 1}", "src": a["rel_path"], "kind": "still", "dur": round(nf / fps, 4), "zoom": zoom, "focus": {"x": round(fx, 3), "y": round(fy, 3)},
                "label": a["filename"], "role": "photo", "notes": ("crop of an earlier photograph" if cycle >= 1 else "")}
        if notes.get("crop", {}).get(a["filename"]):
            clip["crop"] = notes["crop"][a["filename"]]
        if treatment in ("A", "C") and sec["label"] in ("drop", "build") and abs((t_now / (beat * 4)) - round(t_now / (beat * 4))) < 1e-3:
            clip["flash_in"] = {"color": "white", "dur": 0.06}  # flash on the downbeat only
        clips.append(clip)
        end_frames_prev = ef
        cur_beats = end_beats
        n_photo += 1
        flip = not flip
    if clips:
        clips[-1]["fade_out"] = 0.25
    ev = project.meta.get("event", {})
    st = project.meta.get("statement", {})
    overlays = []
    drop_t = next((x["start"] for x in secs if x.get("label") == "drop"), 0.0)
    for k, card in enumerate(st.get("cards", [])):
        at = {"start": 0.1, "drop": drop_t, "end": max(0.0, total_t - card.get("dur", 2.4) - 0.1)}.get(card.get("at", "start"), card.get("at") if isinstance(card.get("at"), (int, float)) else 0.1)
        dur = float(card.get("dur", 2.0))
        overlays.append({"id": f"card{k + 1}", "composition": "TypeCard", "start": round(at, 3), "dur": round(min(dur, total_t - at), 3),
                         "props": {"preset": card.get("preset", "poster_block"), "lines": [{"text": t, "hit": i * 7} for i, t in enumerate(card["lines"])], "position": card.get("position", "middle"), "size": card.get("size", 170)}})
    if ev:
        overlays.append({"id": "stamp", "composition": "Stamp", "start": 0.2, "dur": min(2.4, total_t - 0.4), "props": {"place": ev.get("place", ""), "time": ev.get("date", ""), "note": ev.get("note", ""), "position": "upper"}})
    layers = []
    if ana:
        gen = bool(ana.get("origin"))
        layers.append({"id": "score", "kind": "designed" if gen else "music_guide", "src": f"03_music_references/audio/{ana['file']}", "start": 0, "in": 0, "gain_db": -3 if gen else -8, "fade_in": 0.0, "fade_out": 0.5})
    return {"name": name or f"photos-{treatment.lower()}-{tr['name']}", "treatment": treatment, "treatment_label": tr["label"],
            "status": "DRAFT: machine-assembled photo montage; every choice still needs a director's pass", "documentary_mode": docs,
            "clips": clips, "audio_layers": layers, "overlays": overlays, "captions": "12_subtitles/captions.json",
            "intentional_silence": [[s["start"], s["end"]] for s in (ana or {}).get("silences", [])], "grade": {"look": PHOTO_LOOK[treatment]},
            **({"top_band": project.meta["top_band"]} if project.meta.get("top_band") else {}),
            "canvas": {**project.meta.get("canvas", {})}}


# ---------------------------------------------------------------------------------------------------------
# Treatment D, "The Slow Build" (reference style): hold, then accelerate. One sentence carries the voice.
# ---------------------------------------------------------------------------------------------------------
BUILD_DURATIONS = [2.6, 1.9, 1.5, 1.2, 1.0, 0.85, 0.7, 0.6, 0.5, 0.42, 0.36, 0.3, 0.26, 0.23, 0.2]
FINAL_HOLD = 3.0


def draft_reference(project: Project, name: str | None = None) -> dict:
    from engine.audio.synth import make_pulse
    inv = read_json(project.analysis / "inventory.json") or {}
    notes = read_json(project.brief / "photo_edit_notes.json", {}) or {}
    amap = {a["filename"]: a for a in inv.get("assets", []) if a["kind"] == "photo"}
    order = [f for f in notes.get("reference_order", []) if f in amap]
    final = notes.get("reference_final")
    if len(order) < 3 or final not in amap:
        raise TMDError("Treatment D needs reference_order and reference_final in 00_brief/photo_edit_notes.json.")
    fps = project.meta.get("canvas", {}).get("fps", 30)
    durs = BUILD_DURATIONS[:len(order)]
    starts_f, cur = [], 0
    for d in durs:
        starts_f.append(cur)
        cur += round(d * fps)
    final_f = cur
    total_f = cur + round(FINAL_HOLD * fps)
    hits = [f / fps for f in starts_f] + [final_f / fps]
    sc = make_pulse(project, hits, total_f / fps)
    clips = []
    for i, fn in enumerate(order):
        a = amap[fn]
        nf = (starts_f[i + 1] if i + 1 < len(starts_f) else final_f) - starts_f[i]
        slow = i < 5
        foc = notes.get("focus", {}).get(fn) or a["focus"]
        c = {"id": f"p{i + 1}", "src": a["rel_path"], "kind": "still", "dur": round(nf / fps, 4), "zoom": {"from": 1.0, "to": 1.08 if slow else 1.04},
             "focus": {"x": foc["x"], "y": foc["y"]}, "label": fn, "role": "photo"}
        if notes.get("crop", {}).get(fn):
            c["crop"] = notes["crop"][fn]
        clips.append(c)
    fa = amap[final]
    foc = notes.get("focus", {}).get(final) or fa["focus"]
    clips.append({"id": f"p{len(order) + 1}", "src": fa["rel_path"], "kind": "still", "dur": round((total_f - final_f) / fps, 4), "zoom": {"from": 1.0, "to": 1.06},
                  "focus": {"x": foc["x"], "y": foc["y"]}, "label": final, "role": "photo", "fade_out": 0.7, "notes": "closing wide hold"})
    th = project.meta.get("thesis", {})
    overlays = []
    nouns, at = th.get("nouns", []), th.get("noun_at_cut", [])
    for k, noun in enumerate(nouns):
        t0 = 0.35 if at[k] == 0 else starts_f[at[k]] / fps
        t1 = (starts_f[at[k + 1]] / fps) if k + 1 < len(nouns) else total_f / fps
        overlays.append({"id": f"thesis{k + 1}", "composition": "Thesis", "start": round(t0, 3), "dur": round(t1 - t0, 3),
                         "props": {"parts": [{"t": f"{noun}{th.get('frame', ' will not be ')}"}, {"t": th.get("word", "silenced"), "accent": True}], "position": "lower", "size": 118,
                                   "fadeIn": 8 if k == 0 else 1, "fadeOut": 20 if k == len(nouns) - 1 else 0}})
    return {"name": name or "reference-d-slow-build", "treatment": "D", "treatment_label": "The Slow Build",
            "status": "DRAFT: machine-assembled; every choice still needs a director's pass", "documentary_mode": True, "clips": clips,
            "audio_layers": [{"id": "pulse", "kind": "designed", "src": sc["file"], "start": 0, "in": 0, "gain_db": -2, "fade_in": 0.0, "fade_out": 0.0}],
            "overlays": overlays, "captions": "12_subtitles/captions.json", "intentional_silence": [], "grade": {"look": "editorial_bw"}, "canvas": {**project.meta.get("canvas", {})}}
