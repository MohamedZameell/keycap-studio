// Draw-on-keyboard design bar. A fabric.js 2D canvas sized to the board's
// footprint with a faint key-grid guide underneath; its output is pushed live
// into the existing wrap-image texture pipeline (store.keyboardImageUrl +
// keyboardImageMode 'wrap'), so whatever you draw projects onto the 3D board.
//
// fabric is heavy, so this whole modal is lazy-loaded (React.lazy in
// StudioScreen) — it only enters the bundle when the user opens the bar.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { useStore } from '../store';
import { getLayoutForFormFactor, formFactorToLayoutKey } from '../data/layouts';
import { T as KT, Icon as KIcon } from './ui/kit';

// Board footprint (in key units) from a layout's key array.
function footprint(layout) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const k of layout) {
    const x = Number(k.x) || 0, y = Number(k.y) || 0;
    const w = Number(k.w) || 1, h = Number(k.h) || 1;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
  }
  return { minX, minY, maxW: maxX - minX, maxH: maxY - minY };
}

const TOOLS = [
  { key: 'select', icon: 'target', title: 'Select / move' },
  { key: 'draw',   icon: 'vector', title: 'Freehand pen' },
  { key: 'rect',   icon: 'box',    title: 'Rectangle' },
  { key: 'circle', icon: 'droplet',title: 'Circle' },
  { key: 'text',   icon: 'type',   title: 'Text' },
];

