// Custom (user-authored) colorways — same JSON shape as the 72 presets:
//   { id, label, swatches: { base, mods, accent, accent2..accent8 }, override: { KC_*: zone } }
// so they round-trip through getKeyColors exactly like presets do.
//
// Persistence: localStorage (Supabase sync for signed-in users comes later in M2).
// A module-level registry mirrors the store's customColorways map so that
// colorways/index.js getColorway(id) can resolve custom ids synchronously
// without a circular import on the store.

const LS_KEY = 'keycap_custom_colorways_v1';

export function loadCustomColorways() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    // Drop malformed entries so one bad write can't crash render paths.
    const clean = {};
    for (const [id, cw] of Object.entries(parsed)) {
      if (cw && cw.swatches && cw.swatches.base && cw.swatches.base.background) clean[id] = cw;
    }
    return clean;
  } catch (e) {
    return {};
  }
}

let registry = loadCustomColorways();

export const getCustomColorway = (id) => registry[id];

// Single write path: update the sync registry AND localStorage together.
export function commitCustomColorways(map) {
  registry = map;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch (e) {
    // Quota/private-mode failures lose persistence but not the session.
  }
}

export const isCustomColorwayId = (id) => typeof id === 'string' && id.startsWith('custom_');

export function newCustomColorwayId() {
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Zones the editor can author. base/mods/accent always exist on a draft;
// accent2..accent8 are optional extras (matching what preset override maps use).
export const CORE_ZONES = ['base', 'mods', 'accent'];
export const EXTRA_ZONES = ['accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'accent7', 'accent8'];

// Build an editable draft from any colorway (preset or custom).
// Editing an existing custom keeps its id (save = update); anything else —
// or forceNew (duplicate) — gets a fresh custom id (save = create).
export function makeDraftFrom(source, { forceNew = false } = {}) {
  const src = source && source.swatches ? source : null;
  const base = src?.swatches.base || { background: '#eee2d0', color: '#363434' };
  const swatches = {
    base: { ...base },
    mods: { ...(src?.swatches.mods || base) },
    accent: { ...(src?.swatches.accent || src?.swatches.mods || base) },
  };
  if (src) {
    for (const z of EXTRA_ZONES) {
      if (src.swatches[z]) swatches[z] = { ...src.swatches[z] };
    }
  }
  const editingExisting = !forceNew && src && isCustomColorwayId(src.id);
  return {
    id: editingExisting ? src.id : newCustomColorwayId(),
    label: editingExisting ? src.label : src ? `${src.label} (custom)` : 'My Colorway',
    manufacturer: '',
    swatches,
    override: { ...(src?.override || {}) },
  };
}
