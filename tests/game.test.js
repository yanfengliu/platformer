// Bounds: deterministic 120Hz simulation, 120 generated floors, and an unmodified
// three-floor seed-0 run driven by input. Browser input/rendering are separate gates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, chooseUpgrade, drainEvents, PHYSICS, UPGRADES } from '../src/game.js';
import { createWorld, GROUND_Y } from '../src/world.js';

const STEP = 1 / 120;
function advance(game, seconds, input = {}) {
  for (let frame = 0; frame < Math.ceil(seconds / STEP); frame += 1) {
    updateGame(game, frame === 0 ? input : { ...input, jumpPressed: false, attackPressed: false, rollPressed: false, healPressed: false, interactPressed: false }, STEP);
  }
  return game;
}
function isolated(seed = 1) {
  const game = createGame(seed);
  game.enemies = [];
  game.world.pickups = [];
  return game;
}
function besideEnemy(type = 'walker', seed = 1) {
  const game = createGame(seed);
  const enemy = game.enemies.find((candidate) => candidate.type === type);
  game.enemies = [enemy];
  game.player.x = enemy.x - game.player.w - 20;
  enemy.vx = 0;
  enemy.cooldown = 10;
  return { game, enemy };
}

test('world generation reproduces geometry, loot and enemy identity, with varied seeds', () => {
  for (let floor = 1; floor <= 3; floor += 1) assert.deepEqual(createWorld(1234, floor), createWorld(1234, floor));
  assert.notDeepEqual(createWorld(1234), createWorld(1235));
  assert.deepEqual(createGame(42), createGame(42));
});

test('120 generated floors have solid routes, reachable branch steps and grounded enemies', () => {
  for (let seed = 0; seed < 40; seed += 1) {
    for (let floor = 1; floor <= 3; floor += 1) {
      const world = createWorld(seed, floor);
      assert.equal(world.platforms[0].x, 0);
      assert.equal(world.platforms[0].w, world.width);
      assert.equal(world.platforms[0].y, GROUND_Y);
      assert.equal(world.platforms[0].oneWay, false);
      assert.equal(world.rooms.length, 6);
      assert.equal(world.rooms.at(-1).x + world.rooms.at(-1).w, world.width);
      for (const platform of world.platforms.slice(1)) {
        assert.ok(platform.x >= 0 && platform.x + platform.w <= world.width);
        const lower = world.platforms.filter((other) => other.y > platform.y && other.y - platform.y <= 70);
        assert.ok(lower.some((other) => Math.max(platform.x, other.x) <= Math.min(platform.x + platform.w, other.x + other.w) + 100), `unreachable platform in seed${seed} floor${floor}`);
      }
      for (const enemy of world.enemySpawns) {
        assert.equal(enemy.y, GROUND_Y);
        assert.ok(enemy.x > 0 && enemy.x < world.exit.x);
      }
      assert.equal(world.enemySpawns.filter((enemy) => enemy.type === 'boss').length, floor === 3 ? 1 : 0);
      assert.equal(world.pickups.filter((pickup) => pickup.type === 'relic').length, 1);
    }
  }
});

test('acceleration reaches a measured speed and releasing brakes without drift', () => {
  const game = isolated();
  const startX = game.player.x;
  advance(game, 1, { right: true });
  assert.equal(game.player.vx, 218);
  assert.ok(game.player.x - startX > 195 && game.player.x - startX < 220);
  const releaseX = game.player.x;
  advance(game, 0.3);
  assert.equal(game.player.vx, 0);
  assert.ok(game.player.x - releaseX < 12);
  assert.equal(game.player.y + game.player.h, GROUND_Y);
});

