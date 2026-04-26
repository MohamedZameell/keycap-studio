import React, { useRef, useMemo, useState, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import { useStore } from '../store';
import { playKeycapSound } from '../utils/soundEngine';
import { getKeyColors } from '../data/colorways';

// ============================================================
// SHARED RESOURCES — reused across every keycap instance
// ============================================================
const STEM_GEO_VERT = new THREE.BoxGeometry(0.07, 0.12, 0.22);
const STEM_GEO_HORZ = new THREE.BoxGeometry(0.22, 0.12, 0.07);
const STEM_MAT = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.8 });
const EMPTY_DESIGN = Object.freeze({});

// ============================================================
// TEXTURE CACHE - shared across all keycaps for performance
// ============================================================
const textureCache = new Map();
const geometryCache = new Map();
const MAX_CACHE_SIZE = 200;

function getCachedTexture(key, createFn) {
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }
  const texture = createFn();
  if (textureCache.size > MAX_CACHE_SIZE) {
    const firstKey = textureCache.keys().next().value;
    const oldTex = textureCache.get(firstKey);
    if (oldTex?.dispose) oldTex.dispose();
    textureCache.delete(firstKey);
  }
  textureCache.set(key, texture);
  return texture;
}

function getCachedGeometry(key, createFn) {
  if (geometryCache.has(key)) {
    return geometryCache.get(key);
  }
  const geometry = createFn();
  geometryCache.set(key, geometry);
  return geometry;
}

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
  cherry: { maxHeight: 9.4, dishType: 'cylindrical', dishDepth: 0.6, topWidth: 14.0, topDepth: 13.0, baseWidth: 17.5, baseDepth: 17.5, chamfer: 0.7, uniform: false, rowHeights: [1.000, 1.000, 0.904, 0.787, 0.904, 0.904], rowTilts: [0.122, 0.122, 0.087, 0, -0.105, -0.105] },
  oem: { maxHeight: 11.9, dishType: 'cylindrical', dishDepth: 0.8, topWidth: 13.5, topDepth: 12.5, baseWidth: 18.0, baseDepth: 18.0, chamfer: 0.6, uniform: false, rowHeights: [1.000, 1.000, 0.924, 0.807, 0.924, 0.924], rowTilts: [0.140, 0.140, 0.100, 0, -0.120, -0.120] },
  sa: { maxHeight: 16.5, dishType: 'spherical', dishDepth: 2.5, topWidth: 12.5, topDepth: 12.5, baseWidth: 18.4, baseDepth: 18.4, chamfer: 0.5, uniform: false, rowHeights: [1.000, 1.000, 0.971, 0.941, 0.941, 0.941], rowTilts: [0.150, 0.150, 0.100, 0, -0.100, -0.100] },
  dsa: { maxHeight: 7.6, dishType: 'spherical', dishDepth: 1.0, topWidth: 13.0, topDepth: 13.0, baseWidth: 18.0, baseDepth: 18.0, chamfer: 0.8, uniform: true, rowHeights: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000], rowTilts: [0, 0, 0, 0, 0, 0] },
  xda: { maxHeight: 9.1, dishType: 'spherical', dishDepth: 0.5, topWidth: 13.5, topDepth: 13.5, baseWidth: 18.0, baseDepth: 18.0, chamfer: 0.8, uniform: true, rowHeights: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000], rowTilts: [0, 0, 0, 0, 0, 0] },
  kat: { maxHeight: 13.5, dishType: 'spherical', dishDepth: 1.8, topWidth: 13.0, topDepth: 12.5, baseWidth: 18.2, baseDepth: 18.2, chamfer: 0.6, uniform: false, rowHeights: [1.000, 1.000, 0.926, 0.852, 0.926, 0.926], rowTilts: [0.140, 0.140, 0.090, 0, -0.110, -0.110] },
  mt3: { maxHeight: 16.0, dishType: 'spherical', dishDepth: 3.0, topWidth: 12.0, topDepth: 12.0, baseWidth: 18.4, baseDepth: 18.4, chamfer: 0.5, uniform: false, rowHeights: [1.000, 1.000, 0.969, 0.906, 0.938, 0.938], rowTilts: [0.160, 0.160, 0.110, 0, -0.120, -0.120] },
  asa: { maxHeight: 13.5, dishType: 'spherical', dishDepth: 1.5, topWidth: 13.2, topDepth: 12.8, baseWidth: 18.2, baseDepth: 18.2, chamfer: 0.6, uniform: false, rowHeights: [1.000, 1.000, 0.926, 0.852, 0.926, 0.926], rowTilts: [0.140, 0.140, 0.095, 0, -0.110, -0.110] },
  osa: { maxHeight: 12.0, dishType: 'spherical', dishDepth: 1.2, topWidth: 13.5, topDepth: 13.0, baseWidth: 18.2, baseDepth: 18.2, chamfer: 0.6, uniform: false, rowHeights: [1.000, 1.000, 0.920, 0.840, 0.920, 0.920], rowTilts: [0.130, 0.130, 0.090, 0, -0.110, -0.110] },
  ksa: { maxHeight: 15.0, dishType: 'spherical', dishDepth: 2.2, topWidth: 12.5, topDepth: 12.5, baseWidth: 18.4, baseDepth: 18.4, chamfer: 0.5, uniform: false, rowHeights: [1.000, 1.000, 0.960, 0.920, 0.940, 0.940], rowTilts: [0.150, 0.150, 0.100, 0, -0.110, -0.110] },
  'low profile': { maxHeight: 6.0, dishType: 'cylindrical', dishDepth: 0.3, topWidth: 14.5, topDepth: 14.0, baseWidth: 17.0, baseDepth: 17.0, chamfer: 0.4, uniform: true, rowHeights: [1.000, 1.000, 1.000, 1.000, 1.000, 1.000], rowTilts: [0, 0, 0, 0, 0, 0] },
};

