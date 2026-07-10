// ============================================================
// PRINT EXPORT (P4) — vendor-agnostic print-ready design files.
//
// Renders every UNIQUE cap's flat artwork (cap color + legend +
// sub-legend + top-face sticker stamps) at true millimeter size and a
// chosen DPI, then packages it three ways:
//   exportPrintPDF  — paginated print sheet at exact 1:1 mm scale with
//                     labels, per-art counts and a 100 mm calibration
//                     ruler (what you hand a dye-sub / UV print shop)
//   exportPNGPack   — ZIP of per-cap PNGs (full-top art + aperture
//                     crop with bleed) + manifest.json for automation
//   exportSVGSheet  — vector sheet in real mm units: aperture outlines
//                     with the raster art embedded (plotters / QC)
//
// Aperture = the flat top plate (PROFILE_SPECS topWidth × topDepth,
// fillet ring excluded via getTopInset) — the same printable-surface
// rule hajimen/keycap_designer encodes in its 720 dpi masks.
// The art canvas spans the fillet's outer bounding box (identical to
// the live 3D texture), so WYSIWYG holds between screen and print.
// ============================================================
import { PROFILE_SPECS, normalizeProfile, buildKeycapTextureFallback, getTopInset, capTopMm } from '../components/Keycap';
import { getKeyColors } from '../data/colorways';

const MM_PER_U = 19.05;

// ---- state → per-key resolved art description --------------------------
// Mirrors Keycap.jsx's precedence: perKey > draft > colorway > globals.
export function collectKeyArts(state, layout) {
  const {
    perKeyDesigns, colorwayDraft, selectedColorway, keyStamps,
    globalColor, globalLegendColor, globalLegendText, globalFont,
    globalLegendPosition, legendSubStyle, selectedProfile,
  } = state;
  const profile = normalizeProfile(selectedProfile);
  const arts = []; // one entry per unique art; { desc, keys: [labels], count }
  const byHash = new Map();

  for (const key of layout) {
    const pk = perKeyDesigns[key.id] || {};
    const cw = colorwayDraft || selectedColorway;
    const cwColors = cw ? getKeyColors(cw, key.label) : null;
    const stamps = (keyStamps[key.id] || []).filter(s => s.visible !== false && s.target === 'top');
    const desc = {
      w: Math.max(0.5, Math.min(8, Number(key.w) || 1)),
      h: Math.max(0.5, Math.min(3, Number(key.h) || 1)),
      color: pk.color || cwColors?.background || globalColor,
      legendColor: pk.legendColor || cwColors?.legend || globalLegendColor,
      legend: (pk.legendText || globalLegendText || key.label || '').trim(),
      font: pk.font || globalFont,
      legendPosition: pk.legendPosition || globalLegendPosition || 'top-center',
      subStyle: legendSubStyle || null,
      profile,
      stamps,
    };
    // Stamped keys are always unique (stamp pos is key-specific)
    const hash = stamps.length
      ? `stamped-${key.id}`
      : [desc.w, desc.h, desc.color, desc.legendColor, desc.legend, desc.font, desc.legendPosition, desc.subStyle].join('|');
    if (byHash.has(hash)) {
      const a = byHash.get(hash);
      a.count += 1;
      a.keys.push(key.label || key.id);
    } else {
      const a = { desc, count: 1, keys: [key.label || key.id], id: key.id };
      byHash.set(hash, a);
      arts.push(a);
    }
  }
  return { arts, profile };
}

