import { api, media } from "../src/api.js";
import { h, toast, fmt, empty, field, nodes } from "../src/ui.js";

export async function render(ctx) {
  const root = h("div", {}, h("h1", {}, "Audio Analysis"), h("p", { class: "lede" }, "Waveform, detected beats and structure of reference or licensed audio. Beats are detected, not verified: check them by ear. Spotify is a discovery source; the engine never downloads from it."));
  const names = ctx.data.music_analyses;
  root.append(h("div", { class: "row", style: { marginBottom: "12px" } }, h("button", { class: "primary", onclick: () => ctx.run("music", {}) }, "Analyse files in 03_music_references/audio"), h("span", { class: "small muted" }, `${ctx.data.music_files.length} file(s) found`)));
  if (!names.length) { root.append(empty("No analysed audio", "Put a licensed track or guide track in 03_music_references/audio/ (you can upload it from here) and analyse it.", uploader(ctx))); return root; }
  const sel = h("select", { style: { width: "auto" } }, names.map((n) => h("option", { value: n }, n)));
  const host = h("div", {});
  const state = { name: names[0] };
  sel.addEventListener("change", () => { state.name = sel.value; load(); });
  root.append(h("div", { class: "row" }, h("span", { class: "field-label" }, "Track"), sel, uploader(ctx)), host);
  async function load() {
    const a = await api.get(`/api/p/${ctx.name}/music-analysis/${state.name}`);
    let cuts = [], off = 0, tl = null;
    if (ctx.activeTimeline) {
      tl = await api.get(`/api/p/${ctx.name}/timeline/${ctx.activeTimeline}`).catch(() => null);
      const layer = tl?.timeline.audio_layers?.find((l) => (l.src || "").includes(a.file));
      if (layer && tl.plan) { cuts = tl.plan.cuts.map((c) => c.start); off = (layer.in || 0) - (layer.start || 0); }
    }
    const cv = h("canvas", { class: "wave", width: 1600, height: 380 }), ctl = h("audio", { controls: true, src: media(ctx.name, `03_music_references/audio/${a.file}`), style: { width: "100%", marginTop: "10px" } });
    const draw = (ph) => {
      const g = cv.getContext("2d"), W = cv.width, H = cv.height, d = a.duration; g.clearRect(0, 0, W, H); g.fillStyle = "#0d0d0f"; g.fillRect(0, 0, W, H);
      (a.sections || []).forEach((s, i) => { if (s.start == null) return; g.fillStyle = s.energy === "high" ? "rgba(232,67,31,.10)" : s.energy === "low" ? "rgba(255,255,255,.02)" : "rgba(255,255,255,.05)"; g.fillRect((s.start / d) * W, 0, ((s.end - s.start) / d) * W, H); g.fillStyle = "#8e8c86"; g.font = "20px DM Mono, monospace"; g.fillText(`${s.energy || ""}`, (s.start / d) * W + 6, 22); });
      g.strokeStyle = "rgba(255,255,255,.07)"; (a.beats || []).forEach((b) => { g.beginPath(); g.moveTo((b / d) * W, 0); g.lineTo((b / d) * W, H); g.stroke(); });
      g.strokeStyle = "rgba(245,213,71,.65)"; g.lineWidth = 2; (a.downbeats_estimated || []).forEach((b) => { g.beginPath(); g.moveTo((b / d) * W, 0); g.lineTo((b / d) * W, H * 0.18); g.stroke(); }); g.lineWidth = 1;
      g.fillStyle = "#c9c6bd"; const n = a.waveform.length; a.waveform.forEach(([lo, hi], i) => { const x = (i / n) * W; g.fillRect(x, H / 2 - hi * H * 0.45, Math.max(1, W / n), Math.max(1, (hi - lo) * H * 0.45)); });
      g.fillStyle = "#e8431f"; (a.accent_candidates || []).forEach((c) => { g.beginPath(); g.arc((c.t / d) * W, H - 14, 6, 0, 7); g.fill(); });
      g.strokeStyle = "#4aa3ff"; g.lineWidth = 3; cuts.forEach((c) => { const t = c + off; if (t < 0 || t > d) return; g.beginPath(); g.moveTo((t / d) * W, H * 0.2); g.lineTo((t / d) * W, H); g.stroke(); }); g.lineWidth = 1;
      if (ph != null) { g.strokeStyle = "#fff"; g.beginPath(); g.moveTo((ph / d) * W, 0); g.lineTo((ph / d) * W, H); g.stroke(); }
    };
    draw();
    cv.addEventListener("click", (e) => { const r = cv.getBoundingClientRect(); ctl.currentTime = ((e.clientX - r.left) / r.width) * a.duration; });
    ctl.addEventListener("timeupdate", () => draw(ctl.currentTime));
    const fpsT = 1 / (tl?.plan?.fps || 30);
    const onBeat = cuts.filter((c) => a.beats.some((b) => Math.abs(b - (c + off)) <= fpsT + 1e-6)).length;
    host.replaceChildren(...nodes(h("div", { class: "spacer" }), cv, ctl,
      h("div", { class: "small muted", style: { marginTop: "6px" } }, "grey lines: beats · yellow ticks: estimated downbeats · red dots: accent candidates (energy rises) · blue: this timeline's cuts (if a guide layer points at this file) · shaded: structure by energy"),
      cuts.length ? h("div", { class: "info-box" }, `${onBeat} of ${cuts.length} cuts fall within one frame of a detected beat. Landing off the beat is often deliberate (syncopation); this is information, not a score.`) : null,
      h("div", { class: "grid g4", style: { marginTop: "14px" } }, [[a.tempo_bpm, "BPM (estimated)"], [`${a.tempo_alternatives[0]} / ${a.tempo_alternatives[1]}`, "half / double"], [fmt(a.duration, 1) + "s", "duration"], [a.beat_source, "beat source"]].map(([v, k]) => h("div", { class: "card stat" }, h("div", { class: "v", style: { fontSize: "22px" } }, v), h("div", { class: "k" }, k)))),
      a.grid_fit?.offbeat_note ? h("div", { class: "info-box" }, a.grid_fit.offbeat_note) : null, h("div", { class: "info-box" }, a.tempo_note),
      h("h2", {}, "Structure"), h("table", {}, h("thead", {}, h("tr", {}, ["start", "end", "energy", "mean dB"].map((x) => h("th", {}, x)))), h("tbody", {}, (a.sections || []).filter((s) => s.start != null).map((s) => h("tr", {}, h("td", { class: "mono" }, fmt(s.start, 2)), h("td", { class: "mono" }, fmt(s.end, 2)), h("td", {}, s.energy), h("td", { class: "mono" }, s.mean_db))))),
      h("h2", {}, "Accent candidates & silences"), h("div", { class: "small mono" }, (a.accent_candidates || []).map((c) => `${fmt(c.t, 2)}s (+${c.db} dB)`).join("  ·  ") || "none"), h("div", { class: "small mono muted", style: { marginTop: "6px" } }, (a.silences || []).map((s) => `silence ${fmt(s.start, 2)}–${fmt(s.end, 2)}s`).join("  ·  "))));
  }
  await load();
  return root;
}
function uploader(ctx) {
  const inp = h("input", { type: "file", accept: "audio/*", style: { display: "none" }, onchange: async (e) => { for (const f of e.target.files) { try { await api.upload(ctx.name, "03_music_references/audio", f); toast(`${f.name} uploaded`, "ok"); } catch (err) { toast(err.message, "err"); } } await ctx.reload(); ctx.render(); } });
  return h("span", {}, inp, h("button", { class: "sm", onclick: () => inp.click() }, "Upload audio file"));
}
