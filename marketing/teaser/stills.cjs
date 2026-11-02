const { chromium } = require('playwright');
(async () => {
  const [file, out, ...times] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + file); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
  console.log('fonts:', await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(',')));
  for (const t of times) { await p.evaluate((t) => window.render(+t), t); await p.waitForTimeout(80); await p.screenshot({ path: `${out}/still-${t}.png` }); }
  console.log('errors:', errs);
  await b.close();
})();
