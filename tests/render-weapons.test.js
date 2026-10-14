// Bounds: actual createRenderer Canvas drawing commands at native 640x360, with
// effects excluded by physical weapon colors. Covers three combos, all enemies,
// both facings, windup/contact/return, shot transition, cancellation and clock
// freezes and actual boss damage crossing half health during windup. This
// geometry gate does not certify raster quality or browser input.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createGame, updateGame } from '../src/game.js';

// The optional source pins the pre-repair renderer for the red proof without
// changing production files or substituting a pose helper for the real renderer.
const { createRenderer } = await import(process.env.EMBERWAKE_RENDER_SOURCE
  ? pathToFileURL(process.env.EMBERWAKE_RENDER_SOURCE).href : '../src/render.js');

function recordingCanvas() {
  const draws = [];
  let matrix = [1, 0, 0, 1, 0, 0];
  let path = [];
  const stack = [];
  const ctx = {
    fillStyle: '', globalAlpha: 1, globalCompositeOperation: 'source-over',
    save() { stack.push({ matrix: [...matrix], fillStyle: this.fillStyle, globalAlpha: this.globalAlpha, globalCompositeOperation: this.globalCompositeOperation }); },
    restore() { const state = stack.pop(); matrix = state.matrix; Object.assign(this, { fillStyle: state.fillStyle, globalAlpha: state.globalAlpha, globalCompositeOperation: state.globalCompositeOperation }); },
    setTransform(...values) { matrix = values; },
    translate(x, y) { matrix[4] += matrix[0] * x + matrix[2] * y; matrix[5] += matrix[1] * x + matrix[3] * y; },
    scale(x, y) { matrix[0] *= x; matrix[1] *= x; matrix[2] *= y; matrix[3] *= y; },
    beginPath() { path = []; },
    moveTo(x, y) { path.push(point(x, y)); },
    lineTo(x, y) { path.push(point(x, y)); },
    closePath() {},
    fill() { draws.push({ color: this.fillStyle, points: [...path] }); },
    fillRect(x, y, w, h) { draws.push({ color: this.fillStyle, points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => point(px, py)) }); },
    clearRect() {},
    createLinearGradient() { return { addColorStop() {} }; },
  };
  function point(x, y) { return [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]]; }
  return { draws, getContext: () => ctx };
}

const WEAPONS = {
  hero: { color: '#ebf8dd', idleColor: '#6e9291', hand: '#d5be95', handle: '#ce955e', w: 18, h: 34, duration: .27 },
  walker: { color: '#a79a77', hand: '#cbd2a5', w: 20, h: 30, duration: .27, windup: .5 },
  archer: { color: '#b1986e', hand: '#c9b399', w: 20, h: 34, duration: .27, windup: .72 },
  brute: { color: '#596269', hand: '#b4a18a', handle: '#69553d', w: 30, h: 40, duration: .27, windup: .8 },
  boss: { color: '#8fada1', hand: '#a7aa8d', handle: '#8b7650', w: 48, h: 64, duration: .38, windup: .88 },
};

function fixture(type, facing = 1, extra = {}) {
  const spec = WEAPONS[type];
  const actor = { type, x: 260 - spec.w / 2, y: 230 - spec.h, w: spec.w, h: spec.h, facing, grounded: true, vx: 0, hp: 100, maxHp: 100, attackDuration: spec.duration, attackTime: 0, windup: 0, state: 'patrol', attackKind: 'melee', ...extra };
  const game = { seed: 1234, floor: 1, time: 0, world: { width: 640, height: 360, platforms: [], rooms: [], pickups: [] }, player: type === 'hero' ? actor : { x: -100, y: 200, w: 18, h: 34, grounded: true }, enemies: type === 'hero' ? [] : [actor], projectiles: [] };
  return { game, actor };
}

