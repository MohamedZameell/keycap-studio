// GMK-style colorway presets
// Imported from keysim project — 73 curated colorways
//
// Bundle strategy:
// - The 27 'Popular' colorways are imported eagerly so they're available
//   the moment Studio opens (getKeyColors is called sync inside Keycap
//   render and we don't want to fall back to default colors).
// - The 46 'More' colorways are loaded lazily via Vite's import.meta.glob.
//   Call warmupExtraColorways() once when the colorway picker UI opens
//   (or just after Studio mount) to pre-fetch all of them in parallel.
//   By the time the user clicks one, it's in the in-memory cache.

// === EAGER: Popular tier (27) ===
import olivia from './colorway_olivia.json';
import _8008 from './colorway_8008.json';
import nautilus from './colorway_nautilus.json';
import botanical from './colorway_botanical.json';
import carbon from './colorway_carbon.json';
import bento from './colorway_bento.json';
import mizu from './colorway_mizu.json';
import laser from './colorway_laser.json';
import miami from './colorway_miami.json';
import nord from './colorway_nord.json';
import vaporwave from './colorway_vaporwave.json';
import oblivion from './colorway_oblivion.json';
import _9009 from './colorway_9009.json';
import wob from './colorway_wob.json';
import bow from './colorway_bow.json';
import minimal from './colorway_minimal.json';
import modern_dolch from './colorway_modern_dolch.json';
import serika from './colorway_serika.json';
import taro from './colorway_taro.json';
import cafe from './colorway_cafe.json';
import camping from './colorway_camping.json';
import red_samurai from './colorway_red_samurai.json';
import blue_samurai from './colorway_blue_samurai.json';
import striker from './colorway_striker.json';
import hyperfuse from './colorway_hyperfuse.json';
import terminal from './colorway_terminal.json';
import honeywell from './colorway_honeywell.json';
import sumi from './colorway_sumi.json';

const POPULAR = {
  olivia,
  '8008': _8008,
  nautilus,
  botanical,
  carbon,
  bento,
  mizu,
  laser,
  miami,
  nord,
  vaporwave,
  oblivion,
  '9009': _9009,
  wob,
  bow,
  minimal,
  modern_dolch,
  serika,
  taro,
  cafe,
  camping,
  red_samurai,
  blue_samurai,
  striker,
  hyperfuse,
  terminal,
  honeywell,
  sumi,
};

// === LAZY: More tier (46) ===
// Explicit dynamic imports — one per file. Listing them by hand (instead of
// import.meta.glob) means Vite only emits chunks for these 46 files, not all 73.
// (The glob would also match the popular files we already eager-imported above,
// causing them to be bundled twice.)
const EXTRA_LOADERS = {
  '1976': () => import('./colorway_1976.json'),
  '80082': () => import('./colorway_80082.json'),
  'amalfi': () => import('./colorway_amalfi.json'),
  'ashes': () => import('./colorway_ashes.json'),
  'aurora_polaris': () => import('./colorway_aurora_polaris.json'),
  'blacklight': () => import('./colorway_blacklight.json'),
  'bobafett': () => import('./colorway_bobafett.json'),
  'bread': () => import('./colorway_bread.json'),
  'bushido': () => import('./colorway_bushido.json'),
  'deku': () => import('./colorway_deku.json'),
  'demonic': () => import('./colorway_demonic.json'),
  'dmg': () => import('./colorway_dmg.json'),
  'finer_things': () => import('./colorway_finer_things.json'),
  'gregory': () => import('./colorway_gregory.json'),
  'hammerhead': () => import('./colorway_hammerhead.json'),
  'handarbeit': () => import('./colorway_handarbeit.json'),
  'heavy_industry': () => import('./colorway_heavy_industry.json'),
  'islander': () => import('./colorway_islander.json'),
  'jamon': () => import('./colorway_jamon.json'),
  'kaiju': () => import('./colorway_kaiju.json'),
  'lunar': () => import('./colorway_lunar.json'),
  'mecha': () => import('./colorway_mecha.json'),
  'metropolis': () => import('./colorway_metropolis.json'),
  'milkshake': () => import('./colorway_milkshake.json'),
  'modern_dolch_light': () => import('./colorway_modern_dolch_light.json'),
  'muted': () => import('./colorway_muted.json'),
  'nautilus_nightmares': () => import('./colorway_nautilus_nightmares.json'),
  'night_runner': () => import('./colorway_night_runner.json'),
  'night_sakura': () => import('./colorway_night_sakura.json'),
  'noire': () => import('./colorway_noire.json'),
  'nuclear_data': () => import('./colorway_nuclear_data.json'),
  'pastel': () => import('./colorway_pastel.json'),
  'peaches_cream': () => import('./colorway_peaches_cream.json'),
  'pluto': () => import('./colorway_pluto.json'),
  'pono': () => import('./colorway_pono.json'),
  'port': () => import('./colorway_port.json'),
  'prepress': () => import('./colorway_prepress.json'),
  'rainy_day': () => import('./colorway_rainy_day.json'),
  'shoko': () => import('./colorway_shoko.json'),
  'skeletor': () => import('./colorway_skeletor.json'),
  'space_cadet': () => import('./colorway_space_cadet.json'),
  'vilebloom': () => import('./colorway_vilebloom.json'),
  'yuri': () => import('./colorway_yuri.json'),
};

