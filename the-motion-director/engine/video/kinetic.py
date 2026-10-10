"""Voice-driven edit: the voice-over is the spine. Word timings (Whisper) decide every cut, every word of type,
the score hits and the treatment changes. Input: 00_brief/voiceover.json describing the lines.

voiceover.json: {"file": "02_audio/vo.wav", "lead": 0.6, "tail": 2.2, "lines": [
  {"text": "You can put us in *buses*.", "cut_every": 2, "treat": "bw", "slow": true}, ...]}
`*word*` marks a red word. `treat` is one of colour.grade.TREATS. A line with "black": true cuts to black on its first word.
"""
from __future__ import annotations

import re
from pathlib import Path

from engine.audio.synth import make_pulse
from engine.audio.transcribe import transcribe_file
from engine.utilities.common import Project, TMDError, read_json, write_json


def _norm(w: str) -> str:
    return re.sub(r"[^a-z0-9']", "", w.lower())


def word_times(project: Project, vo_rel: str) -> list[dict]:
    cache = project.transcripts / (Path(vo_rel).stem + ".json")
    tr = read_json(cache)
    if not tr:
        tr = transcribe_file(project.dir / vo_rel, "small")
        project.transcripts.mkdir(exist_ok=True)
        write_json(cache, tr)
    return [w for s in tr["segments"] for w in s["words"]]


def build(project: Project, name: str = "voice-driven") -> dict:
    cfg = read_json(project.brief / "voiceover.json")
    notes = read_json(project.brief / "photo_edit_notes.json", {}) or {}
    inv = read_json(project.analysis / "inventory.json") or {}
    if not cfg:
        raise TMDError("Missing 00_brief/voiceover.json")
    amap = {a["filename"]: a for a in inv.get("assets", []) if a["kind"] == "photo"}
    order = [f for f in notes.get("reference_order", []) if f in amap]
    final = notes.get("reference_final")
    if not order or final not in amap:
        raise TMDError("photo_edit_notes.json needs reference_order and reference_final")
    fps = project.meta.get("canvas", {}).get("fps", 30)
    lead, tail = float(cfg.get("lead", 0.6)), float(cfg.get("tail", 2.2))
    heard = word_times(project, cfg["file"])
    # script words, with red flags, aligned to the heard words in order
    script = []
    for li, ln in enumerate(cfg["lines"]):
        for tok in ln["text"].split():
            red = "*" in tok
            script.append({"line": li, "text": tok.replace("*", ""), "red": red})
    if len(script) != len(heard):
        raise TMDError(f"The recording has {len(heard)} words but the script has {len(script)}. Re-read or fix the script so they match; word-level sync needs the same words.")
    for s, h in zip(script, heard):
        if _norm(s["text"]) != _norm(h["w"]):
            raise TMDError(f"Script word '{s['text']}' does not match the recording's '{h['w']}' at {h['start']:.2f}s")
        s["start"], s["end"] = h["start"] + lead, h["end"] + lead
    vo_end = script[-1]["end"]
    total_t = vo_end + tail
    # cut points
    cuts = [{"t": 0.0, "line": 0, "word": 0}]
    first_idx = {}
    for i, w in enumerate(script):
        first_idx.setdefault(w["line"], i)
    for li, ln in enumerate(cfg["lines"]):
        idxs = [i for i, w in enumerate(script) if w["line"] == li]
        step = int(ln.get("cut_every", 1))
        for k, i in enumerate(idxs):
            if k % step == 0 and not (li == 0 and k == 0):
                cuts.append({"t": script[i]["start"], "line": li, "word": i})
    last_i = len(script) - 1
    cuts = [c for c in cuts if c["word"] != last_i] + [{"t": script[last_i]["start"], "line": cfg["lines"][-1] and len(cfg["lines"]) - 1, "word": last_i, "final": True}]
    cuts.sort(key=lambda c: c["t"])
    starts_f = [round(c["t"] * fps) for c in cuts]
    total_f = round(total_t * fps)
    clips, idx = [], 0
    for j, c in enumerate(cuts):
        ln = cfg["lines"][c["line"]]
        nf = (starts_f[j + 1] if j + 1 < len(cuts) else total_f) - starts_f[j]
        if nf < 2:
            continue
        treat = ln.get("treat", "bw")
        if c.get("final"):
            fn, treat, cycle = final, cfg.get("final_treat", "natural"), 0
        elif ln.get("black") and c["word"] == first_idx[c["line"]]:
            fn, treat, cycle = order[idx % len(order)], "black", 0
        else:
            fn, cycle = order[idx % len(order)], idx // len(order)
            idx += 1
        a = amap[fn]
        foc = (notes.get("focus", {}).get(fn) or a["focus"])
        zoom = {"from": 1.0, "to": 1.08 if ln.get("slow") or c.get("final") else 1.04}
        fx, fy = foc["x"], foc["y"]
        if cycle >= 1:
            zoom, fy = {"from": 1.7, "to": 1.9}, (0.28 if cycle % 2 == 1 else 0.72)
        clip = {"id": f"p{len(clips) + 1}", "src": a["rel_path"], "kind": "still", "dur": round(nf / fps, 4), "zoom": zoom, "focus": {"x": round(fx, 3), "y": round(fy, 3)},
                "label": fn, "role": "photo", "treat": treat, "notes": ("crop of an earlier photograph" if cycle >= 1 else ("closing wide hold" if c.get("final") else ""))}
        if notes.get("crop", {}).get(fn):
            clip["crop"] = notes["crop"][fn]
        if c.get("final"):
            clip["fade_out"] = 1.0
        clips.append(clip)
    # score: a thump on each line start, booms on the black line and at the end of the last word
    line_starts = [script[first_idx[li]]["start"] for li in range(len(cfg["lines"]))]
    booms = [script[first_idx[li]]["start"] for li, ln in enumerate(cfg["lines"]) if ln.get("black")] + [vo_end]
    hits = sorted(set([0.0] + line_starts + [vo_end]))
    sc = make_pulse(project, hits, total_t, name="score_voice", booms=booms, gain=0.55)
    words = [{"text": w["text"], "start": round(w["start"] * fps), "end": round(w["end"] * fps), "red": w["red"]} for w in script]
    return {"name": name, "treatment": "D", "treatment_label": "Voice-driven", "status": "DRAFT: machine-assembled from the voice-over timing; needs a director's pass",
            "documentary_mode": True, "clips": clips,
            "audio_layers": [{"id": "vo", "kind": "voiceover", "src": cfg["file"], "start": lead, "in": 0, "gain_db": cfg.get("vo_gain_db", 2)},
                             {"id": "bed", "kind": "designed", "src": sc["file"], "start": 0, "in": 0, "gain_db": -4}],
            "overlays": [{"id": "words", "composition": "KineticWords", "start": 0, "dur": round(total_t, 3), "props": {"words": words}}],
            "captions": "12_subtitles/captions.json", "intentional_silence": [], "canvas": {**project.meta.get("canvas", {})},
            "_sync": {"words": len(script), "voice_end": round(vo_end, 3), "total": round(total_t, 3), "cuts": len(clips)}}
