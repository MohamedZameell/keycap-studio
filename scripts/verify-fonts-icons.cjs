// Verification: Mr.Snek-borrow features — legend font system + icon stamps.
// 1) Picks an extra Google font from the new "More fonts…" select and checks
//    document.fonts actually has it before the store was updated.
// 2) Uploads a custom font (real binary from fonts.gstatic) through the store
//    module path, reloads, and checks it persisted via IndexedDB.
// 3) Opens the ART icon library, stamps an icon onto a real key via canvas
//    click (raycast -> placeStamp), and screenshots the result.
// Usage: node scripts/verify-fonts-icons.cjs
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  const fail = (msg) => { console.error('FAIL:', msg); process.exitCode = 1; };

  await page.goto('http://localhost:5173/studio', { waitUntil: 'load' });
  await page.waitForTimeout(6000);

  // ---- 1) Google font via the picker ----
  await page.getByText('LEGENDS', { exact: true }).click();
  await page.waitForTimeout(400);
  const select = page.locator('select').first(); // "More fonts…" precedes Secondary Legend
  await select.selectOption('Orbitron');
  await page.waitForTimeout(3500);
  const r1 = await page.evaluate(async () => {
    const m = await import('/src/store.js');
    return {
      font: m.useStore.getState().globalFont,
      loaded: document.fonts.check('16px "Orbitron"'),
    };
  });
  if (r1.font !== 'Orbitron') fail(`globalFont=${r1.font}, expected Orbitron`);
  if (!r1.loaded) fail('Orbitron not in document.fonts after pick');
  console.log('google-font pick:', JSON.stringify(r1));
  await page.screenshot({ path: 'progress/steal-fonts.png' });

  // ---- 2) Custom font upload + persistence ----
  const r2 = await page.evaluate(async () => {
    const fm = await import('/src/lib/fontManager.js');
    // Grab a real font binary (Bungee regular, CORS-clean from gstatic)
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=Bungee')).text();
    const url = css.match(/src: url\((https:[^)]+)\)/)[1];
    const buf = await (await fetch(url)).arrayBuffer();
    const file = new File([buf], 'MyBrandFont.woff2');
    const fam = await fm.addCustomFont(file);
    return { fam, loaded: document.fonts.check(`16px "${fam}"`) };
  });
  if (r2.fam !== 'MyBrandFont' || !r2.loaded) fail(`custom font add broken: ${JSON.stringify(r2)}`);
  console.log('custom-font add:', JSON.stringify(r2));

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(5000);
  const r3 = await page.evaluate(async () => {
    const fm = await import('/src/lib/fontManager.js');
    const fams = await fm.loadPersistedFonts();
    return { fams, loaded: document.fonts.check('16px "MyBrandFont"') };
  });
  if (!r3.fams.includes('MyBrandFont') || !r3.loaded) fail(`persistence broken: ${JSON.stringify(r3)}`);
  console.log('custom-font persisted:', JSON.stringify(r3));
  // cleanup so reruns start clean
  await page.evaluate(async () => (await import('/src/lib/fontManager.js')).deleteCustomFont('MyBrandFont'));

  // ---- 3) Icon library -> stamp on a key ----
  await page.getByText('ART', { exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByText('Icon library', { exact: true }).click();
  await page.waitForTimeout(300);
  await page.locator('input[placeholder="Search icons…"]').fill('skull');
  await page.waitForTimeout(300);
  await page.locator('button[title="skull"]').click();
  await page.waitForTimeout(2500); // fetch + rasterize + arm
  const armed = await page.evaluate(async () => {
    const m = await import('/src/store.js');
    const a = m.useStore.getState().stampArming;
    return a ? { aspect: a.aspect, isDataUrl: a.imageUrl.startsWith('data:image/png') } : null;
  });
  if (!armed || !armed.isDataUrl) fail(`icon did not arm a stamp: ${JSON.stringify(armed)}`);
  console.log('icon armed:', JSON.stringify(armed));

  // click near board center to place on a key via the real raycast path
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.55);
  await page.waitForTimeout(2000);
  const placed = await page.evaluate(async () => {
    const m = await import('/src/store.js');
    return Object.keys(m.useStore.getState().keyStamps);
  });
  if (!placed.length) fail('icon stamp not placed on any key');
  console.log('icon stamp placed on:', placed);
  await page.screenshot({ path: 'progress/steal-icons.png' });

  console.log(errors.length ? `CONSOLE ERRORS (${errors.length}): ${errors.slice(0, 5).join(' | ')}` : 'zero console errors');
  if (errors.length) process.exitCode = 1;
  await browser.close();
  console.log(process.exitCode ? 'RESULT: FAIL' : 'RESULT: PASS');
})();
