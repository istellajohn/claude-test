import { api, media } from "../src/api.js";
import { h, toast, bytes, fmt, statusChip, empty } from "../src/ui.js";
import { tlPicker } from "./storyboard.js";

const ASPECTS = [["full", "9:16", "Instagram Reel, captions and music-ready"], ["clean", "9:16", "No captions"], ["muted", "9:16", "No audio"], ["natural_only", "9:16", "Natural sound only, no music/designed"], ["full", "4:5", "Feed 4:5"], ["full", "1:1", "Square"], ["full", "16:9", "Landscape"]];

export async function render(ctx) {
  const root = h("div", {}, h("h1", {}, "Export Centre"), h("p", { class: "lede" }, "Final renders are full size H.264/AAC, run through quality control, with an EDL and a source map recording where every frame came from. Guide music never enters a final file."));
  root.append(tlPicker(ctx).row);
  const tl = ctx.activeTimeline;
  if (tl) root.append(h("div", { class: "card" }, h("div", { class: "row" },
    h("button", { class: "primary", onclick: () => ctx.run("export", { timeline: tl }) }, "Export 9:16 final + QC"), h("button", { onclick: () => ctx.run("export", { timeline: tl, all: true }) }, "Export every variant & aspect"),
    h("button", { onclick: () => ctx.run("render", { timeline: tl, mode: "preview" }) }, "Preview only")),
    h("p", { class: "small muted", style: { margin: "10px 0 0" } }, "Variants: " + ASPECTS.map(([v, a, n]) => `${v} ${a} (${n})`).join(" · ") + ". Exports take a few minutes: each variant is a separate full render. Re-framing for 4:5, 1:1 and 16:9 uses each clip's focus point; set per-aspect focus in the timeline JSON (focus_by_aspect) where the default is wrong.")));
  const ex = ctx.data.exports;
  if (!ex.length) { root.append(h("div", { class: "spacer" }), empty("Nothing exported yet", "Exports will appear here with their QC results.")); return root; }
  for (const e of ex) {
    const vids = e.files.filter((f) => f.name.endsWith(".mp4")), others = e.files.filter((f) => !f.name.endsWith(".mp4") && !f.name.endsWith(".qc.json") && !f.name.endsWith(".render.json"));
    root.append(h("h2", {}, e.timeline), e.report?.poster?.file ? h("div", { class: "small muted", style: { marginBottom: "8px" } }, `Poster frame: ${e.report.poster.time}s → 15_thumbnails/${e.timeline}_poster.jpg`) : null);
    for (const f of vids) {
      const qc = f.qc, r = f.render;
      root.append(h("div", { class: "card", style: { marginBottom: "12px" } }, h("div", { class: "row spread" },
        h("div", {}, h("b", {}, f.name), h("div", { class: "small muted mono" }, `${bytes(f.size)}${r ? ` · ${r.canvas.width}×${r.canvas.height} · ${fmt(r.duration, 2)}s · ${r.variant}` : ""}`)),
        h("div", { class: "row" }, qc ? statusChip(qc.status) : h("span", { class: "chip" }, "no QC"), h("a", { class: "btn sm", href: media(ctx.name, f.path, f.mtime) + "&download=1" }, "Download"))),
        qc ? h("details", {}, h("summary", {}, `Checks (${qc.items.filter((i) => i.status === "pass").length}/${qc.items.length} pass)`), h("table", {}, h("tbody", {}, qc.items.map((i) => h("tr", {}, h("td", { style: { width: "110px" } }, statusChip(i.status)), h("td", { class: "mono small" }, i.check), h("td", { class: "small muted" }, i.detail))))),
          qc.pacing ? h("div", { class: "small muted", style: { marginTop: "8px" } }, `Pacing: ${qc.pacing.cuts} cuts · median ${qc.pacing.median_shot_s}s · ${qc.pacing.cuts_per_10s} cuts / 10 s`) : null,
          h("div", { class: "info-box" }, "QC cannot judge: ", qc.not_automated.join(" · "))) : null));
    }
    if (others.length) root.append(h("div", { class: "row small" }, others.map((f) => h("a", { class: "btn sm", href: media(ctx.name, f.path, f.mtime) + "&download=1" }, f.name))));
  }
  const prevs = Object.entries(ctx.data.previews);
  if (prevs.length) root.append(h("h2", {}, "Previews"), h("div", { class: "row small" }, prevs.map(([t, p]) => h("a", { class: "btn sm", href: media(ctx.name, p.path, p.mtime) + "&download=1" }, `${t}_preview.mp4`))));
  return root;
}
