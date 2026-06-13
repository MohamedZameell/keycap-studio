// Regression check for custom-colorway persistence + cloud-sync wiring.
// Drives the live store on /studio: create → save → delete a custom colorway,
// asserting it lands in both the store and localStorage, that save stamps
// updatedAt, and that the fire-and-forget cloud calls never throw when logged
// out (Supabase configured but no session). Usage: node scripts/verify-sync.cjs
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:5173/studio', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const r = await page.evaluate(async () => {
    const out = {};
    const LS = 'keycap_custom_colorways_v1';
    const { useStore } = await import('/src/store.js');
    const cc = await import('/src/data/customColorways.js');

    const draft = cc.makeDraftFrom(null, { forceNew: true });
    draft.label = 'SyncTest_' + Date.now();
    const s = useStore.getState();
    s.startColorwayEdit(draft);
    s.setDraftSwatch('base', 'background', '#123456');
    s.saveColorwayDraft();

    const id = useStore.getState().selectedColorway;
    const lsAfterSave = JSON.parse(localStorage.getItem(LS) || '{}');
    out.id = id;
    out.inStoreAfterSave = !!useStore.getState().customColorways[id];
    out.inLSAfterSave = !!lsAfterSave[id];
    out.hasUpdatedAt = !!(lsAfterSave[id] && lsAfterSave[id].updatedAt);
    out.baseColor = lsAfterSave[id] && lsAfterSave[id].swatches.base.background;

    useStore.getState().deleteCustomColorway(id);
    const lsAfterDel = JSON.parse(localStorage.getItem(LS) || '{}');
    out.goneFromStore = !useStore.getState().customColorways[id];
    out.goneFromLS = !lsAfterDel[id];
    return out;
  });

  // Let the fire-and-forget upsert/delete settle so any rejection would surface.
  await page.waitForTimeout(2500);
  await browser.close();

  const checks = {
    'save → in store': r.inStoreAfterSave === true,
    'save → in localStorage': r.inLSAfterSave === true,
    'save → stamped updatedAt': r.hasUpdatedAt === true,
    'save → swatch persisted': r.baseColor === '#123456',
    'delete → gone from store': r.goneFromStore === true,
    'delete → gone from localStorage': r.goneFromLS === true,
    'no console/page errors': errors.length === 0,
  };
  let ok = true;
  for (const [name, pass] of Object.entries(checks)) {
    console.log((pass ? 'PASS ' : 'FAIL ') + name);
    if (!pass) ok = false;
  }
  if (errors.length) { console.log('--- errors ---'); errors.slice(0, 20).forEach(e => console.log('• ' + e)); }
  console.log(ok ? '\nALL PASS' : '\nFAILED');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('SCRIPT FAILED:', e.message); process.exit(1); });
