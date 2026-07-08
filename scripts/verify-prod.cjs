// Production-build smoke test against vite preview (subpath base, like Pages).
// Checks: entry loads, deep-link /studio works, board renders, share URL
// carries the base path, no console errors.
const { chromium } = require('playwright');

(async () => {
  const BASE = process.argv[2] || 'http://localhost:4173/keycap-studio/';
  const b = await chromium.launch({ channel: 'msedge', headless: false });
  const ctx = await b.newContext({
    viewport: { width: 1600, height: 950 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
  p.on('pageerror', e => errs.push('[pageerror] ' + e.message.slice(0, 200)));

  // 1. entry screen
  await p.goto(BASE);
  await p.waitForTimeout(4000);
  const title = await p.title();
  console.log('entry title:', title);

  // 2. deep link straight into the studio (the 404.html path on real Pages)
  await p.goto(BASE + 'studio');
  await p.waitForTimeout(8000);
  const hasCanvas = await p.evaluate(() => !!document.querySelector('canvas'));
  console.log('studio canvas:', hasCanvas);
  await p.screenshot({ path: 'progress/m4-prod-studio.png' });

  // 3. share URL carries the base path
  await p.getByText('EXPORT', { exact: true }).click();
  await p.waitForTimeout(400);
  await p.getByText('Share URL', { exact: true }).click();
  await p.waitForTimeout(400);
  const url = await p.evaluate(() => navigator.clipboard.readText());
  console.log('share url:', url.slice(0, 80));
  const shareOk = url.startsWith(BASE + '?d=') || url.startsWith(BASE.replace(/\/$/, '') + '/?d=');
  console.log('share url has base:', shareOk);

  // 4. share URL round-trips in a fresh context
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errs.push('[B pageerror] ' + e.message.slice(0, 200)));
  await p2.goto(url);
  await p2.waitForTimeout(7000);
  const restored = await p2.evaluate(() => !!document.querySelector('canvas'));
  console.log('share link restores studio:', restored);

  console.log('errors:', errs.length ? errs.join('\n') : '(none)');
  const pass = hasCanvas && shareOk && restored && errs.length === 0;
  console.log(pass ? 'PASS' : 'FAIL');
  await b.close();
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
