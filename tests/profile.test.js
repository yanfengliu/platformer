import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, validateProfile, parseProfile, purchaseTalent, settleRun, createProfileStore, PROFILE_KEY, MAX_SETTLED_RUNS, MAX_RUN_HISTORY } from '../src/profile.js';

// Bound: validated meta-only persistence, atomic purchases, ended-run deduplication,
// bounded history, and failing browser storage. This is not a browser flow test.
const talents = ['vigor', 'recovery', 'reserve', 'edge', 'tempo', 'execution', 'purse', 'fortune', 'barter'].map((id, index) => ({
  id, name: id, cost: [2, 3, 5][index % 3], maxRank: [3, 2, 1][index % 3], requires: index % 3 ? [['vigor', 'recovery', 'reserve', 'edge', 'tempo', 'execution', 'purse', 'fortune', 'barter'][index - 1]] : [],
}));
const life = (id, embers = 12) => ({ id, outcome: 'dead', embers, seed: 42, floor: 1, kills: 7, time: 35.25 });
const memoryStorage = () => {
  const entries = new Map();
  let writes = 0;
  return { entries, get writes() { return writes; }, getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); writes++; } };
};

test('purchase is atomic and checks funds, known IDs, prerequisites and rank limits', () => {
  const empty = createProfile(talents);
  assert.equal(purchaseTalent(empty, 'vigor', talents).ok, false);
  const rich = settleRun(empty, life('a', 40), talents).profile;
  assert.equal(purchaseTalent(rich, 'recovery', talents).ok, false);
  assert.equal(purchaseTalent(rich, '__proto__', talents).ok, false);
  let learned = purchaseTalent(rich, 'vigor', talents).profile;
  assert.equal(learned.embers, 38);
  assert.equal(rich.ranks.vigor, 0);
  assert.equal(purchaseTalent(learned, 'recovery', talents).ok, true);
  learned = purchaseTalent(purchaseTalent(learned, 'vigor', talents).profile, 'vigor', talents).profile;
  assert.equal(learned.ranks.vigor, 3);
  const refused = purchaseTalent(learned, 'vigor', talents);
  assert.equal(refused.ok, false);
  assert.equal(refused.profile, learned);
  assert.ok(Object.isFrozen(learned.ranks));
});

test('settlement awards once before and after reload and writes once per successful action', async () => {
  const storage = memoryStorage();
  const first = createProfileStore(talents, { getStorage: () => storage });
  assert.equal((await first.settle(life('unique-life'))).awarded, 12);
  assert.equal((await first.settle(life('unique-life'))).ok, false);
  assert.equal(storage.writes, 1);
  const reloaded = createProfileStore(talents, { getStorage: () => storage });
  assert.equal(reloaded.snapshot().embers, 12);
  assert.equal((await reloaded.settle(life('unique-life'))).ok, false);
  assert.equal((await reloaded.purchase('vigor')).ok, true);
  assert.equal(reloaded.snapshot().embers, 10);
  assert.equal(storage.writes, 2);
  assert.equal(JSON.parse(storage.entries.get(PROFILE_KEY)).ranks.vigor, 1);
});

test('history and deduplication are bounded and contain no live-run or arbitrary fields', () => {
  let profile = createProfile(talents);
  for (let index = 0; index < MAX_SETTLED_RUNS + 7; index++) profile = settleRun(profile, { ...life(`life-${index}`, 1), player: { hp: 500 }, world: {} }, talents).profile;
  assert.equal(profile.settledRunIds.length, MAX_SETTLED_RUNS);
  assert.equal(profile.history.length, MAX_RUN_HISTORY);
  assert.equal(profile.embers, MAX_SETTLED_RUNS + 7);
  assert.deepEqual(Object.keys(profile.history[0]), ['id', 'outcome', 'embers', 'seed', 'floor', 'kills', 'time']);
  assert.ok(validateProfile(profile, talents));
  assert.equal(settleRun(profile, { ...life('live'), outcome: 'playing' }, talents).ok, false);
  assert.equal(settleRun(profile, { ...life('bad'), embers: -1 }, talents).ok, false);
  assert.equal(settleRun(profile, { ...life('bad'), id: '' }, talents).ok, false);
});

test('corrupt JSON and invalid ranks recover without trusting arbitrary objects', async () => {
  for (const raw of ['{', 'null', '[]', JSON.stringify({ ...createProfile(talents), embers: -1 }), JSON.stringify({ ...createProfile(talents), ranks: { recovery: 1 } }), JSON.stringify({ ...createProfile(talents), ranks: { vigor: 4 } }), JSON.stringify({ ...createProfile(talents), ranks: { vigor: null } }), JSON.stringify({ ...createProfile(talents), ranks: { unexpected: 1 } })]) {
    const parsed = parseProfile(raw, talents);
    assert.equal(parsed.kind, 'corrupt');
    assert.equal(parsed.profile.embers, 0);
  }
  const storage = memoryStorage();
  storage.entries.set(PROFILE_KEY, '{');
  const recovered = createProfileStore(talents, { getStorage: () => storage });
  assert.equal(recovered.status().kind, 'corrupt');
  assert.equal(storage.writes, 0);
  await recovered.settle(life('recovered'));
  assert.equal(recovered.status().kind, 'loaded');
  assert.equal(parseProfile(storage.entries.get(PROFILE_KEY), talents).profile.embers, 12);
});

