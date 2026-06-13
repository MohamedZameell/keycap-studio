// High-DPI cropped close-up of the studio board for legend inspection.
// Usage: node scripts/shot-closeup.cjs <outPng> <stateJson>
const { chromium } = require('playwright');

(async () => {
  const out = process.argv[2] || 'progress/closeup.png';
  const stateJson = process.argv[3] || '{}';
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 }, deviceScaleFactor: 3 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5173/studio', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await page.evaluate(async (sj) => {
    const m = await import('/src/store.js');
    m.useStore.setState(JSON.parse(sj));
  }, stateJson);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: out, clip: { x: 480, y: 320, width: 640, height: 280 } });
  await browser.close();
  console.log('errors', errs.length, '->', out);
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
