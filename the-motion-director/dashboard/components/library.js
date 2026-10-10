import { api, media } from "../src/api.js";
import { h, toast, tc, fmt, empty, bytes } from "../src/ui.js";

const TAGS = ["hero_candidate", "human", "atmosphere", "motion_opportunity", "sound_opportunity", "technical_problem", "technical_problem_minor"];
const TAG_LABEL = { hero_candidate: "Hero", human: "Human", atmosphere: "Atmosphere", motion_opportunity: "Motion", sound_opportunity: "Sound", technical_problem: "Problem", technical_problem_minor: "Minor flaw" };

export async function render(ctx) {
  const inv = await api.get(`/api/p/${ctx.name}/inventory`);
  const state = { tags: new Set(), q: "", sort: "score", sel: null };
  const amap = Object.fromEntries(inv.assets.map((a) => [a.id, a]));
  const root = h("div", {});
  const gridHost = h("div", {}), detail = h("div", {});

  const drop = h("div", { class: "drop" }, "Drop footage, photographs or audio here ", h("span", { class: "faint" }, "· originals are never overwritten"));
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", async (e) => {
    e.preventDefault(); drop.classList.remove("over");
    for (const f of e.dataTransfer.files) {
      const ext = f.name.split(".").pop().toLowerCase();
      const folder = ["jpg", "jpeg", "png", "webp", "tif", "tiff", "heic"].includes(ext) ? "04_photographs" : ["wav", "mp3", "m4a", "aac", "flac", "aif", "aiff"].includes(ext) ? "02_audio" : "01_original_footage";
      const note = h("div", { class: "small muted" }, `${f.name} · 0%`); drop.append(note);
      try { await api.upload(ctx.name, folder, f, (p) => (note.textContent = `${f.name} · ${Math.round(p * 100)}%`)); note.textContent = `${f.name} · uploaded to ${folder} (${bytes(f.size)})`; }
      catch (err) { note.textContent = `${f.name} · ${err.message}`; note.style.color = "var(--err)"; }
    }
    toast("Upload finished. Run ingest to analyse.", "ok");
  });

  const hdr = h("div", { class: "row spread" }, h("div", {}, h("h1", {}, "Footage Library"), h("p", { class: "lede" }, "Machine suggestions for a human editor: scores and tags come from sharpness, exposure, face detection and optical flow. They point at where to look. They do not decide what matters.")),
    h("div", { class: "row" }, h("button", { class: "primary", onclick: () => ctx.run("ingest", {}) }, "Run ingest"), h("button", { onclick: () => ctx.run("ingest", { force: true }) }, "Re-analyse all")));
  root.append(hdr, drop, h("div", { class: "spacer" }));
  if (!inv.shots.length && !inv.assets.length) { root.append(empty("Nothing ingested", "Add source material above, then press Run ingest.")); return root; }
  const unreadable = inv.assets.filter((a) => a.error);
  unreadable.forEach((a) => root.append(h("div", { class: "err-box" }, `${a.rel_path}: ${a.error}`)));
  inv.assets.filter((a) => (a.warnings || []).length).forEach((a) => a.warnings.forEach((w) => root.append(h("div", { class: "warn-box" }, `${a.filename}: ${w}`))));

  const chipRow = h("div", { class: "row" }), q = h("input", { placeholder: "Search shot id, file, tag, defect, note…", style: { maxWidth: "340px" } });
  const sort = h("select", { style: { width: "auto" } }, h("option", { value: "score" }, "Sort: score"), h("option", { value: "time" }, "Sort: file order"), h("option", { value: "dur" }, "Sort: duration"));
  q.addEventListener("input", () => { state.q = q.value.toLowerCase(); paint(); }); sort.addEventListener("change", () => { state.sort = sort.value; paint(); });
  const counts = inv.summary?.tags || {};
  function chips() {
    chipRow.replaceChildren(...TAGS.filter((t) => counts[t]).map((t) => h("button", { class: `chip tag-btn ${state.tags.has(t) ? "on" : ""}`, onclick: () => { state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t); chips(); paint(); } }, `${TAG_LABEL[t]} ${counts[t]}`)));
  }
  function visible() {
    let s = inv.shots.filter((x) => amap[x.asset] && (amap[x.asset].kind === "video"));
    if (state.tags.size) s = s.filter((x) => [...state.tags].every((t) => x.tags.includes(t)));
    if (state.q) s = s.filter((x) => `${x.id} ${amap[x.asset].filename} ${x.tags.join(" ")} ${x.defects.map((d) => d.type).join(" ")} ${x.notes || ""}`.toLowerCase().includes(state.q));
    return s.sort((a, b) => state.sort === "score" ? b.score - a.score : state.sort === "dur" ? b.duration - a.duration : a.id.localeCompare(b.id));
  }
  function paint() {
    const list = visible();
    const grid = h("div", { class: "thumbs" }, list.map((s) => {
      const a = amap[s.asset];
      return h("div", { class: `shot ${state.sel === s.id ? "sel" : ""}`, onclick: () => { state.sel = s.id; paint(); showDetail(s); } },
        h("img", { loading: "lazy", src: media(ctx.name, s.thumb), alt: s.id }), h("div", { class: "scorebar" }, h("i", { style: { width: `${Math.round(s.score * 100)}%` } })),
        h("div", { class: "meta" }, h("div", { class: "row spread" }, h("b", { class: "mono small" }, s.id), h("span", { class: "tc" }, `${fmt(s.duration, 1)}s`)),
          h("div", { class: "tc" }, `${a.filename} · ${s.tc_in}`),
          h("div", { class: "row", style: { gap: "4px" } }, s.tags.filter((t) => TAG_LABEL[t]).map((t) => h("span", { class: `chip ${t.startsWith("technical") ? "warn" : t === "hero_candidate" ? "on" : ""}` }, TAG_LABEL[t])))));
    }));
    gridHost.replaceChildren(h("div", { class: "muted small", style: { margin: "0 0 10px" } }, `${list.length} of ${inv.shots.filter((x) => amap[x.asset]?.kind === "video").length} shots`), list.length ? grid : empty("No shots match", "Clear a filter."));
    const photos = inv.assets.filter((a) => a.kind === "photo");
    if (photos.length && !state.tags.size && !state.q) gridHost.append(h("h2", {}, "Photographs"), h("div", { class: "thumbs" }, photos.map((p) => h("div", { class: "shot" }, h("img", { src: media(ctx.name, p.thumb) }), h("div", { class: "meta" }, h("b", { class: "mono small" }, p.id), h("div", { class: "tc" }, `${p.filename} · ${p.width}×${p.height} · ${p.faces} face${p.faces === 1 ? "" : "s"}`))))));
  }
  function showDetail(s) {
    const a = amap[s.asset], m = s.metrics;
    const v = h("video", { controls: true, src: media(ctx.name, a.proxy || a.rel_path) + `#t=${s.start},${s.end}`, style: { width: "100%" }, preload: "metadata" });
    v.addEventListener("loadedmetadata", () => { v.currentTime = s.start; });
    v.addEventListener("timeupdate", () => { if (v.currentTime >= s.end) { v.pause(); v.currentTime = s.start; } });
    const note = h("textarea", { style: { minHeight: "60px" } }, s.notes || "");
    const tlSel = ctx.activeTimeline;
    detail.replaceChildren(h("div", { class: "card", style: { marginTop: "14px" } },
      h("div", { class: "grid g2" }, h("div", {}, h("div", { class: "player" }, v), h("div", { class: "small muted", style: { marginTop: "6px" } }, a.proxy ? "Playing the 540p proxy; the original is untouched." : "Original file (no proxy).")),
        h("div", {}, h("h3", {}, `${s.id} · ${a.filename}`),
          h("dl", { class: "kv" },
            h("dt", {}, "source timecode"), h("dd", { class: "mono" }, `${s.tc_in} → ${s.tc_out}  (${fmt(s.start, 3)}–${fmt(s.end, 3)}s)`),
            h("dt", {}, "format"), h("dd", {}, `${a.width}×${a.height} ${a.orientation} · ${a.fps} fps · ${a.vcodec} ${a.pix_fmt}${a.vfr ? " · VFR" : ""}`),
            h("dt", {}, "sharpness / luma"), h("dd", { class: "mono" }, `${m.sharpness} / ${m.luma}/255`),
            h("dt", {}, "camera / subject"), h("dd", { class: "mono" }, `shake ${m.shake} · subject motion ${m.subject_motion}`),
            h("dt", {}, "faces"), h("dd", {}, `${Math.round(m.face_fraction * 100)}% of sampled frames (Haar detector: misses profiles and small faces)`),
            h("dt", {}, "focus point"), h("dd", { class: "mono" }, `${s.focus.x}, ${s.focus.y} (${s.focus.source})`),
            h("dt", {}, "best 3 s window"), h("dd", { class: "mono" }, s.best_window ? `${fmt(s.best_window.start, 2)}–${fmt(s.best_window.end, 2)}s` : "–"),
            h("dt", {}, "motion events"), h("dd", { class: "small" }, s.motion_events.length ? s.motion_events.map((e) => `${e.type} @${fmt(e.t, 2)}s`).join(", ") : "none"),
            h("dt", {}, "sound events"), h("dd", { class: "small" }, (a.sound_events || []).filter((e) => e.t >= s.start && e.t < s.end).map((e) => `${fmt(e.t, 2)}s (+${e.rise_db} dB)`).join(", ") || "none"),
            h("dt", {}, "audio"), h("dd", { class: "small" }, a.audio_analysis ? `${a.audio_analysis.integrated_lufs} LUFS · peak ${a.audio_analysis.peak_db} dB${a.audio_analysis.clipped ? " · CLIPPED" : ""}` : "no audio stream")),
          s.defects.length ? h("div", { style: { marginTop: "10px" } }, s.defects.map((d) => h("div", { class: d.severity === "high" ? "err-box" : "warn-box" }, h("b", {}, d.type.replaceAll("_", " ")), ` (${d.severity}) ${d.detail}`)), h("div", { class: "small muted" }, "Imperfect footage is not discarded automatically. A flawed shot can hold the one moment that matters.")) : null,
          h("div", { class: "spacer" }), h("label", { class: "f" }, h("span", {}, "Editor's note"), note),
          h("div", { class: "row", style: { marginTop: "8px" } }, h("button", { onclick: async () => { await api.post(`/api/p/${ctx.name}/shot-note`, { id: s.id, note: note.value }); s.notes = note.value; toast("Note saved", "ok"); } }, "Save note"),
            tlSel ? h("button", { class: "primary", onclick: async () => {
              const t = await api.get(`/api/p/${ctx.name}/timeline/${tlSel}`);
              const bw = s.best_window || { start: s.start, end: Math.min(s.end, s.start + 2) };
              t.timeline.clips.push({ id: `c${t.timeline.clips.length + 1}`, src: a.rel_path, kind: "video", in: bw.start, dur: Math.min(2, +(bw.end - bw.start).toFixed(2)), speed: 1, focus: { x: s.focus.x, y: s.focus.y }, label: s.id, auto: true, factual_incident: !!ctx.data.meta.documentary_mode });
              try { await api.put(`/api/p/${ctx.name}/timeline/${tlSel}`, t.timeline); toast(`Added to ${tlSel}`, "ok"); } catch (e) { toast(e.message, "err"); }
            } }, `Add to ${tlSel}`) : h("span", { class: "small muted" }, "Create or generate a timeline to add shots."))))));
  }
  chips(); paint();
  root.append(h("div", { class: "row spread" }, chipRow, h("div", { class: "row" }, q, sort)), h("div", { class: "spacer" }), gridHost, detail,
    h("div", { class: "spacer" }), h("a", { class: "btn small", href: media(ctx.name, "06_footage_analysis/shot_log.csv") + "?download=1" }, "Download shot log (CSV)"));
  return root;
}
