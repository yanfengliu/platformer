// Bound: run-only gear transactions at 120Hz using all three types, catalog items,
// ground/ledge/airborne placement, repeated loot swaps and finite merchant stock.
// Real DOM controls and compact menu visibility need the separate browser gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { ITEMS, GEAR_SLOTS } from '../src/roguelike.js';
const core = await import(pathToFileURL(resolve(process.env.EMBERWAKE_GEAR_SOURCE ?? 'src', 'game.js')));
const { createGame, updateGame, resolveLoot, buyShopItem, closeShop } = core;
const item = (id) => ({ ...ITEMS.find((row) => row.id === id) });
const drops = (game) => game.world.pickups.filter((p) => p.type === 'gear' && !p.collected);
function fixture() {
  const game = createGame(0);
  game.enemies = [];
  game.world.pickups = [];
  return game;
}
function offer(game, gear) {
  const pickup = { id: `fixture-${game.world.pickups.length}`, type: 'gear', item: { ...gear }, x: game.player.x + 9, y: game.player.y + 17, collected: false };
  game.world.pickups.push(pickup);
  game.pendingLoot = pickup;
  game.mode = 'loot';
  return pickup;
}
function equip(game, gear) { offer(game, gear); assert.equal(resolveLoot(game, true), true); }

test('one item per type: swapping every catalog item conserves gear without stacking or healing', () => {
  assert.deepEqual(GEAR_SLOTS, ['blade', 'armor', 'charm']);
  const game = fixture();
  game.player.hp = 40;
  for (const gear of ITEMS) {
    const previous = game.inventory[gear.slot];
    const otherSlots = Object.fromEntries(GEAR_SLOTS.filter((s) => s !== gear.slot).map((s) => [s, game.inventory[s]]));
    const before = drops(game).length;
    equip(game, gear);
    assert.deepEqual(game.inventory[gear.slot], gear);
    assert.deepEqual(Object.keys(game.inventory), ['blade', 'armor', 'charm']);
    for (const [slot, value] of Object.entries(otherSlots)) assert.deepEqual(game.inventory[slot], value);
    assert.equal(drops(game).length, before + (previous ? 1 : 0));
    if (previous) {
      const dropped = drops(game).at(-1);
      assert.deepEqual(dropped.item, previous);
      assert.notEqual(dropped.item, previous);
      assert.equal(Math.abs(dropped.x - game.player.x - 9), 26);
      assert.equal(dropped.y, game.player.y + game.player.h - 18);
    }
    assert.equal(game.player.hp, 40);
    assert.equal(game.stats.damage, 1 + (game.inventory.blade?.damage ?? 0));
  }
  assert.equal(drops(game).length + Object.values(game.inventory).filter(Boolean).length, ITEMS.length);
});

test('E recovers displaced gear; repeated swaps have unique ids and need a fresh interaction', () => {
  const game = fixture();
  equip(game, item('iron-edge'));
  equip(game, item('sun-edge'));
  for (let i = 0; i < 12; i++) {
    const target = drops(game)[0];
    assert.ok(target, 'previous gear must remain on the ground');
    updateGame(game, {}, 1 / 120);
    assert.equal(game.mode, 'playing');
    updateGame(game, { interactPressed: true }, 1 / 120);
    assert.equal(game.mode, 'loot');
    assert.equal(game.pendingLoot, target);
    assert.equal(resolveLoot(game, true), true);
    assert.equal(resolveLoot(game, true), false);
    assert.equal(drops(game).length, 1);
    assert.equal(game.inventory.blade.id, i % 2 ? 'sun-edge' : 'iron-edge');
    assert.equal(game.stats.damage, 1 + (i % 2 ? .38 : .14));
  }
  assert.equal(new Set(game.world.pickups.map((p) => p.id)).size, game.world.pickups.length);
});

test('merchant swaps drop the previous item exactly once for each type and keep stock finite', () => {
  for (const slot of GEAR_SLOTS) {
    const game = fixture();
    const previous = ITEMS.find((row) => row.slot === slot);
    equip(game, previous);
    const merchant = game.world.merchants[0];
    game.player.x = merchant.x - 9;
    game.gold = 1000;
    game.shop = merchant; game.mode = 'shop';
    const stock = merchant.stock.find((row) => row.item?.slot === slot);
    assert.equal(buyShopItem(game, stock.id), true);
    assert.equal(game.mode, 'shop');
    assert.equal(drops(game).length, 1);
    assert.deepEqual(drops(game)[0].item, previous);
    assert.deepEqual(game.inventory[slot], stock.item);
    const before = JSON.stringify(game);
    assert.equal(buyShopItem(game, stock.id), false);
    assert.equal(JSON.stringify(game), before);
    assert.equal(closeShop(game), true);
    updateGame(game, { interactPressed: true }, 1 / 120);
    assert.equal(game.mode, 'shop', 'merchant can reopen while keeping its displaced gear');
    assert.equal(drops(game).length, 1);
    closeShop(game);
    game.player.x = drops(game)[0].x - 9;
    updateGame(game, { interactPressed: true }, 1 / 120);
    assert.equal(game.mode, 'loot', 'moving toward ground gear makes it the nearest interaction');
    assert.equal(resolveLoot(game, true), true);
    assert.deepEqual(game.inventory[slot], previous);
    assert.equal(drops(game).length, 1);
    assert.deepEqual(drops(game)[0].item, stock.item);
  }
});

