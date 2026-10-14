// Bound: actual native Canvas commands for seven silhouettes, equipment slots,
// rarity, merchant stock, shield stance, spear commitment, vial release and bomb
// clocks/radius in both facings and three palettes. Isolated renderer fixtures
// do not certify real browser controls, combat timing or frame cost.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { recordingCanvas, shapeDistance, boundarySegments } from './helpers/recording-canvas.js';
import { ACTOR_SPECS, rogueActor, rogueScene } from './helpers/roguelike-scene.js';

const { createRenderer } = await import(process.env.EMBERWAKE_RENDER_SOURCE
  ? pathToFileURL(process.env.EMBERWAKE_RENDER_SOURCE).href : '../src/render.js');

function render(game, options = {}) {
  const canvas = recordingCanvas();
  const renderer = createRenderer(canvas);
  try { renderer.render(game, 0, [], options); return canvas; }
  finally { renderer.destroy(); }
}
function colorShape(canvas, color) {
  const draw = canvas.draws.find(shape => shape.color === color);
  assert.ok(draw, `physical geometry ${color} must be rendered`);
  return draw;
}
function centroid(points) { return points.reduce(([x, y], point) => [x + point[0] / points.length, y + point[1] / points.length], [0, 0]); }
function signature(canvas, colors) { return canvas.draws.filter(draw => colors.includes(draw.color)); }
function bounds(draws) {
  const points = draws.flatMap(draw => draw.points);
  return { left: Math.min(...points.map(p => p[0])), right: Math.max(...points.map(p => p[0])), top: Math.min(...points.map(p => p[1])), bottom: Math.max(...points.map(p => p[1])) };
}
function segmentDistance(point, a, b) {
  const length = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  const t = length ? Math.max(0, Math.min(1, ((point[0] - a[0]) * (b[0] - a[0]) + (point[1] - a[1]) * (b[1] - a[1])) / length)) : 0;
  return Math.hypot(point[0] - a[0] - t * (b[0] - a[0]), point[1] - a[1] - t * (b[1] - a[1]));
}

test('seven enemy roles draw distinct authored body outlines', () => {
  const outlines = { walker: '#1c2e2b', archer: '#141c2b', brute: '#17242d', boss: '#182733', shield: '#10222c', lancer: '#18272c', alchemist: '#192334' };
  const silhouettes = Object.entries(outlines).map(([type, color]) => colorShape(render(rogueScene({ enemies: [rogueActor(type)] })), color).points);
  assert.equal(new Set(silhouettes.map(points => JSON.stringify(points))).size, 7, 'roles must differ in body geometry, beyond palette swaps');
  for (let i = 0; i < silhouettes.length; i++) for (let j = i + 1; j < silhouettes.length; j++) assert.ok(shapeDistance(silhouettes[i], silhouettes[j]) >= 2, 'role outlines must remain distinguishable at native resolution');
});

test('shield guard stays in front and lowers during its vulnerable stance', () => {
  for (const facing of [1, -1]) {
    const guarding = colorShape(render(rogueScene({ enemies: [rogueActor('shield', facing)] })), '#648b9a');
    const lowered = colorShape(render(rogueScene({ enemies: [rogueActor('shield', facing, { guarding: false, state: 'recovery' })] })), '#445f71');
    assert.ok((centroid(guarding.points)[0] - 260) * facing >= 9, 'guard must visibly cover the facing side');
    assert.ok(centroid(lowered.points)[1] - centroid(guarding.points)[1] >= 5, 'recovery must visibly lower the physical shield');
  }
});

test('lancer warning follows committed facing and develops with immutable windup', () => {
  for (const facing of [1, -1]) {
    const samples = [.05, .55, .95].map(progress => {
      const actor = rogueActor('lancer', facing, { state: 'windup', windup: .74 * (1 - progress) });
      const canvas = render(rogueScene({ enemies: [actor] }));
      const arrows = signature(canvas, ['#f4c28f', '#845744']);
      assert.equal(arrows.length, 4, 'charge must draw four distinct direction chevrons');
      assert.ok(arrows.every(draw => (centroid(draw.points)[0] - 260) * facing >= 16), 'charge line must use the actual committed facing');
      return arrows.filter(draw => draw.color === '#f4c28f').length;
    });
    assert.deepEqual(samples, [1, 3, 4]);
    const actor = rogueActor('lancer', facing, { state: 'windup', windup: .185, windupDuration: .74, hp: 40, elite: true });
    const normal = colorShape(render(rogueScene({ enemies: [actor] })), '#d0b59a');
    actor.windupDuration = .37;
    actor.windup = .0925;
    assert.deepEqual(colorShape(render(rogueScene({ enemies: [actor] })), '#d0b59a'), normal, 'equal windup progress must retain the physical spear pose at changed speed');
  }
});

