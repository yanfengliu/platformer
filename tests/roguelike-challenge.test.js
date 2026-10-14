// Bound: pinned old held-attack policy at seed 0, unmodified fresh runs and
// 50ms tactical decisions at seeds 0/1/42/1234, each within the original 300s.
// Set EMBERWAKE_ROGUE_SOURCE to baseline src to prove the reported easy class red.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { playRun } from './helpers/run-policy.js';
const core = await import(process.env.EMBERWAKE_ROGUE_SOURCE ? pathToFileURL(resolve(process.env.EMBERWAKE_ROGUE_SOURCE, 'game.js')).href : '../src/game.js');

test('the original seed-0 holding-attack policy must spend healing or lose under tactical pressure', () => {
  const run = playRun(core, 0);
  // These are independent recorded outcomes, not a bound derived from content.
  // Original baseline: won in61.57s, 8contacts, no heals, all3flasks remaining.
  assert.ok(run.game.mode === 'dead' || (run.damages >= 20 && run.healed >= 5), `naive ${run.game.mode}: ${run.damages} contacts and ${run.healed} heals do not demonstrate the required pressure`);
  if (run.game.mode === 'won') assert.ok(run.game.player.flasks <= 1, 'holding attack must spend most of its healing reserve on the pinned seed');
});

test('50ms input decisions can complete four fresh seeds with dodge, jumps, gear and finite purchases', { skip: Boolean(process.env.EMBERWAKE_ROGUE_SOURCE) }, () => {
  for (const seed of [0, 1, 42, 1234]) {
    const run = playRun(core, seed, true);
    assert.equal(run.game.mode, 'won', `seed${seed}: ${JSON.stringify(run.trace.slice(-10))}`);
    assert.equal(run.game.floor, 3);
    assert.equal(run.game.kills, 29);
    assert.equal(run.choices, 3);
    assert.ok(run.game.time < 300);
    assert.ok(run.rolls > 0 && run.jumps > 0);
    assert.ok(run.loot > 0 && run.purchases > 0);
    assert.ok(run.damages < 10, 'readable telegraphs must permit a large improvement over held attack');
    assert.ok(run.game.embers >= 20, 'completed runs earn meaningful progression currency');
  }
});
