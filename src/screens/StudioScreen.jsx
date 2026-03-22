import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stars, Stats } from '@react-three/drei';
import { EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { HexColorPicker } from 'react-colorful';
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import ErrorBoundary from '../components/ErrorBoundary';
import KeyboardRenderer from '../components/KeyboardRenderer';
import Keycap from '../components/Keycap';
import LEDPreviewWidget from '../components/LEDPreviewWidget';
import { getLayoutForFormFactor } from '../data/layouts';

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

function StudioOrbitControls({ orbitRef, cameraStateRef, viewMode }) {
  const { camera } = useThree();
  return (
    <OrbitControls
      ref={orbitRef}
      enableDamping
      dampingFactor={0.05}
      enableZoom
      enablePan
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

const PRESET_COLORS = ['#1a1a1a', '#f0f0f0', '#1e3a5f', '#c0392b', '#6c63ff', '#0d9e75', '#e91e8c', '#f5c518'];
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
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'front', label: 'Front Face' },
  { value: 'none', label: 'Hidden' },
];

const IMAGE_MODES = [
  { value: 'none', icon: '⬜', label: 'No Image', desc: 'Solid color only' },
  { value: 'wrap', icon: '🖼', label: 'Wrap Keyboard', desc: 'One image across all keys' },
  { value: 'tile', icon: '🔲', label: 'Tile All Keys', desc: 'Same image on every key' },
  { value: 'perkey', icon: '🎯', label: 'Per Key Image', desc: 'Different image per key' },
];

export default function StudioScreen() {
  const store = useStore();
  const [activeTab, setActiveTab] = useState('DESIGN');
  const [viewMode, setViewMode] = useState('full');
  const [targetScope, setTargetScope] = useState('all');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
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

  // Compute layout bounds for camera positioning
  const layoutData = useCallback(() => {
    let mappedFF = 'SIXTY';
    const ff = store.selectedFormFactor;
    if (ff === '75%') mappedFF = 'SEVENTY_FIVE';
    else if (ff === 'TKL' || ff === '80%') mappedFF = 'TKL_80';
    else if (ff === '100%') mappedFF = 'FULL_100';
    else if (ff === '65%') mappedFF = 'SIXTY_FIVE';
    const layout = getLayoutForFormFactor(mappedFF) || [];
    if (!layout.length) return { layout, minX: 0, minZ: 0, maxW: 0, maxH: 0 };
    const minX = Math.min(...layout.map(k => Number(k.x)));
    const minZ = Math.min(...layout.map(k => Number(k.y)));
    const maxX = Math.max(...layout.map(k => Number(k.x) + (Number(k.w) || 1)));
    const maxZ = Math.max(...layout.map(k => Number(k.y) + (Number(k.h) || 1)));
    return { layout, minX, minZ, maxW: maxX - minX, maxH: maxZ - minZ };
  }, [store.selectedFormFactor]);

  const handleKeyFocus = useCallback((keyId) => {
    store.setSelectedKey(keyId);
    const { layout, minX, minZ, maxW, maxH } = layoutData();
    const key = layout.find(k => k.id === keyId);
    if (!key || viewMode !== 'full') return;
    const kx = (Number(key.x) - minX - maxW / 2 + (Number(key.w) || 1) / 2) * KEY_UNIT;
    const kz = (Number(key.y) - minZ - maxH / 2 + (Number(key.h) || 1) / 2) * KEY_UNIT;
    cameraStateRef.current.target = [kx, 0, kz];
    cameraStateRef.current.pos = [kx, 3.5, kz + 5];
    cameraStateRef.current.isAnimating = true;
    setIsCameraFocused(true);
  }, [store, layoutData, viewMode]);

  const resetCamera = useCallback(() => {
    cameraStateRef.current.pos = [...defaultCamPos];
    cameraStateRef.current.target = [...defaultCamTarget];
    cameraStateRef.current.isAnimating = true;
    setIsCameraFocused(false);
  }, []);

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
  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `keycap-studio-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('PNG exported!');
  };

  const handleExportSVG = () => {
    try {
      const state = useStore.getState();
      let mappedFF = 'SIXTY';
      const ff = state.selectedFormFactor;
      if (ff === '75%') mappedFF = 'SEVENTY_FIVE';
      else if (ff === 'TKL' || ff === '80%') mappedFF = 'TKL_80';
      else if (ff === '100%') mappedFF = 'FULL_100';
      else if (ff === '65%') mappedFF = 'SIXTY_FIVE';
      const layout = getLayoutForFormFactor(mappedFF) || [];
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

  // TASK 5 — PDF export
  const handleExportPDF = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    try {
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(10, 10, 15);
      pdf.rect(0, 0, pdfW, pdfH, 'F');
      pdf.addImage(imgData, 'PNG', 10, 10, pdfW - 20, pdfH - 30);
      const state = useStore.getState();
      pdf.setTextColor(108, 99, 255);
      pdf.setFontSize(10);
      pdf.text(`Keycap Studio — ${state.selectedModel || 'Custom Layout'} — ${state.globalColor}`, 10, pdfH - 8);
      pdf.save(`keycap-design-${Date.now()}.pdf`);
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
    setUploadedImageUrl(url);

    // Per-key mode: set image on the selected key
    if (store.keyboardImageMode === 'perkey' && store.selectedKey) {
      store.setPerKeyDesign(store.selectedKey, { imageUrl: url });
      showToast(`Image set for key: ${store.selectedKey}`);
    } else {
      // Tile/wrap mode: set global image
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

          <button style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: 13,
            padding: '6px 16px', borderRadius: 2,
            border: '1px solid rgba(149,142,160,0.3)',
            background: 'transparent', color: '#e5e1e4', cursor: 'pointer',
          }}>SAVE</button>

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

                {/* THEMES */}
                <div style={{ marginBottom: 8 }}>
                  <div style={styles.sectionLabel}>Themes</div>
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

                <div style={styles.presets}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} className={`color-circle ${getVal('color') === c ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => updateDesign('color', c)} />
                  ))}
                </div>

                {/* MATERIAL TOGGLE */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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
                  {LEGEND_POSITIONS.map(pos => (
                    <button
                      key={pos.value}
                      style={{
                        ...styles.pillInactive,
                        ...(store.globalLegendPosition === pos.value ? { background: '#6c63ff', color: '#fff' } : {}),
                        borderRadius: 17, fontSize: 11,
                      }}
                      onClick={() => store.setGlobalLegendPosition(pos.value)}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>

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
                {[
                  { icon: '🖼', label: 'PNG Render', desc: 'High quality 3D screenshot', size: '~2-4MB', onClick: handleExportPNG, prominent: true },
                  { icon: '📐', label: 'SVG Layout', desc: 'Vector layout for manufacturers', size: '~50KB', onClick: handleExportSVG },
                  { icon: '🔗', label: 'Share URL', desc: 'Copy link to this design', size: '', onClick: handleShareURL },
                  { icon: '📄', label: 'Print-ready PDF', desc: 'High quality PDF render', size: '~2-4MB', onClick: handleExportPDF },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={btn.disabled ? undefined : btn.onClick}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      background: btn.prominent ? '#252542' : '#1a1a2e', border: btn.prominent ? '1px solid #6c63ff' : '1px solid #2a2a3a', borderRadius: 8,
                      cursor: btn.disabled ? 'not-allowed' : 'pointer', transition: '0.2s',
                      opacity: btn.disabled ? 0.4 : 1, marginBottom: 10, width: '100%', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { if (!btn.disabled) { e.currentTarget.style.borderColor = '#8b7fff'; e.currentTarget.style.background = '#6c63ff15'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = btn.prominent ? '#6c63ff' : '#2a2a3a'; e.currentTarget.style.background = btn.prominent ? '#252542' : '#1a1a2e'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <span style={{ fontSize: 24 }}>{btn.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: btn.prominent ? '#a09bf5' : '#fff' }}>{btn.label}</div>
                      <div style={{ fontSize: 11, color: '#666680' }}>{btn.desc}</div>
                      {btn.size && <div style={{ fontSize: 10, color: '#444460' }}>{btn.size}</div>}
                    </div>
                  </button>
                ))}
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
              { label: 'PROFILE', value: 'CHERRY' },
              { label: 'THICKNESS', value: '1.5 MM' },
              { label: 'WEIGHT', value: '1.2 G / KEY' },
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
        <div style={styles.canvasArea}>
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
                <Environment preset="apartment" background={false} blur={1} />

                <Stars radius={100} depth={50} count={2000} factor={3} fade speed={0.5} />

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
                    />
                  </group>
                )}

                <ContactShadows position={[0, viewMode === 'full' ? -0.8 : -0.75, 0]} opacity={0.55} scale={40} blur={3} far={8} />

                <StudioOrbitControls orbitRef={orbitRef} cameraStateRef={cameraStateRef} viewMode={viewMode} />

                {/* POST PROCESSING */}
                <EffectComposer multisampling={0} disableNormalPass={false}>
                  <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
                </EffectComposer>
              </Suspense>
            </Canvas>
          </ErrorBoundary>

          <LEDPreviewWidget />

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

      {/* Toast notification */}
      {toastVisible && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#0d9e75', color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: '13px', zIndex: 9999, transition: 'opacity 0.3s', pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-dim)', overflow: 'hidden' },
  topBar: { height: '56px', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 100 },
  topBarCenter: { fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--secondary)', fontSize: '13px', letterSpacing: '0.1em' },
  viewToggleBtn: { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '12px', padding: '10px 16px', backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.05em', height: '36px', display: 'flex', alignItems: 'center' },
  workspace: { flex: 1, display: 'flex', position: 'relative' },
  sidebar: { width: 300, background: '#201f21', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, borderRight: '1px solid var(--outline-variant)', zIndex: 10 },
  tabs: { display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--outline-variant)', justifyContent: 'space-around', alignItems: 'center', background: 'var(--surface-container-lowest)' },
  panelContent: { flex: 1, overflowY: 'auto', padding: '32px 24px' },
  section: { display: 'flex', flexDirection: 'column', gap: '24px' },
  sectionLabel: { fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#958ea0', marginBottom: 12 },
  pillToggleContainer: { display: 'flex', background: 'var(--surface-container)', borderRadius: '4px', padding: '4px', alignSelf: 'stretch' },
  pillActive: { flex: 1, background: 'var(--primary)', borderRadius: '2px', padding: '10px 0', color: 'var(--on-primary)', fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 700, border: 'none', transition: 'all 0.2s', cursor: 'pointer', textAlign: 'center', letterSpacing: '0.05em' },
  pillInactive: { flex: 1, background: 'transparent', color: 'var(--on-surface-variant)', padding: '10px 0', fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 600, border: 'none', transition: 'all 0.2s', cursor: 'pointer', textAlign: 'center', letterSpacing: '0.05em' },
  warning: { padding: '16px', backgroundColor: 'var(--surface-container)', color: 'var(--warning)', fontSize: '13px', borderRadius: '4px', borderLeft: '4px solid var(--warning)', fontFamily: 'var(--font-body)' },
  label: { fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '12px', display: 'block' },
  colorPickers: { display: 'flex', flexDirection: 'column', gap: '32px' },
  presets: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' },
  input: { width: '100%', padding: '14px', backgroundColor: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: '4px', color: 'var(--on-surface)', fontFamily: 'var(--font-mono)', boxSizing: 'border-box', fontSize: '16px' },
  uploadArea: { border: '1px dashed var(--primary)', padding: '32px 24px', textAlign: 'center', borderRadius: '4px', color: 'var(--primary)', cursor: 'pointer', backgroundColor: 'rgba(208,188,255,0.05)', fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 500 },
  note: { fontSize: '12px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-body)', marginTop: '8px', lineHeight: 1.5 },
  flexRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  canvasArea: { flex: 1, position: 'relative' },
};
