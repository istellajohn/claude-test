"""Local review dashboard server (stdlib only). Everything it shows comes from real project files;
every action it offers runs the real engine. Binds to 127.0.0.1 by default.

Mutating requests must carry the header X-TMD: 1. Browsers will not send a custom header cross-origin
without a pre-flight this server never answers, so other web pages cannot drive it.
"""
from __future__ import annotations

import json
import mimetypes
import os
import re
import subprocess
import sys
import threading
import time
import uuid
from collections import deque
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from engine.audio import licensing
from engine.rendering import timeline as T
from engine.subtitles import captions as C
from engine.utilities.common import (FONTS_DIR, FOLDERS, ROOT, Project, TMDError, ffmpeg, list_projects, read_json, slugify, write_json)

WEB = Path(__file__).resolve().parent
JOBS: dict[str, dict] = {}
UPLOAD_DIRS = {"01_original_footage", "02_audio", "03_music_references/audio", "04_photographs", "16_licences"}
ACTIONS = {
    "ingest": lambda p, a: ["ingest", p] + (["--force"] if a.get("force") else []),
    "music": lambda p, a: ["music", p] + list(a.get("files", [])),
    "score": lambda p, a: ["score", p, "--bpm", str(a.get("bpm", 132)), "--seconds", str(a.get("seconds", 30))],
    "transcribe": lambda p, a: ["transcribe", p, "--model", a.get("model", "small")],
    "storyboard": lambda p, a: ["storyboard", p, a["timeline"]],
    "rough-cut": lambda p, a: ["rough-cut", p, "--treatment", a.get("treatment", "all")] + (["--music", a["music"]] if a.get("music") else []) + (["--target", str(a["target"])] if a.get("target") else []),
    "render": lambda p, a: ["render", p, a["timeline"], "--mode", a.get("mode", "preview"), "--variant", a.get("variant", "full"), "--aspect", a.get("aspect", "9:16")],
    "export": lambda p, a: ["export", p, a["timeline"]] + (["--all"] if a.get("all") else []),
}


