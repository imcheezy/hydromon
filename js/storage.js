/* Persistence + core state rules for Hydro-mon.
   Everything lives in one localStorage key so export/import is a single blob. */
const STORAGE_KEY = "hydromon.v1";
const TOTAL_POKEMON = 151;

/* Discovery difficulty: oz needed per catch. A named preset rather than a
   free-form slider, since there are only three sane values and a segmented
   control is far less fiddly than a drag slider on a phone. */
const THRESHOLDS = { easy: 48, medium: 64, hard: 100 };
const DEFAULT_DIFFICULTY = "medium";

function emptyState() {
  return {
    version: 2,
    lifetimeOz: 0,
    // Oz banked toward the next catch at the *current* difficulty. Kept as
    // its own running meter (rather than derived from lifetimeOz / a fixed
    // divisor) so that changing difficulty only affects catches going
    // forward — it can't retroactively grant or erase discoveries, and
    // undoing a mistyped entry never revokes a Pokémon.
    catchMeterOz: 0,
    difficulty: DEFAULT_DIFFICULTY,
    entries: [], // { id, oz, ts }
    caught: [],  // { dex, ts, milestone } — milestone is lifetimeOz at catch time
    dailyGoal: 64
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return migrate(JSON.parse(raw));
  } catch (err) {
    console.warn("Could not read saved data, starting fresh.", err);
    return emptyState();
  }
}

function migrate(data) {
  const state = Object.assign(emptyState(), data || {});
  state.entries = Array.isArray(state.entries) ? state.entries : [];
  state.caught = Array.isArray(state.caught) ? state.caught : [];
  state.lifetimeOz = Number(state.lifetimeOz) || 0;

  const isLegacy = !data || !Object.prototype.hasOwnProperty.call(data, "catchMeterOz");
  if (isLegacy) {
    // Pre-difficulty saves granted a catch every fixed 100oz via a
    // discoveriesGranted counter. Convert its banked remainder into the new
    // meter so migrating neither loses nor duplicates progress.
    const legacyGranted = Math.max(Number((data || {}).discoveriesGranted) || 0, state.caught.length);
    state.catchMeterOz = Math.max(0, state.lifetimeOz - legacyGranted * 100);
    state.difficulty = DEFAULT_DIFFICULTY;
  } else {
    state.catchMeterOz = Math.max(0, Number(state.catchMeterOz) || 0);
    state.difficulty = THRESHOLDS[state.difficulty] ? state.difficulty : DEFAULT_DIFFICULTY;
  }
  delete state.discoveriesGranted;
  state.version = 2;
  return state;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error("Could not save data.", err);
    return false;
  }
}

/* ---- derived values ---- */

function dayKey(ts) {
  const d = new Date(ts);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function todayOz(state) {
  const today = dayKey(Date.now());
  return state.entries
    .filter((e) => dayKey(e.ts) === today)
    .reduce((sum, e) => sum + e.oz, 0);
}

function todayEntries(state) {
  const today = dayKey(Date.now());
  return state.entries.filter((e) => dayKey(e.ts) === today).reverse();
}

function thresholdFor(state) {
  return THRESHOLDS[state.difficulty] || THRESHOLDS[DEFAULT_DIFFICULTY];
}

function ozUntilNext(state) {
  return Math.max(0, thresholdFor(state) - state.catchMeterOz);
}

function progressToNext(state) {
  const t = thresholdFor(state);
  return Math.min(1, Math.max(0, state.catchMeterOz / t));
}

function ownedIds(state) {
  return new Set(state.caught.map((c) => c.dex));
}

/* Draw one Pokémon from the not-yet-owned pool. Returns null when complete. */
function drawPokemon(state) {
  const owned = ownedIds(state);
  const pool = POKEDEX.filter((p) => !owned.has(p.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
