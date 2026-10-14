// Bounds: seed-1234, 120Hz production core and Canvas draw commands at 640x360;
// released taps 50ms into each recovery, held strikes, interruption and mocked
// DOM/WebAudio cancellation. Raster quality, actual browser controls and viewport
// layout remain separate headless acceptance gates. Optional source replays the
// pinned pre-repair modules without altering the implementation under test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordingCanvas, ribbonThickness } from './helpers/recording-canvas.js';

const source = (name) => process.env.EMBERWAKE_COMBO_SOURCE
  ? pathToFileURL(resolve(process.env.EMBERWAKE_COMBO_SOURCE, name)).href : `../src/${name}`;
const core = await import(source('game.js'));
const { createRenderer } = await import(source('render.js'));
const { createInput } = await import(source('input.js'));
const { createAudio } = await import(source('audio.js'));
const STEP = 1 / 120;
const { createGame, updateGame, drainEvents } = core;

function isolated() {
  const game = createGame(1234);
  game.enemies = [];
  game.world = { width: 640, height: 360, platforms: [{ x: 0, y: 230, w: 640, h: 130 }], pickups: [], rooms: [], exit: { x: 600, y: 186, w: 24, h: 44, locked: true } };
  Object.assign(game.player, { x: 251, y: 196 });
  return game;
}
function advance(game, frames, input = {}, events = []) {
  for (let i = 0; i < frames; i++) {
    updateGame(game, i === 0 ? input : { ...input, attackPressed: false, rollPressed: false }, STEP);
    events.push(...drainEvents(game));
  }
  return events;
}
function attacks(events) { return events.filter(event => event.type === 'attack'); }
function queuedStrike() {
  const game = isolated();
  advance(game, 6, { attackPressed: true });
  advance(game, 1, { attackPressed: true });
  assert.ok(game.player.attackBuffer > 0, 'the released second tap must queue one strike');
  return game;
}

test('released early taps queue one next sword strike through all three recoveries', () => {
  for (const attackSpeed of [1, 1.2]) {
    const game = isolated();
    game.stats.attackSpeed = attackSpeed;
    const events = advance(game, 1, { attackPressed: true });
    for (const stage of [2, 3, 1]) {
      advance(game, 6, {}, events);
      advance(game, 1, { attackPressed: true }, events);
      const before = game.player.swing;
      for (let frame = 0; frame < 60 && game.player.swing === before; frame++) advance(game, 1, {}, events);
      assert.equal(game.player.swing, before + 1, `a 50ms tap must survive stage ${game.player.combo}'s recovery`);
      assert.equal(game.player.combo, stage);
    }
    assert.deepEqual(attacks(events).map(event => event.stage), [1, 2, 3, 1]);
    assert.deepEqual(attacks(events).map(event => event.amount), [1, 2, 3, 1], 'keep the existing attack amount contract');
    assert.equal(game.combo, 0, 'sword stages must not become a kill chain');
    advance(game, 90, {}, events);
    assert.equal(attacks(events).length, 4, 'released queued taps must not keep attacking');
  }
});

test('multiple early taps occupy one slot and holding cycles without changing recovery', () => {
  const tapped = queuedStrike();
  advance(tapped, 1, { attackPressed: true });
  advance(tapped, 1, { attackPressed: true });
  const events = advance(tapped, 120);
  assert.equal(attacks(events).length, 1, 'a burst of taps queues one strike, not a list');
  assert.equal(tapped.player.swing, 2);
  const held = isolated();
  const starts = [];
  for (let frame = 0; frame < 144; frame++) {
    for (const event of attacks(advance(held, 1, { attackHeld: true }))) starts.push({ frame, stage: event.stage });
  }
  assert.deepEqual(starts.map(event => event.stage), [1, 2, 3, 1]);
  for (let i = 1; i < starts.length; i++) {
    const expected = [.33, .35, .44][i - 1];
    assert.ok(Math.abs((starts[i].frame - starts[i - 1].frame) * STEP - expected) <= STEP + 1e-8, 'original sword recovery must remain within one simulation step');
  }
});

test('combo window expires and the next deliberate stroke starts at one', () => {
  const game = isolated();
  advance(game, 103, { attackPressed: true });
  assert.equal(game.player.comboWindow, 0);
  assert.equal(game.player.combo, 0, 'expired stage feedback must reset');
  const events = advance(game, 1, { attackPressed: true });
  assert.equal(attacks(events)[0].stage, 1);
});

test('rolling cancels a queued strike and taps during the roll are discarded', () => {
  const game = queuedStrike();
  advance(game, 1, { rollPressed: true });
  assert.ok(game.player.rollTime > 0);
  assert.equal(game.player.attackBuffer, 0);
  assert.equal(game.player.comboWindow, 0);
  assert.equal(game.player.combo, 0);
  advance(game, 27);
  advance(game, 1, { attackPressed: true });
  const events = advance(game, 72);
  assert.equal(attacks(events).length, 0, 'a released tap in roll recovery must not attack afterward');
  assert.equal(attacks(advance(game, 1, { attackPressed: true }))[0].stage, 1);
});

