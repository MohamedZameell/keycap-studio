// P2 verification: sticker stamps (drei Decal projection).
// Arms a generated sticker via the store, then CLICKS a key on the canvas —
// exercising the real raycast -> worldToLocal -> placeStamp path — and
// screenshots the result. Also places one programmatically on a wall.
// Usage: node scripts/verify-stamps.cjs [outPng]
const { chromium } = require('playwright');

const OUT = process.argv[2] || 'progress/p2-stamps.png';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:5173/studio', { waitUntil: 'load' });
  await page.waitForTimeout(6000);

  // Build a test sticker (ringed star, transparent bg) and arm it
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 256);
    x.fillStyle = '#ff4a55';
    x.beginPath(); x.arc(128, 128, 110, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath(); x.arc(128, 128, 78, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#1b2340';
    x.font = 'bold 110px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('★', 128, 136);
    const url = c.toDataURL('image/png');
    const m = await import('/src/store.js');
    m.useStore.getState().setSelectedColorway('red_samurai');
    m.useStore.getState().armStamp(url, 1);
    window.__stamps = () => m.useStore.getState().keyStamps;
  });
  await page.waitForTimeout(2500);

  // Click a key near board center — real raycast placement path
  await page.mouse.click(683, 460);
  await page.waitForTimeout(1500);

  const placed = await page.evaluate(() => {
    const ks = window.__stamps();
    return Object.entries(ks).map(([k, arr]) => `${k}: ${arr.length} (${arr[0].target}) pos=${arr[0].pos.map(n => n.toFixed(2))}`);
  });
  console.log('placed via click:', JSON.stringify(placed));

  await page.screenshot({ path: OUT, clip: { x: 340, y: 260, width: 700, height: 340 } });
  await browser.close();
  console.log('errors', errors.length, '->', OUT);
  errors.slice(0, 10).forEach(e => console.log('  • ' + e));
  if (!placed.length) { console.error('NO STAMP PLACED'); process.exit(1); }
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
