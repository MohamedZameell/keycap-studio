import React, { useEffect, Suspense, lazy } from 'react';
import EntryScreen from './screens/EntryScreen';
import SelectorScreen from './screens/SelectorScreen';
import AboutScreen from './screens/AboutScreen';
import SupportScreen from './screens/SupportScreen';
import SignInModal from './components/SignInModal';
import { useStore } from './store';

const StudioScreen = lazy(() => import('./screens/StudioScreen'));
const GalleryScreen = lazy(() => import('./screens/GalleryScreen'));

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

  if (screen === 'entry') return <><EntryScreen /><SignInModal /></>;
  if (screen === 'selector') return <><SelectorScreen /><SignInModal /></>;
  if (screen === 'about') return <><AboutScreen /><SignInModal /></>;
  if (screen === 'support') return <><SupportScreen /><SignInModal /></>;
  if (screen === 'studio' || screen === 'gallery') {
    return (
      <>
        <Suspense fallback={<div style={{background:'#0a0a0f', width:'100vw', height:'100vh'}} />}>
          {screen === 'studio' && <StudioScreen />}
          {screen === 'gallery' && <GalleryScreen />}
        </Suspense>
        <SignInModal />
      </>
    );
  }
  
  return <div style={{color: 'white', padding: 20}}>Unknown screen</div>;
}