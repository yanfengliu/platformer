import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Original Emberwake 5×7 glyphs. Regenerate with: node scripts/pixel-font.mjs
// Every filled horizontal run becomes a rectangular TrueType contour; no font dependency.
const shapes = {
  ' ': '00000/00000/00000/00000/00000/00000/00000',
  '!': '00100/00100/00100/00100/00100/00000/00100',
  '"': '01010/01010/01010/00000/00000/00000/00000',
  '#': '01010/11111/01010/01010/11111/01010/00000',
  '$': '00100/01111/10100/01110/00101/11110/00100',
  '%': '11001/11010/00100/00100/01000/10110/00110',
  '&': '01100/10010/10100/01000/10101/10010/01101',
  "'": '00100/00100/01000/00000/00000/00000/00000',
  '(': '00010/00100/01000/01000/01000/00100/00010',
  ')': '01000/00100/00010/00010/00010/00100/01000',
  '*': '00000/00100/10101/01110/10101/00100/00000',
  '+': '00000/00100/00100/11111/00100/00100/00000',
  ',': '00000/00000/00000/00000/00000/00100/01000',
  '-': '00000/00000/00000/11111/00000/00000/00000',
  '.': '00000/00000/00000/00000/00000/00000/00100',
  '/': '00001/00010/00010/00100/01000/01000/10000',
  '0': '01110/10001/10011/10101/11001/10001/01110',
  '1': '00100/01100/00100/00100/00100/00100/01110',
  '2': '01110/10001/00001/00010/00100/01000/11111',
  '3': '11110/00001/00001/01110/00001/00001/11110',
  '4': '00010/00110/01010/10010/11111/00010/00010',
  '5': '11111/10000/10000/11110/00001/00001/11110',
  '6': '01110/10000/10000/11110/10001/10001/01110',
  '7': '11111/00001/00010/00100/01000/01000/01000',
  '8': '01110/10001/10001/01110/10001/10001/01110',
  '9': '01110/10001/10001/01111/00001/00001/01110',
  ':': '00000/00100/00000/00000/00100/00000/00000',
  ';': '00000/00100/00000/00000/00100/00100/01000',
  '<': '00001/00010/00100/01000/00100/00010/00001',
  '=': '00000/00000/11111/00000/11111/00000/00000',
  '>': '10000/01000/00100/00010/00100/01000/10000',
  '?': '01110/10001/00001/00010/00100/00000/00100',
  '@': '01110/10001/10111/10101/10111/10000/01110',
  'A': '01110/10001/10001/11111/10001/10001/10001',
  'B': '11110/10001/10001/11110/10001/10001/11110',
  'C': '01111/10000/10000/10000/10000/10000/01111',
  'D': '11110/10001/10001/10001/10001/10001/11110',
  'E': '11111/10000/10000/11110/10000/10000/11111',
  'F': '11111/10000/10000/11110/10000/10000/10000',
  'G': '01111/10000/10000/10111/10001/10001/01111',
  'H': '10001/10001/10001/11111/10001/10001/10001',
  'I': '01110/00100/00100/00100/00100/00100/01110',
  'J': '00111/00010/00010/00010/00010/10010/01100',
  'K': '10001/10010/10100/11000/10100/10010/10001',
  'L': '10000/10000/10000/10000/10000/10000/11111',
  'M': '10001/11011/10101/10101/10001/10001/10001',
  'N': '10001/11001/11001/10101/10011/10011/10001',
  'O': '01110/10001/10001/10001/10001/10001/01110',
  'P': '11110/10001/10001/11110/10000/10000/10000',
  'Q': '01110/10001/10001/10001/10101/10010/01101',
  'R': '11110/10001/10001/11110/10100/10010/10001',
  'S': '01111/10000/10000/01110/00001/00001/11110',
  'T': '11111/00100/00100/00100/00100/00100/00100',
  'U': '10001/10001/10001/10001/10001/10001/01110',
  'V': '10001/10001/10001/10001/10001/01010/00100',
  'W': '10001/10001/10001/10101/10101/11011/10001',
  'X': '10001/10001/01010/00100/01010/10001/10001',
  'Y': '10001/10001/01010/00100/00100/00100/00100',
  'Z': '11111/00001/00010/00100/01000/10000/11111',
  '[': '01110/01000/01000/01000/01000/01000/01110',
  '\\': '10000/01000/01000/00100/00010/00010/00001',
  ']': '01110/00010/00010/00010/00010/00010/01110',
  '^': '00100/01010/10001/00000/00000/00000/00000',
  '_': '00000/00000/00000/00000/00000/00000/11111',
  '`': '01000/00100/00000/00000/00000/00000/00000',
  'a': '00000/00000/01110/00001/01111/10001/01111',
  'b': '10000/10000/11110/10001/10001/10001/11110',
  'c': '00000/00000/01111/10000/10000/10000/01111',
  'd': '00001/00001/01111/10001/10001/10001/01111',
  'e': '00000/00000/01110/10001/11111/10000/01111',
  'f': '00110/01001/01000/11100/01000/01000/01000',
  'g': '00000/00000/01111/10001/10001/01111/00001/11110',
  'h': '10000/10000/11110/10001/10001/10001/10001',
  'i': '00100/00000/01100/00100/00100/00100/01110',
  'j': '00010/00000/00110/00010/00010/00010/10010/01100',
  'k': '10000/10000/10010/10100/11000/10100/10010',
  'l': '01100/00100/00100/00100/00100/00100/01110',
  'm': '00000/00000/11010/10101/10101/10101/10101',
  'n': '00000/00000/11110/10001/10001/10001/10001',
  'o': '00000/00000/01110/10001/10001/10001/01110',
  'p': '00000/00000/11110/10001/10001/11110/10000/10000',
  'q': '00000/00000/01111/10001/10001/01111/00001/00001',
  'r': '00000/00000/10111/11000/10000/10000/10000',
  's': '00000/00000/01111/10000/01110/00001/11110',
  't': '01000/01000/11100/01000/01000/01001/00110',
  'u': '00000/00000/10001/10001/10001/10001/01111',
  'v': '00000/00000/10001/10001/10001/01010/00100',
  'w': '00000/00000/10001/10001/10101/10101/01010',
  'x': '00000/00000/10001/01010/00100/01010/10001',
  'y': '00000/00000/10001/10001/10001/01111/00001/11110',
  'z': '00000/00000/11111/00010/00100/01000/11111',
  '{': '00011/00100/00100/01000/00100/00100/00011',
  '|': '00100/00100/00100/00100/00100/00100/00100',
  '}': '11000/00100/00100/00010/00100/00100/11000',
  '~': '00000/00000/01001/10110/00000/00000/00000',
  '·': '00000/00000/00000/00100/00000/00000/00000',
  '×': '00000/10001/01010/00100/01010/10001/00000',
  '–': '00000/00000/00000/11111/00000/00000/00000',
  '—': '00000/00000/00000/11111/00000/00000/00000',
  '‘': '00010/00100/00100/00000/00000/00000/00000',
  '’': '00100/00100/01000/00000/00000/00000/00000',
  '“': '01010/10100/10100/00000/00000/00000/00000',
  '”': '01010/01010/10100/00000/00000/00000/00000',
  '…': '00000/00000/00000/00000/00000/00000/10101',
  '←': '00000/00100/01000/11111/01000/00100/00000',
  '↑': '00100/01110/10101/00100/00100/00100/00000',
  '→': '00000/00100/00010/11111/00010/00100/00000',
  '↓': '00000/00100/00100/00100/10101/01110/00100',
  '◇': '00100/01010/10001/10001/10001/01010/00100',
  '◆': '00100/01110/11111/11111/11111/01110/00100',
  '✦': '00100/00100/01110/11111/01110/00100/00100',
  '✧': '00100/00100/01010/10001/01010/00100/00100',
  '⟡': '00100/01010/10001/10101/10001/01010/00100',
};

