import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stars } from '@react-three/drei';
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
const FONTS = ['Inter', 'Oswald', 'Press Start 2P', 'Share Tech Mono', 'Playfair Display', 'Nunito', 'Rajdhani', 'Bebas Neue'];
const FONT_DESCRIPTIONS = {
  'Inter': 'Modern clean', 'Oswald': 'Bold condensed', 'Press Start 2P': 'Pixel',
  'Share Tech Mono': 'Mono', 'Playfair Display': 'Elegant', 'Nunito': 'Rounded',
  'Rajdhani': 'Futuristic', 'Bebas Neue': 'Bold display',
};

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
        .tab-btn { padding: 8px 2px; font-size: 11px; font-weight: 600; color: #888899; cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent; background: transparent; border-top:none; border-left:none; border-right:none; }
        .tab-btn.active { color: #6c63ff; border-bottom-color: #6c63ff; }
        .color-circle { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .color-circle:hover { transform: scale(1.15); }
        .color-circle.active { border: 2px solid #ffffff; }
        .export-btn { border: 1px solid #6c63ff; color: #6c63ff; background: transparent; transition: all 0.2s; }
        .export-btn:hover { background: rgba(108, 99, 255, 0.15); color: #fff; border-color: #8b7fff; }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
          position: absolute; cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #1a1a2e; transition: .3s; border-radius: 24px; border: 1px solid #2a2a3a;
        }
        .toggle-slider:before {
          position: absolute; content: "";
          height: 16px; width: 16px; left: 3px; bottom: 3px;
          background-color: #888899; transition: .3s; border-radius: 50%;
        }
        input:checked + .toggle-slider { background-color: #6c63ff; border-color: #6c63ff; }
        input:checked + .toggle-slider:before { transform: translateX(20px); background-color: #fff; }
      `}</style>

      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <button style={styles.iconBtn} onClick={() => store.setScreen('selector')}>← Back</button>
          <span style={styles.logoText}>Keycap Studio</span>
        </div>
        <div style={styles.topBarCenter}>
          {store.selectedModel ? (
            <>{store.selectedModel} <span style={{ color: '#888899' }}>— {store.selectedFormFactor}</span></>
          ) : (
            `Custom Layout — ${store.selectedFormFactor}`
          )}
        </div>
        <div style={styles.topBarRight}>
          <div style={styles.viewToggle}>
            <button style={{ ...styles.toggleBtn, ...(viewMode === 'single' ? styles.toggleActive : {}) }} onClick={() => setViewMode('single')}>Single Key</button>
            <button style={{ ...styles.toggleBtn, ...(viewMode === 'full' ? styles.toggleActive : {}) }} onClick={() => setViewMode('full')}>Full Keyboard</button>
          </div>
          <button className="iconBtn export-btn" style={{ ...styles.iconBtn, display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px' }} onClick={handleExportPNG}>
            Export <span style={{ fontSize: 16 }}>↓</span>
          </button>
        </div>
      </div>

      <div style={styles.workspace}>
        {/* CONTROL PANEL */}
        <div style={styles.sidebar}>
          <div style={styles.tabs}>
            {['Design', 'Legend', 'Image', 'Backlit', 'Export'].map(t => (
              <button key={t} className={`tab-btn ${activeTab === t.toUpperCase() ? 'active' : ''}`} onClick={() => setActiveTab(t.toUpperCase())}>
                {t}
              </button>
            ))}
          </div>

          <div style={styles.panelContent}>
            {/* ===== DESIGN TAB ===== */}
            {activeTab === 'DESIGN' && (
              <div style={styles.section}>
                <div style={styles.pillToggleContainer}>
                  <button style={targetScope === 'all' ? styles.pillActive : styles.pillInactive} onClick={() => setTargetScope('all')}>All Keys</button>
                  <button style={targetScope === 'selected' ? styles.pillActive : styles.pillInactive} onClick={() => setTargetScope('selected')}>Selected Key</button>
                </div>

                {targetScope === 'selected' && !targetKeyId && (
                  <div style={styles.warning}>Please select a key on the keyboard first.</div>
                )}

                {/* THEMES */}
                <div style={{ marginBottom: 8 }}>
                  <div style={styles.sectionLabel}>Themes</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                    {THEMES.map(t => (
                      <div key={t.name} style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => { store.setGlobalColor(t.keycap); store.setGlobalLegendColor(t.legend); store.setMaterialPreset(t.material); }}
                          style={{ width: '100%', height: 36, background: t.keycap, borderRadius: 6, border: getVal('color') === t.keycap ? '2px solid #6c63ff' : '2px solid transparent', position: 'relative', cursor: 'pointer', transition: 'border 0.15s' }}
                          onMouseEnter={(e) => { if (getVal('color') !== t.keycap) e.currentTarget.style.border = '2px solid rgba(255,255,255,0.3)'; }}
                          onMouseLeave={(e) => { if (getVal('color') !== t.keycap) e.currentTarget.style.border = '2px solid transparent'; }}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.legend, position: 'absolute', bottom: 4, right: 4 }} />
                        </button>
                        <div style={{ fontSize: '9px', color: '#666680', marginTop: 2 }}>{t.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={styles.colorPickers}>
                  <div>
                    <label style={styles.label}>Keycap Base Color</label>
                    <HexColorPicker color={getVal('color') || '#6c63ff'} onChange={(c) => updateDesign('color', c)} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={styles.label}>Legend Color</label>
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
                  <div style={styles.pillToggleContainer}>
                    <button style={store.materialPreset === 'abs' ? styles.pillActive : styles.pillInactive} onClick={() => store.setMaterialPreset('abs')}>ABS — Glossy</button>
                    <button style={store.materialPreset === 'pbt' ? styles.pillActive : styles.pillInactive} onClick={() => store.setMaterialPreset('pbt')}>PBT — Matte</button>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
                    {store.materialPreset === 'abs' ? 'Shiny surface, brighter colors' : 'Matte texture, enthusiast preferred'}
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
                    const isActive = store.globalFont === f;
                    return (
                      <button
                        key={f}
                        style={{
                          padding: '8px 12px', background: isActive ? '#6c63ff15' : '#1a1a2e',
                          border: `1px solid ${isActive ? '#6c63ff' : '#2a2a3a'}`, borderRadius: 6,
                          color: isActive ? '#a09bf5' : '#aaaacc', fontFamily: f, fontSize: 14,
                          cursor: 'pointer', width: '100%', textAlign: 'left', transition: '0.15s',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                        onClick={() => store.setGlobalFont(f)}
                      >
                        <span>{f} — Aa</span>
                        <span style={{ fontSize: 10, color: '#444460' }}>{FONT_DESCRIPTIONS[f]}</span>
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
                state.gl.setClearColor('#0a0a0f');
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

                    {/* Pedestal disc — envMapIntensity=0 blocks HDRI tinting */}
                    <mesh position={[0, -0.72, 0]} receiveShadow>
                      <cylinderGeometry args={[0.85, 0.95, 0.06, 48]} />
                      <meshPhysicalMaterial
                        color="#1a1a2e"
                        roughness={0.15}
                        metalness={0.75}
                        clearcoat={0.9}
                        clearcoatRoughness={0.05}
                        envMapIntensity={0}
                        emissive="#000000"
                        emissiveIntensity={0}
                      />
                    </mesh>

                    {/* Pedestal stem */}
                    <mesh position={[0, -0.88, 0]} receiveShadow>
                      <cylinderGeometry args={[0.08, 0.1, 0.28, 24]} />
                      <meshPhysicalMaterial
                        color="#0d0d1a"
                        roughness={0.15}
                        metalness={0.75}
                        clearcoat={0.9}
                        clearcoatRoughness={0.05}
                        envMapIntensity={0}
                        emissive="#000000"
                        emissiveIntensity={0}
                      />
                    </mesh>

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
                position: 'absolute', top: 12, left: 12, zIndex: 20,
                padding: '6px 14px', background: 'rgba(10,10,15,0.85)',
                border: '1px solid #6c63ff', borderRadius: 6,
                color: '#6c63ff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', backdropFilter: 'blur(8px)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#6c63ff'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,10,15,0.85)'; e.currentTarget.style.color = '#6c63ff'; }}
            >
              ← Full view
            </button>
          )}
        </div>
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
  container: { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)', overflow: 'hidden' },
  topBar: { height: '48px', backgroundColor: 'var(--panel-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100 },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  logoText: { fontWeight: 700 },
  iconBtn: { padding: '4px 12px', backgroundColor: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', borderRadius: '4px' },
  topBarCenter: { fontWeight: 600, color: '#fff', fontSize: '14px' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  viewToggle: { display: 'flex', backgroundColor: 'var(--card-bg)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' },
  toggleBtn: { padding: '6px 16px', fontSize: '13px', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', color: '#fff' },
  toggleActive: { backgroundColor: 'var(--primary-accent)', color: '#fff' },
  workspace: { flex: 1, display: 'flex', position: 'relative' },
  sidebar: { width: '320px', backgroundColor: 'var(--panel-bg)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', zIndex: 10 },
  tabs: { display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border-color)', justifyContent: 'space-around', alignItems: 'center' },
  panelContent: { flex: 1, overflowY: 'auto', padding: '24px' },
  section: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionLabel: { fontSize: '10px', textTransform: 'uppercase', color: '#666680', fontWeight: 700, letterSpacing: '1px' },
  pillToggleContainer: { display: 'inline-flex', background: '#1a1a2e', borderRadius: '20px', padding: '3px', alignSelf: 'flex-start' },
  pillActive: { background: '#6c63ff', borderRadius: '18px', padding: '6px 14px', color: '#fff', fontSize: '12px', fontWeight: 600, border: 'none', transition: 'all 0.2s', cursor: 'pointer' },
  pillInactive: { background: 'transparent', color: '#888899', padding: '6px 14px', fontSize: '12px', fontWeight: 600, border: 'none', transition: 'all 0.2s', cursor: 'pointer' },
  warning: { padding: '12px', backgroundColor: 'rgba(245, 166, 35, 0.1)', color: 'var(--warning)', fontSize: '13px', borderRadius: '8px' },
  label: { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' },
  colorPickers: { display: 'flex', flexDirection: 'column', gap: '24px' },
  presets: { display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '8px' },
  input: { width: '100%', padding: '10px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' },
  uploadArea: { border: '2px dashed #2a2a3a', padding: '24px', textAlign: 'center', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', backgroundColor: 'var(--card-bg)', fontSize: 12 },
  note: { fontSize: '12px', color: 'var(--text-muted)' },
  flexRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  canvasArea: { flex: 1, position: 'relative' },
};
