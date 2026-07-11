// GMK-style legend glyphs, ported from keysim (references/keysim, MIT).
// legends.ttf is an icon font: each glyph is a PRE-COMPOSED key legend
// (stacked shift pairs like !/1, mod words like "Backspace") at a PUA
// codepoint. The glyph's em box does the in-key positioning, which is why
// keysim draws every key with one fillText call at fixed metrics.
import cherry from './legends_cherry.json';
import sa from './legends_sa.json';
import subCyrillic from './legends_subs/cyrillic.json';
import subGreek from './legends_subs/greek.json';
import subHiragana from './legends_subs/hiragana.json';
import subKatakana from './legends_subs/katakana.json';
import subHangul from './legends_subs/hangul.json';
import subArabic from './legends_subs/arabic.json';
import subHebrew from './legends_subs/hebrew.json';
import subChinese from './legends_subs/chinese.json';
import subDevanagari from './legends_subs/devanagari.json';
import subCzech from './legends_subs/czech.json';

// Map our layout display labels -> keysim keycodes.
const LABEL_TO_KC = {
  'Esc': 'KC_ESC',
  '`': 'KC_GRV', '1': 'KC_1', '2': 'KC_2', '3': 'KC_3', '4': 'KC_4',
  '5': 'KC_5', '6': 'KC_6', '7': 'KC_7', '8': 'KC_8', '9': 'KC_9',
  '0': 'KC_0', '-': 'KC_MINS', '=': 'KC_EQL', 'Backspace': 'KC_BSPC',
  'Tab': 'KC_TAB', '[': 'KC_LBRC', ']': 'KC_RBRC', '\\': 'KC_BSLS',
  'Caps Lock': 'KC_CAPS', ';': 'KC_SCLN', "'": 'KC_QUOT', 'Enter': 'KC_ENT',
  'Shift': 'KC_LSFT', ',': 'KC_COMM', '.': 'KC_DOT', '/': 'KC_SLSH',
  'Ctrl': 'KC_LCTL', 'Win': 'KC_LGUI', 'Alt': 'KC_LALT', 'Menu': 'KC_APP',
  // No GMK glyph for Fn (falls back to text), but it needs a stable keycode so
  // the colorway editor can paint it like any other key.
  'Fn': 'KC_FN', 'Super': 'KC_LGUI',
  '↑': 'KC_UP', '↓': 'KC_DOWN', '←': 'KC_LEFT', '→': 'KC_RGHT',
  'Del': 'KC_DEL', 'Delete': 'KC_DEL', 'Ins': 'KC_INS', 'Insert': 'KC_INS',
  'Home': 'KC_HOME', 'End': 'KC_END', 'PgUp': 'KC_PGUP', 'PgDn': 'KC_PGDN',
  'PrtSc': 'KC_PSCR', 'Print': 'KC_PSCR', 'ScrLk': 'KC_SLCK', 'Pause': 'KC_PAUS',
  'F1': 'KC_F1', 'F2': 'KC_F2', 'F3': 'KC_F3', 'F4': 'KC_F4', 'F5': 'KC_F5',
  'F6': 'KC_F6', 'F7': 'KC_F7', 'F8': 'KC_F8', 'F9': 'KC_F9', 'F10': 'KC_F10',
  'F11': 'KC_F11', 'F12': 'KC_F12',
  '': 'KC_SPC', 'Space': 'KC_SPC',
};
for (let i = 0; i < 26; i++) {
  const ch = String.fromCharCode(65 + i);
  LABEL_TO_KC[ch] = `KC_${ch}`;
}

// Keysim keycode for a display label, or null. Colorway `override` maps
// (zone per keycode, e.g. bento's KC_ENT -> accent) key off these codes.
export const labelToKeyCode = (label) => LABEL_TO_KC[label] || null;

