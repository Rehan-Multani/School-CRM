import AsyncStorage from '@react-native-async-storage/async-storage';

// Last-known copy of read-only screen data (dashboard, timetable, lists…), so a
// screen opens with what it showed last time instead of a skeleton, and still
// works when the network is down. Memory first (instant on back/forward), disk
// behind it (survives an app restart).
//
// Never put credentials or short-lived signed URLs here. Entries belong to one
// signed-in account (`setCacheScope`) and everything is wiped on logout.

const PREFIX = 'schoolcrm.cache.v1:';
const INDEX_KEY = `${PREFIX}index`;
const MAX_ENTRIES = 80;
const MAX_ENTRY_CHARS = 200000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let scope = '';
const memory = new Map(); // storage key -> { at, data }
let index = null; // storage key -> saved-at, for pruning the oldest
let indexTimer = null;

const storageKey = (key) => `${PREFIX}${scope}:${key}`;

/** Whose data is cached: `ROLE:userId`, or '' when signed out (caching off). */
export function setCacheScope(next) {
  const value = next || '';
  if (value === scope) return;
  scope = value;
  memory.clear();
}

/** Synchronous, memory only — for a screen's very first render. */
export function peekCache(key) {
  if (!scope) return null;
  return memory.get(storageKey(key)) || null;
}

/** Memory, then disk. Resolves `{ at, data }` or null. */
export async function readCache(key) {
  if (!scope) return null;
  const k = storageKey(key);
  const hit = memory.get(k);
  if (hit) return hit;
  try {
    const raw = await AsyncStorage.getItem(k);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.at !== 'number' || Date.now() - entry.at > MAX_AGE_MS) return null;
    // The account may have changed while the disk read was running.
    if (k !== storageKey(key)) return null;
    if (!memory.has(k)) memory.set(k, entry);
    return memory.get(k);
  } catch {
    return null;
  }
}

async function loadIndex() {
  if (index) return index;
  try {
    index = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) || '{}') || {};
  } catch {
    index = {};
  }
  return index;
}

function saveIndexSoon() {
  if (indexTimer) return;
  indexTimer = setTimeout(() => {
    indexTimer = null;
    if (index) AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index)).catch(() => {});
  }, 2000);
}

async function track(k, at) {
  const idx = await loadIndex();
  idx[k] = at;
  const keys = Object.keys(idx);
  if (keys.length > MAX_ENTRIES) {
    const drop = keys.sort((a, b) => idx[a] - idx[b]).slice(0, keys.length - MAX_ENTRIES);
    for (const d of drop) {
      delete idx[d];
      memory.delete(d);
    }
    AsyncStorage.multiRemove(drop).catch(() => {});
  }
  saveIndexSoon();
}

export function writeCache(key, data) {
  if (!scope || data === undefined || data === null) return;
  const k = storageKey(key);
  const entry = { at: Date.now(), data };
  memory.set(k, entry);
  let raw;
  try {
    raw = JSON.stringify(entry);
  } catch {
    return;
  }
  // A huge response stays in memory only — never fill the phone's storage.
  if (raw.length > MAX_ENTRY_CHARS) return;
  AsyncStorage.setItem(k, raw)
    .then(() => track(k, entry.at))
    .catch(() => {});
}

/** Logout / session ended: nothing of the previous account stays on the phone. */
export async function clearCache() {
  memory.clear();
  index = {};
  if (indexTimer) clearTimeout(indexTimer);
  indexTimer = null;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(PREFIX));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {
    // storage unavailable — the memory copy is already gone
  }
}
