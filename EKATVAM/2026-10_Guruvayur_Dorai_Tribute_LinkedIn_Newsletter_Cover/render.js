// usage: node render.js  -> renders each direction HTML to 1920x1080 PNG into 04_WORKING/iterations
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const n of ['A_one_stroke','B_resonance','C_span']) {
    await p.goto('file://' + path.resolve(__dirname, '04_WORKING/editable_files/' + n + '.html'));
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.resolve(__dirname, '04_WORKING/iterations/Ekatvam_Dorai_NewsletterCover_' + n + '_v01.png') });
  }
  await b.close();
})();
