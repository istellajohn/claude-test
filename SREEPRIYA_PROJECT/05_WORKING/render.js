const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  for (const [n, o] of [['option_C_editorial','C_editorial'],['option_A_image_led','A_image_led'],['option_B_page_led','B_page_led']]) {
    const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await pg.goto('file://' + path.join(__dirname, n + '.html'));
    await pg.waitForTimeout(800);
    await pg.screenshot({ path: path.join(__dirname, '../06_EXPORTS/Instagram', `SN_Forbes_FamilyOffice_${o}_1080x1350.png`) });
  }
  await b.close();
})();
