import React, { useEffect, useRef, useState, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import KeyboardRenderer from '../components/KeyboardRenderer';
import RealismPipeline, { GroundShadow } from '../components/RealismPipeline';
import ErrorBoundary from '../components/ErrorBoundary';
import { useStore } from '../store';
import { COLORWAYS } from '../data/colorways';

// A/B flip-test harness vs keysim reference renders.
// Goal: iterate on visual quality until flipping between live render and
// reference doesn't jar. See memory: keycap-perfection-plan.

const CAM_KEY = 'lab_cam_v1';
const PREFS_KEY = 'lab_prefs_v1';
const REFS = [1, 2, 3, 4].map(n => `${import.meta.env.BASE_URL}lab/example-${n}.jpg`);
const DEFAULT_BG = '#ee4d4d'; // sampled from example-1 backdrop

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
}
function savePrefs(patch) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...patch })); } catch { /* ignore */ }
}

// Restores saved camera pose and saves it whenever orbiting ends.
function LabCamera({ bg }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();

  useEffect(() => { gl.setClearColor(bg); }, [bg, gl]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CAM_KEY));
      if (saved && controlsRef.current) {
        camera.position.set(...saved.position);
        controlsRef.current.target.set(...saved.target);
        controlsRef.current.update();
      }
    } catch { /* ignore */ }
  }, [camera]);

  const handleEnd = () => {
    const c = controlsRef.current;
    if (!c) return;
    localStorage.setItem(CAM_KEY, JSON.stringify({
      position: camera.position.toArray().map(v => +v.toFixed(3)),
      target: c.target.toArray().map(v => +v.toFixed(3)),
    }));
  };

  return <OrbitControls ref={controlsRef} enableDamping={false} onEnd={handleEnd} />;
}

export default function LabScreen() {
  const prefs = useRef(loadPrefs()).current;
  const [mode, setMode] = useState(prefs.mode || 'flip');       // flip | side | onion
  const [showRef, setShowRef] = useState(false);                // flip mode: which side is visible
  const [refIdx, setRefIdx] = useState(prefs.refIdx ?? 0);
  const [bg, setBg] = useState(prefs.bg || DEFAULT_BG);
  const [onionOpacity, setOnionOpacity] = useState(prefs.onionOpacity ?? 0.5);

  // Stage the scene to match example-1: 65% board, GMK Bento, light gray case.
  useEffect(() => {
    const st = useStore.getState();
    if (!st.selectedFormFactor) st.setSelectedFormFactor('65%');
    if (COLORWAYS.bento && st.setSelectedColorway) st.setSelectedColorway('bento');
    if (st.setCaseColor) st.setCaseColor('#b6b2aa');
  }, []);

  useEffect(() => { savePrefs({ mode, refIdx, bg, onionOpacity }); }, [mode, refIdx, bg, onionOpacity]);

  // Space / F flips, 1-4 picks reference, M cycles mode
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space' || e.key === 'f' || e.key === 'F') { e.preventDefault(); setShowRef(s => !s); }
      else if (e.key >= '1' && e.key <= '4') setRefIdx(+e.key - 1);
      else if (e.key === 'm' || e.key === 'M') setMode(m => m === 'flip' ? 'side' : m === 'side' ? 'onion' : 'flip');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const refImg = (
    <img
      src={REFS[refIdx]}
      alt={`keysim reference ${refIdx + 1}`}
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: bg }}
      draggable={false}
    />
  );

  const liveRender = (
    <ErrorBoundary>
      <Canvas
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.85,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        dpr={[1, 2]}
        shadows={{ type: THREE.PCFSoftShadowMap }}
        camera={{ position: [0, 10.5, 11.5], fov: 50, near: 0.1, far: 1000 }} // matched to ref-1's elevation (Phase 5)
      >
        <Suspense fallback={null}>
          {/* Mirror of Studio full-view lighting so the lab reflects Studio reality */}
          {/* ambient low: RealismPipeline's studio env IBL supplies the base level */}
          <ambientLight intensity={0.12} color="#ffffff" />
          {/* shadow camera widened to cover the full board (default ±5 clips it) */}
          <directionalLight
            position={[6, 10, 6]} intensity={1.45} castShadow
            shadow-mapSize={[2048, 2048]} shadow-normalBias={0.02}
            shadow-camera-left={-11} shadow-camera-right={11}
            shadow-camera-top={8} shadow-camera-bottom={-8}
          />
          <directionalLight position={[-5, 4, -3]} intensity={0.35} color="#c8d4ff" />
          <directionalLight position={[0, 3, -6]} intensity={0.3} color="#ffffff" />
          <RealismPipeline />
          <KeyboardRenderer onKeyClick={() => {}} />
          <GroundShadow />
          <ContactShadows position={[0, -0.53, 0]} opacity={0.3} scale={40} blur={3} far={8} />
          <LabCamera bg={bg} />
        </Suspense>
      </Canvas>
    </ErrorBoundary>
  );

  const btn = (active) => ({
    padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)',
    background: active ? '#6c63ff' : 'rgba(255,255,255,0.06)', color: '#fff',
    cursor: 'pointer', fontSize: 12, fontFamily: 'monospace',
  });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: '#131318', borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
        <span style={{ color: '#888', fontSize: 12, fontFamily: 'monospace' }}>LAB</span>
        {['flip', 'side', 'onion'].map(m => (
          <button key={m} style={btn(mode === m)} onClick={() => setMode(m)}>{m}</button>
        ))}
        <span style={{ width: 12 }} />
        {REFS.map((_, i) => (
          <button key={i} style={btn(refIdx === i)} onClick={() => setRefIdx(i)}>ref {i + 1}</button>
        ))}
        <span style={{ width: 12 }} />
        <label style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
          bg <input type="color" value={bg} onChange={e => setBg(e.target.value)} style={{ width: 28, height: 20, border: 'none', background: 'none', cursor: 'pointer' }} />
        </label>
        {mode === 'onion' && (
          <label style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
            blend <input type="range" min="0" max="1" step="0.05" value={onionOpacity} onChange={e => setOnionOpacity(+e.target.value)} />
          </label>
        )}
        <span style={{ marginLeft: 'auto', color: '#666', fontSize: 11, fontFamily: 'monospace' }}>
          space/F flip · 1-4 ref · M mode · drag to match angle (camera persists)
        </span>
      </div>

      {/* Stage */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {mode === 'side' && (
          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            <div style={{ width: '50%', height: '100%' }}>{liveRender}</div>
            <div style={{ width: '50%', height: '100%', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>{refImg}</div>
          </div>
        )}

        {mode === 'flip' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }} onDoubleClick={() => setShowRef(s => !s)}>
            <div style={{ width: '100%', height: '100%', visibility: showRef ? 'hidden' : 'visible' }}>{liveRender}</div>
            {showRef && <div style={{ position: 'absolute', inset: 0 }}>{refImg}</div>}
            <div style={{ position: 'absolute', top: 8, left: 8, padding: '2px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.55)', color: showRef ? '#ffd54d' : '#7df59d', fontSize: 12, fontFamily: 'monospace', pointerEvents: 'none' }}>
              {showRef ? 'REFERENCE (keysim)' : 'LIVE (ours)'}
            </div>
          </div>
        )}

        {mode === 'onion' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0 }}>{refImg}</div>
            <div style={{ position: 'absolute', inset: 0, opacity: onionOpacity }}>{liveRender}</div>
          </div>
        )}
      </div>
    </div>
  );
}
