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
// For wrap mode: sides use IMAGE coordinates directly (matching top face orientation)
// ============================================================
function createBodyGeometry(widthU = 1, heightU = 1, profile = 'cherry', imageUvData = null) {
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
  // Corners at base and top
  const baseCorners = [
    [-W / 2, 0, -D / 2],   // 0: front-left (-Z)
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

  // Drape amount - how much image extends onto sides
  // Using 4.0 means sides show 4x the keycap's UV height/width
  // This ensures substantial image coverage on sides, not just thin strips
  const drape = 4.0;

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const bl = baseCorners[i];
    const br = baseCorners[j];
    const tr = topCorners[j];
    const tl = topCorners[i];

    if (imageUvData) {
      // Cloth-drape UV mapping - sides show image extending beyond top face
      // imageUvData contains: { ox, oy, sx, sy } - the keycap's position in IMAGE coordinates
      // ox, oy = top-left of keycap in image (0-1 range)
      // sx, sy = size of keycap in image
      const { ox, oy, sx, sy } = imageUvData;

      let uBL, vBL, uBR, vBR, uTR, vTR, uTL, vTL;

      if (i === 0) {
        // Front wall (-Z, faces AWAY from user)
        // Top edge connects to front of keycap top (high V in image = bottom of image)
        // In image coords: front edge of keycap is at V = oy + sy
        uTL = ox;           uTR = ox + sx;
        vTL = oy + sy;      vTR = oy + sy;
        // Bottom extends further down in image (higher V)
        uBL = ox;           uBR = ox + sx;
        vBL = oy + sy + sy * drape;  vBR = oy + sy + sy * drape;
      } else if (i === 1) {
        // Right wall (+X)
        // Top edge connects to right edge of keycap top (U = ox + sx)
        uTL = ox + sx;                uTR = ox + sx + sx * drape;
        vTL = oy + sy;                vTR = oy + sy;
        uBL = ox + sx;                uBR = ox + sx + sx * drape;
        vBL = oy;                     vBR = oy;
      } else if (i === 2) {
        // Back wall (+Z, faces TOWARD user)
        // Top edge connects to back of keycap top (low V in image = top of image)
        // In image coords: back edge of keycap is at V = oy
        uTL = ox + sx;      uTR = ox;  // Reversed for correct orientation
        vTL = oy;           vTR = oy;
        // Bottom extends further up in image (lower V)
        uBL = ox + sx;      uBR = ox;
        vBL = oy - sy * drape;  vBR = oy - sy * drape;
      } else {
        // Left wall (-X)
        // Top edge connects to left edge of keycap top (U = ox)
        uTL = ox - sx * drape;        uTR = ox;
        vTL = oy;                     vTR = oy;
        uBL = ox - sx * drape;        uBR = ox;
        vBL = oy + sy;                vBR = oy + sy;
      }

      const v0 = pushVert(bl[0], bl[1], bl[2], uBL, vBL);
      const v1 = pushVert(br[0], br[1], br[2], uBR, vBR);
      const v2 = pushVert(tr[0], tr[1], tr[2], uTR, vTR);
      const v3 = pushVert(tl[0], tl[1], tl[2], uTL, vTL);
      indices.push(v0, v1, v2, v0, v2, v3);
    } else {
      // No image - simple 0-1 mapping
      const v0 = pushVert(bl[0], bl[1], bl[2], 0, 0);
      const v1 = pushVert(br[0], br[1], br[2], 1, 0);
      const v2 = pushVert(tr[0], tr[1], tr[2], 1, 1);
      const v3 = pushVert(tl[0], tl[1], tl[2], 0, 1);
      indices.push(v0, v1, v2, v0, v2, v3);
    }
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
    uvs.push(u, 1 - v); // Flip V so image top matches keycap back (+Z)
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
// Build keycap texture WITH legend composited on top of image
// ============================================================
async function buildKeycapTexture({ color, legend, legendColor, legendFont, legendPosition, imageElement, uvOffset, uvScale }) {
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

  // Step 1: Draw background (color or image)
  if (imageElement && uvOffset && uvScale) {
    // Draw the portion of the image that maps to this keycap
    const imgW = imageElement.width;
    const imgH = imageElement.height;

    // uvOffset/uvScale define which portion of the image this keycap shows
    // ox, oy = top-left corner in image (0-1), sx, sy = size (0-1)
    const srcX = uvOffset[0] * imgW;
    const srcY = uvOffset[1] * imgH;
    const srcW = uvScale[0] * imgW;
    const srcH = uvScale[1] * imgH;

    ctx.drawImage(imageElement, srcX, srcY, srcW, srcH, 0, 0, 512, 512);
  } else {
    // Solid color background
    ctx.fillStyle = color || '#7c6bb0';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle highlight gradient
    const grad = ctx.createRadialGradient(256, 180, 20, 256, 200, 220);
    grad.addColorStop(0, 'rgba(255,255,255,0.10)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }

  // Step 2: Draw legend ON TOP of background (always visible)
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

    // Draw text shadow/outline for better visibility on images
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(legend, tx + 2, ty + 2);

    // Draw main text
    ctx.fillStyle = legendColor || '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
    ctx.fillText(legend, tx, ty);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Fallback version (sync, no image)
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
// Front face legend texture (sideprint) - MUCH LARGER for visibility
// ============================================================
async function buildFrontFaceLegendTexture({ legend, legendColor, legendFont }) {
  const fontFamily = legendFont || 'Inter';

  try {
    await Promise.race([
      document.fonts.load(`bold 300px "${fontFamily}"`),
      new Promise(resolve => setTimeout(resolve, 500))
    ]);
  } catch (e) {}

  const canvas = document.createElement('canvas');
  canvas.width = 512;  // Square canvas for better aspect ratio
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 512, 512);

  if (legend && legend.trim() !== '') {
    // MUCH larger font sizes - these get scaled down to fit the physical plane
    // Single char: 300px, short text: 200px, long text: 120px
    const fontSize = legend.length > 4 ? 100 : legend.length > 2 ? 150 : legend.length > 1 ? 220 : 300;

    // Strong shadow for depth and visibility
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 6;

    ctx.fillStyle = legendColor || '#ffffff';
    ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;
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

  // Image UV data for body geometry (in IMAGE coordinates, accounting for V-flip)
  const imageUvData = useMemo(() => {
    if (imageMode !== 'wrap') return null;
    // Convert to image coordinates where V=0 is top of image
    // The top face uses (u, 1-v), so we need to match that
    return {
      ox: adjustedUvOffset[0],
      oy: 1 - adjustedUvOffset[1] - adjustedUvScale[1], // Flip Y to match image coords
      sx: adjustedUvScale[0],
      sy: adjustedUvScale[1]
    };
  }, [imageMode, adjustedUvOffset, adjustedUvScale]);

  // Body geometry with cloth-drape UV mapping when image is applied
  const bodyGeo = useMemo(() => {
    return createBodyGeometry(w, h, profile, imageUvData);
  }, [w, h, profile, imageUvData]);

  const topGeo = useMemo(() => createTopFaceGeometry(w, h, profile), [w, h, profile]);

  // ============================================================
  // Load image as HTMLImageElement for compositing
  // ============================================================
  const [imageElement, setImageElement] = useState(null);

  useEffect(() => {
    if (!imageUrl || imageMode === 'none' || imageMode === 'perkey') {
      setImageElement(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImageElement(img);
    img.onerror = () => setImageElement(null);
    img.src = imageUrl;
    return () => { img.onload = null; img.onerror = null; };
  }, [imageUrl, imageMode]);

  // ============================================================
  // Top face texture - composites legend ON TOP of image
  // ============================================================
  const [topTexture, setTopTexture] = useState(() =>
    buildKeycapTextureFallback(color, displayText, legendColor, font, legendPosition)
  );

  useEffect(() => {
    let cancelled = false;

    const uvOff = (imageMode === 'wrap' || imageMode === 'tile') ? adjustedUvOffset : null;
    const uvSc = (imageMode === 'wrap' || imageMode === 'tile') ? adjustedUvScale : null;

    buildKeycapTexture({
      color,
      legend: displayText,
      legendColor,
      legendFont: font,
      legendPosition,
      imageElement: (imageMode === 'wrap' || imageMode === 'tile') ? imageElement : null,
      uvOffset: uvOff,
      uvScale: uvSc,
    }).then((tex) => {
      if (!cancelled) {
        setTopTexture(prev => {
          prev?.dispose();
          return tex;
        });
      }
    });
    return () => { cancelled = true; };
  }, [color, displayText, legendColor, font, legendPosition, imageMode, imageElement, adjustedUvOffset, adjustedUvScale]);

  // ============================================================
  // Side texture (for wrap mode, use image directly)
  // ============================================================
  const [sideTexture, setSideTexture] = useState(null);

  useEffect(() => {
    if (!imageUrl || imageMode !== 'wrap') {
      setSideTexture(null);
      return;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (tex) => {
        if (cancelled) return;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setSideTexture(tex);
      },
      undefined,
      () => { if (!cancelled) setSideTexture(null); }
    );
    return () => { cancelled = true; };
  }, [imageUrl, imageMode]);

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
  const activeTopTexture = perKeyTexture || topTexture;
  const activeSideTexture = (imageMode === 'wrap' && sideTexture) ? sideTexture : null;

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
    }).then((tex) => {
      if (!cancelled) {
        setFrontFaceTexture(prev => {
          prev?.dispose();
          return tex;
        });
      }
    });
    return () => { cancelled = true; };
  }, [showFrontLegend, displayText, legendColor, font]);

  // Front face geometry - MUCH LARGER to make text clearly visible
  const frontFaceGeometry = useMemo(() => {
    if (!showFrontLegend) return null;
    const normalizedProfile = normalizeProfile(profile);
    const spec = PROFILE_SPECS[normalizedProfile] || PROFILE_SPECS.cherry;
    const scale = 1 / 19.05;
    const W = spec.baseWidth * w * scale;
    const tw = spec.topWidth * w * scale;
    const H = spec.maxHeight * scale;
    // Make the plane cover most of the front face
    const faceWidth = (W + tw) / 2;  // Average of base and top width
    const faceHeight = H * 0.9;      // 90% of keycap height - much taller
    return new THREE.PlaneGeometry(faceWidth, faceHeight);  // No reduction, full width
  }, [showFrontLegend, profile, w]);

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
