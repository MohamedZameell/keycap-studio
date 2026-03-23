import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import KeyboardSilhouette from '../components/KeyboardSilhouette';

function KeycapGrid({ onStartDesigning, onBrowseGallery }) {
  const canvasRef = useRef(null);
  const onStartRef = useRef(onStartDesigning);
  const onGalleryRef = useRef(onBrowseGallery);
  onStartRef.current = onStartDesigning;
  onGalleryRef.current = onBrowseGallery;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frameId;
    let lastFrameTime = performance.now();
    const mountTime = performance.now();

    const PRESS_DOWN_MS = 200;
    const HOLD_MS = 90;
    const RELEASE_MS = 150;
    const MAX_PRESS_PX = 4;
    const MIN_IDLE_MS = 1800;
    const MAX_IDLE_MS = 3500;
    const FALL_DURATION = 600;
    const BOUNCE_AMOUNT = 8;
    const RAIN_PHASE_MS = 5000;
    const WORD_STAGGER_MS = 150;
    const FALL_START_Y = -70; // -cellSize - gap

    const PHASES = { RAIN: 'rain', WORDS: 'words', IDLE: 'idle' };
    let phase = PHASES.RAIN;
    let phaseStartTime = mountTime;
    let allWordsActivated = false;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const KEYCAP_COLORS = [
      '#005f73',
      '#0a9396',
      '#94d2bd',
      '#e9d8a6',
      '#ee9b00',
      '#ca6702',
      '#bb3e03',
      '#ae2012',
      '#9b2226',
    ];

    const darkenHex = (hex, factor) => {
      const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
      const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
      const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
      return `#${[r, g, b].map((x) => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0')).join('')}`;
    };

    const paletteSwatches = KEYCAP_COLORS.map((bg) => ({
      bg,
      shadow: darkenHex(bg, 0.68),
    }));

    function roundRectPath(ctx, x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      ctx.lineTo(x + w, y + h - rr);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      ctx.lineTo(x + rr, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
    }

    function roundRectFill(ctx, x, y, w, h, r) {
      ctx.beginPath();
      roundRectPath(ctx, x, y, w, h, r);
      ctx.fill();
    }

    const drawKeycap = (ctx, x, y, size, col, pressAmount) => {
      const r = size * 0.22;
      const shadowDepth = size * 0.12;
      const actualY = y + pressAmount;

      ctx.fillStyle = col.shadow;
      ctx.beginPath();
      roundRectPath(ctx, x, actualY + shadowDepth, size, size, r);
      ctx.fill();

      ctx.fillStyle = col.bg;
      ctx.beginPath();
      roundRectPath(ctx, x, actualY, size, size, r);
      ctx.fill();

      const gradient = ctx.createLinearGradient(x, actualY, x, actualY + size * 0.5);
      gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      roundRectPath(ctx, x + 2, actualY + 2, size - 4, size * 0.5, r * 0.8);
      ctx.fill();
    };

    const SIZE = 68;
    const GAP = 2;
    const UNIT = SIZE + GAP;

    const container = canvas.parentElement;
    const fitCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cw = Math.max(320, Math.floor(rect.width));
      const ch = Math.max(400, Math.floor(rect.height));
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { W: cw, H: ch };
    };

    let W = 0;
    let H = 0;
    let COLS_COUNT = 0;
    let ROWS_COUNT = 0;
    let keyStates = [];

    function assignWordCells(cols, rows) {
      const centerCol = Math.floor(cols / 2);
      const centerRow = Math.floor(rows / 2);
      const wordMap = new Map();
      const order = [];

      // Row 1
      const row1 = centerRow - 2;
      const row1Words = ['Design', 'your', 'dream'];
      const row1StartCol = centerCol - Math.floor(row1Words.length / 2);
      row1Words.forEach((word, i) => {
        const col = row1StartCol + i;
        wordMap.set(`${row1},${col}`, word);
        order.push(`${row1},${col}`);
      });

      // Row 2
      const row2 = centerRow;
      const row2Words = ['keyboard', 'in', 'real-time', '3D'];
      const row2StartCol = centerCol - Math.floor(row2Words.length / 2);
      row2Words.forEach((word, i) => {
        const col = row2StartCol + i;
        wordMap.set(`${row2},${col}`, word);
        order.push(`${row2},${col}`);
      });

      // Row 3 buttons (anchor cells)
      const row3 = centerRow + 2;
      wordMap.set(`${row3},${centerCol - 3}`, 'START_BTN');
      wordMap.set(`${row3},${centerCol}`, 'GALLERY_BTN');
      order.push(`${row3},${centerCol - 3}`);
      order.push(`${row3},${centerCol}`);

      return { wordMap, order };
    }

    const pickPendingColorIdx = (currentIdx) => {
      if (paletteSwatches.length <= 1) return 0;
      let p;
      do {
        p = Math.floor(Math.random() * paletteSwatches.length);
      } while (p === currentIdx);
      return p;
    };

    const recalculateGrid = () => {
      const size = fitCanvas();
      W = size.W;
      H = size.H;

      COLS_COUNT = Math.ceil(W / UNIT) + 3;
      ROWS_COUNT = Math.ceil(H / UNIT) + 3;
      const totalKeys = COLS_COUNT * ROWS_COUNT;
      const { wordMap, order } = assignWordCells(COLS_COUNT, ROWS_COUNT);
      const previousByCell = new Map(
        keyStates.filter((k) => k.isWordCell).map((k) => [`${k.row},${k.col}`, k])
      );

      keyStates = Array.from({ length: totalKeys }, (_, i) => {
        const row = Math.floor(i / COLS_COUNT);
        const col = i % COLS_COUNT;
        const cellId = `${row},${col}`;
        const mappedWord = wordMap.get(cellId);
        const prev = previousByCell.get(cellId);
        const startIdx = (row + col) % paletteSwatches.length;
        const gridX = col * UNIT - UNIT * 0.5;
        const gridY = row * UNIT - UNIT * 0.5;
        const isButton = mappedWord === 'START_BTN' || mappedWord === 'GALLERY_BTN';
        const orderIdx = order.indexOf(cellId);
        const label =
          mappedWord === 'START_BTN'
            ? 'Start Designing'
            : mappedWord === 'GALLERY_BTN'
              ? 'Browse Gallery'
              : mappedWord || '';
        return {
          row,
          col,
          gridX,
          gridY,
          colorIdx: startIdx,
          pendingColorIdx: pickPendingColorIdx(startIdx),
          keyPhase: 'idle',
          phaseElapsed: 0,
          idleElapsed: Math.random() * MAX_IDLE_MS,
          nextPressDelay: MIN_IDLE_MS + Math.random() * (MAX_IDLE_MS - MIN_IDLE_MS),
          pressAmt: 0,
          falling: true,
          fallDelay: Math.random() * 3000,
          fallStart: null,
          currentY: FALL_START_Y,
          isWordCell: Boolean(mappedWord),
          isButton,
          spanUnits: isButton ? 3 : 1,
          word: label,
          activationOrder: orderIdx,
          activated: prev?.activated || false,
          activationAt: mountTime + RAIN_PHASE_MS + Math.max(orderIdx, 0) * WORD_STAGGER_MS,
          activationPress: prev?.activationPress || 0,
          activationPressT: prev?.activationPressT || 0,
          activationPressPhase: prev?.activationPressPhase || 'idle',
          pressing: prev?.pressing || false,
          pressStart: prev?.pressStart || 0,
          drawnX: prev?.drawnX || 0,
          drawnY: prev?.drawnY || 0,
          drawnW: prev?.drawnW || 0,
          drawnH: prev?.drawnH || 0,
        };
      });
    };

    recalculateGrid();

    const dpr = () => window.devicePixelRatio || 1;

    const ro = new ResizeObserver(() => {
      recalculateGrid();
    });
    ro.observe(container);

    const handleResize = () => {
      recalculateGrid();
    };
    window.addEventListener('resize', handleResize);

    const updateFall = (key, now) => {
      if (!key.falling) return;
      if (key.fallStart === null) {
        if (now >= mountTime + key.fallDelay) {
          key.fallStart = now;
        }
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
      } else if (key.keyPhase === 'releasing') {
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

    const updateWordActivation = (wk, now) => {
      if (wk.activated) return;
      if (now < wk.activationAt) return;
      wk.activated = true;
      wk.activationPressPhase = 'pressing';
      wk.activationPressT = 0;
    };

    const tickWordActivationPress = (wk, dtMs) => {
      if (!wk.activated || wk.activationPressPhase === 'done') return;
      if (wk.activationPressPhase === 'pressing') {
        wk.activationPressT += dtMs;
        const t = Math.min(1, wk.activationPressT / 120);
        wk.activationPress = 4 * t;
        if (wk.activationPressT >= 120) {
          wk.activationPressPhase = 'releasing';
          wk.activationPressT = 0;
        }
      } else if (wk.activationPressPhase === 'releasing') {
        wk.activationPressT += dtMs;
        const t = Math.min(1, wk.activationPressT / 100);
        wk.activationPress = 4 * (1 - t);
        if (wk.activationPressT >= 100) {
          wk.activationPress = 0;
          wk.activationPressPhase = 'done';
        }
      }
    };

    const getBtnPressOffset = (wk, now) => {
      if (!wk.pressing) return 0;
      const t = now - wk.pressStart;
      if (t < 0) return 0;
      if (t < 150) return 4 * (t / 150);
      if (t < 440) return 4 * (1 - (t - 150) / 290);
      return 0;
    };

    function drawWordKey(ctx, key, pressOffset) {
      const sideDepth = 4; // bottom shadow depth
      const x = key.gridX - (key.spanUnits > 1 ? UNIT : 0);
      const y = key.gridY + pressOffset;
      const w = key.spanUnits * SIZE + (key.spanUnits - 1) * GAP;
      const h = SIZE;
      const r = 8; // border radius

      // Side wall / shadow (darker, offset down)
      ctx.fillStyle =
        key.isButton && key.word === 'Start Designing' ? '#7c6bb0' : 'rgba(0,0,0,0.6)';
      roundRectFill(ctx, x, y + sideDepth, w, h, r);

      // Top face
      ctx.fillStyle =
        key.isButton && key.word === 'Start Designing'
          ? '#d0bcff'
          : key.isButton
            ? 'rgba(208,188,255,0.12)'
            : 'rgba(208,188,255,0.25)';
      roundRectFill(ctx, x, y, w, h - sideDepth, r);

      // Subtle highlight on top edge
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRectFill(ctx, x, y, w, 4, r);

      // Text
      ctx.fillStyle = key.isButton && key.word === 'Start Designing' ? '#131315' : '#d0bcff';
      ctx.font = `bold ${key.isButton ? 15 : 18}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(key.word, x + w / 2, y + (h - sideDepth) / 2);
      ctx.shadowBlur = 0;

      key.drawnX = x;
      key.drawnY = key.gridY;
      key.drawnW = w;
      key.drawnH = h;
    }

    const getWordKeys = () =>
      keyStates
        .filter((key) => key.isWordCell)
        .sort((a, b) => a.activationOrder - b.activationOrder);

    const getButtonKeys = () =>
      keyStates.filter((key) => key.isWordCell && key.isButton && key.activated);

    const onClick = (e) => {
      if (phase === PHASES.RAIN) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      getButtonKeys().forEach((btn) => {
        const bx = btn.drawnX;
        const by = btn.drawnY;
        const bw = btn.drawnW;
        const bh = btn.drawnH;
        if (
          clickX >= bx &&
          clickX <= bx + bw &&
          clickY >= by &&
          clickY <= by + bh
        ) {
          btn.pressing = true;
          btn.pressStart = performance.now();
          setTimeout(() => {
            if (btn.word === 'Start Designing') {
              onStartRef.current();
            } else {
              onGalleryRef.current();
            }
          }, 440);
        }
      });
    };

    const onMove = (e) => {
      if (phase === PHASES.RAIN) {
        canvas.style.cursor = 'default';
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const overButton = getButtonKeys().some(
        (btn) =>
          mx >= btn.drawnX &&
          mx <= btn.drawnX + btn.drawnW &&
          my >= btn.drawnY &&
          my <= btn.drawnY + btn.drawnH
      );
      canvas.style.cursor = overButton ? 'pointer' : 'default';
    };

    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousemove', onMove);

    const findWordCoveringCell = (row, col) => {
      for (const wk of keyStates) {
        if (!wk.isWordCell || !wk.activated) continue;
        if (!wk.isButton && wk.row === row && wk.col === col) return wk;
        if (wk.isButton && wk.row === row && col >= wk.col - 1 && col <= wk.col + 1) return wk;
      }
      return null;
    };

    const draw = (now) => {
      const dtMs = Math.min(Math.max(0, now - lastFrameTime), 48);
      lastFrameTime = now;

      const elapsedGlobal = now - phaseStartTime;
      if (phase === PHASES.RAIN && elapsedGlobal > RAIN_PHASE_MS) {
        phase = PHASES.WORDS;
        phaseStartTime = now;
      }

      const wordKeys = getWordKeys();
      if (now >= mountTime + RAIN_PHASE_MS) {
        wordKeys.forEach((wk) => updateWordActivation(wk, now));
        wordKeys.forEach((wk) => tickWordActivationPress(wk, dtMs));
      }

      if (
        phase === PHASES.WORDS &&
        !allWordsActivated &&
        wordKeys.every((w) => w.activated && w.activationPressPhase === 'done')
      ) {
        allWordsActivated = true;
        phase = PHASES.IDLE;
        phaseStartTime = now;
      }

      if (phase === PHASES.IDLE) {
        keyStates.forEach((key) => {
          if (key.isWordCell) return;
          updateKeyIdlePress(key, dtMs);
        });
      }

      getButtonKeys().forEach((wk) => {
        if (wk.isButton && wk.pressing && now - wk.pressStart > 450) {
          wk.pressing = false;
        }
      });

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);

      let i = 0;
      for (let row = 0; row < ROWS_COUNT; row++) {
        for (let col = 0; col < COLS_COUNT; col++) {
          const key = keyStates[i++];
          if (!key) continue;

          const wkCover = findWordCoveringCell(row, col);
          if (wkCover) continue;

          updateFall(key, now);

          const drawY = key.falling ? (key.fallStart === null ? FALL_START_Y : key.currentY) : key.gridY;
          const x = key.gridX;
          const colSwatch = paletteSwatches[key.colorIdx];

          ctx.globalAlpha = 0.85;
          drawKeycap(ctx, x, drawY, SIZE, { bg: colSwatch.bg, shadow: colSwatch.shadow }, key.pressAmt || 0);
          ctx.globalAlpha = 1;
        }
      }

      getWordKeys().forEach((wk) => {
        if (!wk.activated) return;
        const pressOffset = (wk.isButton ? getBtnPressOffset(wk, now) : 0) + (wk.activationPress || 0);
        drawWordKey(ctx, wk, pressOffset);
      });

      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="keycap-grid-container keycap-hero-canvas-wrap">
      <canvas
        ref={canvasRef}
        className="keycap-hero-canvas"
        role="img"
        aria-label="Design your dream keyboard in real-time 3D — interactive keycap grid with Start Designing and Browse Gallery actions."
      />
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
        .hero-fade {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background: linear-gradient(to bottom, rgba(13,13,16,0.45) 0%, rgba(13,13,16,0.65) 60%, rgba(13,13,16,0.88) 100%);
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
        .process-step { position: relative; isolation: isolate; }
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
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => document.dispatchEvent(new CustomEvent('showSignIn'))}>Sign In</button>
          <button className="btn-filled" onClick={handleStart}>Build Now</button>
        </div>
      </nav>

      {/* Hero — full canvas (rain → words → idle); no HTML overlay */}
      <div className="hero-section">
        <KeycapGrid onStartDesigning={handleStart} onBrowseGallery={() => setScreen('gallery')} />
        <div className="hero-fade" />
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
          <div style={{ marginBottom: '48px' }}>
            <div>
              <h2 className="headline" style={{ fontSize: '36px', marginBottom: '16px' }}>Precision Engineering Pipeline</h2>
              <p className="bento-text">From initial concept to final assembly, our studio provides the tools needed for professional-grade keyboard design.</p>
            </div>
          </div>
          
          <div className="process-grid">
            {[
              {
                number: 1,
                title: 'Select Keyboard',
                desc: 'Choose your layout, mounting style, and material profile from our curated library.',
                color: 'var(--primary)'
              },
              {
                number: 2,
                title: 'Design Keycaps',
                desc: 'Apply custom legends, colors, and profiles. Use our procedural tool for gradient sets.',
                color: 'var(--secondary)'
              },
              {
                number: 3,
                title: 'Export',
                desc: 'Receive an automated BOM and technical drawings. One-click order with our partners.',
                color: 'var(--primary)'
              }
            ].map((step) => (
              <div key={step.number} className="process-step">
                <div className="step-number">{step.number}</div>
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
            { title: 'NEON_DRIFT 65', by: 'ALEX_STUDIO', tags: ['PBT', 'GASKET'], c: '#d0bcff', formFactor: '65%', silhouetteScale: 0.62 },
            { title: 'RAW_ALUM TKL', by: 'KBD_LAB', tags: ['ALU', 'WKL'], c: '#44e2cd', formFactor: 'TKL', silhouetteScale: 0.52 },
            { title: 'VINTAGE_90', by: 'NOSTALGIA_HUB', tags: ['ABS', 'TRAY'], c: '#ffb869', formFactor: '100%', silhouetteScale: 0.38 },
          ].map((card, i) => (
            <div key={i} className="gallery-card" onClick={() => setScreen('gallery')}>
              <div
                className="gc-image"
                style={{
                  width: '100%',
                  height: '200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${card.c}22`,
                  overflow: 'hidden',
                  padding: '0 12px',
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
                  }}
                >
                  <KeyboardSilhouette formFactor={card.formFactor} large={false} showLabel={false} />
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
            <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setScreen('about'); }}>About</a>
            <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setScreen('support'); }}>Support</a>
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
            <div className="footer-heading" style={{ textAlign: 'right' }}>Product</div>
            <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setScreen('gallery'); }}>Gallery</a>
            <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); setScreen('studio'); }}>Studio</a>
            <a href="https://github.com/MohamedZameel/keycap-studio/releases" target="_blank" rel="noopener noreferrer" className="footer-link">Changelog</a>
            <div className="footer-link">© 2024 Keycap Studio.<br/>Precision Milled.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
