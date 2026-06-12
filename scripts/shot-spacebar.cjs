// Close-up of the bottom row in /lab to verify the convex spacebar
// rolls over its fillet (no pillow-in-a-frame crease).
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  // inject the closeup camera pose before the app boots
  await p.addInitScript(() => {
    localStorage.setItem('lab_cam_v1', JSON.stringify({
      position: [-0.8, 2.6, 5.6],
      target: [-0.8, -0.2, 1.6],
    }));
  });
  await p.goto('http://localhost:5173/lab');
  await p.waitForTimeout(8000);
  await p.screenshot({ path: 'progress/hero-spacebar-closeup.png' });
  await b.close();
})();
