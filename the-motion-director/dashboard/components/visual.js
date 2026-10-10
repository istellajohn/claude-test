import { api } from "../src/api.js";
import { h, toast, field } from "../src/ui.js";

export async function render(ctx) {
  const vs = JSON.parse(JSON.stringify(ctx.data.visual_system || {})); vs.fonts = vs.fonts || {};
  const root = h("div", {}, h("h1", {}, "Visual System"), h("p", { class: "lede" }, "Tokens used by captions and motion graphics for this project. Change them per project: a protest documentary should not inherit a perfume film's palette. Colour grading of footage is set per clip (Storyboard) or globally in the timeline JSON."));
  const spec = h("div", { class: "specimen" });
  const colour = (k, label) => field(label, h("input", { type: "color", value: vs[k] || "#000000", oninput: (e) => { vs[k] = e.target.value; paint(); } }));
  const font = (k, label, opts) => field(label, h("select", { onchange: (e) => { vs.fonts[k] = e.target.value; paint(); } }, opts.map((o) => h("option", { selected: (vs.fonts[k] || opts[0]) === o }, o))));
  const capSel = h("select", { onchange: (e) => (vs.caption_style = e.target.value) }, Object.entries(ctx.data.caption_styles).map(([k, v]) => h("option", { value: k, selected: vs.caption_style === k }, v)));
  const grain = h("input", { type: "range", min: 0, max: 20, value: vs.grain || 0, oninput: (e) => { vs.grain = +e.target.value; gv.textContent = vs.grain; } }), gv = h("span", { class: "mono small" }, vs.grain || 0);
  const cs = h("input", { type: "range", min: 0.6, max: 1.4, step: 0.05, value: vs.caption_scale || 1, oninput: (e) => { vs.caption_scale = +e.target.value; cv.textContent = vs.caption_scale; } }), cv = h("span", { class: "mono small" }, vs.caption_scale || 1);
  function paint() {
    spec.style.setProperty("--ink", vs.ink); spec.style.background = vs.ink;
    spec.replaceChildren(
      h("div", { style: { fontFamily: `'${vs.fonts.mono || "DM Mono"}'`, color: vs.paper, fontSize: "13px", letterSpacing: ".08em", textTransform: "uppercase" } }, h("div", { style: { width: "42px", height: "2px", background: vs.accent, marginBottom: "8px" } }), "Place name, city", h("div", { style: { color: vs.signal } }, "14:20")),
      h("div", { style: { fontFamily: `'${vs.fonts.display || "Instrument Serif"}'`, color: vs.paper, fontSize: "46px", lineHeight: 1.02 } }, "Nine hours, ", h("i", {}, "standing"), h("br"), "and nobody left."),
      h("div", { style: { fontFamily: `'${vs.fonts.text || "Hanken Grotesk"}'`, color: vs.ash, fontSize: "14px" } }, "Body and caption text sit in the text face. Accent: ", h("span", { style: { color: vs.accent } }, "emphasis"), "."));
  }
  paint();
  root.append(h("div", { class: "grid g2", style: { alignItems: "start" } }, spec,
    h("div", { class: "card" }, h("h3", {}, "Palette"), h("div", { class: "grid g4" }, colour("ink", "Ink"), colour("paper", "Paper"), colour("ash", "Ash"), colour("accent", "Accent"), colour("signal", "Signal")),
      h("h3", { style: { marginTop: "16px" } }, "Typefaces (open licence, vendored)"), h("div", { class: "grid g3" }, font("display", "Display", ["Instrument Serif"]), font("text", "Text", ["Hanken Grotesk"]), font("mono", "Mono", ["DM Mono"])),
      h("p", { class: "small muted" }, "Only vendored faces are listed because only they are guaranteed to render. Add a font file to design-system/typography with its licence to extend this."),
      h("h3", { style: { marginTop: "16px" } }, "Captions & texture"), h("div", { class: "grid g3" }, field("Default caption style", capSel), field("Caption size", h("div", { class: "row" }, cs, cv)), field("Film grain (0 = none)", h("div", { class: "row" }, grain, gv))),
      h("div", { class: "spacer" }), h("button", { class: "primary", onclick: async () => { await api.put(`/api/p/${ctx.name}/visual-system`, vs); toast("Saved. Re-render the preview to see it.", "ok"); await ctx.reload(); } }, "Save visual system"))));
  return root;
}
