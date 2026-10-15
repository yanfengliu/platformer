// Bound: real-control close/return/equip for one actual dropped item at three
// viewports. Run with Playwright CLI run-code while a real loot panel is open;
// screenshots are relative to the CLI's ignored working directory. Catalog-wide
// conservation and occupied-slot recovery are covered by gear-slots.test.js.
async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const snapshot = () => page.evaluate(() => window.__EMBERWAKE__.snapshot());
  const first = (await snapshot()).game;
  assert(first.mode === 'loot', 'Reach a real gear drop through gameplay before running this gate.');
  const pickup = first.pendingLoot, inventory = JSON.stringify(first.inventory);
  for (const [width, height, action] of [[1280,800,'click'],[720,560,'Escape'],[320,640,'keyboard']]) {
    await page.setViewportSize({width,height});
    await page.locator('.loot-panel').focus(); await page.keyboard.press('Home'); await page.waitForTimeout(220);
    const initial = await page.evaluate(() => {
      const p=document.querySelector('.loot-panel'), f=document.querySelector('.game-frame');
      const a=p.getBoundingClientRect(), b=f.getBoundingClientRect(), n=p.querySelector('.item-name').getBoundingClientRect();
      return n.top>=Math.max(a.top+p.clientTop,b.top+f.clientTop)&&n.bottom<=Math.min(a.top+p.clientTop+p.clientHeight,b.top+f.clientTop+f.clientHeight);
    });
    assert(initial, `${width}: initial named loot card is clipped`);
    assert((await page.locator('#loot-leave-note').textContent()).includes('Stays on the ground'), 'Leave copy must explain preservation');
    await page.screenshot({path:`leave-initial-${width}.png`});
    await page.keyboard.press('End'); await page.waitForTimeout(220);
    await page.screenshot({path:`leave-actions-${width}.png`});
    if (action === 'click') await page.getByRole('button',{name:'Leave it',exact:true}).click();
    else if (action === 'Escape') await page.keyboard.press('Escape');
    else {
      await page.locator('.loot-panel').focus();
      await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
      assert(await page.getByRole('button',{name:'Leave it',exact:true}).evaluate(b=>document.activeElement===b),'Tab must reach Leave it');
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(160);
    const left=(await snapshot()).game;
    assert(left.mode==='playing' && !left.pendingLoot, 'Closing loot must resume the run without reopening');
    assert(JSON.stringify(left.world.pickups.find(p=>p.id===pickup.id))===JSON.stringify(pickup), 'Leaving must preserve the exact original pickup');
    assert(JSON.stringify(left.inventory)===inventory,'Leaving must not equip gear');
    await page.keyboard.down('a');
    try {
      for (let step=0;step<50;step++) {
        const g=(await snapshot()).game;
        if (Math.abs(g.player.x+g.player.w/2-pickup.x)>70) break;
        await page.waitForTimeout(50);
      }
    } finally { await page.keyboard.up('a'); }
    const away=(await snapshot()).game;
    assert(Math.abs(away.player.x+away.player.w/2-pickup.x)>52,`Walk outside the gear interaction radius: player=${away.player.x}, gear=${pickup.x}, mode=${away.mode}`);
    for (let i=0;i<65;i++) {
      const g=(await snapshot()).game, dx=pickup.x-g.player.x-g.player.w/2;
      if (Math.abs(dx)<12) break;
      const key=dx>0?'d':'a'; await page.keyboard.down(key);
      try { await page.waitForTimeout(30); } finally { await page.keyboard.up(key); }
    }
    await page.keyboard.press('e'); await page.waitForTimeout(80);
    const back=(await snapshot()).game;
    assert(back.mode==='loot' && back.pendingLoot.id===pickup.id,'Returning with E must reopen the same ground item');
  }
  await page.getByRole('button',{name:`Equip ${pickup.item.name}`,exact:true}).click();
  const equipped=(await snapshot()).game;
  assert(equipped.mode==='playing'&&equipped.world.pickups.find(p=>p.id===pickup.id).collected,'Equip must consume the returned drop');
  assert(equipped.inventory[pickup.item.slot].id===pickup.item.id,'Returned gear must equip in its slot');
  return {item:pickup.item.name,actions:['Leave click','Escape','keyboard Leave'],returned:3,equipped:true};
}
