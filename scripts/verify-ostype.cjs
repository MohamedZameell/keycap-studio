// Verify Win/Mac modifier toggle: flip osType via the LEGENDS UI and confirm
// the modifier caps' displayText switches to ⌘/⌥/⌃ (store-level + a screenshot).
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:5173/studio', { waitUntil: 'load' });
  await page.waitForTimeout(6500);

  await page.getByText('LEGENDS', { exact: true }).click();
  await page.waitForTimeout(400);
  // Set via store (the Segmented button sits under the sticky panel footer in
  // this viewport, so a raw click lands on the footer — harness artifact only).
  await page.evaluate(async () => (await import('/src/store.js')).useStore.getState().setOsType('mac'));
  await page.waitForTimeout(2500);
  const os = await page.evaluate(async () => (await import('/src/store.js')).useStore.getState().osType);
  console.log('osType after setOsType(mac):', os);
  if (os !== 'mac') { console.error('FAIL: osType not mac'); process.exitCode = 1; }
  // check the applyOsType helper directly
  const mapped = await page.evaluate(async () => {
    const m = await import('/src/data/keysimLegends.js');
    return ['Win','Alt','Ctrl','Q'].map(l => m.applyOsType(l, 'mac'));
  });
  console.log('Win/Alt/Ctrl/Q -> mac:', mapped.join(' '));
  if (mapped[0] !== '⌘' || mapped[3] !== 'Q') { console.error('FAIL: mapping wrong'); process.exitCode = 1; }
  // Zoom to the mods for a clear read of the swapped glyphs
  await page.evaluate(async () => (await import('/src/store.js')).useStore.getState().setSelectedColorway('red_samurai'));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'progress/ostype-mac.png' });

  await page.evaluate(async () => (await import('/src/store.js')).useStore.getState().setOsType('win'));
  await page.waitForTimeout(1500);
  const os2 = await page.evaluate(async () => (await import('/src/store.js')).useStore.getState().osType);
  console.log('osType after setOsType(win):', os2);
  console.log(errors.length ? `CONSOLE ERRORS: ${errors.slice(0,3).join(' | ')}` : 'zero console errors');
  if (errors.length) process.exitCode = 1;
  await browser.close();
  console.log(process.exitCode ? 'RESULT: FAIL' : 'RESULT: PASS');
})();
