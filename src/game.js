import { createWorld, seededRandom, GROUND_Y } from './world.js';
import { TALENTS, ITEMS, talentBonuses, rollGear } from './roguelike.js';

const STEP = 1 / 120;
const GRAVITY = 1100;
const SPEED = 218;
const JUMP_SPEED = 410;
const COYOTE = 0.1;
const BUFFER = 0.13;

export const UPGRADES = Object.freeze([
  { id: 'vitality', name: 'Heart of the kiln', description: '+30 maximum health. Restore 30 health.' },
  { id: 'edge', name: 'Honed ember', description: 'Sword strikes deal 28% more damage.' },
  { id: 'quickstep', name: 'Ghost step', description: 'Dodge recovers 30% faster.' },
  { id: 'leech', name: 'Blood bloom', description: 'Defeating an enemy restores 5 health.' },
  { id: 'tempo', name: 'Wild rhythm', description: 'Sword combos attack 20% faster.' },
  { id: 'flask', name: 'Last light', description: 'Gain a healing flask and +1 flask capacity.' },
]);

const ENEMY = {
  walker: { w: 20, h: 30, hp: 42, speed: 74, damage: 13, range: 34, windup: 0.5, recovery: 0.66 },
  archer: { w: 20, h: 34, hp: 34, speed: 42, damage: 12, range: 280, windup: 0.72, recovery: 1.1 },
  brute: { w: 30, h: 40, hp: 84, speed: 48, damage: 22, range: 46, windup: 0.8, recovery: 0.9 },
  boss: { w: 48, h: 64, hp: 340, speed: 68, damage: 25, range: 76, windup: 0.88, recovery: 0.85 },
  shield: { w: 26, h: 36, hp: 60, speed: 62, damage: 18, range: 40, windup: 0.62, recovery: 0.75 },
  lancer: { w: 22, h: 36, hp: 48, speed: 76, damage: 24, range: 190, windup: 0.74, recovery: 0.95 },
  alchemist: { w: 22, h: 32, hp: 36, speed: 45, damage: 23, range: 310, windup: 0.86, recovery: 1.25 },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const approach = (value, target, amount) => value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const centerX = (entity) => entity.x + entity.w / 2;
const centerY = (entity) => entity.y + entity.h / 2;

function emit(game, type, x, y, details = {}) {
  game.events.push({ type, x, y, ...details });
  if (game.events.length > 256) game.events.splice(0, game.events.length - 256);
}

function createPlayer(world) {
  return {
    x: world.spawn.x, y: world.spawn.y, w: 18, h: 34,
    vx: 0, vy: 0, facing: 1, hp: 100, maxHp: 100,
    grounded: true, invulnerable: 0, hurtTime: 0,
    attackTime: 0, attackDuration: 0.27, attackCooldown: 0, attackBuffer: 0,
    rollTime: 0, rollCooldown: 0, rollBuffer: 0, combo: 0, comboWindow: 0,
    flasks: 3, maxFlasks: 3, jumps: 0, coyote: COYOTE,
    jumpBuffer: 0, jumpHeld: false, dropTime: 0,
    swing: 0, hitEnemies: [],
  };
}

function createEnemies(world, floor) {
  return world.enemySpawns.map((spawn) => {
    const spec = ENEMY[spawn.type];
    const hp = Math.round(spec.hp * (spawn.type === 'boss' ? 1 : 1 + (floor - 1) * 0.10) * (spawn.elite ? 1.2 : 1));
    return {
      id: spawn.id, type: spawn.type, x: spawn.x, y: spawn.y - spec.h,
      w: spec.w, h: spec.h, vx: 0, vy: 0, facing: -1,
      hp, maxHp: hp, grounded: true, invulnerable: 0, hurtTime: 0,
      attackTime: 0, attackDuration: 0.3, rollTime: 0, dead: false,
      state: 'patrol', windup: 0, windupDuration: 0, cooldown: 0.4,
      homeX: spawn.x, patrolDirection: 1, attackCount: 0,
      attackHit: false, attackKind: 'melee', announced: false,
      elite: Boolean(spawn.elite), guarding: spawn.type === 'shield',
    };
  });
}

export function createGame(seed = Date.now(), { talents = {} } = {}) {
  const normalized = Number.isFinite(Number(seed)) ? Number(seed) >>> 0 : 1;
  const world = createWorld(normalized, 1);
  const ranks = {};
  for (const talent of TALENTS) {
    if (talent.requires.every((id) => ranks[id] > 0) && Number.isInteger(talents?.[talent.id]) && talents[talent.id] > 0) ranks[talent.id] = Math.min(talent.maxRank, talents[talent.id]);
  }
  const bonuses = talentBonuses(ranks);
  const game = {
    seed: normalized, mode: 'playing', time: 0, floor: 1,
    kills: 0, floorKills: 0, totalFloorEnemies: world.enemySpawns.length,
    gold: bonuses.startingGold, embers: 0, combo: 0, bestCombo: 0, streakTime: 0,
    talents: ranks, inventory: { blade: null, armor: null, charm: null }, pendingLoot: null, shop: null,
    upgrades: [], offer: [], player: createPlayer(world), world,
    enemies: createEnemies(world, 1), projectiles: [], events: [],
    hitStop: 0, stats: {},
  };
  recomputeStats(game);
  game.player.hp = game.player.maxHp;
  game.player.flasks = game.player.maxFlasks;
  priceMerchants(game);
  return game;
}

function priceMerchants(game) {
  const discount = talentBonuses(game.talents).discount;
  for (const merchant of game.world.merchants ?? []) for (const stock of merchant.stock) stock.price = Math.max(1, Math.ceil(stock.price * (1 - discount)));
}

function recomputeStats(game) {
  const talents = talentBonuses(game.talents);
  const gear = Object.values(game.inventory).filter(Boolean);
  const sum = (key) => gear.reduce((total, item) => total + (item[key] ?? 0), 0);
  const has = (id) => game.upgrades.includes(id);
  game.stats = {
    damage: (1 + talents.damage + sum('damage')) * (has('edge') ? 1.28 : 1),
    attackSpeed: (1 + talents.attackSpeed + sum('attackSpeed')) * (has('tempo') ? 1.2 : 1),
    rollCooldown: .62 * (1 - sum('rollRecovery')) * (has('quickstep') ? .7 : 1),
    leech: sum('leech') + (has('leech') ? 5 : 0),
    armor: Math.min(.5, sum('armor')), healPower: talents.healPower, finisher: talents.finisher,
  };
  game.player.maxHp = 100 + talents.maxHp + sum('maxHp') + (has('vitality') ? 30 : 0);
  game.player.maxFlasks = 3 + talents.maxFlasks + (has('flask') ? 1 : 0);
  game.player.hp = Math.min(game.player.hp, game.player.maxHp);
  game.player.flasks = Math.min(game.player.flasks, game.player.maxFlasks);
}

export function drainEvents(game) {
  const events = game.events;
  game.events = [];
  return events;
}

/** Cancel queued actions and combo continuation without rewinding an active swing. */
export function clearActionBuffers(game) {
  const player = game.player;
  player.attackBuffer = 0;
  player.rollBuffer = 0;
  player.jumpBuffer = 0;
  player.comboWindow = 0;
  if (player.attackTime <= 0) player.combo = 0;
  game.pendingInput = null;
}

function timers(entity, dt) {
  for (const key of ['invulnerable', 'hurtTime', 'rollTime', 'rollCooldown', 'rollBuffer', 'attackTime', 'attackCooldown', 'attackBuffer', 'comboWindow', 'jumpBuffer', 'dropTime', 'cooldown']) {
    if (entity[key] > 0) entity[key] = Math.max(0, entity[key] - dt);
  }
}

// Axis sweeps prevent crossing a thin platform even at roll or projectile speed.
function moveBody(body, world, dt) {
  const oldX = body.x;
  body.x += body.vx * dt;
  for (const platform of world.platforms) {
    if (platform.oneWay || body.y + body.h <= platform.y + 0.001 || body.y >= platform.y + platform.h) continue;
    if (body.vx > 0 && oldX + body.w <= platform.x && body.x + body.w > platform.x) {
      body.x = platform.x - body.w;
      body.vx = 0;
    } else if (body.vx < 0 && oldX >= platform.x + platform.w && body.x < platform.x + platform.w) {
      body.x = platform.x + platform.w;
      body.vx = 0;
    }
  }
  body.x = clamp(body.x, 0, world.width - body.w);
  const oldY = body.y;
  body.y += body.vy * dt;
  body.grounded = false;
  for (const platform of world.platforms) {
    if (body.x + body.w <= platform.x || body.x >= platform.x + platform.w) continue;
    if (body.vy >= 0 && oldY + body.h <= platform.y + 0.01 && body.y + body.h >= platform.y) {
      if (platform.oneWay && body.dropTime > 0) continue;
      body.y = Math.min(body.y, platform.y - body.h);
      body.vy = 0;
      body.grounded = true;
    } else if (!platform.oneWay && body.vy < 0 && oldY >= platform.y + platform.h && body.y < platform.y + platform.h) {
      body.y = platform.y + platform.h;
      body.vy = 0;
    }
  }
}

function startPlayerAttack(game) {
  const player = game.player;
  player.combo = player.comboWindow > 0 ? player.combo % 3 + 1 : 1;
  player.comboWindow = 0.8;
  player.attackDuration = [0, 0.27, 0.29, 0.38][player.combo] / game.stats.attackSpeed;
  player.attackTime = player.attackDuration;
  player.attackCooldown = player.attackDuration + 0.06 / game.stats.attackSpeed;
  player.hitEnemies = [];
  player.swing += 1;
  emit(game, 'attack', centerX(player), centerY(player), { direction: player.facing, amount: player.combo, stage: player.combo });
}

function damageEnemy(game, enemy, amount, direction) {
  if (enemy.dead || enemy.invulnerable > 0) return false;
  enemy.hp = Math.max(0, enemy.hp - amount);
  enemy.hurtTime = 0.18;
  const committed = enemy.type === 'boss' || ((enemy.type === 'brute' || enemy.type === 'lancer' || enemy.elite) && ['windup', 'attack'].includes(enemy.state));
  enemy.vx = direction * (committed ? 45 : enemy.type === 'brute' ? 115 : 195);
  if (!committed) enemy.vy = -85;
  // Heavy, elite and charging attacks commit. Dodge their telegraph or flank
  // their recovery instead of cancelling every attack by holding the sword.
  if (!committed) {
    enemy.state = 'recover';
    enemy.windup = 0;
    enemy.attackTime = 0;
    enemy.cooldown = Math.max(enemy.cooldown, 0.2);
  }
  emit(game, 'hit', centerX(enemy), centerY(enemy), { amount, direction, target: enemy.id, stage: game.player.combo });
  game.hitStop = Math.max(game.hitStop, enemy.hp === 0 ? 0.06 : 0.035);
  if (enemy.hp === 0) {
    enemy.dead = true;
    enemy.state = 'dead';
    game.kills += 1;
    game.floorKills += 1;
    const gold = enemy.type === 'boss' ? 60 : enemy.elite ? 24 : 12;
    game.gold += gold;
    dropEnemyLoot(game, enemy);
    game.combo += 1;
    game.bestCombo = Math.max(game.bestCombo, game.combo);
    game.streakTime = 6;
    if (game.stats.leech > 0) game.player.hp = Math.min(game.player.maxHp, game.player.hp + game.stats.leech);
    emit(game, 'kill', centerX(enemy), centerY(enemy), { direction, target: enemy.id, amount: gold });
  }
  return true;
}

function damagePlayer(game, amount, direction = 1) {
  const player = game.player;
  if (game.mode !== 'playing' || player.invulnerable > 0 || player.rollTime > 0) return false;
  amount = Math.max(1, Math.round(amount * (1 - game.stats.armor)));
  player.hp = Math.max(0, player.hp - amount);
  player.invulnerable = 0.8;
  player.hurtTime = 0.24;
  player.vx = direction * 235;
  player.vy = -160;
  player.attackTime = 0;
  clearActionBuffers(game);
  game.combo = 0;
  game.streakTime = 0;
  game.hitStop = 0.055;
  emit(game, 'damage', centerX(player), centerY(player), { amount, direction, target: 'player' });
  if (player.hp === 0) game.mode = 'dead';
  return true;
}

function swordHits(game) {
  const player = game.player;
  if (player.attackTime <= 0) return;
  const progress = 1 - player.attackTime / player.attackDuration;
  if (progress < 0.17 || progress > 0.74) return;
  const reach = player.combo === 3 ? 64 : 52;
  const sword = { x: player.facing > 0 ? player.x + player.w - 3 : player.x - reach + 3, y: player.y - 9, w: reach, h: player.h + 18 };
  for (const enemy of game.enemies) {
    if (enemy.dead || player.hitEnemies.includes(enemy.id) || !overlap(sword, enemy)) continue;
    if (enemy.type === 'shield' && enemy.guarding && Math.sign(centerX(player) - centerX(enemy)) === enemy.facing) {
      player.hitEnemies.push(enemy.id);
      emit(game, 'block', centerX(enemy), centerY(enemy), { direction: player.facing, target: enemy.id, stage: player.combo });
      continue;
    }
    const amount = Math.round([0, 19, 23, 34][player.combo] * game.stats.damage * (player.combo === 3 ? 1 + game.stats.finisher : 1));
    if (damageEnemy(game, enemy, amount, player.facing)) player.hitEnemies.push(enemy.id);
  }
}

function updatePlayer(game, input, dt) {
  const player = game.player;
  const wasGrounded = player.grounded;
  let jumpStarted = false;
  timers(player, dt);
  if (player.comboWindow <= 0 && player.attackTime <= 0) player.combo = 0;
  if (wasGrounded) {
    player.coyote = COYOTE;
    player.jumps = 0;
  } else player.coyote = Math.max(0, player.coyote - dt);
  if (input.jumpPressed) player.jumpBuffer = BUFFER;
  // One queued strike survives this sword's remaining recovery. Extra taps
  // refresh that one slot; rolls and hurt never store a strike for later.
  if (input.attackPressed && player.rollTime <= 0 && player.hurtTime <= 0) player.attackBuffer = Math.max(0.17, player.attackCooldown + BUFFER);
  if (input.rollPressed) player.rollBuffer = 0.14;
  const move = Number(Boolean(input.right)) - Number(Boolean(input.left));
  if (move !== 0 && player.rollTime <= 0 && player.hurtTime <= 0) player.facing = move;

  if (player.rollBuffer > 0 && player.rollTime <= 0 && player.rollCooldown <= 0 && player.hurtTime <= 0) {
    player.rollTime = 0.29;
    player.rollCooldown = game.stats.rollCooldown;
    player.invulnerable = Math.max(player.invulnerable, 0.29);
    player.attackTime = 0;
    player.rollBuffer = 0;
    player.attackBuffer = 0;
    player.comboWindow = 0;
    player.combo = 0;
    emit(game, 'roll', centerX(player), player.y + player.h - 5, { direction: player.facing });
  }
  if (input.healPressed && player.flasks > 0 && player.hp < player.maxHp) {
    player.flasks -= 1;
    const amount = Math.min(player.maxHp - player.hp, Math.ceil(player.maxHp * 0.55) + game.stats.healPower);
    player.hp += amount;
    player.invulnerable = Math.max(player.invulnerable, 0.4);
    emit(game, 'heal', centerX(player), centerY(player), { amount });
  }
  if ((player.attackBuffer > 0 || input.attackHeld) && player.attackCooldown <= 0 && player.rollTime <= 0 && player.hurtTime <= 0) {
    startPlayerAttack(game);
    player.attackBuffer = 0;
  }

  if (player.jumpBuffer > 0 && player.hurtTime <= 0) {
    const standingOnOneWay = wasGrounded && game.world.platforms.some((platform) => platform.oneWay && Math.abs(platform.y - player.y - player.h) < 1 && player.x + player.w > platform.x && player.x < platform.x + platform.w);
    if (input.downHeld && standingOnOneWay) {
      player.dropTime = 0.22;
      player.y += 2;
      player.vy = 70;
      player.jumpBuffer = 0;
      player.coyote = 0;
      player.grounded = false;
      player.jumps = 1;
    } else if (player.coyote > 0 || player.jumps < 2) {
      player.jumps = player.coyote > 0 ? 1 : Math.max(1, player.jumps) + 1;
      player.vy = -JUMP_SPEED;
      player.jumpBuffer = 0;
      player.coyote = 0;
      player.grounded = false;
      player.rollTime = 0;
      jumpStarted = true;
      emit(game, 'jump', centerX(player), player.y + player.h, { amount: player.jumps });
    }
  }
  // A buffered press may launch after release; apply that release on its first frame.
  if ((jumpStarted || player.jumpHeld) && !input.jumpHeld && player.vy < -120) player.vy *= 0.47;
  player.jumpHeld = Boolean(input.jumpHeld);
  if (player.rollTime > 0) player.vx = player.facing * 470;
  else if (player.hurtTime > 0) player.vx = approach(player.vx, 0, 500 * dt);
  else {
    const speed = player.attackTime > 0 && player.grounded ? SPEED * 0.48 : SPEED;
    player.vx = approach(player.vx, move * speed, (move === 0 ? (player.grounded ? 2400 : 1100) : 2100) * dt);
  }
  player.vy = Math.min(player.vy + GRAVITY * dt, 660);
  const fallingSpeed = player.vy;
  moveBody(player, game.world, dt);
  if (player.grounded && !wasGrounded && fallingSpeed > 80) emit(game, 'land', centerX(player), player.y + player.h, { amount: fallingSpeed });
  if (player.y > game.world.height + 80) {
    player.x = game.world.spawn.x;
    player.y = game.world.spawn.y;
    player.vy = 0;
    damagePlayer(game, 20, 1);
  }
}

function spawnArrow(game, enemy, angleOffset = 0) {
  const dx = centerX(game.player) - centerX(enemy);
  const dy = centerY(game.player) - centerY(enemy);
  const angle = Math.atan2(dy, dx) + angleOffset;
  const speed = enemy.type === 'boss' ? 225 : 245;
  game.projectiles.push({ x: centerX(enemy), y: enemy.y + enemy.h * 0.42, w: 9, h: 5, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, type: enemy.type === 'boss' ? 'ember' : 'arrow', owner: enemy.id, damage: enemyDamage(enemy), life: 4 });
}

function enemyDamage(enemy) { return Math.round(ENEMY[enemy.type].damage * (enemy.elite ? 1.25 : 1)); }

function spawnBomb(game, enemy) {
  const x = centerX(enemy) - enemy.facing * 9 - 4;
  const target = centerX(game.player) + game.player.vx * .12;
  game.projectiles.push({ type: 'bomb', x, y: enemy.y + enemy.h - 41, w: 8, h: 10, vx: clamp((target - x - 4) / .8, -390, 390), vy: -340, owner: enemy.id, damage: enemyDamage(enemy), life: 3.5, fuse: .6, blastRadius: enemy.elite ? 66 : 54, phase: 'flight' });
}

function startEnemyAttack(game, enemy) {
  enemy.state = 'attack';
  enemy.attackDuration = enemy.type === 'boss' ? .38 : enemy.type === 'lancer' ? .48 : ['shield', 'alchemist'].includes(enemy.type) ? .32 : .27;
  enemy.attackTime = enemy.attackDuration;
  enemy.attackHit = false;
  enemy.attackCount += 1;
  if (enemy.type === 'archer' || enemy.attackKind === 'volley') {
    spawnArrow(game, enemy);
    if (enemy.type === 'boss') {
      spawnArrow(game, enemy, -0.2);
      spawnArrow(game, enemy, 0.2);
    }
    if (enemy.type === 'archer' && enemy.elite) spawnArrow(game, enemy, .16);
  }
  if (enemy.attackKind === 'bomb') spawnBomb(game, enemy);
}

function enemyAttackHits(game, enemy) {
  if (enemy.attackHit || enemy.type === 'archer' || ['volley', 'bomb'].includes(enemy.attackKind)) return;
  const progress = 1 - enemy.attackTime / enemy.attackDuration;
  if (progress < 0.22 || progress > 0.82) return;
  const reach = enemy.attackKind === 'charge' ? 68 : ENEMY[enemy.type].range + 12;
  const box = { x: enemy.facing > 0 ? enemy.x + enemy.w - 5 : enemy.x - reach + 5, y: enemy.y - 5, w: reach, h: enemy.h + 10 };
  if (overlap(box, game.player)) {
    // An avoided swing also spends the contact; a dodge cannot be punished on its last frame.
    enemy.attackHit = true;
    damagePlayer(game, enemyDamage(enemy), enemy.facing);
  }
}

function updateEnemy(game, enemy, dt) {
  if (enemy.dead) return;
  const spec = ENEMY[enemy.type];
  timers(enemy, dt);
  enemy.guarding = enemy.type === 'shield' && enemy.state !== 'recover' && enemy.hurtTime <= 0;
  const dx = centerX(game.player) - centerX(enemy);
  const dy = Math.abs(centerY(game.player) - centerY(enemy));
  const ranged = ['archer', 'alchemist'].includes(enemy.type);
  const inRange = Math.abs(dx) <= spec.range + enemy.w / 2 && (ranged || dy < enemy.h + 16);
  const alert = Math.abs(dx) < (enemy.type === 'boss' ? 520 : 370);
  if (enemy.type === 'boss' && alert && !enemy.announced) {
    enemy.announced = true;
    emit(game, 'boss', centerX(enemy), centerY(enemy), { target: enemy.id });
  }
  const committed = enemy.type === 'boss' || ((enemy.type === 'brute' || enemy.type === 'lancer' || enemy.elite) && ['windup', 'attack'].includes(enemy.state));
  if (enemy.hurtTime > 0 && !committed) enemy.vx = approach(enemy.vx, 0, 520 * dt);
  else if (enemy.state === 'windup') {
    enemy.vx = approach(enemy.vx, 0, 900 * dt);
    enemy.windup = Math.max(0, enemy.windup - dt);
    if (enemy.windup === 0) startEnemyAttack(game, enemy);
  } else if (enemy.state === 'attack') {
    enemy.vx = enemy.attackKind === 'charge' ? enemy.facing * (enemy.elite ? 390 : 330) : enemy.attackKind === 'melee' && enemy.type === 'boss' ? enemy.facing * 125 : 0;
    enemyAttackHits(game, enemy);
    if (enemy.attackTime <= 0) {
      enemy.state = 'recover';
      enemy.cooldown = spec.recovery * (enemy.type === 'boss' && enemy.hp < enemy.maxHp / 2 ? .7 : 1) * (enemy.elite ? .78 : 1);
    }
  } else if (enemy.cooldown > 0) {
    enemy.vx = approach(enemy.vx, 0, 800 * dt);
    enemy.state = 'recover';
  } else if (alert) {
    enemy.facing = dx >= 0 ? 1 : -1;
    enemy.state = 'chase';
    const bossVolley = enemy.type === 'boss' && enemy.attackCount % 3 === 2;
    if (inRange || (bossVolley && Math.abs(dx) < 450)) {
      enemy.state = 'windup';
      enemy.windupDuration = spec.windup * (enemy.type === 'boss' && enemy.hp < enemy.maxHp / 2 ? .78 : 1) * (enemy.elite ? .9 : 1);
      enemy.windup = enemy.windupDuration;
      enemy.attackKind = bossVolley || enemy.type === 'archer' ? 'volley' : enemy.type === 'lancer' ? 'charge' : enemy.type === 'alchemist' ? 'bomb' : 'melee';
      enemy.vx = 0;
    } else enemy.vx = Math.sign(dx) * spec.speed;
  } else {
    enemy.state = 'patrol';
    if (Math.abs(enemy.x - enemy.homeX) > 72) enemy.patrolDirection = enemy.x > enemy.homeX ? -1 : 1;
    enemy.facing = enemy.patrolDirection;
    enemy.vx = enemy.type === 'boss' ? 0 : enemy.patrolDirection * spec.speed * 0.35;
  }
  enemy.vy = Math.min(enemy.vy + GRAVITY * dt, 660);
  moveBody(enemy, game.world, dt);
}

function updateProjectiles(game, dt) {
  for (const projectile of game.projectiles) {
    if (projectile.type === 'bomb') {
      updateBomb(game, projectile, dt);
      continue;
    }
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    if (overlap(projectile, game.player)) {
      damagePlayer(game, projectile.damage, Math.sign(projectile.vx));
      projectile.life = 0;
    }
    if (projectile.x < 0 || projectile.x > game.world.width || projectile.y < -80 || projectile.y > game.world.height) projectile.life = 0;
    for (const platform of game.world.platforms) if (!platform.oneWay && overlap(projectile, platform)) projectile.life = 0;
  }
  game.projectiles = game.projectiles.filter((projectile) => projectile.life > 0);
}

function updateBomb(game, bomb, dt) {
  bomb.life -= dt;
  if (bomb.phase === 'flight') {
    bomb.vy += 900 * dt;
    bomb.x += bomb.vx * dt;
    const oldBottom = bomb.y + bomb.h;
    bomb.y += bomb.vy * dt;
    for (const platform of game.world.platforms) {
      if (platform.oneWay || bomb.vy < 0 || oldBottom > platform.y || bomb.y + bomb.h < platform.y || bomb.x + bomb.w <= platform.x || bomb.x >= platform.x + platform.w) continue;
      bomb.y = platform.y - bomb.h;
      bomb.vx = 0;
      bomb.vy = 0;
      bomb.phase = 'warning';
      break;
    }
    if (bomb.x < -80 || bomb.x > game.world.width + 80 || bomb.y > game.world.height + 40) bomb.life = 0;
  } else if (bomb.phase === 'warning') {
    bomb.fuse = Math.max(0, bomb.fuse - dt);
    if (bomb.fuse === 0) {
      bomb.phase = 'blast';
      bomb.life = .18;
      emit(game, 'blast', centerX(bomb), centerY(bomb), { amount: bomb.blastRadius });
    }
  }
  if (bomb.phase === 'blast') {
    const player = game.player;
    const dx = centerX(bomb) - clamp(centerX(bomb), player.x, player.x + player.w);
    const dy = centerY(bomb) - clamp(centerY(bomb), player.y, player.y + player.h);
    if (dx * dx + dy * dy < bomb.blastRadius * bomb.blastRadius) damagePlayer(game, bomb.damage, Math.sign(centerX(player) - centerX(bomb)) || 1);
  }
}

function offerRelic(game, relic) {
  const random = seededRandom(game.seed ^ Math.imul(game.floor, 0x85ebca6b));
  const available = UPGRADES.filter((upgrade) => !game.upgrades.includes(upgrade.id));
  for (let index = available.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [available[index], available[other]] = [available[other], available[index]];
  }
  game.offer = available.slice(0, 3).map((upgrade) => ({ ...upgrade }));
  if (game.offer.length === 0) return;
  relic.collected = true;
  game.mode = 'choice';
  clearActionBuffers(game);
  emit(game, 'pickup', relic.x, relic.y, { target: relic.id });
}

function nextFloor(game) {
  if (game.floor === 3) {
    game.mode = 'won';
    game.embers += 10;
    emit(game, 'complete', centerX(game.player), centerY(game.player), { amount: game.kills });
    return;
  }
  game.floor += 1;
  game.embers += 3;
  game.world = createWorld(game.seed, game.floor);
  game.enemies = createEnemies(game.world, game.floor);
  game.projectiles = [];
  game.floorKills = 0;
  game.totalFloorEnemies = game.enemies.length;
  const player = game.player;
  const hp = Math.min(player.maxHp, player.hp + Math.ceil(player.maxHp * 0.18));
  const flasks = Math.min(player.maxFlasks, player.flasks + 1);
  Object.assign(player, createPlayer(game.world), { hp, maxHp: player.maxHp, flasks, maxFlasks: player.maxFlasks });
  game.hitStop = 0;
  game.offer = [];
  game.pendingLoot = null;
  game.shop = null;
  priceMerchants(game);
  emit(game, 'pickup', centerX(player), centerY(player), { target: 'floor', amount: game.floor });
}

function updatePickupsAndExit(game, input) {
  const player = game.player;
  for (const pickup of game.world.pickups) {
    if (pickup.collected) continue;
    const near = Math.abs(pickup.x - centerX(player)) < (['relic', 'gear'].includes(pickup.type) ? 52 : 22) && Math.abs(pickup.y - centerY(player)) < 45;
    if (!near) continue;
    if (pickup.type === 'relic') {
      if (input.interactPressed) { offerRelic(game, pickup); return; }
    } else if (pickup.type === 'gear') {
      if (input.interactPressed) {
        game.pendingLoot = pickup;
        game.mode = 'loot';
        clearActionBuffers(game);
        return;
      }
    } else {
      if (pickup.type === 'flask' && player.flasks >= player.maxFlasks) continue;
      pickup.collected = true;
      if (pickup.type === 'gold') game.gold += pickup.amount;
      if (pickup.type === 'heal') player.hp = Math.min(player.maxHp, player.hp + pickup.amount);
      if (pickup.type === 'flask') player.flasks = Math.min(player.maxFlasks, player.flasks + (pickup.amount ?? 1));
      if (pickup.type === 'ember') game.embers += pickup.amount;
      emit(game, 'pickup', pickup.x, pickup.y, { amount: pickup.amount, target: pickup.type });
    }
  }
  if (input.interactPressed) {
    const merchant = (game.world.merchants ?? []).find((entry) => Math.abs(entry.x - centerX(player)) < 52 && Math.abs(entry.y - player.y - player.h) < 45);
    if (merchant) {
      game.shop = merchant;
      game.mode = 'shop';
      clearActionBuffers(game);
      return;
    }
  }
  game.world.exit.locked = game.enemies.some((enemy) => !enemy.dead);
  const exit = game.world.exit;
  const nearExit = Math.abs(centerX(player) - (exit.x + exit.w / 2)) < 52 && player.y + player.h > exit.y;
  if (game.mode === 'playing' && !exit.locked && nearExit && input.interactPressed) nextFloor(game);
}

export function chooseUpgrade(game, id) {
  if (game.mode !== 'choice' || !game.offer.some((upgrade) => upgrade.id === id)) return false;
  game.upgrades.push(id);
  const player = game.player;
  recomputeStats(game);
  if (id === 'vitality') player.hp = Math.min(player.maxHp, player.hp + 30);
  if (id === 'flask') player.flasks = Math.min(player.maxFlasks, player.flasks + 1);
  game.mode = 'playing';
  game.offer = [];
  emit(game, 'upgrade', centerX(player), centerY(player), { target: id });
  return true;
}

function validGear(item) {
  const definition = ITEMS.find((entry) => entry.id === item?.id);
  return Boolean(definition && Object.keys(item).length === Object.keys(definition).length && Object.entries(definition).every(([key, value]) => item[key] === value));
}

export function resolveLoot(game, take) {
  const pickup = game.pendingLoot;
  if (game.mode !== 'loot' || typeof take !== 'boolean' || !pickup || pickup.collected || pickup.type !== 'gear' || !game.world.pickups.includes(pickup) || (take && !validGear(pickup.item))) return false;
  if (take) {
    game.inventory[pickup.item.slot] = { ...pickup.item };
    recomputeStats(game);
    emit(game, 'upgrade', pickup.x, pickup.y, { target: pickup.item.id });
  }
  pickup.collected = true;
  game.pendingLoot = null;
  game.mode = 'playing';
  clearActionBuffers(game);
  return true;
}

export function buyShopItem(game, id) {
  if (game.mode !== 'shop' || !game.shop || !(game.world.merchants ?? []).includes(game.shop)) return false;
  const stock = game.shop.stock.find((entry) => entry.id === id);
  if (!stock || stock.sold || !Number.isInteger(stock.price) || stock.price <= 0 || !Number.isFinite(game.gold) || game.gold < stock.price) return false;
  if (stock.kind === 'gear' && !validGear(stock.item)) return false;
  if (stock.kind === 'heal' && game.player.hp >= game.player.maxHp) return false;
  if (stock.kind === 'flask' && game.player.flasks >= game.player.maxFlasks) return false;
  if (!['gear', 'heal', 'flask'].includes(stock.kind)) return false;
  game.gold -= stock.price;
  stock.sold = true;
  if (stock.kind === 'gear') { game.inventory[stock.item.slot] = { ...stock.item }; recomputeStats(game); }
  if (stock.kind === 'heal') game.player.hp = Math.min(game.player.maxHp, game.player.hp + 40);
  if (stock.kind === 'flask') game.player.flasks += 1;
  emit(game, 'upgrade', game.shop.x, game.shop.y - 20, { target: stock.id });
  return true;
}

export function closeShop(game) {
  if (game.mode !== 'shop') return false;
  game.shop = null;
  game.mode = 'playing';
  clearActionBuffers(game);
  return true;
}

function dropEnemyLoot(game, enemy) {
  const index = Number(enemy.id.split('-e')[1]) || 0;
  const random = seededRandom(game.seed ^ Math.imul(game.floor, 0x85ebca6b) ^ Math.imul(index + 1, 0xc2b2ae35));
  const x = centerX(enemy);
  const y = enemy.y + enemy.h - 18;
  const add = (type, details, offset = 0) => game.world.pickups.push({ id: `drop-${enemy.id}-${type}`, type, x: x + offset, y, collected: false, ...details });
  add('ember', { amount: enemy.type === 'boss' ? 8 : enemy.elite ? 3 : 1 });
  if (enemy.elite || enemy.type === 'boss' || random() < .36) add('gear', { item: rollGear(random, game.floor, talentBonuses(game.talents).fortune) }, 14);
  const consumable = random();
  if (consumable < .12) add('flask', { amount: 1 }, -10);
  else if (consumable < .34) add('heal', { amount: 16 }, -10);
}

function stepGame(game, input, dt) {
  game.time += dt;
  if (game.hitStop > 0) {
    game.hitStop = Math.max(0, game.hitStop - dt);
    // Preserve a press arriving during impact freeze until normal simulation resumes.
    game.pendingInput = { ...game.pendingInput };
    for (const key of ['jumpPressed', 'attackPressed', 'rollPressed', 'healPressed', 'interactPressed']) if (input[key]) game.pendingInput[key] = true;
    return;
  }
  if (game.pendingInput) {
    input = { ...input, ...game.pendingInput };
    game.pendingInput = null;
  }
  game.streakTime = Math.max(0, game.streakTime - dt);
  if (game.streakTime === 0) game.combo = 0;
  updatePlayer(game, input, dt);
  swordHits(game);
  for (const enemy of game.enemies) updateEnemy(game, enemy, dt);
  updateProjectiles(game, dt);
  if (game.mode === 'playing') updatePickupsAndExit(game, input);
}

export function updateGame(game, input = {}, dt = STEP) {
  if (game.mode !== 'playing' || !Number.isFinite(dt) || dt <= 0) return game;
  // The browser owns its fixed accumulator; this bound also protects diagnostic callers.
  let remaining = Math.min(dt, 0.1);
  let first = true;
  while (remaining > 0.0000001 && game.mode === 'playing') {
    const seconds = Math.min(STEP, remaining);
    const current = first ? input : { ...input, jumpPressed: false, attackPressed: false, rollPressed: false, healPressed: false, interactPressed: false };
    stepGame(game, current, seconds);
    remaining -= seconds;
    first = false;
  }
  return game;
}

export const PHYSICS = Object.freeze({ step: STEP, gravity: GRAVITY, speed: SPEED, jumpSpeed: JUMP_SPEED, coyote: COYOTE, jumpBuffer: BUFFER, groundY: GROUND_Y });