const aligned = (bytes) => Buffer.concat([bytes, Buffer.alloc((4 - bytes.length % 4) % 4)]);
const sum = (bytes) => {
  const padded = aligned(bytes);
  let result = 0;
  for (let at = 0; at < padded.length; at += 4) result = (result + padded.readUInt32BE(at)) >>> 0;
  return result;
};
const uint16 = (values) => {
  const bytes = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => bytes.writeUInt16BE(value & 0xffff, index * 2));
  return bytes;
};
const int16 = (values) => {
  const bytes = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => bytes.writeInt16BE(value, index * 2));
  return bytes;
};

function outline(pattern) {
  const points = [];
  const ends = [];
  for (const [row, pixels] of pattern.split('/').entries()) {
    for (const run of pixels.matchAll(/1+/g)) {
      const left = run.index * 100;
      const right = (run.index + run[0].length) * 100;
      const top = 700 - row * 100;
      const bottom = top - 100;
      points.push([left, bottom], [left, top], [right, top], [right, bottom]);
      ends.push(points.length - 1);
    }
  }
  const header = Buffer.alloc(10);
  header.writeInt16BE(ends.length);
  if (points.length) {
    header.writeInt16BE(Math.min(...points.map(([x]) => x)), 2);
    header.writeInt16BE(Math.min(...points.map(([, y]) => y)), 4);
    header.writeInt16BE(Math.max(...points.map(([x]) => x)), 6);
    header.writeInt16BE(Math.max(...points.map(([, y]) => y)), 8);
  }
  const x = points.map(([value], i) => value - (points[i - 1]?.[0] ?? 0));
  const y = points.map(([, value], i) => value - (points[i - 1]?.[1] ?? 0));
  return { bytes: aligned(Buffer.concat([header, uint16(ends), uint16([0]), Buffer.alloc(points.length, 1), int16(x), int16(y)])), points: points.length, contours: ends.length };
}

