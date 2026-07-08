// M3 verification: front legends survive into the path-traced hero stage,
// and the vignette toggle composites onto the downloaded PNG.
// Stages front legends -> Fast hero render -> downloads with vignette on,
// then off. Headed so WebGL gets the real GPU.
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: false });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const logs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
  p.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  await p.goto('http://localhost:5173/studio');
  await p.waitForTimeout(9000);

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
  await p.getByText('▶ Start Render').click();
  console.log('render started...');

  try {
    await p.getByText('⬇ Download PNG').waitFor({ timeout: 360000 });
    console.log('render DONE');
  } catch (e) {
    console.log('TIMED OUT waiting for completion');
  }
  await p.screenshot({ path: 'progress/m3-hero-frontlegends-ui.png' });

  // dump raw + denoised canvases for the front-legend check
  const dump = await p.evaluate(() => {
    const cs = Array.from(document.querySelectorAll('canvas')).slice(-2);
    return {
      raw: cs[0] ? cs[0].toDataURL('image/png') : null,
      denoised: cs[1] && cs[1].width > 0 ? cs[1].toDataURL('image/png') : null,
    };
  });
  if (dump.raw) fs.writeFileSync('progress/m3-hero-frontlegends-raw.png', Buffer.from(dump.raw.split(',')[1], 'base64'));
  if (dump.denoised) fs.writeFileSync('progress/m3-hero-frontlegends-denoised.png', Buffer.from(dump.denoised.split(',')[1], 'base64'));
  console.log('raw:', !!dump.raw, 'denoised:', !!dump.denoised);

  // download with vignette (default on), then toggled off
  const grab = async (name) => {
    const [dl] = await Promise.all([
      p.waitForEvent('download', { timeout: 30000 }),
      p.getByText('⬇ Download PNG').click(),
    ]);
    await dl.saveAs(`progress/${name}`);
    console.log('saved', name);
  };
  await grab('m3-hero-vignette-on.png');
  await p.getByText('Vignette on', { exact: true }).click();
  await p.waitForTimeout(300);
  await grab('m3-hero-vignette-off.png');

  console.log('--- console ---');
  console.log(logs.slice(-40).join('\n') || '(clean)');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
