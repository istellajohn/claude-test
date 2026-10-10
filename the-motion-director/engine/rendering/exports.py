"""Orchestrates final deliverables: renders each requested variant, runs QC, picks a poster and writes the report."""
from __future__ import annotations

from engine.rendering import qc, render as R, timeline as T
from engine.utilities.common import Project, TMDError, progress, read_json, write_json, now_iso

DEFAULT_SET = [("full", "9:16")]
FULL_SET = [("full", "9:16"), ("clean", "9:16"), ("muted", "9:16"), ("natural_only", "9:16"), ("full", "4:5"), ("full", "1:1"), ("full", "16:9")]


def export(project: Project, tl_name: str, combos: list[tuple[str, str]] | None = None, with_preview: bool = True) -> dict:
    combos = combos or DEFAULT_SET
    tl = T.load(project, tl_name)
    results = []
    out_dir = project.exports / tl["name"]
    if with_preview:
        R.render(project, tl_name, mode="preview")
    for i, (variant, aspect) in enumerate(combos):
        progress(i / len(combos), f"export {variant} {aspect}")
        rep = R.render(project, tl_name, mode="final", variant=variant, aspect=aspect)
        mp4 = project.dir / rep["output"]
        plan = read_json(project.work / tl["name"] / "plan_summary.json")
        silence = tl.get("intentional_silence", [])
        res = qc.check(project, mp4, {"width": rep["canvas"]["width"], "height": rep["canvas"]["height"], "fps": rep["canvas"]["fps"],
                                      "audio": bool(R.VARIANTS[variant]["buses"]) and bool(tl["clips"]), "lufs": project.meta.get("loudness", {}).get("integrated_lufs", -14.0),
                                      "intentional_silence": silence, "has_stills": any(c.get("kind") == "still" or c.get("freeze") for c in tl["clips"]),
                                      "allow_black": [(0.0, 0.0)] if any(c.get("fade_in") for c in tl["clips"][:1]) else []},
                       plan, rep)
        results.append({"variant": variant, "aspect": aspect, "file": rep["output"], "qc": res["status"], "warnings": rep["warnings"]})
    main = next((project.dir / r["file"] for r in results if r["variant"] == "full" and r["aspect"] == "9:16"), None) or project.dir / results[0]["file"]
    project.thumbs.mkdir(exist_ok=True)
    poster = qc.pick_poster(main, project.thumbs / f"{tl['name']}_poster.jpg") if main.exists() else {}
    qc.contact_sheet(main, out_dir / f"{tl['name']}_contact_sheet.jpg")
    caps = read_json(project.dir / tl["captions"]) if tl.get("captions") else None
    if caps and caps.get("items"):
        from engine.subtitles import captions as C
        (out_dir / f"{tl['name']}.srt").write_text(C.to_srt(caps), encoding="utf-8")
    summary = {"timeline": tl["name"], "generated": now_iso(), "deliverables": results, "poster": poster, "notes": "See each .qc.json for checks that passed, warned or failed."}
    write_json(out_dir / "export_report.json", summary)
    meta = project.meta
    meta["status"] = "exported"
    project.save_meta(meta)
    progress(1.0, "exports complete")
    return summary