test('actual projectile damage cancels a queued strike and hurt taps are discarded', () => {
  const game = queuedStrike();
  game.projectiles.push({ x: game.player.x, y: game.player.y, w: 9, h: 5, vx: 0, vy: 0, damage: 12, life: 1 });
  const damage = advance(game, 1);
  assert.equal(game.player.hp, 88, 'the cancellation must come from actual damage');
  assert.ok(damage.some(event => event.type === 'damage'));
  assert.equal(game.player.attackBuffer, 0);
  assert.equal(game.player.comboWindow, 0);
  assert.equal(game.player.combo, 0);
  advance(game, 30);
  assert.ok(game.player.hurtTime > 0);
  advance(game, 1, { attackPressed: true });
  assert.equal(attacks(advance(game, 90)).length, 0);
  assert.equal(attacks(advance(game, 1, { attackPressed: true }))[0].stage, 1);
});

test('external cancellation removes queued and hit-stop edges while preserving an active sword pose', () => {
  const game = queuedStrike();
  const { combo, attackTime, attackDuration } = game.player;
  game.hitStop = .04;
  advance(game, 1, { attackPressed: true });
  assert.equal(game.pendingInput.attackPressed, true);
  assert.equal(typeof core.clearActionBuffers, 'function');
  core.clearActionBuffers(game);
  assert.deepEqual({ combo: game.player.combo, attackTime: game.player.attackTime, attackDuration: game.player.attackDuration }, { combo, attackTime, attackDuration });
  assert.equal(game.pendingInput, null);
  assert.equal(game.player.comboWindow, 0);
  assert.equal(attacks(advance(game, 120)).length, 0);
  assert.equal(attacks(advance(game, 1, { attackPressed: true }))[0].stage, 1);
});

test('hits carry explicit sword stage while amount remains actual damage', () => {
  for (const [stage, amount] of [[1, 19], [2, 23], [3, 34]]) {
    const game = isolated();
    while (game.player.swing < stage) advance(game, 1, { attackHeld: true });
    const enemy = createGame(1234).enemies[0];
    Object.assign(enemy, { x: game.player.x + 30, y: game.player.y, hp: 1000, maxHp: 1000, cooldown: 10 });
    game.enemies = [enemy];
    const hit = advance(game, 16).find(event => event.type === 'hit');
    assert.ok(hit, 'a real sword contact must emit damage');
    assert.equal(hit.stage, stage);
    assert.equal(hit.amount, amount);
    assert.equal(enemy.hp, 1000 - amount);
  }
});

function render(game, events = [], options = {}) {
  const canvas = recordingCanvas();
  const renderer = createRenderer(canvas);
  try { renderer.render(game, 0, events, options); return canvas.draws; }
  finally { renderer.destroy(); }
}
function dimensions(draw) { return [draw.points[1][0] - draw.points[0][0], draw.points[3][1] - draw.points[0][1]]; }

test('empty-space sword stages render distinct slashes and one/two/three numbered steps', () => {
  const game = isolated();
  const slashes = [];
  for (const [stage, color] of [[1, '#98fff0'], [2, '#5ae8e1'], [3, '#ffc36e']]) {
    while (game.player.swing < stage) advance(game, 1, { attackHeld: true });
    advance(game, 10);
    const draws = render(game);
    const slash = draws.find(draw => draw.color === color && ['raster', 'vector'].includes(draw.kind));
    assert.ok(slash, `stage ${stage} must draw its distinct blade-aligned slash without a hit`);
    slashes.push(slash);
    const cue = draws.find(draw => draw.color === '#0e252b' && dimensions(draw)[0] === 46);
    assert.ok(cue, `stage ${stage} must draw the actor-local numbered indicator`);
    const bars = draws.filter(draw => draw.color === color && dimensions(draw)[0] === 8 && dimensions(draw)[1] === 2);
    assert.equal(bars.length, stage, 'the lit step count must match the actual sword stage');
    assert.equal(dimensions(cue)[1], stage === 3 ? 26 : 17, 'the finisher adds its text beneath the three steps');
  }
  assert.ok(ribbonThickness(slashes[2]) >= ribbonThickness(slashes[0]) + 2, 'the finisher ribbon must be visibly wider while its leading edge stays on the blade');
  advance(game, 110);
  assert.equal(render(game).some(draw => draw.color === '#0e252b'), false, 'the indicator must disappear after timeout');
});

