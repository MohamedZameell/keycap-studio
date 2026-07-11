import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import EntryScreen from './screens/EntryScreen';
import { useStore } from './store';
import { ensureFont, loadPersistedFonts } from './lib/fontManager';

// Lazy load all non-entry screens
const SelectorScreen = lazy(() => import('./screens/SelectorScreen'));
const AboutScreen = lazy(() => import('./screens/AboutScreen'));
const SupportScreen = lazy(() => import('./screens/SupportScreen'));
const SignInModal = lazy(() => import('./components/SignInModal'));
const StudioScreen = lazy(() => import('./screens/StudioScreen'));
const GalleryScreen = lazy(() => import('./screens/GalleryScreen'));
const TypingTestScreen = lazy(() => import('./screens/TypingTestScreen'));
const LabScreen = lazy(() => import('./screens/LabScreen'));

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
      '/typing-test': 'typing-test',
      '/lab': 'lab'
    };
    const newScreen = screenMap[path] || 'entry';
    if (newScreen !== screen) {
      setScreen(newScreen);
    }
  }, [location.pathname]);

  // When store screen changes (from setScreen calls), update URL.
  // Skip the mount run: it fires with the store's default screen before the
  // URL→store effect above has landed, and would bounce deep links to '/'.
  const didMount = React.useRef(false);
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    const pathMap = {
      'entry': '/',
      'selector': '/selector',
      'studio': '/studio',
      'gallery': '/gallery',
      'about': '/about',
      'support': '/support',
      'typing-test': '/typing-test',
      'lab': '/lab'
    };
    const targetPath = pathMap[screen] || '/';
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [screen]);

  return null;
}

// Handle URL-encoded design state
function decodeSharedDesign(encoded) {
  // v2 links are UTF-8 base64url; v1 links were plain btoa, and their '+'
  // may have arrived as a space after URL parsing.
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/ /g, '+');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  try {
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
  } catch (e) {
    return JSON.parse(bin); // v1: latin1 JSON straight out of btoa
  }
}

function DesignLoader() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('d');
    if (!encoded) return;
    try {
      const state = decodeSharedDesign(encoded);
      const s = useStore.getState();
      if (state.c) s.setGlobalColor(state.c);
      if (state.lc) s.setGlobalLegendColor(state.lc);
      // Load the family before storing it — textures cache on the font name.
      // Custom uploads restore from IndexedDB first so shares of your own
      // designs resolve on this device; Google families fetch on demand.
      if (state.f) {
        loadPersistedFonts()
          .then(() => ensureFont(state.f))
          .finally(() => useStore.getState().setGlobalFont(state.f));
      }
      if (state.m) s.setMaterialPreset(state.m);
      if (state.ff) s.setSelectedFormFactor(state.ff);
      if (state.k) s.setSelectedModel(state.k);
      if (state.led) s.setKeyboardLEDType(state.led);
      if (state.p) s.setSelectedProfile(state.p);
      if (state.ss) s.setLegendSubStyle(state.ss);
      if (state.os) s.setOsType(state.os);
      if (state.cs) s.setCaseStyle(state.cs);
      if (state.cf) s.setCaseFinish(state.cf);
      if (state.cc) s.setCaseColor(state.cc);
      if (state.cwj) s.importCustomColorway(state.cwj);
      if (state.cw) {
        // Never select a custom id we don't actually hold — a broken link
        // should degrade to global colors, not a half-rendered board.
        const isCustom = state.cw.startsWith('custom_');
        if (!isCustom || useStore.getState().customColorways[state.cw]) {
          s.setSelectedColorway(state.cw);
        }
      }
      if (state.pk) {
        for (const [id, d] of Object.entries(state.pk)) s.setPerKeyDesign(id, d);
      }
      // If a model or form factor is encoded, go straight to studio
      if (state.k || state.ff) {
        s.setScreen('studio');
      }
    } catch (e) {
      console.warn('Invalid share URL:', e);
    }
  }, []);

  return null;
}

export default function App() {
  const fallback = <div style={{background:'#0a0a0f', width:'100vw', height:'100vh'}} />;
  // BASE_URL keeps a trailing slash, which breaks the router's path-stripping
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <BrowserRouter basename={basename}>
      <ScreenSyncer />
      <DesignLoader />
      <Suspense fallback={fallback}>
        <Routes>
          <Route path="/" element={<EntryScreen />} />
          <Route path="/selector" element={<SelectorScreen />} />
          <Route path="/studio" element={<StudioScreen />} />
          <Route path="/gallery" element={<GalleryScreen />} />
          <Route path="/typing-test" element={<TypingTestScreen />} />
          <Route path="/lab" element={<LabScreen />} />
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
