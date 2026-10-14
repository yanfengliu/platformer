const WIDTH = 640;
const HEIGHT = 360;
const TAU = Math.PI * 2;
const MAX_PARTICLES = 230;
const MAX_LABELS = 24;

const THEMES = [
  { sky: '#090f20', far: '#142337', middle: '#1d3542', wall: '#182e37', stone: '#263e46', top: '#4c7776', glow: '#62e6c2', shadow: '#111d29' },
  { sky: '#100e23', far: '#251c38', middle: '#352b43', wall: '#272938', stone: '#38404a', top: '#708178', glow: '#b0efbe', shadow: '#1c1c2d' },
  { sky: '#120e20', far: '#291e33', middle: '#3e293c', wall: '#332936', stone: '#49404a', top: '#997d73', glow: '#7de6db', shadow: '#241a2a' },
];

const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '101111111111101', O: '010101101101010', P: '110101110100100',
  Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', '0': '111101101101111', '1': '010110010010111',
  '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '5': '111100110001110',
  '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  '+': '000010111010000', '-': '000000111000000', ':': '000010000010000', '!': '010010010000010',
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function hash(x, y = 0, seed = 0) {
  let value = Math.imul((x | 0) ^ (seed | 0), 374761393) ^ Math.imul(y | 0, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}
function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
}
function polygon(ctx, color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => { if (i) ctx.lineTo(Math.round(x), Math.round(y)); else ctx.moveTo(Math.round(x), Math.round(y)); });
  ctx.closePath();
  ctx.fill();
}
function pixelText(ctx, text, x, y, color = '#d8f4e8', scale = 1, centered = false) {
  const value = String(text).toUpperCase();
  let px = Math.round(x - (centered ? (value.length * 4 - 1) * scale / 2 : 0));
  const py = Math.round(y);
  ctx.fillStyle = color;
  for (const character of value) {
    const glyph = FONT[character];
    if (glyph) for (let i = 0; i < 15; i++) if (glyph[i] === '1') ctx.fillRect(px + (i % 3) * scale, py + Math.floor(i / 3) * scale, scale, scale);
    px += 4 * scale;
  }
}
function glow(ctx, x, y, radius, color, strength = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 5; i > 0; i--) {
    const size = radius * i / 5;
    ctx.globalAlpha = strength * (i === 1 ? 0.12 : 0.035);
    polygon(ctx, color, [[x - size, y - size * .38], [x - size * .55, y - size * .85], [x + size * .55, y - size * .85], [x + size, y - size * .38], [x + size, y + size * .38], [x + size * .55, y + size * .85], [x - size * .55, y + size * .85], [x - size, y + size * .38]]);
  }
  ctx.restore();
}
function arch(ctx, x, y, w, h, color, thickness = 5) {
  const shoulder = y + w * .32;
  polygon(ctx, color, [[x, y + h], [x, shoulder], [x + w * .12, y + w * .16], [x + w * .35, y + w * .045], [x + w * .5, y - w * .05], [x + w * .65, y + w * .045], [x + w * .88, y + w * .16], [x + w, shoulder], [x + w, y + h], [x + w - thickness, y + h], [x + w - thickness, shoulder + 2], [x + w * .84, y + w * .2], [x + w * .64, y + w * .08], [x + w * .5, y + thickness], [x + w * .36, y + w * .08], [x + w * .16, y + w * .2], [x + thickness, shoulder + 2], [x + thickness, y + h]]);
}

function drawVine(ctx, x, y, length, seed, foreground = false) {
  const stem = foreground ? '#0d2528' : '#254b40';
  for (let j = 0; j < length; j += 5) {
    const shift = Math.round(Math.sin(j / 17 + seed) * 3);
    rect(ctx, stem, x + shift, y + j, 1, 6);
    if ((j / 5) % 2 === 0) {
      const side = hash(j, seed) > .5 ? 1 : -1;
      polygon(ctx, foreground ? '#183d34' : '#366451', [[x + shift, y + j + 3], [x + shift + side * 6, y + j], [x + shift + side * 4, y + j + 5]]);
      rect(ctx, foreground ? '#214b3d' : '#426d58', x + shift + side * 3, y + j + 2, 2, 1);
    }
  }
}

function drawChain(ctx, x, y, length, seed = 0) {
  for (let j = 0; j < length; j += 6) {
    const offset = j % 12 === 0 ? 0 : 1;
    rect(ctx, '#101f29', x - 1 + offset, y + j, 3, 5);
    rect(ctx, '#51626a', x + offset, y + j, 2, 4);
    rect(ctx, '#243c45', x + offset, y + j + 1, 1, 2);
  }
  if (seed % 3 === 0) {
    polygon(ctx, '#172731', [[x - 7, y + length], [x - 5, y + length - 5], [x + 5, y + length - 5], [x + 7, y + length], [x + 4, y + length + 10], [x - 4, y + length + 10]]);
    rect(ctx, '#4b6265', x - 5, y + length - 3, 10, 2);
    for (let j = -3; j <= 3; j += 3) rect(ctx, '#657571', x + j, y + length, 1, 8);
  }
}

function drawTorch(ctx, x, y, time, seed, small = false) {
  const flame = Math.floor(time * 9 + seed) % 3;
  glow(ctx, x, y - 7, small ? 28 : 45, '#ed8d43', .7);
  rect(ctx, '#0b1721', x - 4, y + 1, 8, 10);
  rect(ctx, '#8c6550', x - 3, y, 6, 3);
  rect(ctx, '#4b4239', x - 2, y + 3, 4, 7);
  polygon(ctx, '#b74632', [[x - 3, y], [x - 5, y - 6], [x - 2, y - 10 - flame], [x - 1, y - 17 + flame], [x + 2, y - 12], [x + 5, y - 6], [x + 3, y]]);
  polygon(ctx, '#f19642', [[x - 2, y - 1], [x - 3, y - 6], [x + 1, y - 12 - flame], [x + 3, y - 5], [x + 2, y - 1]]);
  rect(ctx, '#ffe4a0', x - 1, y - 6, 2, 5);
  rect(ctx, '#dc8d56', x + 5 - flame * 3, y - 19, 1, 2);
}

function drawBackdrop(ctx, game, camera, theme, time) {
  rect(ctx, theme.sky, 0, 0, WIDTH, HEIGHT);
  const upper = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  upper.addColorStop(0, '#0b1021');
  upper.addColorStop(.5, theme.sky);
  upper.addColorStop(1, theme.middle);
  ctx.fillStyle = upper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const farX = camera.x * .15;
  const farY = camera.y * .13;
  const moonX = 468 - camera.x * .028;
  glow(ctx, moonX, 54 - farY, 70, theme.glow, .75);
  polygon(ctx, '#3f6769', [[moonX - 17, 39 - farY], [moonX - 11, 27 - farY], [moonX + 10, 27 - farY], [moonX + 19, 36 - farY], [moonX + 18, 56 - farY], [moonX + 8, 65 - farY], [moonX - 9, 65 - farY], [moonX - 18, 56 - farY]]);
  polygon(ctx, '#152c3b', [[moonX - 1, 27 - farY], [moonX + 14, 29 - farY], [moonX + 19, 36 - farY], [moonX + 18, 56 - farY], [moonX + 8, 65 - farY], [moonX + 1, 62 - farY], [moonX + 7, 53 - farY], [moonX + 8, 40 - farY]]);
  for (let i = -1; i < 10; i++) {
    const index = Math.floor(farX / 104) + i;
    const x = index * 104 - farX;
    const height = 76 + hash(index, 4, game.seed) * 77;
    const top = 222 - height - farY;
    polygon(ctx, theme.far, [[x - 12, 300], [x - 12, top + 19], [x + 11, top + 19], [x + 11, top], [x + 25, top - 20], [x + 39, top], [x + 39, top + 32], [x + 66, top + 32], [x + 66, top + 15], [x + 85, top - 11], [x + 98, top + 15], [x + 98, 300]]);
    rect(ctx, '#25434b', x + 22, top + 22, 4, 22);
    rect(ctx, '#25434b', x + 78, top + 36, 3, 17);
    rect(ctx, '#304e51', x + 24, top - 25, 2, 10);
  }
  const midX = camera.x * .37;
  const midY = camera.y * .26;
  for (let i = -1; i < 7; i++) {
    const index = Math.floor(midX / 154) + i;
    const x = index * 154 - midX;
    const top = 93 + hash(index, 9, game.seed) * 20 - midY;
    rect(ctx, '#152735', x + 14, top + 5, 24, HEIGHT - top);
    rect(ctx, theme.middle, x + 15, top + 5, 5, HEIGHT - top);
    rect(ctx, '#25434a', x + 20, top + 7, 2, HEIGHT - top);
    arch(ctx, x + 36, top + 1, 106, 270, '#203b45', 9);
    arch(ctx, x + 43, top + 8, 92, 259, '#102632', 2);
    rect(ctx, '#344f52', x + 13, top + 41, 26, 4);
    rect(ctx, '#344f52', x + 13, top + 122, 26, 3);
    rect(ctx, '#203740', x + 58, top + 59, 37, 109);
    arch(ctx, x + 60, top + 52, 33, 109, '#3a5b58', 3);
    rect(ctx, '#326667', x + 67, top + 68, 16, 73);
    rect(ctx, '#305153', x + 70, top + 62, 11, 82);
    rect(ctx, '#598a78', x + 73, top + 69, 3, 67);
    rect(ctx, '#142c36', x + 64, top + 101, 23, 3);
    rect(ctx, '#142c36', x + 76, top + 70, 2, 74);
    if (index % 3 === 0) drawVine(ctx, x + 35, top + 36, 142, index);
    if (index % 2 === 0) drawChain(ctx, x + 116, top + 60, 83, index);
  }
  ctx.save();
  ctx.globalAlpha = .075;
  polygon(ctx, theme.glow, [[110 - camera.x * .1, 0], [145 - camera.x * .1, 0], [338 - camera.x * .1, HEIGHT], [235 - camera.x * .1, HEIGHT]]);
  polygon(ctx, theme.glow, [[510 - camera.x * .1, 0], [530 - camera.x * .1, 0], [624 - camera.x * .1, HEIGHT], [547 - camera.x * .1, HEIGHT]]);
  ctx.restore();
}

