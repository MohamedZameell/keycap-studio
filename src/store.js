import { create } from 'zustand'
import { loadCustomColorways, commitCustomColorways } from './data/customColorways'
import { upsertColorway, deleteRemoteColorway } from './lib/colorwaySync'

// Revoke a blob: URL safely. No-op for non-blob URLs (data:, http://, null).
const revokeBlob = (url) => {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    try { URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
  }
}

export const useStore = create((set) => ({
  // SCREEN STATE
  // Adopt the URL's screen on first load so deep links (/studio, /lab, ...)
  // survive ScreenSyncer's store->URL sync (incl. StrictMode double-effects).
  screen: ({ '/selector': 'selector', '/studio': 'studio', '/gallery': 'gallery', '/about': 'about', '/support': 'support', '/typing-test': 'typing-test', '/lab': 'lab' })[window.location.pathname] || 'entry',

  // KEYBOARD CONFIG
  selectionPath: null,
  selectedBrand: null,
  selectedModel: null,
  selectedFormFactor: null,
  selectedProfile: null,
  selectedLayout: null,
  keyboardLEDType: null,

  // DESIGN STATE
  selectedKey: null,
  selectedColorway: null, // GMK colorway id - when set, overrides globalColor

  // COLORWAY EDITOR (M2)
  customColorways: loadCustomColorways(), // id -> colorway JSON (same shape as presets)
  colorwayDraft: null,  // colorway object being edited; non-null = editor open, board previews it live
  editorZone: null,     // armed paint zone ('base'|'mods'|'accent'|'accentN'|'auto') — key clicks paint overrides while set
  globalColor: '#6c63ff',
  globalLegendColor: '#ffffff',
  globalLegendText: '',
  globalFont: 'Inter',
  globalLegendPosition: 'top-center',
  legendSubStyle: '',         // secondary legend alphabet ('' | 'cyrillic' | 'greek' | …)
  osType: 'win',              // modifier legend style: 'win' | 'mac' (⌘/⌥/⌃)
  // Zone quick-paint: zone key ('wasd'|'arrows'|'nav'|'function'|'modifiers'|
  // 'alphas'|'spacebar') -> { color?, legendColor? }. Sits between per-key
  // overrides and the colorway in Keycap's resolution.
  zoneColors: {},
  // Per-legend-group size (multiplier) + position override. Group keys:
  // 'alphas' | 'modifiers' | 'dual'. pos '' inherits globalLegendPosition.
  legendGroups: {
    alphas:    { size: 1, pos: '' },
    modifiers: { size: 1, pos: '' },
    dual:      { size: 1, pos: '' },
  },
  backlitEnabled: false,
  backlitColor: '#00aaff',
  perKeyDesigns: {},
  materialPreset: 'abs',
  soundEnabled: true,
  ledPreviewExpanded: false,

  // CASE SETTINGS
  caseStyle: 'rounded',       // 'rounded' (like CASE_1) or 'angular' (like CASE_2)
  caseFinish: 'matte',        // 'matte', 'brushed', 'glossy'
  caseColor: '#08080c',       // Case color

  // IMAGE STATE (legacy single-image - kept for compatibility)
  keyboardImageMode: 'none',
  keyboardImageUrl: null,
  keyboardImageOffsetX: 0,
  keyboardImageOffsetY: 0,
  keyboardImageScale: 1,

  // MULTI-IMAGE STATE (5 image layers)
  keyboardImages: [
    { id: 1, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
    { id: 2, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
    { id: 3, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
    { id: 4, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
    { id: 5, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
  ],

  // EXPORT STATE
  isExporting: false,

  // SETTERS
  setScreen: (screen) => set({ screen }),
  
  setSelectionPath: (path) => set({ selectionPath: path }),
  setSelectedBrand: (brand) => set({ selectedBrand: brand }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setSelectedFormFactor: (ff) => set({ selectedFormFactor: ff }),
  setSelectedProfile: (profile) => set({ selectedProfile: profile }),
  setSelectedLayout: (layout) => set({ selectedLayout: layout }),
  setKeyboardLEDType: (ledType) => set({ keyboardLEDType: ledType }),

  setSelectedKey: (keyId) => set({ selectedKey: keyId }),
  setSelectedColorway: (id) => set({ selectedColorway: id }),

  // Colorway editor actions. Draft updates always produce a NEW draft object
  // so Keycap's useShallow subscription sees the identity change and repaints.
  startColorwayEdit: (draft) => set({ colorwayDraft: draft, editorZone: null }),
  cancelColorwayEdit: () => set({ colorwayDraft: null, editorZone: null }),
  setEditorZone: (zone) => set({ editorZone: zone }),
  setDraftLabel: (label) => set((state) => state.colorwayDraft
    ? { colorwayDraft: { ...state.colorwayDraft, label } } : {}),
  setDraftSwatch: (zone, field, value) => set((state) => {
    const d = state.colorwayDraft;
    if (!d) return {};
    const prev = d.swatches[zone] || { background: '#cccccc', color: '#363434' };
    return { colorwayDraft: { ...d, swatches: { ...d.swatches, [zone]: { ...prev, [field]: value } } } };
  }),
  addDraftZone: (zone, swatch) => set((state) => {
    const d = state.colorwayDraft;
    if (!d || d.swatches[zone]) return {};
    return { colorwayDraft: { ...d, swatches: { ...d.swatches, [zone]: swatch } } };
  }),
  removeDraftZone: (zone) => set((state) => {
    const d = state.colorwayDraft;
    if (!d || !d.swatches[zone]) return {};
    const swatches = { ...d.swatches };
    delete swatches[zone];
    // Strip overrides pointing at the removed zone so keys fall back cleanly.
    const override = {};
    for (const [kc, z] of Object.entries(d.override || {})) {
      if (z !== zone) override[kc] = z;
    }
    return {
      colorwayDraft: { ...d, swatches, override },
      editorZone: state.editorZone === zone ? null : state.editorZone,
    };
  }),
  // zone === null clears the override (key falls back to label-based zoning)
  setDraftOverride: (keycode, zone) => set((state) => {
    const d = state.colorwayDraft;
    if (!d || !keycode) return {};
    const override = { ...(d.override || {}) };
    if (zone === null) delete override[keycode];
    else override[keycode] = zone;
    return { colorwayDraft: { ...d, override } };
  }),
  saveColorwayDraft: () => set((state) => {
    const d = state.colorwayDraft;
    if (!d) return {};
    // Stamp a save time so cross-device sync can resolve last-write-wins.
    const saved = { ...d, updatedAt: Date.now() };
    const customColorways = { ...state.customColorways, [saved.id]: saved };
    commitCustomColorways(customColorways);
    upsertColorway(saved).catch(() => {}); // cloud mirror for signed-in users; no-op otherwise
    return { customColorways, colorwayDraft: null, editorZone: null, selectedColorway: saved.id };
  }),
  // Register a colorway arriving via a share URL. If the id already exists
  // locally (self-share, re-open), keep the local copy — just select it.
  // No cloud mirror here: it syncs on the next explicit save / sign-in merge.
  importCustomColorway: (cw) => set((state) => {
    if (!cw || !cw.id || !String(cw.id).startsWith('custom_')) return {};
    if (state.customColorways[cw.id]) return { selectedColorway: cw.id };
    const customColorways = { ...state.customColorways, [cw.id]: { ...cw, updatedAt: cw.updatedAt || Date.now() } };
    commitCustomColorways(customColorways);
    return { customColorways, selectedColorway: cw.id };
  }),
  deleteCustomColorway: (id) => set((state) => {
    const customColorways = { ...state.customColorways };
    delete customColorways[id];
    commitCustomColorways(customColorways);
    deleteRemoteColorway(id).catch(() => {}); // cloud mirror; no-op when logged out/unconfigured
    return {
      customColorways,
      selectedColorway: state.selectedColorway === id ? null : state.selectedColorway,
    };
  }),
  // Replace the whole custom-colorway map (used by sign-in cloud sync). Persists
  // to localStorage too so the merged set survives the next cold start.
  setCustomColorways: (map) => set(() => {
    commitCustomColorways(map);
    return { customColorways: map };
  }),
  setGlobalColor: (color) => set({ globalColor: color }),
  setGlobalLegendColor: (color) => set({ globalLegendColor: color }),
  setGlobalLegendText: (text) => set({ globalLegendText: text }),
  setGlobalFont: (font) => set({ globalFont: font }),
  setGlobalLegendPosition: (p) => set({ globalLegendPosition: p }),
  setLegendSubStyle: (v) => set({ legendSubStyle: v }),
  setOsType: (v) => set({ osType: v }),
  setZoneColor: (zone, field, value) => set((state) => ({
    zoneColors: { ...state.zoneColors, [zone]: { ...(state.zoneColors[zone] || {}), [field]: value } },
  })),
  clearZoneColor: (zone) => set((state) => {
    const zoneColors = { ...state.zoneColors };
    delete zoneColors[zone];
    return { zoneColors };
  }),
  clearAllZoneColors: () => set({ zoneColors: {} }),
  setLegendGroup: (group, field, value) => set((state) => ({
    legendGroups: { ...state.legendGroups, [group]: { ...state.legendGroups[group], [field]: value } },
  })),
  resetLegendGroups: () => set({
    legendGroups: { alphas: { size: 1, pos: '' }, modifiers: { size: 1, pos: '' }, dual: { size: 1, pos: '' } },
  }),
  setBacklitEnabled: (enabled) => set({ backlitEnabled: enabled }),
  setBacklitColor: (color) => set({ backlitColor: color }),
  setMaterialPreset: (p) => set({ materialPreset: p }),
  setSoundEnabled: (v) => set({ soundEnabled: v }),
  setLedPreviewExpanded: (v) => set({ ledPreviewExpanded: v }),

  // Case setters
  setCaseStyle: (style) => set({ caseStyle: style }),
  setCaseFinish: (finish) => set({ caseFinish: finish }),
  setCaseColor: (color) => set({ caseColor: color }),

  setPerKeyDesign: (keyId, designObj) => set((state) => ({
    perKeyDesigns: {
      ...state.perKeyDesigns,
      [keyId]: {
        ...(state.perKeyDesigns[keyId] || {}),
        ...designObj
      }
    }
  })),

  clearPerKeyDesigns: () => set({ perKeyDesigns: {} }),

  // STAMPS — decal images projected onto individual caps (adimail-style).
  // keyId -> [{ id, imageUrl(dataURL), target('top'|'body'), pos:[x,y,z] (cap-local),
  //             normal:[x,y,z] (cap-local, for the hero z-fight lift), aspect,
  //             scale, rotation, opacity, visible }]
  // Session-state like perKeyDesigns; dataURLs so hero rebuild + texture loads
  // never race a revoked blob. Excluded from the share URL (payload too big).
  keyStamps: {},
  stampArming: null, // { imageUrl, aspect } armed for placement; next key click stamps it
  armStamp: (imageUrl, aspect = 1) => set({ stampArming: { imageUrl, aspect } }),
  cancelStampArming: () => set({ stampArming: null }),
  placeStamp: (keyId, stamp) => set((state) => ({
    stampArming: null,
    keyStamps: {
      ...state.keyStamps,
      [keyId]: [...(state.keyStamps[keyId] || []), stamp],
    },
  })),
  updateStamp: (keyId, stampId, patch) => set((state) => ({
    keyStamps: {
      ...state.keyStamps,
      [keyId]: (state.keyStamps[keyId] || []).map(st => st.id === stampId ? { ...st, ...patch } : st),
    },
  })),
  removeStamp: (keyId, stampId) => set((state) => {
    const next = (state.keyStamps[keyId] || []).filter(st => st.id !== stampId);
    const keyStamps = { ...state.keyStamps };
    if (next.length) keyStamps[keyId] = next; else delete keyStamps[keyId];
    return { keyStamps };
  }),
  clearAllStamps: () => set({ keyStamps: {}, stampArming: null }),

  setKeyboardImageMode: (mode) => set({ keyboardImageMode: mode }),
  setKeyboardImageUrl: (url) => set((state) => {
    if (state.keyboardImageUrl !== url) revokeBlob(state.keyboardImageUrl)
    return { keyboardImageUrl: url }
  }),
  setKeyboardImageOffsetX: (x) => set({ keyboardImageOffsetX: x }),
  setKeyboardImageOffsetY: (y) => set({ keyboardImageOffsetY: y }),
  setKeyboardImageScale: (s) => set({ keyboardImageScale: s }),

  // Multi-image setters
  setImageUrl: (id, url) => set((state) => {
    const prev = state.keyboardImages.find(img => img.id === id)
    if (prev && prev.url !== url) revokeBlob(prev.url)
    return {
      keyboardImages: state.keyboardImages.map(img =>
        img.id === id ? { ...img, url, enabled: url ? true : img.enabled } : img
      )
    }
  }),
  setImageScale: (id, scale) => set((state) => ({
    keyboardImages: state.keyboardImages.map(img =>
      img.id === id ? { ...img, scale } : img
    )
  })),
  setImageOffset: (id, offsetX, offsetY) => set((state) => ({
    keyboardImages: state.keyboardImages.map(img =>
      img.id === id ? { ...img, offsetX, offsetY } : img
    )
  })),
  setImageOpacity: (id, opacity) => set((state) => ({
    keyboardImages: state.keyboardImages.map(img =>
      img.id === id ? { ...img, opacity } : img
    )
  })),
  setImageEnabled: (id, enabled) => set((state) => ({
    keyboardImages: state.keyboardImages.map(img =>
      img.id === id ? { ...img, enabled } : img
    )
  })),
  clearImage: (id) => set((state) => {
    const prev = state.keyboardImages.find(img => img.id === id)
    if (prev) revokeBlob(prev.url)
    return {
      keyboardImages: state.keyboardImages.map(img =>
        img.id === id ? { ...img, url: null, enabled: false, scale: 1, offsetX: 0, offsetY: 0, opacity: 1 } : img
      )
    }
  }),
  clearAllImages: () => set((state) => {
    state.keyboardImages.forEach(img => revokeBlob(img.url))
    return {
      keyboardImages: [
        { id: 1, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
        { id: 2, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
        { id: 3, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
        { id: 4, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
        { id: 5, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
      ]
    }
  }),

  setIsExporting: (isExporting) => set({ isExporting }),
}))