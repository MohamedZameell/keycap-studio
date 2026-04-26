import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { HexColorPicker } from 'react-colorful';
import * as THREE from 'three';
// jsPDF loaded dynamically when needed
import ErrorBoundary from '../components/ErrorBoundary';
import { useAuth } from '../hooks/useAuth';
import { saveUserDesign, isSupabaseConfigured } from '../lib/supabase';
import { COLORWAYS, COLORWAY_LIST, colorwayToTheme, warmupExtraColorways } from '../data/colorways';
import TypingTest from '../components/TypingTest';
import KeyboardRenderer from '../components/KeyboardRenderer';
import Keycap from '../components/Keycap';
import LEDPreviewWidget from '../components/LEDPreviewWidget';
import { getLayoutForFormFactor } from '../data/layouts';
import { formFactorToLayoutKey } from '../data/layouts';
import {
  exportKLEJson,
  exportManufacturingSVG,
  exportWASDTemplate,
  exportFullPackage,
  runPreflightChecks,
  generateMetadataJson
} from '../utils/exportEngine';

const KEY_UNIT = 1.05;

// TASK 4 — Camera animator: lerps camera position and orbit target smoothly
function CameraAnimator({ cameraStateRef, orbitRef }) {
  useFrame(({ camera }) => {
    if (!orbitRef?.current || !cameraStateRef?.current) return;
    const { pos, target } = cameraStateRef.current;
    
    const distPos = Math.abs(camera.position.x - pos[0]) + 
      Math.abs(camera.position.y - pos[1]) + 
      Math.abs(camera.position.z - pos[2]);
    
    if (distPos < 0.01) {
      // Close enough — stop animating, let OrbitControls take over
      cameraStateRef.current.isAnimating = false;
      return;
    }
    
    cameraStateRef.current.isAnimating = true;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pos[0], 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, pos[1], 0.06);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, pos[2], 0.06);
    
    orbitRef.current.target.x = THREE.MathUtils.lerp(orbitRef.current.target.x, target[0], 0.06);
    orbitRef.current.target.y = THREE.MathUtils.lerp(orbitRef.current.target.y, target[1], 0.06);
    orbitRef.current.target.z = THREE.MathUtils.lerp(orbitRef.current.target.z, target[2], 0.06);
    orbitRef.current.update();
  });
  return null;
}

function StudioOrbitControls({ orbitRef, cameraStateRef, viewMode, enabled = true }) {
  const { camera } = useThree();
  return (
    <OrbitControls
      ref={orbitRef}
      enabled={enabled}
      enableDamping
      dampingFactor={0.05}
      enableZoom={enabled}
      enablePan={enabled}
      enableRotate={enabled}
      minDistance={viewMode === 'single' ? 2 : 3}
      maxDistance={viewMode === 'single' ? 8 : 35}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, 0, 0]}
      onChange={() => {
        if (!cameraStateRef.current.isAnimating) {
          cameraStateRef.current.pos = [
            camera.position.x,
            camera.position.y,
            camera.position.z
          ];
          cameraStateRef.current.target = [
            orbitRef.current.target.x,
            orbitRef.current.target.y,
            orbitRef.current.target.z
          ];
        }
      }}
    />
  );
}

const FONTS = [
  { label: 'Inter — Aa',           value: 'Inter',           tag: 'Modern clean' },
  { label: 'Oswald — Aa',          value: 'Oswald',          tag: 'Bold condensed' },
  { label: 'Press Start 2P — Aa',  value: 'Press Start 2P',  tag: 'Pixel' },
  { label: 'Share Tech Mono — Aa', value: 'Share Tech Mono', tag: 'Mono' },
  { label: 'Playfair Display — Aa',value: 'Playfair Display',tag: 'Elegant' },
  { label: 'Nunito — Aa',          value: 'Nunito',          tag: 'Rounded' },
  { label: 'Rajdhani — Aa',        value: 'Rajdhani',        tag: 'Futuristic' },
  { label: 'Bebas Neue — Aa',      value: 'Bebas Neue',      tag: 'Bold display' },
];

const THEMES = [
  { name: 'Midnight', keycap: '#1a1a2e', legend: '#ffffff', material: 'pbt' },
  { name: 'Arctic', keycap: '#f0f0f0', legend: '#1a1a1a', material: 'abs' },
  { name: 'Purple', keycap: '#6c63ff', legend: '#ffffff', material: 'abs' },
  { name: 'Forest', keycap: '#1a3a2a', legend: '#a8d8a0', material: 'pbt' },
  { name: 'Coral', keycap: '#c0392b', legend: '#ffeaa7', material: 'abs' },
  { name: 'Ocean', keycap: '#1e3a5f', legend: '#74b9ff', material: 'abs' },
  { name: 'Rose', keycap: '#c4906a', legend: '#2d1b0e', material: 'abs' },
  { name: 'Stealth', keycap: '#111111', legend: '#2a2a2a', material: 'pbt' },
];

const LEGEND_POSITIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'front', label: 'Front Face' },
  { value: 'hidden', label: 'Hidden' },
];

const IMAGE_MODES = [
  { value: 'none', icon: '⬜', label: 'No Image', desc: 'Solid color only' },
  { value: 'wrap', icon: '🖼', label: 'Wrap Keyboard', desc: 'One image across all keys' },
  { value: 'tile', icon: '🔲', label: 'Tile All Keys', desc: 'Same image on every key' },
  { value: 'perkey', icon: '🎯', label: 'Per Key Image', desc: 'Different image per key' },
];

// Single shallow subscription replaces `useStore()` (no selector), which used to
// re-render this 1855-line component on every store change. With useShallow,
// only the fields actually read (or whose setters are referenced) trigger a
// re-render, and only when their value identity changes. Setter functions are
// stable across renders so including them is free.
const STUDIO_STORE_SELECTOR = (s) => ({
  // ---- state ----
  screen: s.screen,
  selectionPath: s.selectionPath,
  selectedBrand: s.selectedBrand,
  selectedModel: s.selectedModel,
  selectedFormFactor: s.selectedFormFactor,
  selectedProfile: s.selectedProfile,
  selectedLayout: s.selectedLayout,
  keyboardLEDType: s.keyboardLEDType,
  selectedKey: s.selectedKey,
  selectedColorway: s.selectedColorway,
  globalColor: s.globalColor,
  globalLegendColor: s.globalLegendColor,
  globalLegendText: s.globalLegendText,
  globalFont: s.globalFont,
  globalLegendPosition: s.globalLegendPosition,
  backlitEnabled: s.backlitEnabled,
  backlitColor: s.backlitColor,
  perKeyDesigns: s.perKeyDesigns,
  materialPreset: s.materialPreset,
  soundEnabled: s.soundEnabled,
  ledPreviewExpanded: s.ledPreviewExpanded,
  caseStyle: s.caseStyle,
  caseFinish: s.caseFinish,
  caseColor: s.caseColor,
  keyboardImageMode: s.keyboardImageMode,
  keyboardImageUrl: s.keyboardImageUrl,
  keyboardImageOffsetX: s.keyboardImageOffsetX,
  keyboardImageOffsetY: s.keyboardImageOffsetY,
  keyboardImageScale: s.keyboardImageScale,
  keyboardImages: s.keyboardImages,
  isExporting: s.isExporting,
  // ---- setters (stable refs, never trigger re-render under shallow) ----
  setScreen: s.setScreen,
  setSelectionPath: s.setSelectionPath,
  setSelectedBrand: s.setSelectedBrand,
  setSelectedModel: s.setSelectedModel,
  setSelectedFormFactor: s.setSelectedFormFactor,
  setSelectedProfile: s.setSelectedProfile,
  setSelectedLayout: s.setSelectedLayout,
  setKeyboardLEDType: s.setKeyboardLEDType,
  setSelectedKey: s.setSelectedKey,
  setSelectedColorway: s.setSelectedColorway,
  setGlobalColor: s.setGlobalColor,
  setGlobalLegendColor: s.setGlobalLegendColor,
  setGlobalLegendText: s.setGlobalLegendText,
  setGlobalFont: s.setGlobalFont,
  setGlobalLegendPosition: s.setGlobalLegendPosition,
  setBacklitEnabled: s.setBacklitEnabled,
  setBacklitColor: s.setBacklitColor,
  setMaterialPreset: s.setMaterialPreset,
  setSoundEnabled: s.setSoundEnabled,
  setLedPreviewExpanded: s.setLedPreviewExpanded,
  setCaseStyle: s.setCaseStyle,
  setCaseFinish: s.setCaseFinish,
  setCaseColor: s.setCaseColor,
  setPerKeyDesign: s.setPerKeyDesign,
  clearPerKeyDesigns: s.clearPerKeyDesigns,
  setKeyboardImageMode: s.setKeyboardImageMode,
  setKeyboardImageUrl: s.setKeyboardImageUrl,
  setKeyboardImageOffsetX: s.setKeyboardImageOffsetX,
  setKeyboardImageOffsetY: s.setKeyboardImageOffsetY,
  setKeyboardImageScale: s.setKeyboardImageScale,
  setImageUrl: s.setImageUrl,
  setImageScale: s.setImageScale,
  setImageOffset: s.setImageOffset,
  setImageOpacity: s.setImageOpacity,
  setImageEnabled: s.setImageEnabled,
  clearImage: s.clearImage,
  clearAllImages: s.clearAllImages,
  setIsExporting: s.setIsExporting,
});

