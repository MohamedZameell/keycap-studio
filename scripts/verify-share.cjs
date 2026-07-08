// E2E: share-URL v2 round-trip with an inlined custom colorway.
// Context A builds a design + copies the share link; context B (fresh
// localStorage = "another device") opens it and must reconstruct the design.
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: false });
  const ctxA = await b.newContext({
    viewport: { width: 1600, height: 950 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const p = await ctxA.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('[A] ' + e.message));

  await p.goto('http://localhost:5173/studio');
  await p.waitForTimeout(6000);

  await p.evaluate(async () => {
    const m = await import('/src/store.js');
    const s = m.useStore.getState();
    s.setSelectedFormFactor('65%');
    s.importCustomColorway({
      id: 'custom_sharetest',
      label: 'Share Test — ✓ üñïçødé',
      swatches: {
        base: { background: '#22303f', legend: '#e05a4e' },
        mods: { background: '#1a2430', legend: '#e05a4e' },
        accent: { background: '#e05a4e', legend: '#22303f' },
      },
      override: { KC_ESC: 'accent', KC_ENT: 'accent' },
      updatedAt: 111,
    });
    s.setCaseColor('#301020');
    s.setLegendSubStyle('hiragana');
    s.setPerKeyDesign('Esc', { color: '#ffcc00', legendText: 'YO', imageUrl: 'blob:http://x/should-be-stripped' });
  });
  await p.waitForTimeout(1500);

  await p.getByText('EXPORT', { exact: true }).click();
  await p.waitForTimeout(400);
  await p.getByText('Share URL', { exact: true }).click();
  await p.waitForTimeout(400);
  const url = await p.evaluate(() => navigator.clipboard.readText());
  console.log('share URL length:', url.length);
  console.log(url.slice(0, 120) + '...');
  if (!url.startsWith('http')) { console.log('FAIL: clipboard did not hold a URL'); process.exit(1); }

  // "another device": clean context, no localStorage
  const ctxB = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p2 = await ctxB.newPage();
  p2.on('pageerror', e => errs.push('[B] ' + e.message));
  p2.on('console', m2 => { if (m2.type() === 'warning' && m2.text().includes('share')) errs.push('[B console] ' + m2.text()); });
  await p2.goto(url);
  await p2.waitForTimeout(7000);

  const got = await p2.evaluate(async () => {
    const m = await import('/src/store.js');
    const s = m.useStore.getState();
    const cw = s.customColorways['custom_sharetest'];
    return {
      screen: s.screen,
      ff: s.selectedFormFactor,
      selectedColorway: s.selectedColorway,
      cwLabel: cw && cw.label,
      cwOverride: cw && cw.override,
      caseColor: s.caseColor,
      subStyle: s.legendSubStyle,
      escDesign: s.perKeyDesigns['Esc'] || null,
    };
  });
  console.log(JSON.stringify(got, null, 2));

  const pass =
    got.screen === 'studio' &&
    got.ff === '65%' &&
    got.selectedColorway === 'custom_sharetest' &&
    got.cwLabel === 'Share Test — ✓ üñïçødé' &&
    got.cwOverride && got.cwOverride.KC_ESC === 'accent' &&
    got.caseColor === '#301020' &&
    got.subStyle === 'hiragana' &&
    got.escDesign && got.escDesign.legendText === 'YO' && !got.escDesign.imageUrl;
  console.log(pass ? 'PASS' : 'FAIL');
  console.log('page errors:', errs.length ? errs.join('\n') : '(none)');
  await b.close();
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