function drawRoom(ctx, room, camera, theme, seed, time, ground) {
  const x = room.x - camera.x;
  const bottom = ground - camera.y;
  const relic = room.kind === 'relic';
  const boss = room.kind === 'boss' || room.kind === 'exit';
  const columnWidth = boss ? 25 : 18;
  const ceiling = bottom - (boss ? 295 : 236);
  const count = Math.max(2, Math.floor(room.w / 144));
  for (let i = 0; i < count; i++) {
    const bx = x + 44 + i * (room.w - 88) / count;
    const width = (room.w - 88) / count - columnWidth;
    arch(ctx, bx + columnWidth, ceiling + 14, width, bottom - ceiling - 15, theme.wall, 7);
    arch(ctx, bx + columnWidth + 7, ceiling + 21, width - 14, bottom - ceiling - 22, '#29454a', 1);
    rect(ctx, '#152b34', bx, ceiling + 19, columnWidth, bottom - ceiling);
    rect(ctx, '#2c474b', bx + 3, ceiling + 20, 3, bottom - ceiling - 20);
    rect(ctx, '#314e50', bx - 3, ceiling + 33, columnWidth + 6, 5);
    rect(ctx, '#0e2430', bx - 3, bottom - 13, columnWidth + 6, 13);
    rect(ctx, '#355256', bx - 2, bottom - 13, columnWidth + 4, 3);
    for (let k = 56; k < bottom - ceiling - 22; k += 35) {
      rect(ctx, '#0e2630', bx, ceiling + k, columnWidth, 1);
      rect(ctx, '#365156', bx + 4, ceiling + k + 1, 5, 1);
    }
    const windowX = bx + columnWidth + width * .35;
    if (relic || i % 3 === 1) {
      const windowWidth = relic ? 32 : 23;
      const windowY = ceiling + 55;
      polygon(ctx, '#0a1a26', [[windowX, windowY + 68], [windowX, windowY + 17], [windowX + windowWidth / 2, windowY], [windowX + windowWidth, windowY + 17], [windowX + windowWidth, windowY + 68]]);
      polygon(ctx, '#30615d', [[windowX + 3, windowY + 65], [windowX + 3, windowY + 20], [windowX + windowWidth / 2, windowY + 5], [windowX + windowWidth - 3, windowY + 20], [windowX + windowWidth - 3, windowY + 65]]);
      rect(ctx, '#5b9a83', windowX + 7, windowY + 24, 3, 33);
      rect(ctx, '#4e8c7e', windowX + windowWidth - 10, windowY + 19, 3, 39);
      rect(ctx, '#152a34', windowX + windowWidth / 2 - 1, windowY + 5, 2, 62);
      rect(ctx, '#152a34', windowX + 1, windowY + 42, windowWidth - 2, 2);
      glow(ctx, windowX + windowWidth / 2, windowY + 37, 46, theme.glow, .45);
    } else {
      for (let k = 0; k < 5; k++) rect(ctx, '#142833', bx + columnWidth + 22 + k * 7, ceiling + 92, 2, 51);
      rect(ctx, '#31484d', bx + columnWidth + 18, ceiling + 90, 38, 3);
      rect(ctx, '#223a43', bx + columnWidth + 18, ceiling + 143, 38, 3);
    }
    if (i % 2 === 0) drawTorch(ctx, bx + columnWidth / 2, bottom - 88, time, seed + i);
    if (hash(i, room.index, seed) > .42) drawVine(ctx, bx + columnWidth - 2, ceiling + 46, 79 + hash(i, 4, seed) * 73, i + seed);
    if (i % 3 === 2) drawChain(ctx, bx + columnWidth + width * .71, ceiling + 37, 73, i);
  }
  if (relic) {
    const center = x + room.w * .5;
    glow(ctx, center, bottom - 47, 94, theme.glow, 1);
    polygon(ctx, '#244743', [[center - 61, bottom], [center - 49, bottom - 14], [center + 49, bottom - 14], [center + 61, bottom]]);
    rect(ctx, '#486f61', center - 44, bottom - 18, 88, 4);
    for (let i = -2; i <= 2; i++) {
      rect(ctx, '#395a51', center + i * 14 - 3, bottom - 34, 6, 15);
      rect(ctx, '#77b592', center + i * 14 - 1, bottom - 38, 2, 6);
    }
  }
}

function drawPlatform(ctx, platform, camera, theme, seed) {
  const x = Math.round(platform.x - camera.x);
  const y = Math.round(platform.y - camera.y);
  const width = platform.w;
  const height = Math.min(platform.h, HEIGHT - y + 6);
  const start = Math.max(0, Math.floor(-x / 24) * 24);
  const end = Math.min(width, WIDTH - x + 24);
  if (platform.oneWay) {
    rect(ctx, '#102029', x, y + 2, width, Math.min(height + 5, 13));
    rect(ctx, '#75664f', x, y, width, 3);
    rect(ctx, '#a39b70', x, y, width, 1);
    for (let i = start; i < end; i += 12) {
      rect(ctx, '#403f36', x + i + 9, y + 1, 2, 6);
      rect(ctx, '#8e7958', x + i + 2, y + 3, 7, 1);
    }
    for (let i = 12; i < width; i += 48) {
      if (x + i < -10 || x + i > WIDTH + 10) continue;
      polygon(ctx, '#31433f', [[x + i, y + 7], [x + i + 20, y + 7], [x + i + 3, y + 21]]);
      rect(ctx, '#59614d', x + i + 2, y + 7, 2, 11);
    }
    return;
  }
  rect(ctx, theme.shadow, x, y, width, height + 8);
  for (let row = 0; row < Math.ceil(height / 12); row++) {
    const offset = row % 2 ? 12 : 0;
    for (let i = start - 24; i < end; i += 24) {
      const bx = x + i + offset;
      const bw = Math.min(23, x + width - bx);
      if (bx < x || bw < 1) continue;
      const noise = hash(platform.x + i, row, seed);
      const color = noise > .76 ? '#354c50' : noise > .38 ? theme.stone : '#22353f';
      rect(ctx, color, bx, y + row * 12 + 3, bw, 10);
      rect(ctx, '#142831', bx, y + row * 12 + 11, bw, 2);
      if (noise > .25) rect(ctx, '#3d5557', bx + 3, y + row * 12 + 4, Math.min(bw - 4, 8 + noise * 11), 1);
      if (noise > .8) {
        rect(ctx, '#142b35', bx + 14, y + row * 12 + 5, 1, 4);
        rect(ctx, '#142b35', bx + 12, y + row * 12 + 9, 3, 1);
      }
    }
  }
  rect(ctx, theme.top, x, y, width, 2);
  rect(ctx, '#162d35', x, y + 2, width, 2);
  for (let i = start; i < end; i += 7) {
    const noise = hash(platform.x + i, platform.y, seed);
    if (noise > .43) rect(ctx, '#4c6e52', x + i, y - 2, 3 + noise * 4, 2);
    if (noise > .8) {
      rect(ctx, '#79936c', x + i + 2, y - 4, 1, 3);
      rect(ctx, '#375445', x + i + 5, y + 3, 1, 4 + noise * 5);
    }
  }
  if (platform.y < 390 && width < 420) {
    polygon(ctx, '#152a33', [[x + 5, y + height], [x + 13, y + height + 6], [x + width - 14, y + height + 6], [x + width - 4, y + height]]);
    for (let i = 15; i < width - 12; i += 53) if (hash(i, platform.x, seed) > .5) drawVine(ctx, x + i, y + height - 2, 22 + hash(i, 6, seed) * 23, i);
  }
}

