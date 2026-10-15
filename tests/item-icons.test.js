// Bound: all 13 catalog gear icons, two merchant consumables and three empty
// type icons at their 12×12 source grid. Rendered menu/layout checks are separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, merchantStock } from '../src/roguelike.js';
import { ITEM_ICONS, itemIconPixels, itemIconSvg } from '../src/item-icons.js';

test('every gear item and merchant consumable has distinct original, valid pixel art', () => {
  const ids = [...ITEMS.map((item) => item.id), ...merchantStock(() => .5, 1).filter((entry) => !entry.item).map((entry) => entry.kind)];
  const signatures = new Set();
  for (const id of ids) {
    assert.ok(ITEM_ICONS[id], `${id} needs an icon`);
    assert.equal(ITEM_ICONS[id].rows.length, 12);
    assert.ok(ITEM_ICONS[id].rows.every((row) => row.length === 12));
    const pixels = itemIconPixels(id);
    assert.ok(pixels.length > 20, `${id} must draw a recognizable object`);
    assert.ok(pixels.every(({ x, y, color }) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < 12 && y < 12 && /^#[0-9a-f]{6}$/i.test(color)));
    assert.equal(new Set(pixels.map(({ x, y }) => `${x},${y}`)).size, pixels.length);
    const svg = itemIconSvg(id);
    assert.match(svg, /shape-rendering="crispEdges"/);
    assert.match(svg, /aria-hidden="true" focusable="false"/);
    assert.equal((svg.match(/<rect /g) ?? []).length, pixels.length);
    signatures.add(JSON.stringify(pixels));
  }
  assert.equal(signatures.size, ids.length);
});

test('empty slots have distinct subdued type icons', () => {
  const icons = ['blade', 'armor', 'charm'].map((slot) => itemIconPixels(null, slot));
  assert.ok(icons.every((pixels) => pixels.length > 20));
  assert.equal(new Set(icons.map((pixels) => JSON.stringify(pixels))).size, 3);
});
