// Bound: real title clicks at nine widths; initial talent/equipment cards and
// keyboard scrolling at three viewports. Seed 0, fresh profile. Loot/shop swaps
// need the separate real-control acceptance described in work 5.
// Run this callback with Playwright CLI run-code from an ignored output folder
// after opening a fresh headless session against the built game.
async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const shots = '.';
  const base = await page.evaluate(() => location.origin);
  async function checkFirst(selector, child) {
    const fits = await page.evaluate(({ selector, child }) => {
      const p = document.querySelector(selector), f = document.querySelector('.game-frame');
      const a = p.getBoundingClientRect(), b = f.getBoundingClientRect(), c = p.querySelector(child).getBoundingClientRect();
      return c.top >= Math.max(a.top + p.clientTop, b.top + f.clientTop) && c.bottom <= Math.min(a.top + p.clientTop + p.clientHeight, b.top + f.clientTop + f.clientHeight);
    }, { selector, child });
    assert(fits, `${selector}: first named card clipped`);
  }
  for (const width of [320, 420, 421, 480, 481, 560, 561, 720, 1280]) {
    await page.setViewportSize({ width, height: 640 });
    await page.goto(`${base}/?seed=0`);
    await page.screenshot({ path: `${shots}/title-${width}.png` });
    await page.getByRole('button', { name: 'Enter the keep', exact: true }).waitFor();
    const bounds = await page.evaluate(() => {
      const frame = document.querySelector('.game-frame'); const r = frame.getBoundingClientRect();
      const left = r.left + frame.clientLeft, top = r.top + frame.clientTop;
      return [...document.querySelectorAll('.title-panel button')].map(b => { const a = b.getBoundingClientRect(); return { text: b.textContent, fits: a.left >= left && a.top >= top && a.right <= left + frame.clientWidth && a.bottom <= top + frame.clientHeight, hit: document.elementFromPoint(a.x + a.width / 2, a.y + a.height / 2) === b }; });
    });
    assert(bounds.length === 2 && bounds.every(b => b.fits && b.hit), `${width}: title ${JSON.stringify(bounds)}`);
    await page.getByRole('button', { name: 'How to play', exact: true }).click();
    assert(await page.locator('.help-panel').isVisible(), `${width}: Help click`);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Enter the keep', exact: true }).click();
    await page.keyboard.press('i');
    assert(await page.locator('.inventory-panel').isVisible(), `${width}: enter click`);
  }
  for (const [width, height] of [[1280,800],[720,560],[320,640]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/?seed=0`);
    await page.locator('#talent-button').click();
    const first = page.getByRole('heading', { name: 'Kiln heart', exact: true });
    assert(await first.isVisible(), 'talent card absent');
    await checkFirst('.talents-panel', '.item-name');
    await page.screenshot({ path: `${shots}/talents-${width}.png` });
    await page.locator('.talents-panel').focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(220);
    assert(await page.locator('.talents-panel').evaluate(p => p.scrollHeight <= p.clientHeight || p.scrollTop > 0), 'keyboard talent scrolling');
    await page.screenshot({ path: `${shots}/talents-end-${width}.png` });
    await page.keyboard.press('Home');
    await page.waitForTimeout(220);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Enter the keep', exact: true }).click();
    await page.keyboard.press('i');
    assert(await page.locator('.equipment-card').count() === 3, 'three types');
    assert(await page.locator('.equipment-card .item-icon svg').count() === 3, 'gear cards require icons');
    assert(await page.locator('.slot-count').allTextContents().then(v => v.length === 3 && v.every(s => s === '0 / 1 SLOT USED')), 'empty single slots');
    const clipped = await page.evaluate(() => {
      const p = document.querySelector('.inventory-panel').getBoundingClientRect();
      const frame = document.querySelector('.game-frame').getBoundingClientRect();
      const card = document.querySelector('.equipment-card');
      const h = card.querySelector('h2').getBoundingClientRect(), icon = card.querySelector('.item-icon').getBoundingClientRect();
      return h.top >= Math.max(p.top, frame.top) && h.bottom <= Math.min(p.bottom, frame.bottom) && icon.top >= Math.max(p.top, frame.top) && icon.bottom <= Math.min(p.bottom, frame.bottom);
    });
    assert(clipped, `${width}: first named gear/icon clipped`);
    await page.screenshot({ path: `${shots}/inventory-${width}.png` });
    await page.locator('.inventory-panel').focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(220);
    assert(await page.locator('.inventory-panel').evaluate(p => p.scrollHeight <= p.clientHeight || p.scrollTop > 0), 'keyboard equipment scrolling');
    await page.screenshot({ path: `${shots}/inventory-end-${width}.png` });
    await page.keyboard.press('Home');
    await page.waitForTimeout(220);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert(!await page.locator('.inventory-panel').count(), 'keyboard return from inventory');
  }
  assert(errors.length === 0, errors.join('\n'));
  return { titleWidths: 9, menus: 3, errors };
}
