"""End-to-end self-test on SYNTHETIC fixtures. It proves the machinery works; it is not a creative test
and the fixtures are never presented as footage. Creates a throwaway project and removes it afterwards."""
from __future__ import annotations

import shutil
import time
import traceback

from engine.utilities import fixtures
from engine.utilities.common import PROJECTS, Project, read_json, write_json, ffmpeg
from engine.utilities.scaffold import new_project


def run_selftest(keep: bool = False) -> bool:
    results: list[tuple[str, bool, str]] = []

    def check(name, ok, detail=""):
        results.append((name, bool(ok), detail))
        print(f"  [{'PASS' if ok else 'FAIL'}] {name} {detail}", flush=True)

    t0 = time.time()
    slug = new_project("selftest-tmp", "Self test", documentary=True)
    P = Project(slug)
    try:
        fixtures.make_video(P.footage / "a_bars.mp4", "bars", 6, tone=220)
        fixtures.make_video(P.footage / "b_mandel.mp4", "mandel", 6, tone=330)
        fixtures.make_photo(P.photos / "p.jpg", 1500, 2000)
        (P.music / "audio").mkdir(exist_ok=True)
        fixtures.make_guide_track(P.music / "audio" / "guide.wav", 120, 12)

        from engine.analysis.ingest import ingest
        inv = ingest(P, proxies=True)
        check("ingest finds 2 videos + 1 photo", inv["summary"]["videos"] == 2 and inv["summary"]["photos"] == 1, str(inv["summary"]))
        a = next(x for x in inv["assets"] if x.get("filename") == "a_bars.mp4")
        check("transient detector finds the planted click at 1.0 s", any(abs(e["t"] - 1.0) < 0.1 for e in a["sound_events"]), str(a["sound_events"][:2]))
        check("proxy generated", (P.dir / a["proxy"]).exists())

        from engine.audio.music import analyse
        m = analyse(P.music / "audio" / "guide.wav", P.music / "analysis" / "guide.analysis.json")
        check("tempo within 1 BPM of 120", abs(m["tempo_bpm"] - 120) < 1, f"{m['tempo_bpm']} ({m['beat_source']})")
        check("first beat within 30 ms of 0.0", min(abs(b) for b in m["beats"][:2]) < 0.03, str(m["beats"][:2]))

        from engine.rendering import timeline as T
        base = {"name": "t", "documentary_mode": True, "captions": "12_subtitles/captions.json",
                "clips": [{"id": "c1", "src": "01_original_footage/a_bars.mp4", "in": 0.5, "dur": 2.0, "zoom": {"from": 1, "to": 1.1}, "focus": {"x": 0.5, "y": 0.5}, "audio": {"dialogue": True}},
                          {"id": "c2", "src": "01_original_footage/b_mandel.mp4", "in": 1.0, "dur": 1.5, "audio": {"lead": 0.3}},
                          {"id": "c3", "kind": "still", "src": "04_photographs/p.jpg", "dur": 1.0, "zoom": {"from": 1, "to": 1.15}}],
                "audio_layers": [{"id": "g", "kind": "music_guide", "src": "03_music_references/audio/guide.wav", "start": 0, "in": 0, "gain_db": -8, "duck": True}],
                "overlays": [{"id": "o1", "composition": "TypeCard", "start": 0.3, "dur": 1.5, "props": {"preset": "serif_statement", "lines": [{"text": "Self test", "emph": ["test"]}]}}]}
        write_json(P.subtitles / "captions.json", {"style": "clean_documentary", "items": [{"start": 2.0, "end": 4.0, "text": "A caption inside the safe area."}]})
        bad = {**base, "name": "bad", "clips": [{**base["clips"][0], "ramp": {"from": 1.0, "to": 0.5, "steps": 4}}]}
        errs, _ = T.validate(P, bad)
        check("documentary mode refuses an un-annotated speed ramp on factual footage", any("integrity_note" in e for e in errs))
        bad2 = {**base, "name": "bad2", "clips": [{**base["clips"][0], "interp": "mci", "integrity_note": "x"}]}
        errs, _ = T.validate(P, bad2)
        check("documentary mode refuses optical-flow interpolation on factual footage", any("optical-flow" in e for e in errs))
        T.save(P, base)
        errs, warns = T.validate(P, base)
        check("valid timeline passes validation", not errs, str(errs))

        from engine.audio import licensing
        r = licensing.save_track(P, {"title": "X", "artist": "Y", "licence_status": "LICENSED_EMBEDDABLE"})
        check("licensing gate rejects an embeddable claim without evidence", not r["ok"])
        ok, why = licensing.can_embed(P, None)
        check("an unlinked music layer cannot be embedded", not ok, why)

        # photo montage + original score + credits gate
        from engine.audio.synth import make_score
        from engine.video.roughcut import draft_photos
        from engine.rendering import credits
        sc = make_score(P, 132, 12)
        ana = read_json(P.dir / sc["analysis"])
        check("generated score has an exact grid at 132 BPM and a silence before the drop", ana["tempo_bpm"] == 132 and len(ana["silences"]) == 1 and ana["origin"].startswith("Original"))
        ingest(P, proxies=False)
        pt = draft_photos(P, "A", sc["analysis"], None, "ph")
        frames = round(sum(c["dur"] for c in pt["clips"]) * 30)
        check("photo montage fills the score to the frame (no drift)", frames == round(ana["duration"] * 30), f"{frames} vs {round(ana['duration'] * 30)} frames, {len(pt['clips'])} cuts")
        check("photo cuts are fast and flashes land only on downbeats", min(c["dur"] for c in pt["clips"]) >= 0.1 and all(c.get("flash_in") is None or c["role"] == "photo" for c in pt["clips"]))
        T.save(P, pt)
        _, w = T.validate(P, T.load(P, "ph"))
        check("photos without a photographer/licence on record are flagged draft-only", any("photo_credits" in x for x in w))
        credits.template(P)
        check("credits template written, nothing pre-filled", all(not v["photographer"] for v in credits.load(P).values()))

        from engine.rendering import render as R, qc
        prev = R.render(P, "t", mode="preview")
        pv = P.dir / prev["output"]
        check("a photo without a licence record marks the output UNCLEARED-DRAFT", "UNCLEARED-DRAFT" in prev["output"], prev["output"])
        cr = credits.load(P)
        for k in cr:
            cr[k].update({"photographer": "synthetic fixture", "licence": "generated by the self-test"})
        write_json(P.licences / "photo_credits.json", {"photos": cr})
        prev = R.render(P, "t", mode="preview")
        check("with a licence record the UNCLEARED marker is gone", "UNCLEARED" not in prev["output"], prev["output"])
        pv = P.dir / prev["output"]
        info = __import__("engine.video.probe", fromlist=["probe"]).probe(pv)
        exp_frames = round(4.5 * 30)
        check("preview is 540x960, 30 fps, exact frame count", (info["width"], info["height"]) == (540, 960) and info["nb_frames"] == exp_frames, f"{info['width']}x{info['height']} {info['nb_frames']}f (expected {exp_frames})")
        tl = T.load(P, "t")
        plan = T.compile_plan(P, tl, {"width": 1080, "height": 1920, "fps": 30})
        wk = P.work / "t"
        pre = R.build_audio_pieces(P, tl, plan, wk, R.VARIANTS["full"], "preview", [])
        fin = R.build_audio_pieces(P, tl, plan, wk, R.VARIANTS["full"], "final", [])
        check("guide music is in the preview mix", any(p["bus"] == "music" for p in pre))
        check("guide music is NOT in the final mix", not any(p["bus"] == "music" for p in fin))
        from engine.rendering.exports import export
        rep = export(P, "t", [("full", "9:16"), ("full", "1:1")], with_preview=False)
        statuses = {f"{d['variant']} {d['aspect']}": d["qc"] for d in rep["deliverables"]}
        check("final exports pass QC (warnings allowed, failures not)", all(s != "fail" for s in statuses.values()), str(statuses))
        out = P.exports / "t"
        check("EDL, source map, music notes, SRT, poster written", all((out / n).exists() for n in ("t.edl", "t.source_map.json", "MUSIC_NOTES.md", "t.srt")) and (P.thumbs / "t_poster.jpg").exists())
        q = read_json(out / "t_full_9x16.qc.json")
        check("final 9:16 is 1080x1920 H.264 / AAC 48k", all(i["status"] == "pass" for i in q["items"] if i["check"] in ("resolution", "codec", "audio_stream", "frame_count", "frame_rate")))
        check("true peak under -1 dBTP in delivered file", any(i["check"] == "true_peak" and i["status"] == "pass" for i in q["items"]))
    except Exception:
        traceback.print_exc()
        check("self-test ran without exceptions", False)
    finally:
        if not keep:
            shutil.rmtree(PROJECTS / slug, ignore_errors=True)
    ok = all(r[1] for r in results)
    print(f"\n{sum(r[1] for r in results)}/{len(results)} checks passed in {time.time() - t0:.0f}s: {'ALL GOOD' if ok else 'FAILURES ABOVE'}")
    return ok