test('variable height, double jump limit, and landing reset', () => {
  const full = isolated();
  const short = isolated();
  let fullPeak = full.player.y;
  let shortPeak = short.player.y;
  updateGame(full, { jumpPressed: true, jumpHeld: true }, STEP);
  updateGame(short, { jumpPressed: true, jumpHeld: true }, STEP);
  for (let frame = 0; frame < 90; frame += 1) {
    updateGame(full, { jumpHeld: true }, STEP);
    updateGame(short, {}, STEP);
    fullPeak = Math.min(fullPeak, full.player.y);
    shortPeak = Math.min(shortPeak, short.player.y);
  }
  assert.ok(shortPeak - fullPeak > 45);
  assert.ok(full.player.grounded);
  const double = isolated();
  updateGame(double, { jumpPressed: true, jumpHeld: true }, STEP);
  advance(double, 0.24, { jumpHeld: true });
  updateGame(double, { jumpPressed: true, jumpHeld: true }, STEP);
  assert.equal(double.player.jumps, 2);
  const secondVy = double.player.vy;
  updateGame(double, { jumpPressed: true, jumpHeld: true }, STEP);
  assert.ok(double.player.vy > secondVy, 'third press must not add another jump');
  advance(double, 1.2);
  updateGame(double, {}, STEP);
  assert.equal(double.player.jumps, 0);
});

test('coyote jump works after leaving a ledge and expires at its measured bound', () => {
  const coyote = isolated();
  coyote.world.platforms = [{ x: 0, y: 300, w: 100, h: 20, oneWay: true }, { x: 0, y: GROUND_Y, w: 1000, h: 48, oneWay: false }];
  coyote.player.x = 101;
  coyote.player.y = 266;
  coyote.player.grounded = false;
  coyote.player.jumps = 1;
  coyote.player.coyote = PHYSICS.coyote;
  advance(coyote, 0.06);
  updateGame(coyote, { jumpPressed: true, jumpHeld: true }, STEP);
  assert.equal(coyote.player.jumps, 1);
  assert.ok(coyote.player.vy < -390);
  const expired = isolated();
  expired.player.grounded = false;
  expired.player.y = 230;
  expired.player.jumps = 1;
  expired.player.coyote = PHYSICS.coyote;
  advance(expired, 0.12);
  updateGame(expired, { jumpPressed: true, jumpHeld: true }, STEP);
  assert.equal(expired.player.jumps, 2);
});

test('a press just before landing buffers the next jump', () => {
  const game = isolated();
  game.player.y = GROUND_Y - game.player.h - 8;
  game.player.vy = 220;
  game.player.grounded = false;
  game.player.coyote = 0;
  game.player.jumps = 2;
  updateGame(game, { jumpPressed: true, jumpHeld: true }, STEP);
  advance(game, 0.05, { jumpHeld: true });
  assert.ok(game.player.vy < -350);
  assert.equal(game.player.jumps, 1);
});

test('swept collision lands on thin one-way platforms and supports deliberate drop-through', () => {
  const game = isolated();
  game.world.platforms.push({ x: 50, y: 310, w: 100, h: 2, oneWay: true });
  game.player.x = 75;
  game.player.y = 200;
  game.player.vy = 660;
  game.player.grounded = false;
  game.player.jumps = 2;
  advance(game, 0.15);
  assert.equal(game.player.y + game.player.h, 310);
  assert.ok(game.player.grounded);
  updateGame(game, { downHeld: true, jumpPressed: true }, STEP);
  advance(game, 0.45, { downHeld: true });
  assert.equal(game.player.y + game.player.h, GROUND_Y);
  assert.ok(game.player.grounded);
});

test('a large diagnostic step sweeps a solid wall and consumes attack presses once', () => {
  const game = isolated();
  game.world.platforms.push({ x: 105, y: 320, w: 8, h: 72, oneWay: false });
  game.player.x = 72;
  updateGame(game, { right: true, rollPressed: true }, 0.1);
  assert.equal(game.player.x + game.player.w, 105);
  assert.ok(game.player.y + game.player.h <= GROUND_Y);
  const attack = isolated();
  updateGame(attack, { attackPressed: true }, 0.1);
  assert.equal(drainEvents(attack).filter((event) => event.type === 'attack').length, 1);
});

