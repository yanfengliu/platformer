// Records complete Canvas fills, including every rectangle in a raster path.
// The old vector renderer remains recordable for pinned regression replays.
export function recordingCanvas() {
  const draws = [];
  const violations = [];
  let matrix = [1, 0, 0, 1, 0, 0];
  let path = [];
  let spans = [];
  const stack = [];
  const point = (x, y) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
  const rectangle = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => point(px, py));
  const checkRectangle = (values) => {
    if (!values.every(Number.isInteger)) violations.push('fractional rectangle');
    if (values[2] <= 0 || values[3] <= 0) violations.push('empty rectangle');
  };
  const ctx = {
    fillStyle: '', globalAlpha: 1, globalCompositeOperation: 'source-over',
    save() { stack.push({ matrix: [...matrix], fillStyle: this.fillStyle, globalAlpha: this.globalAlpha, globalCompositeOperation: this.globalCompositeOperation }); },
    restore() { const state = stack.pop(); matrix = state.matrix; Object.assign(this, { fillStyle: state.fillStyle, globalAlpha: state.globalAlpha, globalCompositeOperation: state.globalCompositeOperation }); },
    setTransform(...values) { matrix = values; if (values.some(value => !Number.isInteger(value))) violations.push('fractional transform'); },
    getTransform() { return Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map((key, i) => [key, matrix[i]])); },
    translate(x, y) { if (!Number.isInteger(x) || !Number.isInteger(y)) violations.push('fractional translation'); matrix[4] += matrix[0] * x + matrix[2] * y; matrix[5] += matrix[1] * x + matrix[3] * y; },
    scale(x, y) { if (![1, -1].includes(x) || y !== 1) violations.push('non-pixel scale'); matrix[0] *= x; matrix[1] *= x; matrix[2] *= y; matrix[3] *= y; },
    beginPath() { path = []; spans = []; },
    moveTo(x, y) { path.push(point(x, y)); },
    lineTo(x, y) { path.push(point(x, y)); },
    rect(x, y, w, h) { checkRectangle([x, y, w, h]); spans.push(rectangle(x, y, w, h)); },
    closePath() {},
    fill() {
      if (path.some((p, i) => { const next = path[(i + 1) % path.length]; return p[0] !== next[0] && p[1] !== next[1]; })) violations.push('sloped Canvas edge');
      draws.push({ color: this.fillStyle, points: spans.length ? spans.flat() : [...path], spans: spans.map(span => [...span]), kind: spans.length ? 'raster' : 'vector', alpha: this.globalAlpha });
    },
    fillRect(x, y, w, h) { checkRectangle([x, y, w, h]); const points = rectangle(x, y, w, h); draws.push({ color: this.fillStyle, points, spans: [points], kind: 'rect', alpha: this.globalAlpha }); },
    clearRect() {},
    createLinearGradient() { violations.push('continuous gradient'); return { addColorStop() {} }; },
  };
  return { draws, violations, getContext: () => ctx };
}

export function shapeDistance(a, b) {
  const directed = (first, second) => Math.max(...first.map(p => Math.min(...second.map(q => Math.hypot(p[0] - q[0], p[1] - q[1])))));
  return Math.max(directed(a, b), directed(b, a));
}

export function boundarySegments(draw) {
  const contours = draw.spans?.length ? draw.spans : [draw.points];
  return contours.flatMap(points => points.map((point, i) => [point, points[(i + 1) % points.length]]));
}

export function rasterPixels(draw) {
  const pixels = new Set();
  for (const span of draw.spans) {
    const left = Math.min(...span.map(p => p[0]));
    const right = Math.max(...span.map(p => p[0]));
    const top = Math.min(...span.map(p => p[1]));
    const bottom = Math.max(...span.map(p => p[1]));
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) pixels.add(`${x},${y}`);
  }
  return pixels;
}

// Measure the actual filled ribbon, independent of pose or scanline ordering.
export function ribbonThickness(draw) {
  if (!draw.spans.length) return Math.hypot(draw.points[8][0] - draw.points[9][0], draw.points[8][1] - draw.points[9][1]);
  const pixels = rasterPixels(draw);
  const outside = new Set();
  for (const pixel of pixels) {
    const [x, y] = pixel.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = `${x + dx},${y + dy}`;
      if (!pixels.has(next)) outside.add(next);
    }
  }
  const boundary = [...outside].map(pixel => pixel.split(',').map(Number));
  return Math.max(...[...pixels].map(pixel => {
    const [x, y] = pixel.split(',').map(Number);
    return Math.min(...boundary.map(([bx, by]) => Math.hypot(x - bx, y - by))) * 2 - 1;
  }));
}
