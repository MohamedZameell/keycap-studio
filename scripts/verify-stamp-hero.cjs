// P2: stamps must survive the path-traced hero stage (alphaTest cutout
// rebuild + normal lift — see heroStage heroDecal branch). Places two big
// stickers programmatically, runs a Fast hero render, dumps the PT canvas.
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: false });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const logs = [];
  p.on('console', m => { if (['error'].includes(m.type())) logs.push(`[error] ${m.text()}`); });
  p.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  await p.goto('http://localhost:5173/studio');
  await p.waitForTimeout(8000);

  await p.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 256);
    x.fillStyle = '#ffd23e';
    x.beginPath(); x.arc(128, 128, 116, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#1b2340';
    x.font = 'bold 150px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('☻', 128, 140);
    const url = c.toDataURL('image/png');
    const m = await import('/src/store.js');
    const st = m.useStore.getState();
    st.setSelectedColorway('red_samurai');
    window.__arm = () => m.useStore.getState().armStamp(url, 1);
    window.__stamps = () => m.useStore.getState().keyStamps;
  });
  await p.waitForTimeout(2500);

  // Place two stickers via real clicks (raycast path), bump their size
  await p.evaluate(() => window.__arm());
  await p.mouse.click(800, 500);
  await p.waitForTimeout(800);
  await p.evaluate(() => window.__arm());
  await p.mouse.click(660, 440);
  await p.waitForTimeout(800);
  const placed = await p.evaluate(async () => {
    const m = await import('/src/store.js');
    const st = m.useStore.getState();
    // bump size only — keep the raycast-recorded position/normal untouched
    for (const [kId, arr] of Object.entries(st.keyStamps)) {
      for (const s of arr) st.updateStamp(kId, s.id, { scale: 0.6 });
    }
    return Object.entries(m.useStore.getState().keyStamps)
      .flatMap(([k, arr]) => arr.map(s => `${k} ${s.target} [${s.pos.map(n => n.toFixed(2))}]`));
  });
  console.log('placed on:', JSON.stringify(placed));
  await p.waitForTimeout(1200);

  await p.getByText('EXPORT', { exact: true }).click();
  await p.waitForTimeout(500);
  await p.getByText('Hero Render', { exact: true }).click();
  await p.waitForTimeout(800);
  await p.getByText('Fast', { exact: true }).click();
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
  if (dump) fs.writeFileSync('progress/p2-stamp-hero.png', Buffer.from(dump.split(',')[1], 'base64'));
  console.log('saved:', !!dump);
  console.log(logs.join('\n') || '(no errors)');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
