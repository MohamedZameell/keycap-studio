// Sample average colors from a reference image at normalized coordinates, so a
// matching colorway can be authored from real pixels rather than guesswork.
// Usage: node scripts/sample-ref.cjs [lab/example-1.jpg]
const { chromium } = require('playwright');

const REF = process.argv[2] || 'lab/example-1.jpg';
// [label, normX, normY] — eyeballed from the keyboard in example-1.
const POINTS = [
  ['alpha-cap (base bg)', 0.45, 0.50],
  ['alpha-cap-2',         0.55, 0.44],
  ['mod-cap (CapsLk)',    0.215, 0.50],
  ['red-accent (L-space)',0.305, 0.625],
  ['red-accent (R-space)',0.585, 0.625],
  ['esc (top-left)',      0.205, 0.385],
  ['case (front rail)',   0.5, 0.70],
  ['backdrop',            0.5, 0.08],
];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/' + REF, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const res = await page.evaluate(async (pts) => {
    const img = document.querySelector('img') || document.images[0];
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const box = 6;
    const hex = n => n.toString(16).padStart(2, '0');
    return pts.map(([label, nx, ny]) => {
      const px = Math.round(nx * c.width), py = Math.round(ny * c.height);
      const d = ctx.getImageData(px - box, py - box, box * 2, box * 2).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
      return `${label.padEnd(22)} #${hex(r)}${hex(g)}${hex(b)}  (${px},${py})`;
    });
  }, POINTS);
  console.log('size:', await page.evaluate(() => { const i = document.images[0]; return i.naturalWidth + 'x' + i.naturalHeight; }));
  res.forEach(r => console.log(r));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
