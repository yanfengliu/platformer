// Policies inspect public state and return real-control-equivalent inputs only.
const center = (entity) => entity.x + entity.w / 2;
export function naiveInput(game, frame) {
  const player = game.player;
  const relic = game.world.pickups.find((pickup) => pickup.type === 'relic' && !pickup.collected);
  const enemy = game.enemies.filter((candidate) => !candidate.dead).sort((a, b) => Math.abs(center(a) - center(player)) - Math.abs(center(b) - center(player)))[0];
  const target = relic && (!enemy || relic.x < enemy.x) ? relic : enemy ?? game.world.exit;
  const dx = (target.w ? center(target) : target.x) - center(player);
  const fighting = Boolean(enemy && target === enemy && Math.abs(dx) < 70);
  return { left: dx < -34, right: dx > 34, attackHeld: fighting, attackPressed: fighting && frame % 45 === 0, healPressed: player.hp < player.maxHp * .5 && player.flasks > 0, interactPressed: Math.abs(dx) < 48 && target !== enemy };
}

export function tacticalInput(game) {
  const player = game.player;
  const enemies = game.enemies.filter((enemy) => !enemy.dead);
  const enemy = enemies.sort((a, b) => Math.abs(center(a) - center(player)) - Math.abs(center(b) - center(player)))[0];
  const relic = game.world.pickups.find((pickup) => pickup.type === 'relic' && !pickup.collected);
  const gear = game.world.pickups.filter((pickup) => pickup.type === 'gear' && !pickup.collected && gearScore(pickup.item) > gearScore(game.inventory[pickup.item.slot])).sort((a, b) => Math.abs(a.x - center(player)) - Math.abs(b.x - center(player)))[0];
  const merchant = (game.world.merchants ?? []).find((entry) => !entry.stock.every((item) => item.sold) && entry.stock.some((item) => !item.sold && item.price <= game.gold && ((item.kind === 'heal' && player.hp < player.maxHp - 20) || (item.kind === 'flask' && player.flasks < player.maxFlasks) || (item.kind === 'gear' && gearScore(item.item) > gearScore(game.inventory[item.item.slot])))));
  const safe = !enemy || Math.abs(center(enemy) - center(player)) > 180;
  const target = safe && gear && Math.abs(gear.x - center(player)) < 160 ? gear : safe && merchant && (!enemy || merchant.x < center(enemy)) ? merchant : relic && (!enemy || relic.x < enemy.x) ? relic : enemy ?? game.world.exit;
  const dx = (target.w ? center(target) : target.x) - center(player);
  const fighting = target === enemy;
  const input = { left: dx < -30, right: dx > 30, attackHeld: fighting && Math.abs(dx) < 60 && !(enemy.type === 'shield' && enemy.guarding && (center(player) - center(enemy)) * enemy.facing > 0), healPressed: player.hp < player.maxHp * .48 && player.flasks > 0, interactPressed: !fighting && Math.abs(dx) < 46 };
  const threat = enemies.find((actor) => (center(player) - center(actor)) * actor.facing >= -5 && Math.abs(center(actor) - center(player)) < (actor.type === 'lancer' ? 235 : 130) && Math.abs(actor.y + actor.h - player.y - player.h) < 64 && ((actor.state === 'windup' && actor.windup < .19 && !['volley', 'bomb'].includes(actor.attackKind)) || (actor.state === 'attack' && !actor.attackHit && !['volley', 'bomb'].includes(actor.attackKind))));
  const bomb = game.projectiles.some((shot) => shot.type === 'bomb' && shot.phase !== 'flight' && shot.fuse < .27 && Math.abs(center(shot) - center(player)) < shot.blastRadius + 38 && Math.abs(shot.y - player.y - player.h) < 90);
  const arrow = game.projectiles.some((shot) => shot.type !== 'bomb' && Math.abs(center(shot) - center(player)) < 58 && Math.abs(shot.y - player.y) < player.h + 8 && (center(player) - center(shot)) * shot.vx > 0);
  if ((threat || bomb || arrow) && player.grounded && player.hurtTime <= 0 && player.rollTime <= 0) {
    if (player.grounded && (bomb || ['shield', 'lancer'].includes(threat?.type))) {
      input.jumpPressed = true; input.jumpHeld = true;
    } else if (player.rollCooldown <= 0 && !bomb) {
      input.rollPressed = true;
      if (threat) { input.left = center(threat) < center(player); input.right = !input.left; }
    } else if (player.grounded) { input.jumpPressed = true; input.jumpHeld = true; }
  }
  if (!player.grounded && player.vy < -120) input.jumpHeld = true;
  // Return deliberately to the ground route after evading, including when the
  // jump lands on a reachable optional platform above the targeted opponent.
  if (player.grounded && player.y + player.h < 390) { input.downHeld = true; input.jumpPressed = true; }
  return input;
}

export function gearScore(item) {
  if (!item) return 0;
  return (item.damage ?? 0) * 100 + (item.attackSpeed ?? 0) * 100 + (item.maxHp ?? 0) * .8 + (item.armor ?? 0) * 100 + (item.leech ?? 0) * 4 + (item.rollRecovery ?? 0) * 70;
}

export function playRun(core, seed, tactical = false) {
  const game = core.createGame(seed);
  let choices = 0;
  let damages = 0;
  let healed = 0;
  let rolls = 0;
  let jumps = 0;
  let loot = 0;
  let purchases = 0;
  const trace = [];
  let held = {};
  for (let frame = 0; frame < 120 * 300 && !['won', 'dead'].includes(game.mode); frame++) {
    if (game.mode === 'choice') {
      const chosen = game.offer.find((offer) => offer.id === 'edge') ?? game.offer.find((offer) => offer.id === 'leech') ?? game.offer[0];
      core.chooseUpgrade(game, chosen.id);
      choices++;
    }
    if (game.mode === 'loot') { core.resolveLoot(game, gearScore(game.pendingLoot.item) > gearScore(game.inventory[game.pendingLoot.item.slot])); loot++; }
    if (game.mode === 'shop') {
      for (const stock of [...game.shop.stock].sort((a, b) => (a.kind === 'gear' ? 1 : 0) - (b.kind === 'gear' ? 1 : 0))) {
        if ((stock.kind !== 'gear' || gearScore(stock.item) > gearScore(game.inventory[stock.item.slot])) && core.buyShopItem(game, stock.id)) purchases++;
      }
      core.closeShop(game);
    }
    const decision = !tactical || frame % 6 === 0;
    if (decision) held = tactical ? tacticalInput(game) : naiveInput(game, frame);
    const input = decision ? held : { ...held, jumpPressed: false, attackPressed: false, rollPressed: false, healPressed: false, interactPressed: false };
    core.updateGame(game, input, 1 / 120);
    for (const event of core.drainEvents(game)) {
      if (event.type === 'damage') damages++;
      if (event.type === 'heal') healed++;
      if (event.type === 'roll') rolls++;
      if (event.type === 'jump') jumps++;
    }
    if (frame % 120 === 0) trace.push({ t: frame / 120, floor: game.floor, hp: game.player.hp, flasks: game.player.flasks, x: Math.round(game.player.x), remaining: game.enemies.filter((enemy) => !enemy.dead).length });
    if (![game.player.x, game.player.y, game.player.hp, game.player.flasks].every(Number.isFinite) || game.player.hp < 0 || game.player.hp > game.player.maxHp || game.player.flasks < 0 || game.player.flasks > game.player.maxFlasks) throw new Error('run resource or physics invariant failed');
  }
  return { game, choices, damages, healed, rolls, jumps, loot, purchases, trace };
}