const SWATCHES = ['#ffffff', '#111318', '#ff3b3b', '#ff9f1c', '#ffd23f', '#3ddc84', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function DrawBoardModal({ onClose }) {
  const canvasElRef = useRef(null);
  const guideElRef = useRef(null);
  const fcRef = useRef(null);
  const syncTimer = useRef(null);
  const [tool, setTool] = useState('draw');
  const [color, setColor] = useState('#ff3b3b');
  const [brush, setBrush] = useState(6);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  toolRef.current = tool; colorRef.current = color;

  const formFactor = useStore(s => s.selectedFormFactor);
  const setKeyboardImageUrl = useStore(s => s.setKeyboardImageUrl);
  const setKeyboardImageMode = useStore(s => s.setKeyboardImageMode);

  const layout = getLayoutForFormFactor(formFactorToLayoutKey(formFactor || '60%'));
  const fp = footprint(layout);
  const CW = 1000;
  const CH = Math.round(CW * fp.maxH / fp.maxW);

  // Push the current drawing into the wrap-image pipeline (debounced).
  const syncToBoard = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const fc = fcRef.current;
      if (!fc) return;
      // Empty canvas -> clear the wrap image instead of pushing a blank one.
      if (fc.getObjects().length === 0) { setKeyboardImageUrl(null); return; }
      const url = fc.toDataURL({ format: 'png', multiplier: 2048 / CW, enableRetinaScaling: false });
      setKeyboardImageUrl(url);
      setKeyboardImageMode('wrap');
    }, 220);
  }, [CW, setKeyboardImageUrl, setKeyboardImageMode]);

  // Init fabric + guide once.
  useEffect(() => {
    // Draw the key-grid guide on the underlay canvas.
    const g = guideElRef.current;
    if (g) {
      g.width = CW; g.height = CH;
      const ctx = g.getContext('2d');
      ctx.clearRect(0, 0, CW, CH);
      ctx.fillStyle = '#0e0f14'; ctx.fillRect(0, 0, CW, CH);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1;
      const pad = 2;
      for (const k of layout) {
        const x = ((Number(k.x) || 0) - fp.minX) / fp.maxW * CW;
        const y = ((Number(k.y) || 0) - fp.minY) / fp.maxH * CH;
        const w = (Number(k.w) || 1) / fp.maxW * CW;
        const h = (Number(k.h) || 1) / fp.maxH * CH;
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.beginPath();
        ctx.roundRect(x + pad, y + pad, w - pad * 2, h - pad * 2, 5);
        ctx.fill(); ctx.stroke();
      }
    }

    const fc = new fabric.Canvas(canvasElRef.current, {
      width: CW, height: CH, backgroundColor: 'transparent',
      preserveObjectStacking: true, selection: true,
    });
    fcRef.current = fc;
    fc.freeDrawingBrush = new fabric.PencilBrush(fc);
    fc.freeDrawingBrush.color = colorRef.current;
    fc.freeDrawingBrush.width = brush;

    const onChange = () => syncToBoard();
    fc.on('object:added', onChange);
    fc.on('object:modified', onChange);
    fc.on('object:removed', onChange);
    fc.on('path:created', onChange);

    // Click-to-place for shape/text tools.
    fc.on('mouse:down', (opt) => {
      const t = toolRef.current;
      if (t === 'select' || t === 'draw' || opt.target) return;
      const p = fc.getScenePoint(opt.e);
      let obj = null;
      if (t === 'rect') obj = new fabric.Rect({ left: p.x - 60, top: p.y - 40, width: 120, height: 80, fill: colorRef.current, rx: 6, ry: 6 });
      else if (t === 'circle') obj = new fabric.Circle({ left: p.x - 45, top: p.y - 45, radius: 45, fill: colorRef.current });
      else if (t === 'text') obj = new fabric.IText('Text', { left: p.x, top: p.y, fill: colorRef.current, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 60 });
      if (obj) { fc.add(obj); fc.setActiveObject(obj); fc.requestRenderAll(); }
    });

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      fc.dispose();
      fcRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to tool / color / brush changes.
  useEffect(() => {
    const fc = fcRef.current;
    if (!fc) return;
    fc.isDrawingMode = tool === 'draw';
    if (fc.freeDrawingBrush) { fc.freeDrawingBrush.color = color; fc.freeDrawingBrush.width = brush; }
  }, [tool, color, brush]);

  const addImage = (file) => {
    if (!file || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const img = await fabric.FabricImage.fromURL(reader.result);
      const fc = fcRef.current;
      const maxDim = Math.min(CW, CH) * 0.6;
      const s = Math.min(maxDim / img.width, maxDim / img.height, 1);
      img.set({ left: CW / 2, top: CH / 2, originX: 'center', originY: 'center', scaleX: s, scaleY: s });
      fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
    };
    reader.readAsDataURL(file);
  };

  const deleteSel = () => {
    const fc = fcRef.current;
    fc.getActiveObjects().forEach(o => fc.remove(o));
    fc.discardActiveObject(); fc.requestRenderAll();
  };
  const clearAll = () => {
    const fc = fcRef.current;
    fc.remove(...fc.getObjects()); fc.requestRenderAll();
    setKeyboardImageUrl(null);
  };

  // Keyboard delete/backspace removes selection.
  useEffect(() => {
    const h = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement?.tagName !== 'INPUT') {
        const fc = fcRef.current;
        if (fc && fc.getActiveObject() && !fc.getActiveObject().isEditing) { deleteSel(); e.preventDefault(); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const btn = (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: 38, height: 38, borderRadius: 8, cursor: 'pointer',
    background: active ? KT.accentDim : KT.card,
    border: `1px solid ${active ? KT.accentLine : KT.line}`,
    color: active ? KT.accent : KT.sub,
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(6,7,12,0.86)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <div style={{ background: '#0b0c12', border: `1px solid ${KT.line}`, borderRadius: 16, padding: 18, maxWidth: '95vw', maxHeight: '95vh', display: 'flex', flexDirection: 'column', gap: 12 }}
        onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: KT.font, fontSize: 15, fontWeight: 700, color: KT.ink, flex: 1 }}>Draw on your keyboard</span>
          <span style={{ fontSize: 11, color: KT.mut }}>Projects live onto the 3D board</span>
          <button onClick={onClose} style={{ ...btn(false), width: 'auto', padding: '0 14px', fontFamily: KT.font, fontSize: 13, fontWeight: 600 }}>Done</button>
        </div>

        {/* toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {TOOLS.map(t => (
            <button key={t.key} title={t.title} style={btn(tool === t.key)} onClick={() => setTool(t.key)}>
              <KIcon name={t.icon} size={16} />
            </button>
          ))}
          <label title="Add image" style={{ ...btn(false), cursor: 'pointer' }}>
            <KIcon name="image" size={16} />
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; addImage(f); }} />
          </label>
          <div style={{ width: 1, height: 28, background: KT.line, margin: '0 4px' }} />
          {SWATCHES.map(c => (
            <button key={c} title={c} onClick={() => setColor(c)}
              style={{ width: 24, height: 24, borderRadius: 6, background: c, cursor: 'pointer', border: color === c ? `2px solid ${KT.accent}` : `1px solid ${KT.line}` }} />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Custom color"
            style={{ width: 28, height: 28, padding: 0, border: `1px solid ${KT.line}`, borderRadius: 6, background: 'transparent', cursor: 'pointer' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <span style={{ fontSize: 10, color: KT.mut }}>Pen</span>
            <input type="range" min="1" max="40" value={brush} onChange={(e) => setBrush(parseInt(e.target.value))} style={{ width: 70, accentColor: '#6c63ff' }} />
          </div>
          <div style={{ width: 1, height: 28, background: KT.line, margin: '0 4px' }} />
          <button title="Delete selected" style={btn(false)} onClick={deleteSel}><KIcon name="x" size={15} /></button>
          <button title="Clear all" style={{ ...btn(false), width: 'auto', padding: '0 12px', fontFamily: KT.font, fontSize: 12 }} onClick={clearAll}>Clear</button>
        </div>

        {/* canvas stack: guide underlay + fabric on top */}
        <div style={{ position: 'relative', width: 'min(90vw, 1000px)', lineHeight: 0 }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: `${CW} / ${CH}` }}>
            <canvas ref={guideElRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 10 }} />
            <canvas ref={canvasElRef} style={{ position: 'absolute', inset: 0 }} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: KT.mut }}>
          Pick a tool, then draw or click on the board. The faint keys are a guide for where your art lands.
        </div>
      </div>
    </div>
  );
}
