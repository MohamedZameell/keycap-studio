import React, { useState } from 'react';
import { useStore } from '../store';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stars } from '@react-three/drei';
import { HexColorPicker } from 'react-colorful';
import KeyboardRenderer from '../components/KeyboardRenderer';
import Keycap from '../components/Keycap';

const PRESET_COLORS = ['#1a1a1a', '#f0f0f0', '#1e3a5f', '#c0392b', '#6c63ff', '#0d9e75', '#e91e8c', '#f5c518'];
const FONTS = ['Inter', 'Oswald', 'Press Start 2P', 'Share Tech Mono', 'Playfair Display', 'Nunito', 'Rajdhani', 'Bebas Neue'];

export default function StudioScreen() {
  const store = useStore();
  const [activeTab, setActiveTab] = useState('DESIGN');
  const [viewMode, setViewMode] = useState('full'); // 'full' or 'single'
  
  // Design targets
  const [targetScope, setTargetScope] = useState('all'); // 'all' or 'selected'
  
  // Helpers
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
        store.setPerKeyDesign('global_override', {legendPosition: value}); // dummy hook concept, better to just apply it explicitly
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

  return (
    <div style={styles.container}>
      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <button style={styles.iconBtn} onClick={() => store.setScreen('selector')}>←</button>
          <span style={styles.logoText}>Keycap Studio</span>
        </div>
        
        <div style={styles.topBarCenter}>
          {store.selectedModel || 'Custom Keyboard'} — {store.selectedFormFactor}
        </div>
        
        <div style={styles.topBarRight}>
          <div style={styles.viewToggle}>
            <button style={{...styles.toggleBtn, ...(viewMode === 'single' ? styles.toggleActive : {})}} 
              onClick={() => setViewMode('single')}>Single Key</button>
            <button style={{...styles.toggleBtn, ...(viewMode === 'full' ? styles.toggleActive : {})}} 
              onClick={() => setViewMode('full')}>Full Keyboard</button>
          </div>
          <button style={styles.exportBtn}>Export</button>
        </div>
      </div>

      <div style={styles.workspace}>
        {/* CONTROL PANEL */}
        <div style={styles.sidebar}>
          
          <div style={styles.tabs}>
            {['DESIGN', 'LEGEND', 'IMAGE', 'BACKLIT', 'EXPORT'].map(t => (
              <button key={t} style={{...styles.tab, ...(activeTab === t ? styles.tabActive : {})}} 
                onClick={() => setActiveTab(t)}>
                {t}
              </button>
            ))}
          </div>

          <div style={styles.panelContent}>
            
            {activeTab === 'DESIGN' && (
               <div style={styles.section}>
                 <div style={styles.scopeToggle}>
                   <label><input type="radio" checked={targetScope === 'all'} onChange={() => setTargetScope('all')} /> All keys</label>
                   <label><input type="radio" checked={targetScope === 'selected'} onChange={() => setTargetScope('selected')} /> Selected key only</label>
                 </div>
                 
                 {targetScope === 'selected' && !targetKeyId && (
                   <div style={styles.warning}>Please select a key on the keyboard first.</div>
                 )}

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
                   {PRESET_COLORS.map(c => (
                     <button key={c} style={{...styles.colorDot, backgroundColor: c}} onClick={() => updateDesign('color', c)} />
                   ))}
                 </div>
               </div>
            )}

            {activeTab === 'LEGEND' && (
              <div style={styles.section}>
                 <label style={styles.label}>Legend Text (max 4)</label>
                 <input type="text" maxLength={4} style={styles.input} 
                   value={getVal('legendText') || ''} 
                   onChange={(e) => updateDesign('legendText', e.target.value)} 
                   placeholder="Default" />
                 
                 <label style={{...styles.label, marginTop: 16}}>Legend Position</label>
                 <div style={styles.posGrid}>
                   {['top-left', 'top-center', 'top-right', 'front', 'none'].map(pos => (
                     <button key={pos} style={styles.posBtn} onClick={() => updateDesign('legendPosition', pos)}>{pos}</button>
                   ))}
                 </div>

                 <label style={{...styles.label, marginTop: 16}}>Font Family</label>
                 <div style={styles.fontGrid}>
                   {FONTS.map(f => (
                     <button key={f} 
                       style={{...styles.fontBtn, fontFamily: f, borderColor: getVal('font') === f ? 'var(--primary-accent)' : 'var(--border-color)'}} 
                       onClick={() => updateDesign('font', f)}>
                       {f}
                     </button>
                   ))}
                 </div>
              </div>
            )}

            {activeTab === 'IMAGE' && (
              <div style={styles.section}>
                <div style={styles.imageModeGrid}>
                  {['none', 'wrap', 'tile', 'perkey'].map(m => (
                    <button key={m} style={{...styles.imgBtn, borderColor: store.keyboardImageMode === m ? 'var(--primary-accent)' : 'var(--border-color)'}}
                      onClick={() => store.setKeyboardImageMode(m)}>
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
                
                {store.keyboardImageMode !== 'none' && (
                  <div style={styles.uploadArea}>
                    Drop image here or click to upload<br/><small>PNG, JPG, WebP</small>
                  </div>
                )}
                
                {store.keyboardImageMode === 'wrap' && <p style={styles.note}>Image will be mapped across all keycaps as one unified canvas</p>}
                {store.keyboardImageMode === 'tile' && <p style={styles.note}>Image repeats on each individual key</p>}
                {store.keyboardImageMode === 'perkey' && <p style={styles.note}>Select any key to set its specific image</p>}
              </div>
            )}

            {activeTab === 'BACKLIT' && (
              <div style={styles.section}>
                <div style={styles.flexRow}>
                  <span>RGB Backlight</span>
                  <input type="checkbox" checked={store.backlitEnabled} onChange={(e) => store.setBacklitEnabled(e.target.checked)} />
                </div>
                
                {store.backlitEnabled && (
                  <div style={{marginTop: 24}}>
                    <label style={styles.label}>Backlit Color</label>
                    <HexColorPicker color={store.backlitColor} onChange={(c) => store.setBacklitColor(c)} style={{width: '100%'}} />
                  </div>
                )}

                <div style={styles.infoCard}>
                  <h4>{store.keyboardLEDType || 'None'} Array</h4>
                  <p>Check the previous screen for exact advice on your LED configuration's behavior.</p>
                </div>
              </div>
            )}

            {activeTab === 'EXPORT' && (
              <div style={styles.section}>
                {['PNG Render', 'SVG Layout', 'PDF Print-ready', 'Share URL'].map(e => (
                  <button key={e} style={styles.exportListBtn}>
                    <strong>{e}</strong>
                    <span style={{fontSize: 12, color: 'var(--text-muted)'}}>Standard format</span>
                  </button>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* 3D CANVAS */}
        <div style={styles.canvasArea}>
          <Canvas camera={viewMode === 'full' ? { position: [0, 8, 12], fov: 45 } : { position: [0, 2.5, 4.5], fov: 40 }}>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 20, 10]} intensity={2} castShadow />
            <pointLight position={[-8, 8, -8]} intensity={0.3} color="#6c63ff" />
            <Environment preset="city" />
            <Stars radius={100} depth={50} count={3000} factor={4} />
            
            {viewMode === 'full' ? (
              <KeyboardRenderer />
            ) : (
              <group position={[0,0,0]} scale={2}>
                 <Keycap keyId={targetKeyId || 'preview'} label="A" />
              </group>
            )}
            
            <ContactShadows position={[0, -0.5, 0]} opacity={0.5} scale={50} blur={2} far={10} />
            <OrbitControls enableZoom enablePan minDistance={3} maxDistance={30} />
          </Canvas>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-color)',
    overflow: 'hidden'
  },
  topBar: {
    height: '48px',
    backgroundColor: 'var(--panel-bg)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    zIndex: 100
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  logoText: { fontWeight: 700 },
  iconBtn: { padding: '4px 8px', backgroundColor: 'var(--card-bg)', borderRadius: '4px' },
  topBarCenter: { fontWeight: 500, color: 'var(--text-secondary)' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  viewToggle: { display: 'flex', backgroundColor: 'var(--card-bg)', borderRadius: '6px', overflow: 'hidden' },
  toggleBtn: { padding: '6px 12px', fontSize: '13px' },
  toggleActive: { backgroundColor: 'var(--primary-accent)', color: '#fff' },
  exportBtn: { backgroundColor: 'var(--success)', padding: '6px 16px', borderRadius: '6px', fontWeight: 600, color: '#fff' },
  
  workspace: {
    flex: 1,
    display: 'flex',
    position: 'relative'
  },
  sidebar: {
    width: '320px',
    backgroundColor: 'var(--panel-bg)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10
  },
  tabs: {
    display: 'flex',
    overflowX: 'auto',
    borderBottom: '1px solid var(--border-color)'
  },
  tab: {
    padding: '12px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    borderBottom: '2px solid transparent',
    whiteSpace: 'nowrap'
  },
  tabActive: {
    color: 'var(--primary-accent)',
    borderBottomColor: 'var(--primary-accent)'
  },
  panelContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  scopeToggle: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    padding: '12px',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '8px'
  },
  warning: {
    padding: '12px',
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    color: 'var(--warning)',
    fontSize: '13px',
    borderRadius: '8px'
  },
  label: { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' },
  colorPickers: { display: 'flex', flexDirection: 'column', gap: '24px' },
  presets: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' },
  colorDot: { width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-color)', cursor: 'pointer' },
  
  input: {
    width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', 
    border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff'
  },
  posGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  posBtn: { padding: '8px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' },
  fontGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  fontBtn: { padding: '12px 8px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '14px' },
  
  imageModeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  imgBtn: { padding: '12px', backgroundColor: 'var(--card-bg)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid transparent' },
  uploadArea: { border: '2px dashed var(--border-color)', padding: '32px', textAlign: 'center', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' },
  note: { fontSize: '13px', color: 'var(--text-muted)' },
  
  flexRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  infoCard: { padding: '16px', backgroundColor: 'rgba(108, 99, 255, 0.1)', borderLeft: '3px solid var(--primary-accent)', borderRadius: '0 8px 8px 0', marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' },
  
  exportListBtn: { display: 'flex', flexDirection: 'column', width: '100%', padding: '16px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'left', marginBottom: '8px' },

  canvasArea: {
    flex: 1,
    position: 'relative'
  }
};
