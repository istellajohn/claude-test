"""./tmd <command>. Run ./tmd --help."""
from __future__ import annotations

import argparse
import shutil
import sys

from engine.utilities.common import Project, TMDError, die, list_projects, log, read_json, write_json


def doctor_rows() -> list[tuple]:
    import importlib
    rows = []

    def tool(cmd, label=None):
        p = shutil.which(cmd)
        rows.append((label or cmd, bool(p), p or "missing"))

    for t in ("ffmpeg", "ffprobe", "node", "npm", "git", "git-lfs"):
        tool(t)
    for m, label in (("numpy", "numpy"), ("cv2", "opencv"), ("scenedetect", "PySceneDetect"), ("librosa", "librosa"), ("PIL", "Pillow"), ("faster_whisper", "faster-whisper (optional)")):
        try:
            mod = importlib.import_module(m)
            rows.append((label, True, getattr(mod, "__version__", "ok")))
        except Exception as e:
            rows.append((label, False, f"missing ({type(e).__name__})"))
    from engine.utilities.common import ROOT
    rows.append(("Remotion installed", (ROOT / "engine/motion/node_modules").is_dir(), "engine/motion/node_modules"))
    try:
        import cv2
        rows.append(("OpenCV face detector", hasattr(cv2, "CascadeClassifier"), "needs opencv 4.x"))
    except Exception:
        pass
    filters = shutil.which("ffmpeg") and __import__("subprocess").run(["ffmpeg", "-hide_banner", "-filters"], capture_output=True, text=True).stdout or ""
    for f in ("ass", "loudnorm", "sidechaincompress", "minterpolate", "blackdetect", "freezedetect"):
        rows.append((f"ffmpeg filter: {f}", f" {f} " in filters, ""))
    return rows


def doctor() -> int:
    ok = True
    for name, good, detail in doctor_rows():
        print(f"  [{'ok' if good else '--'}] {name:34s} {detail}")
        optional = "optional" in name or name == "git-lfs"
        ok &= good or optional
    return 0 if ok else 1


def main(argv=None):
    ap = argparse.ArgumentParser(prog="tmd", description="THE MOTION DIRECTOR")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor", help="check tools and dependencies")
    sub.add_parser("projects", help="list projects")
    p = sub.add_parser("new", help="create a new project folder"); p.add_argument("name"); p.add_argument("--title"); p.add_argument("--documentary", action="store_true"); p.add_argument("--fps", type=int, default=30)
    for c, h in (("ingest", "analyse footage, photos and audio; build inventory + shot log + proxies"), ("transcribe", "speech to text (faster-whisper)"),
                 ("music", "analyse reference/licensed audio in 03_music_references/audio"), ("storyboard", "extract storyboard frames for a timeline"),
                 ("validate", "validate a timeline"), ("rough-cut", "assemble a DRAFT timeline from the inventory"), ("render", "render a timeline"),
                 ("export", "render deliverables with QC"), ("qc", "run QC on an existing render")):
        q = sub.add_parser(c, help=h); q.add_argument("project")
        if c in ("storyboard", "validate", "render", "export", "qc"):
            q.add_argument("timeline")
        if c == "ingest": q.add_argument("--force", action="store_true"); q.add_argument("--no-proxies", action="store_true")
        if c == "transcribe": q.add_argument("--model", default="small"); q.add_argument("--language")
        if c == "music": q.add_argument("files", nargs="*")
        if c == "rough-cut": q.add_argument("--treatment", choices=["A", "B", "C", "all"], default="all"); q.add_argument("--music"); q.add_argument("--target", type=float)
        if c == "render": q.add_argument("--mode", choices=["preview", "final"], default="preview"); q.add_argument("--variant", default="full"); q.add_argument("--aspect", default="9:16")
        if c == "export": q.add_argument("--all", action="store_true", help="every variant and aspect ratio"); q.add_argument("--no-preview", action="store_true")
        if c == "qc": q.add_argument("file")
    q = sub.add_parser("serve", help="start the review dashboard"); q.add_argument("--port", type=int, default=8765); q.add_argument("--host", default="127.0.0.1")
    sub.add_parser("selftest", help="end-to-end pipeline test on synthetic fixtures")
    a = ap.parse_args(argv)
    try:
        if a.cmd == "doctor":
            sys.exit(doctor())
        if a.cmd == "projects":
            for n in list_projects():
                print(n, "-", Project(n).meta.get("status"))
            return
        if a.cmd == "new":
            from engine.utilities.scaffold import new_project
            print("created projects/" + new_project(a.name, a.title, a.documentary, a.fps)); return
        if a.cmd == "serve":
            from dashboard.server import serve
            serve(a.host, a.port); return
        if a.cmd == "selftest":
            from engine.utilities.selftest import run_selftest
            sys.exit(0 if run_selftest() else 1)
        P = Project(a.project)
        if a.cmd == "ingest":
            from engine.analysis.ingest import ingest
            inv = ingest(P, force=a.force, proxies=not a.no_proxies); print(inv["summary"])
        elif a.cmd == "transcribe":
            from engine.audio.transcribe import transcribe_project
            print(transcribe_project(P, a.model, a.language))
        elif a.cmd == "music":
            from engine.audio.music import analyse_project
            print(analyse_project(P, a.files or None))
        elif a.cmd == "storyboard":
            from engine.video.storyboard import build
            print(build(P, a.timeline))
        elif a.cmd == "validate":
            from engine.rendering import timeline as T
            errs, warns = T.validate(P, T.load(P, a.timeline))
            for w in warns: print("warning:", w)
            for e in errs: print("ERROR:", e)
            sys.exit(1 if errs else 0)
        elif a.cmd == "rough-cut":
            from engine.rendering import timeline as T
            from engine.video.roughcut import draft
            for t in (["A", "B", "C"] if a.treatment == "all" else [a.treatment]):
                tl = draft(P, t, a.music, a.target); path = T.save(P, tl); print("wrote", path.relative_to(P.dir), f"({len(tl['clips'])} clips)")
        elif a.cmd == "render":
            from engine.rendering.render import render
            r = render(P, a.timeline, a.mode, a.variant, a.aspect); print(r["output"], f"{r['duration']:.2f}s")
            for w in r["warnings"]: print("warning:", w)
        elif a.cmd == "export":
            from engine.rendering.exports import export, FULL_SET
            r = export(P, a.timeline, FULL_SET if a.all else None, not a.no_preview)
            for d in r["deliverables"]: print(f"{d['variant']:13s} {d['aspect']:5s} {d['qc']:20s} {d['file']}")
        elif a.cmd == "qc":
            from engine.rendering import qc
            mp4 = P.resolve(a.file)
            side = read_json(mp4.with_suffix(".render.json"), {}) or {}
            exp = {**side.get("canvas", {}), "audio": True}
            r = qc.check(P, mp4, exp, read_json(P.work / a.timeline / "plan_summary.json"), side or None); print(r["status"])
            for i in r["items"]:
                if i["status"] != "pass": print(f"  {i['status']}: {i['check']}: {i['detail']}")
    except TMDError as e:
        die(str(e))
