// Renders teaser.build.html frame-by-frame (deterministic timeline) to JPEGs.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [file, outDir, fpsArg = '30', fromArg = '0', toArg = '60'] = process.argv.slice(2);
  const fps = +fpsArg, from = +fromArg, to = +toArg;
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 })).newPage();
  await p.goto('file://' + file);
  await p.evaluate(() => document.fonts.ready);
  // preload every image used by the timeline so swaps never flash
  await p.evaluate(async () => {
    const srcs = ['wardrobe', 'quiz-unselected', 'stylist-base', 'shop', 'laundry-open', 'laundry'].map((n) => `shots/${n}.png`);
    await Promise.all([...srcs, ...[...document.images].map((i) => i.src)].map((s) => { const im = new Image(); im.src = s; return im.decode().catch(() => {}); }));
  });
  await p.waitForTimeout(800);
  const start = Math.round(from * fps), end = Math.round(to * fps);
  const t0 = Date.now();
  for (let f = start; f < end; f++) {
    await p.evaluate((t) => window.render(t), f / fps);
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await p.screenshot({ path: path.join(outDir, String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 90 });
    if (f % 150 === 0) console.log(`frame ${f}/${end} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  await b.close();
})();
