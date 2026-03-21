import React, { useEffect } from 'react';
import EntryScreen from './screens/EntryScreen';
import SelectorScreen from './screens/SelectorScreen';
import StudioScreen from './screens/StudioScreen';
import { useStore } from './store';

export default function App() {
  const screen = useStore(s => s.screen);

  // TASK 3 — URL decode on page load: read ?d= query param and apply to store
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('d');
    if (!encoded) return;
    try {
      const state = JSON.parse(atob(encoded));
      if (state.c) useStore.getState().setGlobalColor(state.c);
      if (state.lc) useStore.getState().setGlobalLegendColor(state.lc);
      if (state.f) useStore.getState().setGlobalFont(state.f);
      if (state.m) useStore.getState().setMaterialPreset(state.m);
      if (state.ff) useStore.getState().setSelectedFormFactor(state.ff);
      if (state.k) useStore.getState().setSelectedModel(state.k);
      if (state.led) useStore.getState().setKeyboardLEDType(state.led);
      // If a model or form factor is encoded, go straight to studio
      if (state.k || state.ff) {
        useStore.getState().setScreen('studio');
      }
    } catch (e) {
      console.warn('Invalid share URL:', e);
    }
  }, []);

  if (screen === 'entry') return <EntryScreen />;
  if (screen === 'selector') return <SelectorScreen />;
  if (screen === 'studio') return <StudioScreen />;
  
  return <div style={{color: 'white', padding: 20}}>Unknown screen</div>;
}