// ---- one cap's flat art at real DPI ------------------------------------
// Returns { canvas, plateCanvas, mm: { plateW, plateH, fullW, fullH, bleed } }
async function renderKeyArt(desc, dpi, bleedMm = 1) {
  const spec = PROFILE_SPECS[desc.profile] || PROFILE_SPECS.cherry;
  const pxPerMm = dpi / 25.4;
  // Constant-taper tops (KeyV2 rule): a 2u top ≈ 31mm, NOT 2×13.2
  const { tw: plateWmm, td: plateHmm } = capTopMm(spec, desc.w, desc.h);
  const inset = getTopInset(desc.profile, desc.w, desc.h);
  // Full canvas spans the fillet outer box: plate is (1-2ix) of it
  const fullWmm = plateWmm / Math.max(0.01, 1 - 2 * inset.ix);
  const fullHmm = plateHmm / Math.max(0.01, 1 - 2 * inset.iy);
  // buildKeycapTextureFallback sizes the canvas as baseSize×keyWidth —
  // pick baseSize so 1u of canvas = fullWmm/desc.w mm at the target dpi
  const baseSize = Math.round((fullWmm / desc.w) * pxPerMm);

  const tex = buildKeycapTextureFallback(
    desc.color, desc.legend, desc.legendColor, desc.font, desc.legendPosition,
    desc.w, desc.h, inset, false /* unshaded — printers want flat art */,
    desc.profile, desc.subStyle, baseSize
  );
  const canvas = tex.image;

  // Composite top-target stamps (decal → flat mapping: local x/z spans
  // the fillet outer box, i.e. exactly this canvas)
  if (desc.stamps.length) {
    const ctx = canvas.getContext('2d');
    const mxUnits = (fullWmm / MM_PER_U) / 2; // canvas half-span in scene units
    const mzUnits = (fullHmm / MM_PER_U) / 2;
    for (const s of desc.stamps) {
      const img = await loadImage(s.imageUrl);
      const u = (s.pos[0] + mxUnits) / (2 * mxUnits);
      const v = (s.pos[2] + mzUnits) / (2 * mzUnits);
      const wPx = (s.scale * (s.aspect || 1)) / (2 * mxUnits) * canvas.width;
      const hPx = (s.scale) / (2 * mzUnits) * canvas.height;
      ctx.save();
      ctx.globalAlpha = s.opacity ?? 1;
      ctx.translate(u * canvas.width, v * canvas.height);
      ctx.rotate(-(s.rotation || 0));
      ctx.drawImage(img, -wPx / 2, -hPx / 2, wPx, hPx);
      ctx.restore();
    }
  }

  // Aperture crop: plate area + bleed on every side
  const bleedPx = bleedMm * pxPerMm;
  const px0 = inset.ix * canvas.width - bleedPx;
  const py0 = inset.iy * canvas.height - bleedPx;
  const pw = canvas.width * (1 - 2 * inset.ix) + 2 * bleedPx;
  const ph = canvas.height * (1 - 2 * inset.iy) + 2 * bleedPx;
  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = Math.round(pw);
  plateCanvas.height = Math.round(ph);
  const pctx = plateCanvas.getContext('2d');
  pctx.fillStyle = desc.color; // bleed extends the cap color
  pctx.fillRect(0, 0, plateCanvas.width, plateCanvas.height);
  pctx.drawImage(canvas, px0, py0, pw, ph, 0, 0, plateCanvas.width, plateCanvas.height);

  return {
    canvas, plateCanvas,
    mm: { plateW: plateWmm, plateH: plateHmm, fullW: fullWmm, fullH: fullHmm, bleed: bleedMm },
  };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasToPngBytes(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error('toBlob failed'));
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/png', 1.0);
  });
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

const MM2PT = 72 / 25.4;
const safeName = (s) => (s || 'keycap-set').replace(/[^a-z0-9-_]/gi, '_').toLowerCase();