test('one sword swing emits one hit per enemy and a buffered combo progresses', () => {
  const { game, enemy } = besideEnemy();
  const hp = enemy.hp;
  updateGame(game, { attackPressed: true }, STEP);
  advance(game, 0.27);
  assert.equal(enemy.hp, hp - 19);
  assert.equal(drainEvents(game).filter((event) => event.type === 'hit').length, 1);
  updateGame(game, { attackPressed: true }, STEP);
  advance(game, 0.09);
  assert.equal(game.player.combo, 2);
  assert.equal(drainEvents(game).filter((event) => event.type === 'attack').length, 1);
});

test('enemy telegraphs precede damage and rolling avoids an otherwise identical swing', () => {
  function setup() {
    const { game, enemy } = besideEnemy();
    game.player.x = enemy.x - 20;
    enemy.cooldown = 0;
    return { game, enemy };
  }
  const normal = setup();
  advance(normal.game, 0.25);
  assert.equal(normal.enemy.state, 'windup');
  assert.equal(normal.game.player.hp, 100);
  advance(normal.game, 0.55);
  assert.ok(normal.game.player.hp < 100);
  const dodge = setup();
  advance(dodge.game, 0.45);
  updateGame(dodge.game, { rollPressed: true }, STEP);
  advance(dodge.game, 0.35);
  assert.equal(dodge.game.player.hp, 100);
  assert.ok(drainEvents(dodge.game).some((event) => event.type === 'roll'));
});

test('projectiles respect immunity, healing spends one flask, and fatal damage stops the run', () => {
  const game = isolated();
  const arrow = () => ({ x: game.player.x, y: game.player.y + 10, w: 9, h: 5, vx: 0, vy: 0, owner: 'test', type: 'arrow', damage: 18, life: 1 });
  game.projectiles.push(arrow());
  updateGame(game, {}, STEP);
  assert.equal(game.player.hp, 82);
  game.hitStop = 0;
  game.projectiles.push(arrow());
  updateGame(game, {}, STEP);
  assert.equal(game.player.hp, 82);
  updateGame(game, { healPressed: true }, STEP);
  assert.equal(game.player.hp, 100);
  assert.equal(game.player.flasks, 2);
  advance(game, 1);
  game.player.hp = 5;
  game.projectiles.push(arrow());
  updateGame(game, {}, STEP);
  assert.equal(game.player.hp, 0);
  assert.equal(game.mode, 'dead');
  const time = game.time;
  updateGame(game, { right: true }, STEP);
  assert.equal(game.time, time);
  const retry = createGame(game.seed + 1);
  assert.equal(retry.floor, 1);
  assert.equal(retry.player.hp, 100);
  assert.equal(retry.kills, 0);
  assert.deepEqual(retry.upgrades, []);
});

test('hit-stop preserves action edges until simulation resumes', () => {
  const game = isolated();
  game.hitStop = 0.04;
  updateGame(game, { jumpPressed: true, jumpHeld: true }, STEP);
  advance(game, 0.08, { jumpHeld: true });
  assert.ok(game.player.vy < -340);
  assert.equal(drainEvents(game).filter((event) => event.type === 'jump').length, 1);
});

test('relic offers pause, reject an unavailable upgrade, and apply exactly one valid choice', () => {
  const game = createGame(21);
  const relic = game.world.pickups.find((pickup) => pickup.type === 'relic');
  game.player.x = relic.x - game.player.w / 2;
  updateGame(game, { interactPressed: true }, STEP);
  assert.equal(game.mode, 'choice');
  assert.equal(game.offer.length, 3);
  assert.equal(new Set(game.offer.map((offer) => offer.id)).size, 3);
  const time = game.time;
  updateGame(game, { attackPressed: true }, 0.1);
  assert.equal(game.time, time);
  assert.equal(chooseUpgrade(game, 'absent'), false);
  const id = game.offer[0].id;
  assert.equal(chooseUpgrade(game, id), true);
  assert.equal(game.mode, 'playing');
  assert.deepEqual(game.upgrades, [id]);
  assert.equal(chooseUpgrade(game, id), false);
  assert.ok(relic.collected);
  assert.equal(UPGRADES.length, 6);
});

