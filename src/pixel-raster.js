// Fill authored polygons as integer spans. Canvas never receives a sloped edge,
// so even moving weapons keep hard native pixels without a frame post-process.
// Work is bounded by visible scanlines and the small authored vertex lists.
export function fillPixelPolygon(ctx, color, points, width, height) {
  const vertices = points.map(([x, y]) => [Math.round(x), Math.round(y)]);
  const transform = ctx.getTransform();
  // The renderer only translates by whole pixels and mirrors the actor frame.
  const left = transform.a < 0 ? transform.e - width : -transform.e;
  const right = transform.a < 0 ? transform.e : width - transform.e;
  const top = Math.max(-transform.f, Math.min(...vertices.map(point => point[1])));
  const bottom = Math.min(height - transform.f, Math.max(...vertices.map(point => point[1])));
  if (bottom <= top) return;
  const spans = [];
  const intersections = [];
  let previousRow = [];
  let currentRow = [];
  for (let y = top; y < bottom; y++) {
    intersections.length = 0;
    currentRow.length = 0;
    const sample = y + .5;
    for (let i = 0; i < vertices.length; i++) {
      const [ax, ay] = vertices[i];
      const [bx, by] = vertices[(i + 1) % vertices.length];
      if ((ay <= sample && by > sample) || (by <= sample && ay > sample)) intersections.push(ax + (sample - ay) * (bx - ax) / (by - ay));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const x = Math.max(left, Math.ceil(intersections[i] - .5));
      const end = Math.min(right, Math.ceil(intersections[i + 1] - .5));
      if (end <= x) continue;
      const previous = previousRow.find(span => span[0] === x && span[2] === end - x);
      if (previous) {
        previous[3]++;
        currentRow.push(previous);
      } else {
        const span = [x, y, end - x, 1];
        spans.push(span);
        currentRow.push(span);
      }
    }
    const swap = previousRow;
    previousRow = currentRow;
    currentRow = swap;
  }
  if (!spans.length) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const span of spans) ctx.rect(...span);
  ctx.fill();
}
