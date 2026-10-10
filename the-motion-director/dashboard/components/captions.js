import { api } from "../src/api.js";
import { h, toast, fmt, field, empty } from "../src/ui.js";

const srtT = (x) => { const ms = Math.round(x * 1000), p = (n, w = 2) => String(n).padStart(w, "0"); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };

export async function render(ctx) {
  const d = ctx.data;
  const caps = JSON.parse(JSON.stringify(d.captions));
  const root = h("div", {}, h("h1", {}, "Caption Editor"), h("p", { class: "lede" }, "Words are never changed to make a stronger caption. Edit text and timing here; the style decides how it is set. Preview frames are drawn by the same engine that renders the video."));
  const styleSel = h("select", { style: { width: "auto" }, onchange: (e) => (caps.style = e.target.value) }, Object.entries(d.caption_styles).map(([k, v]) => h("option", { value: k, selected: caps.style === k }, v)));
  const body = h("tbody", {}), issues = h("div", {}), frame = h("div", {}, h("div", { class: "info-box" }, "Press Frame on a row. It needs a rendered preview of the active timeline as the picture underneath."));
  const num = (it, k) => h("input", { type: "number", step: "0.01", value: it[k], style: { width: "84px" }, onchange: (e) => (it[k] = parseFloat(e.target.value)) });
  function rows() {
    body.replaceChildren(...caps.items.map((it, i) => h("tr", {}, h("td", { class: "mono faint" }, i + 1), h("td", {}, num(it, "start")), h("td", {}, num(it, "end")),
      h("td", {}, h("input", { value: it.text || "", onchange: (e) => (it.text = e.target.value) })), h("td", {}, h("input", { value: it.kicker || "", placeholder: "lower-third kicker (place · time)", onchange: (e) => (it.kicker = e.target.value) })),
      h("td", {}, h("input", { value: (it.emph || []).join(", "), placeholder: "emphasis words", style: { width: "130px" }, onchange: (e) => (it.emph = e.target.value.split(",").map((x) => x.trim()).filter(Boolean)) })),
      h("td", { style: { whiteSpace: "nowrap" } }, h("button", { class: "sm", title: "Draw this caption on the rendered picture", onclick: () => preview(it.start + 0.4) }, "Frame"), " ", h("button", { class: "sm", onclick: () => { caps.items.splice(i, 1); rows(); } }, "×")))));
  }
  async function preview(t) {
    if (!ctx.activeTimeline) return toast("Create a timeline first", "err");
    try { await save(true); } catch { return; }
    const img = h("img", { src: `/api/p/${ctx.name}/caption-frame?timeline=${ctx.activeTimeline}&t=${t}&_=${Date.now()}`, style: { maxHeight: "560px", borderRadius: "6px", border: "1px solid var(--line)" } });
    img.addEventListener("error", async () => { const r = await fetch(img.src).then((x) => x.json()).catch(() => ({})); frame.replaceChildren(h("div", { class: "err-box" }, r.error || "Could not draw the frame.")); });
    frame.replaceChildren(img);
  }
  async function save(quiet) {
    try { const r = await api.put(`/api/p/${ctx.name}/captions`, caps); caps.items = r.items; issues.replaceChildren(...r.issues.map((x) => h("div", { class: "warn-box" }, x))); if (!quiet) toast("Captions saved", "ok"); await ctx.reload(); rows(); }
    catch (e) { toast(e.message, "err"); throw e; }
  }
  rows();
  const tsel = h("select", { style: { width: "auto" } }, h("option", { value: "" }, "Import from transcript…"), d.transcripts.map((t) => h("option", { value: t }, t)));
  tsel.addEventListener("change", async () => { if (!tsel.value) return; const r = await api.post(`/api/p/${ctx.name}/captions/from-transcript`, { file: tsel.value }); caps.items = r.items; rows(); toast(r.note); });
  root.append(h("div", { class: "row spread" }, h("div", { class: "row" }, h("span", { class: "field-label" }, "Style"), styleSel, d.transcripts.length ? tsel : h("span", { class: "small muted" }, "No transcripts yet (run Transcribe from the Overview).")),
    h("div", { class: "row" }, h("button", { onclick: () => { const last = caps.items[caps.items.length - 1]; caps.items.push({ start: last ? last.end + 0.2 : 0, end: (last ? last.end + 0.2 : 0) + 2, text: "" }); rows(); } }, "+ Caption"), h("button", { class: "primary", onclick: () => save().catch(() => {}) }, "Save captions"),
      h("button", { onclick: () => { const s = caps.items.filter((i) => i.text).map((it, n) => `${n + 1}\n${srtT(it.start)} --> ${srtT(it.end)}\n${it.text}\n`).join("\n"); const a = h("a", { href: URL.createObjectURL(new Blob([s], { type: "text/plain" })), download: `${ctx.name}.srt` }); a.click(); } }, "Download SRT"))),
    h("div", { class: "spacer" }), caps.items.length || true ? h("table", {}, h("thead", {}, h("tr", {}, ["#", "start (s)", "end (s)", "text", "kicker", "emphasis", ""].map((x) => h("th", {}, x)))), body) : null, issues,
    h("div", { class: "small muted", style: { marginTop: "8px" } }, "Safe area: captions are laid out inside the Reels safe zone (top 13%, bottom 20%, right 12%). Layout issues are listed above after saving."),
    h("h2", {}, "Frame preview"), frame);
  return root;
}
