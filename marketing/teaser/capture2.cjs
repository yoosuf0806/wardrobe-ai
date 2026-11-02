const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
  // hide app chrome (drawn separately in the video) and the demo banner
  const clean = async () => {
    await p.addStyleTag({ content: 'header.sticky{display:none!important} body>nav{display:none!important} main{padding-top:20px!important}' });
    await p.evaluate(() => document.querySelectorAll('p').forEach((el) => { if (el.textContent?.startsWith('Demo mode')) el.remove(); }));
    await p.waitForTimeout(200);
  };
  await p.goto('http://localhost:3123/wardrobe'); await p.waitForSelector('text=Your wardrobe'); await p.waitForTimeout(800);
  await p.locator('header.sticky').screenshot({ path: `${out}/chrome-header.png` });
  await p.locator('body>nav').screenshot({ path: `${out}/chrome-nav.png` });
  await p.locator('a[aria-label="Add a piece"]').evaluate((el) => el.remove());
  await clean(); await p.screenshot({ path: `${out}/wardrobe.png`, fullPage: true });
  await p.goto('http://localhost:3123/style'); await p.waitForSelector('text=Which looks feel like you?');
  await p.getByRole('tab', { name: 'Men', exact: true }).click(); await p.waitForTimeout(300);
  await p.addStyleTag({ content: '.fixed.inset-x-0{display:none!important}' }); await clean();
  await p.screenshot({ path: `${out}/quiz-unselected.png`, fullPage: true });
  await p.evaluate(() => document.querySelectorAll('style').forEach((st) => { if (st.textContent.includes('.fixed.inset-x-0')) st.remove(); }));
  const quizSel = []; for (const t of ['Navy shirt & beige chinos', 'Light blue & black']) { const bb = await p.locator(`button[aria-pressed]:has-text("${t}")`).boundingBox(); quizSel.push({ ...bb, y: bb.y + await p.evaluate(() => window.scrollY) }); }
  for (const t of ['Navy shirt & beige chinos', 'Navy knit & chinos', 'Light blue & black']) await p.click(`button[aria-pressed]:has-text("${t}")`);
  await p.click('text=Save my style'); await p.waitForSelector('text=Change answers');
  await p.goto('http://localhost:3123/?occasion=Office'); await p.waitForSelector('article');
  await p.click('summary'); await p.fill('input[placeholder="Set °C"]', '27'); await p.click('text=Update');
  await p.waitForSelector('text=27°C'); await p.waitForSelector('article');
  await p.evaluate(() => document.querySelector('details')?.removeAttribute('open'));
  await p.evaluate(() => window.scrollTo(0, 0)); await clean(); await p.waitForTimeout(800);
  const meta = { cards: [], quizSel };
  const ob = await p.getByRole('tab', { name: 'Office' }).boundingBox(); meta.officeChip = ob;
  for (let i = 0; i < 3; i++) {
    const art = p.locator('article');
    const box = await art.boundingBox();
    const scrollY = await p.evaluate(() => window.scrollY);
    meta.cards.push({ x: box.x, y: box.y + scrollY, w: box.width, h: box.height });
    await art.screenshot({ path: `${out}/card${i + 1}.png` });
    if (i === 0) {
      await p.addStyleTag({ content: 'article{visibility:hidden}' });
      await p.screenshot({ path: `${out}/stylist-base.png`, fullPage: true });
      await p.evaluate(() => document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('article{visibility:hidden}')) s.remove(); }));
    }
    await p.click('[aria-label="Not today"]'); await p.waitForTimeout(600);
  }
  await p.waitForSelector('text=Anything in the laundry?'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/laundry-open.png` });
  const tile = await p.locator('[role=dialog] button[aria-pressed]').first().boundingBox();
  meta.laundryTile = tile;
  await p.locator('[role=dialog] button[aria-pressed]').first().click(); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/laundry.png` });
  const shopBox = async () => { await p.goto('http://localhost:3123/shop'); await p.waitForSelector('text=Pieces you'); await p.waitForTimeout(900); await clean(); return p.locator('article').first().boundingBox(); };
  const sb = await shopBox(); meta.shopFirst = { ...sb, y: sb.y + await p.evaluate(() => window.scrollY) };
  await p.screenshot({ path: `${out}/shop.png`, fullPage: true });
  await p.goto('http://localhost:3123/profile'); await p.waitForSelector('text=You keep choosing'); await clean(); await p.waitForTimeout(600);
  await p.locator('section:has-text("What we\'ve learned")').screenshot({ path: `${out}/learned.png` });
  await p.goto('http://localhost:3123/style'); await p.waitForSelector('text=Which looks feel like you?');
  const men = p.getByRole('tab', { name: 'Men', exact: true }); if (await men.count()) await men.click(); await p.waitForTimeout(500);
  await p.addStyleTag({ content: '.fixed.inset-x-0{display:none!important}' }); await clean();
  await p.screenshot({ path: `${out}/quiz.png`, fullPage: true });
  const qb = []; for (const t of ['Navy shirt & beige chinos', 'Light blue & black']) { const bb = await p.locator(`button[aria-pressed]:has-text("${t}")`).boundingBox(); qb.push(bb); }
  meta.quizCards = qb;
  fs.writeFileSync(`${out}/meta.json`, JSON.stringify(meta, null, 1));
  await b.close();
})();