test('leaving loot and invalid/unaffordable purchases never create a swap drop', () => {
  const game = fixture();
  equip(game, item('iron-edge'));
  const left = offer(game, item('sun-edge'));
  assert.equal(resolveLoot(game, false), true);
  assert.deepEqual(drops(game), [left]);
  offer(game, { ...item('sun-edge'), damage: 9 });
  const invalidBefore = JSON.stringify(game);
  assert.equal(resolveLoot(game, true), false);
  assert.equal(JSON.stringify(game), invalidBefore);
  resolveLoot(game, false);
  game.shop = game.world.merchants[0]; game.mode = 'shop';
  const before = JSON.stringify(game);
  assert.equal(buyShopItem(game, 'gear-blade'), false);
  assert.equal(JSON.stringify(game), before);
  assert.equal(drops(game).length, 2);
});

test('declining every gear item preserves its exact pickup through repeated closes and later recovery', () => {
  for (const gear of ITEMS) {
    const game = fixture();
    const previous = ITEMS.find((row) => row.slot === gear.slot && row.id !== gear.id);
    equip(game, previous);
    const pickup = offer(game, gear);
    const inventory = JSON.stringify(game.inventory), stats = JSON.stringify(game.stats);
    const pickupState = JSON.stringify(pickup), count = game.world.pickups.length;
    for (let close = 0; close < 3; close++) {
      assert.equal(resolveLoot(game, false), true);
      assert.equal(game.mode, 'playing');
      assert.equal(game.pendingLoot, null);
      assert.equal(JSON.stringify(game.inventory), inventory);
      assert.equal(JSON.stringify(game.stats), stats);
      assert.equal(JSON.stringify(pickup), pickupState);
      assert.equal(game.world.pickups.length, count);
      assert.deepEqual(drops(game), [pickup]);
      for (let frame = 0; frame < 12; frame++) updateGame(game, {}, 1 / 120);
      assert.equal(game.mode, 'playing', 'closing must not auto-reopen the panel');
      assert.equal(resolveLoot(game, true), false, 'a closed panel cannot equip anything');
      updateGame(game, { interactPressed: true }, 1 / 120);
      assert.equal(game.pendingLoot, pickup, 'a fresh E returns to the same drop');
    }
    resolveLoot(game, false);
    const startX = game.player.x;
    for (let frame = 0; frame < 90; frame++) updateGame(game, { right: true }, 1 / 120);
    assert.ok(game.player.x > startX + 80, 'walk away from the drop');
    for (let frame = 0; frame < 150 && game.player.x > startX + 10; frame++) updateGame(game, { left: true }, 1 / 120);
    updateGame(game, { interactPressed: true }, 1 / 120);
    assert.equal(game.pendingLoot, pickup, 'returning later finds the original item');
    assert.equal(resolveLoot(game, true), true);
    assert.ok(pickup.collected);
    assert.deepEqual(game.inventory[gear.slot], gear);
    assert.equal(drops(game).length, 1, 'equipping drops only the replaced gear');
    assert.deepEqual(drops(game)[0].item, previous);
    assert.equal(resolveLoot(game, true), false);
  }
});

test('swaps place old gear on a supporting ledge or reachable edge when airborne over a pit', () => {
  for (const position of [{ x: 460, y: 146 }, { x: 520, y: 100 }]) {
    const game = fixture();
    game.world.platforms = [{ x: 440, y: 180, w: 70, h: 8, oneWay: true }, { x: 0, y: 300, w: 400, h: 60 }];
    Object.assign(game.player, position);
    equip(game, item('ash-coat'));
    equip(game, item('warden-mail'));
    const dropped = drops(game)[0];
    assert.equal(dropped.y, 162);
    assert.ok(dropped.x >= 446 && dropped.x <= 504);
    assert.equal(game.inventory.armor.id, 'warden-mail');
  }
});

test('a ledge edge drops gear on the other side instead of at the player center', () => {
  for (const facing of [-1, 1]) {
    const game = fixture();
    game.world.platforms = [{ x: 440, y: 180, w: 70, h: 8, oneWay: true }];
    Object.assign(game.player, { x: facing > 0 ? 495 : 437, y: 146, facing });
    equip(game, item('iron-edge'));
    equip(game, item('sun-edge'));
    const drop = drops(game)[0];
    assert.equal(drop.x - game.player.x - 9, -facing * 26);
  }
});
