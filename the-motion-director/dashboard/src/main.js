import { api } from "./api.js";
import { h, $, toast } from "./ui.js";
import * as overview from "../components/overview.js";
import * as library from "../components/library.js";
import * as storyboard from "../components/storyboard.js";
import * as timeline from "../components/timeline.js";
import * as audio from "../components/audio.js";
import * as music from "../components/music.js";
import * as captions from "../components/captions.js";
import * as visual from "../components/visual.js";
import * as exportc from "../components/export.js";

const SECTIONS = [
  ["overview", "Project Overview", overview], ["library", "Footage Library", library], ["storyboard", "Storyboard", storyboard],
  ["timeline", "Timeline Preview", timeline], ["audio", "Audio Analysis", audio], ["music", "Music Shortlist", music],
  ["captions", "Caption Editor", captions], ["visual", "Visual System", visual], ["export", "Export Centre", exportc],
];
const ctx = {
  name: null, data: null, section: "overview", projects: [], activeTimeline: localStorage.getItem("tmd.tl") || null,
  async reload() { ctx.data = await api.get(`/api/p/${ctx.name}`); if (!ctx.data.timelines.includes(ctx.activeTimeline)) ctx.activeTimeline = ctx.data.timelines[0] || null; },
  setTimeline(t) { ctx.activeTimeline = t; localStorage.setItem("tmd.tl", t || ""); },
  go(s) { location.hash = `#/${s}`; },
  render: () => draw(),
  async run(action, args = {}) {
    try { const j = await api.post(`/api/p/${ctx.name}/job`, { action, args }); toast(`Started: ${j.label}`); pollJobs(); return j; }
    catch (e) { toast(e.message, "err"); }
  },
  onJobDone: [],
};

async function draw() {
  const view = $("#view");
  const sec = SECTIONS.find((s) => s[0] === ctx.section) || SECTIONS[0];
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.s === sec[0]));
  view.replaceChildren();
  if (!ctx.name) { view.append(await overview.renderNoProject(ctx)); return; }
  try { view.append(await sec[2].render(ctx)); } catch (e) { view.append(h("div", { class: "err-box" }, `Could not render ${sec[1]}: ${e.message}`)); console.error(e); }
  window.scrollTo(0, 0); $("#main").scrollTo(0, 0);
}

function nav() {
  $("#nav").replaceChildren(...SECTIONS.map(([id, label], i) => h("a", { "data-s": id, href: `#/${id}` }, label, h("kbd", {}, i + 1))));
}

async function selectProject(name) {
  ctx.name = name; localStorage.setItem("tmd.project", name || "");
  if (name) await ctx.reload();
  await draw();
}

let polling = false, lastIds = {};
async function pollJobs() {
  if (polling) return; polling = true;
  const bar = $("#jobbar");
  for (;;) {
    let jobs = []; try { jobs = await api.get("/api/jobs"); } catch { break; }
    const cur = jobs.find((j) => j.state === "running") || jobs[0];
    const running = jobs.some((j) => j.state === "running");
    if (cur && (running || Date.now() / 1000 - (cur.finished || 0) < 12)) {
      bar.hidden = false;
      bar.replaceChildren(
        h("div", { class: "row spread" }, h("b", {}, cur.state === "running" ? `Running · ${cur.action}` : cur.state === "done" ? "Finished" : "Failed"), h("span", { class: "mono small muted" }, cur.stage)),
        h("div", { class: "bar" }, h("i", { style: { width: `${Math.round(cur.progress * 100)}%` } })),
        h("pre", {}, cur.log.slice(-8).join("\n")),
      );
    } else bar.hidden = true;
    for (const j of jobs) {
      if (lastIds[j.id] === "running" && j.state !== "running") {
        toast(j.state === "done" ? `${j.action} finished` : `${j.action} failed: ${j.log.slice(-2).join(" ")}`, j.state === "done" ? "ok" : "err");
        if (ctx.name === j.project) { await ctx.reload(); await draw(); }
      }
      lastIds[j.id] = j.state;
    }
    if (!running) break;
    await new Promise((r) => setTimeout(r, 900));
  }
  polling = false;
}

addEventListener("hashchange", () => { ctx.section = (location.hash.split("/")[1] || "overview"); draw(); });
addEventListener("keydown", (e) => {
  if (e.target.matches("input,textarea,select") || e.metaKey || e.ctrlKey || e.altKey) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= SECTIONS.length) { ctx.go(SECTIONS[n - 1][0]); e.preventDefault(); }
});

(async function boot() {
  nav();
  ctx.section = location.hash.split("/")[1] || "overview";
  try {
    ctx.projects = await api.get("/api/projects");
    const sel = $("#project-select");
    sel.replaceChildren(...ctx.projects.map((p) => h("option", { value: p.name }, p.title || p.name)));
    sel.addEventListener("change", () => selectProject(sel.value));
    const saved = localStorage.getItem("tmd.project");
    const first = ctx.projects.find((p) => p.name === saved) || ctx.projects[0];
    if (first) sel.value = first.name;
    await selectProject(first ? first.name : null);
    api.get("/api/doctor").then((d) => $("#doctor-dot").className = d.every((x) => x.ok || /optional|lfs/i.test(x.name)) ? "ok" : "bad").catch(() => {});
    pollJobs();
  } catch (e) { $("#view").append(h("div", { class: "err-box" }, `Cannot reach the studio server: ${e.message}`)); }
})();
