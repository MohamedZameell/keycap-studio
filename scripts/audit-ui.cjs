// UI audit: screenshot every tab of the studio side panel + top bar.
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1366, height: 850 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:5173/studio', { waitUntil: 'load' });
  await p.waitForTimeout(6000);

  // full page
  await p.screenshot({ path: 'progress/audit-full.png' });
  // top bar
  await p.screenshot({ path: 'progress/audit-topbar.png', clip: { x: 0, y: 0, width: 1366, height: 60 } });

  for (const tab of ['DESIGN', 'LEGEND', 'IMAGE', 'BACKLIT', 'EXPORT']) {
    await p.getByText(tab, { exact: true }).first().click();
    await p.waitForTimeout(700);
    // left panel only, full height
    await p.screenshot({ path: `progress/audit-tab-${tab.toLowerCase()}.png`, clip: { x: 0, y: 56, width: 300, height: 794 } });
    // scroll panel to bottom to capture overflow
    await p.evaluate(() => {
      const panels = Array.from(document.querySelectorAll('div')).filter(d => d.scrollHeight > d.clientHeight + 50 && d.clientWidth < 340 && d.clientWidth > 200);
      panels.forEach(el => el.scrollTop = el.scrollHeight);
    });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `progress/audit-tab-${tab.toLowerCase()}-bottom.png`, clip: { x: 0, y: 56, width: 300, height: 794 } });
    await p.evaluate(() => {
      const panels = Array.from(document.querySelectorAll('div')).filter(d => d.scrollHeight > d.clientHeight + 50 && d.clientWidth < 340 && d.clientWidth > 200);
      panels.forEach(el => el.scrollTop = 0);
    });
  }
  await b.close();
  console.log('audit shots done');
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
