// Parameterized hero render: node scripts/shot-hero-opts.cjs <out.png> <res> <aspect> <quality> [angle]
// e.g. node scripts/shot-hero-opts.cjs progress/m3-4k.png 4K 16:9 Fast "¾ Hero"
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const [out, res, aspect, quality, angle] = process.argv.slice(2);
  const b = await chromium.launch({ channel: 'msedge', headless: false });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const logs = [];
  p.on('console', m => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
  p.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  await p.goto('http://localhost:5173/studio');
  await p.waitForTimeout(9000);
  await p.getByText('EXPORT', { exact: true }).click();
  await p.waitForTimeout(500);
  await p.getByText('Hero Render', { exact: true }).click();
  await p.waitForTimeout(800);
  for (const chip of [res, aspect, quality, angle].filter(Boolean)) {
    await p.getByText(chip, { exact: true }).click();
    await p.waitForTimeout(150);
  }
  await p.getByText('▶ Start Render').click();
  console.log(`render started: ${res} ${aspect} ${quality} ${angle || '(default angle)'}`);

  try {
    await p.getByText('⬇ Download PNG').waitFor({ timeout: 480000 });
    console.log('render DONE');
  } catch (e) {
    console.log('TIMED OUT waiting for completion');
    console.log(logs.join('\n') || '(no errors)');
    await b.close();
    process.exit(1);
  }
  // give the denoiser UI a beat, then dump whichever canvas is displayed
  await p.waitForTimeout(1000);
  const dump = await p.evaluate(() => {
    const cs = Array.from(document.querySelectorAll('canvas')).slice(-2);
    const pick = (cs[1] && cs[1].width > 0) ? cs[1] : cs[0];
    return pick ? { url: pick.toDataURL('image/png'), w: pick.width, h: pick.height, denoised: pick === cs[1] } : null;
  });
  if (dump) {
    fs.writeFileSync(out, Buffer.from(dump.url.split(',')[1], 'base64'));
    console.log(`saved ${out} ${dump.w}x${dump.h} denoised=${dump.denoised}`);
  } else {
    console.log('NO CANVAS');
  }
  console.log(logs.join('\n') || '(no console errors)');
  await b.close();
  process.exit(dump ? 0 : 1);
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
