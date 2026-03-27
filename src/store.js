import { create } from 'zustand'

export const useStore = create((set) => ({
  // SCREEN STATE
  screen: 'entry',

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
  globalColor: '#6c63ff',
  globalLegendColor: '#ffffff',
  globalLegendText: '',
  globalFont: 'Inter',
  globalLegendPosition: 'top-center',
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
  setGlobalColor: (color) => set({ globalColor: color }),
  setGlobalLegendColor: (color) => set({ globalLegendColor: color }),
  setGlobalLegendText: (text) => set({ globalLegendText: text }),
  setGlobalFont: (font) => set({ globalFont: font }),
  setGlobalLegendPosition: (p) => set({ globalLegendPosition: p }),
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
  setKeyboardImageUrl: (url) => set({ keyboardImageUrl: url }),
  setKeyboardImageOffsetX: (x) => set({ keyboardImageOffsetX: x }),
  setKeyboardImageOffsetY: (y) => set({ keyboardImageOffsetY: y }),
  setKeyboardImageScale: (s) => set({ keyboardImageScale: s }),

  // Multi-image setters
  setImageUrl: (id, url) => set((state) => ({
    keyboardImages: state.keyboardImages.map(img =>
      img.id === id ? { ...img, url, enabled: url ? true : img.enabled } : img
    )
  })),
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
  clearImage: (id) => set((state) => ({
    keyboardImages: state.keyboardImages.map(img =>
      img.id === id ? { ...img, url: null, enabled: false, scale: 1, offsetX: 0, offsetY: 0, opacity: 1 } : img
    )
  })),
  clearAllImages: () => set({
    keyboardImages: [
      { id: 1, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
      { id: 2, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
      { id: 3, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
      { id: 4, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
      { id: 5, url: null, scale: 1, offsetX: 0, offsetY: 0, opacity: 1, enabled: false },
    ]
  }),

  setIsExporting: (isExporting) => set({ isExporting }),
}))