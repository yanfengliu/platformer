// Only ended lives and permanent talents cross the browser storage boundary.
export const PROFILE_VERSION = 1;
export const PROFILE_KEY = 'emberwake.profile';
export const MAX_SETTLED_RUNS = 128;
export const MAX_RUN_HISTORY = 16;
const MAX_EMBERS = 1_000_000_000;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value, maximum = MAX_EMBERS) => Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const runId = (value) => typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,128}$/.test(value);

function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}

export function createProfile(talents) {
  return freeze({ version: PROFILE_VERSION, embers: 0, ranks: Object.fromEntries(talents.map(({ id }) => [id, 0])), settledRunIds: [], history: [] });
}

function validateRun(value) {
  if (!isObject(value) || !runId(value.id) || !['dead', 'won'].includes(value.outcome) || !integer(value.embers) || !integer(value.seed, 0xffffffff) || !Number.isInteger(value.floor) || value.floor < 1 || value.floor > 3 || !integer(value.kills) || !Number.isFinite(value.time) || value.time < 0 || value.time > MAX_EMBERS) return null;
  return { id: value.id, outcome: value.outcome, embers: value.embers, seed: value.seed, floor: value.floor, kills: value.kills, time: value.time };
}

export function validateProfile(value, talents) {
  if (!isObject(value) || value.version !== PROFILE_VERSION || !integer(value.embers) || !isObject(value.ranks) || !Array.isArray(value.settledRunIds) || value.settledRunIds.length > MAX_SETTLED_RUNS || !Array.isArray(value.history) || value.history.length > MAX_RUN_HISTORY) return null;
  const known = new Set(talents.map(({ id }) => id));
  if (Object.keys(value.ranks).some((id) => !known.has(id))) return null;
  const ranks = {};
  for (const talent of talents) {
    const rank = Object.hasOwn(value.ranks, talent.id) ? value.ranks[talent.id] : 0;
    if (!integer(rank, talent.maxRank)) return null;
    ranks[talent.id] = rank;
  }
  for (const talent of talents) if (ranks[talent.id] > 0 && talent.requires.some((id) => !known.has(id) || ranks[id] < 1)) return null;
  const settledRunIds = [...value.settledRunIds];
  if (settledRunIds.some((id) => !runId(id)) || new Set(settledRunIds).size !== settledRunIds.length) return null;
  const history = value.history.map(validateRun);
  if (history.some((run) => !run || !settledRunIds.includes(run.id)) || new Set(history.map((run) => run.id)).size !== history.length) return null;
  return freeze({ version: PROFILE_VERSION, embers: value.embers, ranks, settledRunIds, history });
}

export function parseProfile(raw, talents) {
  const empty = createProfile(talents);
  if (raw === null || raw === undefined) return { kind: 'new', profile: empty };
  try {
    if (typeof raw !== 'string') return { kind: 'corrupt', profile: empty };
    const value = JSON.parse(raw);
    if (isObject(value) && Number.isInteger(value.version) && value.version !== PROFILE_VERSION) return { kind: 'unsupported', profile: empty };
    const profile = validateProfile(value, talents);
    return profile ? { kind: 'loaded', profile } : { kind: 'corrupt', profile: empty };
  } catch {
    return { kind: 'corrupt', profile: empty };
  }
}

export function talentAvailability(profile, id, talents) {
  const talent = talents.find((node) => node.id === id);
  if (!talent) return { available: false, reason: 'Unknown talent.' };
  const rank = profile.ranks[id];
  if (rank >= talent.maxRank) return { available: false, reason: 'Fully learned.' };
  const missing = talent.requires.filter((required) => profile.ranks[required] < 1);
  if (missing.length) return { available: false, reason: `Requires ${missing.map((required) => talents.find((node) => node.id === required)?.name ?? required).join(', ')}.` };
  if (profile.embers < talent.cost) return { available: false, reason: `Need ${talent.cost - profile.embers} more embers.` };
  return { available: true, reason: `${talent.cost} embers for the next rank.` };
}

