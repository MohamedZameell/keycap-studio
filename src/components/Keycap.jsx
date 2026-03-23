import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { playKeycapSound } from '../utils/soundEngine';

// ============================================================
// Darken a hex color by a luminance factor
// ============================================================
function darkenColor(hex, factor) {
  const c = hex || '#888888';
  const r = parseInt(c.slice(1, 3), 16);
  const g = parseInt(c.slice(3, 5), 16);
  const b = parseInt(c.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

// ============================================================
// KEYCAP PROFILE SPECIFICATIONS
// ============================================================
const PROFILE_SPECS = {
  cherry: {
    maxHeight: 9.4,
    dishType: 'cylindrical',
    dishDepth: 0.6,
    topWidth: 14.0,
    topDepth: 13.0,
    baseWidth: 17.5,
    baseDepth: 17.5,
    chamfer: 0.7,
    uniform: false,
    rowHeights: [1.000, 1.000, 0.904, 0.787, 0.904, 0.904],
    rowTilts: [0.122, 0.122, 0.087, 0, -0.105, -0.105],
  },
  oem: {
    maxHeight: 11.9,
    dishType: 'cylindrical',
    dishDepth: 0.8,
    topWidth: 13.5,
    topDepth: 12.5,
    baseWidth: 18.0,
    baseDepth: 18.0,
    chamfer: 0.6,
    uniform: false,
    rowHeights: [1.000, 1.000, 0.924, 0.807, 0.924, 0.924],
    rowTilts: [0.140, 0.140, 0.100, 0, -0.120, -0.120],
  },
  sa: {
    maxHeight: 16.5,
    dishType: 'spherical',
    dishDepth: 2.5,
    topWidth: 12.5,
    topDepth: 12.5,
    baseWidth: 18.4,
    baseDepth: 18.4,
    chamfer: 0.5,
    uniform: false,
    rowHeights: [1.000, 1.000, 0.971, 0.941, 0.941, 0.941],
    rowTilts: [0.150, 0.150, 0.100, 0, -0.100, -0.100],
  },
  dsa: {
    maxHeight: 7.6,
    dishType: 'spherical',
    dishDepth: 1.0,
    topWidth: 13.0,
    topDepth: 13.0,
    baseWidth: 18.0,
    baseDepth: 18.0,
    chamfer: 0.8,
    uniform: true,
    rowHeights: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000],
    rowTilts: [0, 0, 0, 0, 0, 0],
  },
  xda: {
    maxHeight: 9.1,
    dishType: 'spherical',
    dishDepth: 0.5,
    topWidth: 13.5,
    topDepth: 13.5,
    baseWidth: 18.0,
    baseDepth: 18.0,
    chamfer: 0.8,
    uniform: true,
    rowHeights: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000],
    rowTilts: [0, 0, 0, 0, 0, 0],
  },
  kat: {
    maxHeight: 13.5,
    dishType: 'spherical',
    dishDepth: 1.8,
    topWidth: 13.0,
    topDepth: 12.5,
    baseWidth: 18.2,
    baseDepth: 18.2,
    chamfer: 0.6,
    uniform: false,
    rowHeights: [1.000, 1.000, 0.926, 0.852, 0.926, 0.926],
    rowTilts: [0.140, 0.140, 0.090, 0, -0.110, -0.110],
  },
  mt3: {
    maxHeight: 16.0,
    dishType: 'spherical',
    dishDepth: 3.0,
    topWidth: 12.0,
    topDepth: 12.0,
    baseWidth: 18.4,
    baseDepth: 18.4,
    chamfer: 0.5,
    uniform: false,
    rowHeights: [1.000, 1.000, 0.969, 0.906, 0.938, 0.938],
    rowTilts: [0.160, 0.160, 0.110, 0, -0.120, -0.120],
  },
  asa: {
    maxHeight: 13.5,
    dishType: 'spherical',
    dishDepth: 1.5,
    topWidth: 13.2,
    topDepth: 12.8,
    baseWidth: 18.2,
    baseDepth: 18.2,
    chamfer: 0.6,
    uniform: false,
    rowHeights: [1.000, 1.000, 0.926, 0.852, 0.926, 0.926],
    rowTilts: [0.140, 0.140, 0.095, 0, -0.110, -0.110],
  },
  osa: {
    maxHeight: 12.0,
    dishType: 'spherical',
    dishDepth: 1.2,
    topWidth: 13.5,
    topDepth: 13.0,
    baseWidth: 18.2,
    baseDepth: 18.2,
    chamfer: 0.6,
    uniform: false,
    rowHeights: [1.000, 1.000, 0.920, 0.840, 0.920, 0.920],
    rowTilts: [0.130, 0.130, 0.090, 0, -0.110, -0.110],
  },
  ksa: {
    maxHeight: 15.0,
    dishType: 'spherical',
    dishDepth: 2.2,
    topWidth: 12.5,
    topDepth: 12.5,
    baseWidth: 18.4,
    baseDepth: 18.4,
    chamfer: 0.5,
    uniform: false,
    rowHeights: [1.000, 1.000, 0.960, 0.920, 0.940, 0.940],
    rowTilts: [0.150, 0.150, 0.100, 0, -0.110, -0.110],
  },
  'low profile': {
    maxHeight: 6.0,
    dishType: 'cylindrical',
    dishDepth: 0.3,
    topWidth: 14.5,
    topDepth: 14.0,
    baseWidth: 17.0,
    baseDepth: 17.0,
    chamfer: 0.4,
    uniform: true,
    rowHeights: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000],
    rowTilts: [0, 0, 0, 0, 0, 0],
  },
};

