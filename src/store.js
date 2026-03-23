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

  // IMAGE STATE
  keyboardImageMode: 'none',
  keyboardImageUrl: null,
  keyboardImageOffsetX: 0,  // Pan X offset (-1 to 1)
  keyboardImageOffsetY: 0,  // Pan Y offset (-1 to 1)
  keyboardImageScale: 1,    // Zoom scale (0.5 to 3)

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

  setIsExporting: (isExporting) => set({ isExporting }),
}))