import { merchantStock, rollGear } from './roguelike.js';

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
  const add = (room, offset, type, elite = false) => enemySpawns.push({ id: `f${floor}-e${enemySpawns.length}`, type, x: room.x + offset, y: GROUND_Y, elite });
  // Paired roles protect each other's recovery: front guards and committed
  // charges resist a held sword while ranged hazards demand vertical movement.
  add(rooms[1], 160, 'walker');
  add(rooms[1], 255, 'shield', floor > 1 && random() < .5);
  add(rooms[1], rooms[1].w - 75, 'archer');
  add(rooms[2], 140, 'lancer', floor > 1 && random() < .5);
  add(rooms[2], rooms[2].w - 125, 'alchemist');
  add(rooms[3], 120, 'brute', floor > 1);
  add(rooms[3], 230, random() < .5 ? 'lancer' : 'shield');
  add(rooms[3], rooms[3].w - 70, floor > 1 ? 'alchemist' : 'archer');
  if (floor === 3) add(rooms[5], 330, 'boss');
  else {
    add(rooms[5], 220, floor === 2 ? 'lancer' : 'shield', true);
    add(rooms[5], 350, floor === 2 ? 'archer' : 'alchemist');
  }
  pickups.push({ id: `cache-${floor}`, x: rooms[2].x + 68, y: GROUND_Y - 18, type: 'gear', item: rollGear(seededRandom(seed ^ Math.imul(floor, 0x27d4eb2d)), floor), collected: false });
  const merchants = [{ id: `merchant-${floor}`, name: 'The coal trader', x: relicRoom.x + 85, y: GROUND_Y, stock: merchantStock(seededRandom(seed ^ Math.imul(floor, 0x165667b1)), floor) }];

  return {
    width: position,
    height: 440,
    platforms,
    rooms,
    exit: { x: position - 100, y: GROUND_Y - 72, w: 38, h: 72, locked: true },
    pickups,
    decor,
    enemySpawns,
    merchants,
    spawn: { x: 72, y: GROUND_Y - 34 },
  };
}