// Drawing metrics from keysim texture.js at pxPerU=128, expressed per-1u:
// fontSize = fontsize*1.25 = 100/128, x = offsetX = 20/128,
// baseline = fontsize + offsetY = 105/128.
export const GLYPH_METRICS = {
  fontSize: (cherry.fontsize * 1.25) / 128,
  x: cherry.offsetX / 128,
  baseline: (cherry.fontsize + cherry.offsetY) / 128,
};

// Returns the pre-composed legend glyph for a display label, or null when the
// label has no keysim mapping (e.g. 'Fn', custom text) -> caller falls back
// to plain text rendering.
export function getLegendGlyph(label) {
  const kc = LABEL_TO_KC[label];
  const hex = kc && cherry.chars[kc];
  return hex ? String.fromCharCode(parseInt(hex, 16)) : null;
}

// ---- Primary legend sets by profile ----------------------------------------
// keysim ships two: `cherry` (icon font, pre-composed glyphs, top-left) and
// `sa` (plain text, centered, with stacked top/bottom symbols). Every profile
// that isn't SA uses the cherry icon set. Each set object carries its own
// `id` and `subsSupported` flag straight from the JSON.
const LEGEND_SETS = { cherry, sa };
export function getPrimaryLegendSet(profile) {
  return (profile || '').toLowerCase() === 'sa' ? LEGEND_SETS.sa : LEGEND_SETS.cherry;
}

// SA legend for a display label: a plain string ("Q", "SHIFT") or a
// { top, bottom } pair for stacked symbol/number keys. null when unmapped.
export function getSaChar(label) {
  const kc = LABEL_TO_KC[label];
  return (kc && sa.chars[kc] != null) ? sa.chars[kc] : null;
}

// ---- Secondary (sub) legends: international alphabets -----------------------
// Ported from keysim's subs configs. Each is keyed by the same KC codes and
// carries the font stack it should render in (system fonts, like keysim).
const SUBS = {
  cyrillic: subCyrillic, greek: subGreek, hiragana: subHiragana,
  katakana: subKatakana, hangul: subHangul, arabic: subArabic,
  hebrew: subHebrew, chinese: subChinese, devanagari: subDevanagari, czech: subCzech,
};

// Options for the picker; value '' = no secondary legend.
export const SUB_STYLES = [
  { value: '', label: 'None' },
  { value: 'cyrillic', label: 'Cyrillic' },
  { value: 'greek', label: 'Greek' },
  { value: 'hiragana', label: 'Hiragana' },
  { value: 'katakana', label: 'Katakana' },
  { value: 'hangul', label: 'Hangul' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'hebrew', label: 'Hebrew' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'devanagari', label: 'Devanagari' },
  { value: 'czech', label: 'Czech' },
];

// ---- OS-specific modifier legends (Win vs Mac) -----------------------------
// Only the DISPLAYED modifier legend changes; colour zoning + KC mapping stay
// keyed on the original label. Windows is the default (labels already win-style).
const MAC_LABELS = {
  'Win': '⌘', 'Super': '⌘', // ⌘ Command
  'Alt': '⌥',                    // ⌥ Option
  'Ctrl': '⌃', 'Control': '⌃', // ⌃ Control
  'Menu': '⌘',
};
export const OS_TYPES = [
  { value: 'win', label: 'Windows' },
  { value: 'mac', label: 'Mac' },
];
// Map a display label to its OS variant. Returns the label unchanged for
// non-modifier keys or when osType is 'win'.
export function applyOsType(label, osType) {
  if (osType === 'mac' && Object.prototype.hasOwnProperty.call(MAC_LABELS, label)) {
    return MAC_LABELS[label];
  }
  return label;
}

// Sub-legend descriptor for a label under a style, or null. `char` is a string
// (or rarely a { top, bottom } pair); `fontFamily` is the stack to draw it in.
export function getSubChar(style, label) {
  const cfg = SUBS[style];
  if (!cfg) return null;
  const kc = LABEL_TO_KC[label];
  const ch = kc && cfg.chars[kc];
  if (!ch) return null;
  return { char: ch, fontFamily: cfg.fontFamily, mult: cfg.fontSizeMultiplier || 1 };
}
