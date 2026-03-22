import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';

function KeycapGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frameId;
    let time = 0;

    const COLORS = [
      { bg: '#fdfaf5', shadow: '#c8c3b8' },  // creamy white
      { bg: '#b8d4ff', shadow: '#7aa8e8' },  // pastel blue
      { bg: '#ffb8c8', shadow: '#e88a9a' },  // pastel pink
      { bg: '#b8f0e0', shadow: '#7ad4bc' },  // pastel mint
      { bg: '#e8b8ff', shadow: '#c48ae8' },  // pastel purple
      { bg: '#ffd8b8', shadow: '#e8b08a' },  // pastel peach
      { bg: '#b8e8ff', shadow: '#7ac8e8' },  // pastel sky
      { bg: '#fff0b8', shadow: '#e8d08a' },  // pastel yellow
      { bg: '#d4b8ff', shadow: '#a88ae8' },  // soft violet
      { bg: '#b8ffda', shadow: '#7ae8b4' },  // soft green
      { bg: '#ffb8f0', shadow: '#e88ad4' },  // soft magenta
      { bg: '#f5f0ff', shadow: '#c8c0e8' },  // near white lavender
      { bg: '#ffc8c8', shadow: '#e8a0a0' },  // soft red/coral
      { bg: '#c8f5c8', shadow: '#a0d8a0' },  // soft green
      { bg: '#ffe0c8', shadow: '#e8c0a0' },  // warm peach
    ];

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      return { r, g, b };
    };

    const lerpColor = (c1, c2, t) => {
      const p1 = hexToRgb(c1);
      const p2 = hexToRgb(c2);
      const r = Math.round(p1.r + (p2.r - p1.r) * t);
      const g = Math.round(p1.g + (p2.g - p1.g) * t);
      const b = Math.round(p1.b + (p2.b - p1.b) * t);
      return `rgb(${r},${g},${b})`;
    };

    function roundRectPath(ctx, x, y, w, h, r) {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    const drawKeycap = (ctx, x, y, size, col, pressAmt) => {
      const r = size * 0.22;
      const press = pressAmt || 0;
      const wallThickness = size * 0.08;  // dark side wall thickness

      // LAYER 1 — Outer dark border (the side walls/housing)
      ctx.fillStyle = 'rgba(20, 18, 22, 0.9)';
      ctx.beginPath();
      roundRectPath(ctx, x, y, size, size, r);
      ctx.fill();

      // LAYER 2 — Inner keycap surface (slightly inset, slightly raised)
      const inset = wallThickness;
      const innerSize = size - inset * 2;
      const innerR = r * 0.75;
      ctx.fillStyle = col.shadow;  // slightly darker shade first (side of top surface)
      ctx.beginPath();
      roundRectPath(ctx, x + inset, y + inset + press * 0.3, innerSize, innerSize, innerR);
      ctx.fill();

      // LAYER 3 — Top face (main color, slightly smaller and raised)
      const topInset = inset + size * 0.025;
      const topSize = size - topInset * 2;
      const topR = innerR * 0.85;
      const topLift = press > 0 ? press * 0.4 : -(size * 0.025);  // slight lift when not pressed
      ctx.fillStyle = col.bg;
      ctx.beginPath();
      roundRectPath(ctx, x + topInset, y + topInset + topLift, topSize, topSize, topR);
      ctx.fill();

      // LAYER 4 — Highlight on top face (subtle sheen)
      const hlGrad = ctx.createLinearGradient(
        x + topInset, y + topInset + topLift,
        x + topInset, y + topInset + topLift + topSize * 0.45
      );
      hlGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
      hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      roundRectPath(ctx, x + topInset + 1, y + topInset + topLift + 1, topSize - 2, topSize * 0.45, topR * 0.7);
      ctx.fill();
    };

    const COLS_COUNT = Math.ceil(window.innerWidth / 76) + 1;
    const ROWS_COUNT = Math.ceil(window.innerHeight / 76) + 1;
    const totalKeys = COLS_COUNT * ROWS_COUNT;

    const SIZE = 64;
    const GAP = 10;
    const UNIT = SIZE + GAP;

    const keyStates = Array.from({ length: totalKeys }, () => ({
      colorIdx: Math.floor(Math.random() * COLORS.length),
      targetIdx: Math.floor(Math.random() * COLORS.length),
      progress: 1.0,  // 0 = start of transition, 1 = complete
      timer: Math.random() * 120,  // random frames until next change
      pressTimer: Math.random() * 200,  // random press animation timer
      pressed: false,
      pressAmt: 0
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      keyStates.forEach((key) => {
        // Count down to next color change
        key.timer -= 1;
        if (key.timer <= 0) {
          key.colorIdx = key.targetIdx;
          key.targetIdx = Math.floor(Math.random() * COLORS.length);
          key.progress = 0;
          key.timer = 60 + Math.random() * 180;  // change again in 1-3 seconds
        }
        
        // Smooth color transition
        if (key.progress < 1) key.progress = Math.min(1, key.progress + 0.04);
        
        // Random press animation
        key.pressTimer -= 1;
        if (key.pressTimer <= 0) {
          key.pressed = true;
          key.pressTimer = 180 + Math.random() * 400;  // 3-6 seconds between presses
        }
        if (key.pressed) {
          key.pressAmt = Math.min(key.pressAmt + 0.3, 6);
          if (key.pressAmt >= 6) {
            key.pressed = false;
            // Change color when key finishes pressing
            key.colorIdx = key.targetIdx;
            key.targetIdx = Math.floor(Math.random() * COLORS.length);
            key.progress = 0;
          }
        } else {
          key.pressAmt = Math.max((key.pressAmt || 0) - 0.25, 0);
        }
      });

      let i = 0;
      for (let row = 0; row < ROWS_COUNT; row++) {
        for (let col = 0; col < COLS_COUNT; col++) {
          const key = keyStates[i++];
          if (!key) continue;
          
          const x = col * UNIT - 5;
          const y = row * UNIT - 5;
          
          const fromCol = COLORS[key.colorIdx];
          const toCol = COLORS[key.targetIdx];
          
          const bgColor = lerpColor(fromCol.bg, toCol.bg, key.progress);
          const shadowColor = lerpColor(fromCol.shadow, toCol.shadow, key.progress);
          
          ctx.globalAlpha = 0.85;
          drawKeycap(ctx, x, y, SIZE, { bg: bgColor, shadow: shadowColor }, key.pressAmt || 0);
          ctx.globalAlpha = 1;
        }
      }

      frameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="keycap-grid-container">
      <div className="keycap-grid">
        <canvas ref={canvasRef} width={1300} height={850} />
      </div>
    </div>
  );
}

export default function EntryScreen() {
  const setScreen = useStore(s => s.setScreen);
  const setSelectionPath = useStore(s => s.setSelectionPath);

  const handleStart = () => {
    setSelectionPath('beginner');
    setScreen('selector');
  };

  return (
    <div className="entry-container">
      <style>{`
        .entry-container { position: relative; width: 100%; min-height: 100vh; overflow-x: hidden; }
        
        /* Typography Helpers */
        .headline { font-family: var(--font-heading); font-weight: 700; letter-spacing: -0.03em; color: var(--on-surface); }
        .mono-sm { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--secondary); }
        
        /* Navigation */
        .nav-bar {
          position: fixed; top: 0; left: 0; right: 0; height: 56px;
          background: rgba(19, 19, 21, 0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 32px; z-index: 100;
        }
        .nav-logo { font-family: var(--font-heading); color: var(--on-surface); font-weight: 600; font-size: 18px; }
        .nav-links { display: flex; gap: 24px; }
        .nav-link { 
          color: var(--on-surface-variant); font-size: 14px; font-weight: 500; font-family: var(--font-body);
          transition: color 0.2s ease; text-decoration: none;
        }
        .nav-link:hover { color: var(--primary); }
        @media (max-width: 768px) { .nav-links { display: none !important; } }
        .btn-ghost { color: var(--on-surface-variant); font-family: var(--font-heading); font-weight: 700; padding: 8px 16px; font-size: 14px; }
        .btn-ghost:hover { color: var(--on-surface); }
        .btn-filled { background: var(--primary); color: var(--on-primary); font-family: var(--font-heading); font-weight: 700; padding: 8px 24px; font-size: 14px; border-radius: 4px; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.4); transition: transform 0.1s; }
        .btn-filled:active { transform: translateY(2px); box-shadow: none; }

        /* Animated Grid Overlay */
        .keycap-grid-container {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; overflow: hidden; opacity: 0.6; pointer-events: none;
        }
        .keycap-grid {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotateX(20deg) scale(1.4);
          transform-style: preserve-3d; width: 1300px; height: 850px;
        }
        .hero-fade {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background: linear-gradient(to bottom, rgba(13,13,16,0.45) 0%, rgba(13,13,16,0.65) 60%, rgba(13,13,16,0.88) 100%);
        }

        /* Hero Content */
        .hero-section {
          position: relative; width: 100%; min-height: 100vh;
          display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
          z-index: 10; padding: 0 32px;
        }
        .hero-badge {
          display: inline-block; padding: 4px 16px; border-radius: 100px;
          border: 1px solid rgba(208,188,255,0.3); background: rgba(208,188,255,0.1); backdrop-filter: blur(12px);
          margin-bottom: 24px; animation: pulse 2s infinite; color: var(--primary);
        }
        .hero-headline { font-size: clamp(48px, 8vw, 72px); max-width: 900px; margin-bottom: 32px; text-shadow: 0 10px 30px rgba(0,0,0,0.8); }
        .hero-accent { color: var(--primary); display: block; filter: drop-shadow(0 0 15px rgba(208,188,255,0.4)); }
        
        .hero-actions { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; }
        .btn-hero-primary { 
          background: var(--primary); color: var(--on-primary); padding: 20px 48px; border-radius: 4px;
          font-family: var(--font-heading); font-size: 20px; font-weight: 700;
          box-shadow: inset 0 -2px 0 rgba(0,0,0,0.4); transition: all 0.2s;
        }
        .btn-hero-primary:hover { box-shadow: inset 0 -2px 0 rgba(0,0,0,0.4), 0 0 20px rgba(208,188,255,0.3); transform: translateY(-2px); }
        .btn-hero-ghost {
          background: rgba(208,188,255,0.05); color: var(--on-surface); border: 1px solid rgba(208,188,255,0.3);
          padding: 20px 48px; border-radius: 4px; font-family: var(--font-heading); font-size: 20px; font-weight: 700; transition: all 0.2s; backdrop-filter: blur(10px);
        }
        .btn-hero-ghost:hover { background: var(--surface-container-high); border-color: var(--primary); }

        .tech-rail { position: absolute; bottom: 48px; left: 48px; display: flex; flex-direction: column; gap: 12px; }
        .tech-rail-item {
          background: rgba(32,31,33,0.8); backdrop-filter: blur(24px);
          padding: 8px 16px; border-left: 4px solid var(--secondary);
          color: var(--secondary); display: flex; align-items: center; gap: 12px;
        }
        .tech-dot { width: 8px; height: 8px; background: var(--secondary); border-radius: 50%; box-shadow: 0 0 10px var(--secondary); }

        /* Features Bento */
        .page-section { padding: 120px 32px; width: 100%; max-width: 1200px; margin: 0 auto; z-index: 10; position: relative; }
        .bento-grid { display: grid; gap: 24px; grid-template-columns: repeat(4, 1fr); }
        .bento-card { padding: 32px; border-radius: 4px; border-top: 1px solid rgba(208,188,255,0.1); transition: background 0.3s; }
        
        .c-span-2 { grid-column: span 2; }
        .c-span-4 { grid-column: span 4; display: flex; justify-content: space-between; align-items: center; }
        @media (max-width: 900px) { .c-span-2 { grid-column: span 4; } .c-span-4 { flex-direction: column; align-items: flex-start; gap: 24px; } }
        @media (max-width: 600px) { .bento-grid { grid-template-columns: 1fr; } .bento-card { grid-column: span 1 !important; } }
        
        .bento-icon { font-size: 32px; margin-bottom: 24px; color: var(--primary); }
        .bento-title { font-size: 24px; margin-bottom: 12px; color: var(--on-surface); }
        .bento-text { font-size: 15px; color: var(--on-surface-variant); line-height: 1.6; }
        .tag-chip { background: var(--surface-container-highest); padding: 8px 16px; border-radius: 100px; font-family: var(--font-mono); font-size: 11px; }

        /* Process Steps */
        .process-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; margin-top: 64px; }
        @media (max-width: 800px) { .process-grid { grid-template-columns: 1fr; } }
        .process-step { position: relative; }
        .step-number { position: absolute; top: -64px; left: -16px; font-size: 120px; font-family: var(--font-heading); font-weight: 700; color: var(--surface-container-highest); opacity: 0.5; z-index: -1; line-height: 1; }

        /* Gallery Previews */
        .gallery-preview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 48px; }
        @media (max-width: 900px) { .gallery-preview-grid { grid-template-columns: 1fr; } }
        .gallery-card { background: var(--surface-container-low); border-radius: 4px; overflow: hidden; border-bottom: 4px solid transparent; transition: border-color 0.3s; cursor: pointer; }
        .gallery-card:hover { border-bottom-color: var(--primary); }
        .gc-image { width: 100%; aspect-ratio: 1; background: var(--surface-container-highest); position: relative; overflow: hidden; }
        .gc-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s; opacity: 0.8; }
        .gallery-card:hover .gc-image img { transform: scale(1.1); opacity: 1; }
        .gc-content { padding: 24px; }
        .gc-title { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }

        /* Footer */
        .footer { background: var(--surface); border-top: 1px solid rgba(229, 225, 228, 0.1); padding: 64px 32px; width: 100%; font-family: var(--font-body); }
        .footer-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 32px; }
        @media (max-width: 800px) { .footer-grid { grid-template-columns: 1fr 1fr; } }
        .footer-heading { font-family: var(--font-heading); font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--primary); margin-bottom: 16px; letter-spacing: 0.1em; }
        .footer-link { display: block; color: rgba(229, 225, 228, 0.5); font-family: var(--font-heading); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; margin-bottom: 12px; transition: color 0.2s; }
        .footer-link:hover { color: var(--primary); }
      `}</style>

      {/* Nav */}
      <nav className="nav-bar">
        <div className="nav-logo" onClick={() => setScreen('entry')} style={{ cursor: 'pointer' }}>Keycap Studio</div>
        <div className="nav-links">
          <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); setScreen('about'); }}>About</a>
          <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); setScreen('support'); }}>Support</a>
          <a href="https://github.com/MohamedZameel" target="_blank" rel="noopener noreferrer" className="nav-link">GitHub</a>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => document.dispatchEvent(new CustomEvent('showSignIn'))}>Sign In</button>
          <button className="btn-filled" onClick={handleStart}>Build Now</button>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero-section">
        <KeycapGrid />
        <div className="hero-fade" />
        
        <div style={{ position: 'relative', zIndex: 10 }}>
          <h1 className="hero-headline headline">
            Design your dream keyboard
            <span className="hero-accent">in real-time 3D</span>
          </h1>
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={handleStart}>Start Designing</button>
            <button className="btn-hero-ghost" onClick={() => setScreen('gallery')}>Browse Gallery</button>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="page-section">
        <div className="bento-grid">
          <div className="bento-card c-span-2" style={{ background: 'var(--surface-container-low)' }}>
            <div className="bento-icon">🧊</div>
            <h3 className="bento-title headline">Real-time 3D</h3>
            <p className="bento-text">Experience zero-latency rendering of every material swap, from polycarbonate textures to mirror-polished brass weights.</p>
          </div>
          <div className="bento-card" style={{ background: 'var(--surface-container-lowest)' }}>
            <div className="bento-icon" style={{ color: 'var(--secondary)' }}>⌨️</div>
            <h3 className="bento-title headline">Any Keyboard Model</h3>
            <p className="bento-text">Upload your own plate files or choose from our extensive library of custom 60%, 65%, and TKL layouts.</p>
          </div>
          <div className="bento-card" style={{ background: 'var(--surface-container-low)' }}>
            <div className="bento-icon">🖼️</div>
            <h3 className="bento-title headline">Image Uploads</h3>
            <p className="bento-text">Generate custom novelties by uploading vectors directly onto the 3D keycap surface.</p>
          </div>
          <div className="bento-card c-span-4" style={{ background: 'var(--surface-container)' }}>
            <div style={{ maxWidth: '600px' }}>
              <h3 className="bento-title headline">Manufacturer Ready</h3>
              <p className="bento-text">We export production-ready files including CNC paths, PCB schematics, and dye-sublimation templates.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span className="tag-chip">STEP/IGES</span>
              <span className="tag-chip">PDF VECTORS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Process Pipeline */}
      <div className="page-section" style={{ background: 'var(--surface-container-lowest)', maxWidth: '100%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <h2 className="headline" style={{ fontSize: '36px', marginBottom: '16px' }}>Precision Engineering Pipeline</h2>
              <p className="bento-text">From initial concept to final assembly, our studio provides the tools needed for professional-grade keyboard design.</p>
            </div>
            <div className="mono-sm" style={{ color: 'var(--primary)' }}>PROCESS_MANUAL_V1.0</div>
          </div>
          
          <div className="process-grid">
            {[
              {
                title: 'Select Keyboard',
                desc: 'Choose your layout, mounting style, and material profile from our curated library.',
                color: 'var(--primary)'
              },
              {
                title: 'Design Keycaps',
                desc: 'Apply custom legends, colors, and profiles. Use our procedural tool for gradient sets.',
                color: 'var(--secondary)'
              },
              {
                title: 'Export & Order',
                desc: 'Receive an automated BOM and technical drawings. One-click order with our partners.',
                color: 'var(--primary)'
              }
            ].map((step, idx) => (
              <div key={idx} className="process-step">
                <div className="step-number">{idx + 1}</div>
                <h4 className="headline" style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '32px', height: '2px', background: step.color }}/> {step.title}</h4>
                <p className="bento-text">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery Previews */}
      <div className="page-section">
        <h2 className="headline" style={{ fontSize: '24px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Designer Concepts</h2>
        <div className="gallery-preview-grid">
          {[
            { title: 'NEON_DRIFT 65', by: 'ALEX_STUDIO', tags: ['PBT', 'GASKET'], c: '#d0bcff' },
            { title: 'RAW_ALUM TKL', by: 'KBD_LAB', tags: ['ALU', 'WKL'], c: '#44e2cd' },
            { title: 'VINTAGE_90', by: 'NOSTALGIA_HUB', tags: ['ABS', 'TRAY'], c: '#ffb869' }
          ].map((card, i) => (
            <div key={i} className="gallery-card" onClick={() => setScreen('gallery')}>
              <div className="gc-image" style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${card.c}22` }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '8px', backgroundColor: card.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading, sans-serif)', fontWeight: 'bold', fontSize: '24px', color: '#1a1a1a', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -4px 0 rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.4)' }}>
                  {card.title.charAt(0)}
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily:'var(--font-heading, Space Grotesk)', fontWeight:700, fontSize:15, color:'var(--on-surface, #fff)' }}>{card.title}</span>
                  <span style={{ fontFamily:'var(--font-mono, JetBrains Mono)', fontSize:10, color:'var(--secondary, #44e2cd)' }}>{card.by}</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {card.tags.map(t => <span key={t} style={{ fontFamily:'var(--font-mono, JetBrains Mono)', fontSize:10, padding:'3px 10px', background:'var(--surface-container-high, #2a2a2c)', borderRadius:20, color:'var(--on-surface-variant, #958ea0)' }}>{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div className="footer-heading">Keycap Studio</div>
            <p className="footer-link" style={{ textTransform: 'none', lineHeight: 1.6 }}>Precision milled digital tools for the mechanical keyboard enthusiast. Built by designers for creators.</p>
          </div>
          <div>
            <div className="footer-heading">Resources</div>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Developer API</a>
          </div>
          <div>
            <div className="footer-heading">Community</div>
            <a href="#" className="footer-link">Discord</a>
            <a href="#" className="footer-link">Twitter / X</a>
            <a href="#" className="footer-link">GitHub</a>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono-sm" style={{ marginBottom: '16px' }}>Status: Optimal</div>
            <div className="footer-link">© 2024 Keycap Studio.<br/>Precision Milled.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
