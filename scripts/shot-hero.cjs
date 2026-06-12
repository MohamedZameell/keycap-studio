// Drives the full HERO RENDER flow in /studio: EXPORT tab -> Hero Render
// -> Fast quality -> Start -> wait for completion -> dump raw + denoised
// canvases and a UI screenshot. Headed so WebGL gets the real GPU.
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
  await p.screenshot({ path: 'progress/hero-v1-ui.png' });

  // dump both canvases at full res
  const dump = await p.evaluate(() => {
    const wrap = document.querySelectorAll('canvas');
    const out = {};
    // last two canvases on the page are the modal's (viewport canvas is first)
    const cs = Array.from(wrap).slice(-2);
    out.raw = cs[0] ? cs[0].toDataURL('image/png') : null;
    out.denoised = cs[1] && cs[1].width > 0 ? cs[1].toDataURL('image/png') : null;
    return out;
  });
  if (dump.raw) fs.writeFileSync('progress/hero-v1-raw.png', Buffer.from(dump.raw.split(',')[1], 'base64'));
  if (dump.denoised) fs.writeFileSync('progress/hero-v1-denoised.png', Buffer.from(dump.denoised.split(',')[1], 'base64'));
  console.log('raw:', !!dump.raw, 'denoised:', !!dump.denoised);
  console.log('--- console ---');
  console.log(logs.slice(-40).join('\n') || '(clean)');
  await b.close();
})();
