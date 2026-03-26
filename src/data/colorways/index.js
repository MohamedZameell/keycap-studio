// GMK-style colorway presets
// Imported from keysim project - 72 curated colorways

// Popular colorways
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

// More colorways
import _1976 from './colorway_1976.json';
import _80082 from './colorway_80082.json';
import amalfi from './colorway_amalfi.json';
import ashes from './colorway_ashes.json';
import aurora_polaris from './colorway_aurora_polaris.json';
import blacklight from './colorway_blacklight.json';
import bobafett from './colorway_bobafett.json';
import bread from './colorway_bread.json';
import bushido from './colorway_bushido.json';
import deku from './colorway_deku.json';
import demonic from './colorway_demonic.json';
import dmg from './colorway_dmg.json';
import finer_things from './colorway_finer_things.json';
import gregory from './colorway_gregory.json';
import hammerhead from './colorway_hammerhead.json';
import handarbeit from './colorway_handarbeit.json';
import heavy_industry from './colorway_heavy_industry.json';
import islander from './colorway_islander.json';
import jamon from './colorway_jamon.json';
import kaiju from './colorway_kaiju.json';
import lunar from './colorway_lunar.json';
import mecha from './colorway_mecha.json';
import metropolis from './colorway_metropolis.json';
import milkshake from './colorway_milkshake.json';
import modern_dolch_light from './colorway_modern_dolch_light.json';
import muted from './colorway_muted.json';
import nautilus_nightmares from './colorway_nautilus_nightmares.json';
import night_runner from './colorway_night_runner.json';
import night_sakura from './colorway_night_sakura.json';
import noire from './colorway_noire.json';
import nuclear_data from './colorway_nuclear_data.json';
import pastel from './colorway_pastel.json';
import peaches_cream from './colorway_peaches_cream.json';
import pluto from './colorway_pluto.json';
import pono from './colorway_pono.json';
import port from './colorway_port.json';
import prepress from './colorway_prepress.json';
import rainy_day from './colorway_rainy_day.json';
import shoko from './colorway_shoko.json';
import skeletor from './colorway_skeletor.json';
import space_cadet from './colorway_space_cadet.json';
import vilebloom from './colorway_vilebloom.json';
import yuri from './colorway_yuri.json';

export const COLORWAYS = {
  // Popular - show first
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

  // More
  '1976': _1976,
  '80082': _80082,
  amalfi,
  ashes,
  aurora_polaris,
  blacklight,
  bobafett,
  bread,
  bushido,
  deku,
  demonic,
  dmg,
  finer_things,
  gregory,
  hammerhead,
  handarbeit,
  heavy_industry,
  islander,
  jamon,
  kaiju,
  lunar,
  mecha,
  metropolis,
  milkshake,
  modern_dolch_light,
  muted,
  nautilus_nightmares,
  night_runner,
  night_sakura,
  noire,
  nuclear_data,
  pastel,
  peaches_cream,
  pluto,
  pono,
  port,
  prepress,
  rainy_day,
  shoko,
  skeletor,
  space_cadet,
  vilebloom,
  yuri
};

// Get colorway by id
export const getColorway = (id) => COLORWAYS[id] || COLORWAYS.olivia;

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
export const COLORWAY_LIST = Object.keys(COLORWAYS);

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
