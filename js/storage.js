/* Persistence + core state rules for Hydro-mon.
   Everything lives in one localStorage key so export/import is a single blob. */
const STORAGE_KEY = "hydromon.v1";
const OZ_PER_DISCOVERY = 100;
const TOTAL_POKEMON = 151;

function emptyState() {
  return {
    version: 1,
    lifetimeOz: 0,
    // Discoveries already handed out. Tracked separately from caught.length and
    // from lifetimeOz so that undoing a mistyped entry never revokes a Pokémon
    // and never lets the same milestone pay out twice.
    discoveriesGranted: 0,
    entries: [], // { id, oz, ts }
    caught: [],  // { dex, ts, milestone }
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
  state.discoveriesGranted = Math.max(
    Number(state.discoveriesGranted) || 0,
    state.caught.length
  );
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

/* Ounces still owed before the next Pokémon appears. Uses discoveriesGranted
   rather than lifetimeOz alone, so an undo pushes the next catch back out. */
function nextThreshold(state) {
  return (state.discoveriesGranted + 1) * OZ_PER_DISCOVERY;
}

function ozUntilNext(state) {
  return Math.max(0, nextThreshold(state) - state.lifetimeOz);
}

function progressToNext(state) {
  const earnedInBand = state.lifetimeOz - state.discoveriesGranted * OZ_PER_DISCOVERY;
  return Math.min(1, Math.max(0, earnedInBand / OZ_PER_DISCOVERY));
}

function ownedIds(state) {
  return new Set(state.caught.map((c) => c.dex));
}

/* How many discoveries are owed right now (0 when the dex is complete). */
function pendingDiscoveries(state) {
  const earned = Math.floor(state.lifetimeOz / OZ_PER_DISCOVERY);
  const owed = earned - state.discoveriesGranted;
  const room = TOTAL_POKEMON - state.caught.length;
  return Math.max(0, Math.min(owed, room));
}

/* Draw one Pokémon from the not-yet-owned pool. Returns null when complete. */
function drawPokemon(state) {
  const owned = ownedIds(state);
  const pool = POKEDEX.filter((p) => !owned.has(p.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