const EXTRA_IDS = Object.keys(EXTRA_LOADERS);

// In-memory cache of resolved colorways from the lazy tier.
const extraCache = {};
let warmupPromise = null;

// Pre-fetch every 'More' tier colorway in parallel. Idempotent — safe to call multiple times.
// Returns a Promise that resolves when all are loaded (or when individual loads fail silently).
export function warmupExtraColorways() {
  if (warmupPromise) return warmupPromise;
  warmupPromise = Promise.all(
    EXTRA_IDS.map(async (id) => {
      if (extraCache[id]) return;
      const loader = EXTRA_LOADERS[id];
      if (!loader) return;
      try {
        const mod = await loader();
        extraCache[id] = mod.default || mod;
      } catch (e) {
        // Keep going; one missing colorway shouldn't poison the rest.
      }
    })
  );
  return warmupPromise;
}

// Public dictionary of all colorway ids (popular first, then extras).
// For 'More' tier entries the value is whatever's in the cache; if not yet
// loaded, the entry exists but is undefined — getColorway() falls back to olivia.
export const COLORWAYS = new Proxy({}, {
  get(_, key) {
    if (Object.prototype.hasOwnProperty.call(POPULAR, key)) return POPULAR[key];
    return extraCache[key];
  },
  has(_, key) {
    return Object.prototype.hasOwnProperty.call(POPULAR, key) || EXTRA_IDS.includes(key);
  },
  ownKeys() {
    return [...Object.keys(POPULAR), ...EXTRA_IDS];
  },
  getOwnPropertyDescriptor(_, key) {
    if (Object.prototype.hasOwnProperty.call(POPULAR, key) || EXTRA_IDS.includes(key)) {
      return { enumerable: true, configurable: true, value: this.get(_, key) };
    }
    return undefined;
  },
});

// Get colorway by id. Returns olivia as a stable fallback if the id is from
// the lazy tier and warmup hasn't completed yet (or if the id is unknown).
export const getColorway = (id) => {
  if (Object.prototype.hasOwnProperty.call(POPULAR, id)) return POPULAR[id];
  if (extraCache[id]) return extraCache[id];
  return POPULAR.olivia;
};

// Modifier key labels (keys that should use mods color)
const MOD_LABELS = [
  'Backspace', 'Tab', 'Enter', 'Caps Lock', 'Shift', 'Ctrl', 'Control',
  'Alt', 'Win', 'Super', 'Fn', 'Menu', 'Space', '', // empty is spacebar
  '←', '→', '↑', '↓', 'Left', 'Right', 'Up', 'Down',
  'PgUp', 'PgDn', 'Home', 'End', 'Ins', 'Del', 'Delete', 'Insert',
  'PrtSc', 'ScrLk', 'Pause', 'NumLk',
  'Ent', '+', '-', '*', '/', 'Num'
];

// Accent key labels
const ACCENT_LABELS = ['Esc', 'Escape'];

// Determine key type based on label
export const getKeyType = (label) => {
  if (!label) return 'mod'; // spacebar
  if (ACCENT_LABELS.includes(label)) return 'accent';
  if (MOD_LABELS.includes(label)) return 'mod';
  if (label.startsWith('F') && !isNaN(label.slice(1))) return 'mod'; // F1-F12
  return 'base';
};

// Get colors for a specific key based on colorway
export const getKeyColors = (colorway, label) => {
  const c = typeof colorway === 'string' ? getColorway(colorway) : colorway;
  if (!c || !c.swatches) {
    return { background: '#7c6bb0', legend: '#ffffff' };
  }

  const keyType = getKeyType(label);
  const swatch = c.swatches[keyType] || c.swatches.base;

  return {
    background: swatch.background,
    legend: swatch.color
  };
};

// Get list of all colorway IDs sorted by popularity
export const COLORWAY_LIST = [...Object.keys(POPULAR), ...EXTRA_IDS];

// Convert colorway to our format { baseColor, baseLegend, modColor, modLegend, accentColor, accentLegend }
export const colorwayToTheme = (colorway) => {
  const c = typeof colorway === 'string' ? getColorway(colorway) : colorway;
  return {
    id: c.id,
    label: c.label,
    baseColor: c.swatches.base.background,
    baseLegend: c.swatches.base.color,
    modColor: c.swatches.mods?.background || c.swatches.base.background,
    modLegend: c.swatches.mods?.color || c.swatches.base.color,
    accentColor: c.swatches.accent?.background || c.swatches.mods?.background || c.swatches.base.background,
    accentLegend: c.swatches.accent?.color || c.swatches.mods?.color || c.swatches.base.color,
    overrides: c.override || {}
  };
};

export default COLORWAYS;
