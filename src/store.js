import { create } from 'zustand'
import { loadCustomColorways, commitCustomColorways } from './data/customColorways'

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
    const customColorways = { ...state.customColorways, [d.id]: d };
    commitCustomColorways(customColorways);
    return { customColorways, colorwayDraft: null, editorZone: null, selectedColorway: d.id };
  }),
  deleteCustomColorway: (id) => set((state) => {
    const customColorways = { ...state.customColorways };
    delete customColorways[id];
    commitCustomColorways(customColorways);
    return {
      customColorways,
      selectedColorway: state.selectedColorway === id ? null : state.selectedColorway,
    };
  }),
  setGlobalColor: (color) => set({ globalColor: color }),
  setGlobalLegendColor: (color) => set({ globalLegendColor: color }),
  setGlobalLegendText: (text) => set({ globalLegendText: text }),
  setGlobalFont: (font) => set({ globalFont: font }),
  setGlobalLegendPosition: (p) => set({ globalLegendPosition: p }),
  setLegendSubStyle: (v) => set({ legendSubStyle: v }),
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