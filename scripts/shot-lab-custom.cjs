// Author a from-scratch custom colorway through the editor path and flip it
// against a lab reference (side-by-side). Used to match example-1 (Red Samurai:
// dark slate base, red legends, red accent caps, light Esc, hiragana sublegends).
// Edit COLORWAY below and re-run to iterate. Usage: node scripts/shot-lab-custom.cjs [refIdx] [outName]
const { chromium } = require('playwright');

const REF_IDX = parseInt(process.argv[2] || '0', 10);
const OUT = process.argv[3] || 'progress/m2-lab-flip-samurai.png';
const ROUTE = process.argv[4] || 'lab'; // 'lab' (side-by-side flip) or 'studio' (reactive single render)
const SUB_STYLE = 'hiragana';

// Best-guess match to example-1. Tuned so the painted shading + red-lit studio
// env in /lab lands near the reference's mid-dark navy read.
const COLORWAY = {
  id: 'custom_reftest_samurai',
  label: 'Red Samurai (match)',
  manufacturer: '',
  swatches: {
    base:    { background: '#33313d', color: '#d23a37' }, // dark slate, red legends
    mods:    { background: '#2b2934', color: '#d23a37' }, // a touch darker
    accent:  { background: '#c32f2e', color: '#201e27' }, // red cap, dark legend
    accent2: { background: '#e7e4dd', color: '#26242c' }, // light Esc
  },
  // Red accent caps (right-hand mod cluster + 2u) and the light Esc.
  override: {
    KC_ESC: 'accent2', KC_GESC: 'accent2',
    KC_RALT: 'accent', KC_RGUI: 'accent', KC_APP: 'accent', KC_RCTL: 'accent',
    KC_RSFT: 'accent',
  },
};

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.addInitScript((idx) => {
    localStorage.setItem('lab_prefs_v1', JSON.stringify({ mode: 'side', refIdx: idx, bg: '#fe4a55' }));
  }, REF_IDX);

  await page.goto('http://localhost:5173/' + ROUTE, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  await page.evaluate(async ({ cw, sub, route }) => {
    const { useStore } = await import('/src/store.js');
    const s = useStore.getState();
    s.startColorwayEdit(cw);   // author via the editor data path
    s.saveColorwayDraft();      // commits to customColorways + selects it
    useStore.getState().setSelectedColorway(cw.id);
    useStore.getState().setLegendSubStyle(sub);
    if (route === 'studio') {
      useStore.getState().setSelectedFormFactor('65%');
      if (useStore.getState().setCaseColor) useStore.getState().setCaseColor('#b6b2aa');
    }
  }, { cw: COLORWAY, sub: SUB_STYLE, route: ROUTE });

  await page.waitForTimeout(2000);
  const diag = await page.evaluate(async (id) => {
    const { useStore } = await import('/src/store.js');
    const cw = await import('/src/data/colorways/index.js');
    const st = useStore.getState();
    const resolved = cw.getColorway(st.selectedColorway);
    return {
      selectedColorway: st.selectedColorway,
      hasCustom: !!st.customColorways[id],
      subStyle: st.legendSubStyle,
      resolvedBase: resolved && resolved.swatches && resolved.swatches.base.background,
    };
  }, COLORWAY.id);
  console.log('DIAG', JSON.stringify(diag));

  // Force an R3F repaint in case the on-demand frameloop didn't invalidate on
  // the programmatic store mutation (resize triggers a fresh render).
  await page.setViewportSize({ width: 1367, height: 851 });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log('errors', errors.length, '->', OUT);
  errors.slice(0, 15).forEach(e => console.log('  • ' + e));
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
