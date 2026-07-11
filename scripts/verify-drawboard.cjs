// Verify the draw-on-keyboard bar: open it, place a rect + circle + text on the
// fabric canvas, confirm it syncs into the wrap-image pipeline, and screenshot
// the 3D board showing the projected art.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };

  page.setDefaultTimeout(8000);
  await page.goto('http://localhost:5173/studio', { waitUntil: 'load' });
  await page.waitForTimeout(6500);
  await page.evaluate(async () => (await import('/src/store.js')).useStore.getState().setSelectedFormFactor('60%'));
  await page.waitForTimeout(500);

  console.log('step: click ART');
  await page.getByText('ART', { exact: true }).click();
  await page.waitForTimeout(400);
  console.log('step: click Draw on keyboard');
  await page.getByText('Draw on keyboard', { exact: true }).click();
  await page.waitForTimeout(2800); // fabric lazy chunk + init
  console.log('step: modal open, upper-canvas count =', await page.locator('canvas.upper-canvas').count());

  const canvas = page.locator('canvas.upper-canvas');
  if (!(await canvas.count())) return fail('fabric canvas not mounted');
  const box = await canvas.boundingBox();

  // Rectangle
  await page.getByTitle('Rectangle').click();
  await page.mouse.click(box.x + box.width * 0.30, box.y + box.height * 0.45);
  await page.waitForTimeout(300);
  // Circle
  await page.getByTitle('Circle').click();
  await page.mouse.click(box.x + box.width * 0.60, box.y + box.height * 0.5);
  await page.waitForTimeout(300);
  // Text
  await page.getByTitle('Text').click();
  await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.7);
  await page.waitForTimeout(600);

  const objCount = await page.evaluate(() => {
    const el = document.querySelector('canvas.upper-canvas');
    return el && el.__fabricObjCount != null ? el.__fabricObjCount : -1;
  });

  await page.waitForTimeout(600); // debounced sync
  const st = await page.evaluate(async () => {
    const s = (await import('/src/store.js')).useStore.getState();
    return { mode: s.keyboardImageMode, hasUrl: !!s.keyboardImageUrl, urlKind: (s.keyboardImageUrl||'').slice(0,15) };
  });
  console.log('store after draw:', JSON.stringify(st));
  if (st.mode !== 'wrap' || !st.hasUrl) fail('wrap image not synced from drawing');
  await page.screenshot({ path: 'progress/drawboard-modal.png' });

  await page.getByText('Done', { exact: true }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'progress/drawboard-board.png' });

  console.log(errors.length ? `CONSOLE ERRORS: ${errors.slice(0,4).join(' | ')}` : 'zero console errors');
  if (errors.length) process.exitCode = 1;
  await browser.close();
  console.log(process.exitCode ? 'RESULT: FAIL' : 'RESULT: PASS');
})();