// ---- 1) PDF print sheet (true 1:1 mm scale) -----------------------------
export async function exportPrintPDF({ state, layout, dpi = 600, setName = 'keycap-set' }) {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const { arts, profile } = collectKeyArts(state, layout);
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);

  // A4 portrait, 12 mm margin
  const PW = 210 * MM2PT, PH = 297 * MM2PT, M = 12 * MM2PT;
  const cell = { padX: 4 * MM2PT, padY: 7 * MM2PT }; // room for the label under each art
  let page = null, x = M, y = 0, rowH = 0, pageNum = 0;

  const newPage = () => {
    page = pdf.addPage([PW, PH]);
    pageNum += 1;
    page.drawText(`${setName} — print sheet (1:1 scale)`, { x: M, y: PH - M, size: 11, font: helvB, color: rgb(0.1, 0.1, 0.15) });
    page.drawText(`profile ${profile} · ${dpi} dpi art · ${arts.length} unique caps · bleed 1 mm · page ${pageNum}`, { x: M, y: PH - M - 13, size: 8, font: helv, color: rgb(0.35, 0.35, 0.4) });
    // 100 mm calibration ruler — if this measures 100 mm, scale is true
    const ry = PH - M - 24;
    page.drawLine({ start: { x: M, y: ry }, end: { x: M + 100 * MM2PT, y: ry }, thickness: 0.8, color: rgb(0.1, 0.1, 0.15) });
    for (let t = 0; t <= 100; t += 10) {
      page.drawLine({ start: { x: M + t * MM2PT, y: ry }, end: { x: M + t * MM2PT, y: ry + 3 }, thickness: 0.6, color: rgb(0.1, 0.1, 0.15) });
    }
    page.drawText('calibration: this ruler must measure exactly 100 mm', { x: M + 102 * MM2PT, y: ry - 2, size: 6.5, font: helv, color: rgb(0.35, 0.35, 0.4) });
    x = M; y = ry - 10 * MM2PT; rowH = 0;
  };
  newPage();

  for (const art of arts) {
    const { plateCanvas, mm } = await renderKeyArt(art.desc, dpi);
    const wPt = (mm.plateW + 2 * mm.bleed) * MM2PT;
    const hPt = (mm.plateH + 2 * mm.bleed) * MM2PT;
    if (x + wPt > PW - M) { x = M; y -= rowH; rowH = 0; }
    if (y - hPt - cell.padY < M) { newPage(); }
    const png = await pdf.embedPng(await canvasToPngBytes(plateCanvas));
    page.drawImage(png, { x, y: y - hPt, width: wPt, height: hPt });
    // hairline aperture outline (the plate INSIDE the bleed)
    page.drawRectangle({
      x: x + mm.bleed * MM2PT, y: y - hPt + mm.bleed * MM2PT,
      width: mm.plateW * MM2PT, height: mm.plateH * MM2PT,
      borderColor: rgb(0.6, 0.6, 0.65), borderWidth: 0.4, opacity: 0, borderOpacity: 1,
    });
    const label = `${art.keys[0]}${art.count > 1 ? `  ×${art.count}` : ''}  ·  ${mm.plateW.toFixed(1)}×${mm.plateH.toFixed(1)}mm`;
    page.drawText(label.slice(0, 40), { x, y: y - hPt - 8, size: 5.5, font: helv, color: rgb(0.25, 0.25, 0.3) });
    x += wPt + cell.padX;
    rowH = Math.max(rowH, hPt + cell.padY);
  }

  const bytes = await pdf.save();
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${safeName(setName)}-print-sheet.pdf`);
  return { uniqueCaps: arts.length };
}

// ---- 2) PNG pack (ZIP + manifest) ---------------------------------------
export async function exportPNGPack({ state, layout, dpi = 600, setName = 'keycap-set' }) {
  const { default: JSZip } = await import('jszip');
  const { arts, profile } = collectKeyArts(state, layout);
  const zip = new JSZip();
  const manifest = { set: setName, profile, dpi, bleedMm: 1, generator: 'keycap-studio', caps: [] };

  let i = 0;
  for (const art of arts) {
    i += 1;
    const { canvas, plateCanvas, mm } = await renderKeyArt(art.desc, dpi);
    const base = `${String(i).padStart(2, '0')}_${safeName(art.keys[0] || 'blank')}_${art.desc.w}u`;
    zip.file(`aperture/${base}.png`, await canvasToPngBytes(plateCanvas));
    zip.file(`full-top/${base}.png`, await canvasToPngBytes(canvas));
    manifest.caps.push({
      file: `${base}.png`, legend: art.keys[0], count: art.count, appliesTo: art.keys,
      sizeU: [art.desc.w, art.desc.h], color: art.desc.color, legendColor: art.desc.legendColor,
      apertureMm: [+mm.plateW.toFixed(2), +mm.plateH.toFixed(2)],
      fullTopMm: [+mm.fullW.toFixed(2), +mm.fullH.toFixed(2)],
      stamps: art.desc.stamps.length,
      // Front-legend sets: the top art is intentionally blank — front-face
      // print art isn't generated yet (front aperture needs its own masks).
      ...(art.desc.legendPosition === 'front' ? { frontLegend: true, note: 'top art blank — front-face art not generated yet' } : {}),
    });
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('README.txt', [
    `${setName} — print-ready keycap art (generated by Keycap Studio)`,
    ``,
    `aperture/  cap-top printable area (flat plate, fillet excluded) + 1 mm bleed`,
    `full-top/  full top face incl. the rounded edge ring (for reference/proofs)`,
    `manifest.json  real-mm dimensions, colors and per-cap counts at ${dpi} dpi`,
    ``,
    `Print at ${dpi} dpi without scaling: image px / ${dpi} × 25.4 = mm.`,
  ].join('\n'));

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `${safeName(setName)}-png-pack-${dpi}dpi.zip`);
  return { uniqueCaps: arts.length };
}

// ---- 3) SVG template sheet (real mm units) ------------------------------
export async function exportSVGSheet({ state, layout, dpi = 300, setName = 'keycap-set' }) {
  const { arts, profile } = collectKeyArts(state, layout);
  const M = 12, GAP = 4, LABEL = 5; // mm
  const SHEET_W = 210;
  let x = M, y = M + 14, rowH = 0;
  const items = [];
  for (const art of arts) {
    const { plateCanvas, mm } = await renderKeyArt(art.desc, dpi);
    const w = mm.plateW + 2 * mm.bleed, h = mm.plateH + 2 * mm.bleed;
    if (x + w > SHEET_W - M) { x = M; y += rowH; rowH = 0; }
    items.push({ art, x, y, w, h, mm, data: plateCanvas.toDataURL('image/png') });
    x += w + GAP;
    rowH = Math.max(rowH, h + LABEL + 2);
  }
  const H = y + rowH + M;
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}mm" height="${H.toFixed(1)}mm" viewBox="0 0 ${SHEET_W} ${H.toFixed(1)}">`,
    `<text x="${M}" y="${M + 4}" font-family="Helvetica,Arial" font-size="4" font-weight="bold" fill="#1a1a26">${esc(setName)} — SVG template (units = mm)</text>`,
    `<text x="${M}" y="${M + 9}" font-family="Helvetica,Arial" font-size="2.6" fill="#585864">profile ${esc(profile)} · ${arts.length} unique caps · art ${dpi} dpi · aperture outlines at true size · bleed 1 mm</text>`,
    ...items.map(({ art, x, y, w, h, mm, data }) => [
      `<image x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" href="${data}"/>`,
      `<rect x="${(x + mm.bleed).toFixed(2)}" y="${(y + mm.bleed).toFixed(2)}" width="${mm.plateW.toFixed(2)}" height="${mm.plateH.toFixed(2)}" fill="none" stroke="#8888aa" stroke-width="0.12"/>`,
      `<text x="${x.toFixed(2)}" y="${(y + h + 3).toFixed(2)}" font-family="Helvetica,Arial" font-size="2.2" fill="#3c3c48">${esc(art.keys[0] || '')}${art.count > 1 ? ` x${art.count}` : ''} · ${mm.plateW.toFixed(1)}x${mm.plateH.toFixed(1)}mm</text>`,
    ].join('')),
    `</svg>`,
  ].join('\n');
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${safeName(setName)}-template.svg`);
  return { uniqueCaps: arts.length };
}
