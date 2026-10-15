// Original 12×12 pixel icons shared by menu SVGs and ground-item Canvas art.
const shapes = {
  blade: [
    '........HH..', '.......HBL..', '......HBL...', '.....HBL....',
    '....HBL.....', '...HBL......', '..AHB.......', '..AA........',
    '.A.AA.......', '..G.AA......', '.G..........', 'D...........',
  ],
  quick: [
    '.........H..', '........HB..', '..A....HBL..', '...A..HBL...',
    '.....HBL....', '....HBL..A..', '...HB.....A.', '..AAB.......',
    '...AA.......', '..G.AA......', '.G..........', 'D...........',
  ],
  flame: [
    '........A...', '.......AHH..', '......AHBL..', '.....AHBL...',
    '..A..HBL.A..', '...AHBL.A...', '...HBL......', '..AAB.......',
    '.A.AA.......', '..G.AA......', '.G..........', 'D...........',
  ],
  coat: [
    '...G..G.....', '..GBLLBG....', '.GBBLLBBG...', 'GBBBLLBBBG..',
    'GDBBLLBBDG..', '..BBLLBB....', '..BBALBB....', '..BBLLBB....',
    '..BBALBB....', '..BBLLBB....', '..DDDDDD....', '............',
  ],
  mail: [
    '...G..G.....', '.GGBLLBGG...', 'GHBBLLBBHG..', 'GBHBLLBHBG..',
    'GDBHLLHBDG..', '..BHLBHB....', '..HBLBHB....', '..BHBLHB....',
    '..HBBLHB....', '..BBABBB....', '..GDDDDG....', '............',
  ],
  warden: [
    '.A.G..G.A...', '.GGBLLBGG...', 'GHBBLLBBHG..', 'GHHBLLBHHG..',
    'GDBHAAHBDG..', '..BHAAHB....', '..HBLLBH....', '..BHLLHB....',
    '..HBLLBH....', '..BBAABB....', '..GDDDDG....', '............',
  ],
  stone: [
    '............', '.....AA.....', '....AGGA....', '....G..G....',
    '...GHHBBG...', '..GHHBLLBG..', '..GHBBLLBG..', '..GBBHLBBG..',
    '...GBHBBG...', '....GBBG....', '.....GG.....', '............',
  ],
  seed: [
    '............', '......GG....', '....GGBG....', '....GBG.....',
    '...GHHBG....', '..GHHBBBG...', '..GHBBLBG...', '..GBBBLBG...',
    '...GBLBG....', '....GGG.....', '............', '............',
  ],
  ring: [
    '............', '.....HH.....', '....HBBH....', '....HLAH....',
    '...AGGGA....', '..AB...BA...', '..AB...BA...', '..AB...BA...',
    '...AB.BA....', '....AAA.....', '............', '............',
  ],
  phoenix: [
    '..A.....A...', '...A.H.A....', '....HBBH....', '..A.HLAH.A..',
    '...AGGGA....', '..AB...BA...', '..AB...BA...', '..AB...BA...',
    '...AB.BA....', '....AAA.....', '............', '............',
  ],
  flask: [
    '....AAAA....', '.....GG.....', '....HBBG....', '....HBBG....',
    '...HBBBBG...', '..HBBBBBBG..', '..HBLLLBBG..', '..HBLLLBBG..',
    '..HBBLLBBG..', '...GDBBDG...', '....GGGG....', '............',
  ],
  meal: [
    '....H..H....', '.....H..H...', '............', '....AAAA....',
    '...ABBBA....', '..ABLBLBA...', '.GAAAAAAAAG.', '..GHHBBBG...',
    '...GBBBG....', '....GGG.....', '............', '............',
  ],
};
const metal = { H: '#f4ebce', B: '#9eacac', L: '#586e79', A: '#d7ac67', G: '#463c35', D: '#9e7856' };
const icon = (shape, colors = {}) => {
  const rows = Object.freeze(shapes[shape]);
  const palette = Object.freeze({ ...metal, ...colors });
  const pixels = Object.freeze(rows.flatMap((row, y) => [...row].flatMap((cell, x) => cell === '.' ? [] : [Object.freeze({ x, y, color: palette[cell] })])));
  return Object.freeze({ rows, colors: palette, pixels });
};
export const ITEM_ICONS = Object.freeze({
  'iron-edge': icon('blade'),
  'quick-edge': icon('quick', { B: '#a6c9ba', L: '#548d88' }),
  'ash-coat': icon('coat', { B: '#aa987b', L: '#685e56', H: '#dfc8a5' }),
  'iron-coat': icon('coat'),
  'step-stone': icon('stone', { B: '#8bbaa6', L: '#537e77' }),
  'red-seed': icon('seed', { B: '#c96963', L: '#863f52', H: '#f7b084', G: '#495c48' }),
  'ember-edge': icon('flame', { B: '#efaf71', L: '#c46d57', A: '#f2ce80' }),
  'swift-edge': icon('quick', { B: '#8dc8ef', L: '#587da9', A: '#91dfda' }),
  'kiln-mail': icon('mail', { B: '#809ead', L: '#46637c', A: '#efa76c' }),
  'bloom-ring': icon('ring', { B: '#94d5ab', L: '#558c83', A: '#d7bd76' }),
  'sun-edge': icon('flame', { B: '#ffe5a1', L: '#d7a955', A: '#fff1c4' }),
  'warden-mail': icon('warden', { B: '#ac9ac1', L: '#706181', A: '#e4c57c' }),
  'phoenix-ring': icon('phoenix', { B: '#ebac7d', L: '#b95c6c', A: '#f1d387' }),
  flask: icon('flask', { B: '#80bea9', L: '#478d90', A: '#c5a375' }),
  heal: icon('meal', { B: '#c69363', L: '#8c624e', A: '#e6ba7b' }),
});
const emptyIcons = Object.freeze(Object.fromEntries(['blade', 'armor', 'charm'].map((slot, i) => [slot, icon(['blade', 'coat', 'ring'][i], { H: '#809889', B: '#607c70', L: '#425e57', A: '#809889', G: '#425e57', D: '#607c70' })])));

export function itemIconPixels(id, slot) {
  return (ITEM_ICONS[id] ?? emptyIcons[slot])?.pixels ?? [];
}

export function itemIconSvg(id, slot) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${itemIconPixels(id, slot).map(({ x, y, color }) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`).join('')}</svg>`;
}
