import { api, media } from "../src/api.js";
import { h, toast, fmt, tc, empty } from "../src/ui.js";
import { tlPicker } from "./storyboard.js";

const SAFE_916 = { l: 0.06, r: 0.12, t: 0.13, b: 0.2 };

export async function render(ctx) {
  const root = h("div", {}, h("h1", {}, "Timeline Preview"), h("p", { class: "lede" }, "Frame-accurate review of the rendered preview (half-size, guide music included). Cut markers come from the compiled timeline, not from the video."));
  root.append(tlPicker(ctx).row);
  if (!ctx.activeTimeline) { root.append(empty("No timeline", "Create one in Storyboard or generate rough cuts from the Overview.")); return root; }
  const name = ctx.activeTimeline, t = await api.get(`/api/p/${ctx.name}/timeline/${name}`), pv = ctx.data.previews[name];
  t.errors.forEach((e) => root.append(h("div", { class: "err-box" }, e))); t.warnings.forEach((e) => root.append(h("div", { class: "warn-box" }, e)));
  const plan = t.plan, fps = plan?.fps || 30, cuts = plan?.cuts || [];
  root.append(h("div", { class: "row", style: { marginBottom: "12px" } }, h("button", { class: "primary", disabled: !!t.errors.length, onclick: () => ctx.run("render", { timeline: name, mode: "preview" }) }, pv ? "Re-render preview" : "Render preview"),
    pv ? h("span", { class: "small muted" }, "Preview exists. Re-render after you change the timeline, captions or visual system.") : h("span", { class: "small muted" }, "No preview yet.")));
  if (!pv) { root.append(empty("No preview rendered", "Rendering produces a real half-size MP4 from your source footage.")); }
  else {
    const v = h("video", { src: media(ctx.name, pv.path, pv.mtime), preload: "auto", playsinline: true, style: { maxHeight: "70vh", width: "auto", maxWidth: "100%" } });
    const safe = h("div", { hidden: true, style: { position: "absolute", inset: 0, pointerEvents: "none" } },
      h("div", { class: "safe-fill", style: { left: 0, right: 0, top: 0, height: `${SAFE_916.t * 100}%` } }), h("div", { class: "safe-fill", style: { left: 0, right: 0, bottom: 0, height: `${SAFE_916.b * 100}%` } }), h("div", { class: "safe-fill", style: { right: 0, top: `${SAFE_916.t * 100}%`, bottom: `${SAFE_916.b * 100}%`, width: `${SAFE_916.r * 100}%` } }),
      h("div", { class: "safe", style: { left: `${SAFE_916.l * 100}%`, right: `${SAFE_916.r * 100}%`, top: `${SAFE_916.t * 100}%`, bottom: `${SAFE_916.b * 100}%` } }));
    const tcEl = h("div", { class: "tcbig" }), info = h("div", { class: "small muted" }), head = h("div", { class: "head" }), scrub = h("div", { class: "scrub" });
    const dur = plan?.duration || 1;
    cuts.forEach((c, i) => scrub.append(h("div", { class: `cut ${c.role === "hero" ? "hero" : ""}`, title: `${c.id} · ${c.src} @ ${fmt(c.src_in, 2)}s`, style: { left: `${(c.start / dur) * 100}%`, width: `${(c.dur / dur) * 100}%` }, onclick: (e) => { e.stopPropagation(); v.currentTime = c.start + 0.001; } }, c.label || c.id)));
    scrub.append(head);
    scrub.addEventListener("click", (e) => { const r = scrub.getBoundingClientRect(); v.currentTime = ((e.clientX - r.left) / r.width) * (v.duration || dur); });
    const upd = () => {
      const tt = v.currentTime, f = Math.round(tt * fps), r = Math.round(fps), ff = f % r, s = Math.floor(f / r), p = (n) => String(n).padStart(2, "0");
      tcEl.replaceChildren(`${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:`, h("span", { class: "fr" }, p(ff)), h("span", { class: "faint small" }, `  frame ${f}`));
      head.style.left = `${(tt / (v.duration || dur)) * 100}%`;
      const c = [...cuts].reverse().find((x) => tt + 0.0005 >= x.start);
      info.textContent = c ? `${c.id}${c.label ? " · " + c.label : ""} · ${c.src} · source in ${fmt(c.src_in, 2)}s${c.role ? " · " + c.role : ""}` : "";
    };
    const loop = () => { upd(); if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(loop); else requestAnimationFrame(loop); };
    v.addEventListener("loadedmetadata", () => { loop(); });
    v.addEventListener("seeked", upd);
    v.addEventListener("error", () => root.prepend(h("div", { class: "err-box" }, "The browser could not decode the preview file. Re-render it, or open it directly from 13_previews/.")));
    const step = (n) => { v.pause(); v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + n / fps)); };
    const toggle = () => (v.paused ? v.play() : v.pause());
    const rate = (r) => { v.playbackRate = r; toast(`Speed ${r}×`); };
    const keys = (e) => {
      if (!document.body.contains(v)) { removeEventListener("keydown", keys); return; }
      if (e.target.matches("input,textarea,select")) return;
      const m = { " ": toggle, k: () => v.pause(), j: () => rate(Math.max(0.25, v.playbackRate / 2)), l: () => { if (v.paused) v.play(); else rate(Math.min(4, v.playbackRate * 2)); }, ArrowLeft: () => step(e.shiftKey ? -fps : -1), ArrowRight: () => step(e.shiftKey ? fps : 1), Home: () => (v.currentTime = 0), End: () => (v.currentTime = v.duration), s: () => (safe.hidden = !safe.hidden) };
      if (m[e.key]) { m[e.key](); e.preventDefault(); }
    };
    addEventListener("keydown", keys);
    root.append(h("div", { class: "grid", style: { gridTemplateColumns: "minmax(280px, 420px) 1fr", alignItems: "start" } },
      h("div", {}, h("div", { class: "player", style: { display: "inline-block", lineHeight: 0, position: "relative", maxWidth: "100%" } }, v, safe)),
      h("div", {}, tcEl, info, h("div", { class: "spacer" }),
        h("div", { class: "row" }, h("button", { onclick: () => step(-fps) }, "−1s"), h("button", { onclick: () => step(-1) }, "◀ frame"), h("button", { class: "primary", onclick: toggle }, "Play / pause"), h("button", { onclick: () => step(1) }, "frame ▶"), h("button", { onclick: () => step(fps) }, "+1s"),
          h("button", { onclick: () => (safe.hidden = !safe.hidden) }, "Reels safe area")),
        h("p", { class: "small muted" }, "Space play/pause · ←/→ one frame (Shift: one second) · J/L slower/faster playback (no reverse play in browsers) · K pause · S safe area · Home/End"),
        scrub, h("div", { class: "small muted", style: { marginTop: "6px" } }, `${cuts.length} cuts · ${fmt(dur, 2)} s · shortest ${fmt(Math.min(...cuts.map((c) => c.dur)), 2)} s · longest ${fmt(Math.max(...cuts.map((c) => c.dur)), 2)} s`))));
  }
  const ta = h("textarea", { style: { minHeight: "360px" } }, JSON.stringify(t.timeline, null, 2));
  root.append(h("h2", {}, "Timeline source"), h("details", {}, h("summary", {}, "Edit timeline JSON (overlays, audio layers, grade, captions)"),
    h("p", { class: "small muted" }, "Overlays: {id, composition: TypeCard|Stamp, start, dur, props}. Audio layers: {id, kind: music_guide|music_licensed|designed|ambience, src, start, in, dur, gain_db, fade_in, fade_out, duck}. Saved only if it validates."),
    ta, h("div", { class: "spacer" }), h("button", { onclick: async () => { try { const j = JSON.parse(ta.value); await api.put(`/api/p/${ctx.name}/timeline/${name}`, j); toast("Timeline saved", "ok"); await ctx.reload(); ctx.render(); } catch (e) { toast(e.message, "err"); (e.data?.errors || []).forEach((x) => toast(x, "err")); } } }, "Validate & save")));
  return root;
}