function drawRubble(ctx, camera, theme, seed, ground) {
  const start = Math.floor(camera.x / 62) - 1;
  for (let i = start; i < start + 13; i++) {
    const x = i * 62 + hash(i, 2, seed) * 31 - camera.x;
    const y = ground - camera.y;
    const variant = Math.floor(hash(i, 8, seed) * 5);
    if (variant === 0) {
      rect(ctx, '#182a34', x, y - 12, 17, 12);
      rect(ctx, '#46635c', x + 2, y - 13, 14, 3);
      rect(ctx, '#243e41', x + 4, y - 9, 3, 7);
      rect(ctx, '#0d2230', x + 15, y - 7, 5, 7);
    } else if (variant === 1) {
      polygon(ctx, '#223638', [[x, y], [x + 4, y - 7], [x + 14, y - 9], [x + 19, y - 2], [x + 25, y]]);
      rect(ctx, '#42605a', x + 5, y - 7, 8, 2);
      rect(ctx, '#152c32', x + 7, y - 4, 2, 3);
    } else if (variant === 2) {
      rect(ctx, '#b1b59a', x + 2, y - 5, 6, 4);
      rect(ctx, '#364641', x + 3, y - 4, 1, 1);
      rect(ctx, '#364641', x + 6, y - 4, 1, 1);
      rect(ctx, '#697665', x, y - 1, 13, 1);
    } else if (variant === 3) {
      for (let j = 0; j < 5; j++) {
        const bx = x + j * 3;
        rect(ctx, '#365448', bx, y - 4 - j % 3 * 2, 1, 5 + j % 3 * 2);
        rect(ctx, '#5b7860', bx + 1, y - 4 - j % 3 * 2, 3, 1);
      }
    } else {
      rect(ctx, '#142630', x, y - 3, 16, 3);
      rect(ctx, theme.stone, x + 2, y - 4, 8, 2);
    }
  }
}

function attackProgress(entity) {
  return clamp(1 - (entity.attackTime || 0) / (entity.attackDuration || .3), 0, 1);
}

// Poses are [hand x, hand y, weapon angle] in the facing-right actor frame.
// The clocks belong to the simulation, so impact freeze and reduced motion keep
// the essential action intact. Rounding happens only when drawing the pixels.
function poseBetween(a, b, amount) {
  const t = clamp(amount, 0, 1);
  const eased = t * t * (3 - 2 * t);
  return a.map((value, i) => {
    const delta = b[i] - value;
    return value + (i === 2 ? Math.atan2(Math.sin(delta), Math.cos(delta)) : delta) * eased;
  });
}
function poseAlong(progress, keys) {
  for (let i = 1; i < keys.length; i++) {
    if (progress <= keys[i][0]) return poseBetween(keys[i - 1][1], keys[i][1], (progress - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
  }
  return keys.at(-1)[1];
}
function heroWeaponPose(player) {
  const idle = [8, -18, 1.2];
  if (!(player.attackTime > 0)) return idle;
  const keys = player.combo === 2
    ? [[0, idle], [.12, [7, -14, 1.2]], [.3, [14, -18, .35]], [.58, [12, -28, -1.4]], [.78, [8, -27, -2]], [1, idle]]
    : player.combo === 3
      ? [[0, idle], [.12, [1, -31, -2.1]], [.3, [12, -30, -.8]], [.58, [15, -13, 1.2]], [.78, [11, -15, 1.55]], [1, idle]]
      : [[0, idle], [.12, [5, -28, -2.15]], [.3, [14, -23, -.8]], [.58, [13, -19, .65]], [.78, [11, -18, 1.45]], [1, idle]];
  return poseAlong(attackProgress(player), keys);
}
function windupProgress(enemy) {
  // Matches the authored simulation telegraph, including the Warden's fast phase.
  const duration = { walker: .5, archer: .72, brute: .8, boss: .88 }[enemy.type] || .5;
  const phaseSpeed = enemy.type === 'boss' && enemy.hp < enemy.maxHp / 2 ? .78 : 1;
  return clamp(1 - (enemy.windup || 0) / (duration * phaseSpeed), 0, 1);
}
function enemyWeaponPose(enemy) {
  const idle = { walker: [12, -17, -1.2], brute: [21, -23, -Math.PI / 2], boss: [29, -38, -Math.PI / 2], archer: [12, -21, 0] }[enemy.type];
  const ready = enemy.type === 'boss' && enemy.attackKind === 'volley'
    ? [25, -50, -.9]
    : { walker: [4, -27, -2.45], brute: [5, -42, -2.5], boss: [10, -58, -2.4], archer: [18, -22, -.05] }[enemy.type];
  if (enemy.state === 'windup') return poseBetween(idle, ready, windupProgress(enemy));
  if (!(enemy.attackTime > 0)) return idle;
  const progress = attackProgress(enemy);
  if (enemy.type === 'archer') return poseAlong(progress, [[0, [18, -22, -.05]], [.3, [11, -20, .35]], [.58, [19, -20, 0]], [1, idle]]);
  if (enemy.attackKind === 'volley') return poseAlong(progress, [[0, ready], [.2, [35, -43, -.55]], [.58, [31, -43, -.7]], [1, idle]]);
  const contact = { walker: [11, -25, -1.2], brute: [17, -36, -1.2], boss: [29, -49, -1.05] }[enemy.type];
  const follow = { walker: [15, -15, .75], brute: [23, -14, .8], boss: [34, -21, .7] }[enemy.type];
  const returnPose = { walker: [10, -15, 1.15], brute: [19, -16, 1.1], boss: [27, -27, 1] }[enemy.type];
  return poseAlong(progress, [[0, ready], [.22, contact], [.58, follow], [.82, returnPose], [1, idle]]);
}
function weaponPoint(pose, x, y, baseAngle = 0) {
  const angle = pose[2] - baseAngle;
  return [pose[0] + x * Math.cos(angle) - y * Math.sin(angle), pose[1] + x * Math.sin(angle) + y * Math.cos(angle)];
}
function weaponPolygon(ctx, color, pose, points, baseAngle = 0) {
  polygon(ctx, color, points.map(([x, y]) => weaponPoint(pose, x, y, baseAngle)));
}
function weaponRect(ctx, color, pose, x, y, w, h, baseAngle = 0) {
  weaponPolygon(ctx, color, pose, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], baseAngle);
}
function armSegment(ctx, color, start, end, width) {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]) || 1;
  const nx = -(end[1] - start[1]) / length * width / 2;
  const ny = (end[0] - start[0]) / length * width / 2;
  polygon(ctx, color, [[start[0] + nx, start[1] + ny], [end[0] + nx, end[1] + ny], [end[0] - nx, end[1] - ny], [start[0] - nx, start[1] - ny]]);
}
function drawWeaponArm(ctx, pose, shoulder, sleeve, skin, width) {
  const hand = pose.slice(0, 2);
  const elbow = [(shoulder[0] + hand[0]) / 2 - 2, (shoulder[1] + hand[1]) / 2 + 3];
  for (const [start, end] of [[shoulder, elbow], [elbow, hand]]) {
    armSegment(ctx, '#0a1c28', start, end, width + 2);
    armSegment(ctx, sleeve, start, end, width);
  }
  rect(ctx, skin, hand[0] - width / 2, hand[1] - width / 2, width, width);
}

