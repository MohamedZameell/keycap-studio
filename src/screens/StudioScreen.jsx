import React, { useState, Suspense, useRef } from 'react';
import { useStore } from '../store';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stars } from '@react-three/drei';
import { EffectComposer, SSAO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { HexColorPicker } from 'react-colorful';
import * as THREE from 'three';
import ErrorBoundary from '../components/ErrorBoundary';
import KeyboardRenderer from '../components/KeyboardRenderer';
import Keycap from '../components/Keycap';
import LEDPreviewWidget from '../components/LEDPreviewWidget';

const PRESET_COLORS = ['#1a1a1a', '#f0f0f0', '#1e3a5f', '#c0392b', '#6c63ff', '#0d9e75', '#e91e8c', '#f5c518'];
const FONTS = ['Inter', 'Oswald', 'Press Start 2P', 'Share Tech Mono', 'Playfair Display', 'Nunito', 'Rajdhani', 'Bebas Neue'];

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

export default function StudioScreen() {
  const store = useStore();
  const [activeTab, setActiveTab] = useState('DESIGN');
  const [viewMode, setViewMode] = useState('full'); 
  const [targetScope, setTargetScope] = useState('all');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const targetKeyId = targetScope === 'selected' ? store.selectedKey : null;

  const updateDesign = (key, value) => {
    if (targetScope === 'all' || !targetKeyId) {
      if (key === 'color') store.setGlobalColor(value);
      if (key === 'legendColor') store.setGlobalLegendColor(value);
      if (key === 'legendText') store.setGlobalLegendText(value);
      if (key === 'font') store.setGlobalFont(value);
      if (key === 'legendPosition') {
        const currentDesigns = { ...store.perKeyDesigns };
        Object.keys(currentDesigns).forEach(k => {
          if(currentDesigns[k]) currentDesigns[k].legendPosition = value;
        });
        store.setPerKeyDesign('global_override', {legendPosition: value});
      }
    } else {
      store.setPerKeyDesign(targetKeyId, { [key]: value });
    }
  };

  const getVal = (key) => {
    if(targetScope === 'selected' && targetKeyId && store.perKeyDesigns[targetKeyId]) {
      return store.perKeyDesigns[targetKeyId][key] || store[`global${key.charAt(0).toUpperCase() + key.slice(1)}`];
    }
    return store[`global${key.charAt(0).toUpperCase() + key.slice(1)}`];
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `keycap-studio-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareURL = () => {
    const state = useStore.getState();
    const design = {
      c: state.globalColor,
      lc: state.globalLegendColor,
      f: state.globalFont,
      m: state.materialPreset,
      k: state.selectedModel,
      led: state.keyboardLEDType,
    };
    const encoded = btoa(JSON.stringify(design));
    const url = `${window.location.origin}?d=${encoded}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied!');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  return (
    <div style={styles.container}>
      <style>{`
        .tab-btn { padding: 8px 2px; font-size: 11px; font-weight: 600; color: #888899; cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent; background: transparent; border-top:none; border-left:none; border-right:none; }
        .tab-btn.active { color: #6c63ff; border-bottom-color: #6c63ff; }
        .color-circle { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .color-circle:hover { transform: scale(1.15); }
        .color-circle.active { border: 2px solid #ffffff; }
        .export-btn { display: flex; flex-direction: column; width: 100%; padding: 16px; background-color: #16162a; border: 1px solid #2a2a3a; border-radius: 8px; text-align: left; margin-bottom: 8px; cursor: pointer; transition: background 0.2s, border-color 0.2s, transform 0.2s; }
        .export-btn:hover { background-color: #1a1a2e; border-color: #6c63ff; transform: translateY(-1px); }
        .export-btn.png { background-color: #6c63ff22; border-color: #6c63ff; }
      `}</style>
      
      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <button style={styles.iconBtn} onClick={() => store.setScreen('selector')}>← Back</button>
          <span style={styles.logoText}>Keycap Studio</span>
        </div>
        
        <div style={styles.topBarCenter}>
          {store.selectedModel ? (
            <>{store.selectedModel} <span style={{color: '#888899'}}>— {store.selectedFormFactor}</span></>
          ) : (
            `Custom Layout — ${store.selectedFormFactor}`
          )}
        </div>
        
        <div style={styles.topBarRight}>
          <div style={styles.viewToggle}>
            <button style={{...styles.toggleBtn, ...(viewMode === 'single' ? styles.toggleActive : {})}} onClick={() => setViewMode('single')}>Single Key</button>
            <button style={{...styles.toggleBtn, ...(viewMode === 'full' ? styles.toggleActive : {})}} onClick={() => setViewMode('full')}>Full Keyboard</button>
          </div>
          <button style={{...styles.iconBtn, display:'flex', alignItems:'center', gap:'8px', padding:'6px 12px', border:'1px solid #6c63ff', color:'#6c63ff'}} onClick={handleExportPNG}>Export 📥</button>
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
                   <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#666680', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>Themes</div>
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
                     <HexColorPicker color={getVal('color') || '#6c63ff'} onChange={(c) => updateDesign('color', c)} style={{width: '100%'}} />
                   </div>
                   <div>
                     <label style={styles.label}>Legend Color</label>
                     <HexColorPicker color={getVal('legendColor') || '#ffffff'} onChange={(c) => updateDesign('legendColor', c)} style={{width: '100%'}} />
                   </div>
                 </div>

                 <div style={styles.presets}>
                   {PRESET_COLORS.map(c => {
                     const isSelected = getVal('color') === c;
                     return (
                       <button key={c} className={`color-circle ${isSelected ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => updateDesign('color', c)} />
                     );
                   })}
                 </div>

                 {/* MATERIAL TOGGLE */}
                 <div style={{ marginTop: 16 }}>
                   <div style={styles.pillToggleContainer}>
                     <button style={store.materialPreset === 'abs' ? styles.pillActive : styles.pillInactive} onClick={() => store.setMaterialPreset('abs')}>ABS — Glossy</button>
                     <button style={store.materialPreset === 'pbt' ? styles.pillActive : styles.pillInactive} onClick={() => store.setMaterialPreset('pbt')}>PBT — Matte</button>
                   </div>
                   <div style={{ fontSize: '11px', color: '#444460', textAlign: 'center', marginTop: 4 }}>
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

            {activeTab === 'LEGEND' && (
              <div style={styles.section}>
                 <label style={styles.label}>Legend text (max 4 chars)</label>
                 <input type="text" maxLength={4} style={styles.input} value={getVal('legendText') || ''} onChange={(e) => updateDesign('legendText', e.target.value)} placeholder="Default" />
                 
                 <label style={{...styles.label, marginTop: 16}}>Legend Position</label>
                 <div style={styles.posGrid}>
                   {['top-left', 'top-center', 'top-right', 'front', 'none'].map(pos => (
                     <button key={pos} style={styles.posBtn} onClick={() => updateDesign('legendPosition', pos)}>{pos}</button>
                   ))}
                 </div>

                 <label style={{...styles.label, marginTop: 16}}>Font selector</label>
                 <div style={styles.fontGrid}>
                   {FONTS.map(f => (
                     <button key={f} style={{...styles.fontBtn, fontFamily: f, borderColor: getVal('font') === f ? 'var(--primary-accent)' : 'var(--border-color)'}} onClick={() => updateDesign('font', f)}>{f}</button>
                   ))}
                 </div>
              </div>
            )}

            {activeTab === 'IMAGE' && (
              <div style={styles.section}>
                <div style={styles.imageModeGrid}>
                  {['none', 'wrap', 'tile', 'perkey'].map(m => (
                    <button key={m} style={{...styles.imgBtn, borderColor: store.keyboardImageMode === m ? 'var(--primary-accent)' : 'var(--border-color)'}} onClick={() => store.setKeyboardImageMode(m)}>{m.toUpperCase()}</button>
                  ))}
                </div>
                {store.keyboardImageMode !== 'none' && store.keyboardImageMode !== 'perkey' && (
                  <div style={styles.uploadArea}>Drop image here or click to upload<br/><small>PNG, JPG, WebP</small></div>
                )}
                {store.keyboardImageMode === 'perkey' && (
                  <div style={styles.uploadArea}>{targetKeyId ? `Upload image for ${targetKeyId}` : "Click any key on the keyboard to select it, then upload an image for that key"}</div>
                )}
                {store.keyboardImageMode === 'wrap' && <p style={styles.note}>Image will be mapped across all keycaps as one unified canvas</p>}
                {store.keyboardImageMode === 'tile' && <p style={styles.note}>Image repeats on each individual key</p>}
                {store.keyboardImageMode === 'perkey' && <p style={styles.note}>Select any key to set its specific image</p>}
              </div>
            )}

            {activeTab === 'BACKLIT' && (
              <div style={styles.section}>
                {store.selectionPath === 'beginner' || store.selectedModel ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'#fff', fontWeight:600 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', backgroundColor: store.keyboardLEDType === 'None' ? '#888' : '#6c63ff' }} />
                      {store.keyboardLEDType || 'None'}
                    </div>
                    <div style={{ fontSize:'11px', color:'#888899', marginTop:'4px' }}>
                      Fixed by your keyboard's hardware
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {['North-facing RGB', 'South-facing RGB', 'Per-key RGB', 'None'].map(t => {
                        const display = t.replace('-facing RGB', '').replace(' RGB', '');
                        const isActive = store.keyboardLEDType === t;
                        return (
                          <button key={t} style={{ padding: '8px', borderRadius: '6px', textAlign: 'center', fontSize: '13px', fontWeight: 600, background: isActive ? '#6c63ff' : 'var(--card-bg)', color: isActive ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => store.setKeyboardLEDType(t)}>{display}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={styles.flexRow}>
                  <span style={styles.label}>RGB Backlight</span>
                  <input type="checkbox" style={{width: 20, height: 20}} checked={store.backlitEnabled} onChange={(e) => store.setBacklitEnabled(e.target.checked)} />
                </div>
                
                {store.backlitEnabled && (
                  <div style={{marginTop: 24}}>
                    <label style={styles.label}>Backlit Color</label>
                    <HexColorPicker color={store.backlitColor} onChange={(c) => store.setBacklitColor(c)} style={{width: '100%'}} />
                  </div>
                )}
                
                <div style={{ marginTop: '24px', fontSize: '11px', color: '#444460' }}>
                  See the LED diagram →
                </div>
              </div>
            )}

            {activeTab === 'EXPORT' && (
              <div style={styles.section}>
                <button className="export-btn png" onClick={handleExportPNG}><strong>PNG Render</strong><span style={{fontSize: 12, color: 'var(--text-muted)'}}>High quality screenshot of 3D view</span></button>
                <button className="export-btn" onClick={handleShareURL}><strong>Share URL</strong><span style={{fontSize: 12, color: 'var(--text-muted)'}}>Copies link to clipboard</span></button>
                <button className="export-btn"><strong>SVG Layout</strong><span style={{fontSize: 12, color: 'var(--text-muted)'}}>Coming soon</span></button>
                <button className="export-btn"><strong>PDF Print-ready</strong><span style={{fontSize: 12, color: 'var(--text-muted)'}}>Coming soon</span></button>
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
                   powerPreference: "high-performance",
                   toneMapping: THREE.ACESFilmicToneMapping,
                   toneMappingExposure: 0.85,
                   outputColorSpace: THREE.SRGBColorSpace,
                 }}
                 dpr={[1, 2]}
                 shadows="soft"
                 camera={{ 
                   position: viewMode === 'full' ? [0, 8, 12] : [0, 2.5, 5], 
                   fov: viewMode === 'full' ? 50 : 45,
                   near: 0.1,
                   far: 1000
                 }}
                 onCreated={(state) => {
                   state.gl.setClearColor('#0a0a0f');
                 }}
              >
              <Suspense fallback={null}>
                {/* FINAL STUDIO LIGHTING CONFIGURATION */}
                <ambientLight intensity={0.4} color="#ffffff" />
                <directionalLight position={[6, 10, 6]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.001} />
                <directionalLight position={[-5, 4, -3]} intensity={0.35} color="#c8d4ff" />
                <directionalLight position={[0, 3, -6]} intensity={0.3} color="#ffffff" />
                <Environment preset="apartment" background={false} blur={1} />
                
                <Stars radius={100} depth={50} count={2000} factor={3} fade speed={0.5} />
                
                {viewMode === 'full' ? (
                  <KeyboardRenderer />
                ) : (
                  <group position={[0,0,0]} scale={2}>
                    <Keycap keyId="preview" label="Preview" />
                  </group>
                )}
                
                <ContactShadows position={[0, -0.5, 0]} opacity={0.55} scale={40} blur={3} far={8} />
                
                <OrbitControls enableDamping={true} dampingFactor={0.05} enableZoom={true} enablePan={true} minDistance={3} maxDistance={35} minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} target={[0, 0, 0]} />

                {/* POST PROCESSING */}
                <EffectComposer multisampling={0}>
                  <SSAO samples={16} radius={0.08} intensity={25} luminanceInfluence={0.5} bias={0.04} color="black" />
                  <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
                </EffectComposer>
              </Suspense>
            </Canvas>
          </ErrorBoundary>
          
          <LEDPreviewWidget />
        </div>
      </div>

      {/* Toast notification */}
      {toastVisible && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#0d9e75', color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: '13px', zIndex: 9999, transition: 'opacity 0.3s', opacity: toastVisible ? 1 : 0, pointerEvents: 'none' }}>
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
  pillToggleContainer: { display: 'inline-flex', background: '#1a1a2e', borderRadius: '20px', padding: '3px', alignSelf: 'flex-start' },
  pillActive: { background: '#6c63ff', borderRadius: '18px', padding: '6px 14px', color: '#fff', fontSize: '12px', fontWeight: 600, border: 'none', transition: 'all 0.2s', cursor: 'pointer' },
  pillInactive: { background: 'transparent', color: '#888899', padding: '6px 14px', fontSize: '12px', fontWeight: 600, border: 'none', transition: 'all 0.2s', cursor: 'pointer' },
  warning: { padding: '12px', backgroundColor: 'rgba(245, 166, 35, 0.1)', color: 'var(--warning)', fontSize: '13px', borderRadius: '8px' },
  label: { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' },
  colorPickers: { display: 'flex', flexDirection: 'column', gap: '24px' },
  presets: { display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '8px' },
  input: { width: '100%', padding: '12px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontFamily: 'var(--font-mono)' },
  posGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' },
  posBtn: { padding: '8px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#fff' },
  fontGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  fontBtn: { padding: '12px 8px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', color: '#fff' },
  imageModeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  imgBtn: { padding: '12px', backgroundColor: 'var(--card-bg)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid transparent', cursor: 'pointer', color: '#fff' },
  uploadArea: { border: '2px dashed var(--border-color)', padding: '32px', textAlign: 'center', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', backgroundColor: 'var(--card-bg)' },
  note: { fontSize: '13px', color: 'var(--text-muted)' },
  flexRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  canvasArea: { flex: 1, position: 'relative' }
};