test('alchemist physical vial and gripping arm anticipate, throw, mirror and return', () => {
  for (const facing of [1, -1]) {
    const windups = [.05, .45, .95].map(progress => {
      const actor = rogueActor('alchemist', facing, { state: 'windup', windup: .86 * (1 - progress) });
      const canvas = render(rogueScene({ enemies: [actor] }));
      const vial = colorShape(canvas, '#73d6ba');
      const hand = centroid(colorShape(canvas, '#d7b69c').points);
      const body = colorShape(canvas, '#25494b');
      assert.ok(Math.min(...boundarySegments(body).map(([a, b]) => segmentDistance(hand, a, b))) <= 4, 'held vial must remain attached to the moving hand');
      const mirror = render(rogueScene({ enemies: [rogueActor('alchemist', -facing, { state: 'windup', windup: .86 * (1 - progress) })] }));
      assert.deepEqual(colorShape(mirror, '#73d6ba').points, vial.points.map(([x, y]) => [520 - x, y]));
      return vial.points;
    });
    for (let i = 1; i < windups.length; i++) assert.ok(shapeDistance(windups[i - 1], windups[i]) >= 5, 'held vial must visibly move throughout anticipation');
    const throws = [.02, .12, .3, .58, .82, .999].map(progress => {
      const actor = rogueActor('alchemist', facing, { state: 'attack', attackTime: .32 * (1 - progress) });
      const canvas = render(rogueScene({ enemies: [actor] }));
      assert.ok(!canvas.draws.some(draw => draw.color === '#73d6ba'), 'released vial must leave the hand throughout the throw');
      const hand = colorShape(canvas, '#d7b69c').points;
      assert.deepEqual(colorShape(render(rogueScene({ enemies: [rogueActor('alchemist', -facing, { state: 'attack', attackTime: .32 * (1 - progress) })] })), '#d7b69c').points, hand.map(([x, y]) => [520 - x, y]));
      return hand;
    });
    for (let i = 1; i < throws.length; i++) assert.ok(shapeDistance(throws[i - 1], throws[i]) >= 3, 'throwing hand must keep moving through release and return');
    const idle = colorShape(render(rogueScene({ enemies: [rogueActor('alchemist', facing)] })), '#d7b69c').points;
    assert.ok(shapeDistance(throws.at(-1), idle) <= 1, 'throwing arm must finish at the idle grip');
  }
});

test('alchemist and bomb essential geometry ignores visual time, pause and reduced motion', () => {
  for (const facing of [1, -1]) for (const phase of ['windup', 'attack']) {
    const actor = rogueActor('alchemist', facing, { state: phase, windup: phase === 'windup' ? .3 : 0, attackTime: phase === 'attack' ? .2 : 0 });
    const game = rogueScene({ enemies: [actor] });
    const colors = ['#73d6ba', '#d7b69c', '#25494b'];
    const normal = signature(render(game), colors);
    assert.deepEqual(signature(render(game, { reducedMotion: true, paused: true }), colors), normal);
    game.time = 2;
    assert.deepEqual(signature(render(game), colors), normal, 'simulation clock freeze must keep the essential throw pose');
    actor.state = 'hurt'; actor.windup = 0; actor.attackTime = 0;
    assert.deepEqual(signature(render(game), colors), signature(render(rogueScene({ enemies: [rogueActor('alchemist', facing)] })), colors));
  }
  for (const phase of ['flight', 'warning', 'blast']) {
    const game = rogueScene({ projectiles: [{ type: 'bomb', w: 8, h: 10, phase, x: 300, y: 190, vx: -100, vy: 60, fuse: .3, life: .1, blastRadius: 54 }] });
    const colors = ['#b7db85', '#edaa72', '#f9d296', '#ffcc83', '#ffeab1', '#fff0ba'];
    const normal = signature(render(game), colors);
    game.time = 3;
    assert.deepEqual(signature(render(game, { reducedMotion: true, paused: true }), colors), normal);
    const snapshot = structuredClone(game);
    render(game);
    assert.deepEqual(game, snapshot, 'bomb rendering must not advance simulation clocks');
  }
});

test('bomb flight follows physical velocity and warning/blast follow actual clocks and radii', () => {
  const bomb = { type: 'bomb', w: 8, h: 10, phase: 'flight', x: 300, y: 190, vx: 120, vy: -200, life: 3.5, fuse: .6, blastRadius: 54 };
  const game = rogueScene({ projectiles: [bomb] });
  const rising = colorShape(render(game), '#b7db85').points;
  bomb.vy = 200;
  assert.ok(shapeDistance(rising, colorShape(render(game), '#b7db85').points) >= 4, 'airborne vial must turn with physical velocity');
  bomb.phase = 'warning';
  const rings = [.6, .3, .02].map(fuse => { bomb.fuse = fuse; return colorShape(render(game), '#f9d296').points; });
  assert.ok(shapeDistance(rings[0], rings[1]) >= 20 && shapeDistance(rings[1], rings[2]) >= 20, 'warning clock must close with the simulation fuse');
  for (const radius of [54, 66]) {
    bomb.blastRadius = radius;
    const ring = bounds([colorShape(render(game), '#edaa72')]);
    assert.deepEqual(ring, { left: 304 - radius, right: 304 + radius, top: 195 - radius, bottom: 195 + radius }, 'warned circle must show the actual damage radius');
  }
  bomb.phase = 'blast'; bomb.life = .18;
  const early = colorShape(render(game), '#ffeab1').points;
  bomb.life = .03;
  assert.ok(shapeDistance(early, colorShape(render(game), '#ffeab1').points) >= 25, 'blast must develop using remaining blast lifetime');
  bomb.x = -40;
  assert.ok(render(game).draws.some(draw => draw.color === '#ffcc83'), 'a blast whose center is offscreen must retain its visible edge');
});