function drawSlash(ctx, entity, pose, enemy = false) {
  const progress = attackProgress(entity);
  const radius = enemy && entity.type === 'boss' ? 49 : enemy && entity.type === 'brute' ? 27 : 22;
  const bladeAngle = pose[2] + (entity.type === 'boss' ? .34 : 0);
  const direction = !enemy && entity.combo === 2 ? -1 : 1;
  const span = .65 + Math.sin(progress * Math.PI) * .65;
  if (progress < .08 || progress > .88) return;
  const outer = [];
  const inner = [];
  for (let i = 0; i <= 8; i++) {
    const angle = bladeAngle - direction * span * (1 - i / 8);
    outer.push([pose[0] + Math.cos(angle) * radius, pose[1] + Math.sin(angle) * radius]);
    inner.unshift([pose[0] + Math.cos(angle) * (radius - 5), pose[1] + Math.sin(angle) * (radius - 5)]);
  }
  ctx.save();
  ctx.globalAlpha = .85 * Math.sin(progress * Math.PI);
  polygon(ctx, enemy ? '#fca372' : '#98fff0', outer.concat(inner));
  polygon(ctx, enemy ? '#f4d6b0' : '#eefff1', outer.slice(2).concat(inner.slice(0, -2)));
  ctx.restore();
  const end = outer[outer.length - 1];
  rect(ctx, enemy ? '#ff9d6a' : '#caffed', end[0] - 2, end[1] - 2, 4, 4);
  // Short radial marks communicate the direction without obscuring the target.
  for (let i = 0; i < 3; i++) {
    const angle = bladeAngle - direction * (span * .75 - i * .25);
    const r = radius + 4 + i * 3;
    rect(ctx, enemy ? '#d58269' : '#72c4b2', pose[0] + Math.cos(angle) * r, pose[1] + Math.sin(angle) * r, 2, 2);
  }
}

function drawHero(ctx, player, time, reducedMotion) {
  const facing = player.facing || 1;
  const speed = Math.abs(player.vx || 0);
  const running = player.grounded && speed > 18;
  const phase = time * (speed > 100 ? 17 : 11);
  const step = running ? Math.sin(phase) : 0;
  const bodyBob = running ? -Math.abs(Math.sin(phase)) * 1.7 : Math.sin(time * 2.2) * .4;
  const attacking = (player.attackTime || 0) > 0;
  const weaponPose = heroWeaponPose(player);
  const airborne = !player.grounded;
  const rolling = (player.rollTime || 0) > 0;
  const flash = (player.hurtTime || 0) > 0 && Math.floor(time * 28) % 2 === 0;
  ctx.save();
  if ((player.invulnerable || 0) > 0 && !rolling && !flash) ctx.globalAlpha = .62 + .25 * Math.sin(time * 35);
  if (rolling) {
    ctx.scale(facing, 1);
    polygon(ctx, '#081925', [[-8, -1], [-12, -8], [-10, -17], [-5, -22], [5, -22], [11, -16], [12, -7], [7, -1]]);
    polygon(ctx, '#315965', [[-8, -7], [-8, -16], [-2, -20], [5, -18], [8, -10], [3, -4], [-4, -3]]);
    rect(ctx, '#d29b64', 3, -17, 5, 4);
    rect(ctx, '#87d6c5', 3, -15, 4, 1);
    polygon(ctx, '#b76547', [[-6, -19], [-15, -19], [-23, -13], [-16, -12], [-11, -17], [-5, -15]]);
    rect(ctx, '#81bdad', -7, -8, 4, 2);
    if (!reducedMotion) for (let i = 1; i < 4; i++) {
      ctx.globalAlpha = .2 / i;
      polygon(ctx, '#77b8b7', [[-12 - i * 7, -17 + i], [-10 - i * 7, -20 + i], [-5 - i * 7, -20 + i], [-2 - i * 7, -17 + i], [-3 - i * 7, -10 + i], [-10 - i * 7, -9 + i]]);
    }
    ctx.restore();
    return;
  }
  ctx.scale(facing, 1);
  ctx.translate(attacking ? Math.round(Math.sin(attackProgress(player) * Math.PI) * 2) : 0, Math.round(bodyBob));
  if (attacking) drawSlash(ctx, player, weaponPose);
  const legA = Math.round(airborne ? -3 : step * 4);
  const legB = Math.round(airborne ? 3 : -step * 4);
  // Boots and bent legs have separate dark outlines and light-facing planes.
  rect(ctx, '#091a26', -7 + legA, -10, 6, 8);
  rect(ctx, '#345059', -6 + legA, -11, 4, 7);
  rect(ctx, '#152a35', -6 + legA, -5, 5, 5);
  rect(ctx, '#98a294', -7 + legA, -2, 7, 2);
  rect(ctx, '#081824', 2 + legB, -10, 6, 9);
  rect(ctx, '#42636a', 3 + legB, -11, 4, 6);
  rect(ctx, '#203b45', 3 + legB, -5, 5, 5);
  rect(ctx, '#c3b398', 2 + legB, -2, 8, 2);
  polygon(ctx, '#0a1b28', [[-8, -27], [5, -27], [9, -17], [6, -10], [-7, -10], [-9, -19]]);
  polygon(ctx, '#315867', [[-6, -25], [4, -26], [7, -18], [4, -11], [-6, -12]]);
  rect(ctx, '#52818a', 1, -24, 3, 10);
  polygon(ctx, '#203e51', [[-7, -23], [-10, -14], [-6, -8], [0, -11], [-2, -22]]);
  rect(ctx, '#be9468', -7, -13, 13, 3);
  rect(ctx, '#e3c793', 2, -13, 3, 3);
  rect(ctx, '#162b37', -7, -26, 4, 11);
  rect(ctx, '#62898a', -7, -25, 3, 4);
  rect(ctx, '#b8b8a0', -6, -17, 3, 3);
  drawWeaponArm(ctx, weaponPose, [5, -22], '#54747a', '#d5be95', 3);
  weaponPolygon(ctx, attacking ? '#ebf8dd' : '#6e9291', weaponPose, [[0, -2], [17, -12], [19, -12], [18, -8], [2, 1]], -.55);
  weaponRect(ctx, '#9cc6ba', weaponPose, 3, -3, 8, 1, -.55);
  weaponRect(ctx, '#ce955e', weaponPose, -2, -2, 2, 7, -.55);
  // A hood, bronze birdlike mask and rust scarf form the original hero silhouette.
  polygon(ctx, '#0a1927', [[-8, -28], [-7, -36], [-2, -39], [5, -37], [8, -32], [6, -25], [-3, -25]]);
  polygon(ctx, '#274b5a', [[-6, -30], [-5, -35], [0, -37], [4, -35], [6, -31], [3, -27], [-3, -27]]);
  rect(ctx, '#416b73', -4, -35, 6, 2);
  polygon(ctx, flash ? '#fff5ce' : '#c5a977', [[0, -33], [6, -32], [10, -29], [6, -26], [0, -27], [-2, -30]]);
  rect(ctx, '#101e26', 2, -31, 5, 2);
  rect(ctx, '#aaffd5', 3, -31, 3, 1);
  rect(ctx, '#edc58c', 6, -28, 3, 1);
  const flutter = Math.round(Math.sin(time * 11) * (running ? 3 : 1));
  polygon(ctx, '#71372d', [[-5, -27], [-13, -27], [-22, -24 + flutter], [-28, -27 + flutter], [-25, -21 + flutter], [-18, -22 + flutter], [-9, -24], [-3, -23]]);
  polygon(ctx, '#bc6946', [[-5, -27], [-14, -26], [-22, -23 + flutter], [-17, -22 + flutter], [-8, -24], [-3, -24]]);
  rect(ctx, '#e59a60', -6, -27, 7, 2);
  if (flash) {
    ctx.globalCompositeOperation = 'screen';
    rect(ctx, '#d7fff3', -6, -26, 10, 14);
  }
  ctx.restore();
}

