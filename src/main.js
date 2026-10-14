import { createGame, updateGame, chooseUpgrade, drainEvents, clearActionBuffers, buyShopItem, closeShop, resolveLoot } from './game.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { TALENTS } from './roguelike.js';
import { createProfileStore, talentAvailability, PROFILE_KEY } from './profile.js';

const STEP = 1 / 120;
const MAX_FRAME = 0.1;
const canvas = document.querySelector('#game');
const overlay = document.querySelector('#overlay');
const audio = createAudio();
const renderer = createRenderer(canvas);
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const requestedSeed = new URLSearchParams(window.location.search).get('seed');
const newSeed = () => {
  const bytes = new Uint32Array(1);
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
  else bytes[0] = Math.floor(Math.random() * 0x100000000);
  return bytes[0];
};
const initialSeed = requestedSeed !== null && /^\d+$/.test(requestedSeed) ? Number(requestedSeed) >>> 0 : newSeed();
const profileStore = createProfileStore(TALENTS);
let game = createGame(initialSeed, { talents: profileStore.snapshot().ranks });
let uniqueRunId;
let settledRunId;
let lastReward = 0;
let started = false;
let paused = false;
let helpOpen = false;
let talentsOpen = false;
let inventoryOpen = false;
let talentFeedback = '';
let profilePending = false;
let overlayKey = '';
let accumulator = 0;
let previousTime;
let frameId;
let destroyed = false;
let previousFocus;
let lastHudTime = -1;

const byId = (id) => document.getElementById(id);
const minutes = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
const announce = (message) => { byId('announcer').textContent = message; };
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const button = (text, action, className = 'primary-button') => {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', () => { void audio.unlock(); action(); });
  return node;
};

