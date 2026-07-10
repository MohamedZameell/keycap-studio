// P4: print export — trigger PDF / PNG-pack / SVG from the EXPORT tab and
// verify the downloads land with sane sizes. Stages Red Samurai + a stamp
// so the art path (colorway colors + legends + stamp compositing) is real.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.resolve('progress/print-out');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:5173/studio', { waitUntil: 'load' });
  await page.waitForTimeout(6000);

  await page.evaluate(async () => {
    const m = await import('/src/store.js');
    const st = m.useStore.getState();
    st.setSelectedColorway('red_samurai');
    // one stamp so compositing is exercised
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const x = c.getContext('2d'); x.fillStyle = '#ffd23e'; x.beginPath(); x.arc(48,48,44,0,7); x.fill();
    st.armStamp(c.toDataURL(), 1);
  });
  await page.waitForTimeout(1500);
  await page.mouse.click(683, 460); // place the stamp on some key
  await page.waitForTimeout(800);

  await page.getByText('EXPORT', { exact: true }).click();
  await page.waitForTimeout(600);

  for (const [btn, expect] of [['PDF Sheet', '.pdf'], ['PNG Pack', '.zip'], ['SVG Sheet', '.svg']]) {
    const dlPromise = page.waitForEvent('download', { timeout: 180000 });
    await page.getByText(btn, { exact: true }).click();
    const dl = await dlPromise;
    const file = path.join(outDir, dl.suggestedFilename());
    await dl.saveAs(file);
    const kb = (fs.statSync(file).size / 1024).toFixed(1);
    console.log(`${btn}: ${dl.suggestedFilename()} — ${kb} KB ${dl.suggestedFilename().endsWith(expect) ? 'OK' : 'WRONG EXT'}`);
    await page.waitForTimeout(1200);
  }

  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach(e => console.log('  • ' + e));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