function drawWalker(ctx, enemy, time, flash) {
  const weaponPose = enemyWeaponPose(enemy);
  if (enemy.attackTime > 0) drawSlash(ctx, enemy, weaponPose, true);
  const walk = enemy.grounded && Math.abs(enemy.vx || 0) > 4 ? Math.round(Math.sin(time * 9 + (enemy.id | 0)) * 3) : 0;
  rect(ctx, '#101623', -8 + walk, -9, 6, 9);
  rect(ctx, '#444f4b', -7 + walk, -9, 3, 6);
  rect(ctx, '#849879', -7 + walk, -2, 7, 2);
  rect(ctx, '#0c1822', 2 - walk, -10, 6, 10);
  rect(ctx, '#6e785f', 3 - walk, -9, 4, 7);
  rect(ctx, '#a8ad89', 3 - walk, -2, 7, 2);
  polygon(ctx, '#1c2e2b', [[-8, -24], [5, -25], [8, -18], [6, -10], [-7, -9], [-10, -17]]);
  rect(ctx, flash ? '#e1ffd6' : '#59735c', -5, -23, 10, 11);
  rect(ctx, '#94ac7c', -4, -23, 2, 10);
  rect(ctx, '#324d42', 0, -21, 3, 8);
  rect(ctx, '#493b31', -7, -13, 15, 3);
  rect(ctx, '#bbc799', 3, -13, 2, 3);
  rect(ctx, '#101c24', -11, -24, 5, 15);
  rect(ctx, '#77906b', -10, -22, 3, 10);
  rect(ctx, '#bcc7a0', -10, -13, 3, 5);
  drawWeaponArm(ctx, weaponPose, [6, -22], '#8a9c76', '#cbd2a5', 4);
  weaponPolygon(ctx, '#a79a77', weaponPose, [[1, -4], [4, -16], [8, -21], [11, -18], [7, -11], [4, 0]], -1.2);
  weaponRect(ctx, '#dbca98', weaponPose, 5, -13, 2, 6, -1.2);
  rect(ctx, '#111e27', -5, -31, 13, 10);
  rect(ctx, flash ? '#e9ffd9' : '#a3b88a', -3, -30, 10, 8);
  rect(ctx, '#526956', -4, -29, 3, 4);
  rect(ctx, '#0a2427', 2, -28, 6, 2);
  rect(ctx, '#e9ef9d', 3, -28, 4, 1);
  rect(ctx, '#162f2c', 1, -24, 2, 2);
  rect(ctx, '#2d4939', 5, -24, 2, 2);
  polygon(ctx, '#456a47', [[-5, -30], [-8, -33], [-3, -31], [-1, -36], [1, -31], [6, -33], [7, -30]]);
}

function drawArcher(ctx, enemy, time, flash) {
  const stride = Math.abs(enemy.vx || 0) > 5 ? Math.round(Math.sin(time * 9 + (enemy.id | 0)) * 2) : 0;
  rect(ctx, '#141626', -7 + stride, -10, 5, 10);
  rect(ctx, '#594a5d', -6 + stride, -10, 3, 7);
  rect(ctx, '#8a7281', -7 + stride, -2, 6, 2);
  rect(ctx, '#231e32', 3 - stride, -10, 5, 10);
  rect(ctx, '#846b78', 3 - stride, -2, 7, 2);
  polygon(ctx, '#141c2b', [[-7, -26], [5, -26], [9, -6], [5, -9], [2, -5], [-2, -9], [-7, -6], [-10, -12]]);
  polygon(ctx, flash ? '#f5e5ff' : '#655971', [[-5, -25], [4, -25], [6, -13], [1, -10], [-6, -13]]);
  rect(ctx, '#947588', -4, -24, 2, 10);
  rect(ctx, '#302738', -6, -14, 13, 3);
  rect(ctx, '#c5b292', 3, -14, 2, 3);
  rect(ctx, '#80647c', -11, -25, 4, 17);
  for (let i = 0; i < 3; i++) {
    rect(ctx, '#ba9c7c', -12 + i * 2, -32 + i % 2, 1, 17);
    rect(ctx, '#b8bec0', -13 + i * 2, -33 + i % 2, 3, 3);
  }
  rect(ctx, '#231e31', -7, -34, 14, 11);
  polygon(ctx, '#4d4a65', [[-6, -29], [-5, -34], [1, -37], [6, -31], [8, -25], [-3, -25]]);
  rect(ctx, '#ada88c', 0, -31, 7, 6);
  rect(ctx, '#232132', 2, -30, 6, 2);
  rect(ctx, '#f2be84', 3, -30, 4, 1);
  rect(ctx, '#ccc4a6', 5, -27, 3, 1);
  const weaponPose = enemyWeaponPose(enemy);
  const nocked = enemy.state === 'windup';
  const pull = nocked ? windupProgress(enemy) : 0;
  const nockX = 1 - pull * 9;
  const stringCenter = weaponPoint(weaponPose, nockX, -1);
  const drawHand = nocked ? stringCenter : poseBetween([8, -23], [-7, -15], attackProgress(enemy));
  if (nocked || enemy.attackTime > 0) {
    armSegment(ctx, '#88727d', [-4, -23], drawHand, 3);
    rect(ctx, '#c5b292', drawHand[0] - 2, drawHand[1] - 1, 3, 3);
  }
  drawWeaponArm(ctx, weaponPose, [5, -23], '#88727d', '#c9b399', 3);
  // Limb flex and the V-shaped string show the draw; the simulation fires on
  // entry to attack, so only windup owns a nocked arrow.
  const flex = pull * 2;
  weaponPolygon(ctx, '#b1986e', weaponPose, [[1 - flex, -13], [6, -8], [8, -1], [6, 6], [1 - flex, 11], [3 - flex, 5], [5, -1], [3 - flex, -7]]);
  const top = weaponPoint(weaponPose, 1 - flex, -12);
  const bottom = weaponPoint(weaponPose, 1 - flex, 10);
  armSegment(ctx, '#918c7b', top, stringCenter, 1);
  armSegment(ctx, '#918c7b', stringCenter, bottom, 1);
  if (nocked) {
    weaponRect(ctx, '#e2d8aa', weaponPose, nockX, -1, 20, 1);
    weaponPolygon(ctx, '#e4eac8', weaponPose, [[nockX + 19, -3], [nockX + 23, -1], [nockX + 19, 1]]);
  }
}

function drawBrute(ctx, enemy, time, flash) {
  const weaponPose = enemyWeaponPose(enemy);
  if (enemy.attackTime > 0) drawSlash(ctx, enemy, weaponPose, true);
  const step = Math.abs(enemy.vx || 0) > 4 ? Math.round(Math.sin(time * 6 + (enemy.id | 0)) * 3) : 0;
  rect(ctx, '#151b27', -12 + step, -12, 10, 12);
  rect(ctx, '#566167', -11 + step, -11, 7, 9);
  rect(ctx, '#8c8c7b', -13 + step, -3, 12, 3);
  rect(ctx, '#1a222c', 5 - step, -12, 10, 12);
  rect(ctx, '#707474', 6 - step, -10, 7, 8);
  rect(ctx, '#ab9e86', 5 - step, -3, 12, 3);
  polygon(ctx, '#17242d', [[-15, -32], [-9, -37], [9, -37], [16, -31], [13, -13], [-12, -13]]);
  polygon(ctx, flash ? '#ffead3' : '#6e7070', [[-11, -33], [8, -34], [12, -29], [9, -15], [-10, -16]]);
  rect(ctx, '#97958b', -9, -31, 5, 13);
  rect(ctx, '#434f59', 1, -31, 7, 12);
  for (let j = 0; j < 3; j++) rect(ctx, '#b8a27d', -6 + j * 7, -30 + j % 2 * 5, 2, 2);
  rect(ctx, '#493d35', -12, -17, 25, 5);
  rect(ctx, '#bb976c', -1, -17, 5, 5);
  polygon(ctx, '#283542', [[-17, -34], [-12, -38], [-6, -35], [-9, -25], [-17, -26], [-20, -29]]);
  rect(ctx, '#a29b82', -16, -35, 7, 3);
  rect(ctx, '#4d5a63', -17, -26, 7, 12);
  rect(ctx, '#948674', -16, -16, 7, 5);
  drawWeaponArm(ctx, weaponPose, [12, -30], '#4e5a62', '#b4a18a', 5);
  weaponRect(ctx, '#69553d', weaponPose, -1, -22, 3, 39, -Math.PI / 2);
  weaponPolygon(ctx, '#596269', weaponPose, [[-4, -23], [7, -27], [13, -23], [13, -13], [7, -9], [-4, -14]], -Math.PI / 2);
  weaponRect(ctx, '#b0a892', weaponPose, -2, -22, 10, 3, -Math.PI / 2);
  weaponRect(ctx, '#85908a', weaponPose, 8, -21, 3, 8, -Math.PI / 2);
  polygon(ctx, '#17252c', [[-8, -39], [-6, -46], [5, -46], [10, -39], [7, -32], [-6, -32]]);
  rect(ctx, '#777e73', -5, -43, 12, 9);
  rect(ctx, '#b0ae8d', -4, -43, 11, 2);
  rect(ctx, '#1d3034', -2, -40, 10, 3);
  rect(ctx, '#f7b56c', 1, -40, 6, 1);
  rect(ctx, '#3e504e', 0, -36, 5, 2);
}