function startRun(retry = false) {
  if (profilePending) return;
  profileStore.refresh();
  updateProfileNotice();
  game = createGame(retry ? newSeed() : initialSeed, { talents: profileStore.snapshot().ranks });
  uniqueRunId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${newSeed()}-${newSeed()}`;
  settledRunId = undefined;
  lastReward = 0;
  started = true;
  paused = false;
  helpOpen = false;
  talentsOpen = false;
  inventoryOpen = false;
  accumulator = 0;
  previousTime = undefined;
  lastHudTime = -1;
  syncOverlay();
  updateHud();
  announce('Run started. Use E near dropped gear, merchants, relics, and open gates. Use I to inspect equipment.');
}

function togglePause() {
  if (helpOpen) { helpOpen = false; syncOverlay(); return; }
  if (talentsOpen) { talentsOpen = false; syncOverlay(); return; }
  if (inventoryOpen) { inventoryOpen = false; syncOverlay(); return; }
  if (game.mode === 'shop') { closeShop(game); syncOverlay(); return; }
  if (game.mode === 'loot') { resolveLoot(game, false); syncOverlay(); return; }
  if (!started || game.mode !== 'playing') return;
  paused = !paused;
  accumulator = 0;
  syncOverlay();
}

function toggleHelp() {
  helpOpen = !helpOpen;
  accumulator = 0;
  syncOverlay();
}

function toggleTalents() {
  if (profilePending && !talentsOpen) return;
  if (started && !['dead', 'won'].includes(game.mode)) return;
  helpOpen = false;
  talentsOpen = !talentsOpen;
  talentFeedback = '';
  syncOverlay();
}

function toggleInventory() {
  if (!started || game.mode !== 'playing') return;
  helpOpen = false;
  inventoryOpen = !inventoryOpen;
  syncOverlay();
}

function settleEndedRun() {
  if (!started || !['dead', 'won'].includes(game.mode) || settledRunId === uniqueRunId) return;
  settledRunId = uniqueRunId;
  profilePending = true;
  void profileStore.settle({ id: uniqueRunId, outcome: game.mode, embers: game.embers, seed: game.seed, floor: game.floor, kills: game.kills, time: game.time }).then((result) => {
    if (result.ok) lastReward = result.awarded;
  }).finally(() => {
    profilePending = false;
    if (!destroyed) { updateProfileNotice(); syncOverlay(); }
  });
}

function updateProfileNotice() {
  byId('profile-notice').textContent = profileStore.status().message;
  byId('talent-button').setAttribute('aria-label', `Ember talents. ${profileStore.snapshot().embers} banked embers.`);
}

function toggleMute() {
  audio.setMuted(!audio.muted);
  byId('mute-button').textContent = audio.muted ? 'Sound off' : 'Sound on';
  byId('mute-button').setAttribute('aria-pressed', String(audio.muted));
}

const input = createInput(canvas, {
  onActivity: () => { void audio.unlock(); },
  onPause: togglePause,
  onHelp: toggleHelp,
  onMute: toggleMute,
  onClear: () => clearActionBuffers(game),
});

function choose(id) {
  chooseUpgrade(game, id);
  syncOverlay();
  announce('Relic taken. The run continues.');
}

function panel(eyebrow, title, copy, className = '') {
  const content = element('section', `menu-panel ${className}`);
  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-modal', 'true');
  content.setAttribute('aria-labelledby', 'menu-heading');
  content.tabIndex = -1;
  content.append(element('p', 'eyebrow', eyebrow));
  const heading = element('h1', 'menu-heading', title);
  heading.id = 'menu-heading';
  content.append(heading);
  if (copy) content.append(element('p', 'menu-copy', copy));
  return content;
}

function addStats(content) {
  const stats = element('div', 'run-stats');
  for (const [value, label] of [[minutes(game.time), 'TIME'], [game.kills, 'SLAIN'], [game.bestCombo ?? 0, 'BEST CHAIN']]) {
    const stat = element('div');
    stat.append(element('strong', '', String(value)), element('span', '', label));
    stats.append(stat);
  }
  content.append(stats);
}

function addRewards(content) {
  const persistent = profileStore.status().persistent;
  content.append(element('p', 'reward-copy', profilePending ? 'Banking the embers from this life...' : `${lastReward} embers ${persistent ? 'banked' : 'earned this session'} · ${profileStore.snapshot().embers} total`));
  content.append(element('p', 'menu-hint', `${game.gold} RUN GOLD · GOLD AND GEAR START FRESH`));
  const talents = button('Ember talents', toggleTalents, 'secondary-button');
  talents.disabled = profilePending;
  content.append(talents);
}

function equipmentCard(item, slot, className = 'equipment-card') {
  const card = element('div', className);
  card.append(element('p', 'item-label', `${slot.toUpperCase()}${item ? ` · ${item.rarity.toUpperCase()}` : ''}`));
  card.append(element('h2', 'item-name', item?.name ?? `No ${slot} equipped`));
  card.append(element('p', 'item-description', item?.description ?? 'Find gear or buy it from a merchant.'));
  return card;
}

function equipmentComparison(item) {
  const current = game.inventory[item.slot];
  const comparison = element('div', 'equipment-comparison');
  comparison.append(element('p', 'item-label', `REPLACES ${current?.name ?? 'EMPTY SLOT'}`));
  const stats = element('dl', 'comparison-stats');
  for (const [key, label, percent] of [['damage', 'Damage', true], ['attackSpeed', 'Attack speed', true], ['maxHp', 'Health', false], ['armor', 'Guard', true], ['leech', 'Heal on kill', false], ['rollRecovery', 'Roll recovery', true]]) {
    const before = current?.[key] ?? 0;
    const after = item[key] ?? 0;
    if (before === 0 && after === 0) continue;
    const format = (value) => `${value >= 0 ? '+' : ''}${percent ? Math.round(value * 100) : value}${percent ? '%' : ''}`;
    const change = element('dd', after > before ? 'stat-better' : after < before ? 'stat-worse' : '', `${format(before)} → ${format(after)}`);
    stats.append(element('dt', '', label), change);
  }
  comparison.append(stats);
  return comparison;
}

function talentsPanel() {
  const profile = profileStore.snapshot();
  const content = panel('FIRE THAT ENDURES', 'Ember talents', 'Earn embers by defeating enemies and completing floors. Every learned rank strengthens your next life.', 'talents-panel');
  content.append(element('p', 'currency-line', `${profile.embers} BANKED EMBERS`));
  content.append(element('p', 'storage-notice', profileStore.status().message));
  content.append(button('Back', toggleTalents, 'secondary-button panel-back'));
  const feedback = element('p', 'talent-feedback', talentFeedback || 'Learn one rank in a talent to unlock the next talent in its branch.');
  feedback.setAttribute('role', 'status');
  content.append(feedback);
  const branches = element('div', 'talent-branches');
  for (const branch of [...new Set(TALENTS.map((talent) => talent.branch))]) {
    const column = element('section', 'talent-branch');
    column.append(element('h2', 'branch-heading', branch));
    for (const talent of TALENTS.filter((node) => node.branch === branch).sort((a, b) => a.tier - b.tier)) {
      const rank = profile.ranks[talent.id];
      const availability = talentAvailability(profile, talent.id, TALENTS);
      const card = element('div', `talent-card${rank ? ' talent-learned' : ''}`);
      card.append(element('p', 'item-label', `RANK ${rank} / ${talent.maxRank} · ${talent.cost} EMBERS`), element('h3', 'item-name', talent.name), element('p', 'item-description', talent.description));
      const learn = button(rank >= talent.maxRank ? 'Fully learned' : `Learn ${talent.name}`, async () => {
        if (profilePending) return;
        profilePending = true;
        talentFeedback = 'Learning the talent...';
        syncOverlay();
        try {
          const result = await profileStore.purchase(talent.id);
          talentFeedback = result.reason;
          announce(result.reason);
        } finally {
          profilePending = false;
          if (!destroyed) { updateProfileNotice(); syncOverlay(talent.id); }
        }
      }, 'talent-buy');
      learn.disabled = profilePending || !availability.available;
      learn.dataset.talent = talent.id;
      learn.setAttribute('aria-describedby', `talent-status-${talent.id}`);
      const status = element('p', 'item-description talent-status', availability.reason);
      status.id = `talent-status-${talent.id}`;
      card.append(learn, status);
      column.append(card);
    }
    branches.append(column);
  }
  content.append(branches);
  if (profile.history.length) {
    const history = element('div', 'recent-lives');
    history.append(element('h2', 'branch-heading', 'Recent lives'));
    for (const run of profile.history.slice(-3).reverse()) history.append(element('p', 'item-description', `${run.outcome === 'won' ? 'KEEP CLEARED' : `FELL ON FLOOR ${run.floor}`} · ${run.embers} EMBERS · ${minutes(run.time)}`));
    content.append(history);
  }
  return content;
}

function inventoryPanel() {
  const content = panel('THIS LIFE ONLY', 'Your equipment', 'Gear replaces the item in its slot. Relics and talents add to its effects.', 'inventory-panel');
  content.append(element('p', 'currency-line', `${game.gold} GOLD · ${game.embers} RUN EMBERS`));
  content.append(button('Back to the run', toggleInventory, 'secondary-button panel-back'));
  const slots = element('div', 'equipment-slots');
  for (const slot of ['blade', 'armor', 'charm']) slots.append(equipmentCard(game.inventory[slot], slot));
  content.append(slots);
  const relics = element('p', 'item-description', `RELICS · ${game.upgrades.length ? game.upgrades.map((id) => id.replaceAll('-', ' ')).join(', ') : 'None yet'}`);
  content.append(relics, element('p', 'menu-hint', 'I OR ESCAPE TO CLOSE · THE KEEP IS PAUSED'));
  return content;
}

function shopPanel() {
  const content = panel('THE ASH PEDDLER', game.shop.name ?? 'Merchant', 'Finite stock for this floor. Gear equips immediately; compare its slot before buying.', 'shop-panel');
  content.append(element('p', 'currency-line', `${game.gold} GOLD TO SPEND · ${game.embers} RUN EMBERS`));
  content.append(button('Leave the merchant', () => { closeShop(game); syncOverlay(); }, 'secondary-button panel-back'));
  const stock = element('div', 'shop-stock');
  for (const entry of game.shop.stock) {
    const card = entry.item ? equipmentCard(entry.item, entry.item.slot, 'stock-card') : element('div', 'stock-card');
    if (!entry.item) card.append(element('p', 'item-label', entry.kind.toUpperCase()), element('h2', 'item-name', entry.name), element('p', 'item-description', entry.description));
    if (entry.item) card.append(equipmentComparison(entry.item));
    const full = entry.kind === 'heal' && game.player.hp >= game.player.maxHp || entry.kind === 'flask' && game.player.flasks >= game.player.maxFlasks;
    const label = entry.sold ? 'Bought' : full ? entry.kind === 'heal' ? 'Health is full' : 'Flasks are full' : game.gold < entry.price ? `Need ${entry.price - game.gold} more gold` : `Buy · ${entry.price} gold`;
    const buy = button(label, () => {
      const bought = buyShopItem(game, entry.id);
      if (bought) { syncOverlay(); updateHud(); announce(`${entry.name} bought. ${game.gold} gold remains.`); }
    }, 'stock-buy');
    buy.disabled = entry.sold || full || game.gold < entry.price;
    buy.dataset.stock = entry.id;
    card.classList.toggle('stock-sold', entry.sold);
    card.append(element('p', 'price-label', `${entry.price} GOLD`), buy);
    stock.append(card);
  }
  content.append(stock, element('p', 'menu-hint', 'ESCAPE TO LEAVE · THE KEEP IS PAUSED'));
  return content;
}

function lootPanel() {
  const item = game.pendingLoot.item;
  const content = panel('FOUND IN THE ASHES', 'Take this gear?', 'Taking gear replaces the current item in its slot. Leaving it consumes the drop.', 'loot-panel');
  content.append(equipmentCard(item, item.slot), equipmentComparison(item));
  const actions = element('div', 'loot-actions');
  actions.append(button(`Equip ${item.name}`, () => { if (resolveLoot(game, true)) { syncOverlay(); announce(`${item.name} equipped.`); } }), button('Leave it', () => { resolveLoot(game, false); syncOverlay(); announce('Gear left behind.'); }, 'secondary-button'));
  content.append(actions, element('p', 'menu-hint', 'ESCAPE TO LEAVE · THE KEEP IS PAUSED'));
  return content;
}

function helpPanel() {
  const content = panel('KNOW YOUR BLADE', 'The way through', 'A quick hand. A patient eye. Every enemy gives you a warning.', 'help-panel');
  const controls = element('dl', 'help-controls');
  for (const [keys, description] of [
    ['A / D or ← / →', 'Move'], ['Space / W / ↑', 'Jump; press again to double jump'],
    ['J / Left click', 'Tap or hold for 1–2–3; the amber third strike finishes'], ['K / Shift / Right click', 'Roll through attacks'],
    ['F', 'Drink a healing flask'], ['E', 'Use gear, merchants, relics, or open gates'],
    ['I / T', 'Equipment in a run / talents between lives'],
    ['S / ↓ + Jump', 'Drop through a thin platform'], ['Escape', 'Close a panel; pause / resume'], ['M / H', 'Mute / controls'],
  ]) {
    controls.append(element('dt', '', keys), element('dd', '', description));
  }
  content.append(controls, element('p', 'help-tip', 'Gold buys finite merchant stock and starts fresh each life. Gear fills blade, armor, and charm slots; relics last this life. Embers bank at death or victory, and talents strengthen future lives. Watch shields, charging spears, and warned bomb blasts. Three floors end at the keeper.'));
  content.append(button('Back to the keep', () => { helpOpen = false; syncOverlay(); }));
  return content;
}

function syncOverlay(preferredFocus) {
  settleEndedRun();
  const phase = helpOpen ? 'help' : talentsOpen ? 'talents' : inventoryOpen ? 'inventory' : !started ? 'title' : paused && game.mode === 'playing' ? 'paused' : game.mode;
  let key = phase === 'choice' ? `${phase}:${game.offer.map((offer) => offer.id).join(',')}`
    : phase === 'talents' ? `${phase}:${profileStore.snapshot().embers}:${Object.values(profileStore.snapshot().ranks).join(',')}:${talentFeedback}`
      : phase === 'shop' ? `${phase}:${game.shop.id}:${game.gold}:${game.shop.stock.map((entry) => entry.sold).join(',')}` : phase;
  if (['title', 'talents', 'dead', 'won'].includes(phase)) key += `:${profilePending}:${profileStore.snapshot().embers}:${lastReward}:${profileStore.status().kind}`;
  if (key === overlayKey) return;
  const wasOpen = !overlay.hidden && Boolean(overlay.firstChild);
  const samePhase = overlay.classList.contains(`overlay-${phase}`);
  const focusToken = preferredFocus ?? document.activeElement?.dataset?.talent ?? document.activeElement?.dataset?.stock;
  const previousScroll = samePhase ? overlay.firstChild?.scrollTop ?? 0 : 0;
  overlayKey = key;
  const open = phase !== 'playing';
  if (open && !wasOpen) previousFocus = document.activeElement;
  overlay.replaceChildren();
  overlay.hidden = !open;
  overlay.className = `overlay overlay-${phase}`;
  input.setEnabled(!open && started);
  audio.setPaused(open || !started);
  accumulator = 0;
  byId('pause-button').disabled = !started || game.mode !== 'playing';
  byId('pause-button').hidden = !started;
  byId('pause-button').textContent = paused ? 'Resume' : 'Pause';
  byId('help-button').setAttribute('aria-expanded', String(helpOpen));
  byId('talent-button').hidden = started && !['dead', 'won'].includes(game.mode);
  byId('talent-button').disabled = profilePending;
  byId('talent-button').setAttribute('aria-expanded', String(talentsOpen));
  byId('inventory-button').hidden = !started || ['dead', 'won'].includes(game.mode);
  byId('inventory-button').disabled = game.mode !== 'playing';
  byId('inventory-button').setAttribute('aria-expanded', String(inventoryOpen));
  byId('hud').hidden = !started;
  byId('run-note').hidden = !started;

  let content;
  if (phase === 'help') content = helpPanel();
  else if (phase === 'talents') content = talentsPanel();
  else if (phase === 'inventory') content = inventoryPanel();
  else if (phase === 'shop') content = shopPanel();
  else if (phase === 'loot') content = lootPanel();
  else if (phase === 'title') {
    content = panel('A PIXEL-ART ROGUELIKE', 'EMBERWAKE', 'Beneath the drowned keep, an ember still burns.', 'title-panel');
    const sigil = element('span', 'title-sigil', '✦');
    sigil.setAttribute('aria-hidden', 'true');
    content.insertBefore(sigil, content.firstChild);
    content.append(element('p', 'title-description', 'Master the blade. Descend through shifting rooms. Die, rekindle, and try again.'));
    const enter = button('Enter the keep', () => startRun());
    enter.disabled = profilePending;
    content.append(enter);
    content.append(element('p', 'menu-hint', 'PRESS ENTER TO BEGIN'));
    content.append(button('How to play', toggleHelp, 'secondary-button'));
    const tags = element('div', 'title-tags');
    tags.append(element('span', '', 'PRECISE MOVEMENT'), element('span', '', 'WEIGHTY COMBAT'), element('span', '', 'ONE MORE RUN'));
    content.append(tags);
    content.removeAttribute('role');
    content.removeAttribute('aria-modal');
  } else if (phase === 'paused') {
    content = panel('CATCH YOUR BREATH', 'Fire on hold', 'The keep can wait. Your ember is safe.');
    content.append(button('Resume the run', togglePause), button('Equipment', toggleInventory, 'secondary-button'), button('Controls', toggleHelp, 'secondary-button'));
    content.append(element('p', 'menu-hint', 'ESCAPE TO RESUME'));
  } else if (phase === 'choice') {
    content = panel('A GIFT FROM THE ASHES', 'Choose a relic', 'One blessing for this life. Make it count.', 'relic-panel');
    const cards = element('div', 'relic-cards');
    game.offer.forEach((offer, index) => {
      const card = button('', () => choose(offer.id), 'relic-card');
      const symbol = element('span', 'relic-symbol', ['✦', '◇', '⟡'][index % 3]);
      symbol.setAttribute('aria-hidden', 'true');
      card.append(element('span', 'relic-number', `0${index + 1}`), symbol, element('strong', '', offer.name), element('span', 'relic-description', offer.description), element('span', 'relic-select', `TAKE RELIC · ${index + 1}`));
      cards.append(card);
    });
    content.append(cards, element('p', 'menu-hint', 'CHOOSE WITH 1 / 2 / 3 OR CLICK A RELIC'));
    announce('Choose a relic. Use keys one, two, or three, or select a relic button.');
  } else if (phase === 'dead') {
    content = panel('THE EMBER FADES', 'Ashes, again.', 'Another life waits in the dark. The keep will change.');
    addStats(content);
    addRewards(content);
    const retry = button('Rekindle · new run', () => startRun(true));
    retry.disabled = profilePending;
    content.append(retry, element('p', 'menu-hint', `REACHED FLOOR ${game.floor} OF 3`));
    announce(`You fell on floor ${game.floor}. Select Rekindle to start a new run.`);
  } else if (phase === 'won') {
    content = panel('THE KEEP IS SILENT', 'Dawn, at last.', 'The keeper has fallen. You carried the fire all the way out.', 'victory-panel');
    addStats(content);
    addRewards(content);
    const retry = button('Return to the depths', () => startRun(true));
    retry.disabled = profilePending;
    content.append(retry, element('p', 'menu-hint', 'THREE FLOORS. ONE UNBROKEN EMBER.'));
    announce('Victory. The keeper has fallen. Select Return to the depths for a new run.');
  }
  if (content) {
    content.setAttribute('aria-busy', String(profilePending && ['talents', 'dead', 'won'].includes(phase)));
    overlay.append(content);
    content.scrollTop = previousScroll;
    requestAnimationFrame(() => {
      if (destroyed || !overlay.contains(content)) return;
      const retained = focusToken && [...content.querySelectorAll('button:not(:disabled)')].find((node) => node.dataset.talent === focusToken || node.dataset.stock === focusToken);
      (retained ?? content.querySelector('button:not(:disabled)') ?? content).focus({ preventScroll: Boolean(retained) });
    });
  } else if (wasOpen) {
    const target = previousFocus === canvas || !previousFocus?.isConnected ? canvas : previousFocus;
    target?.focus({ preventScroll: true });
    // Gameplay returns to the canvas even when a toolbar button opened the menu.
    canvas.focus({ preventScroll: true });
  }
}

function updateHud() {
  const player = game.player;
  const health = Math.max(0, Math.ceil(player.hp));
  const maxHealth = Math.max(1, Math.ceil(player.maxHp));
  byId('health-text').textContent = `${health} / ${maxHealth}`;
  byId('health-fill').style.width = `${Math.max(0, Math.min(100, health / maxHealth * 100))}%`;
  byId('health-meter').setAttribute('aria-valuenow', String(health));
  byId('health-meter').setAttribute('aria-valuemax', String(maxHealth));
  byId('flask-text').textContent = `${player.flasks} / ${player.maxFlasks} flasks`;
  byId('gold-text').textContent = String(game.gold);
  byId('ember-text').textContent = `${game.embers} embers`;
  byId('floor-name').textContent = `${String(game.floor).padStart(2, '0')} · ${['THE DROWNED KEEP', 'THE ASHEN HALLS', 'THE KEEPER’S DEPTH'][game.floor - 1] ?? 'THE DEEP'}`;
  byId('run-clock').textContent = minutes(game.time);
  byId('kill-text').textContent = `${game.kills} slain`;
  byId('seed-text').textContent = `SEED ${game.seed}`;
  const remaining = game.enemies.filter((enemy) => !enemy.dead && enemy.hp > 0).length;
  const locked = Boolean(game.world.exit.locked);
  byId('floor-objective').textContent = locked ? `${remaining} ${remaining === 1 ? 'enemy' : 'enemies'} remain · clear the floor` : 'GATE OPEN · press E at the exit';
  byId('floor-objective').classList.toggle('gate-open', !locked);
  document.querySelectorAll('[data-floor]').forEach((node) => {
    const floor = Number(node.dataset.floor);
    node.classList.toggle('current', floor === game.floor);
    node.classList.toggle('complete', floor < game.floor || game.mode === 'won');
    node.setAttribute('aria-label', `Floor ${floor}${floor === game.floor ? ', current' : floor < game.floor ? ', cleared' : ''}`);
  });
  byId('combo-badge').hidden = !started || game.combo < 2;
  byId('combo-value').textContent = String(game.combo);
}

function frame(timestamp) {
  if (destroyed) return;
  const dt = previousTime === undefined ? 0 : Math.min(MAX_FRAME, Math.max(0, (timestamp - previousTime) / 1000));
  previousTime = timestamp;
  const events = [];
  const running = started && !paused && !helpOpen && !talentsOpen && !inventoryOpen && game.mode === 'playing';
  if (running) {
    accumulator = Math.min(MAX_FRAME, accumulator + dt);
    while (accumulator >= STEP) {
      updateGame(game, input.sample(), STEP);
      events.push(...drainEvents(game));
      accumulator -= STEP;
      if (game.mode !== 'playing') { accumulator = 0; break; }
    }
    audio.play(events);
    audio.update(game, dt);
  } else accumulator = 0;
  syncOverlay();
  renderer.render(game, dt, events, { reducedMotion: motionQuery.matches, paused: !running });
  if (timestamp - lastHudTime >= 50 || events.length) { updateHud(); lastHudTime = timestamp; }
  frameId = requestAnimationFrame(frame);
}

const toolbarActions = [
  ['mute-button', toggleMute], ['help-button', toggleHelp], ['pause-button', togglePause], ['talent-button', toggleTalents], ['inventory-button', toggleInventory],
];
for (const [id, action] of toolbarActions) byId(id).addEventListener('click', () => { void audio.unlock(); action(); });

const menuKeyboard = (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (!event.repeat && (event.code === 'KeyI' || event.code === 'KeyT') && !/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) && !event.target.isContentEditable) {
    event.preventDefault();
    if (event.code === 'KeyI') toggleInventory(); else toggleTalents();
  }
  if (event.code === 'Enter' && !event.repeat && !started && !helpOpen && !talentsOpen && event.target.tagName !== 'BUTTON' && event.target.tagName !== 'A') {
    event.preventDefault();
    void audio.unlock();
    startRun();
  }
  if (game.mode === 'choice' && !helpOpen && !event.repeat && /^Digit[123]$/.test(event.code)) {
    const offer = game.offer[Number(event.code.slice(-1)) - 1];
    if (offer) { event.preventDefault(); void audio.unlock(); choose(offer.id); }
  }
  if (!overlay.hidden && !overlay.classList.contains('overlay-title') && event.key === 'Tab') {
    const buttons = [...overlay.querySelectorAll('button:not(:disabled), a[href]')];
    if (!buttons.length) { event.preventDefault(); overlay.firstChild?.focus(); return; }
    const first = buttons[0];
    const last = buttons.at(-1);
    if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  }
};
window.addEventListener('keydown', menuKeyboard);

const backgroundPause = () => {
  input.clear();
  if (started && game.mode === 'playing') {
    paused = true;
    accumulator = 0;
    syncOverlay();
  }
};
window.addEventListener('blur', backgroundPause);
const visibility = () => { if (document.hidden) backgroundPause(); };
document.addEventListener('visibilitychange', visibility);
const storageChanged = (event) => {
  if (event.key !== PROFILE_KEY && event.key !== null) return;
  profileStore.refresh();
  updateProfileNotice();
  syncOverlay();
};
window.addEventListener('storage', storageChanged);

function frozenCopy(value) {
  const copy = structuredClone(value);
  const freeze = (object) => {
    if (object && typeof object === 'object' && !Object.isFrozen(object)) {
      for (const child of Object.values(object)) freeze(child);
      Object.freeze(object);
    }
    return object;
  };
  return freeze(copy);
}

Object.defineProperty(window, '__EMBERWAKE__', {
  configurable: true,
  value: Object.freeze({
    get game() { return frozenCopy(game); },
    snapshot() { return frozenCopy({ started, paused, helpOpen, talentsOpen, inventoryOpen, profilePending, uniqueRunId, profile: profileStore.snapshot(), profileStatus: profileStore.status(), muted: audio.muted, reducedMotion: motionQuery.matches, game }); },
  }),
});

function destroy() {
  if (destroyed) return;
  destroyed = true;
  cancelAnimationFrame(frameId);
  input.destroy();
  renderer.destroy();
  void audio.destroy();
  window.removeEventListener('keydown', menuKeyboard);
  window.removeEventListener('blur', backgroundPause);
  document.removeEventListener('visibilitychange', visibility);
  window.removeEventListener('storage', storageChanged);
  delete window.__EMBERWAKE__;
}
window.addEventListener('pagehide', (event) => { if (event.persisted) backgroundPause(); else destroy(); }, { once: true });

updateProfileNotice();
syncOverlay();
updateHud();
frameId = requestAnimationFrame(frame);
