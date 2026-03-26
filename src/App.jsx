import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import EntryScreen from './screens/EntryScreen';
import { useStore } from './store';

// Lazy load all non-entry screens
const SelectorScreen = lazy(() => import('./screens/SelectorScreen'));
const AboutScreen = lazy(() => import('./screens/AboutScreen'));
const SupportScreen = lazy(() => import('./screens/SupportScreen'));
const SignInModal = lazy(() => import('./components/SignInModal'));
const StudioScreen = lazy(() => import('./screens/StudioScreen'));
const GalleryScreen = lazy(() => import('./screens/GalleryScreen'));
const TypingTestScreen = lazy(() => import('./screens/TypingTestScreen'));

// Sync store screen state with URL
function ScreenSyncer() {
  const navigate = useNavigate();
  const location = useLocation();
  const screen = useStore(s => s.screen);
  const setScreen = useStore(s => s.setScreen);

  // When URL changes, update store
  useEffect(() => {
    const path = location.pathname;
    const screenMap = {
      '/': 'entry',
      '/selector': 'selector',
      '/studio': 'studio',
      '/gallery': 'gallery',
      '/about': 'about',
      '/support': 'support',
      '/typing-test': 'typing-test'
    };
    const newScreen = screenMap[path] || 'entry';
    if (newScreen !== screen) {
      setScreen(newScreen);
    }
  }, [location.pathname]);

  // When store screen changes (from setScreen calls), update URL
  useEffect(() => {
    const pathMap = {
      'entry': '/',
      'selector': '/selector',
      'studio': '/studio',
      'gallery': '/gallery',
      'about': '/about',
      'support': '/support',
      'typing-test': '/typing-test'
    };
    const targetPath = pathMap[screen] || '/';
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [screen]);

  return null;
}

// Handle URL-encoded design state
function DesignLoader() {
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

  return null;
}

export default function App() {
  const fallback = <div style={{background:'#0a0a0f', width:'100vw', height:'100vh'}} />;

  return (
    <BrowserRouter>
      <ScreenSyncer />
      <DesignLoader />
      <Suspense fallback={fallback}>
        <Routes>
          <Route path="/" element={<EntryScreen />} />
          <Route path="/selector" element={<SelectorScreen />} />
          <Route path="/studio" element={<StudioScreen />} />
          <Route path="/gallery" element={<GalleryScreen />} />
          <Route path="/typing-test" element={<TypingTestScreen />} />
          <Route path="/about" element={<AboutScreen />} />
          <Route path="/support" element={<SupportScreen />} />
          {/* Fallback to entry for unknown routes */}
          <Route path="*" element={<EntryScreen />} />
        </Routes>
        <SignInModal />
      </Suspense>
    </BrowserRouter>
  );
}