function render(game, options = {}) {
  const canvas = recordingCanvas();
  const renderer = createRenderer(canvas);
  try { renderer.render(game, 0, [], options); return canvas.draws; }
  finally { renderer.destroy(); }
}
function weapon(draws, type) {
  const spec = WEAPONS[type];
  const geometry = draws.find(draw => draw.color === spec.color || draw.color === spec.idleColor);
  assert.ok(geometry, `${type} physical weapon must actually be drawn`);
  return geometry.points;
}
function distance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function displacement(a, b) { return Math.max(...a.map((point, i) => distance(point, b[i]))); }
function offsets(points) { return points.map(point => [point[0] - points[0][0], point[1] - points[0][1]]); }
function centroid(points) { return points.reduce(([x, y], point) => [x + point[0] / points.length, y + point[1] / points.length], [0, 0]); }
function segmentDistance(point, a, b) {
  const length = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  const t = length ? Math.max(0, Math.min(1, ((point[0] - a[0]) * (b[0] - a[0]) + (point[1] - a[1]) * (b[1] - a[1])) / length)) : 0;
  return distance(point, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
}

for (const type of Object.keys(WEAPONS)) {
  for (const combo of type === 'hero' ? [1, 2, 3] : [0]) {
    test(`${type}${combo ? ` combo ${combo}` : ''}: physical weapon traverses attack phases and mirrors both facings`, () => {
      const duration = type === 'hero' ? [0, .27, .29, .38][combo] : WEAPONS[type].duration;
      for (const facing of [1, -1]) {
        const samples = [.02, .12, .3, .58, .82, .999].map(progress => {
          const { game } = fixture(type, facing, { combo, state: 'attack', attackDuration: duration, attackTime: duration * (1 - progress) });
          const draws = render(game);
          const points = weapon(draws, type);
          const { game: opposite } = fixture(type, -facing, { combo, state: 'attack', attackDuration: duration, attackTime: duration * (1 - progress) });
          assert.deepEqual(weapon(render(opposite), type), points.map(([x, y]) => [520 - x, y]), `${type} facing must mirror the actual blade/bow/head`);
          const hand = draws.find(draw => draw.color === WEAPONS[type].hand);
          assert.ok(hand, `${type} must draw the gripping hand`);
          const grip = centroid(hand.points);
          const handle = draws.find(draw => draw.color === WEAPONS[type].handle) || draws.find(draw => draw.color === WEAPONS[type].color);
          assert.ok(Math.min(...handle.points.map((point, i) => segmentDistance(grip, point, handle.points[(i + 1) % handle.points.length]))) <= 6, `${type} weapon must stay at the hand`);
          return points;
        });
        for (let i = 1; i < samples.length; i++) assert.ok(displacement(samples[i - 1], samples[i]) >= 3, `${type} physical weapon is frozen between attack samples ${i - 1}/${i}`);
        const idle = weapon(render(fixture(type, facing, { combo }).game), type);
        assert.ok(displacement(samples.at(-1), idle) <= 2, `${type} weapon must return before the attack clock ends`);
      }
    });
  }
  if (type !== 'hero') {
    test(`${type}: weapon anticipation develops during windup and joins the strike without a snap`, () => {
      for (const facing of [1, -1]) {
        const samples = [.05, .45, .95].map(progress => weapon(render(fixture(type, facing, { state: 'windup', windup: WEAPONS[type].windup * (1 - progress) }).game), type));
        assert.ok(displacement(samples[0], samples[1]) >= 3, `${type} windup must move its physical weapon`);
        assert.ok(displacement(samples[1], samples[2]) >= 3, `${type} windup must keep developing`);
        const strike = weapon(render(fixture(type, facing, { state: 'attack', attackTime: WEAPONS[type].duration }).game), type);
        // The bow intentionally snaps its string and recoils on the actual shot.
        if (type !== 'archer') assert.ok(displacement(samples.at(-1), strike) <= 3, `${type} windup and strike must meet`);
      }
    });
  }
}

test('three sword combos have distinct physical blade paths', () => {
  const paths = [1, 2, 3].map(combo => [.12, .3, .58].map(progress => {
    const duration = [0, .27, .29, .38][combo];
    return weapon(render(fixture('hero', 1, { combo, attackDuration: duration, attackTime: duration * (1 - progress) }).game), 'hero');
  }));
  assert.equal(new Set(paths.map(path => JSON.stringify(path))).size, 3);
});

test('melee slash leading edge follows the physical blade or weapon head', () => {
  for (const type of ['hero', 'walker', 'brute', 'boss']) {
    for (const combo of type === 'hero' ? [1, 2, 3] : [0]) {
      for (const facing of [1, -1]) {
        for (const progress of [.12, .3, .58, .82]) {
          const { game } = fixture(type, facing, { combo, state: 'attack', attackTime: WEAPONS[type].duration * (1 - progress) });
          const draws = render(game);
          const points = weapon(draws, type);
          const slashColor = type === 'hero' ? ['#98fff0', '#5ae8e1', '#ffc36e'][combo - 1] : '#fca372';
          const slash = draws.find(draw => draw.color === slashColor);
          assert.ok(slash, `${type} active swing must draw its slash`);
          const leadingEdge = slash.points[8];
          assert.ok(Math.min(...points.map((point, i) => segmentDistance(leadingEdge, point, points[(i + 1) % points.length]))) <= 6, `${type} slash must follow the physical blade/head`);
        }
      }
    }
  }
});

test('weapon motion scales with faster combos and the boss half-health windup', () => {
  for (const combo of [1, 2, 3]) {
    const duration = [0, .27, .29, .38][combo];
    for (const progress of [.12, .3, .58, .82]) {
      const normal = fixture('hero', 1, { combo, attackDuration: duration, attackTime: duration * (1 - progress) });
      const faster = fixture('hero', 1, { combo, attackDuration: duration / 1.2, attackTime: duration / 1.2 * (1 - progress) });
      assert.deepEqual(weapon(render(normal.game), 'hero'), weapon(render(faster.game), 'hero'));
    }
  }
  for (const progress of [.05, .45, .95]) {
    const normal = fixture('boss', 1, { state: 'windup', windup: .88 * (1 - progress) });
    const faster = fixture('boss', 1, { state: 'windup', hp: 49, windup: .88 * .78 * (1 - progress) });
    assert.deepEqual(weapon(render(normal.game), 'boss'), weapon(render(faster.game), 'boss'));
  }
});

for (const kind of ['melee', 'volley']) {
  test(`boss ${kind}: damage crossing half health preserves this windup pose and speeds the next windup`, () => {
    const step = 1 / 120;
    const game = createGame(0);
    // Reach the generated boss using the real floor transition; isolate combat
    // fixtures so only the timing and damage being checked affect this sample.
    for (let floor = 1; floor < 3; floor++) {
      game.enemies.forEach(enemy => { enemy.dead = true; enemy.hp = 0; });
      game.player.x = game.world.exit.x;
      game.player.y = game.world.exit.y;
      updateGame(game, { interactPressed: true }, step);
      assert.equal(game.floor, floor + 1);
    }
    const boss = game.enemies.find(enemy => enemy.type === 'boss');
    game.enemies = [boss];
    game.world.pickups = [];
    game.player.x = boss.x - 60;
    game.player.y = boss.y + boss.h - game.player.h;
    game.player.facing = 1;
    game.player.invulnerable = 10;
    boss.hp = 180;
    boss.cooldown = 0;
    boss.attackCount = kind === 'volley' ? 2 : 0;
    updateGame(game, {}, step);
    assert.equal(boss.state, 'windup');
    assert.equal(boss.attackKind, kind);
    assert.equal(boss.windup, .88, 'the attack begins above half health with the original slow timing');
    while (boss.windup > .66) updateGame(game, {}, step);
    updateGame(game, { attackPressed: true }, step);
    while (1 - game.player.attackTime / game.player.attackDuration < .17 - step / game.player.attackDuration) updateGame(game, {}, step);
    const control = structuredClone(game);
    control.player.hitEnemies.push(boss.id);
    updateGame(game, {}, step);
    updateGame(control, {}, step);
    const unhit = control.enemies[0];
    assert.equal(boss.hp, 161, 'an actual first-combo hit must cross half of the 340HP boss');
    assert.equal(unhit.hp, 180);
    assert.equal(boss.state, 'windup', 'the Warden preserves its current windup on damage');
    assert.equal(boss.windup, unhit.windup, 'hit and control must have identical remaining clocks');
    const hitWeapon = weapon(render(game), 'boss');
    const controlWeapon = weapon(render(control), 'boss');
    assert.deepEqual(offsets(hitWeapon), offsets(controlWeapon), 'health alone must not rewind the actual rendered axe');
    assert.ok(distance(centroid(hitWeapon), centroid(controlWeapon)) <= 1, 'only the subpixel damage knockback may translate the current axe');
    assert.equal(boss.windupDuration, .88, 'current windup retains the duration selected above half health');
    let departed = false;
    let nextStarted = false;
    for (let frame = 0; frame < 360 && !nextStarted; frame++) {
      updateGame(game, {}, step);
      if (boss.state !== 'windup') departed = true;
      if (departed && boss.state === 'windup') nextStarted = true;
    }
    assert.ok(nextStarted, 'the simulation must actually start the next attack');
    assert.equal(boss.hp, 161);
    assert.equal(boss.windupDuration, .88 * .78, 'the next attack selects the existing fast phase');
    assert.equal(boss.windup, boss.windupDuration, 'metadata must describe the real next windup timer');
  });
}

test('archer nocked arrow disappears on the simulation step that creates the projectile', () => {
  const game = createGame(0);
  const archer = game.enemies.find(enemy => enemy.type === 'archer');
  game.enemies = [archer];
  game.player.x = archer.x - 100;
  archer.facing = -1;
  archer.state = 'windup';
  archer.windup = 1 / 120;
  const before = render(game);
  assert.ok(before.some(draw => draw.color === '#e4eac8'), 'a ready arrow must be visible before release');
  updateGame(game, {}, 1 / 120);
  assert.equal(archer.state, 'attack');
  assert.equal(game.projectiles.length, 1, 'the actual simulation must fire');
  assert.ok(!render(game).some(draw => draw.color === '#e4eac8'), 'the launched arrow must no longer be nocked');
});

test('boss volley uses moving weapon poses without a phantom melee slash', () => {
  for (const facing of [1, -1]) {
    const poses = [0, .25, .6, .99].map(progress => {
      const draws = render(fixture('boss', facing, { attackKind: 'volley', state: 'attack', attackTime: .38 * (1 - progress) }).game);
      assert.ok(!draws.some(draw => ['#fca372', '#f4d6b0', '#ff9d6a'].includes(draw.color)), 'ranged volley must not draw a melee slash');
      return weapon(draws, 'boss');
    });
    for (let i = 1; i < poses.length; i++) assert.ok(displacement(poses[i - 1], poses[i]) >= 3, 'volley weapon must move through release and return');
    const melee = weapon(render(fixture('boss', facing, { state: 'attack', attackTime: .38 * .75 }).game), 'boss');
    assert.ok(displacement(poses[1], melee) >= 10, 'volley must differ from an axe strike');
  }
});

test('essential weapon poses follow simulation clocks through reduced motion, freeze and cancellation', () => {
  for (const type of Object.keys(WEAPONS)) {
    const { game, actor } = fixture(type, 1, { combo: 1, state: 'attack', attackTime: WEAPONS[type].duration * .7 });
    const normal = weapon(render(game), type);
    assert.deepEqual(weapon(render(game, { reducedMotion: true }), type), normal);
    game.time = .25;
    assert.deepEqual(offsets(weapon(render(game), type)), offsets(normal), `${type} must not swing from visual time during hit-stop`);
    game.time = 0;
    assert.deepEqual(weapon(render(game, { paused: true }), type), normal);
    actor.attackTime = 0;
    actor.windup = 0;
    actor.state = 'hurt';
    assert.deepEqual(weapon(render(game), type), weapon(render(fixture(type).game), type), `${type} cancellation must restore the ready weapon`);
    const snapshot = structuredClone(game);
    render(game);
    assert.deepEqual(game, snapshot, 'rendering must remain read-only');
  }
});
