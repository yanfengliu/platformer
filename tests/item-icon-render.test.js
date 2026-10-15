// Bound: exact opaque 2×2 Canvas pixels for all catalog ground gear in one
// native 640×360 fixture. Does not replace real controls or visual inspection.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { ITEMS } from '../src/roguelike.js';
import { itemIconPixels } from '../src/item-icons.js';
import { recordingCanvas } from './helpers/recording-canvas.js';
import { rogueScene } from './helpers/roguelike-scene.js';
const { createRenderer } = await import(process.env.EMBERWAKE_ICON_RENDER_SOURCE ? pathToFileURL(process.env.EMBERWAKE_ICON_RENDER_SOURCE).href : '../src/render.js');

test('ground gear renders the same per-item icon pixels as menu SVGs', () => {
  for (const item of ITEMS) {
    const canvas = recordingCanvas();
    const renderer = createRenderer(canvas);
    try {
      renderer.render(rogueScene({ pickups: [{ type: 'gear', item, x: 300, y: 190 }] }), 0, [], { reducedMotion: true });
      const actual = new Set(canvas.draws.filter(d => d.alpha === 1 && d.kind === 'rect' && d.points[1][0] - d.points[0][0] === 2 && d.points[2][1] - d.points[1][1] === 2).map(d => `${d.points[0][0]},${d.points[0][1]},${d.color}`));
      const y = Math.round(190 + Math.sin(300) * 2);
      for (const pixel of itemIconPixels(item.id)) assert.ok(actual.has(`${288 + pixel.x * 2},${y - 12 + pixel.y * 2},${pixel.color}`), `${item.id}: missing icon pixel ${pixel.x},${pixel.y}`);
      assert.deepEqual(canvas.violations, []);
    } finally { renderer.destroy(); }
  }
});
