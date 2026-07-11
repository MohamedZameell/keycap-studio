// Quick render-quality baseline/after shot: loads studio, applies a punchy
// colorway on ABS, orbits to a 3/4 hero angle, screenshots the canvas region.
// Usage: node scripts/shot-render.cjs <outPng> [colorway]
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'progress/render-baseline.png';
const CW = process.argv[3] || 'red_samurai';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/studio', { waitUntil: 'load' });
  await page.waitForTimeout(6500);
  await page.evaluate(async (cw) => {
    const m = await import('/src/store.js');
    m.useStore.getState().setSelectedColorway(cw);
    m.useStore.getState().setMaterialPreset('abs');
  }, CW);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log('shot:', OUT);
})();