test('unsupported version stays byte-for-byte intact while session progression works', async () => {
  const storage = memoryStorage();
  const raw = '{ "version": 99, "embers": 812, "unknown": ["keep me"] }';
  storage.entries.set(PROFILE_KEY, raw);
  const future = createProfileStore(talents, { getStorage: () => storage });
  assert.equal(future.status().kind, 'unsupported');
  assert.equal(future.status().persistent, false);
  await future.settle(life('session'));
  assert.equal((await future.purchase('vigor')).ok, true);
  assert.equal(future.snapshot().embers, 10);
  assert.equal(storage.entries.get(PROFILE_KEY), raw);
  assert.equal(storage.writes, 0);
});

test('storage getter, reads and writes can fail without stopping session progression', async () => {
  for (const getStorage of [() => { throw new Error('blocked'); }, () => ({ getItem() { throw new Error('read blocked'); } }), () => ({ getItem: () => null, setItem() { throw new Error('quota'); } })]) {
    const store = createProfileStore(talents, { getStorage });
    assert.equal((await store.settle(life('a'))).ok, true);
    assert.equal(store.status().kind, 'unavailable');
    assert.match(store.status().message, /only for this session/);
    assert.equal((await store.settle(life('a'))).ok, false);
    assert.equal((await store.purchase('vigor')).ok, true);
    assert.equal(store.snapshot().embers, 10);
  }
});

test('fresh reads preserve another tab talent purchase and both ended-run rewards', async () => {
  const storage = memoryStorage();
  const first = createProfileStore(talents, { getStorage: () => storage, getLocks: () => undefined });
  const staleRun = createProfileStore(talents, { getStorage: () => storage, getLocks: () => undefined });
  await first.settle(life('first', 12));
  await first.purchase('vigor');
  assert.equal(staleRun.snapshot().ranks.vigor, 0);
  await staleRun.settle(life('second', 7));
  const saved = parseProfile(storage.getItem(PROFILE_KEY), talents).profile;
  assert.equal(saved.ranks.vigor, 1);
  assert.equal(saved.embers, 17);
  assert.deepEqual(saved.settledRunIds, ['first', 'second']);
  first.refresh();
  assert.equal(first.snapshot().embers, 17);
  assert.equal(first.status().concurrency, 'fresh-read');
});

test('exclusive lock transactions serialize simultaneous rewards and duplicate settlement', async () => {
  const storage = memoryStorage();
  let queue = Promise.resolve();
  const names = [];
  const locks = { request(name, options, callback) {
    names.push(name);
    assert.equal(options.mode, 'exclusive');
    const action = queue.then(callback);
    queue = action.catch(() => {});
    return action;
  } };
  const first = createProfileStore(talents, { getStorage: () => storage, getLocks: () => locks });
  const second = createProfileStore(talents, { getStorage: () => storage, getLocks: () => locks });
  const one = first.settle(life('one', 12));
  const two = second.settle(life('two', 8));
  assert.equal(first.status().pending, true);
  await Promise.all([one, two]);
  const duplicates = await Promise.all([first.settle(life('same', 5)), second.settle(life('same', 5))]);
  assert.equal(duplicates.filter((result) => result.ok).length, 1);
  assert.equal(parseProfile(storage.getItem(PROFILE_KEY), talents).profile.embers, 25);
  assert.equal(first.status().pending, false);
  assert.equal(first.status().concurrency, 'browser-lock');
  assert.deepEqual(names, [PROFILE_KEY, PROFILE_KEY, PROFILE_KEY, PROFILE_KEY]);
});

test('denied locks fall back safely and newly unsupported storage stays untouched', async () => {
  const storage = memoryStorage();
  const store = createProfileStore(talents, { getStorage: () => storage, getLocks: () => ({ request: async () => { throw new Error('denied'); } }) });
  await store.settle(life('one', 12));
  assert.equal(store.status().concurrency, 'fresh-read');
  const raw = '{"version":77,"untouched":true}';
  storage.entries.set(PROFILE_KEY, raw);
  await store.purchase('vigor');
  assert.equal(store.snapshot().ranks.vigor, 1);
  assert.equal(store.status().kind, 'unsupported');
  assert.equal(storage.entries.get(PROFILE_KEY), raw);
});