const normalizeProfile = (p) => (p || 'cherry').toLowerCase();
export { PROFILE_SPECS, normalizeProfile };

// ============================================================
// Keycap body geometry with GLOBAL UV coordinates for image wrap
// uvBounds: { uMin, uMax, vMin, vMax, drape } in texture space
// ============================================================
function createBodyGeometry(widthU = 1, heightU = 1, profile = 'cherry', uvBounds = null) {
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

  // Bottom face (not visible)
  const b0 = pushVert(-W/2, 0, -D/2, 0.5, 0.5);
  const b1 = pushVert(W/2, 0, -D/2, 0.5, 0.5);
  const b2 = pushVert(W/2, 0, D/2, 0.5, 0.5);
  const b3 = pushVert(-W/2, 0, D/2, 0.5, 0.5);
  indices.push(b0, b2, b1, b0, b3, b2);

  // Side walls
  const baseCorners = [[-W/2, 0, -D/2], [W/2, 0, -D/2], [W/2, 0, D/2], [-W/2, 0, D/2]];
  const topCorners = [[-tw/2, H, -td/2], [tw/2, H, -td/2], [tw/2, H, td/2], [-tw/2, H, td/2]];

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const bl = baseCorners[i], br = baseCorners[j];
    const tr = topCorners[j], tl = topCorners[i];

    let uBL, vBL, uBR, vBR, uTR, vTR, uTL, vTL;

    if (uvBounds) {
      const { uMin, uMax, vMin, vMax, drapeV, drapeU } = uvBounds;
      // vMin = back of keycap (top of image region)
      // vMax = front of keycap (bottom of image region)
      // drapeV = vertical drape amount for front/back walls
      // drapeU = horizontal drape amount for left/right walls

      // Vertex order: bl (v0), br (v1), tr (v2), tl (v3)
      // For proper cloth drape, sides should continue the image outward from top face edges

      if (i === 0) {
        // Front wall (-Z): bl=front-left-base, br=front-right-base, tr=front-right-top, tl=front-left-top
        // Top edge matches front edge of top face, bottom drapes down (higher V)
        uTL = uMin; vTL = vMax;           // front-left top
        uTR = uMax; vTR = vMax;           // front-right top
        uBL = uMin; vBL = vMax + drapeV;  // front-left base
        uBR = uMax; vBR = vMax + drapeV;  // front-right base
      } else if (i === 1) {
        // Right wall (+X): bl=front-right-base, br=back-right-base, tr=back-right-top, tl=front-right-top
        // Top edge matches right edge of top face, bottom drapes right (higher U)
        uTL = uMax; vTL = vMax;             // front-right top
        uTR = uMax; vTR = vMin;             // back-right top
        uBL = uMax + drapeU; vBL = vMax;    // front-right base (drapes right)
        uBR = uMax + drapeU; vBR = vMin;    // back-right base (drapes right)
      } else if (i === 2) {
        // Back wall (+Z): bl=back-right-base, br=back-left-base, tr=back-left-top, tl=back-right-top
        // Top edge matches back edge of top face, bottom drapes up (lower V)
        uTL = uMax; vTL = vMin;             // back-right top
        uTR = uMin; vTR = vMin;             // back-left top
        uBL = uMax; vBL = vMin - drapeV;    // back-right base
        uBR = uMin; vBR = vMin - drapeV;    // back-left base
      } else {
        // Left wall (-X): bl=back-left-base, br=front-left-base, tr=front-left-top, tl=back-left-top
        // Top edge matches left edge of top face, bottom drapes left (lower U)
        uTL = uMin; vTL = vMin;             // back-left top
        uTR = uMin; vTR = vMax;             // front-left top
        uBL = uMin - drapeU; vBL = vMin;    // back-left base (drapes left)
        uBR = uMin - drapeU; vBR = vMax;    // front-left base (drapes left)
      }
    } else {
      uBL = 0; vBL = 0; uBR = 1; vBR = 0; uTR = 1; vTR = 1; uTL = 0; vTL = 1;
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
// Keycap top face geometry with GLOBAL UV coordinates
// uvBounds: { uMin, uMax, vMin, vMax } in texture space
// ============================================================
function createTopFaceGeometry(widthU = 1, heightU = 1, profile = 'cherry', uvBounds = null) {
  const normalizedProfile = normalizeProfile(profile);
  const spec = PROFILE_SPECS[normalizedProfile] || PROFILE_SPECS.cherry;
  const scale = 1 / 19.05;
  const tw = spec.topWidth * widthU * scale;
  const td = spec.topDepth * heightU * scale;
  const H = spec.maxHeight * scale;
  const dishDepth = spec.dishDepth * scale;
  const chamfer = spec.chamfer * scale;
  const dishType = spec.dishType;
  const dishCols = 10, dishRows = 6;

  const positions = [];
  const uvs = [];
  const indices = [];

  // UV mapping function - maps local (0-1) to global texture coords
  const mapUV = (localU, localV) => {
    if (uvBounds) {
      // Map local coords to the keycap's region in the texture
      // localV: 0 = front of keycap (-Z), 1 = back of keycap (+Z)
      // In texture: vMin = back (top of image), vMax = front (bottom of image)
      const u = uvBounds.uMin + localU * (uvBounds.uMax - uvBounds.uMin);
      const v = uvBounds.vMax - localV * (uvBounds.vMax - uvBounds.vMin); // Flip V
      return [u, v];
    }
    return [localU, 1 - localV]; // Default with V flip
  };

  function pushVert(x, y, z, localU, localV) {
    positions.push(x, y, z);
    const [u, v] = mapUV(localU, localV);
    uvs.push(u, v);
    return (positions.length / 3) - 1;
  }

  // Dished top face grid
  const topStartIdx = 0;
  for (let row = 0; row <= dishRows; row++) {
    for (let col = 0; col <= dishCols; col++) {
      const u = col / dishCols;
      const v = row / dishRows;
      const x = -tw/2 + chamfer + (tw - 2*chamfer) * u;
      const z = -td/2 + chamfer + (td - 2*chamfer) * v;
      const dishOffset = dishType === 'spherical'
        ? -dishDepth * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
        : -dishDepth * Math.sin(Math.PI * u);
      pushVert(x, H + dishOffset, z, u, v);
    }
  }

  for (let row = 0; row < dishRows; row++) {
    for (let col = 0; col < dishCols; col++) {
      const a = topStartIdx + row * (dishCols + 1) + col;
      indices.push(a, a + (dishCols + 1), a + 1);
      indices.push(a + 1, a + (dishCols + 1), a + (dishCols + 2));
    }
  }

  // Chamfer strips
  for (let col = 0; col < dishCols; col++) {
    const u0 = col / dishCols, u1 = (col + 1) / dishCols;
    const dishA = topStartIdx + col, dishB = dishA + 1;
    const wallA = pushVert(-tw/2 + chamfer + (tw - 2*chamfer) * u0, H, -td/2, u0, 0);
    const wallB = pushVert(-tw/2 + chamfer + (tw - 2*chamfer) * u1, H, -td/2, u1, 0);
    indices.push(wallA, dishA, dishB, wallA, dishB, wallB);
  }
  for (let col = 0; col < dishCols; col++) {
    const u0 = col / dishCols, u1 = (col + 1) / dishCols;
    const dishA = topStartIdx + dishRows * (dishCols + 1) + col, dishB = dishA + 1;
    const wallA = pushVert(-tw/2 + chamfer + (tw - 2*chamfer) * u0, H, td/2, u0, 1);
    const wallB = pushVert(-tw/2 + chamfer + (tw - 2*chamfer) * u1, H, td/2, u1, 1);
    indices.push(wallA, dishB, dishA, wallA, wallB, dishB);
  }
  for (let row = 0; row < dishRows; row++) {
    const v0 = row / dishRows, v1 = (row + 1) / dishRows;
    const dishA = topStartIdx + row * (dishCols + 1), dishB = dishA + (dishCols + 1);
    const wallA = pushVert(-tw/2, H, -td/2 + chamfer + (td - 2*chamfer) * v0, 0, v0);
    const wallB = pushVert(-tw/2, H, -td/2 + chamfer + (td - 2*chamfer) * v1, 0, v1);
    indices.push(wallA, dishB, dishA, wallA, wallB, dishB);
  }
  for (let row = 0; row < dishRows; row++) {
    const v0 = row / dishRows, v1 = (row + 1) / dishRows;
    const dishA = topStartIdx + row * (dishCols + 1) + dishCols, dishB = dishA + (dishCols + 1);
    const wallA = pushVert(tw/2, H, -td/2 + chamfer + (td - 2*chamfer) * v0, 1, v0);
    const wallB = pushVert(tw/2, H, -td/2 + chamfer + (td - 2*chamfer) * v1, 1, v1);
    indices.push(wallA, dishA, dishB, wallA, dishB, wallB);
  }

  // Corner patches
  const corners = [
    [-tw/2, -td/2, 0, 0, topStartIdx, -tw/2 + chamfer, -td/2, -tw/2, -td/2 + chamfer],
    [tw/2, -td/2, 1, 0, topStartIdx + dishCols, tw/2 - chamfer, -td/2, tw/2, -td/2 + chamfer],
    [-tw/2, td/2, 0, 1, topStartIdx + dishRows * (dishCols + 1), -tw/2 + chamfer, td/2, -tw/2, td/2 - chamfer],
    [tw/2, td/2, 1, 1, topStartIdx + dishRows * (dishCols + 1) + dishCols, tw/2 - chamfer, td/2, tw/2, td/2 - chamfer],
  ];
  corners.forEach(([cx, cz, cu, cv, dishCorner, ex, ez, fx, fz], idx) => {
    const corner = pushVert(cx, H, cz, cu, cv);
    const edge1 = pushVert(ex, H, ez, cu, cv);
    const edge2 = pushVert(fx, H, fz, cu, cv);
    if (idx < 2) {
      indices.push(corner, edge1, dishCorner, corner, dishCorner, edge2);
    } else {
      indices.push(corner, dishCorner, edge1, corner, edge2, dishCorner);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// ============================================================
// Build solid color keycap texture with legend
// ============================================================
async function buildKeycapTexture({ color, legend, legendColor, legendFont, legendPosition, keyWidth = 1, keyHeight = 1 }) {
  const fontFamily = legendFont || 'Inter';
  // Skip font loading - use fallback if not ready (faster)

  // Smaller canvas = faster (256 instead of 512)
  const baseSize = 256;
  const canvasWidth = Math.round(baseSize * keyWidth);
  const canvasHeight = Math.round(baseSize * keyHeight);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = color || '#7c6bb0';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const grad = ctx.createRadialGradient(cx, cy * 0.7, 20, cx, cy * 0.78, canvasHeight * 0.43);
  grad.addColorStop(0, 'rgba(255,255,255,0.10)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (legend && legend.trim() && legendPosition !== 'hidden' && legendPosition !== 'none' && legendPosition !== 'front') {
    const posMap = {
      'center': [cx, cy],
      'top-center': [cx, canvasHeight * 0.31],
      'top-left': [canvasWidth * 0.22, canvasHeight * 0.25],
      'top-right': [canvasWidth * 0.78, canvasHeight * 0.25],
      'bottom-left': [canvasWidth * 0.22, canvasHeight * 0.76],
      'bottom-right': [canvasWidth * 0.78, canvasHeight * 0.76]
    };
    const [tx, ty] = posMap[legendPosition] || posMap['center'];
    const baseFont = canvasHeight * 0.31;
    const fontSize = legend.length > 5 ? baseFont * 0.5 :
                     legend.length > 3 ? baseFont * 0.65 :
                     legend.length > 1 ? baseFont * 0.85 : baseFont;
    ctx.fillStyle = legendColor || '#ffffff';
    ctx.font = `bold ${Math.round(fontSize)}px "${fontFamily}", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillText(legend, tx, ty);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildKeycapTextureFallback(color, legend, legendColor, font, legendPosition, keyWidth = 1, keyHeight = 1) {
  // Smaller canvas = faster rendering (128 instead of 512)
  const baseSize = 128;
  const canvasWidth = Math.round(baseSize * keyWidth);
  const canvasHeight = Math.round(baseSize * keyHeight);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color || '#7c6bb0';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (legend && legend.trim() && legendPosition !== 'hidden' && legendPosition !== 'none' && legendPosition !== 'front') {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const baseFont = canvasHeight * 0.35;
    const fontSize = legend.length > 5 ? baseFont * 0.5 :
                     legend.length > 3 ? baseFont * 0.65 :
                     legend.length > 1 ? baseFont * 0.85 : baseFont;
    ctx.fillStyle = legendColor || '#ffffff';
    ctx.font = `bold ${Math.round(fontSize)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(legend, cx, cy);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============================================================
// Front face legend texture
// ============================================================
async function buildFrontFaceLegendTexture({ legend, legendColor, legendFont, keyWidth }) {
  const fontFamily = legendFont || 'Inter';
  try { await Promise.race([document.fonts.load(`bold 300px "${fontFamily}"`), new Promise(r => setTimeout(r, 500))]); } catch (e) {}

  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  if (legend && legend.trim()) {
    const widthFactor = Math.min(keyWidth || 1, 2.5);
    let baseFontSize = legend.length === 1 ? 280 : legend.length <= 2 ? 200 : legend.length <= 4 ? 140 : 100;
    const fontSize = Math.min(baseFontSize * Math.sqrt(widthFactor), 500 / legend.length);
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 15; ctx.shadowOffsetY = 6;
    ctx.fillStyle = legendColor || '#ffffff';
    ctx.font = `bold ${Math.round(fontSize)}px "${fontFamily}", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(legend, 256, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============================================================
// Main Keycap component
// ============================================================
function Keycap({ keyId, label, x, y, w = 1, h = 1, rowHeight, rowTilt, uvOffset = [0, 0], uvScale = [1, 1], isSelected, isPressed, isPerformanceMode, singleKeyMode = false, onClick, profile = 'cherry', sharedImageTexture = null }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  // Single shallow subscription for all global props — re-renders only when any of them changes.
  // Replaces 10 separate useStore selectors that would each fire across every keycap on any store change.
  const {
    globalColor,
    globalLegendColor,
    globalLegendText,
    globalFont,
    globalLegendPosition,
    materialPreset,
    soundEnabled,
    imageMode,
    selectedColorway,
  } = useStore(useShallow(s => ({
    globalColor: s.globalColor,
    globalLegendColor: s.globalLegendColor,
    globalLegendText: s.globalLegendText,
    globalFont: s.globalFont,
    globalLegendPosition: s.globalLegendPosition,
    materialPreset: s.materialPreset,
    soundEnabled: s.soundEnabled,
    imageMode: s.keyboardImageMode,
    selectedColorway: s.selectedColorway,
  })));

  // Per-key design — scoped to THIS keyId so editing one key doesn't re-render every other key.
  const pkDesign = useStore(s => s.perKeyDesigns[keyId] || EMPTY_DESIGN);

  // Get colors - priority: per-key > colorway > global
  const colorwayColors = useMemo(() => {
    if (selectedColorway) {
      return getKeyColors(selectedColorway, label);
    }
    return null;
  }, [selectedColorway, label]);

  const color = pkDesign.color || (colorwayColors?.background) || globalColor;
  const legendColor = pkDesign.legendColor || (colorwayColors?.legend) || globalLegendColor;
  const legendText = pkDesign.legendText || globalLegendText;
  const font = pkDesign.font || globalFont;
  const legendPosition = pkDesign.legendPosition || globalLegendPosition || 'top-center';
  const displayText = legendText && legendText.trim() !== '' ? legendText : label;
  const isSingleView = (x === undefined && y === undefined);

  // Static UV bounds — based on key position only (pan/zoom is on the shared canvas)
  const uvBounds = useMemo(() => {
    if (imageMode !== 'wrap') return null;
    const uMin = uvOffset[0];
    const uMax = uvOffset[0] + uvScale[0];
    const vMin = 1 - uvOffset[1] - uvScale[1];
    const vMax = 1 - uvOffset[1];
    const keycapImageHeight = vMax - vMin;
    const keycapImageWidth = uMax - uMin;
    const drapeV = keycapImageHeight * 0.4;
    const drapeU = keycapImageWidth * 0.4;
    return { uMin, uMax, vMin, vMax, drapeV, drapeU };
  }, [imageMode, uvOffset, uvScale]);

  // Geometries — stable, never rebuild on pan/zoom
  const geoKey = imageMode === 'wrap' ? null : `${w}-${h}-${profile}`;
  const bodyGeo = useMemo(() => {
    if (geoKey) {
      return getCachedGeometry(`body-${geoKey}`, () => createBodyGeometry(w, h, profile, null));
    }
    return createBodyGeometry(w, h, profile, uvBounds);
  }, [w, h, profile, uvBounds, geoKey]);
  const topGeo = useMemo(() => {
    if (geoKey) {
      return getCachedGeometry(`top-${geoKey}`, () => createTopFaceGeometry(w, h, profile, null));
    }
    return createTopFaceGeometry(w, h, profile, uvBounds);
  }, [w, h, profile, uvBounds, geoKey]);

  // Use shared image texture from KeyboardRenderer (computed once, not per-keycap)
  const imageTexture = sharedImageTexture;

  // Solid color texture - use simple sync version for speed
  const textureKey = `${color}-${displayText}-${legendColor}-${legendPosition}-${w}-${h}`;
  const solidTexture = useMemo(() => {
    if (imageMode === 'wrap') return null;
    return getCachedTexture(textureKey, () =>
      buildKeycapTextureFallback(color, displayText, legendColor, font, legendPosition, w, h)
    );
  }, [color, displayText, legendColor, font, legendPosition, imageMode, w, h, textureKey]);

  // Per-key image
  const perKeyImage = pkDesign?.imageUrl;
  const [perKeyTexture, setPerKeyTexture] = useState(null);
  useEffect(() => {
    if (!perKeyImage) { setPerKeyTexture(null); return; }
    let cancelled = false;
    new THREE.TextureLoader().load(perKeyImage, tex => {
      if (cancelled) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      setPerKeyTexture(tex);
    });
    return () => { cancelled = true; };
  }, [perKeyImage]);

  // Final textures - use image for BOTH top and sides when in wrap mode
  // Ensure we always have a fallback texture
  const activeTexture = perKeyTexture || (imageMode === 'wrap' && imageTexture ? imageTexture : solidTexture) || null;

  // Legend overlay for image mode
  const [legendOverlay, setLegendOverlay] = useState(null);
  const showLegendOverlay = imageMode === 'wrap' && imageTexture && displayText && displayText.trim()
    && legendPosition !== 'hidden' && legendPosition !== 'none' && legendPosition !== 'front';

  useEffect(() => {
    if (!showLegendOverlay) { setLegendOverlay(null); return; }
    let cancelled = false;
    const createOverlay = async () => {
      const fontFamily = font || 'Inter';
      try { await Promise.race([document.fonts.load(`bold 160px "${fontFamily}"`), new Promise(r => setTimeout(r, 500))]); } catch (e) {}

      // Canvas dimensions proportional to key size to prevent stretching
      const baseSize = 512;
      const canvasWidth = Math.round(baseSize * w);
      const canvasHeight = Math.round(baseSize * h);

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Scale positions based on canvas dimensions
      const cx = canvasWidth / 2;
      const cy = canvasHeight / 2;
      const posMap = {
        'center': [cx, cy],
        'top-center': [cx, canvasHeight * 0.31],
        'top-left': [canvasWidth * 0.22, canvasHeight * 0.25],
        'top-right': [canvasWidth * 0.78, canvasHeight * 0.25],
        'bottom-left': [canvasWidth * 0.22, canvasHeight * 0.76],
        'bottom-right': [canvasWidth * 0.78, canvasHeight * 0.76]
      };
      const [tx, ty] = posMap[legendPosition] || posMap['center'];

      // Font size based on text length, scaled for canvas height
      const baseFont = canvasHeight * 0.31;
      const fontSize = displayText.length > 5 ? baseFont * 0.5 :
                       displayText.length > 3 ? baseFont * 0.65 :
                       displayText.length > 1 ? baseFont * 0.85 : baseFont;

      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      ctx.fillStyle = legendColor || '#ffffff';
      ctx.font = `bold ${Math.round(fontSize)}px "${fontFamily}", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(displayText, tx, ty);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };
    createOverlay().then(tex => { if (!cancelled) setLegendOverlay(prev => { prev?.dispose(); return tex; }); });
    return () => { cancelled = true; };
  }, [showLegendOverlay, displayText, legendColor, font, legendPosition, w, h]);

  // Front face legend
  const [frontFaceTexture, setFrontFaceTexture] = useState(null);
  const showFrontLegend = legendPosition === 'front' && displayText && displayText.trim();
  useEffect(() => {
    if (!showFrontLegend) { setFrontFaceTexture(null); return; }
    let cancelled = false;
    buildFrontFaceLegendTexture({ legend: displayText, legendColor, legendFont: font, keyWidth: w })
      .then(tex => { if (!cancelled) setFrontFaceTexture(prev => { prev?.dispose(); return tex; }); });
    return () => { cancelled = true; };
  }, [showFrontLegend, displayText, legendColor, font, w]);

  const frontFaceGeometry = useMemo(() => {
    if (!showFrontLegend) return null;
    const spec = PROFILE_SPECS[normalizeProfile(profile)] || PROFILE_SPECS.cherry;
    const scale = 1 / 19.05;
    const W = spec.baseWidth * w * scale, tw = spec.topWidth * w * scale, H = spec.maxHeight * scale;
    return new THREE.PlaneGeometry((W + tw) / 2, H * 0.85);
  }, [showFrontLegend, profile, w]);

  // Legend overlay plane geometry (flat plane above keycap for image mode)
  const legendPlaneGeo = useMemo(() => {
    if (!showLegendOverlay) return null;
    const spec = PROFILE_SPECS[normalizeProfile(profile)] || PROFILE_SPECS.cherry;
    const scale = 1 / 19.05;
    const tw = spec.topWidth * w * scale;
    const td = spec.topDepth * h * scale;
    return new THREE.PlaneGeometry(tw * 0.95, td * 0.95);
  }, [showLegendOverlay, profile, w, h]);

  // Material props — only `isABS` and `sideColor` are used by the meshes below.
  // Removed dead topMatProps/sideMatProps that built meshPhysicalMaterial fields never passed anywhere.
  const isABS = materialPreset === 'abs';
  const sideColor = darkenColor(color, 0.82);

  // Only animate when needed (single key mode, pressed, or hovered)
  const needsAnimation = singleKeyMode || isPressed || hovered;
  useFrame(({ clock }) => {
    if (!meshRef.current || !needsAnimation) return;
    if (singleKeyMode) {
      meshRef.current.rotation.y = clock.elapsedTime * 0.6;
      meshRef.current.position.y = Math.sin(clock.elapsedTime * 0.9) * 0.05;
    } else {
      const targetY = isPressed ? -0.04 : hovered ? 0.06 : 0;
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.3);
    }
  });

  const px = x !== undefined ? x * 1.05 : 0;
  const pz = y !== undefined ? y * 1.05 : 0;

  return (
    <group position={[px, 0, pz]} rotation={[rowTilt || 0, 0, 0]}
      onClick={e => { if (onClick) { e.stopPropagation(); if (soundEnabled) playKeycapSound(materialPreset); onClick(); }}}
      onPointerOver={e => { if (!isSingleView && !singleKeyMode) { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}}
      onPointerOut={() => { if (!isSingleView && !singleKeyMode) { setHovered(false); document.body.style.cursor = 'auto'; }}}
    >
      <group scale={singleKeyMode ? [1.6, 1.6, 1.6] : [1, 1, 1]}>
        <group ref={meshRef} scale={[1, rowHeight || 0.48, 1]}>

          {isSelected && (
            <mesh scale={[1.06, 1.1, 1.06]} geometry={bodyGeo}>
              <meshStandardMaterial color="#6c63ff" transparent opacity={0.25} side={THREE.BackSide} />
            </mesh>
          )}

          {/* Body - sides (always keycap color) */}
          <mesh geometry={bodyGeo} castShadow receiveShadow>
            <meshStandardMaterial
              color={sideColor}
              roughness={isABS ? 0.5 : 0.9}
              metalness={0}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Body - image overlay (transparent where image doesn't cover) */}
          {imageMode === 'wrap' && imageTexture && (
            <mesh geometry={bodyGeo}>
              <meshStandardMaterial
                map={imageTexture}
                color="#ffffff"
                transparent
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={-1}
                polygonOffsetUnits={-1}
                roughness={isABS ? 0.5 : 0.9}
                metalness={0}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Top face (always keycap color + legend in non-wrap mode) */}
          <mesh geometry={topGeo} castShadow receiveShadow>
            <meshStandardMaterial
              color={color}
              map={imageMode !== 'wrap' ? activeTexture : null}
              roughness={isABS ? 0.45 : 0.85}
              metalness={0}
            />
          </mesh>

          {/* Top face - image overlay (transparent where image doesn't cover) */}
          {imageMode === 'wrap' && imageTexture && (
            <mesh geometry={topGeo}>
              <meshStandardMaterial
                map={imageTexture}
                color="#ffffff"
                transparent
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={-1}
                polygonOffsetUnits={-1}
                roughness={isABS ? 0.45 : 0.85}
                metalness={0}
              />
            </mesh>
          )}

          {/* Legend overlay for image mode */}
          {showLegendOverlay && legendOverlay && legendPlaneGeo && (() => {
            const spec = PROFILE_SPECS[normalizeProfile(profile)] || PROFILE_SPECS.cherry;
            const scale = 1 / 19.05;
            const H = spec.maxHeight * scale;
            return (
              <mesh geometry={legendPlaneGeo} position={[0, H + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
                <meshBasicMaterial map={legendOverlay} transparent alphaTest={0.1} depthWrite={false} />
              </mesh>
            );
          })()}

          {/* Front face legend */}
          {showFrontLegend && frontFaceTexture && frontFaceGeometry && (() => {
            const spec = PROFILE_SPECS[normalizeProfile(profile)] || PROFILE_SPECS.cherry;
            const scale = 1 / 19.05;
            const D = spec.baseDepth * h * scale, td = spec.topDepth * h * scale;
            const H = spec.maxHeight * scale * (rowHeight || 1);
            const wallAngle = Math.atan2((D - td) / 2, H);
            const t = 0.45, frontY = H * t, frontZ = D/2 - ((D - td) / 2) * t;
            return (
              <mesh geometry={frontFaceGeometry} position={[0, frontY, frontZ + 0.004]} rotation={[wallAngle, 0, 0]}>
                <meshBasicMaterial map={frontFaceTexture} transparent side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            );
          })()}

          {/* Stem — geometry + material shared module-wide to avoid per-key allocations */}
          <group position={[0, -0.15, 0]}>
            <mesh castShadow geometry={STEM_GEO_VERT} material={STEM_MAT} />
            <mesh castShadow geometry={STEM_GEO_HORZ} material={STEM_MAT} />
          </group>
        </group>
      </group>
    </group>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(Keycap, (prevProps, nextProps) => {
  return (
    prevProps.keyId === nextProps.keyId &&
    prevProps.label === nextProps.label &&
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.w === nextProps.w &&
    prevProps.h === nextProps.h &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isPressed === nextProps.isPressed &&
    prevProps.profile === nextProps.profile &&
    prevProps.sharedImageTexture === nextProps.sharedImageTexture
  );
});
