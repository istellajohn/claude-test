import { api, media } from "../src/api.js";
import { h, toast, fmt, tc, field, empty } from "../src/ui.js";

export async function render(ctx) {
  const root = h("div", {}, h("h1", {}, "Storyboard"), h("p", { class: "lede" }, "The edit as a sequence of frames. Select a clip to change its in-point, length, speed, framing and sound. Every change is validated, and the previous version of the timeline is kept in .history."));
  const sel = tlPicker(ctx);
  root.append(sel.row);
  if (!ctx.activeTimeline) { root.append(empty("No timeline yet", "Generate rough cuts from the Overview, or create an empty timeline here.", newTl(ctx))); return root; }
  const t = await api.get(`/api/p/${ctx.name}/timeline/${ctx.activeTimeline}`);
  const tl = t.timeline, cards = Object.fromEntries((t.storyboard?.cards || []).map((c) => [c.id, c]));
  t.errors.forEach((e) => root.append(h("div", { class: "err-box" }, e))); t.warnings.forEach((e) => root.append(h("div", { class: "warn-box" }, e)));
  if (tl.status) root.append(h("div", { class: "info-box" }, tl.status));
  root.append(h("div", { class: "row" }, h("button", { onclick: () => ctx.run("storyboard", { timeline: tl.name }) }, "Build storyboard frames"), h("span", { class: "small muted" }, t.plan ? `${tl.clips.length} clips · ${fmt(t.plan.duration, 2)}s` : "")));
  if (!tl.clips.length) { root.append(empty("Empty timeline", "Add shots from the Footage Library.")); return root; }
  const total = tl.clips.reduce((s, c) => s + (c.dur || (c.out - c.in) / (c.speed || 1)), 0);
  let selected = tl.clips[0].id;
  const strip = h("div", { class: "story" }), insp = h("div", {});
  const save = async (msg) => { try { await api.put(`/api/p/${ctx.name}/timeline/${tl.name}`, tl); toast(msg || "Saved", "ok"); await ctx.reload(); ctx.render(); } catch (e) { toast(e.message, "err"); (e.data?.errors || []).forEach((x) => toast(x, "err")); } };
  function paint() {
    strip.replaceChildren(...tl.clips.map((c, i) => {
      const d = c.dur || (c.out - c.in) / (c.speed || 1), card = cards[c.id];
      return h("div", { class: `card-s ${selected === c.id ? "sel" : ""}`, style: { width: `${Math.max(120, Math.min(260, 70 + d * 55))}px` }, onclick: () => { selected = c.id; paint(); inspect(); } },
        card ? h("img", { src: media(ctx.name, card.image, card.dur) }) : h("div", { style: { aspectRatio: "9/14", background: "#0d0d0f", display: "grid", placeItems: "center", color: "var(--faint)", font: "11px var(--mono)" } }, "no frame yet"),
        h("div", { class: "durbar", style: { width: `${(d / total) * 100}%` } }),
        h("div", { class: "m" }, h("div", {}, `${i + 1} · ${c.id}`), h("div", {}, `${fmt(d, 2)}s ${c.role ? "· " + c.role : ""}`), h("div", { class: "faint" }, c.label || (c.src || "").split("/").pop())));
    }));
  }
  function inspect() {
    const i = tl.clips.findIndex((c) => c.id === selected); const c = tl.clips[i]; if (!c) return;
    const num = (obj, key, step = 0.01, ph) => h("input", { type: "number", step, value: obj[key] ?? "", placeholder: ph, onchange: (e) => { e.target.value === "" ? delete obj[key] : (obj[key] = parseFloat(e.target.value)); } });
    c.zoom = c.zoom || {}; c.focus = c.focus || {}; c.audio = c.audio || {};
    const isVideo = (c.kind || "video") === "video";
    insp.replaceChildren(h("div", { class: "card", style: { marginTop: "10px" } }, h("div", { class: "row spread" }, h("h3", {}, `Clip ${c.id}`, h("span", { class: "muted small mono" }, `  ${c.src}`)),
      h("div", { class: "row" }, h("button", { class: "sm", disabled: i === 0, onclick: () => { [tl.clips[i - 1], tl.clips[i]] = [tl.clips[i], tl.clips[i - 1]]; save("Moved earlier"); } }, "◀ earlier"),
        h("button", { class: "sm", disabled: i === tl.clips.length - 1, onclick: () => { [tl.clips[i + 1], tl.clips[i]] = [tl.clips[i], tl.clips[i + 1]]; save("Moved later"); } }, "later ▶"),
        h("button", { class: "sm", onclick: () => { if (confirm(`Remove ${c.id} from the timeline? (The source file is untouched.)`)) { tl.clips.splice(i, 1); save("Removed"); } } }, "Remove"))),
      h("div", { class: "grid g4" }, isVideo ? field("In (s)", num(c, "in")) : null, field("Length (s, output)", num(c, "dur")), isVideo ? field("Speed", num(c, "speed", 0.05)) : null,
        field("Role", h("input", { value: c.role || "", onchange: (e) => (c.role = e.target.value) })),
        field("Focus x (0–1)", num(c.focus, "x")), field("Focus y (0–1)", num(c.focus, "y")), field("Zoom from", num(c.zoom, "from", 0.01, "1")), field("Zoom to", num(c.zoom, "to", 0.01, "1")),
        field("Fade in (s)", num(c, "fade_in")), field("Fade out (s)", num(c, "fade_out")), isVideo ? field("Sound lead (J-cut, s)", num(c.audio, "lead")) : null, isVideo ? field("Sound tail (L-cut, s)", num(c.audio, "tail")) : null),
      h("div", { class: "grid g2", style: { marginTop: "10px" } }, field("Label", h("input", { value: c.label || "", onchange: (e) => (c.label = e.target.value) })), field("Notes", h("input", { value: c.notes || "", onchange: (e) => (c.notes = e.target.value) }))),
      h("div", { class: "row", style: { marginTop: "10px" } }, h("label", { class: "row small" }, h("input", { type: "checkbox", style: { width: "auto" }, checked: !!c.factual_incident, onchange: (e) => (c.factual_incident = e.target.checked) }), "Factual incident footage"),
        h("label", { class: "row small" }, h("input", { type: "checkbox", style: { width: "auto" }, checked: !!c.audio.dialogue, onchange: (e) => (c.audio.dialogue = e.target.checked) }), "Dialogue (music ducks under it)"),
        h("label", { class: "row small" }, h("input", { type: "checkbox", style: { width: "auto" }, checked: !!c.freeze, onchange: (e) => (c.freeze = e.target.checked) }), "Freeze first frame")),
      h("div", { style: { marginTop: "10px" } }, field("Integrity note (required for speed changes on factual footage in documentary mode)", h("input", { value: c.integrity_note || "", onchange: (e) => (c.integrity_note = e.target.value) }))),
      h("div", { style: { marginTop: "12px" } }, h("button", { class: "primary", onclick: () => { ["zoom", "focus", "audio"].forEach((k) => { if (!Object.keys(c[k]).length) delete c[k]; }); save(); } }, "Save clip"))));
  }
  paint(); inspect(); root.append(strip, insp);
  return root;
}

export function tlPicker(ctx) {
  const s = h("select", { style: { width: "auto", minWidth: "220px" }, onchange: (e) => { ctx.setTimeline(e.target.value); ctx.render(); } }, ctx.data.timelines.map((t) => h("option", { value: t, selected: t === ctx.activeTimeline }, t)));
  return { row: h("div", { class: "row", style: { margin: "0 0 16px" } }, h("span", { class: "field-label" }, "Timeline"), ctx.data.timelines.length ? s : h("span", { class: "muted small" }, "none"), newTl(ctx)) };
}
function newTl(ctx) {
  return h("button", { class: "sm", onclick: async () => { const n = prompt("Timeline name"); if (!n) return; try { const r = await api.post(`/api/p/${ctx.name}/timelines`, { name: n }); await ctx.reload(); ctx.setTimeline(r.name); ctx.render(); } catch (e) { toast(e.message, "err"); } } }, "+ New timeline");
}