export function createPixelFont() {
  const characters = Object.keys(shapes).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
  const glyphs = [outline(shapes['?']), ...characters.map((character) => outline(shapes[character]))];
  const tables = {};
  const offsets = [0];
  for (const glyph of glyphs) offsets.push(offsets.at(-1) + glyph.bytes.length);
  tables.glyf = Buffer.concat(glyphs.map((glyph) => glyph.bytes));
  tables.loca = Buffer.alloc(offsets.length * 4);
  offsets.forEach((offset, i) => tables.loca.writeUInt32BE(offset, i * 4));
  tables.hmtx = Buffer.concat(glyphs.map((glyph) => uint16([600, glyph.bytes.readInt16BE(2)])));

  const head = Buffer.alloc(54);
  head.writeUInt32BE(0x00010000);
  head.writeUInt32BE(0x00010000, 4);
  head.writeUInt32BE(0x5f0f3cf5, 12);
  head.writeUInt16BE(3, 16);
  head.writeUInt16BE(800, 18);
  // A fixed authoring date makes regeneration byte-for-byte reproducible.
  const date = BigInt(Date.UTC(2026, 9, 13) / 1000 + 2082844800);
  head.writeBigUInt64BE(date, 20);
  head.writeBigUInt64BE(date, 28);
  head.writeInt16BE(-100, 38);
  head.writeInt16BE(500, 40);
  head.writeInt16BE(700, 42);
  head.writeUInt16BE(8, 46);
  head.writeInt16BE(2, 48);
  head.writeInt16BE(1, 50);
  tables.head = head;

  const hhea = Buffer.alloc(36);
  hhea.writeUInt32BE(0x00010000);
  hhea.writeInt16BE(700, 4);
  hhea.writeInt16BE(-100, 6);
  hhea.writeUInt16BE(600, 10);
  hhea.writeInt16BE(100, 14);
  hhea.writeInt16BE(500, 16);
  hhea.writeInt16BE(1, 18);
  hhea.writeUInt16BE(glyphs.length, 34);
  tables.hhea = hhea;
  const maxp = Buffer.alloc(32);
  maxp.writeUInt32BE(0x00010000);
  maxp.writeUInt16BE(glyphs.length, 4);
  maxp.writeUInt16BE(Math.max(...glyphs.map((glyph) => glyph.points)), 6);
  maxp.writeUInt16BE(Math.max(...glyphs.map((glyph) => glyph.contours)), 8);
  maxp.writeUInt16BE(2, 14);
  tables.maxp = maxp;

  const codes = characters.map((character) => character.codePointAt(0));
  const segments = codes.length + 1;
  const power = 2 ** Math.floor(Math.log2(segments));
  const cmap = Buffer.concat([
    uint16([0, 1, 3, 1]), Buffer.from([0, 0, 0, 12]),
    uint16([4, 16 + segments * 8, 0, segments * 2, power * 2, Math.log2(power), segments * 2 - power * 2]),
    uint16([...codes, 0xffff, 0]), uint16([...codes, 0xffff]),
    uint16([...codes.map((code, i) => i + 1 - code), 1]), uint16(Array(segments).fill(0)),
  ]);
  tables.cmap = cmap;

  const names = [
    [0, 'Original Emberwake bitmap type. Copyright 2026 Emberwake contributors. MIT license.'],
    [1, 'Emberwake Pixel'], [2, 'Regular'], [3, 'Emberwake-Pixel-1.0'],
    [4, 'Emberwake Pixel'], [5, 'Version 1.0'], [6, 'EmberwakePixel'],
  ];
  const strings = [];
  const records = [];
  let stringOffset = 0;
  for (const [id, value] of names) {
    const bytes = uint16([...value].map((character) => character.charCodeAt(0)));
    records.push(uint16([3, 1, 0x0409, id, bytes.length, stringOffset]));
    strings.push(bytes);
    stringOffset += bytes.length;
  }
  tables.name = Buffer.concat([uint16([0, names.length, 6 + names.length * 12]), ...records, ...strings]);
  const os2 = Buffer.alloc(78);
  os2.writeInt16BE(600, 2);
  os2.writeUInt16BE(400, 4);
  os2.writeUInt16BE(5, 6);
  for (const offset of [10, 12, 18, 20]) os2.writeInt16BE(500, offset);
  os2.writeInt16BE(100, 16);
  os2.writeInt16BE(300, 24);
  os2.writeInt16BE(100, 26);
  os2.writeInt16BE(300, 28);
  os2.set([2, 11, 5, 9, 0, 0, 0, 0, 0, 0], 32);
  os2.writeUInt32BE(3 | (1 << 29), 42);
  os2.writeUInt32BE((1 << 5) | (1 << 14), 46);
  os2.write('EMBR', 58, 'ascii');
  os2.writeUInt16BE(0x0040, 62);
  os2.writeUInt16BE(codes[0], 64);
  os2.writeUInt16BE(codes.at(-1), 66);
  os2.writeInt16BE(700, 68);
  os2.writeInt16BE(-100, 70);
  os2.writeUInt16BE(700, 74);
  os2.writeUInt16BE(100, 76);
  tables['OS/2'] = os2;
  tables.post = Buffer.alloc(32);
  tables.post.writeUInt32BE(0x00030000);
  tables.post.writeInt16BE(-100, 8);
  tables.post.writeInt16BE(100, 10);
  tables.post.writeUInt32BE(1, 12);

  const tags = Object.keys(tables).sort();
  const tablePower = 2 ** Math.floor(Math.log2(tags.length));
  const header = Buffer.concat([Buffer.from([0, 1, 0, 0]), uint16([tags.length, tablePower * 16, Math.log2(tablePower), tags.length * 16 - tablePower * 16])]);
  const directory = Buffer.alloc(tags.length * 16);
  let offset = header.length + directory.length;
  let headOffset;
  tags.forEach((tag, i) => {
    directory.write(tag, i * 16, 'ascii');
    directory.writeUInt32BE(sum(tables[tag]), i * 16 + 4);
    directory.writeUInt32BE(offset, i * 16 + 8);
    directory.writeUInt32BE(tables[tag].length, i * 16 + 12);
    if (tag === 'head') headOffset = offset;
    offset += aligned(tables[tag]).length;
  });
  const font = Buffer.concat([header, directory, ...tags.map((tag) => aligned(tables[tag]))]);
  font.writeUInt32BE((0xb1b0afba - sum(font)) >>> 0, headOffset + 8);
  return font;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const font = createPixelFont();
  await writeFile(new URL('../src/assets/emberwake-pixel.ttf', import.meta.url), font);
  console.log(`Authored Emberwake Pixel: ${font.length} bytes.`);
}
