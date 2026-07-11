// Verify finer color zones: paint WASD + arrows + function via store.zoneColors
// and confirm getKeyZone classifies + the render reflects it.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:5173/studio', { waitUntil: 'load' });
  await page.waitForTimeout(6500);

  // zone classifier correctness
  const zc = await page.evaluate(async () => {
    const m = await import('/src/data/colorways/index.js');
    const t = (l) => m.getKeyZone(l);
    return { W: t('W'), A: t('A'), arrow: t('←'), esc: t('Esc'), f5: t('F5'),
             pgup: t('PgUp'), shift: t('Shift'), space: t(''), q: t('Q'), one: t('1') };
  });
  console.log('zones:', JSON.stringify(zc));
  const ok = zc.W==='wasd' && zc.A==='wasd' && zc.arrow==='arrows' && zc.esc==='function'
          && zc.f5==='function' && zc.pgup==='nav' && zc.shift==='modifiers'
          && zc.space==='spacebar' && zc.q==='alphas' && zc.one==='alphas';
  if (!ok) { console.error('FAIL: classifier'); process.exitCode = 1; }

  // paint zones and read back
  await page.evaluate(async () => {
    const s = (await import('/src/store.js')).useStore.getState();
    s.setSelectedFormFactor('75%');
    s.setZoneColor('wasd', 'color', '#ff3b3b');
    s.setZoneColor('arrows', 'color', '#ffcc00');
    s.setZoneColor('function', 'color', '#3b82f6');
    s.setZoneColor('spacebar', 'color', '#22c55e');
  });
  await page.waitForTimeout(3000);
  const painted = await page.evaluate(async () => (await import('/src/store.js')).useStore.getState().zoneColors);
  console.log('painted:', JSON.stringify(painted));
  await page.screenshot({ path: 'progress/zones.png' });

  console.log(errors.length ? `CONSOLE ERRORS: ${errors.slice(0,3).join(' | ')}` : 'zero console errors');
  if (errors.length) process.exitCode = 1;
  await browser.close();
  console.log(process.exitCode ? 'RESULT: FAIL' : 'RESULT: PASS');
})();
