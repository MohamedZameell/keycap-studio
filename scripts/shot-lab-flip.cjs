// Editor-fidelity flip test (M2): author GMK Bento as a CUSTOM colorway through
// the editor's own data path (makeDraftFrom → saveColorwayDraft), point /lab at
// it, and capture the lab's side-by-side (live render | keysim example-1) in one
// shot. Proves the editor reproduces a real commercial set faithfully enough to
// flip against the reference. Usage: node scripts/shot-lab-flip.cjs
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  // Force the lab into side-by-side vs reference 1 before app code runs.
  await page.addInitScript(() => {
    localStorage.setItem('lab_prefs_v1', JSON.stringify({ mode: 'side', refIdx: 0, bg: '#ee4d4d' }));
  });

  await page.goto('http://localhost:5173/lab', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const chk = await page.evaluate(async () => {
    const { useStore } = await import('/src/store.js');
    const cw = await import('/src/data/colorways/index.js');
    const cc = await import('/src/data/customColorways.js');
    const preset = cw.getColorway('bento');

    // Author it via the editor data path, exactly as the UI's "duplicate" would.
    const draft = cc.makeDraftFrom(preset, { forceNew: true });
    const s = useStore.getState();
    s.startColorwayEdit(draft);
    s.saveColorwayDraft();
    const id = useStore.getState().selectedColorway;
    useStore.getState().setSelectedColorway(id); // ensure the lab renders the custom one

    // Did the editor round-trip preserve every zone + override?
    const norm = (o) => JSON.stringify(Object.keys(o || {}).sort().reduce((a, k) => (a[k] = o[k], a), {}));
    const zonesEqual = norm(
      Object.fromEntries(Object.entries(draft.swatches).map(([z, v]) => [z, norm(v)]))
    ) === norm(
      Object.fromEntries(Object.entries(preset.swatches).map(([z, v]) => [z, norm(v)]))
    );
    const overrideEqual = norm(draft.override) === norm(preset.override || {});
    return {
      id,
      isCustom: cc.isCustomColorwayId(id),
      zonesEqual,
      overrideEqual,
      zoneCount: Object.keys(draft.swatches).length,
      overrideCount: Object.keys(draft.override || {}).length,
    };
  });

  await page.waitForTimeout(6500); // let the 3D scene + env map settle
  await page.screenshot({ path: 'progress/m2-lab-flip-bento.png' });
  await browser.close();

  console.log('custom id        :', chk.id, '(isCustom:', chk.isCustom + ')');
  console.log('zones preserved  :', chk.zonesEqual, '(' + chk.zoneCount + ' zones)');
  console.log('override preserved:', chk.overrideEqual, '(' + chk.overrideCount + ' keys)');
  console.log('console errors   :', errors.length);
  errors.slice(0, 20).forEach(e => console.log('  • ' + e));
  const ok = chk.isCustom && chk.zonesEqual && chk.overrideEqual && errors.length === 0;
  console.log(ok ? '\nEDITOR FIDELITY OK -> progress/m2-lab-flip-bento.png' : '\nCHECK FAILED');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('SCRIPT FAILED:', e.message); process.exit(1); });
