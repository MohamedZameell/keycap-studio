// M3: front legends in the hero stage, Front Low angle so the walls face camera.
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: false });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const logs = [];
  p.on('console', m => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
  p.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  await p.goto('http://localhost:5173/studio');
  await p.waitForTimeout(8000);
  await p.evaluate(async () => {
    const m = await import('/src/store.js');
    m.useStore.getState().setGlobalLegendPosition('front');
  });
  await p.waitForTimeout(2500);

  await p.getByText('EXPORT', { exact: true }).click();
  await p.waitForTimeout(500);
  await p.getByText('Hero Render', { exact: true }).click();
  await p.waitForTimeout(800);
  await p.getByText('Fast', { exact: true }).click();
  await p.getByText('Front Low', { exact: true }).click();
  await p.getByText('▶ Start Render').click();
  console.log('render started...');
  try {
    await p.getByText('⬇ Download PNG').waitFor({ timeout: 360000 });
    console.log('render DONE');
  } catch (e) { console.log('TIMED OUT'); }

  const dump = await p.evaluate(() => {
    const cs = Array.from(document.querySelectorAll('canvas')).slice(-2);
    const c = (cs[1] && cs[1].width > 0) ? cs[1] : cs[0];
    return c ? c.toDataURL('image/png') : null;
  });
  if (dump) fs.writeFileSync('progress/m3-hero-frontlow.png', Buffer.from(dump.split(',')[1], 'base64'));
  console.log('saved:', !!dump);
  console.log(logs.join('\n') || '(no errors)');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
