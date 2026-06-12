import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { heroBridge } from './heroBridge';
import { buildHeroScene, HERO_PRESETS } from './heroStage';

// HERO RENDER: progressive path-traced still of the current board on its
// own offscreen-resolution canvas + OIDN denoise pass. The live viewport
// frameloop is paused while this is open (GPU goes to the tracer).

const RESOLUTIONS = [
  { label: '1080p', w: 1920, h: 1080, tiles: 2 },
  { label: '1440p', w: 2560, h: 1440, tiles: 3 },
  { label: '4K', w: 3840, h: 2160, tiles: 4 },
];
const QUALITIES = [
  { label: 'Fast', samples: 120 },
  { label: 'Balanced', samples: 250 },
  { label: 'High', samples: 500 },
];

const ui = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8,8,14,0.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)',
  },
  panel: {
    display: 'flex', flexDirection: 'column', gap: 12, maxWidth: '92vw', maxHeight: '94vh',
    background: '#15152a', border: '1px solid #2a2a4a', borderRadius: 12, padding: 16,
  },
  canvasWrap: {
    position: 'relative', background: '#0c0c16', borderRadius: 8, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  label: { fontSize: 11, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.08em' },
  btn: {
    padding: '10px 18px', borderRadius: 8, border: '1px solid #3a3a5a', background: '#1e1e3a',
    color: '#d6d2e8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  primaryBtn: {
    padding: '10px 18px', borderRadius: 8, border: '1px solid #8b7fff',
    background: 'linear-gradient(135deg, #6c63ff 0%, #4a3fd4 100%)',
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  chip: (active) => ({
    padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
    border: `1px solid ${active ? '#8b7fff' : '#2a2a3a'}`,
    background: active ? '#6c63ff30' : '#1a1a2e', color: active ? '#d0bcff' : '#958ea0',
  }),
};

export default function HeroRenderModal({ onClose }) {
  const canvasRef = useRef(null);     // path tracer target (full-res drawing buffer)
  const denoiseRef = useRef(null);    // denoiser output, overlaid when ready
  const sessionRef = useRef({ runId: 0 });

  const [phase, setPhase] = useState('config'); // config|prep|render|denoise|done|error
  const [resIdx, setResIdx] = useState(0);
  const [qualIdx, setQualIdx] = useState(1);
  const [angle, setAngle] = useState('hero');
  const [samples, setSamples] = useState(0);
  const [eta, setEta] = useState(null);
  const [error, setError] = useState(null);
  const [denoised, setDenoised] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // Park the live viewport while the tracer owns the GPU
  useEffect(() => {
    heroBridge.set?.({ frameloop: 'never' });
    return () => {
      heroBridge.set?.({ frameloop: 'always' });
      cleanupSession();
    };
  }, []);

  const cleanupSession = () => {
    const s = sessionRef.current;
    s.runId++;
    if (s.raf) cancelAnimationFrame(s.raf);
    try { s.pt?.dispose?.(); } catch (e) { /* tracer may not expose dispose */ }
    try { s.stage?.dispose(); } catch (e) {}
    if (s.renderer) {
      s.renderer.dispose();
      s.renderer.forceContextLoss();
    }
    sessionRef.current = { runId: s.runId };
  };

  const start = useCallback(async () => {
    if (!heroBridge.scene) { setError('Viewport not ready'); setPhase('error'); return; }
    cleanupSession();
    const s = sessionRef.current;
    const runId = s.runId;
    const res = RESOLUTIONS[resIdx];
    const target = QUALITIES[qualIdx].samples;
    setSamples(0); setEta(null); setDenoised(false); setShowRaw(false);
    setPhase('prep');
    // let the spinner paint before the synchronous BVH build blocks
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
    if (runId !== sessionRef.current.runId) return;

    try {
      const canvas = canvasRef.current;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(1);
      renderer.setSize(res.w, res.h, false);
      s.renderer = renderer;

      const stage = buildHeroScene(heroBridge.scene, { aspect: res.w / res.h, angle });
      s.stage = stage;

      const pt = new WebGLPathTracer(renderer);
      pt.bounces = 8;
      pt.filterGlossyFactor = 0.5;
      pt.minSamples = 3;
      pt.renderScale = 1;
      pt.tiles.set(res.tiles, res.tiles);
      pt.setScene(stage.scene, stage.camera);
      s.pt = pt;

      setPhase('render');
      const t0 = performance.now();
      const tick = () => {
        if (runId !== sessionRef.current.runId) return;
        pt.renderSample();
        const sNow = pt.samples;
        setSamples(sNow);
        const elapsed = (performance.now() - t0) / 1000;
        if (sNow > 2 && elapsed > 1) setEta(Math.max(0, (target - sNow) * (elapsed / sNow)));
        const effTarget = s.finishNow ? Math.min(target, Math.ceil(sNow)) : target;
        if (sNow < effTarget) {
          s.raf = requestAnimationFrame(tick);
        } else {
          denoise(runId, target);
        }
      };
      s.raf = requestAnimationFrame(tick);
    } catch (e) {
      console.error('[hero] render failed', e);
      setError(e.message || String(e));
      setPhase('error');
    }
  }, [resIdx, qualIdx, angle]);

  const denoise = async (runId, target) => {
    if (runId !== sessionRef.current.runId) return;
    setPhase('denoise');
    try {
      const { Denoiser } = await import('denoiser');
      if (runId !== sessionRef.current.runId) return;
      const res = RESOLUTIONS[resIdx];
      const dn = new Denoiser();
      sessionRef.current.dn = dn;
      // weights ship with the app (public/tzas); lib requires an absolute URL
      dn.weightsUrl = new URL(`${import.meta.env.BASE_URL || '/'}tzas`, window.location.origin).href;
      dn.quality = 'balanced';
      const out = denoiseRef.current;
      out.width = res.w; out.height = res.h;
      dn.setCanvas(out);
      dn.setInputImage('color', canvasRef.current);
      await dn.execute();
      if (runId !== sessionRef.current.runId) return;
      setDenoised(true);
      dn.dispose?.();
    } catch (e) {
      // denoise is best-effort: keep the raw render usable
      console.warn('[hero] denoise failed, keeping raw render', e);
      setDenoised(false);
    }
    if (runId !== sessionRef.current.runId) return;
    setPhase('done');
  };

  const download = () => {
    const src = denoised && !showRaw ? denoiseRef.current : canvasRef.current;
    src.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `keycap-hero-${RESOLUTIONS[resIdx].label}-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  };

  const close = () => { cleanupSession(); onClose(); };

  const busy = phase === 'prep' || phase === 'render' || phase === 'denoise';
  const target = QUALITIES[qualIdx].samples;
  const pct = Math.min(100, (samples / target) * 100);

  return (
    <div style={ui.overlay}>
      <div style={ui.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#d0bcff', letterSpacing: '0.04em' }}>
            ✨ HERO RENDER <span style={{ fontSize: 11, color: '#666680', fontWeight: 400 }}>path-traced studio shot</span>
          </div>
          <button style={{ ...ui.btn, padding: '6px 12px' }} onClick={close}>✕</button>
        </div>

        <div style={ui.canvasWrap}>
          <canvas ref={canvasRef} style={{ maxWidth: '82vw', maxHeight: '62vh', width: 'auto', height: 'auto', display: 'block' }} />
          <canvas ref={denoiseRef} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            display: denoised && !showRaw ? 'block' : 'none',
          }} />
          {phase === 'config' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666680', fontSize: 13, minHeight: 220, padding: '0 60px', textAlign: 'center' }}>
              Pick a resolution, quality and angle — then Start. The board renders with real global illumination; expect ~10s–2min depending on GPU.
            </div>
          )}
          {(phase === 'prep' || phase === 'denoise') && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(12,12,22,0.55)', color: '#a09bf5', fontSize: 13, fontWeight: 600 }}>
              {phase === 'prep' ? 'Preparing scene (building BVH — page may pause a moment)…' : 'Denoising (OIDN)…'}
            </div>
          )}
        </div>

        {busy && phase !== 'prep' && (
          <div>
            <div style={{ height: 6, borderRadius: 3, background: '#1a1a2e', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6c63ff,#d0bcff)', transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#958ea0', marginTop: 4 }}>
              {Math.floor(samples)} / {target} samples{eta != null ? ` — ~${eta > 90 ? `${Math.ceil(eta / 60)}m` : `${Math.ceil(eta)}s`} left` : ''}
            </div>
          </div>
        )}

        {phase === 'config' && (
          <>
            <div style={ui.row}>
              <span style={ui.label}>Resolution</span>
              {RESOLUTIONS.map((r, i) => (
                <button key={r.label} style={ui.chip(i === resIdx)} onClick={() => setResIdx(i)}>{r.label}</button>
              ))}
              <span style={{ ...ui.label, marginLeft: 12 }}>Quality</span>
              {QUALITIES.map((q, i) => (
                <button key={q.label} style={ui.chip(i === qualIdx)} onClick={() => setQualIdx(i)}>{q.label}</button>
              ))}
            </div>
            <div style={ui.row}>
              <span style={ui.label}>Angle</span>
              {Object.entries(HERO_PRESETS).map(([k, p]) => (
                <button key={k} style={ui.chip(k === angle)} onClick={() => setAngle(k)}>{p.label}</button>
              ))}
              <div style={{ flex: 1 }} />
              <button style={ui.primaryBtn} onClick={start}>▶ Start Render</button>
            </div>
          </>
        )}

        {phase === 'render' && (
          <div style={ui.row}>
            <button style={ui.btn} onClick={() => { sessionRef.current.finishNow = true; }}>Finish Early</button>
            <button style={ui.btn} onClick={() => { cleanupSession(); setPhase('config'); }}>Cancel</button>
          </div>
        )}

        {(phase === 'done' || phase === 'error') && (
          <div style={ui.row}>
            {phase === 'error' && <span style={{ color: '#ff8a8a', fontSize: 12 }}>Render failed: {error}</span>}
            {phase === 'done' && (
              <>
                <button style={ui.primaryBtn} onClick={download}>⬇ Download PNG</button>
                {denoised && (
                  <button style={ui.chip(showRaw)} onClick={() => setShowRaw(v => !v)}>
                    {showRaw ? 'Showing raw' : 'Showing denoised'}
                  </button>
                )}
                {!denoised && <span style={{ fontSize: 11, color: '#958ea0' }}>denoise unavailable — raw render</span>}
              </>
            )}
            <div style={{ flex: 1 }} />
            <button style={ui.btn} onClick={() => { cleanupSession(); setPhase('config'); }}>↺ Render Again</button>
            <button style={ui.btn} onClick={close}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
