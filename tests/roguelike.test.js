// Bound: pure content, seeded40-floor variants, seven role fixtures at120Hz,
// replacement and finite shop transactions. Whole runs/browser controls separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, chooseUpgrade, resolveLoot, buyShopItem, closeShop, drainEvents } from '../src/game.js';
import { createWorld, seededRandom } from '../src/world.js';
import { TALENTS, ITEMS, talentBonuses, rollGear } from '../src/roguelike.js';
const STEP = 1 / 120;
const advance = (game, seconds, input = {}) => {
  for (let frame = 0; frame < Math.ceil(seconds / STEP); frame++) updateGame(game, frame === 0 ? input : { ...input, attackPressed: false, rollPressed: false, jumpPressed: false, interactPressed: false }, STEP);
};
function fixture(type, facing = -1) {
  const game = createGame(0);
  const enemy = game.enemies.find((entry) => entry.type === type);
  assert.ok(enemy);
  game.enemies = [enemy];
  game.world.platforms = [game.world.platforms[0]];
  game.world.pickups = [];
  game.world.merchants = [];
  Object.assign(enemy, { x: 500, facing, cooldown: 0 });
  game.player.x = facing === -1 ? enemy.x - 35 : enemy.x + enemy.w + 17;
  game.player.facing = -facing;
  return { game, enemy };
}
function equip(game, id) {
  const item = { ...ITEMS.find((entry) => entry.id === id) };
  const pickup = { id: `fixture-${id}`, type: 'gear', item, x: game.player.x + 9, y: game.player.y + 17, collected: false };
  game.world.pickups.push(pickup);
  game.pendingLoot = pickup;
  game.mode = 'loot';
  assert.equal(resolveLoot(game, true), true);
  return pickup;
}
function openShop(game) {
  game.enemies = [];
  const merchant = game.world.merchants[0];
  game.player.x = merchant.x - 9;
  updateGame(game, { interactPressed: true }, STEP);
  assert.equal(game.mode, 'shop');
  return merchant;
}

test('nine bounded chain talents create distinct starting resources and never mutate purchased ranks', () => {
  assert.equal(TALENTS.length, 9);
  assert.equal(new Set(TALENTS.map((entry) => entry.id)).size, 9);
  for (const branch of new Set(TALENTS.map((entry) => entry.branch))) {
    const rows = TALENTS.filter((entry) => entry.branch === branch);
    assert.deepEqual(rows.map((entry) => entry.tier), [1, 2, 3]);
    assert.deepEqual(rows.map((entry) => entry.requires), [[], [rows[0].id], [rows[1].id]]);
  }
  const ranks = Object.freeze({ vigor: 3, recovery: 2, reserve: 1, edge: 3, tempo: 2, execution: 1, purse: 3, fortune: 2, barter: 1 });
  const game = createGame(0, { talents: ranks });
  assert.equal(game.player.maxHp, 130);
  assert.equal(game.player.maxFlasks, 4);
  assert.equal(game.gold, 36);
  assert.equal(game.stats.healPower, 16);
  assert.equal(game.stats.finisher, .15);
  assert.equal(game.stats.damage, 1.15);
  assert.equal(game.stats.attackSpeed, 1.1);
  assert.deepEqual(game.talents, ranks);
  assert.deepEqual(createGame(0, { talents: { reserve: 1, execution: 1, barter: 1, vigor: -4, purse: Infinity } }).talents, {});
  assert.equal(talentBonuses({ vigor: 1e8 }).maxHp, 30);
});

test('seeded encounters, rarity, equipment and shop stock vary while geometry remains valid', () => {
  const layouts = new Set();
  const items = new Set();
  const rarities = new Set();
  for (let seed = 0; seed < 40; seed++) {
    const world = createWorld(seed, 2);
    assert.deepEqual(world, createWorld(seed, 2));
    layouts.add(JSON.stringify(world.enemySpawns.map((enemy) => [enemy.type, enemy.elite])));
    const item = rollGear(seededRandom(seed), 2);
    items.add(item.id); rarities.add(item.rarity);
    assert.ok(ITEMS.some((entry) => entry.id === item.id));
    const merchant = world.merchants[0];
    assert.equal(new Set(merchant.stock.map((stock) => stock.id)).size, 5);
    assert.ok(merchant.stock.every((stock) => stock.price > 0 && !stock.sold));
  }
  assert.ok(layouts.size >= 6);
  assert.ok(items.size >= 8);
  assert.deepEqual([...rarities].sort(), ['common', 'epic', 'rare']);
  const roles = new Set([...createWorld(0).enemySpawns, ...createWorld(0, 3).enemySpawns].map((enemy) => enemy.type));
  assert.deepEqual([...roles].sort(), ['alchemist', 'archer', 'boss', 'brute', 'lancer', 'shield', 'walker']);
});

