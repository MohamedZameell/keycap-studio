import React, { useEffect, Suspense, lazy } from 'react';
import EntryScreen from './screens/EntryScreen';
import { useStore } from './store';

// Lazy load all non-entry screens
const SelectorScreen = lazy(() => import('./screens/SelectorScreen'));
const AboutScreen = lazy(() => import('./screens/AboutScreen'));
const SupportScreen = lazy(() => import('./screens/SupportScreen'));
const SignInModal = lazy(() => import('./components/SignInModal'));
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

  const fallback = <div style={{background:'#0a0a0f', width:'100vw', height:'100vh'}} />;

  return (
    <Suspense fallback={fallback}>
      {screen === 'entry' && <EntryScreen />}
      {screen === 'selector' && <SelectorScreen />}
      {screen === 'about' && <AboutScreen />}
      {screen === 'support' && <SupportScreen />}
      {screen === 'studio' && <StudioScreen />}
      {screen === 'gallery' && <GalleryScreen />}
      <SignInModal />
    </Suspense>
  );
}