export default function StudioScreen() {
  const store = useStore(useShallow(STUDIO_STORE_SELECTOR));
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('DESIGN');
  const [viewMode, setViewMode] = useState('full');
  const [targetScope, setTargetScope] = useState('all');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [preflightIssues, setPreflightIssues] = useState([]);
  const [showPreflightModal, setShowPreflightModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [showTypingTest, setShowTypingTest] = useState(false);
  const fileInputRef = useRef(null);
  const orbitRef = useRef(null);

  // TASK 4 — Camera animation state
  const defaultCamPos = [0, 8, 12];
  const defaultCamTarget = [0, 0, 0];
  const cameraStateRef = useRef({
    pos: [...defaultCamPos],
    target: [...defaultCamTarget],
    isAnimating: false
  });
  const [isCameraFocused, setIsCameraFocused] = useState(false);
  const [imageDragMode, setImageDragMode] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Compute layout bounds for camera positioning
  const layoutData = useCallback(() => {
    const layout = getLayoutForFormFactor(formFactorToLayoutKey(store.selectedFormFactor)) || [];
    if (!layout.length) return { layout, minX: 0, minZ: 0, maxW: 0, maxH: 0 };
    const minX = Math.min(...layout.map(k => Number(k.x)));
    const minZ = Math.min(...layout.map(k => Number(k.y)));
    const maxX = Math.max(...layout.map(k => Number(k.x) + (Number(k.w) || 1)));
    const maxZ = Math.max(...layout.map(k => Number(k.y) + (Number(k.h) || 1)));
    return { layout, minX, minZ, maxW: maxX - minX, maxH: maxZ - minZ };
  }, [store.selectedFormFactor]);

  const handleKeyFocus = useCallback((keyId) => {
    // Just select the key in full view - no camera movement
    store.setSelectedKey(keyId);
  }, [store]);

  const resetCamera = useCallback(() => {
    cameraStateRef.current.pos = [...defaultCamPos];
    cameraStateRef.current.target = [...defaultCamTarget];
    cameraStateRef.current.isAnimating = true;
    setIsCameraFocused(false);
  }, []);

  // Warm up the lazy 'More' tier of colorways shortly after Studio mounts.
  // Idle delay so it doesn't compete with the initial 3D paint.
  useEffect(() => {
    const t = setTimeout(() => { warmupExtraColorways(); }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Animate camera when switching to single view mode
  useEffect(() => {
    if (viewMode === 'single') {
      // Animate to single key focus position
      cameraStateRef.current.pos = [0, 1.0, 3.2];
      cameraStateRef.current.target = [0, 0, 0];
      cameraStateRef.current.isAnimating = true;
      setIsCameraFocused(true);
    } else {
      // Animate back to full view position
      cameraStateRef.current.pos = [...defaultCamPos];
      cameraStateRef.current.target = [...defaultCamTarget];
      cameraStateRef.current.isAnimating = true;
      setIsCameraFocused(false);
    }
  }, [viewMode]);

  const targetKeyId = targetScope === 'selected' ? store.selectedKey : null;

  // Debounced color update (1 frame = ~16ms)
  // FIX 2 — Scope-aware: routes to per-key design when targetScope is 'selected'
  const colorTimerRef = useRef(null);
  const debouncedColorUpdate = useCallback((key, value) => {
    if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
    colorTimerRef.current = setTimeout(() => {
      if (targetScope === 'selected' && targetKeyId) {
        store.setPerKeyDesign(targetKeyId, { [key]: value });
      } else {
        if (key === 'color') store.setGlobalColor(value);
        if (key === 'legendColor') store.setGlobalLegendColor(value);
      }
    }, 16);
  }, [store, targetScope, targetKeyId]);

  const updateDesign = (key, value) => {
    if (targetScope === 'all' || !targetKeyId) {
      if (key === 'color' || key === 'legendColor') {
        debouncedColorUpdate(key, value);
        return;
      }
      if (key === 'legendText') store.setGlobalLegendText(value);
      if (key === 'font') store.setGlobalFont(value);
      if (key === 'legendPosition') store.setGlobalLegendPosition(value);
    } else {
      store.setPerKeyDesign(targetKeyId, { [key]: value });
    }
  };

  const getVal = (key) => {
    if (targetScope === 'selected' && targetKeyId && store.perKeyDesigns[targetKeyId]) {
      return store.perKeyDesigns[targetKeyId][key] || store[`global${key.charAt(0).toUpperCase() + key.slice(1)}`];
    }
    return store[`global${key.charAt(0).toUpperCase() + key.slice(1)}`];
  };

  // Keyboard shortcuts — Escape also resets camera
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        store.setSelectedKey(null);
        resetCamera();
      }
      if (e.key === ' ') { e.preventDefault(); setViewMode(v => v === 'full' ? 'single' : 'full'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store, resetCamera]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  // --- EXPORT HANDLERS ---
  // Standard export angles for manufacturing
  const EXPORT_ANGLES = {
    topDown: { pos: [0, 15, 0.1], target: [0, 0, 0], name: 'Top-Down' },
    isometric: { pos: [8, 10, 8], target: [0, 0, 0], name: 'Isometric' },
    front: { pos: [0, 4, 15], target: [0, 0, 0], name: 'Front' },
    hero: { pos: [6, 6, 10], target: [0, 0, 0], name: 'Hero Shot' },
  };

  const handleExportPNG = (angleKey = null) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const capture = (suffix, label) => {
      // Two RAFs ensures the latest tween frame has been rendered to the canvas.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const link = document.createElement('a');
          link.download = `keycap-studio-${suffix}-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png', 1.0);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast(label ? `PNG exported (${label})!` : 'PNG exported!');
        });
      });
    };

    if (angleKey && EXPORT_ANGLES[angleKey]) {
      // Move camera to standard angle, then wait for the CameraAnimator to
      // converge before capturing. CameraAnimator sets isAnimating=false
      // when distPos < 0.01. Poll every 16ms; bail after 2s as a safety net.
      const angle = EXPORT_ANGLES[angleKey];
      cameraStateRef.current.pos = angle.pos;
      cameraStateRef.current.target = angle.target;
      cameraStateRef.current.isAnimating = true;

      const start = performance.now();
      const waitForSettle = () => {
        if (!cameraStateRef.current.isAnimating) {
          capture(angleKey, angle.name);
          return;
        }
        if (performance.now() - start > 2000) {
          // Safety bail-out: capture whatever we've got
          capture(angleKey, angle.name);
          return;
        }
        setTimeout(waitForSettle, 16);
      };
      // Give the animator one frame to flip isAnimating from false → true
      // (it only does that on the next useFrame tick after we set pos)
      setTimeout(waitForSettle, 32);
    } else {
      // Export current view immediately
      capture('current', null);
    }
  };

  const handleExportSVG = () => {
    try {
      const state = useStore.getState();
      const layout = getLayoutForFormFactor(formFactorToLayoutKey(state.selectedFormFactor)) || [];
      const KEY_UNIT_MM = 19.05;

      const svgKeys = layout.map(key => {
        const x = (key.x || 0) * KEY_UNIT_MM;
        const y = (key.y || 0) * KEY_UNIT_MM;
        const w = ((key.w || 1) * KEY_UNIT_MM) - 1;
        const h = ((key.h || 1) * KEY_UNIT_MM) - 1;
        const design = state.perKeyDesigns?.[key.id];
        const fill = design?.color || state.globalColor;
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="2" stroke="#333" stroke-width="0.5"/>\n<text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-size="8" fill="${state.globalLegendColor}" font-family="Inter,sans-serif">${key.label || ''}</text>`;
      }).join('\n');

      const maxX = Math.max(...layout.map(k => ((k.x || 0) + (k.w || 1)) * KEY_UNIT_MM));
      const maxY = Math.max(...layout.map(k => ((k.y || 0) + (k.h || 1)) * KEY_UNIT_MM));

      const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg width="${maxX}mm" height="${maxY}mm" viewBox="0 0 ${maxX} ${maxY}" xmlns="http://www.w3.org/2000/svg">\n<rect width="${maxX}" height="${maxY}" fill="#0a0a0f"/>\n${svgKeys}\n</svg>`;

      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `keycap-layout-${Date.now()}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast('SVG exported!');
    } catch (e) {
      console.error('SVG export failed:', e);
      showToast('SVG export failed');
    }
  };

  const handleShareURL = () => {
    try {
      const state = useStore.getState();
      const design = {
        c: state.globalColor, lc: state.globalLegendColor, f: state.globalFont,
        m: state.materialPreset, k: state.selectedModel, ff: state.selectedFormFactor,
        led: state.keyboardLEDType,
      };
      const encoded = btoa(JSON.stringify(design));
      const url = `${window.location.origin}?d=${encoded}`;
      navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard!');
    } catch (e) {
      showToast('Failed to copy link');
    }
  };

  // --- SAVE DESIGN TO ACCOUNT ---
  const handleSaveDesign = async () => {
    if (!saveName.trim()) {
      showToast('Please enter a name');
      return;
    }

    if (!isAuthenticated) {
      document.dispatchEvent(new CustomEvent('showSignIn'));
      setShowSaveModal(false);
      return;
    }

    setSaveLoading(true);
    try {
      const state = useStore.getState();
      const { data, error } = await saveUserDesign({
        name: saveName,
        color: state.globalColor,
        legendColor: state.globalLegendColor,
        keyboard: state.selectedModel,
        font: state.globalFont,
        material: state.materialPreset,
        profile: state.selectedProfile,
        perKeyDesigns: state.perKeyDesigns,
        images: state.keyboardImages?.filter(i => i.url) || []
      });

      if (error) {
        showToast(error.message || 'Save failed');
      } else {
        showToast('Design saved!');
        setShowSaveModal(false);
        setSaveName('');
      }
    } catch (e) {
      showToast('Save failed');
    }
    setSaveLoading(false);
  };

  // --- MANUFACTURING EXPORT HANDLERS ---
  const getDesignState = () => {
    const state = useStore.getState();
    return {
      globalColor: state.globalColor,
      globalLegendColor: state.globalLegendColor,
      globalFont: state.globalFont,
      selectedProfile: state.selectedProfile,
      selectedFormFactor: state.selectedFormFactor,
      selectedModel: state.selectedModel,
      materialPreset: state.materialPreset,
      keyboardLEDType: state.keyboardLEDType,
      perKeyDesigns: state.perKeyDesigns
    };
  };

  const getCurrentLayout = () => {
    const state = useStore.getState();
    return getLayoutForFormFactor(formFactorToLayoutKey(state.selectedFormFactor)) || [];
  };

  const handleRunPreflight = () => {
    const layout = getCurrentLayout();
    const designState = getDesignState();
    const issues = runPreflightChecks(layout, designState);
    setPreflightIssues(issues);
    setShowPreflightModal(true);
  };

  const handleExportKLE = () => {
    try {
      const layout = getCurrentLayout();
      const designState = getDesignState();
      exportKLEJson(layout, designState);
      showToast('KLE JSON exported!');
    } catch (e) {
      console.error('KLE export failed:', e);
      showToast('KLE export failed');
    }
  };

  const handleExportManufacturingSVG = () => {
    try {
      const layout = getCurrentLayout();
      const designState = getDesignState();
      exportManufacturingSVG(layout, designState, { includeBleed: true, colorMode: 'cmyk-annotation' });
      showToast('Manufacturing SVG exported!');
    } catch (e) {
      console.error('Manufacturing SVG export failed:', e);
      showToast('Export failed');
    }
  };

  const handleExportWASD = () => {
    try {
      const layout = getCurrentLayout();
      const designState = getDesignState();
      exportWASDTemplate(layout, designState);
      showToast('WASD template exported!');
    } catch (e) {
      console.error('WASD export failed:', e);
      showToast('Export failed');
    }
  };

  const handleExportMetadata = () => {
    try {
      const layout = getCurrentLayout();
      const designState = getDesignState();
      const metadata = generateMetadataJson(layout, designState);
      const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `keycap-metadata-${Date.now()}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Metadata exported!');
    } catch (e) {
      console.error('Metadata export failed:', e);
      showToast('Export failed');
    }
  };

  const handleExportFullPackage = async () => {
    try {
      showToast('Exporting full package...');
      const layout = getCurrentLayout();
      const designState = getDesignState();
      await exportFullPackage(layout, designState);
      showToast('Full package exported!');
    } catch (e) {
      console.error('Full package export failed:', e);
      showToast('Export failed');
    }
  };

  // PDF export — pdf-lib (smaller bundle than jsPDF, no html2canvas dependency)
  const handleExportPDF = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    try {
      showToast('Generating PDF...');
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const pngBytes = await new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (!blob) return reject(new Error('Canvas toBlob failed'));
          resolve(new Uint8Array(await blob.arrayBuffer()));
        }, 'image/png', 1.0);
      });

      const pdfDoc = await PDFDocument.create();
      // A4 landscape in points: 842 × 595
      const page = pdfDoc.addPage([842, 595]);
      page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: rgb(10/255, 10/255, 15/255) });

      const png = await pdfDoc.embedPng(pngBytes);
      const margin = 28;
      const maxW = 842 - margin * 2;
      const maxH = 595 - margin * 2 - 24;
      const scale = Math.min(maxW / png.width, maxH / png.height);
      const drawW = png.width * scale;
      const drawH = png.height * scale;
      page.drawImage(png, {
        x: (842 - drawW) / 2,
        y: 595 - margin - drawH,
        width: drawW,
        height: drawH,
      });

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const state = useStore.getState();
      page.drawText(`Keycap Studio — ${state.selectedModel || 'Custom Layout'} — ${state.globalColor}`, {
        x: margin,
        y: 16,
        size: 10,
        font,
        color: rgb(108/255, 99/255, 255/255),
      });

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `keycap-design-${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('PDF exported!');
    } catch (e) {
      console.error('PDF export failed:', e);
      showToast('PDF export failed');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('File too large (max 5MB)'); return; }
    const url = URL.createObjectURL(file);

    // Revoke the previous preview URL (local state) before replacing it.
    if (uploadedImageUrl?.startsWith('blob:')) {
      try { URL.revokeObjectURL(uploadedImageUrl) } catch (e) {}
    }
    setUploadedImageUrl(url);

    // Per-key mode: set image on the selected key.
    // Revoke the previous per-key image URL since setPerKeyDesign just merges fields.
    if (store.keyboardImageMode === 'perkey' && store.selectedKey) {
      const prev = store.perKeyDesigns?.[store.selectedKey]?.imageUrl;
      if (prev?.startsWith('blob:') && prev !== url) {
        try { URL.revokeObjectURL(prev) } catch (e) {}
      }
      store.setPerKeyDesign(store.selectedKey, { imageUrl: url });
      showToast(`Image set for key: ${store.selectedKey}`);
    } else {
      // Tile/wrap mode: setKeyboardImageUrl revokes the previous URL itself.
      store.setKeyboardImageUrl(url);
    }
  };

  const LEDTypeColor = (type) => {
    if (type?.includes('North')) return '#0d9e75';
    if (type?.includes('South')) return '#f5a623';
    if (type?.includes('Per-key')) return '#6c63ff';
    return '#444460';
  };

  const LEDTypeIcon = (type) => {
    if (type?.includes('North')) return '↑';
    if (type?.includes('South')) return '↓';
    if (type?.includes('Per-key')) return '✦';
    return '—';
  };

  return (
    <div style={styles.container}>
      <style>{`
        .tab-btn { padding: 12px 0; font-family: var(--font-heading); font-size: 13px; font-weight: 600; color: var(--on-surface-variant); cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent; background: transparent; border-top:none; border-left:none; border-right:none; transition: all 0.2s; flex: 1; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }
        .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); background: var(--surface-container); }
        .tab-btn:hover:not(.active) { color: var(--on-surface); background: var(--surface-container-low); }
        .color-circle { width: 32px; height: 32px; border-radius: 4px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-sizing: border-box; border: 1px solid rgba(255,255,255,0.1); }
        .color-circle:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        .color-circle.active { border: 2px solid var(--primary); }
        
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--surface-container-highest); transition: .3s; border-radius: 4px; border: 1px solid var(--outline-variant); }
        .toggle-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: var(--on-surface-variant); transition: .3s; border-radius: 2px; }
        input:checked + .toggle-slider { background-color: var(--primary); border-color: var(--primary); }
        input:checked + .toggle-slider:before { transform: translateX(20px); background-color: var(--on-primary); }
      `}</style>

      {/* TOP BAR */}
      <div style={{
        height: 56,
        background: '#1b1b1d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px 0 16px',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => store.setScreen('entry')}
            style={{ background: 'none', border: 'none', color: '#cbc3d7', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >←</button>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 15, color: '#e5e1e4' }}>
            Keycap Studio
          </span>
        </div>

        {/* Center — keyboard name */}
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: 15, color: '#e5e1e4' }}>
          {store.selectedModel ? `${store.selectedModel} — ${store.selectedFormFactor}` : 'Custom Layout'}
        </span>

        {/* Right — actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['SINGLE', 'FULL'].map(v => (
            <button key={v}
              onClick={() => setViewMode(v === 'SINGLE' ? 'single' : 'full')}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                padding: '5px 12px',
                borderRadius: 2,
                border: `1px solid ${viewMode === (v === 'SINGLE' ? 'single' : 'full') ? '#d0bcff' : 'rgba(149,142,160,0.2)'}`,
                background: viewMode === (v === 'SINGLE' ? 'single' : 'full') ? 'rgba(208,188,255,0.1)' : 'transparent',
                color: viewMode === (v === 'SINGLE' ? 'single' : 'full') ? '#d0bcff' : '#cbc3d7',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >{v}</button>
          ))}

          <button
            onClick={() => isAuthenticated ? setShowSaveModal(true) : document.dispatchEvent(new CustomEvent('showSignIn'))}
            style={{
              fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: 13,
              padding: '6px 16px', borderRadius: 2,
              border: '1px solid rgba(149,142,160,0.3)',
              background: 'transparent', color: '#e5e1e4', cursor: 'pointer',
            }}
          >{isAuthenticated ? 'SAVE' : 'SIGN IN TO SAVE'}</button>

          <button
            onClick={() => store.setScreen('typing-test')}
            title="Test your typing speed"
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              padding: '5px 12px', borderRadius: 2,
              border: '1px solid rgba(149,142,160,0.2)',
              background: 'transparent', color: '#cbc3d7', cursor: 'pointer',
            }}
          >WPM TEST</button>

          <button
            onClick={() => setActiveTab('EXPORT')}
            style={{
              fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 13,
              padding: '6px 18px', borderRadius: 2,
              background: '#d0bcff', color: '#3c0091',
              border: 'none', cursor: 'pointer',
            }}
          >EXPORT CONFIG</button>

          <button
            onClick={() => store.setScreen('gallery')}
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              padding: '5px 12px', borderRadius: 2,
              border: '1px solid rgba(149,142,160,0.2)',
              background: 'transparent', color: '#cbc3d7', cursor: 'pointer',
            }}
          >GALLERY</button>
        </div>
      </div>

      <div style={styles.workspace}>
        {/* CONTROL PANEL */}
        <div style={styles.sidebar}>
          <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--outline-variant)', justifyContent: 'space-around', alignItems: 'center', background: '#201f21' }}>
            {[
              { key: 'design', icon: '◉', label: 'DESIGN' },
              { key: 'legend', icon: 'T', label: 'LEGEND' },
              { key: 'image', icon: '⊞', label: 'IMAGE' },
              { key: 'backlit', icon: '◌', label: 'BACKLIT' },
              { key: 'export', icon: '↑', label: 'EXPORT' },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key.toUpperCase())}
                style={{
                  flex: 1,
                  padding: '14px 4px 10px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.key.toUpperCase() ? '#d0bcff' : 'transparent'}`,
                  color: activeTab === tab.key.toUpperCase() ? '#d0bcff' : '#958ea0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.08em' }}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          <div style={styles.panelContent}>
            {/* ===== DESIGN TAB ===== */}
            {activeTab === 'DESIGN' && (
              <div style={styles.section}>
                <div style={styles.pillToggleContainer}>
                  <button style={targetScope === 'all' ? styles.pillActive : styles.pillInactive} onClick={() => setTargetScope('all')}>ALL KEYS</button>
                  <button style={targetScope === 'selected' ? styles.pillActive : styles.pillInactive} onClick={() => setTargetScope('selected')}>SELECTED KEY</button>
                </div>

                {targetScope === 'selected' && !targetKeyId && (
                  <div style={styles.warning}>Please select a key on the keyboard first.</div>
                )}

                {/* GMK COLORWAYS */}
                <div style={{ marginBottom: 16 }}>
                  <div style={styles.sectionLabel}>
                    GMK Colorways <span style={{ opacity: 0.5, fontWeight: 400 }}>({COLORWAY_LIST.length})</span>
                    {store.selectedColorway && (
                      <button
                        onClick={() => store.setSelectedColorway(null)}
                        style={{ marginLeft: 8, padding: '2px 6px', fontSize: 9, background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: 2, color: 'var(--on-surface-variant)', cursor: 'pointer' }}
                      >
                        CLEAR
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
                    {COLORWAY_LIST.slice(0, 48).map(id => {
                      const c = COLORWAYS[id];
                      const theme = colorwayToTheme(c);
                      const isActive = store.selectedColorway === id;
                      return (
                        <button key={id}
                          onClick={() => store.setSelectedColorway(id)}
                          title={c.label}
                          style={{
                            aspectRatio: '1',
                            background: `linear-gradient(135deg, ${theme.baseColor} 60%, ${theme.modColor} 60%)`,
                            border: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'border 0.15s, transform 0.1s',
                            position: 'relative',
                            boxShadow: isActive ? '0 0 8px var(--primary)' : 'none'
                          }}
                          onMouseEnter={e => { if (!isActive) { e.currentTarget.style.border = '2px solid rgba(255,255,255,0.4)'; e.currentTarget.style.transform = 'scale(1.1)'; }}}
                          onMouseLeave={e => { if (!isActive) { e.currentTarget.style.border = '2px solid transparent'; e.currentTarget.style.transform = 'scale(1)'; }}}
                        >
                          <div style={{
                            position: 'absolute', bottom: 2, right: 2,
                            width: 5, height: 5, borderRadius: '50%',
                            background: theme.accentColor,
                            border: '1px solid rgba(0,0,0,0.3)'
                          }} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* THEMES */}
                <div style={{ marginBottom: 8 }}>
                  <div style={styles.sectionLabel}>Quick Themes</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 20 }}>
                    {THEMES.map(theme => (
                      <button key={theme.name}
                        onClick={() => { store.setGlobalColor(theme.keycap); store.setGlobalLegendColor(theme.legend); store.setMaterialPreset(theme.material); }}
                        title={theme.name}
                        style={{
                          aspectRatio: '1',
                          background: theme.keycap,
                          border: '2px solid transparent',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'border 0.15s',
                          position: 'relative',
                        }}
                        onMouseEnter={e => e.currentTarget.style.border = '2px solid rgba(255,255,255,0.5)'}
                        onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}
                      >
                        <div style={{
                          position: 'absolute', bottom: 3, right: 3,
                          width: 6, height: 6, borderRadius: '50%',
                          background: theme.legend,
                        }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* PROFILE SELECTOR */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em', color: '#958ea0', marginBottom: 8 }}>
                    KEYCAP PROFILE
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { label: 'Cherry', value: 'cherry', desc: 'Low sculpted, cylindrical dish' },
                      { label: 'OEM', value: 'oem', desc: 'Taller than Cherry, common stock' },
                      { label: 'SA', value: 'sa', desc: 'Tall spherical, retro typewriter' },
                      { label: 'DSA', value: 'dsa', desc: 'Uniform flat, spherical dish' },
                      { label: 'XDA', value: 'xda', desc: 'Uniform flat, wider surface' },
                      { label: 'KAT', value: 'kat', desc: 'Medium height, smooth sculpt' },
                      { label: 'MT3', value: 'mt3', desc: 'Deep spherical, ergonomic' },
                      { label: 'ASA', value: 'asa', desc: 'Akko sculpted, balanced' },
                      { label: 'OSA', value: 'osa', desc: 'Medium spherical, comfortable' },
                      { label: 'KSA', value: 'ksa', desc: 'Tall uniform, deep dish' },
                      { label: 'Low', value: 'low profile', desc: 'Laptop-style, minimal height' },
                    ].map(p => (
                      <button key={p.value}
                        onClick={() => store.setSelectedProfile(p.value)}
                        title={p.desc}
                        style={{
                          padding: '8px 12px',
                          fontFamily: 'Space Grotesk, sans-serif',
                          fontSize: 11, fontWeight: 600,
                          borderRadius: 2,
                          border: '1px solid rgba(149,142,160,0.2)',
                          background: (store.selectedProfile || 'cherry') === p.value ? 'rgba(208,188,255,0.15)' : '#2a2a2c',
                          color: (store.selectedProfile || 'cherry') === p.value ? '#d0bcff' : '#cbc3d7',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >{p.label}</button>
                    ))}
                  </div>
                </div>

                {/* MATERIAL TOGGLE */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: 'MATTE PBT', value: 'pbt' },
                      { label: 'GLOSSY ABS', value: 'abs' },
                    ].map(m => (
                      <button key={m.value}
                        onClick={() => store.setMaterialPreset(m.value)}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          fontFamily: 'Space Grotesk, sans-serif',
                          fontSize: 12, fontWeight: 600,
                          borderRadius: 2,
                          border: '1px solid rgba(149,142,160,0.2)',
                          background: store.materialPreset === m.value ? 'rgba(208,188,255,0.12)' : '#2a2a2c',
                          color: store.materialPreset === m.value ? '#d0bcff' : '#cbc3d7',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >{m.label}</button>
                    ))}
                  </div>
                </div>

                <div style={styles.colorPickers}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em', color: '#958ea0' }}>
                        BASE COLOR
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#d0bcff' }}>
                        {(getVal('color') || '#6c63ff').toUpperCase()}
                      </div>
                    </div>
                    <HexColorPicker color={getVal('color') || '#6c63ff'} onChange={(c) => updateDesign('color', c)} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em', color: '#958ea0' }}>
                        LEGEND COLOR
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#d0bcff' }}>
                        {(getVal('legendColor') || '#ffffff').toUpperCase()}
                      </div>
                    </div>
                    <HexColorPicker color={getVal('legendColor') || '#ffffff'} onChange={(c) => updateDesign('legendColor', c)} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* SOUND TOGGLE */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <input type="checkbox" checked={store.soundEnabled} onChange={(e) => { store.setSoundEnabled(e.target.checked); if (e.target.checked) { import('../utils/soundEngine').then(m => m.playKeycapSound(store.materialPreset)); } }} style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: '12px', color: '#666680' }}>Key sounds</span>
                </div>
              </div>
            )}

            {/* ===== LEGEND TAB ===== */}
            {activeTab === 'LEGEND' && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Legend Text</div>
                <input
                  type="text"
                  maxLength={4}
                  style={{ ...styles.input, fontSize: '20px', letterSpacing: '2px' }}
                  value={store.globalLegendText || ''}
                  onChange={(e) => store.setGlobalLegendText(e.target.value)}
                  placeholder="A"
                />

                <div style={{ ...styles.sectionLabel, marginTop: 20 }}>Legend Position</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {LEGEND_POSITIONS.map(pos => {
                    const isActive = store.globalLegendPosition === pos.value;
                    const ledType = store.keyboardLEDType || 'None';
                    // Determine if this position is recommended for the current LED type
                    let isRecommended = false;
                    if (ledType.includes('North') && (pos.value === 'top-center' || pos.value === 'top-left' || pos.value === 'top-right')) isRecommended = true;
                    if (ledType.includes('South') && pos.value === 'front') isRecommended = true;
                    if (ledType.includes('Per-key')) isRecommended = true; // All positions work

                    return (
                      <button
                        key={pos.value}
                        style={{
                          ...styles.pillInactive,
                          ...(isActive ? { background: '#6c63ff', color: '#fff' } : {}),
                          ...(isRecommended && !isActive ? { borderColor: '#0d9e7555' } : {}),
                          borderRadius: 17, fontSize: 11,
                          position: 'relative',
                        }}
                        onClick={() => store.setGlobalLegendPosition(pos.value)}
                      >
                        {pos.label}
                        {isRecommended && <span style={{ marginLeft: 4, color: isActive ? '#fff' : '#0d9e75', fontSize: 9 }}>★</span>}
                      </button>
                    );
                  })}
                </div>

                {/* LED + Legend position guidance */}
                {store.keyboardLEDType && store.keyboardLEDType !== 'None' && (
                  <div style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    background: 'rgba(13, 158, 117, 0.08)',
                    border: '1px solid rgba(13, 158, 117, 0.2)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: '#5dcaa5',
                    lineHeight: 1.5,
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: store.keyboardLEDType.includes('North') ? '#a09bf5' :
                                   store.keyboardLEDType.includes('South') ? '#f5a623' : '#5dcaa5'
                      }} />
                      {store.keyboardLEDType}
                    </div>
                    {store.keyboardLEDType.includes('North') && (
                      <span>Top positions (★) work best — light shines directly through legends.</span>
                    )}
                    {store.keyboardLEDType.includes('South') && (
                      <span>Front face (★) catches underglow. Top positions also work well.</span>
                    )}
                    {store.keyboardLEDType.includes('Per-key') && (
                      <span>All positions work great with per-key RGB — light fills entire keycap.</span>
                    )}
                  </div>
                )}

                <div style={{ ...styles.sectionLabel, marginTop: 20 }}>Font</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {FONTS.map(f => {
                    const isActive = getVal('font') === f.value;
                    return (
                      <button
                        key={f.value}
                        style={{
                          padding: '8px 12px', background: isActive ? '#6c63ff15' : '#1a1a2e',
                          border: `1px solid ${isActive ? '#6c63ff' : '#2a2a3a'}`, borderRadius: 6,
                          color: isActive ? '#a09bf5' : '#aaaacc', fontFamily: f.value, fontSize: 14,
                          cursor: 'pointer', width: '100%', textAlign: 'left', transition: '0.15s',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                        onClick={() => updateDesign('font', f.value)}
                      >
                        <span>{f.label}</span>
                        <span style={{ fontSize: 10, color: '#444460' }}>{f.tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== IMAGE TAB ===== */}
            {activeTab === 'IMAGE' && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Image Mode</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {IMAGE_MODES.map(m => {
                    const isActive = store.keyboardImageMode === m.value;
                    return (
                      <button
                        key={m.value}
                        onClick={() => store.setKeyboardImageMode(m.value)}
                        style={{
                          padding: '14px 10px', background: isActive ? '#6c63ff11' : '#1a1a2e',
                          border: `1px solid ${isActive ? '#6c63ff' : '#2a2a3a'}`, borderRadius: 8,
                          textAlign: 'center', cursor: 'pointer', transition: '0.2s',
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{m.icon}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{m.label}</div>
                        <div style={{ fontSize: 10, color: '#666680', marginTop: 2 }}>{m.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {(store.keyboardImageMode === 'wrap' || store.keyboardImageMode === 'tile') && (
                  <>
                    <input type="file" ref={fileInputRef} accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleImageUpload} />
                    <div
                      style={styles.uploadArea}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) handleImageUpload({ target: { files: [f] } }); }}
                    >
                      Drop image here<br /><small style={{ color: '#444460' }}>PNG, JPG, WebP up to 5MB</small>
                    </div>
                    {uploadedImageUrl && (
                      <img src={uploadedImageUrl} alt="Uploaded" style={{ width: '100%', borderRadius: 6, maxHeight: 100, objectFit: 'cover', marginTop: 8 }} />
                    )}

                    {/* Pan & Zoom Controls */}
                    {store.keyboardImageMode === 'wrap' && uploadedImageUrl && (
                      <div style={{ marginTop: 16, padding: 12, background: '#1a1a2e', borderRadius: 8, border: '1px solid #2a2a3a' }}>
                        <div style={{ fontSize: 11, color: '#666680', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Image Position</div>

                        {/* Zoom */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#888899' }}>Zoom</span>
                            <span style={{ fontSize: 11, color: '#a09bf5' }}>{(store.keyboardImageScale || 1).toFixed(1)}x</span>
                          </div>
                          <input
                            type="range" min="0.3" max="3" step="0.1"
                            value={store.keyboardImageScale || 1}
                            onChange={(e) => store.setKeyboardImageScale(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#6c63ff' }}
                          />
                        </div>

                        {/* Pan X */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#888899' }}>Pan X</span>
                            <span style={{ fontSize: 11, color: '#a09bf5' }}>{((store.keyboardImageOffsetX || 0) * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range" min="-3" max="3" step="0.05"
                            value={store.keyboardImageOffsetX || 0}
                            onChange={(e) => store.setKeyboardImageOffsetX(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#6c63ff' }}
                          />
                        </div>

                        {/* Pan Y */}
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#888899' }}>Pan Y</span>
                            <span style={{ fontSize: 11, color: '#a09bf5' }}>{((store.keyboardImageOffsetY || 0) * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range" min="-3" max="3" step="0.05"
                            value={store.keyboardImageOffsetY || 0}
                            onChange={(e) => store.setKeyboardImageOffsetY(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#6c63ff' }}
                          />
                        </div>

                        {/* Reset button */}
                        <button
                          onClick={() => { store.setKeyboardImageScale(1); store.setKeyboardImageOffsetX(0); store.setKeyboardImageOffsetY(0); }}
                          style={{ width: '100%', padding: '8px', background: '#252542', border: '1px solid #3a3a5a', borderRadius: 4, color: '#888899', fontSize: 11, cursor: 'pointer' }}
                        >
                          Reset Position
                        </button>
                      </div>
                    )}

                    {/* Multi-Image Layers */}
                    {store.keyboardImageMode === 'wrap' && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 11, color: '#666680', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Image Layers (5 max)
                        </div>
                        {store.keyboardImages.map((img, idx) => (
                          <div key={img.id} style={{ marginBottom: 8, padding: 10, background: '#1a1a2e', borderRadius: 8, border: `1px solid ${img.enabled ? '#6c63ff' : '#2a2a3a'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: img.url ? 8 : 0 }}>
                              <input
                                type="checkbox"
                                checked={img.enabled}
                                onChange={(e) => store.setImageEnabled(img.id, e.target.checked)}
                                style={{ accentColor: '#6c63ff' }}
                              />
                              <span style={{ fontSize: 12, color: '#888899', flex: 1 }}>Layer {img.id}</span>
                              <input
                                type="file"
                                id={`layer-${img.id}`}
                                accept="image/png,image/jpeg,image/webp"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = URL.createObjectURL(file);
                                    store.setImageUrl(img.id, url);
                                  }
                                }}
                              />
                              <button
                                onClick={() => document.getElementById(`layer-${img.id}`).click()}
                                style={{ padding: '4px 8px', background: '#252542', border: '1px solid #3a3a5a', borderRadius: 4, color: '#888899', fontSize: 10, cursor: 'pointer' }}
                              >
                                {img.url ? 'Change' : 'Upload'}
                              </button>
                              {img.url && (
                                <button
                                  onClick={() => store.clearImage(img.id)}
                                  style={{ padding: '4px 8px', background: '#3a2020', border: '1px solid #5a3030', borderRadius: 4, color: '#ff6666', fontSize: 10, cursor: 'pointer' }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            {img.url && (
                              <>
                                <img src={img.url} alt={`Layer ${img.id}`} style={{ width: '100%', height: 50, objectFit: 'cover', borderRadius: 4, marginBottom: 8, opacity: img.enabled ? 1 : 0.4 }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                  <div>
                                    <span style={{ fontSize: 9, color: '#666680' }}>Opacity</span>
                                    <input type="range" min="0" max="1" step="0.1" value={img.opacity} onChange={(e) => store.setImageOpacity(img.id, parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#6c63ff' }} />
                                  </div>
                                  <div>
                                    <span style={{ fontSize: 9, color: '#666680' }}>Scale</span>
                                    <input type="range" min="0.5" max="2" step="0.1" value={img.scale} onChange={(e) => store.setImageScale(img.id, parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#6c63ff' }} />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        {store.keyboardImages.some(img => img.url) && (
                          <button
                            onClick={() => store.clearAllImages()}
                            style={{ width: '100%', padding: '8px', marginTop: 8, background: '#3a2020', border: '1px solid #5a3030', borderRadius: 4, color: '#ff6666', fontSize: 11, cursor: 'pointer' }}
                          >
                            Clear All Layers
                          </button>
                        )}
                      </div>
                    )}

                    <p style={styles.note}>
                      {store.keyboardImageMode === 'wrap' ? 'Image will span across all keycaps as one unified canvas' : 'Same image repeats on every key'}
                    </p>
                  </>
                )}

                {store.keyboardImageMode === 'perkey' && (
                  <>
                    {!store.selectedKey ? (
                      <div style={{ color: '#444460', fontSize: 12, textAlign: 'center', padding: 16 }}>
                        Click any key on the keyboard to select it, then upload an image for that key
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 12, color: '#888899', marginBottom: 8 }}>Uploading for key: <strong style={{ color: '#fff' }}>{store.selectedKey}</strong></div>
                        <input type="file" ref={fileInputRef} accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleImageUpload} />
                        <div style={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
                          Drop image here<br /><small style={{ color: '#444460' }}>PNG, JPG, WebP up to 5MB</small>
                        </div>
                      </>
                    )}
                    <p style={styles.note}>Select any key to set its specific image</p>
                  </>
                )}
              </div>
            )}

            {/* ===== BACKLIT TAB ===== */}
            {activeTab === 'BACKLIT' && (
              <div style={styles.section}>
                {store.selectionPath === 'beginner' || (store.selectedModel && store.selectedModel !== 'Custom Build') ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#fff', fontWeight: 600 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: LEDTypeColor(store.keyboardLEDType), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff' }}>
                        {LEDTypeIcon(store.keyboardLEDType)}
                      </div>
                      {store.keyboardLEDType || 'None'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888899', marginTop: '4px' }}>
                      Fixed by your keyboard's hardware
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    <div style={styles.sectionLabel}>LED Type</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {['North-facing RGB', 'South-facing RGB', 'Per-key RGB', 'None'].map(t => {
                        const isActive = store.keyboardLEDType === t;
                        const color = LEDTypeColor(t);
                        return (
                          <button key={t} style={{
                            padding: '8px', borderRadius: '6px', textAlign: 'center', fontSize: '13px', fontWeight: 600,
                            background: isActive ? color : 'var(--card-bg)', color: isActive ? '#fff' : 'var(--text-secondary)',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                          }} onClick={() => store.setKeyboardLEDType(t)}>
                            {t.replace('-facing RGB', '').replace(' RGB', '')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={styles.flexRow}>
                  <span style={styles.label}>RGB Backlight</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={store.backlitEnabled} onChange={(e) => store.setBacklitEnabled(e.target.checked)} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {store.backlitEnabled && (
                  <div style={{ marginTop: 24 }}>
                    <label style={styles.label}>Backlit Color</label>
                    <HexColorPicker color={store.backlitColor} onChange={(c) => store.setBacklitColor(c)} style={{ width: '100%' }} />
                  </div>
                )}

                <div 
                  onClick={() => store.setLedPreviewExpanded(true)}
                  style={{ marginTop: '24px', fontSize: '12px', color: '#6c63ff', cursor: 'pointer', textDecoration: 'underline' }}>
                  See the LED diagram →
                </div>
              </div>
            )}

            {/* ===== EXPORT TAB ===== */}
            {activeTab === 'EXPORT' && (
              <div style={styles.section}>
                {/* Pre-flight Check Button */}
                <button
                  onClick={handleRunPreflight}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px',
                    background: 'linear-gradient(135deg, #2d2d5a 0%, #1a1a3a 100%)', border: '1px solid #4a4a8a',
                    borderRadius: 8, cursor: 'pointer', marginBottom: 16, width: '100%',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6c63ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#4a4a8a'; }}
                >
                  <span style={{ fontSize: 16 }}>✓</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#a09bf5' }}>Run Pre-flight Check</span>
                </button>

                {/* Quick Exports Section */}
                <div style={{ fontSize: 11, color: '#666680', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Exports</div>

                {/* PNG Export with angle options */}
                <div style={{ marginBottom: 10 }}>
                  <button
                    onClick={() => handleExportPNG()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      background: '#252542', border: '1px solid #6c63ff', borderRadius: '8px 8px 0 0',
                      cursor: 'pointer', transition: '0.2s', width: '100%', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b7fff'; e.currentTarget.style.background = '#6c63ff15'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#6c63ff'; e.currentTarget.style.background = '#252542'; }}
                  >
                    <span style={{ fontSize: 24 }}>🖼</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#a09bf5' }}>PNG Render (Current View)</div>
                      <div style={{ fontSize: 11, color: '#666680' }}>Export exactly what you see</div>
                    </div>
                  </button>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {[
                      { key: 'topDown', label: 'Top' },
                      { key: 'isometric', label: 'Iso' },
                      { key: 'front', label: 'Front' },
                      { key: 'hero', label: 'Hero' },
                    ].map((angle, i, arr) => (
                      <button
                        key={angle.key}
                        onClick={() => handleExportPNG(angle.key)}
                        style={{
                          flex: 1, padding: '8px 4px', background: '#1e1e3a', border: '1px solid #6c63ff',
                          borderTop: 'none',
                          borderRadius: i === 0 ? '0 0 0 8px' : i === arr.length - 1 ? '0 0 8px 0' : 0,
                          borderLeft: i > 0 ? 'none' : undefined,
                          cursor: 'pointer', fontSize: 11, color: '#a09bf5', transition: '0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#6c63ff30'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#1e1e3a'; }}
                      >
                        {angle.label}
                      </button>
                    ))}
                  </div>
                </div>

                {[
                  { icon: '📄', label: 'Print-ready PDF', desc: 'High quality PDF render', size: '~2-4MB', onClick: handleExportPDF },
                  { icon: '🔗', label: 'Share URL', desc: 'Copy link to this design', size: '', onClick: handleShareURL },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={btn.disabled ? undefined : btn.onClick}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: 8,
                      cursor: btn.disabled ? 'not-allowed' : 'pointer', transition: '0.2s',
                      opacity: btn.disabled ? 0.4 : 1, marginBottom: 10, width: '100%', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { if (!btn.disabled) { e.currentTarget.style.borderColor = '#8b7fff'; e.currentTarget.style.background = '#6c63ff15'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a3a'; e.currentTarget.style.background = '#1a1a2e'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <span style={{ fontSize: 24 }}>{btn.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{btn.label}</div>
                      <div style={{ fontSize: 11, color: '#666680' }}>{btn.desc}</div>
                      {btn.size && <div style={{ fontSize: 10, color: '#444460' }}>{btn.size}</div>}
                    </div>
                  </button>
                ))}

                {/* Manufacturing Exports Section */}
                <div style={{ fontSize: 11, color: '#666680', marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Manufacturing</div>
                {[
                  { icon: '⌨', label: 'KLE JSON', desc: 'Industry-standard layout format', size: '~5KB', onClick: handleExportKLE },
                  { icon: '📐', label: 'Manufacturing SVG', desc: '1:1 scale with CMYK annotations', size: '~50KB', onClick: handleExportManufacturingSVG },
                  { icon: '📋', label: 'Metadata JSON', desc: 'Colors, specs, RAL matching', size: '~2KB', onClick: handleExportMetadata },
                  { icon: '🎯', label: 'WASD Template', desc: 'Ready for wasdkeyboards.com', size: '~50KB', onClick: handleExportWASD },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={btn.onClick}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: 8,
                      cursor: 'pointer', transition: '0.2s', marginBottom: 10, width: '100%', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b7fff'; e.currentTarget.style.background = '#6c63ff15'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a3a'; e.currentTarget.style.background = '#1a1a2e'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <span style={{ fontSize: 24 }}>{btn.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{btn.label}</div>
                      <div style={{ fontSize: 11, color: '#666680' }}>{btn.desc}</div>
                      {btn.size && <div style={{ fontSize: 10, color: '#444460' }}>{btn.size}</div>}
                    </div>
                  </button>
                ))}

                {/* Full Package Button */}
                <button
                  onClick={handleExportFullPackage}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px',
                    background: 'linear-gradient(135deg, #6c63ff 0%, #4a4090 100%)', border: 'none',
                    borderRadius: 8, cursor: 'pointer', marginTop: 16, width: '100%',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108, 99, 255, 0.4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <span style={{ fontSize: 20 }}>📦</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Export Full Package</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>KLE + SVG + Metadata (3 files)</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SPEC RAIL */}
          <div style={{
            marginTop: 'auto',
            padding: '14px 16px',
            borderTop: '1px solid rgba(149,142,160,0.1)',
          }}>
            {[
              { label: 'PROFILE', value: (store.selectedProfile || 'cherry').toUpperCase() },
              { label: 'MATERIAL', value: (store.materialPreset || 'abs').toUpperCase() },
              { label: 'FORM FACTOR', value: store.selectedFormFactor || '60%' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#958ea0', letterSpacing: '0.08em' }}>
                  {s.label}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#e5e1e4', fontWeight: 500 }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3D CANVAS */}
        <div
          style={{ ...styles.canvasArea, cursor: imageDragMode ? (isDraggingImage ? 'grabbing' : 'grab') : 'default' }}
          onMouseDown={(e) => {
            if (!imageDragMode || store.keyboardImageMode !== 'wrap') return;
            setIsDraggingImage(true);
            // Store starting offsets for all enabled layers
            const enabledLayers = store.keyboardImages.filter(img => img.enabled && img.url);
            dragStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              layers: enabledLayers.map(img => ({ id: img.id, offsetX: img.offsetX, offsetY: img.offsetY })),
              // Legacy fallback
              offsetX: store.keyboardImageOffsetX || 0,
              offsetY: store.keyboardImageOffsetY || 0
            };
          }}
          onMouseMove={(e) => {
            if (!isDraggingImage) return;
            const dx = (e.clientX - dragStartRef.current.x) / 300;
            const dy = (e.clientY - dragStartRef.current.y) / 300;

            // Move all enabled layers together
            if (dragStartRef.current.layers?.length > 0) {
              dragStartRef.current.layers.forEach(layer => {
                store.setImageOffset(layer.id, layer.offsetX + dx, layer.offsetY + dy);
              });
            } else {
              store.setKeyboardImageOffsetX(dragStartRef.current.offsetX + dx);
              store.setKeyboardImageOffsetY(dragStartRef.current.offsetY + dy);
            }
          }}
          onMouseUp={() => setIsDraggingImage(false)}
          onMouseLeave={() => setIsDraggingImage(false)}
          onWheel={(e) => {
            if (!imageDragMode || store.keyboardImageMode !== 'wrap') return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;

            // Zoom all enabled layers together
            const enabledLayers = store.keyboardImages.filter(img => img.enabled && img.url);
            if (enabledLayers.length > 0) {
              enabledLayers.forEach(img => {
                const newScale = Math.max(0.2, Math.min(5, img.scale + delta));
                store.setImageScale(img.id, newScale);
              });
            } else {
              // Legacy single image mode
              const newScale = Math.max(0.2, Math.min(5, (store.keyboardImageScale || 1) + delta));
              store.setKeyboardImageScale(newScale);
            }
          }}
        >
          <ErrorBoundary>
            <Canvas
              gl={{
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: true,
                powerPreference: "high-performance",
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 0.85,
                outputColorSpace: THREE.SRGBColorSpace,
              }}
              dpr={[1, 2]}
              shadows={{ type: THREE.PCFShadowMap }}
              camera={{
                position: viewMode === 'full' ? [0, 8, 12] : [0, 1.0, 3.2],
                fov: viewMode === 'full' ? 50 : 38,
                near: 0.1,
                far: 1000
              }}
              onCreated={(state) => {
                state.gl.setClearColor('#131315');
              }}
            >
              <Suspense fallback={null}>
                {/* STUDIO LIGHTING */}
                <ambientLight intensity={0.4} color="#ffffff" />
                <directionalLight position={[6, 10, 6]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.001} />
                <directionalLight position={[-5, 4, -3]} intensity={0.35} color="#c8d4ff" />
                <directionalLight position={[0, 3, -6]} intensity={0.3} color="#ffffff" />

                {/* Background handled by CSS gradient on canvas container */}

                {viewMode === 'full' && <CameraAnimator cameraStateRef={cameraStateRef} orbitRef={orbitRef} />}

                {viewMode === 'full' ? (
                  <KeyboardRenderer onKeyClick={handleKeyFocus} />
                ) : (
                  <group position={[0, 0, 0]}>
                    {/* Dedicated neutral lighting for single key — overrides warm HDRI */}
                    <directionalLight position={[3, 5, 3]} intensity={2.0} color="#ffffff" castShadow />
                    <directionalLight position={[-2, 2, -1]} intensity={0.5} color="#ddeeff" />
                    <ambientLight intensity={0.4} />

                    {viewMode === 'single' && (
                  <group position={[0, -0.6, 0]}>
                    <mesh position={[0, -0.4, 0]} receiveShadow>
                      <cylinderGeometry args={[1.2, 1.4, 0.8, 32]} />
                      <meshStandardMaterial color="#080808" metalness={0.8} roughness={0.2} />
                    </mesh>
                    <mesh position={[0, -0.4, 0]} receiveShadow>
                      <ringGeometry args={[1.4, 1.6, 32]} />
                      <meshStandardMaterial color="#6c63ff" emissive="#6c63ff" emissiveIntensity={0.5} roughness={0.1} />
                    </mesh>
                    <mesh position={[0, -0.81, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                      <planeGeometry args={[10, 10]} />
                      <meshBasicMaterial color="#050510" transparent opacity={0.6} depthWrite={false} />
                    </mesh>
                  </group>
                )}

                    {/* Single keycap with animation */}
                    <Keycap
                      keyId="preview"
                      label={store.globalLegendText || 'A'}
                      isSelected={false}
                      singleKeyMode={true}
                      onClick={() => {}}
                      profile={store.selectedProfile || 'cherry'}
                    />
                  </group>
                )}

                <ContactShadows position={[0, viewMode === 'full' ? -0.8 : -0.75, 0]} opacity={0.55} scale={40} blur={3} far={8} />

                <StudioOrbitControls orbitRef={orbitRef} cameraStateRef={cameraStateRef} viewMode={viewMode} enabled={!imageDragMode} />
              </Suspense>
            </Canvas>
          </ErrorBoundary>

          <LEDPreviewWidget />

          {/* Image drag mode toggle */}
          {store.keyboardImageMode === 'wrap' && viewMode === 'full' && (
            <button
              onClick={() => setImageDragMode(!imageDragMode)}
              style={{
                position: 'absolute', bottom: 24, left: 24, zIndex: 20,
                padding: '10px 16px', background: imageDragMode ? '#6c63ff' : 'rgba(20,20,30,0.9)',
                border: `1px solid ${imageDragMode ? '#8b84ff' : '#3a3a5a'}`, borderRadius: 8,
                color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: 16 }}>{imageDragMode ? '✋' : '🖼️'}</span>
              {imageDragMode ? 'Exit Image Mode (Click to orbit)' : 'Move Image (Drag & Scroll)'}
            </button>
          )}

          {/* Image drag mode instructions */}
          {imageDragMode && store.keyboardImageMode === 'wrap' && (
            <div style={{
              position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
              padding: '8px 16px', background: 'rgba(108,99,255,0.9)', borderRadius: 8,
              color: '#fff', fontSize: 12, fontWeight: 500, backdropFilter: 'blur(8px)',
            }}>
              Drag to move image • Scroll to zoom • Click button to exit
            </div>
          )}

          {/* TASK 4 — Full view reset button overlay */}
          {isCameraFocused && viewMode === 'full' && (
            <button
              onClick={() => { store.setSelectedKey(null); resetCamera(); }}
              style={{
                position: 'absolute', top: 24, left: 24, zIndex: 20,
                padding: '8px 16px', background: 'var(--surface-container)',
                border: '1px solid var(--outline-variant)', borderRadius: 4,
                color: 'var(--on-surface)', fontSize: 13, fontFamily: 'var(--font-heading)', fontWeight: 700,
                cursor: 'pointer', backdropFilter: 'blur(8px)',
                transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-container-high)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-container)'; e.currentTarget.style.borderColor = 'var(--outline-variant)'; }}
            >
              ← RETURN TO ORBIT
            </button>
          )}
        </div>
      </div>

      {/* STATUS BAR */}
      <div style={{
        height: 28,
        background: '#0e0e10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        borderTop: '1px solid rgba(149,142,160,0.1)',
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#958ea0' }}>
          ACTIVE PROJECT: {(store.selectedModel || 'UNTITLED').replace(/ /g, '_').toUpperCase()}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#958ea0' }}>
          RENDER ENGINE: WEBGL_RTX
        </span>
      </div>

      {/* Pre-flight Check Modal */}
      {showPreflightModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={() => setShowPreflightModal(false)}>
          <div style={{
            background: '#1a1a2e', borderRadius: 12, padding: 24, maxWidth: 480, width: '90%',
            maxHeight: '80vh', overflow: 'auto', border: '1px solid #2a2a4a'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Pre-flight Check</h3>
              <button onClick={() => setShowPreflightModal(false)} style={{
                background: 'none', border: 'none', color: '#666', fontSize: 24, cursor: 'pointer', lineHeight: 1
              }}>&times;</button>
            </div>

            {preflightIssues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16, color: '#0d9e75', fontWeight: 500 }}>All checks passed!</div>
                <div style={{ fontSize: 13, color: '#666680', marginTop: 8 }}>Your design is ready for manufacturing export.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {preflightIssues.map((issue, i) => (
                  <div key={i} style={{
                    padding: 14, borderRadius: 8,
                    background: issue.type === 'error' ? 'rgba(220, 53, 69, 0.15)' :
                               issue.type === 'warning' ? 'rgba(255, 193, 7, 0.15)' : 'rgba(108, 99, 255, 0.15)',
                    border: `1px solid ${issue.type === 'error' ? '#dc3545' :
                                         issue.type === 'warning' ? '#ffc107' : '#6c63ff'}40`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>
                        {issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️'}
                      </span>
                      <div>
                        <div style={{ fontSize: 13, color: '#fff', fontWeight: 500, marginBottom: 4 }}>{issue.message}</div>
                        {issue.suggestion && (
                          <div style={{ fontSize: 12, color: '#888899' }}>💡 {issue.suggestion}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowPreflightModal(false)}
              style={{
                marginTop: 24, width: '100%', padding: '12px', background: '#6c63ff',
                border: 'none', borderRadius: 6, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer'
              }}
            >
              {preflightIssues.length === 0 ? 'Continue to Export' : 'Got it'}
            </button>
          </div>
        </div>
      )}

      {/* Save Design Modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={() => setShowSaveModal(false)}>
          <div style={{
            background: 'var(--surface)', borderRadius: 4, padding: 32, width: 400,
            border: '1px solid var(--outline-variant)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{
              margin: '0 0 8px 0', fontFamily: 'var(--font-heading)', fontSize: 20,
              fontWeight: 700, color: 'var(--on-surface)', textTransform: 'uppercase'
            }}>Save Design</h3>
            <p style={{
              margin: '0 0 24px 0', fontFamily: 'var(--font-body)', fontSize: 14,
              color: 'var(--on-surface-variant)'
            }}>Save your current design to your account.</p>

            <input
              type="text"
              placeholder="Design name..."
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveDesign()}
              autoFocus
              style={{
                width: '100%', padding: '14px 16px', background: 'var(--surface-container)',
                border: '1px solid var(--outline-variant)', borderRadius: 4,
                color: 'var(--on-surface)', fontFamily: 'var(--font-body)', fontSize: 14,
                outline: 'none', boxSizing: 'border-box', marginBottom: 24
              }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{
                  flex: 1, padding: 12, background: 'transparent',
                  border: '1px solid var(--outline-variant)', borderRadius: 4,
                  color: 'var(--on-surface-variant)', fontFamily: 'var(--font-heading)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase'
                }}
              >Cancel</button>
              <button
                onClick={handleSaveDesign}
                disabled={saveLoading}
                style={{
                  flex: 1, padding: 12, background: 'var(--primary)',
                  border: 'none', borderRadius: 4, color: 'var(--on-primary)',
                  fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700,
                  cursor: saveLoading ? 'wait' : 'pointer', textTransform: 'uppercase',
                  opacity: saveLoading ? 0.7 : 1
                }}
              >{saveLoading ? 'Saving...' : 'Save Design'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastVisible && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#0d9e75', color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: '13px', zIndex: 9999, transition: 'opacity 0.3s', pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {toastMessage}
        </div>
      )}

      {/* Typing Test Modal */}
      {showTypingTest && <TypingTest onClose={() => setShowTypingTest(false)} />}
    </div>
  );
}

const styles = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-dim)', overflow: 'hidden' },
  topBar: {
    height: '56px',
    backgroundColor: 'rgba(6, 6, 8, 0.85)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(246, 246, 246, 0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', zIndex: 100,
  },
  topBarCenter: { fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--secondary)', fontSize: '12px', letterSpacing: '0.12em' },
  viewToggleBtn: {
    fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '12px',
    padding: '10px 18px', backgroundColor: 'rgba(246, 246, 246, 0.05)',
    color: 'var(--on-surface)', border: '1px solid rgba(246, 246, 246, 0.1)',
    borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    height: '38px', display: 'flex', alignItems: 'center', gap: '8px',
  },
  workspace: { flex: 1, display: 'flex', position: 'relative', minHeight: 0 },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    width: 300,
    background: 'rgba(10, 10, 12, 0.95)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    flexShrink: 0,
    borderRight: '1px solid rgba(246, 246, 246, 0.06)',
    zIndex: 10,
  },
  tabs: {
    display: 'flex', overflowX: 'auto',
    borderBottom: '1px solid rgba(246, 246, 246, 0.06)',
    justifyContent: 'space-around', alignItems: 'center',
    background: 'rgba(6, 6, 8, 0.6)', padding: '6px 0',
  },
  panelContent: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '28px 22px',
  },
  section: { display: 'flex', flexDirection: 'column', gap: '20px' },
  sectionLabel: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--secondary)', marginBottom: 10, fontWeight: 500 },
  pillToggleContainer: { display: 'flex', background: 'rgba(246, 246, 246, 0.04)', borderRadius: '10px', padding: '4px', alignSelf: 'stretch' },
  pillActive: {
    flex: 1, background: 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)',
    borderRadius: '8px', padding: '10px 0', color: 'var(--on-primary)',
    fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 700,
    border: 'none', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 12px rgba(208, 188, 255, 0.25)',
  },
  pillInactive: {
    flex: 1, background: 'transparent', color: 'var(--on-surface-variant)',
    padding: '10px 0', fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 600,
    border: 'none', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer', textAlign: 'center',
  },
  warning: {
    padding: '14px 16px', backgroundColor: 'rgba(255, 184, 105, 0.08)',
    color: 'var(--warning)', fontSize: '13px', borderRadius: '10px',
    borderLeft: '3px solid var(--warning)', fontFamily: 'var(--font-body)',
  },
  label: { fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '10px', display: 'block' },
  colorPickers: { display: 'flex', flexDirection: 'column', gap: '28px' },
  input: {
    width: '100%', padding: '14px 16px',
    backgroundColor: 'rgba(246, 246, 246, 0.04)',
    border: '1px solid rgba(246, 246, 246, 0.08)',
    borderRadius: '10px', color: 'var(--on-surface)',
    fontFamily: 'var(--font-mono)', boxSizing: 'border-box', fontSize: '14px',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  uploadArea: {
    border: '1px dashed rgba(208, 188, 255, 0.4)', padding: '32px 24px',
    textAlign: 'center', borderRadius: '12px', color: 'var(--primary)',
    cursor: 'pointer', backgroundColor: 'rgba(208, 188, 255, 0.04)',
    fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 500,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  note: { fontSize: '12px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-body)', marginTop: '8px', lineHeight: 1.6 },
  flexRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  canvasArea: {
    flex: 1,
    position: 'relative',
    background: 'radial-gradient(ellipse at 50% 30%, rgba(30, 27, 46, 0.8) 0%, #060608 70%)',
  },
};
