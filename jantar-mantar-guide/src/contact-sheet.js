// Contact sheet: node src/contact-sheet.js <exports-subfolder> <out.png> [cols]
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const [dir, out, colsArg] = process.argv.slice(2);
const cols = +colsArg || 4;
const files = fs.readdirSync(path.join(ROOT, dir)).filter(f => /\.(png|jpg)$/.test(f)).sort();
const html = `<!doctype html><html><body style="margin:0;background:#2a2a28;padding:40px;display:grid;grid-template-columns:repeat(${cols},1fr);gap:28px;width:${cols * 380}px">
${files.map(f => `<figure style="margin:0"><img src="file://${path.join(ROOT, dir, f)}" style="width:100%;display:block"><figcaption style="color:#ccc;font:14px monospace;margin-top:6px">${f}</figcaption></figure>`).join('')}</body></html>`;
(async () => {
  let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
  const b = await pw.chromium.launch(); const p = await b.newPage({ viewport: { width: cols * 380 + 80, height: 800 } });
  const tmp = path.join(ROOT, 'build', '_sheet.html'); fs.writeFileSync(tmp, html);
  await p.goto('file://' + tmp); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(ROOT, out), fullPage: true }); await b.close(); console.log('sheet', out, files.length);
})();
