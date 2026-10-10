// node render_carousel_v03.js -> renders the 8 slides of carousel_v03.html to 1080x1350 PNGs
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + path.resolve(__dirname, '04_WORKING/editable_files/carousel_v03.html'));
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  for (let i = 1; i <= 8; i++) await p.locator('#s' + i).screenshot({ path: path.resolve(__dirname, `04_WORKING/iterations/Ekatvam_Dorai_Carousel_v03_s0${i}.png`) });
  await b.close();
})();
