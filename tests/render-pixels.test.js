// Bound: production Canvas commands for three floor palettes, all actor types,
// both facings, attack/windup/roll, reduced motion, pickups and projectile FX at
// native 640x360. Rejects anti-aliased drawing primitives and unbounded polygon
// spans; browser raster quality, controls and real frame cost are separate gates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createGame } from '../src/game.js';
import { fillPixelPolygon } from '../src/pixel-raster.js';
import { recordingCanvas, rasterPixels } from './helpers/recording-canvas.js';

const { createRenderer } = await import(process.env.EMBERWAKE_PIXEL_SOURCE
  ? pathToFileURL(process.env.EMBERWAKE_PIXEL_SOURCE).href : '../src/render.js');

function scene(floor, facing, phase) {
  const game = createGame(1234);
  game.floor = floor;
  game.time = phase * 1.3;
  game.world = {
    width: 640, height: 360,
    platforms: [{ x: 0, y: 280, w: 640, h: 80 }, { x: 230, y: 198, w: 100, h: 8, oneWay: true }],
    rooms: [{ x: 0, w: 640, index: 0, kind: phase === 2 ? 'relic' : 'combat' }],
    exit: { x: 600, y: 210, w: 24, h: 70, locked: phase !== 2 },
    pickups: ['coin', 'heal', 'relic'].map((type, i) => ({ type, x: 340 + i * 30, y: 240 })),
  };
  Object.assign(game.player, { x: 90, y: 246, facing, grounded: true, combo: phase % 3 + 1, comboWindow: .8, attackDuration: .38, attackTime: .25, rollTime: phase === 3 ? .1 : 0 });
  game.enemies = ['walker', 'archer', 'brute', 'boss'].map((type, i) => {
    const w = [20, 20, 30, 48][i];
    const h = [30, 34, 40, 64][i];
    const windupDuration = [.5, .72, .8, .88][i];
    return { id: i, type, x: 180 + i * 100, y: 280 - h, w, h, hp: 80, maxHp: 100, facing, grounded: true, vx: 20, attackDuration: .38, attackTime: phase === 1 ? .25 : 0, state: phase === 1 ? 'attack' : 'windup', windupDuration, windup: phase === 1 ? 0 : windupDuration * .45, attackKind: phase === 2 ? 'volley' : 'melee' };
  });
  game.projectiles = ['arrow', 'orb', 'wave'].map((type, i) => ({ type, x: 300 + i * 35, y: 165, vx: facing * 60 }));
  return game;
}

test('all authored scene geometry stays on integer pixels with discrete lighting', () => {
  const seen = new Set();
  for (const floor of [1, 2, 3]) for (const facing of [1, -1]) for (const phase of [0, 1, 2, 3]) {
    const game = scene(floor, facing, phase);
    const canvas = recordingCanvas();
    const renderer = createRenderer(canvas);
    try {
      renderer.render(game, 1 / 60, [{ type: 'hit', x: 350, y: 240, amount: 34, stage: 3, direction: facing }], { reducedMotion: floor === 2 });
      assert.deepEqual(canvas.violations, [], `floor ${floor}, facing ${facing}, phase ${phase}: smooth or fractional Canvas drawing escaped the pixel renderer`);
      const polygons = canvas.draws.filter(draw => draw.kind === 'raster');
      assert.ok(polygons.length > 25, 'the gate must exercise authored scene and actor polygons');
      for (const draw of polygons) {
        seen.add(draw.color);
        assert.ok(draw.points.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x <= 640 && y >= 0 && y <= 360), 'raster paths must be clipped to the native visible frame');
      }
      assert.ok(canvas.draws.reduce((count, draw) => count + Math.max(1, draw.spans.length), 0) < 15000, 'authored shapes must remain bounded draw commands rather than per-pixel frame writes');
    } finally { renderer.destroy(); }
  }
  for (const color of ['#ebf8dd', '#a79a77', '#b1986e', '#596269', '#8fada1', '#98fff0', '#5ae8e1', '#ffc36e', '#fca372', '#e4eac8']) assert.ok(seen.has(color), `actual weapon/effect ${color} was not exercised`);
});

test('pixel raster gives small diagonal artwork explicit solid square steps', () => {
  const canvas = recordingCanvas();
  fillPixelPolygon(canvas.getContext(), '#ffffff', [[0, 0], [5, 0], [0, 5]], 640, 360);
  assert.deepEqual([...rasterPixels(canvas.draws[0])], ['0,0', '1,0', '2,0', '3,0', '0,1', '1,1', '2,1', '0,2', '1,2', '0,3']);
  assert.deepEqual(canvas.violations, []);
});

test('oversized authored geometry is scanned and drawn only inside the visible canvas', () => {
  const canvas = recordingCanvas();
  const ctx = canvas.getContext();
  ctx.translate(37, 18);
  ctx.scale(-1, 1);
  fillPixelPolygon(ctx, '#ffffff', [[-100000, -100000], [100000, -100000], [100000, 100000], [-100000, 100000]], 640, 360);
  assert.equal(canvas.draws.length, 1);
  assert.equal(canvas.draws[0].spans.length, 1, 'equal scanlines must merge into one visible rectangle');
  assert.deepEqual(canvas.draws[0].points, [[640, 0], [0, 0], [0, 360], [640, 360]]);
});