function drawBoss(ctx, enemy, time, flash) {
  const weaponPose = enemyWeaponPose(enemy);
  const breathing = Math.round(Math.sin(time * 2.4));
  const step = Math.abs(enemy.vx || 0) > 4 ? Math.round(Math.sin(time * 5) * 4) : 0;
  polygon(ctx, '#111923', [[-19, -42], [-24, -3], [-15, -7], [-10, -2], [-6, -8], [6, -7], [13, -2], [23, -5], [17, -44]]);
  rect(ctx, '#364954', -15 + step, -17, 12, 16);
  rect(ctx, '#7b837a', -14 + step, -15, 4, 10);
  rect(ctx, '#a4a585', -18 + step, -4, 16, 4);
  rect(ctx, '#35454e', 5 - step, -17, 12, 17);
  rect(ctx, '#8e9180', 6 - step, -15, 5, 11);
  rect(ctx, '#bcc0a0', 4 - step, -4, 17, 4);
  ctx.save();
  ctx.translate(0, breathing);
  if (enemy.attackTime > 0 && enemy.attackKind !== 'volley') drawSlash(ctx, enemy, weaponPose, true);
  polygon(ctx, '#182733', [[-23, -48], [-16, -54], [15, -54], [24, -45], [17, -18], [-17, -18]]);
  polygon(ctx, flash ? '#e6fff0' : '#526d6a', [[-16, -48], [13, -49], [19, -43], [13, -20], [-14, -21]]);
  rect(ctx, '#829b85', -13, -47, 6, 20);
  rect(ctx, '#304a50', 1, -47, 9, 22);
  rect(ctx, '#b2bc9a', -5, -44, 3, 15);
  rect(ctx, '#c1c198', -8, -39, 11, 3);
  polygon(ctx, '#aa9575', [[-4, -32], [-8, -27], [-3, -23], [2, -27]]);
  rect(ctx, '#473b38', -16, -24, 33, 6);
  rect(ctx, '#bfa277', -3, -24, 8, 6);
  polygon(ctx, '#27424b', [[-27, -51], [-18, -56], [-9, -52], [-12, -42], [-24, -41], [-29, -45]]);
  rect(ctx, '#8e9b87', -25, -50, 13, 3);
  rect(ctx, '#4d6b6c', -25, -41, 11, 17);
  rect(ctx, '#b6b79b', -24, -28, 9, 7);
  drawWeaponArm(ctx, weaponPose, [18, -46], '#3d565e', '#a7aa8d', 8);
  weaponRect(ctx, '#8b7650', weaponPose, 1, -25, 4, 56, -Math.PI / 2);
  weaponPolygon(ctx, '#8fada1', weaponPose, [[-1, -27], [5, -39], [16, -46], [23, -38], [17, -23], [6, -14], [-1, -17]], -Math.PI / 2);
  weaponPolygon(ctx, '#c9d4b9', weaponPose, [[4, -31], [15, -41], [21, -38], [14, -26], [5, -20]], -Math.PI / 2);
  weaponRect(ctx, '#5a7f78', weaponPose, 4, -24, 5, 6, -Math.PI / 2);
  polygon(ctx, '#111f2a', [[-11, -57], [-13, -65], [-7, -72], [8, -72], [14, -64], [11, -53], [-7, -53]]);
  polygon(ctx, flash ? '#edffde' : '#92a88e', [[-7, -65], [7, -66], [11, -60], [7, -54], [-6, -55]]);
  rect(ctx, '#243b40', -5, -62, 15, 3);
  rect(ctx, '#a6ffc5', -3, -62, 5, 1);
  rect(ctx, '#a6ffc5', 6, -62, 3, 1);
  rect(ctx, '#426253', -1, -58, 3, 3);
  polygon(ctx, '#c6b987', [[-11, -64], [-13, -80], [-8, -74], [-4, -82], [0, -74], [5, -84], [8, -73], [15, -79], [12, -64], [8, -67], [-7, -67]]);
  rect(ctx, '#81d6b0', -6, -73, 3, 3);
  rect(ctx, '#81d6b0', 5, -75, 3, 3);
  const flutter = Math.round(Math.sin(time * 5) * 3);
  polygon(ctx, '#486454', [[-16, -50], [-26, -45], [-29 - flutter, -18], [-25, -8], [-21 - flutter, -18], [-21, -42]]);
  ctx.restore();
}

function drawTelegraph(ctx, enemy, camera, time, reducedMotion) {
  if (!(enemy.windup > 0) && enemy.state !== 'windup') return;
  const x = enemy.x + enemy.w * .5 - camera.x;
  const y = enemy.y - camera.y - (enemy.type === 'boss' ? 27 : 10);
  const pulse = reducedMotion ? 1 : .7 + Math.sin(time * 28) * .3;
  glow(ctx, x, y, enemy.type === 'boss' ? 32 : 16, '#ff9661', pulse);
  polygon(ctx, '#411f29', [[x, y - 8], [x + 7, y - 1], [x, y + 6], [x - 7, y - 1]]);
  polygon(ctx, '#f8ba7b', [[x, y - 7], [x + 6, y - 1], [x, y + 5], [x - 6, y - 1]]);
  rect(ctx, '#6c302d', x - 1, y - 4, 2, 4);
  rect(ctx, '#6c302d', x - 1, y + 1, 2, 1);
  if ((enemy.type === 'boss' && enemy.attackKind !== 'volley') || enemy.type === 'brute') {
    const attackX = x + (enemy.facing || 1) * (enemy.type === 'boss' ? 36 : 25);
    ctx.save();
    ctx.globalAlpha = .25 + pulse * .2;
    rect(ctx, '#ff8d63', attackX - 25, enemy.y + enemy.h - camera.y - 1, 50, 2);
    for (let i = 0; i < 4; i++) rect(ctx, '#ffb982', attackX - 23 + i * 14, enemy.y + enemy.h - camera.y - 4, 2, 3);
    ctx.restore();
  }
}

function drawEnemy(ctx, enemy, camera, time, reducedMotion) {
  if (enemy.dead || enemy.hp <= 0) return;
  const x = Math.round(enemy.x + enemy.w * .5 - camera.x);
  const y = Math.round(enemy.y + enemy.h - camera.y);
  if (x < -90 || x > WIDTH + 90 || y < -90 || y > HEIGHT + 100) return;
  const flash = (enemy.hurtTime || 0) > 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(enemy.facing || 1, 1);
  if (enemy.type === 'archer') drawArcher(ctx, enemy, time, flash);
  else if (enemy.type === 'brute') drawBrute(ctx, enemy, time, flash);
  else if (enemy.type === 'boss') drawBoss(ctx, enemy, time, flash);
  else drawWalker(ctx, enemy, time, flash);
  ctx.restore();
  drawTelegraph(ctx, enemy, camera, time, reducedMotion);
  if (enemy.hp < enemy.maxHp || enemy.type === 'boss') {
    const width = enemy.type === 'boss' ? 48 : 24;
    const healthY = enemy.y - camera.y - (enemy.type === 'boss' ? 21 : 6);
    rect(ctx, '#081923', x - width / 2 - 1, healthY - 1, width + 2, 5);
    rect(ctx, '#3b3138', x - width / 2, healthY, width, 3);
    rect(ctx, enemy.type === 'boss' ? '#d99975' : '#b2cc9b', x - width / 2, healthY, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 2);
    if (enemy.type === 'boss') pixelText(ctx, 'THE HOLLOW WARDEN', x, healthY - 8, '#d9b7a0', 1, true);
  }
}