export function purchaseTalent(profile, id, talents) {
  const validated = validateProfile(profile, talents);
  if (!validated) return { ok: false, profile, reason: 'This profile could not be validated.' };
  const availability = talentAvailability(validated, id, talents);
  if (!availability.available) return { ok: false, profile, reason: availability.reason };
  const talent = talents.find((node) => node.id === id);
  return { ok: true, profile: freeze({ ...validated, embers: validated.embers - talent.cost, ranks: { ...validated.ranks, [id]: validated.ranks[id] + 1 } }), reason: `${talent.name} learned. It applies to the next run.` };
}

export function settleRun(profile, result, talents) {
  const validated = validateProfile(profile, talents);
  const run = validateRun(result);
  if (!validated || !run) return { ok: false, awarded: 0, profile, reason: 'Only a valid ended run can earn embers.' };
  if (validated.settledRunIds.includes(run.id)) return { ok: false, awarded: 0, profile, reason: 'This life has already been settled.' };
  const awarded = Math.min(run.embers, MAX_EMBERS - validated.embers);
  return {
    ok: true,
    awarded,
    profile: freeze({ ...validated, embers: validated.embers + awarded, settledRunIds: [...validated.settledRunIds, run.id].slice(-MAX_SETTLED_RUNS), history: [...validated.history, run].slice(-MAX_RUN_HISTORY) }),
    reason: `${awarded} embers banked.`,
  };
}

/** IO stays here; storage failure never prevents a life or a session purchase. */
export function createProfileStore(talents, { getStorage = () => window.localStorage, getLocks = () => globalThis.navigator?.locks } = {}) {
  let storage;
  let kind;
  let profile = createProfile(talents);
  try {
    storage = getStorage();
    const parsed = parseProfile(storage.getItem(PROFILE_KEY), talents);
    profile = parsed.profile;
    kind = parsed.kind;
  } catch {
    kind = 'unavailable';
  }
  let locks;
  try { locks = getLocks(); } catch { /* A denied lock service uses fresh reads. */ }
  let concurrency = typeof locks?.request === 'function' ? 'browser-lock' : 'fresh-read';
  let pending = 0;
  const status = () => Object.freeze({
    kind,
    persistent: !['unavailable', 'unsupported'].includes(kind),
    concurrency,
    pending: pending > 0,
    message: kind === 'unsupported' ? 'Saved talents use an unsupported version. Embers and talents last only for this session; the saved profile is untouched.'
      : kind === 'unavailable' ? 'Storage is unavailable. Embers and talents last only for this session.'
        : kind === 'corrupt' ? 'Saved progression could not be read. Valid session progress will be saved after earning or spending embers.'
          : 'Talents and banked embers are saved on this browser.',
  });
  const refresh = () => {
    // Session-only modes remain so for this page; never replace their live progress.
    if (['unavailable', 'unsupported'].includes(kind)) return profile;
    try {
      const parsed = parseProfile(storage.getItem(PROFILE_KEY), talents);
      kind = parsed.kind;
      if (['new', 'loaded'].includes(kind)) profile = parsed.profile;
      // A newly corrupt value cannot erase already validated session progress.
    } catch {
      kind = 'unavailable';
    }
    return profile;
  };
  const apply = (operation) => {
    refresh();
    const result = operation(profile);
    if (!result.ok) return result;
    profile = result.profile;
    if (!['unavailable', 'unsupported'].includes(kind)) {
      try {
        storage.setItem(PROFILE_KEY, JSON.stringify(profile));
        kind = 'loaded';
      } catch {
        kind = 'unavailable';
      }
    }
    return result;
  };
  const transact = async (operation) => {
    pending++;
    try {
      if (concurrency === 'browser-lock') {
        let entered = false;
        try {
          return await locks.request(PROFILE_KEY, { mode: 'exclusive' }, () => { entered = true; return apply(operation); });
        } catch (error) {
          if (entered) throw error;
          concurrency = 'fresh-read';
        }
      }
      // Without Web Locks this prevents sequential stale writers. Simultaneous
      // read/write transactions from different tabs require the lock service.
      return apply(operation);
    } finally {
      pending--;
    }
  };
  return Object.freeze({ snapshot: () => profile, status, refresh, purchase: (id) => transact((current) => purchaseTalent(current, id, talents)), settle: (result) => transact((current) => settleRun(current, result, talents)) });
}
