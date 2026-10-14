import { createGame, updateGame, chooseUpgrade, drainEvents, clearActionBuffers } from './game.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';

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
let game = createGame(requestedSeed !== null && /^\d+$/.test(requestedSeed) ? Number(requestedSeed) >>> 0 : newSeed());
let started = false;
let paused = false;
let helpOpen = false;
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
  if (retry) game = createGame(newSeed());
  started = true;
  paused = false;
  helpOpen = false;
  accumulator = 0;
  previousTime = undefined;
  lastHudTime = -1;
  syncOverlay();
  updateHud();
  announce('Run started. Clear the enemies, choose a relic, then use E at the open gate.');
}

function togglePause() {
  if (helpOpen) { helpOpen = false; syncOverlay(); return; }
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

function helpPanel() {
  const content = panel('KNOW YOUR BLADE', 'The way through', 'A quick hand. A patient eye. Every enemy gives you a warning.', 'help-panel');
  const controls = element('dl', 'help-controls');
  for (const [keys, description] of [
    ['A / D or ← / →', 'Move'], ['Space / W / ↑', 'Jump; press again to double jump'],
    ['J / Left click', 'Tap or hold for 1–2–3; the amber third strike finishes'], ['K / Shift / Right click', 'Roll through attacks'],
    ['F', 'Drink a healing flask'], ['E', 'Take a relic or enter the open gate'],
    ['S / ↓ + Jump', 'Drop through a thin platform'], ['Escape', 'Pause / resume'], ['M / H', 'Mute / controls'],
  ]) {
    controls.append(element('dt', '', keys), element('dd', '', description));
  }
  content.append(controls, element('p', 'help-tip', 'Clear each floor to unlock its gate. Relics strengthen this life; death starts a fresh keep. Three floors end at the keeper.'));
  content.append(button('Back to the keep', () => { helpOpen = false; syncOverlay(); }));
  return content;
}

function syncOverlay() {
  const phase = helpOpen ? 'help' : !started ? 'title' : paused && game.mode === 'playing' ? 'paused' : game.mode;
  const key = phase === 'choice' ? `${phase}:${game.offer.map((offer) => offer.id).join(',')}` : phase;
  if (key === overlayKey) return;
  const wasOpen = overlayKey !== '' && overlayKey !== 'playing';
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
  byId('pause-button').textContent = paused ? 'Resume' : 'Pause';
  byId('help-button').setAttribute('aria-expanded', String(helpOpen));
  byId('hud').hidden = !started;
  byId('run-note').hidden = !started;

  let content;
  if (phase === 'help') content = helpPanel();
  else if (phase === 'title') {
    content = panel('A PIXEL-ART ROGUELIKE', 'EMBERWAKE', 'Beneath the drowned keep, an ember still burns.', 'title-panel');
    const sigil = element('span', 'title-sigil', '✦');
    sigil.setAttribute('aria-hidden', 'true');
    content.insertBefore(sigil, content.firstChild);
    content.append(element('p', 'title-description', 'Master the blade. Descend through shifting rooms. Die, rekindle, and try again.'));
    content.append(button('Enter the keep', () => startRun()));
    content.append(element('p', 'menu-hint', 'PRESS ENTER TO BEGIN'));
    content.append(button('How to play', toggleHelp, 'secondary-button'));
    const tags = element('div', 'title-tags');
    tags.append(element('span', '', 'PRECISE MOVEMENT'), element('span', '', 'WEIGHTY COMBAT'), element('span', '', 'ONE MORE RUN'));
    content.append(tags);
  } else if (phase === 'paused') {
    content = panel('CATCH YOUR BREATH', 'Fire on hold', 'The keep can wait. Your ember is safe.');
    content.append(button('Resume the run', togglePause), button('Controls', toggleHelp, 'secondary-button'));
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
    content.append(button('Rekindle · new run', () => startRun(true)), element('p', 'menu-hint', `REACHED FLOOR ${game.floor} OF 3`));
    announce(`You fell on floor ${game.floor}. Select Rekindle to start a new run.`);
  } else if (phase === 'won') {
    content = panel('THE KEEP IS SILENT', 'Dawn, at last.', 'The keeper has fallen. You carried the fire all the way out.', 'victory-panel');
    addStats(content);
    content.append(button('Return to the depths', () => startRun(true)), element('p', 'menu-hint', 'THREE FLOORS. ONE UNBROKEN EMBER.'));
    announce('Victory. The keeper has fallen. Select Return to the depths for a new run.');
  }
  if (content) {
    overlay.append(content);
    requestAnimationFrame(() => { if (!destroyed && overlay.contains(content)) content.querySelector('button')?.focus({ preventScroll: true }); });
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
  const running = started && !paused && !helpOpen && game.mode === 'playing';
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
  ['mute-button', toggleMute], ['help-button', toggleHelp], ['pause-button', togglePause],
];
for (const [id, action] of toolbarActions) byId(id).addEventListener('click', () => { void audio.unlock(); action(); });

const menuKeyboard = (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === 'Enter' && !event.repeat && !started && !helpOpen && event.target.tagName !== 'BUTTON' && event.target.tagName !== 'A') {
    event.preventDefault();
    void audio.unlock();
    startRun();
  }
  if (game.mode === 'choice' && !helpOpen && !event.repeat && /^Digit[123]$/.test(event.code)) {
    const offer = game.offer[Number(event.code.slice(-1)) - 1];
    if (offer) { event.preventDefault(); void audio.unlock(); choose(offer.id); }
  }
  if (!overlay.hidden && event.key === 'Tab') {
    const buttons = [...overlay.querySelectorAll('button:not(:disabled), a[href]')];
    if (!buttons.length) return;
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
    snapshot() { return frozenCopy({ started, paused, helpOpen, muted: audio.muted, reducedMotion: motionQuery.matches, game }); },
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
  delete window.__EMBERWAKE__;
}
window.addEventListener('pagehide', (event) => { if (event.persisted) backgroundPause(); else destroy(); }, { once: true });

syncOverlay();
updateHud();
frameId = requestAnimationFrame(frame);
