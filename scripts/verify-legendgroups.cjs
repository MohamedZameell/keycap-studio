// Verify per-legend-group size + position: classifier + a render where
// modifiers are shrunk and repositioned independently of alphas.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:5173/studio', { waitUntil: 'load' });
  await page.waitForTimeout(6500);

  const grp = await page.evaluate(async () => {
    const m = await import('/src/data/colorways/index.js');
    const t = (l) => m.getLegendGroup(l);
    return { Q: t('Q'), one: t('1'), bang: t('!'), shift: t('Shift'), esc: t('Esc'), space: t('') };
  });
  console.log('groups:', JSON.stringify(grp));
  if (grp.Q !== 'alphas' || grp.one !== 'dual' || grp.shift !== 'modifiers') {
    console.error('FAIL: classifier'); process.exitCode = 1;
  }

  await page.evaluate(async () => {
    const s = (await import('/src/store.js')).useStore.getState();
    s.setSelectedColorway('red_samurai');
    s.setLegendGroup('modifiers', 'size', 0.6);
    s.setLegendGroup('alphas', 'size', 1.4);
    s.setLegendGroup('dual', 'pos', 'bottom-right');
  });
  await page.waitForTimeout(3000);
  const lg = await page.evaluate(async () => (await import('/src/store.js')).useStore.getState().legendGroups);
  console.log('legendGroups:', JSON.stringify(lg));
  if (lg.modifiers.size !== 0.6 || lg.alphas.size !== 1.4) { console.error('FAIL: store'); process.exitCode = 1; }
  await page.screenshot({ path: 'progress/legendgroups.png' });

  console.log(errors.length ? `CONSOLE ERRORS: ${errors.slice(0,3).join(' | ')}` : 'zero console errors');
  if (errors.length) process.exitCode = 1;
  await browser.close();
  console.log(process.exitCode ? 'RESULT: FAIL' : 'RESULT: PASS');
})();