const normalizeProfile = (p) => (p || 'cherry').toLowerCase();
export { PROFILE_SPECS, normalizeProfile };

// ============================================================
// Keycap body geometry (sides + bottom)
// For wrap mode: sides use GLOBAL image UVs with drape extension
// uvData = { uMin, uMax, vMin, vMax, drape } - keycap's region in IMAGE space
// ============================================================
function createBodyGeometry(widthU = 1, heightU = 1, profile = 'cherry', uvData = null) {
  const normalizedProfile = normalizeProfile(profile);
  const spec = PROFILE_SPECS[normalizedProfile] || PROFILE_SPECS.cherry;
  const scale = 1 / 19.05;
  const W = spec.baseWidth * widthU * scale;
  const D = spec.baseDepth * heightU * scale;
  const tw = spec.topWidth * widthU * scale;
  const td = spec.topDepth * heightU * scale;
  const H = spec.maxHeight * scale;

  const positions = [];
  const uvs = [];
  const indices = [];

  function pushVert(x, y, z, u, v) {
    positions.push(x, y, z);
    uvs.push(u, v);
    return (positions.length / 3) - 1;
  }

  // --- BOTTOM FACE (not visible) ---
  const b0 = pushVert(-W / 2, 0, -D / 2, 0.5, 0.5);
  const b1 = pushVert(W / 2, 0, -D / 2, 0.5, 0.5);
  const b2 = pushVert(W / 2, 0, D / 2, 0.5, 0.5);
  const b3 = pushVert(-W / 2, 0, D / 2, 0.5, 0.5);
  indices.push(b0, b2, b1, b0, b3, b2);

  // --- SIDE WALLS ---
  const baseCorners = [
    [-W / 2, 0, -D / 2],   // 0: front-left (-Z, away from user)
    [W / 2, 0, -D / 2],    // 1: front-right
    [W / 2, 0, D / 2],     // 2: back-right (+Z, facing user)
    [-W / 2, 0, D / 2],    // 3: back-left
  ];
  const topCorners = [
    [-tw / 2, H, -td / 2], // 0: front-left
    [tw / 2, H, -td / 2],  // 1: front-right
    [tw / 2, H, td / 2],   // 2: back-right
    [-tw / 2, H, td / 2],  // 3: back-left
  ];

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const bl = baseCorners[i];
    const br = baseCorners[j];
    const tr = topCorners[j];
    const tl = topCorners[i];

    let uBL, vBL, uBR, vBR, uTR, vTR, uTL, vTL;

    if (uvData) {
      // GLOBAL image UV mapping for cloth-drape effect
      // uvData contains the keycap's position in IMAGE space (0-1)
      const { uMin, uMax, vMin, vMax, drape } = uvData;

      if (i === 0) {
        // Front wall (-Z, faces AWAY from user)
        // Top edge at vMax (front of keycap = bottom in image)
        // Bottom extends further DOWN in image (higher V)
        uTL = uMin;         uTR = uMax;
        vTL = vMax;         vTR = vMax;
        uBL = uMin;         uBR = uMax;
        vBL = vMax + drape; vBR = vMax + drape;
      } else if (i === 1) {
        // Right wall (+X)
        // Top edge at uMax (right of keycap)
        // Bottom extends further RIGHT in image (higher U)
        uTL = uMax;         uTR = uMax + drape;
        vTL = vMax;         vTR = vMax;
        uBL = uMax;         uBR = uMax + drape;
        vBL = vMin;         vBR = vMin;
      } else if (i === 2) {
        // Back wall (+Z, faces TOWARD user)
        // Top edge at vMin (back of keycap = top in image)
        // Bottom extends further UP in image (lower V)
        uTL = uMax;         uTR = uMin;  // Reversed for winding
        vTL = vMin;         vTR = vMin;
        uBL = uMax;         uBR = uMin;
        vBL = vMin - drape; vBR = vMin - drape;
      } else {
        // Left wall (-X)
        // Top edge at uMin (left of keycap)
        // Bottom extends further LEFT in image (lower U)
        uTL = uMin - drape; uTR = uMin;
        vTL = vMin;         vTR = vMin;
        uBL = uMin - drape; uBR = uMin;
        vBL = vMax;         vBR = vMax;
      }
    } else {
      // No image - simple solid color (no meaningful UVs)
      uBL = 0; vBL = 0;
      uBR = 1; vBR = 0;
      uTR = 1; vTR = 1;
      uTL = 0; vTL = 1;
    }

    const v0 = pushVert(bl[0], bl[1], bl[2], uBL, vBL);
    const v1 = pushVert(br[0], br[1], br[2], uBR, vBR);
    const v2 = pushVert(tr[0], tr[1], tr[2], uTR, vTR);
    const v3 = pushVert(tl[0], tl[1], tl[2], uTL, vTL);
    indices.push(v0, v1, v2, v0, v2, v3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// ============================================================
// Keycap top face geometry (dish + chamfers)
// ============================================================
function createTopFaceGeometry(widthU = 1, heightU = 1, profile = 'cherry') {
  const normalizedProfile = normalizeProfile(profile);
  const spec = PROFILE_SPECS[normalizedProfile] || PROFILE_SPECS.cherry;
  const scale = 1 / 19.05;
  const tw = spec.topWidth * widthU * scale;
  const td = spec.topDepth * heightU * scale;
  const H = spec.maxHeight * scale;
  const dishDepth = spec.dishDepth * scale;
  const chamfer = spec.chamfer * scale;
  const dishType = spec.dishType;
  const dishCols = 10;
  const dishRows = 6;

  const positions = [];
  const uvs = [];
  const indices = [];

  function pushVert(x, y, z, u, v) {
    positions.push(x, y, z);
    uvs.push(u, 1 - v); // Flip V so image top = keycap back (+Z)
    return (positions.length / 3) - 1;
  }

  // --- DISHED TOP FACE GRID ---
  const topStartIdx = 0;

  for (let row = 0; row <= dishRows; row++) {
    for (let col = 0; col <= dishCols; col++) {
      const u = col / dishCols;
      const v = row / dishRows;

      const x = -tw / 2 + chamfer + (tw - 2 * chamfer) * u;
      const z = -td / 2 + chamfer + (td - 2 * chamfer) * v;

      const dishOffset = dishType === 'spherical'
        ? -dishDepth * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
        : -dishDepth * Math.sin(Math.PI * u);
      const y = H + dishOffset;

      pushVert(x, y, z, u, v);
    }
  }

  for (let row = 0; row < dishRows; row++) {
    for (let col = 0; col < dishCols; col++) {
      const a = topStartIdx + row * (dishCols + 1) + col;
      const b = a + 1;
      const c = a + (dishCols + 1);
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // --- CHAMFER STRIPS ---
  for (let col = 0; col < dishCols; col++) {
    const u0 = col / dishCols;
    const u1 = (col + 1) / dishCols;
    const dishA = topStartIdx + col;
    const dishB = topStartIdx + col + 1;
    const wallA = pushVert(-tw / 2 + chamfer + (tw - 2 * chamfer) * u0, H, -td / 2, u0, 0);
    const wallB = pushVert(-tw / 2 + chamfer + (tw - 2 * chamfer) * u1, H, -td / 2, u1, 0);
    indices.push(wallA, dishA, dishB);
    indices.push(wallA, dishB, wallB);
  }

  for (let col = 0; col < dishCols; col++) {
    const u0 = col / dishCols;
    const u1 = (col + 1) / dishCols;
    const dishA = topStartIdx + dishRows * (dishCols + 1) + col;
    const dishB = topStartIdx + dishRows * (dishCols + 1) + col + 1;
    const wallA = pushVert(-tw / 2 + chamfer + (tw - 2 * chamfer) * u0, H, td / 2, u0, 1);
    const wallB = pushVert(-tw / 2 + chamfer + (tw - 2 * chamfer) * u1, H, td / 2, u1, 1);
    indices.push(wallA, dishB, dishA);
    indices.push(wallA, wallB, dishB);
  }

  for (let row = 0; row < dishRows; row++) {
    const v0 = row / dishRows;
    const v1 = (row + 1) / dishRows;
    const dishA = topStartIdx + row * (dishCols + 1);
    const dishB = topStartIdx + (row + 1) * (dishCols + 1);
    const wallA = pushVert(-tw / 2, H, -td / 2 + chamfer + (td - 2 * chamfer) * v0, 0, v0);
    const wallB = pushVert(-tw / 2, H, -td / 2 + chamfer + (td - 2 * chamfer) * v1, 0, v1);
    indices.push(wallA, dishB, dishA);
    indices.push(wallA, wallB, dishB);
  }

  for (let row = 0; row < dishRows; row++) {
    const v0 = row / dishRows;
    const v1 = (row + 1) / dishRows;
    const dishA = topStartIdx + row * (dishCols + 1) + dishCols;
    const dishB = topStartIdx + (row + 1) * (dishCols + 1) + dishCols;
    const wallA = pushVert(tw / 2, H, -td / 2 + chamfer + (td - 2 * chamfer) * v0, 1, v0);
    const wallB = pushVert(tw / 2, H, -td / 2 + chamfer + (td - 2 * chamfer) * v1, 1, v1);
    indices.push(wallA, dishA, dishB);
    indices.push(wallA, dishB, wallB);
  }

  // Corner patches
  {
    const corner = pushVert(-tw / 2, H, -td / 2, 0, 0);
    const dishCorner = topStartIdx;
    const frontEdge = pushVert(-tw / 2 + chamfer, H, -td / 2, 0, 0);
    const leftEdge = pushVert(-tw / 2, H, -td / 2 + chamfer, 0, 0);
    indices.push(corner, frontEdge, dishCorner);
    indices.push(corner, dishCorner, leftEdge);
  }
  {
    const corner = pushVert(tw / 2, H, -td / 2, 1, 0);
    const dishCorner = topStartIdx + dishCols;
    const frontEdge = pushVert(tw / 2 - chamfer, H, -td / 2, 1, 0);
    const rightEdge = pushVert(tw / 2, H, -td / 2 + chamfer, 1, 0);
    indices.push(corner, dishCorner, frontEdge);
    indices.push(corner, rightEdge, dishCorner);
  }
  {
    const corner = pushVert(-tw / 2, H, td / 2, 0, 1);
    const dishCorner = topStartIdx + dishRows * (dishCols + 1);
    const backEdge = pushVert(-tw / 2 + chamfer, H, td / 2, 0, 1);
    const leftEdge = pushVert(-tw / 2, H, td / 2 - chamfer, 0, 1);
    indices.push(corner, dishCorner, backEdge);
    indices.push(corner, leftEdge, dishCorner);
  }
  {
    const corner = pushVert(tw / 2, H, td / 2, 1, 1);
    const dishCorner = topStartIdx + dishRows * (dishCols + 1) + dishCols;
    const backEdge = pushVert(tw / 2 - chamfer, H, td / 2, 1, 1);
    const rightEdge = pushVert(tw / 2, H, td / 2 - chamfer, 1, 1);
    indices.push(corner, backEdge, dishCorner);
    indices.push(corner, dishCorner, rightEdge);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// ============================================================
// Build keycap texture - solid color with legend
// ============================================================
async function buildKeycapTexture({ color, legend, legendColor, legendFont, legendPosition }) {
  const fontFamily = legendFont || 'Inter';

  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`bold 160px "${fontFamily}"`),
        document.fonts.load(`700 160px "${fontFamily}"`),
      ]),
      new Promise(resolve => setTimeout(resolve, 800))
    ]);
  } catch (e) {}

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Solid color background
  ctx.fillStyle = color || '#7c6bb0';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle highlight gradient
  const grad = ctx.createRadialGradient(256, 180, 20, 256, 200, 220);
  grad.addColorStop(0, 'rgba(255,255,255,0.10)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Draw legend
  if (legend && legend.trim() !== '' && legendPosition !== 'hidden' && legendPosition !== 'none' && legendPosition !== 'front') {
    const posMap = {
      'center':       [256, 256],
      'top-center':   [256, 160],
      'top-left':     [110, 130],
      'top-right':    [400, 130],
      'bottom-left':  [110, 390],
      'bottom-right': [400, 390],
    };
    const pos = posMap[legendPosition] || posMap['center'];
    const [tx, ty] = pos;
    const fontSize = legend.length > 3 ? 100 : legend.length > 1 ? 130 : 160;

    ctx.fillStyle = legendColor || '#ffffff';
    ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillText(legend, tx, ty);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Fallback version (sync)
function buildKeycapTextureFallback(color, legend, legendColor, legendFont, legendPosition) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color || '#7c6bb0';
  ctx.fillRect(0, 0, 512, 512);

  if (legend && legend.trim() !== '' && legendPosition !== 'hidden' && legendPosition !== 'none' && legendPosition !== 'front') {
    ctx.fillStyle = legendColor || '#ffffff';
    const fontSize = legend.length > 3 ? 100 : legend.length > 1 ? 130 : 160;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(legend, 256, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ============================================================
// Front face legend texture - scales based on key width
// ============================================================
async function buildFrontFaceLegendTexture({ legend, legendColor, legendFont, keyWidth }) {
  const fontFamily = legendFont || 'Inter';

  try {
    await Promise.race([
      document.fonts.load(`bold 300px "${fontFamily}"`),
      new Promise(resolve => setTimeout(resolve, 500))
    ]);
  } catch (e) {}

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 512, 512);

  if (legend && legend.trim() !== '') {
    // Scale font based on key width - wider keys can have larger text
    // 1u key = 1.0, 2u = 2.0, etc.
    const widthFactor = Math.min(keyWidth || 1, 2.5); // Cap at 2.5x

    // Base font size, scaled by width and character count
    let baseFontSize;
    if (legend.length === 1) {
      baseFontSize = 280;
    } else if (legend.length <= 2) {
      baseFontSize = 200;
    } else if (legend.length <= 4) {
      baseFontSize = 140;
    } else {
      baseFontSize = 100;
    }

    // Wider keys can show larger text, but we also need to fit horizontally
    const fontSize = Math.min(baseFontSize * Math.sqrt(widthFactor), 500 / legend.length);

    // Strong shadow for visibility
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 6;

    ctx.fillStyle = legendColor || '#ffffff';
    ctx.font = `bold ${Math.round(fontSize)}px "${fontFamily}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(legend, 256, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ============================================================
// Main Keycap component
// ============================================================
export default function Keycap({ keyId, label, x, y, w = 1, h = 1, rowHeight, rowTilt, uvOffset = [0, 0], uvScale = [1, 1], isSelected, isPerformanceMode, singleKeyMode = false, onClick, profile = 'cherry' }) {
  const meshRef = useRef();

  const [hovered, setHovered] = useState(false);
  const globalColor = useStore(s => s.globalColor);
  const globalLegendColor = useStore(s => s.globalLegendColor);
  const globalLegendText = useStore(s => s.globalLegendText);
  const globalFont = useStore(s => s.globalFont);
  const globalLegendPosition = useStore(s => s.globalLegendPosition);
  const materialPreset = useStore(s => s.materialPreset);
  const soundEnabled = useStore(s => s.soundEnabled);
  const imageMode = useStore(s => s.keyboardImageMode);
  const imageUrl = useStore(s => s.keyboardImageUrl);
  const imageOffsetX = useStore(s => s.keyboardImageOffsetX) || 0;
  const imageOffsetY = useStore(s => s.keyboardImageOffsetY) || 0;
  const imageScale = useStore(s => s.keyboardImageScale) || 1;

  const perKeyDesigns = useStore(s => s.perKeyDesigns);
  const pkDesign = perKeyDesigns[keyId] || {};

  const color = pkDesign.color || globalColor;
  const legendColor = pkDesign.legendColor || globalLegendColor;
  let legendText = pkDesign.legendText || globalLegendText;
  const font = pkDesign.font || globalFont;
  const legendPosition = pkDesign.legendPosition || globalLegendPosition || 'top-center';

  const displayText = legendText && legendText.trim() !== '' ? legendText : label;
  const isSingleView = (x === undefined && y === undefined);

  // Adjusted UV values based on user's pan/zoom settings
  const adjustedUvOffset = useMemo(() => [
    uvOffset[0] / imageScale - imageOffsetX * 0.5,
    uvOffset[1] / imageScale - imageOffsetY * 0.5
  ], [uvOffset, imageScale, imageOffsetX, imageOffsetY]);

  const adjustedUvScale = useMemo(() => [
    uvScale[0] / imageScale,
    uvScale[1] / imageScale
  ], [uvScale, imageScale]);

  // Calculate GLOBAL image UV data for body sides
  // This is in IMAGE space (0-1), not local keycap space
  const bodyUvData = useMemo(() => {
    if (imageMode !== 'wrap') return null;

    // Keycap's region in image space
    const uMin = adjustedUvOffset[0];
    const uMax = adjustedUvOffset[0] + adjustedUvScale[0];
    const vMin = adjustedUvOffset[1];  // Back of keycap (top in image after flip)
    const vMax = adjustedUvOffset[1] + adjustedUvScale[1];  // Front of keycap

    // Fixed drape amount in IMAGE space (not relative to keycap size)
    // 0.08 = 8% of image extends onto each side
    const drape = 0.08;

    return { uMin, uMax, vMin, vMax, drape };
  }, [imageMode, adjustedUvOffset, adjustedUvScale]);

  // Body geometry with GLOBAL image UVs for sides
  const bodyGeo = useMemo(() => {
    return createBodyGeometry(w, h, profile, bodyUvData);
  }, [w, h, profile, bodyUvData]);

  const topGeo = useMemo(() => createTopFaceGeometry(w, h, profile), [w, h, profile]);

  // ============================================================
  // Image textures for wrap mode
  // wrapTexture: for TOP face (has offset/repeat, uses local 0-1 UVs)
  // sideTexture: for SIDES (NO offset/repeat, uses global UVs from geometry)
  // ============================================================
  const [wrapTexture, setWrapTexture] = useState(null);
  const [sideTexture, setSideTexture] = useState(null);

  useEffect(() => {
    if (!imageUrl || imageMode !== 'wrap') {
      setWrapTexture(null);
      setSideTexture(null);
      return;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (tex) => {
        if (cancelled) return;

        // TOP texture: clone with offset/repeat for this keycap's region
        const topClone = tex.clone();
        topClone.wrapS = THREE.RepeatWrapping;
        topClone.wrapT = THREE.RepeatWrapping;
        topClone.offset.set(adjustedUvOffset[0], 1 - adjustedUvOffset[1] - adjustedUvScale[1]);
        topClone.repeat.set(adjustedUvScale[0], adjustedUvScale[1]);
        topClone.colorSpace = THREE.SRGBColorSpace;
        topClone.needsUpdate = true;
        setWrapTexture(topClone);

        // SIDE texture: clone with NO offset/repeat (sides use global UVs)
        const sideClone = tex.clone();
        sideClone.wrapS = THREE.RepeatWrapping;
        sideClone.wrapT = THREE.RepeatWrapping;
        // NO offset or repeat - sides use global image coordinates directly
        sideClone.colorSpace = THREE.SRGBColorSpace;
        sideClone.needsUpdate = true;
        setSideTexture(sideClone);
      },
      undefined,
      () => {
        if (!cancelled) {
          setWrapTexture(null);
          setSideTexture(null);
        }
      }
    );
    return () => { cancelled = true; };
  }, [imageUrl, imageMode, adjustedUvOffset, adjustedUvScale]);

  // ============================================================
  // Top face texture - solid color with legend (used when no image)
  // ============================================================
  const [topTexture, setTopTexture] = useState(() =>
    buildKeycapTextureFallback(color, displayText, legendColor, font, legendPosition)
  );

  useEffect(() => {
    // Only rebuild if not using wrap mode (wrap mode uses wrapTexture)
    if (imageMode === 'wrap') return;

    let cancelled = false;
    buildKeycapTexture({
      color,
      legend: displayText,
      legendColor,
      legendFont: font,
      legendPosition,
    }).then((tex) => {
      if (!cancelled) {
        setTopTexture(prev => {
          prev?.dispose();
          return tex;
        });
      }
    });
    return () => { cancelled = true; };
  }, [color, displayText, legendColor, font, legendPosition, imageMode]);

  // Per-key image
  const perKeyImage = pkDesign?.imageUrl;
  const [perKeyTexture, setPerKeyTexture] = useState(null);

  useEffect(() => {
    if (!perKeyImage) { setPerKeyTexture(null); return; }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(perKeyImage, (tex) => {
      if (cancelled) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      setPerKeyTexture(tex);
    });
    return () => { cancelled = true; };
  }, [perKeyImage]);

  // Final textures
  // TOP: uses wrapTexture (with offset/repeat) or topTexture (solid color)
  // SIDES: uses sideTexture (RAW, no offset/repeat - geometry has global UVs)
  const activeTopTexture = perKeyTexture || (imageMode === 'wrap' ? wrapTexture : topTexture);
  const activeSideTexture = (imageMode === 'wrap') ? sideTexture : null;

  // ============================================================
  // Front face legend (sideprint)
  // ============================================================
  const [frontFaceTexture, setFrontFaceTexture] = useState(null);
  const showFrontLegend = legendPosition === 'front' && displayText && displayText.trim() !== '';

  useEffect(() => {
    if (!showFrontLegend) {
      setFrontFaceTexture(null);
      return;
    }
    let cancelled = false;
    buildFrontFaceLegendTexture({
      legend: displayText,
      legendColor,
      legendFont: font,
      keyWidth: w,  // Pass key width for scaling
    }).then((tex) => {
      if (!cancelled) {
        setFrontFaceTexture(prev => {
          prev?.dispose();
          return tex;
        });
      }
    });
    return () => { cancelled = true; };
  }, [showFrontLegend, displayText, legendColor, font, w]);

  // Front face geometry - scales based on key width
  const frontFaceGeometry = useMemo(() => {
    if (!showFrontLegend) return null;
    const normalizedProfile = normalizeProfile(profile);
    const spec = PROFILE_SPECS[normalizedProfile] || PROFILE_SPECS.cherry;
    const scale = 1 / 19.05;
    const W = spec.baseWidth * w * scale;
    const tw = spec.topWidth * w * scale;
    const H = spec.maxHeight * scale;
    // Make the plane cover most of the front face
    const faceWidth = (W + tw) / 2;
    const faceHeight = H * 0.85;
    return new THREE.PlaneGeometry(faceWidth, faceHeight);
  }, [showFrontLegend, profile, w]);

  // ============================================================
  // Top face legend overlay (when using image wrap mode)
  // ============================================================
  const [topLegendTexture, setTopLegendTexture] = useState(null);
  const showTopLegendOverlay = imageMode === 'wrap' && displayText && displayText.trim() !== ''
    && legendPosition !== 'hidden' && legendPosition !== 'none' && legendPosition !== 'front';

  useEffect(() => {
    if (!showTopLegendOverlay) {
      setTopLegendTexture(null);
      return;
    }
    let cancelled = false;

    // Create transparent legend texture
    const createLegendOverlay = async () => {
      const fontFamily = font || 'Inter';
      try {
        await Promise.race([
          document.fonts.load(`bold 160px "${fontFamily}"`),
          new Promise(resolve => setTimeout(resolve, 500))
        ]);
      } catch (e) {}

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, 512, 512);

      const posMap = {
        'center':       [256, 256],
        'top-center':   [256, 160],
        'top-left':     [110, 130],
        'top-right':    [400, 130],
        'bottom-left':  [110, 390],
        'bottom-right': [400, 390],
      };
      const pos = posMap[legendPosition] || posMap['center'];
      const [tx, ty] = pos;
      const fontSize = displayText.length > 3 ? 100 : displayText.length > 1 ? 130 : 160;

      // Shadow for visibility on images
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = legendColor || '#ffffff';
      ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayText, tx, ty);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      return tex;
    };

    createLegendOverlay().then((tex) => {
      if (!cancelled) {
        setTopLegendTexture(prev => {
          prev?.dispose();
          return tex;
        });
      }
    });
    return () => { cancelled = true; };
  }, [showTopLegendOverlay, displayText, legendColor, font, legendPosition]);

  // ============================================================
  // Material presets
  // ============================================================
  const isABS = materialPreset === 'abs';
  const sideColor = darkenColor(color, 0.82);

  const topMatProps = useMemo(() => ({
    roughness: isABS ? 0.38 : 0.82,
    metalness: 0.0,
    clearcoat: isABS ? 0.15 : 0.0,
    clearcoatRoughness: isABS ? 0.6 : 1.0,
    reflectivity: isABS ? 0.15 : 0.05,
    envMapIntensity: isABS ? 0.2 : 0.1,
    side: THREE.DoubleSide,
  }), [isABS]);

  const sideMatProps = useMemo(() => ({
    roughness: isABS ? 0.42 : 0.85,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 1.0,
    reflectivity: isABS ? 0.08 : 0.03,
    envMapIntensity: isABS ? 0.12 : 0.06,
    side: THREE.DoubleSide,
  }), [isABS]);

  // Animation
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (singleKeyMode) {
      meshRef.current.rotation.x = 0;
      meshRef.current.rotation.y = clock.elapsedTime * 0.6;
      meshRef.current.position.y = Math.sin(clock.elapsedTime * 0.9) * 0.05;
    } else {
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        hovered ? 0.06 : 0,
        0.12
      );
    }
  });

  const px = x !== undefined ? x * 1.05 : 0;
  const pz = y !== undefined ? y * 1.05 : 0;

  return (
    <group
      position={[px, 0, pz]}
      rotation={[rowTilt || 0, 0, 0]}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          if (soundEnabled) playKeycapSound(materialPreset);
          onClick();
        }
      }}
      onPointerOver={(e) => {
        if (!isSingleView && !singleKeyMode) {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        if (!isSingleView && !singleKeyMode) {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }
      }}
    >
      <group scale={singleKeyMode ? [1.6, 1.6, 1.6] : [1, 1, 1]}>
        <group ref={meshRef} scale={[1, rowHeight || 0.48, 1]}>

          {/* Selected Key Highlight */}
          {isSelected && (
            <mesh scale={[1.06, 1.1, 1.06]} geometry={bodyGeo}>
              <meshStandardMaterial
                color="#6c63ff"
                transparent
                opacity={0.25}
                side={THREE.BackSide}
              />
            </mesh>
          )}

          {/* Body mesh: sides + bottom */}
          <mesh geometry={bodyGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              map={activeSideTexture}
              color={activeSideTexture ? "#ffffff" : sideColor}
              {...sideMatProps}
            />
          </mesh>

          {/* Top face mesh: dish + chamfers */}
          <mesh geometry={topGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              map={activeTopTexture}
              color="#ffffff"
              {...topMatProps}
            />
          </mesh>

          {/* Top face legend overlay (when using image wrap mode) */}
          {showTopLegendOverlay && topLegendTexture && (
            <mesh geometry={topGeo} position={[0, 0.001, 0]}>
              <meshBasicMaterial
                map={topLegendTexture}
                transparent
                opacity={1}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Front face legend (sideprint) - on the BACK wall (+Z, facing user) */}
          {showFrontLegend && frontFaceTexture && frontFaceGeometry && (() => {
            const normalizedProfile = normalizeProfile(profile);
            const spec = PROFILE_SPECS[normalizedProfile] || PROFILE_SPECS.cherry;
            const scale = 1 / 19.05;
            const D = spec.baseDepth * h * scale;
            const td = spec.topDepth * h * scale;
            const H = spec.maxHeight * scale * (rowHeight || 1);

            // Back wall (+Z) slopes from (D/2, 0) at bottom to (td/2, H) at top
            const wallAngle = Math.atan2((D - td) / 2, H);

            // Position at 45% height for better centering
            const t = 0.45;
            const frontY = H * t;
            const frontZ = D/2 - ((D - td) / 2) * t;

            return (
              <mesh
                geometry={frontFaceGeometry}
                position={[0, frontY, frontZ + 0.004]}
                rotation={[wallAngle, 0, 0]}
              >
                <meshBasicMaterial
                  map={frontFaceTexture}
                  transparent
                  opacity={1}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            );
          })()}

          {/* Cherry MX stem */}
          <group position={[0, -0.15, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.07, 0.12, 0.22]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.8} metalness={0.0} />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[0.22, 0.12, 0.07]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.8} metalness={0.0} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
