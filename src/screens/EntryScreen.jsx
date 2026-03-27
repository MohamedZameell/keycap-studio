import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import KeyboardSilhouette from '../components/KeyboardSilhouette';
import { useAuth } from '../hooks/useAuth';
import UserMenu from '../components/UserMenu';

export default function EntryScreen() {
  const setScreen = useStore(s => s.setScreen);
  const setSelectionPath = useStore(s => s.setSelectionPath);
  const canvasRef = useRef(null);
  const { user, profile, signOut, isAuthenticated } = useAuth();

  const handleStart = () => {
    setSelectionPath(null); // Let user choose path in selector
    setScreen('selector');
  };

  useEffect(() => {
    let cleanup = () => {};
    const startFrame = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

    let frameId;
    let lastFrameTime = performance.now();
    const mountTime = performance.now();

    const PRESS_DOWN_MS = 350;      // Slower press down
    const HOLD_MS = 150;            // Longer hold at bottom
    const RELEASE_MS = 300;         // Slower release
    const MAX_PRESS_PX = 4;
    const MIN_IDLE_MS = 3000;       // Longer wait between presses
    const MAX_IDLE_MS = 8000;       // Much longer max wait
    const FALL_DURATION = 1000;     // Slower fall animation
    const BOUNCE_AMOUNT = 6;
    const RAIN_PHASE_MS = 7000;     // Longer rain phase
    const FALL_START_Y = -100;
    const MAX_SIMULTANEOUS_PRESSES = 10;  // Limit concurrent presses

    const PHASES = { RAIN: 'rain', IDLE: 'idle' };
    let phase = PHASES.RAIN;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const KEYCAP_COLORS = [
      '#005f73', '#0a9396', '#94d2bd', '#e9d8a6', '#ee9b00',
      '#ca6702', '#bb3e03', '#ae2012', '#9b2226',
    ];

    const darkenHex = (hex, factor) => {
      const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
      const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
      const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
      return `#${[r, g, b].map((x) => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0')).join('')}`;
    };

    const paletteSwatches = KEYCAP_COLORS.map((bg) => ({ bg, shadow: darkenHex(bg, 0.68) }));

    function roundRectPath(c, x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      c.moveTo(x + rr, y);
      c.lineTo(x + w - rr, y);
      c.quadraticCurveTo(x + w, y, x + w, y + rr);
      c.lineTo(x + w, y + h - rr);
      c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      c.lineTo(x + rr, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - rr);
      c.lineTo(x, y + rr);
      c.quadraticCurveTo(x, y, x + rr, y);
      c.closePath();
    }

    const drawKeycap = (c, x, y, size, col, pressAmount) => {
      const r = size * 0.22;
      const shadowDepth = size * 0.12;
      const actualY = y + pressAmount;

      c.fillStyle = col.shadow;
      c.beginPath();
      roundRectPath(c, x, actualY + shadowDepth, size, size, r);
      c.fill();

      c.fillStyle = col.bg;
      c.beginPath();
      roundRectPath(c, x, actualY, size, size, r);
      c.fill();

      const gradient = c.createLinearGradient(x, actualY, x, actualY + size * 0.5);
      gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gradient;
      c.beginPath();
      roundRectPath(c, x + 2, actualY + 2, size - 4, size * 0.5, r * 0.8);
      c.fill();
    };

    const SIZE = 68;
    const GAP = 2;
    const UNIT = SIZE + GAP;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let COLS_COUNT = 0;
    let keyStates = [];

    const pickPendingColorIdx = (currentIdx) => {
      if (paletteSwatches.length <= 1) return 0;
      let p;
      do p = Math.floor(Math.random() * paletteSwatches.length);
      while (p === currentIdx);
      return p;
    };

    const recalculateGrid = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;

      const cols = Math.ceil(W / UNIT) + 3;
      const rows = Math.ceil(H / UNIT) + 3;
      COLS_COUNT = cols;

      keyStates = Array.from({ length: cols * rows }, (_, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const startIdx = (row + col) % paletteSwatches.length;
        return {
          row,
          col,
          gridX: col * UNIT - UNIT * 0.5,
          gridY: row * UNIT - UNIT * 0.5,
          colorIdx: startIdx,
          pendingColorIdx: pickPendingColorIdx(startIdx),
          keyPhase: 'idle',
          phaseElapsed: 0,
          idleElapsed: Math.random() * MAX_IDLE_MS,
          nextPressDelay: MIN_IDLE_MS + Math.random() * (MAX_IDLE_MS - MIN_IDLE_MS),
          pressAmt: 0,
          falling: true,
          fallDelay: Math.random() * 5000,  // Spread falls over 5 seconds
          fallStart: null,
          currentY: FALL_START_Y,
        };
      });
    };

    recalculateGrid();

    const ro = new ResizeObserver(() => recalculateGrid());
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener('resize', recalculateGrid);

    const updateFall = (key, now) => {
      if (!key.falling) return;
      if (key.fallStart === null) {
        if (now >= mountTime + key.fallDelay) key.fallStart = now;
        return;
      }
      const elapsed = now - key.fallStart;
      const progress = Math.min(elapsed / FALL_DURATION, 1);
      const targetY = key.gridY;

      if (progress < 0.7) {
        const t = progress / 0.7;
        key.currentY = FALL_START_Y + (targetY - FALL_START_Y) * easeOutCubic(t);
      } else if (progress < 0.85) {
        const t = (progress - 0.7) / 0.15;
        key.currentY = targetY + BOUNCE_AMOUNT * (1 - t);
      } else {
        const t = (progress - 0.85) / 0.15;
        key.currentY = targetY + BOUNCE_AMOUNT * (1 - t) * (1 - easeOutCubic(t));
      }

      if (progress >= 1) {
        key.currentY = targetY;
        key.falling = false;
      }
    };

    const updateKeyIdlePress = (key, dtMs) => {
      if (key.keyPhase === 'idle') {
        key.idleElapsed += dtMs;
        if (key.idleElapsed >= key.nextPressDelay) {
          key.keyPhase = 'pressing';
          key.phaseElapsed = 0;
        }
      } else if (key.keyPhase === 'pressing') {
        key.phaseElapsed += dtMs;
        const t = Math.min(1, key.phaseElapsed / PRESS_DOWN_MS);
        key.pressAmt = MAX_PRESS_PX * t;
        if (key.phaseElapsed >= PRESS_DOWN_MS) {
          key.colorIdx = key.pendingColorIdx;
          key.pendingColorIdx = pickPendingColorIdx(key.colorIdx);
          key.keyPhase = 'holding';
          key.phaseElapsed = 0;
          key.pressAmt = MAX_PRESS_PX;
        }
      } else if (key.keyPhase === 'holding') {
        key.phaseElapsed += dtMs;
        key.pressAmt = MAX_PRESS_PX;
        if (key.phaseElapsed >= HOLD_MS) {
          key.keyPhase = 'releasing';
          key.phaseElapsed = 0;
        }
      } else {
        key.phaseElapsed += dtMs;
        const t = Math.min(1, key.phaseElapsed / RELEASE_MS);
        key.pressAmt = MAX_PRESS_PX * (1 - t);
        if (key.phaseElapsed >= RELEASE_MS) {
          key.pressAmt = 0;
          key.keyPhase = 'idle';
          key.idleElapsed = 0;
          key.nextPressDelay = MIN_IDLE_MS + Math.random() * (MAX_IDLE_MS - MIN_IDLE_MS);
        }
      }
    };

    function animate(now) {
      try {
        const dtMs = Math.min(Math.max(0, now - lastFrameTime), 48);
        lastFrameTime = now;

        if (phase === PHASES.RAIN && now - mountTime > RAIN_PHASE_MS) phase = PHASES.IDLE;

        if (phase === PHASES.IDLE) {
          // Count currently pressing keys
          const pressingCount = keyStates.filter(k => k.keyPhase !== 'idle').length;

          keyStates.forEach((k) => {
            // Only allow new presses if under the limit
            if (k.keyPhase === 'idle' && pressingCount >= MAX_SIMULTANEOUS_PRESSES) {
              // Don't start new press, just increment idle time slightly
              k.idleElapsed += dtMs * 0.5;
              return;
            }
            updateKeyIdlePress(k, dtMs);
          });
        }

        ctx.clearRect(0, 0, W, H);

        keyStates.forEach((key) => {
          // Always try to update fall state first
          if (key.falling) {
            updateFall(key, now);
          } else {
            key.currentY = key.gridY;
          }

          // Draw the keycap at its current position
          drawKeycap(ctx, key.gridX, key.currentY, SIZE, paletteSwatches[key.colorIdx], key.pressAmt || 0);
        });
      } catch (e) {
        console.error('Canvas animation error:', e);
      }
      frameId = requestAnimationFrame(animate);
    }

    frameId = requestAnimationFrame(animate);

    cleanup = () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      window.removeEventListener('resize', recalculateGrid);
    };
    });

    return () => {
      cancelAnimationFrame(startFrame);
      cleanup();
    };
  }, []);

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
        .btn-ghost { color: var(--on-surface-variant); font-family: var(--font-heading); font-weight: 700; padding: 8px 16px; font-size: 14px; }
        .btn-ghost:hover { color: var(--on-surface); }
        .btn-filled { background: var(--primary); color: var(--on-primary); font-family: var(--font-heading); font-weight: 700; padding: 8px 24px; font-size: 14px; border-radius: 4px; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.4); transition: transform 0.1s; }
        .btn-filled:active { transform: translateY(2px); box-shadow: none; }

        /* Hero canvas — full-bleed interactive grid */
        .keycap-grid-container {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; overflow: hidden; opacity: 1; pointer-events: auto;
        }
        .keycap-hero-canvas-wrap {
          width: 100%; height: 100%; min-height: calc(100vh - 56px);
        }
        .keycap-hero-canvas {
          display: block; width: 100%; height: 100%;
        }
        .hero-section {
          position: relative; width: 100%; min-height: 100vh;
          padding-top: 56px;
          z-index: 2;
        }

        .tech-rail { position: absolute; bottom: 48px; left: 48px; display: flex; flex-direction: column; gap: 12px; }
        .tech-rail-item {
          background: rgba(32,31,33,0.8); backdrop-filter: blur(24px);
          padding: 8px 16px; border-left: 4px solid var(--secondary);
          color: var(--secondary); display: flex; align-items: center; gap: 12px;
        }
        .tech-dot { width: 8px; height: 8px; background: var(--secondary); border-radius: 50%; box-shadow: 0 0 10px var(--secondary); }

        /* Features Bento */
        .page-section {
          padding: 120px 40px; width: 100%; max-width: 1200px;
          margin: 0 auto; z-index: 10; position: relative;
        }
        .bento-grid { display: grid; gap: 20px; grid-template-columns: repeat(4, 1fr); }
        .bento-card {
          padding: 32px; border-radius: 12px;
          border: 1px solid rgba(246, 246, 246, 0.06);
          background: rgba(16, 16, 20, 0.6);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bento-card:hover {
          border-color: rgba(208, 188, 255, 0.15);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
        }

        .c-span-2 { grid-column: span 2; }
        .c-span-4 { grid-column: span 4; display: flex; justify-content: space-between; align-items: center; }
        @media (max-width: 900px) { .c-span-2 { grid-column: span 4; } .c-span-4 { flex-direction: column; align-items: flex-start; gap: 24px; } }
        @media (max-width: 600px) { .bento-grid { grid-template-columns: 1fr; } .bento-card { grid-column: span 1 !important; } }

        .bento-icon {
          font-size: 28px; margin-bottom: 20px;
          width: 48px; height: 48px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(208, 188, 255, 0.1);
          border-radius: 10px;
        }
        .bento-title { font-size: 20px; margin-bottom: 10px; color: var(--on-surface); font-weight: 600; }
        .bento-text { font-size: 14px; color: var(--on-surface-variant); line-height: 1.7; }
        .tag-chip {
          background: rgba(246, 246, 246, 0.05);
          border: 1px solid rgba(246, 246, 246, 0.1);
          padding: 8px 16px; border-radius: 100px;
          font-family: var(--font-mono); font-size: 11px; color: var(--on-surface-variant);
        }

        /* Process Steps */
        .process-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 64px; }
        @media (max-width: 800px) { .process-grid { grid-template-columns: 1fr; } }
        .process-step {
          position: relative; isolation: isolate;
          padding: 32px; border-radius: 12px;
          background: rgba(16, 16, 20, 0.4);
          border: 1px solid rgba(246, 246, 246, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .process-step:hover {
          background: rgba(22, 22, 26, 0.6);
          border-color: rgba(246, 246, 246, 0.08);
        }
        .step-number {
          position: absolute; top: 16px; right: 20px;
          font-size: 64px; font-family: var(--font-heading); font-weight: 700;
          background: linear-gradient(180deg, rgba(208, 188, 255, 0.15) 0%, transparent 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; line-height: 1;
        }

        /* Gallery Previews */
        .gallery-preview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
        @media (max-width: 900px) { .gallery-preview-grid { grid-template-columns: 1fr; } }
        .gallery-card {
          background: rgba(16, 16, 20, 0.6);
          border: 1px solid rgba(246, 246, 246, 0.06);
          border-radius: 12px; overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;
        }
        .gallery-card:hover {
          border-color: rgba(208, 188, 255, 0.2);
          transform: translateY(-6px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
        }
        .gc-image { width: 100%; aspect-ratio: 16/10; background: var(--surface-container); position: relative; overflow: hidden; }
        .gc-image::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(6, 6, 8, 0.4) 0%, transparent 50%);
        }
        .gallery-card:hover .gc-image > div { transform: scale(1.05) !important; }
        .gc-content { padding: 20px; }
        .gc-title { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }

        /* Footer */
        .footer {
          background: var(--surface-dim);
          border-top: 1px solid rgba(246, 246, 246, 0.05);
          padding: 80px 40px 48px; width: 100%; font-family: var(--font-body);
        }
        .footer-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; }
        @media (max-width: 800px) { .footer-grid { grid-template-columns: 1fr 1fr; } }
        .footer-heading {
          font-family: var(--font-mono); font-size: 11px; font-weight: 500;
          text-transform: uppercase; color: var(--secondary);
          margin-bottom: 20px; letter-spacing: 0.15em;
        }
        .footer-link {
          display: block; color: var(--on-surface-variant);
          font-family: var(--font-body); font-size: 14px;
          text-decoration: none; margin-bottom: 14px;
          transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .footer-link:hover { color: var(--on-surface); }
        /* Premium Nav */
        .nav-bar {
          position: fixed; top: 0; left: 0; right: 0; height: 64px;
          background: rgba(6, 6, 8, 0.7);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(246, 246, 246, 0.06);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px; z-index: 100;
        }
        .nav-logo {
          font-family: var(--font-heading); color: var(--on-surface);
          font-weight: 700; font-size: 20px; letter-spacing: -0.02em;
          display: flex; align-items: center; gap: 10px;
        }
        .nav-logo::before {
          content: ''; width: 8px; height: 8px;
          background: var(--primary); border-radius: 2px;
          box-shadow: 0 0 12px var(--primary-glow);
        }
        .btn-ghost {
          color: var(--on-surface-variant); font-family: var(--font-heading);
          font-weight: 600; padding: 10px 20px; font-size: 14px;
          border-radius: 6px; background: transparent;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-ghost:hover { color: var(--on-surface); background: rgba(246, 246, 246, 0.05); }
        .btn-filled {
          background: linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%);
          color: var(--on-primary); font-family: var(--font-heading);
          font-weight: 700; padding: 10px 24px; font-size: 14px;
          border-radius: 6px; border: none;
          box-shadow: 0 4px 16px rgba(208, 188, 255, 0.3);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-filled:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(208, 188, 255, 0.4); }
        .btn-filled:active { transform: translateY(0); }
      `}</style>

      {/* Nav */}
      <nav className="nav-bar">
        <div className="nav-logo" onClick={() => setScreen('entry')} style={{ cursor: 'pointer' }}>Keycap Studio</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <button className="btn-ghost" onClick={() => document.dispatchEvent(new CustomEvent('showSignIn'))}>Sign In</button>
          )}
          <button className="btn-filled" onClick={handleStart}>Build Now</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--surface-dim)',
      }}>
        {/* Ambient glow orbs */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '15%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(208, 188, 255, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(68, 226, 205, 0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            zIndex: 1,
            height: '100%',
            display: 'block',
          }}
        />

        {/* Hero content */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          {/* Subtle glow behind text */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '120%',
            height: '200%',
            background: 'radial-gradient(ellipse, rgba(208, 188, 255, 0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
            zIndex: -1,
          }} />

          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: '16px',
            opacity: 0.9,
          }}>
            3D Keyboard Designer
          </p>

          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(180deg, #ffffff 20%, rgba(208, 188, 255, 0.9) 80%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '12px',
          }}>
            Design your dream<br />keyboard
          </h1>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'var(--on-surface-variant)',
            marginBottom: '40px',
            maxWidth: '500px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Real-time 3D visualization with custom keycaps, colors, and materials
          </p>

          <div style={{ pointerEvents: 'auto', display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button
              onClick={handleStart}
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)',
                color: 'var(--on-primary)',
                border: 'none',
                borderRadius: '8px',
                padding: '16px 40px',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(208, 188, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(208, 188, 255, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(208, 188, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
              }}
            >
              Start Designing
            </button>
            <button
              onClick={() => setScreen('gallery')}
              style={{
                background: 'rgba(16, 16, 20, 0.8)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                color: 'var(--on-surface)',
                border: '1px solid rgba(246, 246, 246, 0.1)',
                borderRadius: '8px',
                padding: '16px 40px',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(30, 30, 36, 0.9)';
                e.currentTarget.style.borderColor = 'rgba(246, 246, 246, 0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(16, 16, 20, 0.8)';
                e.currentTarget.style.borderColor = 'rgba(246, 246, 246, 0.1)';
              }}
            >
              Browse Gallery
            </button>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: 'linear-gradient(to top, var(--surface-dim) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 5,
        }} />
      </section>

      {/* Bento Grid */}
      <div className="page-section" style={{ paddingTop: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: '16px',
          }}>Features</p>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 700,
            color: 'var(--on-surface)',
            letterSpacing: '-0.02em',
          }}>Everything you need to design</h2>
        </div>

        <div className="bento-grid">
          <div className="bento-card c-span-2">
            <div className="bento-icon">🧊</div>
            <h3 className="bento-title headline">Real-time 3D</h3>
            <p className="bento-text">Zero-latency rendering of every material swap, from textured PBT to polished brass weights.</p>
          </div>
          <div className="bento-card">
            <div className="bento-icon" style={{ background: 'rgba(68, 226, 205, 0.1)' }}>⌨️</div>
            <h3 className="bento-title headline">Any Layout</h3>
            <p className="bento-text">60%, 65%, TKL, or full-size. Choose from our library or upload custom layouts.</p>
          </div>
          <div className="bento-card">
            <div className="bento-icon">🖼️</div>
            <h3 className="bento-title headline">Custom Images</h3>
            <p className="bento-text">Upload artwork directly onto keycap surfaces for unique novelties.</p>
          </div>
          <div className="bento-card c-span-4">
            <div style={{ maxWidth: '600px' }}>
              <h3 className="bento-title headline">Production Ready Exports</h3>
              <p className="bento-text">Export CNC paths, color specs, and dye-sub templates for manufacturers.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span className="tag-chip">STEP/IGES</span>
              <span className="tag-chip">PDF VECTORS</span>
              <span className="tag-chip">KLE JSON</span>
            </div>
          </div>
        </div>
      </div>

      {/* Process Pipeline */}
      <div className="page-section" style={{ background: 'var(--surface-dim)', maxWidth: '100%', borderTop: '1px solid rgba(246, 246, 246, 0.04)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              marginBottom: '16px',
            }}>How It Works</p>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 700,
              color: 'var(--on-surface)',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
            }}>Three simple steps</h2>
            <p style={{
              fontSize: '16px',
              color: 'var(--on-surface-variant)',
              maxWidth: '500px',
              margin: '0 auto',
            }}>From concept to production-ready files in minutes</p>
          </div>

          <div className="process-grid">
            {[
              {
                number: '01',
                title: 'Select Layout',
                desc: 'Choose your keyboard layout, form factor, and mounting style from our curated library.',
                color: 'var(--primary)'
              },
              {
                number: '02',
                title: 'Customize',
                desc: 'Apply colors, materials, legends, and images. Preview everything in real-time 3D.',
                color: 'var(--secondary)'
              },
              {
                number: '03',
                title: 'Export',
                desc: 'Download production files, share your design, or order directly from partners.',
                color: 'var(--primary)'
              }
            ].map((step) => (
              <div key={step.number} className="process-step">
                <div className="step-number">{step.number}</div>
                <div style={{
                  width: '6px', height: '6px',
                  background: step.color,
                  borderRadius: '50%',
                  boxShadow: `0 0 12px ${step.color === 'var(--primary)' ? 'rgba(208, 188, 255, 0.5)' : 'rgba(68, 226, 205, 0.5)'}`,
                  marginBottom: '20px',
                }} />
                <h4 className="headline" style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--on-surface)' }}>{step.title}</h4>
                <p className="bento-text" style={{ fontSize: '14px' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery Previews */}
      <div className="page-section" style={{ borderTop: '1px solid rgba(246, 246, 246, 0.04)' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: '16px',
          }}>Gallery</p>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 700,
            color: 'var(--on-surface)',
            letterSpacing: '-0.02em',
          }}>Community designs</h2>
        </div>
        <div className="gallery-preview-grid">
          {[
            { title: 'Neon Drift', by: 'Alex Studio', tags: ['PBT', 'Gasket'], c: '#d0bcff', formFactor: '65%', silhouetteScale: 0.58 },
            { title: 'Raw Aluminum', by: 'KBD Lab', tags: ['Alu', 'WKL'], c: '#44e2cd', formFactor: 'TKL', silhouetteScale: 0.48 },
            { title: 'Vintage 90s', by: 'Nostalgia Hub', tags: ['ABS', 'Tray'], c: '#ffb869', formFactor: '100%', silhouetteScale: 0.36 },
          ].map((card, i) => (
            <div key={i} className="gallery-card" onClick={() => setScreen('gallery')}>
              <div
                className="gc-image"
                style={{
                  width: '100%',
                  height: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${card.c}15 0%, ${card.c}08 100%)`,
                  overflow: 'hidden',
                  padding: '0 16px',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    transform: `scale(${card.silhouetteScale})`,
                    transformOrigin: 'center center',
                    maxWidth: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <KeyboardSilhouette formFactor={card.formFactor} large={false} showLabel={false} />
                </div>
              </div>
              <div className="gc-content">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontFamily:'var(--font-heading)', fontWeight:600, fontSize:15, color:'var(--on-surface)' }}>{card.title}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--on-surface-variant)' }}>{card.by}</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {card.tags.map(t => <span key={t} style={{ fontFamily:'var(--font-mono)', fontSize:10, padding:'4px 10px', background:'rgba(246, 246, 246, 0.05)', border: '1px solid rgba(246, 246, 246, 0.08)', borderRadius:100, color:'var(--on-surface-variant)' }}>{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <button
            onClick={() => setScreen('gallery')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(246, 246, 246, 0.15)',
              borderRadius: '8px',
              padding: '14px 32px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: '14px',
              color: 'var(--on-surface)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(246, 246, 246, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(246, 246, 246, 0.25)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(246, 246, 246, 0.15)';
            }}
          >
            View All Designs →
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--on-surface)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                width: '6px', height: '6px',
                background: 'var(--primary)',
                borderRadius: '2px',
                boxShadow: '0 0 10px var(--primary-glow)',
              }} />
              Keycap Studio
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--on-surface-variant)',
              lineHeight: 1.7,
              maxWidth: '280px',
            }}>
              Professional keyboard design tools for enthusiasts. Built by designers, for creators.
            </p>
          </div>
          <div>
            <div className="footer-heading">Resources</div>
            <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setScreen('about'); }}>About</a>
            <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setScreen('support'); }}>Support</a>
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy</a>
          </div>
          <div>
            <div className="footer-heading">Community</div>
            <a href="#" className="footer-link">Discord</a>
            <a href="#" className="footer-link">Twitter</a>
            <a href="#" className="footer-link">GitHub</a>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="footer-heading" style={{ textAlign: 'right' }}>Product</div>
            <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setScreen('gallery'); }}>Gallery</a>
            <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setScreen('studio'); }}>Studio</a>
            <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setScreen('typing-test'); }}>Typing Test</a>
          </div>
        </div>
        <div style={{
          maxWidth: '1200px',
          margin: '48px auto 0',
          paddingTop: '24px',
          borderTop: '1px solid rgba(246, 246, 246, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            © 2024 Keycap Studio
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            v1.0.0
          </span>
        </div>
      </footer>
    </div>
  );
}
