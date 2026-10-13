// World pixels are simulation units. Every generated floor has a safe ground route.
export const GROUND_Y = 392;

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(seed, floor = 1) {
  const random = seededRandom((seed >>> 0) ^ Math.imul(floor, 0x9e3779b9));
  const kinds = ['start', 'combat', 'traversal', 'combat', 'relic', floor === 3 ? 'boss' : 'exit'];
  const rooms = [];
  let position = 0;
  for (let index = 0; index < kinds.length; index += 1) {
    const w = index === 0 ? 420 : index === 5 ? 640 : 500 + Math.floor(random() * 4) * 32;
    rooms.push({ x: position, w, kind: kinds[index], index });
    position += w;
  }
  const platforms = [{ x: 0, y: GROUND_Y, w: position, h: 48, oneWay: false }];
  const pickups = [];
  const decor = [];
  for (const room of rooms) {
    if (room.index > 0 && room.index < 5) {
      // Branches rise in reachable 68px steps; dropping always returns to solid ground.
      const mirrored = random() < 0.5;
      const steps = [
        { x: 44, y: 324, w: 134 },
        { x: 164, y: 256, w: 132 },
        { x: 282, y: 188, w: 136 },
        { x: 378, y: 256, w: 118 },
        { x: 378, y: 324, w: 118 },
      ];
      for (const step of steps) {
        const x = room.x + (mirrored ? room.w - step.x - step.w : step.x);
        platforms.push({ x, y: step.y, w: step.w, h: 12, oneWay: true });
        if (step.y <= 256) pickups.push({ id: `gold-${floor}-${pickups.length}`, x: x + step.w / 2, y: step.y - 13, type: 'gold', amount: 8, collected: false });
      }
    }
    for (let x = room.x + 48; x < room.x + room.w; x += 104) {
      decor.push({ x, y: GROUND_Y, type: random() < 0.5 ? 'pillar' : 'vine', variant: Math.floor(random() * 4) });
    }
  }
  const relicRoom = rooms[4];
  pickups.push({ id: `relic-${floor}`, x: relicRoom.x + relicRoom.w / 2, y: GROUND_Y - 19, type: 'relic', collected: false });
  pickups.push({ id: `heal-${floor}`, x: rooms[3].x + rooms[3].w - 50, y: GROUND_Y - 12, type: 'heal', amount: 22, collected: false });

  const enemySpawns = [];
  const add = (room, offset, type) => enemySpawns.push({ id: `f${floor}-e${enemySpawns.length}`, type, x: room.x + offset, y: GROUND_Y });
  add(rooms[1], 160, 'walker');
  add(rooms[1], rooms[1].w - 125, floor > 1 ? 'brute' : 'walker');
  add(rooms[2], rooms[2].w / 2, 'archer');
  add(rooms[3], 120, 'walker');
  add(rooms[3], rooms[3].w - 130, 'brute');
  if (floor > 1) add(rooms[4], 95, 'archer');
  if (floor === 3) add(rooms[5], 330, 'boss');
  else add(rooms[5], 230, floor === 2 ? 'brute' : 'archer');

  return {
    width: position,
    height: 440,
    platforms,
    rooms,
    exit: { x: position - 100, y: GROUND_Y - 72, w: 38, h: 72, locked: true },
    pickups,
    decor,
    enemySpawns,
    spawn: { x: 72, y: GROUND_Y - 34 },
  };
}
