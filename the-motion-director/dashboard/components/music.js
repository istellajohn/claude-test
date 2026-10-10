import { api } from "../src/api.js";
import { h, toast, field, empty } from "../src/ui.js";

const blank = () => ({ id: "", title: "", artist: "", spotify_url: "", genre: "", bpm_or_feel: "", why_it_suits: "", suggested_section: "", potential_edit_accents: "", instagram_status: "NOT VERIFIED", instagram_checked_on: "", region_checked: "", account_type_checked: "", licence_status: "NOT VERIFIED", licence_evidence: "", approved_use: "", restrictions: "", local_file: "" });

export async function render(ctx) {
  const d = ctx.data, intent = d.meta.music_intent || {};
  const root = h("div", {}, h("h1", {}, "Music Shortlist"), h("p", { class: "lede" }, "Spotify is where tracks are found. It is not permission to use them. Every licensing field starts as NOT VERIFIED and stays that way until someone checks it. A track is embedded in an export only if it is marked LICENSED_EMBEDDABLE and a licence document is on file."),
    h("div", { class: "info-box" }, `Intended use: ${intent.post_type || "organic"}${intent.boosted ? ", boosted" : ""} · account ${intent.account_type} · region ${intent.region}. Instagram's music permissions differ for personal, creator and business accounts, for commercial or branded content, for boosting, and by country. Verify against the live Instagram music library from the account that will publish.`));
  const form = h("div", {}), table = h("div", {});
  function formFor(t) {
    const f = { ...t }, inp = (k, ph) => h("input", { value: f[k] || "", placeholder: ph, onchange: (e) => (f[k] = e.target.value) });
    const sel = (k, opts) => h("select", { onchange: (e) => (f[k] = e.target.value) }, opts.map((o) => h("option", { selected: f[k] === o, value: o }, o)));
    const lic = h("input", { type: "file", style: { display: "none" }, onchange: async (e) => { const file = e.target.files[0]; if (!file) return; try { await api.upload(ctx.name, "16_licences", file); f.licence_evidence = `16_licences/${file.name}`; toast(`${file.name} filed in 16_licences`, "ok"); await ctx.reload(); render2(); } catch (err) { toast(err.message, "err"); } } });
    const ev = h("select", { onchange: (e) => (f.licence_evidence = e.target.value) }, h("option", { value: "" }, "(none)"), ctx.data.licence_files.map((x) => h("option", { selected: f.licence_evidence === `16_licences/${x}`, value: `16_licences/${x}` }, x)));
    form.replaceChildren(h("div", { class: "card" }, h("h3", {}, t.id ? `Edit ${t.id}` : "Add a researched track"),
      h("div", { class: "grid g3" }, field("Title", inp("title")), field("Artist", inp("artist")), field("Spotify reference link", inp("spotify_url", "https://open.spotify.com/track/…")),
        field("Genre", inp("genre")), field("BPM or rhythmic feel", inp("bpm_or_feel")), field("Suggested section", inp("suggested_section", "e.g. 0:48–1:20")),
        field("Why it suits the edit", inp("why_it_suits")), field("Potential edit accents", inp("potential_edit_accents")), field("Local audio file (licensed / guide)", h("select", { onchange: (e) => (f.local_file = e.target.value) }, h("option", { value: "" }, "(none)"), ctx.data.music_files.map((x) => h("option", { selected: f.local_file === x, value: x }, x))))),
      h("hr"), h("h3", {}, "Instagram availability"),
      h("div", { class: "grid g4" }, field("Status", sel("instagram_status", ctx.data.licensing.instagram_status)), field("Checked on (date)", inp("instagram_checked_on", "YYYY-MM-DD")), field("Region checked from", inp("region_checked")), field("Account type checked", inp("account_type_checked"))),
      h("h3", { style: { marginTop: "14px" } }, "Licence"),
      h("div", { class: "grid g4" }, field("Licence status", sel("licence_status", ctx.data.licensing.licence_status)), field("Evidence file", h("div", { class: "row", style: { flexWrap: "nowrap" } }, ev, lic, h("button", { class: "sm", onclick: () => lic.click() }, "File…"))), field("Approved use", inp("approved_use")), field("Restrictions", inp("restrictions"))),
      h("div", { class: "spacer" }), h("div", { class: "row" }, h("button", { class: "primary", onclick: async () => { const r = await api.post(`/api/p/${ctx.name}/music/track`, f).catch((e) => ({ ok: false, errors: [e.message] })); if (!r.ok) { r.errors.forEach((x) => toast(x, "err")); return; } toast("Saved", "ok"); await ctx.reload(); render2(); } }, "Save track"), t.id ? h("button", { onclick: () => formFor(blank()) }, "Cancel") : null)));
  }
  function render2() {
    const tr = ctx.data.shortlist.tracks;
    table.replaceChildren(tr.length ? h("table", {}, h("thead", {}, h("tr", {}, ["", "Track", "Genre / feel", "Instagram", "Licence", "Embeddable in export", ""].map((x) => h("th", {}, x)))),
      h("tbody", {}, tr.map((t) => { const emb = t.licence_status === "LICENSED_EMBEDDABLE" && t.licence_evidence; return h("tr", {}, h("td", { class: "mono small" }, t.id), h("td", {}, h("b", {}, t.title), h("div", { class: "small muted" }, t.artist), t.spotify_url ? h("a", { class: "small", href: t.spotify_url, target: "_blank", rel: "noopener noreferrer" }, "Open on Spotify ↗") : null),
        h("td", { class: "small" }, `${t.genre || ""} ${t.bpm_or_feel ? "· " + t.bpm_or_feel : ""}`, h("div", { class: "muted" }, t.why_it_suits)), h("td", {}, h("span", { class: `chip ${t.instagram_status.startsWith("AVAILABLE") ? "ok" : t.instagram_status === "NOT AVAILABLE" ? "err" : "warn"}` }, t.instagram_status.split(" (")[0])),
        h("td", {}, h("span", { class: `chip ${emb ? "ok" : t.licence_status === "NOT VERIFIED" ? "warn" : ""}` }, t.licence_status)), h("td", {}, emb ? "yes" : "no · use Instagram's own library"),
        h("td", {}, h("button", { class: "sm", onclick: () => formFor(t) }, "Edit"), " ", h("button", { class: "sm", onclick: async () => { if (confirm(`Remove ${t.title}?`)) { await api.del(`/api/p/${ctx.name}/music/track?id=${t.id}`); await ctx.reload(); render2(); } } }, "×"))); }))) :
      empty("Shortlist is empty", "Nothing has been researched for this project yet. Tracks are added here only after they have been found and checked; none are invented."));
    formFor(blank());
  }
  render2();
  root.append(table, h("div", { class: "spacer" }), form);
  return root;
}
