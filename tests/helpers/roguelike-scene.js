// Isolated renderer fixtures only. Browser gameplay acceptance uses real input.
export const ACTOR_SPECS = {
  walker: [20, 30, .5, .3], archer: [20, 34, .72, .3],
  brute: [30, 40, .8, .3], boss: [48, 64, .88, .38],
  shield: [26, 36, .62, .32], lancer: [22, 36, .74, .48],
  alchemist: [22, 32, .86, .32],
};

export function rogueActor(type, facing = 1, extra = {}) {
  const [w, h, windupDuration, attackDuration] = ACTOR_SPECS[type];
  return { type, id: 7, x: 260 - w / 2, y: 230 - h, w, h, facing, grounded: true, vx: 0, hp: 100, maxHp: 100, attackDuration, windupDuration, attackTime: 0, windup: 0, state: 'patrol', attackKind: type === 'lancer' ? 'charge' : type === 'alchemist' ? 'bomb' : 'melee', guarding: type === 'shield', elite: false, ...extra };
}

export function rogueScene({ enemies = [], pickups = [], projectiles = [], merchants = [], floor = 1, time = 0, player = {} } = {}) {
  return {
    seed: 1234, floor, time,
    world: { width: 640, height: 360, platforms: [], rooms: [], pickups, merchants },
    player: { x: -100, y: 200, w: 18, h: 34, grounded: true, ...player },
    enemies, projectiles,
  };
}