test('locked exits require enemies, floors preserve upgrades and resource limits, third exit wins', () => {
  const game = createGame(33);
  for (let floor = 1; floor <= 3; floor += 1) {
    assert.equal(game.floor, floor);
    game.player.x = game.world.exit.x;
    updateGame(game, { interactPressed: true }, STEP);
    assert.equal(game.floor, floor);
    game.enemies.forEach((enemy) => { enemy.dead = true; enemy.hp = 0; });
    game.player.hp = 43;
    game.player.maxHp = 130;
    game.player.maxFlasks = 4;
    game.player.flasks = 2;
    game.upgrades = ['vitality', 'flask'];
    updateGame(game, { interactPressed: true }, STEP);
    assert.equal(game.player.maxHp, 130);
    assert.equal(game.player.maxFlasks, 4);
    assert.deepEqual(game.upgrades, ['vitality', 'flask']);
    assert.ok(game.player.flasks <= game.player.maxFlasks);
    assert.ok(game.player.hp <= game.player.maxHp);
  }
  assert.equal(game.mode, 'won');
  assert.ok(drainEvents(game).some((event) => event.type === 'complete'));
});

test('the generated three-floor run completes by movement, attacks, healing and interaction', () => {
  const game = createGame(0);
  let choices = 0;
  const trace = [];
  for (let frame = 0; frame < 120 * 300 && game.mode !== 'won' && game.mode !== 'dead'; frame += 1) {
    if (game.mode === 'choice') {
      const chosen = game.offer.find((offer) => offer.id === 'edge') ?? game.offer.find((offer) => offer.id === 'leech') ?? game.offer[0];
      chooseUpgrade(game, chosen.id);
      choices += 1;
    }
    const player = game.player;
    const relic = game.world.pickups.find((pickup) => pickup.type === 'relic' && !pickup.collected);
    const enemy = game.enemies.filter((candidate) => !candidate.dead).sort((a, b) => Math.abs(center(a) - center(player)) - Math.abs(center(b) - center(player)))[0];
    const target = relic && (!enemy || relic.x < enemy.x) ? relic : enemy ?? game.world.exit;
    const dx = (target.w ? center(target) : target.x) - center(player);
    const fighting = Boolean(enemy && target === enemy && Math.abs(dx) < 70);
    const input = { left: dx < -34, right: dx > 34, attackHeld: fighting, attackPressed: fighting && frame % 45 === 0, healPressed: player.hp < player.maxHp * 0.5 && player.flasks > 0, interactPressed: Math.abs(dx) < 48 && target !== enemy };
    updateGame(game, input, STEP);
    if (frame % 120 === 0) trace.push({ t: frame / 120, floor: game.floor, hp: player.hp, x: Math.round(player.x), target: enemy?.type, remaining: game.enemies.filter((candidate) => !candidate.dead).length });
    drainEvents(game);
    assert.ok(Number.isFinite(player.x) && Number.isFinite(player.y));
    assert.ok(player.hp >= 0 && player.hp <= player.maxHp);
    assert.ok(player.flasks >= 0 && player.flasks <= player.maxFlasks);
  }
  assert.equal(game.mode, 'won', JSON.stringify(trace.slice(-12)));
  assert.equal(game.floor, 3);
  assert.equal(choices, 3);
  assert.equal(game.kills, 20);
  assert.ok(game.time < 300);
});

function center(entity) { return entity.x + entity.w / 2; }
