// Verify the lab's own staging (no store injection): load /lab in side-by-side
// mode and screenshot live render | reference. Confirms LabScreen stages the
// colorway that actually matches the chosen reference image.
// Usage: node scripts/shot-lab.cjs [refIdx] [outPng]
const { chromium } = require('playwright');

const REF_IDX = parseInt(process.argv[2] || '0', 10);
const OUT = process.argv[3] || 'progress/m2-lab-redsamurai.png';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.addInitScript((idx) => {
    localStorage.setItem('lab_prefs_v1', JSON.stringify({ mode: 'side', refIdx: idx, bg: '#fe4a55' }));
  }, REF_IDX);

  await page.goto('http://localhost:5173/lab', { waitUntil: 'load' });
  await page.waitForTimeout(8000); // let staging + 3D env settle
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log('errors', errors.length, '->', OUT);
  errors.slice(0, 15).forEach(e => console.log('  • ' + e));
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
