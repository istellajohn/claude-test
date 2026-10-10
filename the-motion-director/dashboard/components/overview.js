import { api } from "../src/api.js";
import { h, toast, field, empty, fmt } from "../src/ui.js";

export async function renderNoProject(ctx) {
  return h("div", {}, h("h1", {}, "No project yet"), h("p", { class: "lede" }, "Create one. It gets its own folder, brief, and an empty soundtrack shortlist."), newProjectForm(ctx));
}
function newProjectForm(ctx) {
  const name = h("input", { placeholder: "e.g. azad-maidan-protest" }), title = h("input", { placeholder: "Display title" });
  const doc = h("input", { type: "checkbox" });
  return h("div", { class: "card" }, h("h3", {}, "New project"),
    h("div", { class: "grid g2" }, field("Folder name", name), field("Title", title)),
    h("label", { class: "row small muted", style: { margin: "10px 0" } }, doc, "Documentary / real-world events (controls speed changes and re-ordering of factual footage)"),
    h("button", { class: "primary", onclick: async () => {
      try { const r = await api.post("/api/projects", { name: name.value, title: title.value, documentary: doc.checked }); localStorage.setItem("tmd.project", r.name); location.reload(); }
      catch (e) { toast(e.message, "err"); }
    } }, "Create project"));
}

export async function render(ctx) {
  const d = ctx.data, m = d.meta, s = d.inventory_summary;
  const brief = h("textarea", { style: { minHeight: "260px" } }, d.brief);
  const doctor = h("div", { class: "card" }, h("div", { class: "muted small" }, "checking tools…"));
  api.get("/api/doctor").then((rows) => doctor.replaceChildren(h("h3", {}, "Engine"), h("div", { class: "grid g2" }, rows.map((r) => h("div", { class: "row small" }, h("span", { class: `chip ${r.ok ? "ok" : "err"}` }, r.ok ? "ok" : "missing"), r.name, h("span", { class: "faint" }, r.ok ? r.detail : ""))))));
  const act = (label, action, args, hint) => h("button", { title: hint, onclick: () => ctx.run(action, args) }, label);
  const hasVideo = s && s.videos + s.photos + s.audio_files > 0;
  return h("div", {},
    h("div", { class: "row spread" }, h("div", {}, h("h1", {}, m.title || m.name), h("p", { class: "lede" }, `${m.platform.replace("_", " ")} · ${m.canvas.width}×${m.canvas.height} @ ${m.canvas.fps} fps · ${m.documentary_mode ? "documentary mode on" : "documentary mode off"}`)),
      h("span", { class: `chip ${m.status === "awaiting_footage" ? "warn" : "ok"}` }, m.status.replaceAll("_", " "))),
    !hasVideo ? empty("Waiting for footage", "Nothing has been ingested yet. Drop camera originals, photographs and recordings into the Footage Library (or straight into the project folders), then run ingest. No edit is made up from a description.", h("button", { class: "primary", onclick: () => ctx.go("library") }, "Open Footage Library")) :
    h("div", { class: "grid g4" }, [[s.videos, "videos"], [s.photos, "photographs"], [s.shots, "detected shots"], [fmt(s.total_video_seconds, 0) + "s", "footage"]].map(([v, k]) => h("div", { class: "card stat" }, h("div", { class: "v" }, v), h("div", { class: "k" }, k)))),
    h("h2", {}, "Workflow"),
    h("div", { class: "card" }, h("div", { class: "row" },
      act("1 · Ingest & analyse", "ingest", {}, "Probe, detect shots, score, proxy"), act("2 · Transcribe", "transcribe", {}, "Whisper; downloads a model on first use"),
      act("3 · Analyse music", "music", {}, "Beats, sections, accents for files in 03_music_references/audio"),
      act("4 · Rough cuts A / B / C", "rough-cut", { treatment: "all" }, "Machine-made drafts to react to"),
    ), h("p", { class: "small muted", style: { margin: "10px 0 0" } }, "Rough cuts are starting points, not directed edits. Treatments: A impact · B cinematic · C experimental editorial. Then refine in Storyboard and Timeline Preview.")),
    h("h2", {}, "Brief"), h("div", { class: "card" }, brief, h("div", { class: "spacer" }), h("button", { onclick: async () => { await api.put(`/api/p/${ctx.name}/brief`, { text: brief.value }); toast("Brief saved", "ok"); } }, "Save brief")),
    h("h2", {}, "Settings"),
    h("div", { class: "card row" },
      h("label", { class: "row small" }, h("input", { type: "checkbox", style: { width: "auto" }, checked: m.documentary_mode, onchange: async (e) => { await api.put(`/api/p/${ctx.name}/meta`, { documentary_mode: e.target.checked }); await ctx.reload(); toast("Saved", "ok"); } }), "Documentary mode"),
      h("span", { class: "small muted" }, "When on, speed ramps and freezes on factual clips need an integrity note, and optical-flow interpolation is refused.")),
    h("h2", {}, "Engine"), doctor,
    h("h2", {}, "New project"), newProjectForm(ctx));
}
