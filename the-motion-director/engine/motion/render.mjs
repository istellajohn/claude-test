// Renders one Remotion composition to ProRes 4444 with alpha, at the edit's canvas size.
// usage: node render.mjs --comp TypeCard --props props.json --out out.mov --width 1080 --height 1920 --fps 30 --frames 90
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith('--') ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []));
const need = (k) => { if (!a[k]) { console.error(`missing --${k}`); process.exit(2); } return a[k]; };
const comp = need('comp'), out = need('out');
const props = JSON.parse(fs.readFileSync(need('props'), 'utf8'));
delete props.composition;

const candidates = [process.env.TMD_CHROME, '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].filter(Boolean);
const browserExecutable = candidates.find((p) => fs.existsSync(p)) ?? null;

const serveUrl = await bundle({
  entryPoint: path.join(here, 'src', 'index.ts'),
  publicDir: path.join(here, '..', '..', 'design-system', 'typography'),
  onProgress: () => {},
});
const base = await selectComposition({serveUrl, id: comp, inputProps: props, browserExecutable, chromiumOptions: {gl: 'swiftshader'}});
const composition = {...base, width: +a.width, height: +a.height, fps: +a.fps, durationInFrames: +a.frames};
await renderMedia({
  composition, serveUrl, codec: 'prores', proResProfile: '4444', pixelFormat: 'yuva444p10le', imageFormat: 'png',
  outputLocation: out, inputProps: props, browserExecutable, chromiumOptions: {gl: 'swiftshader'}, concurrency: 2,
  onProgress: ({progress}) => { const p = (progress * 10) | 0; if (p !== globalThis.__p) { globalThis.__p = p; console.log(`overlay ${p * 10}%`); } },
});
console.log(`wrote ${out}`);
