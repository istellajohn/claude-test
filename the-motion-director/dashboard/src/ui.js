export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "value") el.value = v;
    else if (k === "checked" || k === "selected" || k === "disabled" || k === "hidden") el[k] = !!v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);
export function toast(msg, kind = "") {
  const t = h("div", { class: `toast ${kind}` }, msg);
  $("#toasts").append(t);
  setTimeout(() => t.remove(), kind === "err" ? 8000 : 3500);
}
export const fmt = (s, d = 2) => (s == null || isNaN(s) ? "–" : Number(s).toFixed(d));
export function tc(sec, fps = 30) {
  const f = Math.round(sec * fps), r = Math.round(fps);
  const ff = f % r, s = Math.floor(f / r);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(ff)}`;
}
export const bytes = (n) => (n > 1e9 ? (n / 1e9).toFixed(2) + " GB" : n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : (n / 1e3).toFixed(0) + " KB");
export const empty = (title, body, ...actions) => h("div", { class: "empty" }, h("b", {}, title), h("div", {}, body), actions.length ? h("div", { class: "spacer" }) : null, h("div", { class: "row", style: { justifyContent: "center" } }, ...actions));
export const statusChip = (s) => h("span", { class: `chip ${s === "pass" ? "ok" : s === "pass_with_warnings" || s === "warn" ? "warn" : s === "fail" || s === "error" ? "err" : ""}` }, s.replaceAll("_", " "));
export function field(label, input) { return h("label", { class: "f" }, h("span", {}, label), input); }

export const nodes = (...a) => a.flat(Infinity).filter((x) => x != null && x !== false);