function drawPickup(ctx, pickup, camera, time, theme) {
  if (pickup.collected) return;
  const x = Math.round(pickup.x - camera.x);
  const y = Math.round(pickup.y - camera.y + Math.sin(time * 3 + pickup.x) * 2);
  if (x < -35 || x > WIDTH + 35) return;
  if (pickup.type === 'relic') {
    glow(ctx, x, y - 5, 47, theme.glow, .9);
    polygon(ctx, '#143a3b', [[x, y - 20], [x + 12, y - 6], [x, y + 10], [x - 12, y - 6]]);
    polygon(ctx, '#76cba7', [[x, y - 18], [x + 9, y - 6], [x, y + 7], [x - 9, y - 6]]);
    polygon(ctx, '#c7f4cc', [[x, y - 15], [x + 3, y - 6], [x, y + 3], [x - 3, y - 6]]);
    rect(ctx, '#244f46', x - 7, y - 8, 14, 3);
    rect(ctx, '#f3efb3', x - 1, y - 8, 2, 3);
    pixelText(ctx, 'E RELIC', x, y + 16, '#98ceb4', 1, true);
  } else if (pickup.type === 'heal') {
    glow(ctx, x, y, 22, '#ee9c66', .6);
    rect(ctx, '#d3c8a0', x - 2, y - 10, 4, 4);
    polygon(ctx, '#985a4b', [[x - 2, y - 6], [x + 2, y - 6], [x + 5, y - 1], [x + 4, y + 6], [x - 4, y + 6], [x - 5, y - 1]]);
    rect(ctx, '#f1a46c', x - 3, y - 1, 6, 5);
    rect(ctx, '#ffe1a1', x - 2, y - 2, 1, 4);
    rect(ctx, '#fee3ad', x - 2, y + 1, 5, 1);
  } else {
    glow(ctx, x, y, 13, '#f0ce7c', .4);
    polygon(ctx, '#936b43', [[x - 4, y - 2], [x - 1, y - 5], [x + 3, y - 3], [x + 4, y + 2], [x + 1, y + 5], [x - 3, y + 3]]);
    rect(ctx, '#edcf81', x - 2, y - 3, 4, 5);
    rect(ctx, '#fff1b3', x - 1, y - 2, 1, 3);
  }
}

function drawExit(ctx, exit, camera, theme, time, finalFloor) {
  if (!exit) return;
  const x = exit.x - camera.x;
  const y = exit.y - camera.y;
  if (x < -120 || x > WIDTH + 60) return;
  const width = Math.max(exit.w, 34);
  const height = Math.max(exit.h, 61);
  const center = x + width / 2;
  const open = !exit.locked;
  glow(ctx, center, y + height * .47, 62, open ? theme.glow : '#8f6754', open ? 1 : .4);
  polygon(ctx, '#071a25', [[x - 7, y + height], [x - 7, y + 13], [center, y - 12], [x + width + 7, y + 13], [x + width + 7, y + height]]);
  arch(ctx, x - 8, y - 6, width + 16, height + 6, '#687b6b', 7);
  arch(ctx, x - 2, y, width + 4, height, '#304d48', 3);
  if (open) {
    polygon(ctx, '#275351', [[x + 4, y + height], [x + 4, y + 17], [center, y + 3], [x + width - 4, y + 17], [x + width - 4, y + height]]);
    rect(ctx, '#76c6a3', center - 3, y + 18, 6, height - 18);
    for (let i = 0; i < 6; i++) {
      const moteY = y + 13 + ((time * 17 + i * 13) % Math.max(20, height - 16));
      rect(ctx, '#a7e6b9', center - 11 + Math.sin(time * 2 + i) * 9, moteY, 1, 2);
    }
  } else {
    for (let i = 4; i < width; i += 7) {
      rect(ctx, '#55756d', x + i, y + 18, 2, height - 19);
      rect(ctx, '#243d43', x + i + 2, y + 18, 2, height - 19);
    }
    rect(ctx, '#5a7569', x + 2, y + height * .55, width - 4, 3);
    rect(ctx, '#a1885e', center - 4, y + height * .55 - 2, 8, 8);
    rect(ctx, '#222f31', center - 1, y + height * .55 + 1, 2, 4);
  }
  rect(ctx, '#5a7567', x - 9, y + height - 2, width + 18, 4);
  rect(ctx, '#192e34', x - 12, y + height + 2, width + 24, 5);
  pixelText(ctx, exit.locked ? 'SEALED' : finalFloor ? 'E RETURN' : 'E ASCEND', center, y - 22, open ? '#b5e2be' : '#a99380', 1, true);
}

function drawProjectile(ctx, projectile, camera) {
  const x = projectile.x - camera.x;
  const y = projectile.y - camera.y;
  if (x < -30 || x > WIDTH + 30 || y < -30 || y > HEIGHT + 30) return;
  const direction = (projectile.vx || 0) >= 0 ? 1 : -1;
  if (projectile.type === 'orb' || projectile.type === 'wave') {
    glow(ctx, x, y, 19, '#eebd8b', .7);
    polygon(ctx, '#d57c67', [[x - 5, y], [x - 2, y - 5], [x + 3, y - 4], [x + 6, y], [x + 2, y + 5], [x - 3, y + 4]]);
    rect(ctx, '#ffe4ae', x - 2, y - 2, 4, 4);
  } else {
    rect(ctx, '#342e30', direction > 0 ? x - 14 : x + 1, y + 2, 13, 1);
    rect(ctx, '#d9b287', direction > 0 ? x - 11 : x + 1, y, 11, 1);
    polygon(ctx, '#ecddbc', [[x + direction * 4, y], [x - direction * 2, y - 3], [x - direction, y + 3]]);
    rect(ctx, '#bc876c', direction > 0 ? x - 13 : x + 10, y - 2, 3, 5);
  }
}

