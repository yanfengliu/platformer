import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createPixelFont } from '../scripts/pixel-font.mjs';

// Bound: retained font integrity and the English UI character repertoire, not browser layout.
test('local pixel font has valid checksums and covers every UI glyph', async () => {
  const font = await readFile(new URL('../src/assets/emberwake-pixel.ttf', import.meta.url));
  assert.ok(font.length < 50 * 1024, 'Authored UI font must stay below 50 KiB.');
  assert.deepEqual(font, createPixelFont(), 'Retained font must match its original glyph source.');
  let checksum = 0;
  for (let at = 0; at < font.length; at += 4) checksum = (checksum + font.readUInt32BE(at)) >>> 0;
  assert.equal(checksum, 0xb1b0afba, 'TrueType file checksum must be valid.');
  const tables = new Map();
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const at = 12 + i * 16;
    const tag = font.toString('ascii', at, at + 4);
    const offset = font.readUInt32BE(at + 8);
    const length = font.readUInt32BE(at + 12);
    assert.ok(offset + length <= font.length, `${tag} must stay within the font.`);
    tables.set(tag, font.subarray(offset, offset + length));
  }
  for (const tag of ['cmap', 'glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp', 'name', 'OS/2', 'post']) assert.ok(tables.has(tag), `Required TrueType table ${tag} must exist.`);
  assert.equal(tables.get('head').readUInt16BE(18), 800, 'An 8px em must map glyph cells to whole CSS pixels.');
  const cmap = tables.get('cmap');
  const at = cmap.readUInt32BE(8);
  assert.equal(cmap.readUInt16BE(at), 4);
  const segments = cmap.readUInt16BE(at + 6) / 2;
  const end = at + 14;
  const start = end + segments * 2 + 2;
  const delta = start + segments * 2;
  const glyphId = (code) => {
    for (let i = 0; i < segments; i++) {
      if (code >= cmap.readUInt16BE(start + i * 2) && code <= cmap.readUInt16BE(end + i * 2)) return (code + cmap.readUInt16BE(delta + i * 2)) & 0xffff;
    }
    return 0;
  };
  const repertoire = [...Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)), ...'·×–—‘’“”…←↑→↓◇◆✦✧⟡'];
  for (const character of repertoire) assert.notEqual(glyphId(character.codePointAt(0)), 0, `UI character ${character} must have an authored glyph.`);
  const loca = tables.get('loca');
  const glyf = tables.get('glyf');
  for (const character of repertoire.filter((value) => value !== ' ')) {
    const id = glyphId(character.codePointAt(0));
    assert.ok(glyf.readInt16BE(loca.readUInt32BE(id * 4)) > 0, `Visible character ${character} must contain contours.`);
  }
  assert.notEqual(glyphId(97), glyphId(65), 'Body copy keeps real lowercase glyphs.');
});
