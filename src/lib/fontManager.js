// Legend font manager — extra Google Fonts loaded per-family on demand, plus
// user font uploads (.ttf/.otf/.woff2) registered via the FontFace API and
// persisted in IndexedDB so they survive reloads. The 8 starter fonts stay
// eagerly loaded from index.html; everything here is pay-for-what-you-pick.
//
// Callers must `await ensureFont(family)` BEFORE writing the family into the
// store: the keycap texture cache keys on the font name, so a texture built
// against a fallback font would be cached wrong and never invalidated.

// Curated legend-appropriate families. Requested without a :wght axis —
// css2 400s if a family lacks a requested weight; canvas faux-bolds 400.
export const EXTRA_GOOGLE_FONTS = [
  { value: 'Space Grotesk',    tag: 'Techy' },
  { value: 'JetBrains Mono',   tag: 'Mono' },
  { value: 'Orbitron',         tag: 'Sci-fi' },
  { value: 'Russo One',        tag: 'Sport' },
  { value: 'Black Ops One',    tag: 'Stencil' },
  { value: 'Bungee',           tag: 'Street' },
  { value: 'Audiowide',        tag: 'Retro-future' },
  { value: 'Chakra Petch',     tag: 'Cyber' },
  { value: 'Teko',             tag: 'Condensed' },
  { value: 'Anton',            tag: 'Heavy' },
  { value: 'Archivo Black',    tag: 'Grotesque' },
  { value: 'Zen Dots',         tag: 'Gamer' },
  { value: 'VT323',            tag: 'Terminal' },
  { value: 'Silkscreen',       tag: 'Pixel' },
  { value: 'Pacifico',         tag: 'Script' },
  { value: 'Permanent Marker', tag: 'Marker' },
  { value: 'Caveat',           tag: 'Handwritten' },
  { value: 'Monoton',          tag: 'Neon' },
];

const stylesheetLoads = new Map(); // family -> Promise (link onload)
const customFaces = new Map();     // family -> FontFace

export async function ensureFont(family) {
  if (!family || family === 'legends' || customFaces.has(family)) return;
  try { if (document.fonts.check(`16px "${family}"`)) return; } catch (e) { /* ignore */ }

  if (!stylesheetLoads.has(family)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family.trim().replace(/ /g, '+')}&display=swap`;
    const loaded = new Promise((resolve) => {
      link.onload = resolve;
      link.onerror = resolve; // offline → resolve anyway, canvas falls back
      setTimeout(resolve, 4000);
    });
    stylesheetLoads.set(family, loaded);
    document.head.appendChild(link);
  }
  await stylesheetLoads.get(family);
  try {
    await Promise.race([
      document.fonts.load(`16px "${family}"`),
      new Promise(r => setTimeout(r, 3000)),
    ]);
  } catch (e) { /* ignore */ }
}

// ---- custom uploads (IndexedDB: keycap_fonts_v1 / fonts, keyPath family) ----

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('keycap_fonts_v1', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('fonts', { keyPath: 'family' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction('fonts', mode);
    const req = fn(t.objectStore('fonts'));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
  });
}

async function registerFace(family, buffer) {
  const face = new FontFace(family, buffer);
  await face.load();
  document.fonts.add(face);
  customFaces.set(family, face);
}

// Register every persisted font; returns their family names for the picker.
// Safe to call multiple times; failures degrade to an empty list.
export async function loadPersistedFonts() {
  try {
    const db = await openDb();
    const all = await tx(db, 'readonly', (s) => s.getAll());
    for (const rec of all) {
      if (!customFaces.has(rec.family)) {
        try { await registerFace(rec.family, rec.buffer) } catch (e) { /* corrupt font */ }
      }
    }
    return [...customFaces.keys()];
  } catch (e) {
    return [...customFaces.keys()];
  }
}

export async function addCustomFont(file) {
  const family = file.name.replace(/\.(ttf|otf|woff2?)$/i, '')
    .replace(/[^\w &-]/g, ' ').replace(/\s+/g, ' ').trim() || `Custom ${Date.now()}`;
  const buffer = await file.arrayBuffer();
  await registerFace(family, buffer); // throws on unparseable files
  try {
    const db = await openDb();
    await tx(db, 'readwrite', (s) => s.put({ family, buffer, ts: Date.now() }));
  } catch (e) { /* session-only if IndexedDB unavailable */ }
  return family;
}

export async function deleteCustomFont(family) {
  const face = customFaces.get(family);
  if (face) { try { document.fonts.delete(face) } catch (e) { /* ignore */ } }
  customFaces.delete(family);
  try {
    const db = await openDb();
    await tx(db, 'readwrite', (s) => s.delete(family));
  } catch (e) { /* ignore */ }
}