test('reduced motion retains finisher slash and steps while cutting empty-space sparks', () => {
  const game = isolated();
  let finisher;
  for (let frame = 0; frame < 120 && !finisher; frame++) finisher = attacks(advance(game, 1, { attackHeld: true })).find(event => event.amount === 3);
  assert.ok(finisher, 'held input must reach an actual third-stroke event');
  advance(game, 12);
  const normal = render(game, [finisher]);
  const reduced = render(game, [finisher], { reducedMotion: true });
  const essential = draws => draws.filter(draw => (draw.color === '#ffc36e' && ['raster', 'vector'].includes(draw.kind)) || draw.color === '#0e252b');
  assert.deepEqual(essential(reduced), essential(normal), 'essential stage/weapon feedback must remain identical');
  const sparks = draws => draws.filter(draw => ['#ffc36e', '#fff0bd', '#ed9b45'].includes(draw.color) && draw.points.length === 4 && dimensions(draw)[0] <= 3 && draw.points[0][1] > 200);
  assert.ok(sparks(normal).length >= 8, 'an actual third-stroke event must add sparks without an enemy contact');
  assert.ok(sparks(reduced).length >= 2 && sparks(reduced).length < sparks(normal).length, 'reduced motion keeps a smaller bounded spark cue');
});

test('finisher hit sparks use stage metadata without relabeling damage', () => {
  const game = isolated();
  const contact = { type: 'hit', x: 310, y: 215, direction: 1, amount: 34 };
  const ordinary = render(game, [{ ...contact, stage: 1 }], { reducedMotion: true });
  const finisher = render(game, [{ ...contact, stage: 3 }], { reducedMotion: true });
  assert.ok(finisher.some(draw => draw.color === '#ffc36e'), 'stage-three contact must have amber sparks');
  assert.equal(ordinary.some(draw => draw.color === '#ffc36e'), false);
  assert.deepEqual(finisher.filter(draw => draw.color === '#f8edbb'), ordinary.filter(draw => draw.color === '#f8edbb'), 'the displayed amount must remain the damage value');
});

test('production input clear hooks cancel simulation queues on pause, blur and hidden document', () => {
  const previous = Object.fromEntries(['window', 'document', 'HTMLElement'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  class Element extends EventTarget { tagName = 'CANVAS'; focus() {} }
  const windowTarget = new EventTarget();
  const documentTarget = Object.assign(new EventTarget(), { hidden: false });
  Object.assign(globalThis, { window: windowTarget, document: documentTarget, HTMLElement: Element });
  const canvas = new Element();
  const game = isolated();
  const input = createInput(canvas, { onClear: () => core.clearActionBuffers(game) });
  const key = (type) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code: 'KeyJ', repeat: false });
    windowTarget.dispatchEvent(event);
  };
  try {
    for (const cancel of [() => input.setEnabled(false), () => windowTarget.dispatchEvent(new Event('blur')), () => { documentTarget.hidden = true; documentTarget.dispatchEvent(new Event('visibilitychange')); }]) {
      documentTarget.hidden = false;
      input.setEnabled(true);
      key('keydown'); updateGame(game, input.sample(), STEP); drainEvents(game); key('keyup');
      advance(game, 6);
      key('keydown'); updateGame(game, input.sample(), STEP); drainEvents(game); key('keyup');
      assert.ok(game.player.attackBuffer > 0);
      cancel();
      assert.equal(game.player.attackBuffer, 0, 'input cancellation must reach the already-sampled simulation queue');
      assert.equal(input.sample().attackHeld, false);
      assert.equal(attacks(advance(game, 120)).length, 0);
    }
  } finally {
    input.destroy();
    for (const [key, descriptor] of Object.entries(previous)) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
});

test('sword audio distinguishes stages and remains silent until unlock or while muted/paused', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const starts = [];
  class AudioContext {
    state = 'running'; currentTime = 0; sampleRate = 120; destination = {};
    node() { const node = { connect: () => node, disconnect() {}, start() {}, stop() {} }; return node; }
    param() { return { value: 0, setValueAtTime(value) { this.value = value; }, setTargetAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }; }
    createGain() { return Object.assign(this.node(), { gain: this.param() }); }
    createOscillator() { const node = Object.assign(this.node(), { frequency: this.param() }); node.start = () => starts.push(node.frequency.value); return node; }
    createBuffer() { return { duration: 1, getChannelData: () => new Float32Array(120) }; }
    createBufferSource() { return this.node(); }
    createBiquadFilter() { return Object.assign(this.node(), { frequency: this.param() }); }
    async close() { this.state = 'closed'; }
  }
  globalThis.window = { AudioContext };
  const audio = createAudio();
  try {
    audio.setPaused(false);
    audio.play([{ type: 'attack', stage: 3 }]);
    assert.deepEqual(starts, [], 'audio must wait for the user gesture unlock');
    await audio.unlock();
    starts.length = 0;
    const signatures = [1, 2, 3].map(stage => { starts.length = 0; audio.play([{ type: 'attack', stage }]); return [...starts]; });
    assert.equal(new Set(signatures.map(value => JSON.stringify(value))).size, 3, 'all three sword stages need distinct synthesized sound');
    assert.ok(signatures[2].length > signatures[0].length, 'the finisher has an additional accent');
    starts.length = 0;
    audio.setMuted(true); audio.play([{ type: 'attack', stage: 3 }]);
    audio.setMuted(false); audio.setPaused(true); audio.play([{ type: 'attack', stage: 3 }]);
    assert.deepEqual(starts, []);
  } finally {
    await audio.destroy();
    if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window;
  }
});