def start_job(project: str, action: str, args: dict) -> dict:
    if action not in ACTIONS:
        raise TMDError(f"Unknown action: {action}")
    for j in JOBS.values():
        if j["project"] == project and j["state"] == "running":
            raise TMDError(f"A job is already running for this project ({j['label']}). Wait for it to finish.")
    argv = [sys.executable, "-m", "engine"] + [str(x) for x in ACTIONS[action](project, args)]
    jid = uuid.uuid4().hex[:8]
    job = {"id": jid, "project": project, "action": action, "label": " ".join(argv[3:]), "state": "running", "progress": 0.0, "stage": "starting",
           "log": deque(maxlen=300), "started": time.time(), "code": None}
    JOBS[jid] = job

    def run():
        p = subprocess.Popen(argv, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        for line in p.stdout:
            line = line.rstrip()
            m = re.match(r"##PROGRESS ([\d.]+) (.*)", line)
            if m:
                job["progress"], job["stage"] = float(m.group(1)), m.group(2)
            elif line:
                job["log"].append(line)
        p.wait()
        job["code"] = p.returncode
        job["state"] = "done" if p.returncode == 0 else "failed"
        job["progress"] = 1.0 if p.returncode == 0 else job["progress"]
        job["finished"] = time.time()

    threading.Thread(target=run, daemon=True).start()
    return job_view(job)


def job_view(j: dict) -> dict:
    return {**{k: v for k, v in j.items() if k != "log"}, "log": list(j["log"])[-60:]}


def mt(p: Path) -> int:
    return int(p.stat().st_mtime) if p.exists() else 0


def bundle(name: str) -> dict:
    P = Project(name)
    inv = read_json(P.analysis / "inventory.json")
    tls = T.list_timelines(P)
    exports = []
    if P.exports.is_dir():
        for d in sorted(x for x in P.exports.iterdir() if x.is_dir()):
            files = []
            for f in sorted(d.iterdir()):
                if f.is_file():
                    entry = {"name": f.name, "size": f.stat().st_size, "path": f"14_final_exports/{d.name}/{f.name}", "mtime": mt(f)}
                    if f.suffix == ".mp4":
                        entry["qc"] = read_json(f.with_suffix(".qc.json"))
                        entry["render"] = read_json(f.with_suffix(".render.json"))
                    files.append(entry)
            exports.append({"timeline": d.name, "files": files, "report": read_json(d / "export_report.json")})
    prev = {t: {"path": f"13_previews/{t}_preview.mp4", "mtime": mt(P.previews / f"{t}_preview.mp4")} for t in tls if (P.previews / f"{t}_preview.mp4").exists()}
    return {
        "meta": P.meta, "brief": (P.brief / "brief.md").read_text(encoding="utf-8") if (P.brief / "brief.md").exists() else "",
        "inventory_summary": (inv or {}).get("summary"), "timelines": tls, "previews": prev, "exports": exports,
        "shortlist": licensing.load(P), "music_analyses": sorted(p.name.replace(".analysis.json", "") for p in (P.music / "analysis").glob("*.analysis.json")) if (P.music / "analysis").is_dir() else [],
        "music_files": sorted(p.name for p in (P.music / "audio").glob("*") if p.is_file() and not p.name.startswith(".")) if (P.music / "audio").is_dir() else [],
        "licence_files": sorted(p.name for p in P.licences.glob("*") if p.is_file() and not p.name.startswith(".")) if P.licences.is_dir() else [],
        "captions": read_json(P.subtitles / "captions.json", {"style": "minimal_editorial", "items": []}),
        "visual_system": read_json(P.motion / "visual_system.json", {}),
        "caption_styles": {k: v["label"] for k, v in C.styles().items()},
        "transcripts": sorted(p.stem for p in P.transcripts.glob("*.json")) if P.transcripts.is_dir() else [],
        "licensing": {"instagram_status": licensing.INSTAGRAM_STATUS, "licence_status": licensing.LICENCE_STATUS},
    }


def timeline_view(P: Project, tl_name: str) -> dict:
    tl = T.load(P, tl_name)
    errs, warns = T.validate(P, tl)
    plan = read_json(P.work / tl_name / "plan_summary.json")
    sb = read_json(P.storyboards / tl_name / "storyboard.json")
    if not plan and not errs:
        try:
            pl = T.compile_plan(P, tl)
            plan = {"cuts": T.cuts_from_plan(pl), "duration": pl["duration"], "fps": pl["fps"], "canvas": pl["canvas"]}
        except Exception as e:
            warns.append(f"could not compile plan: {e}")
    return {"timeline": tl, "errors": errs, "warnings": warns, "plan": plan, "storyboard": sb}


class H(BaseHTTPRequestHandler):
    server_version = "TMD/0.1"

    def log_message(self, fmt, *a):
        pass

    # ---- helpers
    def send_json(self, obj, status=200):
        b = json.dumps(obj, default=str).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}") if n else {}

    def send_file(self, path: Path, ctype=None, download=False):
        if not path.is_file():
            return self.send_json({"error": "not found"}, 404)
        size = path.stat().st_size
        ctype = ctype or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        start, end, status = 0, size - 1, 200
        rng = self.headers.get("Range")
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if m:
                if m.group(1):
                    start = int(m.group(1))
                    end = int(m.group(2)) if m.group(2) else size - 1
                else:
                    start, end = max(0, size - int(m.group(2))), size - 1
                end = min(end, size - 1)
                status = 206
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        if download:
            self.send_header("Content-Disposition", f'attachment; filename="{path.name}"')
        self.end_headers()
        try:
            with open(path, "rb") as f:
                f.seek(start)
                left = end - start + 1
                while left > 0:
                    chunk = f.read(min(1 << 20, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def guard(self) -> bool:
        if self.headers.get("X-TMD") != "1":
            self.send_json({"error": "missing X-TMD header"}, 403)
            return False
        return True

    # ---- routing
    def do_GET(self):
        try:
            self.route("GET")
        except TMDError as e:
            self.send_json({"error": str(e)}, 400)
        except Exception as e:  # keep the server alive, tell the user
            self.send_json({"error": f"{type(e).__name__}: {e}"}, 500)

    def do_POST(self):
        if self.guard():
            self.do_GET_like("POST")

    def do_PUT(self):
        if self.guard():
            self.do_GET_like("PUT")

    def do_DELETE(self):
        if self.guard():
            self.do_GET_like("DELETE")

    def do_GET_like(self, method):
        try:
            self.route(method)
        except TMDError as e:
            self.send_json({"error": str(e)}, 400)
        except json.JSONDecodeError:
            self.send_json({"error": "invalid JSON"}, 400)
        except Exception as e:
            self.send_json({"error": f"{type(e).__name__}: {e}"}, 500)

    def route(self, method):
        u = urlparse(self.path)
        path, q = unquote(u.path), parse_qs(u.query)
        if method == "GET" and path in ("/", "/index.html"):
            return self.send_file(WEB / "index.html", "text/html; charset=utf-8")
        if method == "GET" and path.startswith("/static/"):
            f = (WEB / path[len("/static/"):]).resolve()
            if WEB.resolve() not in f.parents:
                return self.send_json({"error": "forbidden"}, 403)
            return self.send_file(f)
        if method == "GET" and path.startswith("/fonts/"):
            f = (FONTS_DIR / path[len("/fonts/"):]).resolve()
            if FONTS_DIR.resolve() not in f.parents:
                return self.send_json({"error": "forbidden"}, 403)
            return self.send_file(f)
        if method == "GET" and path.startswith("/media/"):
            _, _, name, rel = path.split("/", 3)
            P = Project(name)
            f = P.resolve(rel)
            if any(part.startswith(".") for part in f.relative_to(P.dir).parts):
                return self.send_json({"error": "forbidden"}, 403)
            return self.send_file(f, download=q.get("download") == ["1"])
        if path == "/api/doctor" and method == "GET":
            from engine.utilities.cli import doctor_rows
            return self.send_json([{"name": n, "ok": ok, "detail": d} for n, ok, d in doctor_rows()])
        if path == "/api/projects":
            if method == "GET":
                return self.send_json([{"name": n, **{k: Project(n).meta.get(k) for k in ("title", "status", "documentary_mode")}} for n in list_projects()])
            b = self.body()
            from engine.utilities.scaffold import new_project
            return self.send_json({"name": new_project(b["name"], b.get("title"), bool(b.get("documentary")))})
        if path == "/api/jobs" and method == "GET":
            return self.send_json([job_view(j) for j in sorted(JOBS.values(), key=lambda j: -j["started"])[:12]])
        m = re.fullmatch(r"/api/jobs/(\w+)", path)
        if m and method == "GET":
            j = JOBS.get(m.group(1))
            return self.send_json(job_view(j) if j else {"error": "unknown job"}, 200 if j else 404)
        m = re.match(r"/api/p/([^/]+)(/.*)?$", path)
        if not m:
            return self.send_json({"error": "not found"}, 404)
        name, sub = m.group(1), m.group(2) or ""
        P = Project(name)
        if sub == "" and method == "GET":
            return self.send_json(bundle(name))
        if sub == "/inventory" and method == "GET":
            return self.send_json(read_json(P.analysis / "inventory.json", {"assets": [], "shots": []}))
        if sub == "/brief" and method == "PUT":
            (P.brief / "brief.md").write_text(self.body().get("text", ""), encoding="utf-8")
            return self.send_json({"ok": True})
        if sub == "/meta" and method == "PUT":
            b = self.body()
            meta = P.meta
            for k in ("title", "documentary_mode", "chosen_treatment", "music_intent", "loudness"):
                if k in b:
                    meta[k] = b[k]
            P.save_meta(meta)
            return self.send_json({"ok": True, "meta": meta})
        if sub == "/captions" and method == "PUT":
            b = self.body()
            items = []
            for it in b.get("items", []):
                if str(it.get("text", "")).strip():
                    items.append({**{k: v for k, v in it.items() if k in ("text", "kicker", "emph")}, "start": round(float(it["start"]), 3), "end": round(float(it["end"]), 3)})
            if b.get("style") not in C.styles():
                raise TMDError("unknown caption style")
            items.sort(key=lambda i: i["start"])
            write_json(P.subtitles / "captions.json", {"style": b["style"], "items": items})
            return self.send_json({"ok": True, "items": items, "issues": C.check_layout(C.build_ass({"style": b["style"], "items": items}, {"width": 1080, "height": 1920}, read_json(P.motion / "visual_system.json", {}))[1], {"width": 1080, "height": 1920})})
        if sub == "/captions/from-transcript" and method == "POST":
            tr = read_json(P.transcripts / f"{self.body()['file']}.json")
            if not tr:
                raise TMDError("transcript not found")
            items = [{"start": s["start"], "end": s["end"], "text": s["text"]} for s in tr["segments"]]
            return self.send_json({"items": items, "note": "Imported from a machine transcript. Check every line against the audio."})
        if sub == "/visual-system" and method == "PUT":
            write_json(P.motion / "visual_system.json", self.body())
            return self.send_json({"ok": True})
        m2 = re.fullmatch(r"/timeline/([\w.-]+)", sub)
        if m2:
            if method == "GET":
                return self.send_json(timeline_view(P, m2.group(1)))
            if method == "PUT":
                tl = self.body()
                tl["name"] = m2.group(1)
                errs, warns = T.validate(P, tl)
                if errs:
                    return self.send_json({"ok": False, "errors": errs, "warnings": warns}, 422)
                T.save(P, tl)
                (P.work / tl["name"] / "plan_summary.json").unlink(missing_ok=True)
                return self.send_json({"ok": True, "warnings": warns})
        if sub == "/timelines" and method == "POST":
            b = self.body()
            nm = slugify(b["name"])
            if (P.timelines / f"{nm}.timeline.json").exists():
                raise TMDError("a timeline with that name exists")
            T.save(P, {"name": nm, "documentary_mode": bool(P.meta.get("documentary_mode")), "clips": [], "audio_layers": [], "overlays": [], "captions": "12_subtitles/captions.json", "intentional_silence": []})
            return self.send_json({"ok": True, "name": nm})
        m2 = re.fullmatch(r"/music-analysis/([\w.-]+)", sub)
        if m2 and method == "GET":
            return self.send_json(read_json(P.music / "analysis" / f"{m2.group(1)}.analysis.json", {}))
        if sub == "/music/track":
            if method == "POST":
                return self.send_json(licensing.save_track(P, self.body()))
            if method == "DELETE":
                licensing.delete_track(P, q["id"][0])
                return self.send_json({"ok": True})
        if sub == "/shot-note" and method == "POST":
            b = self.body()
            inv = read_json(P.analysis / "inventory.json")
            for s in inv["shots"]:
                if s["id"] == b["id"]:
                    s["notes"] = b["note"]
            write_json(P.analysis / "inventory.json", inv)
            from engine.analysis.ingest import write_shot_log
            write_shot_log(P, inv)
            return self.send_json({"ok": True})
        if sub == "/job" and method == "POST":
            b = self.body()
            return self.send_json(start_job(name, b["action"], b.get("args", {})))
        if sub == "/upload" and method == "POST":
            folder = q["folder"][0]
            if folder not in UPLOAD_DIRS:
                raise TMDError("uploads are only allowed into the source folders")
            fn = Path(q["filename"][0]).name
            if not fn or fn.startswith("."):
                raise TMDError("bad file name")
            dest = P.resolve(f"{folder}/{fn}")
            n, got = int(self.headers.get("Content-Length") or 0), 0
            tmp = dest.with_suffix(dest.suffix + ".part")
            dest.parent.mkdir(parents=True, exist_ok=True)
            if dest.exists():
                raise TMDError(f"{fn} already exists; originals are never overwritten. Rename the file and upload again.")
            with open(tmp, "wb") as f:
                while got < n:
                    chunk = self.rfile.read(min(1 << 20, n - got))
                    if not chunk:
                        break
                    f.write(chunk)
                    got += len(chunk)
            os.replace(tmp, dest)
            return self.send_json({"ok": True, "path": f"{folder}/{fn}", "bytes": got})
        if sub == "/caption-frame" and method == "GET":
            tl_name = q["timeline"][0]
            t = float(q.get("t", ["0"])[0])
            wk = P.work / tl_name
            vids = [wk / "video_540x960.mp4"] if (wk / "video_540x960.mp4").exists() else sorted(wk.glob("video_*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
            if not vids:
                raise TMDError("Render a preview first: there is no picture to place the captions on.")
            from engine.video.probe import probe
            info = probe(vids[0])
            cv = {"width": info["width"], "height": info["height"]}
            ass, _ = C.build_ass(read_json(P.subtitles / "captions.json", {}), cv, read_json(P.motion / "visual_system.json", {}))
            af = P.work / "caption_frame.ass"
            af.write_text(ass, encoding="utf-8")
            from engine.rendering.render import esc_filter_path
            out = P.work / "caption_frame.jpg"
            ffmpeg(["-i", str(vids[0]), "-vf", f"ass=filename='{esc_filter_path(af)}':fontsdir='{esc_filter_path(FONTS_DIR)}'", "-ss", f"{t:.3f}", "-frames:v", "1", "-q:v", "3", str(out)])
            return self.send_file(out, "image/jpeg")
        return self.send_json({"error": "not found"}, 404)


def serve(host: str = "127.0.0.1", port: int = 8765):
    srv = ThreadingHTTPServer((host, port), H)
    print(f"THE MOTION DIRECTOR dashboard: http://{host}:{port}/   (Ctrl+C to stop)", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
