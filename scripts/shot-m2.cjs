// M2 verification helper: load a route, optionally push Zustand store state
// (via the live Vite module singleton), dump console/page errors, screenshot.
// Usage: node scripts/shot-m2.cjs <url> <outPng> [waitMs] [stateJson]
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:5173/studio';
  const out = process.argv[3] || 'progress/m2-check.png';
  const waitMs = parseInt(process.argv[4] || '7000', 10);
  const stateJson = process.argv[5] || null;

  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  if (stateJson) {
    await page.evaluate(async (sj) => {
      const m = await import('/src/store.js');
      m.useStore.setState(JSON.parse(sj));
    }, stateJson);
  }
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: out });
  await browser.close();

  console.log('=== ' + out + ' — CONSOLE ERRORS (' + errors.length + ') ===');
  errors.slice(0, 40).forEach(e => console.log('• ' + e));
})().catch(e => { console.error('SCRIPT FAILED:', e.message); process.exit(1); });