test('loot rarity colors accompany three distinct slot silhouettes and separate consumables', () => {
  const colors = { common: '#bfcab6', uncommon: '#87d9a1', rare: '#82bdf4', epic: '#d79eea' };
  for (const [rarity, color] of Object.entries(colors)) {
    const shapes = ['blade', 'armor', 'charm'].map(slot => {
      const canvas = render(rogueScene({ pickups: [{ type: 'gear', x: 300, y: 190, item: { rarity, slot } }] }));
      const draws = signature(canvas, [color]).filter(draw => draw.kind === 'raster' && draw.alpha === 1);
      assert.equal(draws.length, 1, `${rarity} ${slot} must draw its own colored slot body`);
      return draws[0].points;
    });
    assert.equal(new Set(shapes.map(points => JSON.stringify(points))).size, 3, 'gear must be identifiable by slot shape beyond rarity');
  }
  for (const [type, color] of [['flask', '#80b9dd'], ['ember', '#ef9d67']]) {
    const game = rogueScene({ pickups: [{ type, x: 300, y: 190 }] });
    colorShape(render(game), color);
    game.world.pickups[0].collected = true;
    assert.ok(!render(game).draws.some(draw => draw.color === color), 'consumed resources must leave the scene');
  }
});

test('merchant feet anchor, stock removal and nearby interaction sign render without state mutation', () => {
  const merchant = { x: 300, y: 250, stock: [{ kind: 'flask', sold: false }, { kind: 'heal', sold: false }] };
  const game = rogueScene({ merchants: [merchant], player: { x: 280, y: 216 } });
  const before = render(game);
  assert.deepEqual(bounds(signature(before, ['#362f2d'])), { left: 269, right: 331, top: 232, bottom: 250 }, 'counter feet must meet the merchant ground anchor');
  assert.ok(before.draws.some(draw => draw.color === '#ffe1a1'), 'nearby merchant sign must draw the E interaction label');
  colorShape(before, '#80b9dd');
  merchant.stock[0].sold = true;
  assert.ok(!render(game).draws.some(draw => draw.color === '#80b9dd'), 'sold stock must disappear from the counter');
  game.player.x = -100;
  assert.ok(!render(game).draws.some(draw => draw.color === '#ffe1a1'), 'distant trader must show its name instead of an active E prompt');
  const snapshot = structuredClone(game);
  render(game);
  assert.deepEqual(game, snapshot);
});

test('new actors, loot, merchant and bomb phases obey existing integer raster and work bounds', () => {
  for (const floor of [1, 2, 3]) for (const facing of [1, -1]) for (const phase of ['patrol', 'windup', 'attack']) {
    const enemies = Object.keys(ACTOR_SPECS).map((type, i) => {
      const actor = rogueActor(type, facing, { x: 60 + i * 78, y: 260 - ACTOR_SPECS[type][1], state: phase, elite: true });
      actor.windup = phase === 'windup' ? actor.windupDuration * .4 : 0;
      actor.attackTime = phase === 'attack' ? actor.attackDuration * .65 : 0;
      return actor;
    });
    const canvas = render(rogueScene({
      floor, enemies,
      pickups: ['blade', 'armor', 'charm'].map((slot, i) => ({ type: 'gear', x: 80 + i * 40, y: 140, item: { slot, rarity: 'epic' } })).concat([{ type: 'flask', x: 210, y: 140 }, { type: 'ember', x: 240, y: 140 }]),
      projectiles: ['flight', 'warning', 'blast'].map((type, i) => ({ type: 'bomb', w: 8, h: 10, phase: type, x: 290 + i * 90, y: 120, vx: facing * 100, vy: -20, fuse: .2, life: .1, blastRadius: 66 })),
      merchants: [{ x: 550, y: 160, stock: [{ kind: 'flask' }, { kind: 'gear' }, { kind: 'heal' }] }],
    }), { reducedMotion: floor === 2 });
    assert.deepEqual(canvas.violations, [], 'new content must never bypass the integer raster');
    for (const draw of canvas.draws.filter(draw => draw.kind === 'raster')) assert.ok(draw.points.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x <= 640 && y >= 0 && y <= 360), 'new raster shapes must be clipped to the visible frame');
    assert.ok(canvas.draws.reduce((count, draw) => count + Math.max(1, draw.spans.length), 0) < 15000, 'seven actors and new content must retain the existing frame command bound');
  }
});