test('replacement gear recomputes talents and relics without stacking discarded gear or healing', () => {
  const game = createGame(0, { talents: { vigor: 1, edge: 2 } });
  game.player.hp = 60;
  const pickup = equip(game, 'sun-edge');
  assert.equal(game.stats.damage, 1.48);
  assert.equal(resolveLoot(game, true), false);
  assert.ok(pickup.collected);
  equip(game, 'quick-edge');
  assert.equal(game.stats.damage, 1.1);
  assert.equal(game.stats.attackSpeed, 1.12);
  equip(game, 'warden-mail');
  assert.equal(game.player.maxHp, 135);
  assert.equal(game.player.hp, 60);
  game.player.hp = 135;
  equip(game, 'iron-coat');
  assert.equal(game.player.maxHp, 110);
  assert.equal(game.player.hp, 110);
  game.mode = 'choice'; game.offer = [{ id: 'edge' }];
  chooseUpgrade(game, 'edge');
  equip(game, 'iron-edge');
  assert.equal(game.stats.damage, (1.1 + .14) * 1.28);
  assert.deepEqual(Object.keys(game.inventory), ['blade', 'armor', 'charm']);
});

test('loot validates identity, consumes one interaction and freezes physics until accepted or skipped', () => {
  const game = createGame(0);
  game.enemies = [];
  const pickup = game.world.pickups.find((entry) => entry.type === 'gear');
  game.player.x = pickup.x - 9;
  updateGame(game, { interactPressed: true }, STEP);
  assert.equal(game.mode, 'loot');
  assert.equal(game.pendingLoot, pickup);
  const time = game.time;
  advance(game, 1, { right: true });
  assert.equal(game.time, time);
  assert.equal(resolveLoot(game, 'yes'), false);
  const item = pickup.item;
  pickup.item = { ...item, damage: 1e8 };
  assert.equal(resolveLoot(game, true), false);
  assert.equal(pickup.collected, false);
  pickup.item = item;
  assert.equal(resolveLoot(game, false), true);
  assert.equal(game.inventory[item.slot], null);
  assert.equal(resolveLoot(game, true), false);
  assert.equal(game.mode, 'playing');
});

test('merchant rejection is atomic; finite purchases replace slots and preserve pause until closed', () => {
  const game = createGame(0, { talents: { purse: 3, fortune: 1, barter: 1 } });
  const merchant = openShop(game);
  const undiscounted = createWorld(0).merchants[0].stock;
  assert.deepEqual(merchant.stock.map((entry) => entry.price), undiscounted.map((entry) => Math.ceil(entry.price * .8)));
  const snapshot = () => JSON.stringify({ gold: game.gold, stock: merchant.stock, inventory: game.inventory, hp: game.player.hp, flasks: game.player.flasks });
  const before = snapshot();
  assert.equal(buyShopItem(game, 'absent'), false);
  assert.equal(buyShopItem(game, 'heal'), false);
  assert.equal(buyShopItem(game, 'flask'), false);
  assert.equal(snapshot(), before);
  game.gold = 0;
  assert.equal(buyShopItem(game, 'gear-blade'), false);
  game.gold = 500;
  const stock = merchant.stock[0];
  const price = stock.price;
  stock.price = -1;
  const invalid = snapshot();
  assert.equal(buyShopItem(game, stock.id), false);
  assert.equal(snapshot(), invalid);
  stock.price = price;
  assert.equal(buyShopItem(game, stock.id), true);
  assert.equal(game.gold, 500 - price);
  assert.equal(game.mode, 'shop');
  const bought = snapshot();
  assert.equal(buyShopItem(game, stock.id), false);
  assert.equal(snapshot(), bought);
  game.player.hp -= 30; game.player.flasks -= 1;
  assert.equal(buyShopItem(game, 'heal'), true);
  assert.equal(buyShopItem(game, 'flask'), true);
  assert.equal(game.player.hp, game.player.maxHp);
  assert.equal(game.player.flasks, game.player.maxFlasks);
  const time = game.time;
  advance(game, 1, { attackHeld: true });
  assert.equal(game.time, time);
  assert.equal(closeShop(game), true);
  assert.equal(closeShop(game), false);
});

