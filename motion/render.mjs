// Render the VALENCE introduction film frame by frame.
//   SUB=6 WORKERS=4 node motion/render.mjs video 9x16 [out.mp4] [mix.wav]   (motion-blurred)
//   node motion/render.mjs stills 9x16 outdir 0.5,3.2,6
//   node motion/render.mjs check 9x16          (seek every frame, report exceptions)
//   node motion/render.mjs cues 9x16 cues.json (export the sound cues for score.py)
// Serves the repository over a local HTTP server, drives motion/index.html?render in headless
// Chromium (Playwright), calls film.seek(t) for every frame and pipes PNGs into ffmpeg.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require(path.join(process.execPath, "../../lib/node_modules/playwright"))); }

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const [mode = "video", fmt = "9x16", out, extra] = process.argv.slice(2);

const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const [W, H] = fmt === "4x5" ? [1080, 1350] : [1080, 1920];
const browser = await chromium.launch({ args: ["--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb"] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.goto(`http://127.0.0.1:${port}/motion/index.html?render&format=${fmt}`);
await page.evaluate(() => window.film.ready);
const meta = await page.evaluate(() => ({ dur: ValenceMotion.duration, fps: ValenceMotion.fps, cues: ValenceMotion.cues }));
const shot = async (t) => { await page.evaluate((t) => window.film.seek(t), t); return page.screenshot({ type: "png", clip: { x: 0, y: 0, width: W, height: H } }); };

if (mode === "stills") {
  const dir = out || path.join(here, "stills");
  fs.mkdirSync(dir, { recursive: true });
  for (const t of (extra || "0").split(",").map(Number)) {
    fs.writeFileSync(path.join(dir, `${fmt}-${t.toFixed(2).padStart(5, "0")}.png`), await shot(t));
  }
} else if (mode === "check") {
  const bad = await page.evaluate((m) => { const out = []; for (let i = 0; i < m.dur * m.fps; i++) { try { window.film.seek(i / m.fps); } catch (e) { out.push(i + ": " + e.message); } } return out; }, meta);
  console.log(bad.length ? bad.slice(0, 10).join("\n") : `all ${meta.dur * meta.fps} frames ok`);
} else if (mode === "cues") {
  fs.writeFileSync(out || path.join(here, "cues.json"), JSON.stringify(meta, null, 1));
} else {
  // Motion blur: every output frame averages SUB sub-frames spread across a 180° shutter
  // (centred on the frame time), rendered by WORKERS headless browsers in parallel.
  const SUB = Number(process.env.SUB || 6), WORKERS = Number(process.env.WORKERS || 4);
  const file = out || path.join(here, `out/valence-entry-one-${fmt}.mp4`);
  const n = Number(process.env.LIMIT || Math.round(meta.dur * meta.fps)), shutter = 0.5 / meta.fps;
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "vlnc-"));
  const t0 = Date.now(); let done = 0;
  const worker = async (w) => {
    const s0 = Number(process.env.START || 0), a = s0 + Math.floor(n * w / WORKERS), b = s0 + Math.floor(n * (w + 1) / WORKERS);
    const br = await chromium.launch({ args: ["--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb"] });
    const pg = await br.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    pg.on("pageerror", (e) => console.error("page error:", e.message));
    await pg.goto(`http://127.0.0.1:${port}/motion/index.html?render&format=${fmt}`);
    await pg.evaluate(() => window.film.ready);
    const seg = path.join(tmp, `seg${w}.mkv`);
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(meta.fps * SUB), "-c:v", "mjpeg", "-i", "-",
      "-vf", `tmix=frames=${SUB},select='eq(mod(n,${SUB}),${SUB - 1})',setpts=N/${meta.fps}/TB`, "-fps_mode", "passthrough", "-c:v", "ffv1", "-pix_fmt", "yuv444p", seg], { stdio: ["pipe", "inherit", "inherit"] });
    for (let i = a; i < b; i++) {
      for (let k = 0; k < SUB; k++) {
        const t = i / meta.fps + (SUB > 1 ? (k / (SUB - 1) - 0.5) * shutter : 0);
        await pg.evaluate((t) => window.film.seek(t), t);
        const buf = await pg.screenshot({ type: "jpeg", quality: 94, clip: { x: 0, y: 0, width: W, height: H } });
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      }
      if (++done % 60 === 0) process.stdout.write(`${fmt} frame ${done}/${n} · ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on("close", r));
    await br.close();
    return seg;
  };
  const segs = await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)));
  // join the segments as raw frames (no timestamps to drift), then encode once
  const args = ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "yuv444p", "-s", `${W}x${H}`, "-r", String(meta.fps), "-i", "-"];
  if (extra) args.push("-i", extra);
  args.push("-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "16M", "-bufsize", "32M", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart");
  if (extra) args.push("-c:a", "aac", "-b:a", "256k", "-shortest");
  args.push(file);
  const enc = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  for (const sgm of segs) {
    const dec = spawn("ffmpeg", ["-loglevel", "error", "-i", sgm, "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "yuv444p", "-"], { stdio: ["ignore", "pipe", "inherit"] });
    for await (const chunk of dec.stdout) { if (!enc.stdin.write(chunk)) await new Promise((r) => enc.stdin.once("drain", r)); }
  }
  enc.stdin.end();
  await new Promise((r, j) => enc.on("close", (c) => (c ? j(new Error("ffmpeg " + c)) : r())));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log("wrote", file, `in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
server.close();