function drawForeground(ctx, camera, seed, ground, time, reducedMotion) {
  const floorY = ground - camera.y;
  const parallax = camera.x * 1.14;
  const start = Math.floor(parallax / 190) - 1;
  for (let i = start; i < start + 6; i++) {
    const x = i * 190 - parallax;
    const base = HEIGHT + 5;
    const tall = hash(i, 4, seed) > .5;
    polygon(ctx, '#091924', [[x - 25, base], [x - 20, base - 13], [x - 9, base - 24], [x + 10, base - 20], [x + 17, base - 9], [x + 34, base - 14], [x + 45, base], [x - 25, base]]);
    rect(ctx, '#183139', x - 9, base - 20, 16, 2);
    for (let j = 0; j < 7; j++) {
      const height = 7 + hash(i, j, seed) * (tall ? 28 : 13);
      const wind = reducedMotion ? 0 : Math.sin(time * 2 + j) * 2;
      polygon(ctx, j % 2 ? '#15372f' : '#0e2b2b', [[x + 13 + j * 4, base], [x + 8 + j * 4 + wind, base - height], [x + 16 + j * 4, base - 6]]);
    }
  }
  if (floorY > HEIGHT - 54) {
    const haze = ctx.createLinearGradient(0, HEIGHT - 32, 0, HEIGHT);
    haze.addColorStop(0, 'rgba(7,20,28,0)');
    haze.addColorStop(1, 'rgba(7,20,28,.48)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, HEIGHT - 32, WIDTH, 32);
  }
}

/** Draws the original Emberwake art at native pixel resolution. No DOM or game state mutations. */
export function createRenderer(canvas) {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Emberwake needs a browser with a 2D Canvas context.');
  ctx.imageSmoothingEnabled = false;
  let camera = { x: 0, y: 0, ready: false };
  let particles = [];
  let labels = [];
  let shake = 0;
  let lastSeed;
  let lastFloor;
  let visualTime = 0;
  let destroyed = false;
  let effectIndex = 0;

  function spawn(x, y, count, palette, speed, kind = 'spark', direction = 0) {
    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const index = effectIndex++;
      const angle = hash(index, 1, lastSeed) * TAU;
      const force = speed * (.35 + hash(index, 2, lastSeed) * .7);
      const life = kind === 'smoke' ? .5 + hash(index, 3) * .6 : .18 + hash(index, 3) * .32;
      particles.push({ x, y, vx: Math.cos(angle) * force + direction * speed * .4, vy: Math.sin(angle) * force - (kind === 'smoke' ? 15 : 12), life, maxLife: life, color: palette[index % palette.length], size: kind === 'smoke' ? 2 + hash(index, 4) * 4 : 1 + hash(index, 4) * 2, kind });
    }
  }

  function consumeEvents(events, reducedMotion) {
    for (const event of events) {
      if (!event || !Number.isFinite(event.x) || !Number.isFinite(event.y)) continue;
      const x = event.x;
      const y = event.y;
      if (event.type === 'hit') {
        spawn(x, y, reducedMotion ? 6 : 15, ['#f6f7bd', '#aef1bf', '#f6bf79', '#73bea2'], 105, 'spark', event.direction || 0);
        if (!reducedMotion) shake = Math.max(shake, 2.8);
        if (event.amount) labels.push({ x: x + (event.direction || 1) * 7, y: y - 10, text: String(Math.round(event.amount)), color: '#f8edbb', life: .7, maxLife: .7 });
      } else if (event.type === 'damage') {
        spawn(x, y, reducedMotion ? 5 : 12, ['#f49a75', '#d46664', '#ffe0a0'], 89, 'spark', event.direction || 0);
        if (!reducedMotion) shake = Math.max(shake, 4.3);
        if (event.amount) labels.push({ x, y: y - 15, text: '-' + Math.round(event.amount), color: '#f7a487', life: .75, maxLife: .75 });
      } else if (event.type === 'kill') {
        spawn(x, y, reducedMotion ? 9 : 25, ['#6dafa0', '#b1d89f', '#f4d394', '#385c59'], 91);
        spawn(x, y, 5, ['#49695e', '#38515a'], 28, 'smoke');
        if (!reducedMotion) shake = Math.max(shake, 3.5);
      } else if (event.type === 'jump' || event.type === 'land' || event.type === 'roll') {
        spawn(x, y, event.type === 'land' ? 8 : 5, ['#798c7d', '#4c6660', '#abb29a'], event.type === 'land' ? 30 : 20, 'smoke');
      } else if (event.type === 'heal' || event.type === 'upgrade' || event.type === 'pickup') {
        spawn(x, y, reducedMotion ? 7 : 15, event.type === 'heal' ? ['#ffda94', '#edb77d', '#f9e6b7'] : ['#b9f2bd', '#6cceaa', '#e9e4a4'], 43, 'mote');
        if (event.type === 'heal') labels.push({ x, y: y - 23, text: event.amount ? '+' + Math.round(event.amount) : 'MENDED', color: '#c9f4be', life: 1, maxLife: 1 });
      } else if (event.type === 'complete') {
        spawn(x, y, reducedMotion ? 15 : 45, ['#c1f2c4', '#f7d48d', '#84d2bb'], 67, 'mote');
      }
    }
    if (labels.length > MAX_LABELS) labels.splice(0, labels.length - MAX_LABELS);
  }

  function render(game, dt, events = [], options = {}) {
    if (destroyed || !game?.player || !game?.world) return;
    const step = options.paused ? 0 : clamp(Number.isFinite(dt) ? dt : 0, 0, .05);
    const reducedMotion = !!options.reducedMotion;
    visualTime += step;
    if (lastSeed !== game.seed || lastFloor !== game.floor) {
      camera.ready = false;
      particles = [];
      labels = [];
      shake = 0;
      lastSeed = game.seed;
      lastFloor = game.floor;
    }
    const theme = THEMES[((game.floor || 1) - 1) % THEMES.length];
    const player = game.player;
    const world = game.world;
    const look = clamp((player.vx || 0) * .16, -36, 36);
    const targetX = clamp(player.x + player.w / 2 + look - WIDTH * .45, 0, Math.max(0, world.width - WIDTH));
    const targetY = clamp(player.y + player.h / 2 - HEIGHT * .64, 0, Math.max(0, world.height - HEIGHT));
    if (!camera.ready) camera = { x: targetX, y: targetY, ready: true };
    else {
      const factor = reducedMotion ? 1 : 1 - Math.exp(-step * 9);
      camera.x += (targetX - camera.x) * factor;
      camera.y += (targetY - camera.y) * factor;
    }
    consumeEvents(events, reducedMotion);
    shake = Math.max(0, shake - step * 23);
    const view = { x: Math.round(camera.x), y: Math.round(camera.y) };
    const time = options.paused ? visualTime : Number.isFinite(game.time) ? game.time : visualTime;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (!reducedMotion && shake > 0) ctx.translate(Math.round(Math.sin(visualTime * 159) * shake), Math.round(Math.cos(visualTime * 137) * shake * .55));
    drawBackdrop(ctx, game, view, theme, time);
    const floorPlatforms = (world.platforms || []).filter(p => !p.oneWay && p.w > 500);
    const ground = floorPlatforms.length ? Math.max(...floorPlatforms.map(p => p.y)) : 392;
    for (const room of world.rooms || []) if (room.x + room.w > view.x - 100 && room.x < view.x + WIDTH + 100) drawRoom(ctx, room, view, theme, game.seed, time, ground);
    drawRubble(ctx, view, theme, game.seed, ground);
    for (const platform of world.platforms || []) if (platform.x + platform.w > view.x - 40 && platform.x < view.x + WIDTH + 40 && platform.y + platform.h > view.y - 40 && platform.y < view.y + HEIGHT + 40) drawPlatform(ctx, platform, view, theme, game.seed);
    drawExit(ctx, world.exit, view, theme, time, game.floor >= 3);
    for (const pickup of world.pickups || []) drawPickup(ctx, pickup, view, time, theme);
    // Soft shadows attach entities to platforms while leaving the collision edges visible.
    for (const entity of [player, ...(game.enemies || []).filter(enemy => !enemy.dead && enemy.hp > 0)]) {
      if (!entity.grounded) continue;
      const x = entity.x - view.x;
      const y = entity.y + entity.h - view.y;
      rect(ctx, '#112a30', x - 2, y - 1, entity.w + 4, 2);
    }
    for (const enemy of game.enemies || []) drawEnemy(ctx, enemy, view, time, reducedMotion);
    for (const projectile of game.projectiles || []) drawProjectile(ctx, projectile, view);
    ctx.save();
    ctx.translate(Math.round(player.x + player.w / 2 - view.x), Math.round(player.y + player.h - view.y));
    drawHero(ctx, player, time, reducedMotion);
    ctx.restore();
    for (const particle of particles) {
      particle.life -= step;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.vy += (particle.kind === 'spark' ? 190 : particle.kind === 'mote' ? -30 : -8) * step;
      particle.vx *= Math.exp(-step * (particle.kind === 'spark' ? 2 : 5));
      ctx.save();
      ctx.globalAlpha = clamp(particle.life / particle.maxLife * (particle.kind === 'smoke' ? .4 : 1), 0, 1);
      rect(ctx, particle.color, particle.x - view.x, particle.y - view.y, particle.size, particle.size);
      if (particle.kind === 'spark' && Math.abs(particle.vx) > 35) rect(ctx, particle.color, particle.x - view.x - particle.vx * .018, particle.y - view.y - particle.vy * .012, particle.size, 1);
      ctx.restore();
    }
    particles = particles.filter(particle => particle.life > 0);
    for (const label of labels) {
      label.life -= step;
      label.y -= step * 22;
      const x = label.x - view.x;
      const y = label.y - view.y;
      ctx.save();
      ctx.globalAlpha = clamp(label.life / .2, 0, 1);
      pixelText(ctx, label.text, x + 1, y + 1, '#12232b', 2, true);
      pixelText(ctx, label.text, x, y, label.color, 2, true);
      ctx.restore();
    }
    labels = labels.filter(label => label.life > 0);
    // Sparse drifting motes and horizontal wisps stay quieter than all combat effects.
    for (let i = 0; i < 28; i++) {
      const x = ((hash(i, 5, game.seed) * (WIDTH + 60) - view.x * .3 + time * (3 + i % 3)) % (WIDTH + 60) + WIDTH + 60) % (WIDTH + 60) - 20;
      const y = (hash(i, 8, game.seed) * HEIGHT + Math.sin(time * .7 + i) * 5 - view.y * .18 + HEIGHT) % HEIGHT;
      ctx.globalAlpha = .13 + hash(i, 7, game.seed) * .2;
      rect(ctx, i % 4 ? '#a2c4aa' : '#e7cf99', x, y, 1, i % 4 ? 1 : 2);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const x = ((time * (i + 1) * 4 - view.x * .22 + i * 211) % 850 + 850) % 850 - 200;
      ctx.globalAlpha = .022;
      rect(ctx, '#bbdec4', x, ground - view.y - 21 - i * 18, 120 + i * 37, 3);
    }
    ctx.globalAlpha = 1;
    drawForeground(ctx, view, game.seed, ground, time, reducedMotion);
    // A restrained frame keeps the bright UI and central combat readable.
    const vignette = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    vignette.addColorStop(0, 'rgba(4,10,22,.33)');
    vignette.addColorStop(.3, 'rgba(4,10,22,0)');
    vignette.addColorStop(.8, 'rgba(4,10,22,0)');
    vignette.addColorStop(1, 'rgba(4,10,22,.2)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  function destroy() {
    destroyed = true;
    particles.length = 0;
    labels.length = 0;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
  }

  return { render, destroy };
}