for (const facing of [-1, 1]) {
  test(`shield facing${facing} blocks frontal combos while its committed orientation permits rear hits`, () => {
    const { game, enemy } = fixture('shield', facing);
    advance(game, .26, { attackHeld: true });
    assert.equal(enemy.hp, enemy.maxHp);
    assert.ok(drainEvents(game).some((event) => event.type === 'block'));
    game.player.x = facing === -1 ? enemy.x + enemy.w + 5 : enemy.x - game.player.w - 5;
    advance(game, .25, { left: facing === -1, right: facing === 1, attackHeld: true });
    assert.ok(enemy.hp < enemy.maxHp);
  });
  test(`lancer facing${facing} preserves telegraph under sword impact, commits direction, then charges`, () => {
    const { game, enemy } = fixture('lancer', facing);
    advance(game, .2, { left: facing === 1, right: facing === -1, attackHeld: true });
    assert.ok(enemy.hp < enemy.maxHp);
    assert.equal(enemy.state, 'windup');
    assert.equal(enemy.windupDuration, .74);
    const direction = enemy.facing;
    advance(game, .6);
    assert.equal(enemy.facing, direction);
    assert.equal(enemy.attackKind, 'charge');
    assert.equal(enemy.state, 'attack');
    assert.ok(Math.abs(enemy.vx) >= 330);
  });
  test(`lancer facing${facing} damages a stationary target while an identical telegraph permits a real dodge`, () => {
    const normal = fixture('lancer', facing);
    const dodge = fixture('lancer', facing);
    advance(normal.game, .95);
    assert.ok(normal.game.player.hp < 100);
    advance(dodge.game, .6);
    advance(dodge.game, .4, { left: facing === 1, right: facing === -1, rollPressed: true });
    assert.equal(dodge.game.player.hp, 100);
    assert.ok(drainEvents(dodge.game).some((event) => event.type === 'roll'));
  });
}

test('alchemist actually throws a moving vial, warns for .6 seconds, then causes a finite blast', () => {
  const { game, enemy } = fixture('alchemist');
  game.player.x = enemy.x - 180;
  advance(game, .9);
  const bomb = game.projectiles.find((entry) => entry.type === 'bomb');
  assert.ok(bomb);
  assert.equal(bomb.phase, 'flight');
  assert.ok(bomb.vx < 0 && bomb.vy < 0);
  assert.equal(bomb.fuse, .6);
  let frames = 0;
  while (bomb.phase === 'flight' && frames++ < 180) advance(game, STEP);
  assert.equal(bomb.phase, 'warning');
  assert.equal(bomb.fuse, .6);
  const x = bomb.x;
  game.player.x = bomb.x - 5;
  const hp = game.player.hp;
  advance(game, .48);
  assert.equal(bomb.x, x);
  assert.equal(game.player.hp, hp, 'warning has no early contact');
  advance(game, .15);
  assert.equal(bomb.phase, 'blast');
  assert.ok(game.player.hp < hp);
  advance(game, .3);
  assert.ok(!game.projectiles.includes(bomb));
  assert.ok(enemy.attackCount >= 1);
});

test('a warned bomb can be escaped by jumping through the real input path', () => {
  const { game } = fixture('alchemist');
  game.enemies = [];
  const bomb = { type: 'bomb', x: game.player.x + 5, y: 382, w: 8, h: 10, vx: 0, vy: 0, owner: 'fixture', damage: 23, life: 1, fuse: .2, blastRadius: 54, phase: 'warning' };
  game.projectiles.push(bomb);
  advance(game, .5, { jumpPressed: true, jumpHeld: true });
  assert.equal(game.player.hp, 100);
  assert.ok(drainEvents(game).some((event) => event.type === 'jump'));
  assert.ok(!game.projectiles.includes(bomb));
});

test('automatic ember and flask drops obey earning and capacity limits', () => {
  const game = createGame(0);
  game.enemies = [];
  const add = (type, amount) => ({ id: type, type, amount, x: game.player.x + 9, y: game.player.y + 17, collected: false });
  const flask = add('flask', 1);
  const ember = add('ember', 3);
  game.world.pickups = [flask, ember];
  updateGame(game, {}, STEP);
  assert.equal(game.embers, 3);
  assert.ok(ember.collected);
  assert.equal(flask.collected, false);
  assert.equal(game.player.flasks, game.player.maxFlasks);
  game.player.flasks--;
  updateGame(game, {}, STEP);
  assert.ok(flask.collected);
  assert.equal(game.player.flasks, game.player.maxFlasks);
  updateGame(game, {}, STEP);
  assert.equal(game.embers, 3);
});

test('all run resources and equipment persist across floors while new lives reset them', () => {
  const game = createGame(12, { talents: { purse: 1 } });
  equip(game, 'ember-edge');
  game.gold = 123; game.embers = 9;
  game.enemies.forEach((enemy) => { enemy.dead = true; });
  game.player.x = game.world.exit.x;
  updateGame(game, { interactPressed: true }, STEP);
  assert.equal(game.floor, 2);
  assert.equal(game.gold, 123);
  assert.equal(game.embers, 12);
  assert.equal(game.inventory.blade.id, 'ember-edge');
  const retry = createGame(13, { talents: game.talents });
  assert.equal(retry.gold, 12);
  assert.equal(retry.embers, 0);
  assert.deepEqual(retry.inventory, { blade: null, armor: null, charm: null });
});
