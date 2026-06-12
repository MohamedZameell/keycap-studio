import React, { useRef, useMemo, useState, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import { useStore } from '../store';
import { playKeycapSound } from '../utils/soundEngine';
import { getKeyColors } from '../data/colorways';
import { getLegendGlyph, GLYPH_METRICS } from '../data/keysimLegends';
import { KEY_UNIT } from '../data/layouts';

// ============================================================
// LEGENDS FONT (keysim icon font: pre-composed GMK key legends)
// Textures drawn before the font arrives use the text fallback;
// components re-key their texture cache entry once it loads.
// ============================================================
let legendsFontLoaded = false;
const legendsFontPromise = (() => {
  try {
    const ff = new FontFace('legends', `url(${import.meta.env.BASE_URL}fonts/legends.woff)`);
    return ff.load().then((f) => { document.fonts.add(f); legendsFontLoaded = true; }).catch(() => {});
  } catch (e) {
    return Promise.resolve();
  }
})();

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
  // cherry base 18.1mm = GMK footprint -> 0.05u gap at 19.05mm pitch (keysim GUTTER)
  cherry: { maxHeight: 9.4, dishType: 'cylindrical', dishDepth: 0.6, topWidth: 14.0, topDepth: 13.0, baseWidth: 18.1, baseDepth: 18.1, chamfer: 0.7, uniform: false, rowHeights: [1.000, 1.000, 0.904, 0.787, 0.904, 0.904], rowTilts: [0.122, 0.122, 0.087, 0, -0.105, -0.105] },
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
// ROUNDED CAP GEOMETRY (Path B part 2)
// Real rounded corners + a true quarter-round fillet from the walls
// into the top plate — replaces the sharp box for the solid-color
// path. Image-wrap mode keeps the box builders below (their drape
// UV layout is baked into flat quads and wrap is a separate look).
//
// UV contract preserved from the box builders:
// - walls: u = perimeter fraction, v = 0 base -> 1 top (side ramp
//   texture is white at v=1)
// - top: u,v span the WHOLE top INCLUDING the fillet ring with the
//   same V flip as before — so the painted shine strips land ON the
//   rounded edge and legend metrics keep their anchor.
// All normals are analytic (wall tilt, fillet arc, dish derivative):
// no computeVertexNormals, no UV-seam shading splits.
// ============================================================
const CAP_FILLET_MM = 1.3;   // top-edge fillet radius
const CAP_BASE_R_MM = 1.2;   // corner radius at the base
const CAP_TOP_R_MM = 2.4;    // corner radius at the top plate
const CAP_CORNER_SEGS = 5;   // outline samples per corner arc
const CAP_FILLET_SEGS = 4;   // rings along the fillet arc
const CAP_PLATE_T = [0.08, 0.3, 0.6, 0.85]; // plate ring insets (first = old chamfer-strip width)

// Rounded-rect outline in XZ with outward 2D normals. Constant point
// count for any radius so rings stitch 1:1.
function roundedOutline(hw, hd, r, segs) {
  const rr = Math.max(0.0005, Math.min(r, hw - 0.0005, hd - 0.0005));
  const cx = hw - rr, cz = hd - rr;
  const corners = [
    [cx, cz, 0], [-cx, cz, Math.PI / 2], [-cx, -cz, Math.PI], [cx, -cz, Math.PI * 1.5],
  ];
  const pts = [];
  for (const [ox, oz, a0] of corners) {
    for (let k = 0; k <= segs; k++) {
      const th = a0 + (k / segs) * (Math.PI / 2);
      pts.push({ x: ox + rr * Math.cos(th), z: oz + rr * Math.sin(th), nx: Math.cos(th), nz: Math.sin(th) });
    }
  }
  return pts;
}

// Shared per-perimeter-point frame: base point, wall-top point, wall
// tilt angle and the fillet arc center — body and top builders both
// consume it so their boundary rings coincide exactly.
function buildCapFrame(widthU, heightU, profile) {
  const spec = PROFILE_SPECS[normalizeProfile(profile)] || PROFILE_SPECS.cherry;
  const scale = 1 / 19.05;
  const W = spec.baseWidth * widthU * scale;
  const D = spec.baseDepth * heightU * scale;
  const tw = spec.topWidth * widthU * scale;
  const td = spec.topDepth * heightU * scale;
  const H = spec.maxHeight * scale;
  const f = CAP_FILLET_MM * scale;
  const base = roundedOutline(W / 2, D / 2, CAP_BASE_R_MM * scale, CAP_CORNER_SEGS);
  // Wall outline extrapolated to y=H sits a fillet-radius outside the
  // top plate, so after the fillet inset the plate lands at topWidth.
  const ext = roundedOutline(tw / 2 + f, td / 2 + f, (CAP_TOP_R_MM + CAP_FILLET_MM) * scale, CAP_CORNER_SEGS);
  const pts = base.map((b, i) => {
    const e = ext[i];
    const tx = e.x - b.x, tz = e.z - b.z;
    const taper = -(tx * e.nx + tz * e.nz); // wall lean (inward, >0)
    const alpha = Math.atan2(taper, H);     // wall tilt from vertical plane
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    // Fillet is tangent to the tilted wall: arc spans alpha -> PI/2,
    // ends horizontal at y=H. Wall stops where the arc begins.
    const yTop = H - f * (1 - sa);
    const s = yTop / H;
    const wx = b.x + tx * s, wz = b.z + tz * s;
    return {
      bx: b.x, bz: b.z, nx: e.nx, nz: e.nz, alpha, ca, sa, yTop, wx, wz,
      ax: wx - f * ca * e.nx, az: wz - f * ca * e.nz, ay: yTop - f * sa, // arc center
    };
  });
  return { spec, scale, H, f, NP: pts.length, pts };
}

// Fraction of the top texture canvas (per side) that lies on the fillet
// ring. Legends are drawn inset by this so they anchor to the flat plate
// like they did when the canvas spanned only topWidth (shine strips stay
// full-canvas — they belong ON the fillet).
const topInsetCache = new Map();
function getTopInset(profile, w, h) {
  const key = `${profile}-${w}-${h}`;
  if (topInsetCache.has(key)) return topInsetCache.get(key);
  const F = buildCapFrame(w, h, profile);
  let mx = 0, mz = 0;
  for (const p of F.pts) { mx = Math.max(mx, Math.abs(p.wx)); mz = Math.max(mz, Math.abs(p.wz)); }
  const tw2 = F.spec.topWidth * w * F.scale / 2;
  const td2 = F.spec.topDepth * h * F.scale / 2;
  const inset = { ix: Math.max(0, (mx - tw2) / (2 * mx)), iy: Math.max(0, (mz - td2) / (2 * mz)) };
  topInsetCache.set(key, inset);
  return inset;
}

function createRoundedBodyGeometry(widthU, heightU, profile) {
  const F = buildCapFrame(widthU, heightU, profile);
  const { NP, pts } = F;
  const positions = [], normals = [], uvs = [], indices = [];
  const push = (x, y, z, nx, ny, nz, u, v) => {
    positions.push(x, y, z); normals.push(nx, ny, nz); uvs.push(u, v);
    return positions.length / 3 - 1;
  };

  // Closed base (hidden inside the case, keeps the silhouette solid)
  const c0 = push(0, 0, 0, 0, -1, 0, 0.5, 0.5);
  const baseRing = pts.map(p => push(p.bx, 0, p.bz, 0, -1, 0, 0.5, 0.5));
  for (let i = 0; i < NP; i++) indices.push(c0, baseRing[i], baseRing[(i + 1) % NP]);

  // Wall: two rings, seam vertex duplicated for the u wrap
  const bot = [], top = [];
  for (let i = 0; i <= NP; i++) {
    const p = pts[i % NP];
    const u = i / NP;
    const nx = p.ca * p.nx, ny = p.sa, nz = p.ca * p.nz;
    bot.push(push(p.bx, 0, p.bz, nx, ny, nz, u, 0));
    top.push(push(p.wx, p.yTop, p.wz, nx, ny, nz, u, 1));
  }
  for (let i = 0; i < NP; i++) {
    indices.push(bot[i], top[i], top[i + 1], bot[i], top[i + 1], bot[i + 1]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

function createRoundedTopGeometry(widthU, heightU, profile) {
  const F = buildCapFrame(widthU, heightU, profile);
  const { spec, scale, H, f, NP, pts } = F;
  const dishDepth = spec.dishDepth * scale;
  const spherical = spec.dishType === 'spherical';

  // UV box = bounding box of the fillet's outer ring (the whole top)
  let mx = 0, mz = 0;
  for (const p of pts) { mx = Math.max(mx, Math.abs(p.wx)); mz = Math.max(mz, Math.abs(p.wz)); }
  const setUV = (x, z) => [(x + mx) / (2 * mx), 1 - (z + mz) / (2 * mz)];

  // Plate bounds (fillet inner ring) drive the dish span
  let pbx = 0, pbz = 0;
  for (const p of pts) { pbx = Math.max(pbx, Math.abs(p.ax)); pbz = Math.max(pbz, Math.abs(p.az)); }
  const dish = (x, z) => {
    const u = Math.min(1, Math.max(0, (x + pbx) / (2 * pbx)));
    const v = Math.min(1, Math.max(0, (z + pbz) / (2 * pbz)));
    const su = Math.sin(Math.PI * u), sv = Math.sin(Math.PI * v);
    const depth = spherical ? dishDepth * su * sv : dishDepth * su;
    // analytic partials for the normal
    const du = Math.PI / (2 * pbx) * Math.cos(Math.PI * u) * (spherical ? sv : 1) * dishDepth;
    const dv = spherical ? Math.PI / (2 * pbz) * Math.cos(Math.PI * v) * su * dishDepth : 0;
    return { y: H - depth, dx: du, dz: dv }; // y(x,z); note y' = +d(depth)/dx
  };

  const positions = [], normals = [], uvs = [], indices = [];
  const push = (x, y, z, nx, ny, nz) => {
    const [u, v] = setUV(x, z);
    positions.push(x, y, z); normals.push(nx, ny, nz); uvs.push(u, v);
    return positions.length / 3 - 1;
  };
  const quadRow = (ringA, ringB) => {
    for (let i = 0; i < NP; i++) {
      indices.push(ringA[i], ringB[i], ringB[i + 1], ringA[i], ringB[i + 1], ringA[i + 1]);
    }
  };

  // Fillet rings: arc from the wall tangent (alpha) to horizontal
  let prev = null;
  for (let k = 0; k <= CAP_FILLET_SEGS; k++) {
    const ring = [];
    for (let i = 0; i <= NP; i++) {
      const p = pts[i % NP];
      const th = p.alpha + (k / CAP_FILLET_SEGS) * (Math.PI / 2 - p.alpha);
      const ct = Math.cos(th), st = Math.sin(th);
      ring.push(push(p.ax + f * ct * p.nx, p.ay + f * st, p.az + f * ct * p.nz, ct * p.nx, st, ct * p.nz));
    }
    if (prev) quadRow(prev, ring);
    prev = ring;
  }

  // Plate rings shrink toward the center; first one is a chamfer-width
  // step in from the fillet so the dish "drops" off the flat rim like
  // the old slanted chamfer strips did.
  for (const t of CAP_PLATE_T) {
    const ring = [];
    for (let i = 0; i <= NP; i++) {
      const p = pts[i % NP];
      const x = p.ax * (1 - t), z = p.az * (1 - t);
      const d = dish(x, z);
      const inv = 1 / Math.hypot(d.dx, 1, d.dz);
      ring.push(push(x, d.y, z, d.dx * inv, inv, d.dz * inv));
    }
    quadRow(prev, ring);
    prev = ring;
  }

  // Center fan closes the dish
  const dc = dish(0, 0);
  const center = push(0, dc.y, 0, 0, 1, 0);
  for (let i = 0; i < NP; i++) indices.push(prev[i], center, prev[i + 1]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

// ============================================================
// Keycap body geometry with GLOBAL UV coordinates for image wrap
// uvBounds: { uMin, uMax, vMin, vMax, drape } in texture space
// ============================================================
function createBodyGeometry(widthU = 1, heightU = 1, profile = 'cherry', uvBounds = null) {
  // Solid-color path gets the rounded cap; wrap mode needs the box
  // builder's drape UV layout.
  if (!uvBounds) return createRoundedBodyGeometry(widthU, heightU, profile);
  return createBodyGeometryBox(widthU, heightU, profile, uvBounds);
}

function createBodyGeometryBox(widthU = 1, heightU = 1, profile = 'cherry', uvBounds = null) {
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
  if (!uvBounds) return createRoundedTopGeometry(widthU, heightU, profile);
  return createTopFaceGeometryBox(widthU, heightU, profile, uvBounds);
}

function createTopFaceGeometryBox(widthU = 1, heightU = 1, profile = 'cherry', uvBounds = null) {
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
// Painted shading — keysim's texture.js technique (illustration,
// not photoreal): the premium look is baked into the canvas, the
// 3D lighting only adds gentle variation on top.
// Canvas orientation on the top face: y=0 = back edge of the key,
// y=height = front edge (toward typist), x = key left -> right.
// ============================================================
function paintKeycapShading(ctx, canvasWidth, canvasHeight, pxPerU, convexTop) {
  // Sculpt gradient. Keysim paints this at 0.2/0.15 over a flat top;
  // our geometry has a real dish that real lights already shade, so go
  // half-strength — the paint and the lighting sum to the same read.
  let sculpt;
  if (convexTop) {
    // Spacebar: convex front-back curve — dark back rolling to lit front
    sculpt = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    sculpt.addColorStop(0, 'rgba(0,0,0,0.08)');
    sculpt.addColorStop(0.5, 'rgba(128,128,128,0)');
    sculpt.addColorStop(1, 'rgba(255,255,255,0.08)');
  } else {
    // Cylindrical dish curves left-right: lit left wall of the dish
    // falling to shadow on the right
    sculpt = ctx.createLinearGradient(0, 0, canvasWidth, 0);
    sculpt.addColorStop(0, 'rgba(255,255,255,0.10)');
    sculpt.addColorStop(0.4, 'rgba(255,255,255,0)');
    sculpt.addColorStop(0.6, 'rgba(0,0,0,0)');
    sculpt.addColorStop(1, 'rgba(0,0,0,0.08)');
  }
  ctx.fillStyle = sculpt;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Edge shines: painted specular for the rounded edges our geometry
  // doesn't have. Full keysim strength — nothing else provides this.
  const shineOpacity = 0.4;

  // Front lip (bottom 3% of canvas), fading in/out along its length
  const front = ctx.createLinearGradient(0, 0, canvasWidth, 0);
  front.addColorStop(0, 'rgba(255,255,255,0)');
  front.addColorStop(0.03, 'rgba(255,255,255,0)');
  front.addColorStop(0.07, `rgba(255,255,255,${0.6 * shineOpacity})`);
  front.addColorStop(0.8, `rgba(255,255,255,${0.6 * shineOpacity})`);
  front.addColorStop(0.95, 'rgba(255,255,255,0)');
  ctx.fillStyle = front;
  ctx.fillRect(0, canvasHeight * 0.97, canvasWidth, canvasHeight * 0.03);

  // Right edge (fixed 0.04u wide regardless of key width), brightest
  // toward the front-right corner
  const side = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  side.addColorStop(0, 'rgba(255,255,255,0)');
  side.addColorStop(0.03, 'rgba(255,255,255,0)');
  side.addColorStop(0.15, `rgba(255,255,255,${0.5 * shineOpacity})`);
  side.addColorStop(0.5, `rgba(255,255,255,${0.7 * shineOpacity})`);
  side.addColorStop(0.85, `rgba(255,255,255,${1.1 * shineOpacity})`);
  side.addColorStop(0.9, `rgba(255,255,255,${0.7 * shineOpacity})`);
  side.addColorStop(0.95, 'rgba(255,255,255,0)');
  side.addColorStop(1, 'rgba(255,255,255,0)');
  const stripX = canvasWidth - pxPerU * 0.04;
  ctx.fillStyle = side;
  ctx.fillRect(stripX, 0, canvasWidth - stripX, canvasHeight);
}

// ============================================================
// Side-wall texture: base color + vertical light ramp (lit at the
// top lip, falling into shadow at the plate) + faint molded-plastic
// grain (keysim uses a tiled noise aoMap at 0.4 for the same read).
// All four walls map the full canvas; real lights differentiate them.
// ============================================================
function buildKeycapSideTexture(color) {
  const s = 128;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color || '#7c6bb0';
  ctx.fillRect(0, 0, s, s);

  const ramp = ctx.createLinearGradient(0, 0, 0, s);
  ramp.addColorStop(0, 'rgba(255,255,255,0.10)');
  ramp.addColorStop(0.18, 'rgba(255,255,255,0)');
  ramp.addColorStop(0.55, 'rgba(0,0,0,0.05)');
  ramp.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = ramp;
  ctx.fillRect(0, 0, s, s);

  // Deterministic grain (seeded per color) so cache rebuilds don't shimmer
  let seed = 2166136261;
  for (let i = 0; i < (color || '').length; i++) seed = (seed ^ color.charCodeAt(i)) * 16777619 >>> 0;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 300; i++) {
    const x = rand() * s, y = rand() * s, lite = rand() > 0.5;
    ctx.fillStyle = lite ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)';
    ctx.fillRect(x, y, 1 + rand(), 1 + rand());
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildKeycapTextureFallback(color, legend, legendColor, font, legendPosition, keyWidth = 1, keyHeight = 1, inset = null) {
  // 256/u: enough for crisp legend glyphs, still cheap to rasterize
  const baseSize = 256;
  const canvasWidth = Math.round(baseSize * keyWidth);
  const canvasHeight = Math.round(baseSize * keyHeight);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color || '#7c6bb0';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Spacebar (only unlabeled wide key) is convex; everything else concave
  const convexTop = (!legend || !legend.trim()) && keyWidth >= 2;
  paintKeycapShading(ctx, canvasWidth, canvasHeight, baseSize, convexTop);

  if (legend && legend.trim() && legendPosition !== 'hidden' && legendPosition !== 'none' && legendPosition !== 'front') {
    // Rounded geometry: the canvas spans fillet + plate; draw the legend
    // in plate space so it doesn't ride the rounded edge.
    ctx.save();
    if (inset) {
      ctx.translate(inset.ix * canvasWidth, inset.iy * canvasHeight);
      ctx.scale(1 - 2 * inset.ix, 1 - 2 * inset.iy);
    }
    // GMK glyph path: pre-composed legend from the keysim icon font, drawn
    // at keysim's metrics (absolute per-1u — wide keys keep the same size
    // and top-left anchor like real GMK). Only when the user hasn't picked
    // a custom font or a non-default position.
    const isDefaultPos = !legendPosition || legendPosition === 'top-left' || legendPosition === 'top-center';
    const isDefaultFont = !font || font === 'Inter' || font === 'legends';
    const glyph = (isDefaultPos && isDefaultFont && legendsFontLoaded) ? getLegendGlyph(legend.trim()) : null;

    ctx.fillStyle = legendColor || '#ffffff';
    if (glyph) {
      ctx.font = `${Math.round(baseSize * GLYPH_METRICS.fontSize)}px legends`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(glyph, Math.round(baseSize * GLYPH_METRICS.x), Math.round(baseSize * GLYPH_METRICS.baseline));
    } else {
      // Plain text fallback (custom legend text / custom font / unmapped label)
      const posMap = {
        'center': [canvasWidth / 2, canvasHeight / 2],
        'top-center': [canvasWidth / 2, canvasHeight * 0.31],
        'top-left': [canvasWidth * 0.22, canvasHeight * 0.28],
        'top-right': [canvasWidth * 0.78, canvasHeight * 0.28],
        'bottom-left': [canvasWidth * 0.22, canvasHeight * 0.76],
        'bottom-right': [canvasWidth * 0.78, canvasHeight * 0.76],
      };
      const [tx, ty] = posMap[legendPosition] || posMap['center'];
      const baseFont = canvasHeight * 0.35;
      const fontSize = legend.length > 5 ? baseFont * 0.5 :
                       legend.length > 3 ? baseFont * 0.65 :
                       legend.length > 1 ? baseFont * 0.85 : baseFont;
      ctx.font = `bold ${Math.round(fontSize)}px "${font || 'Inter'}", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(legend, tx, ty);
    }
    ctx.restore();
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
    colorwayDraft,
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
    colorwayDraft: s.colorwayDraft,
  })));

  // Per-key design — scoped to THIS keyId so editing one key doesn't re-render every other key.
  const pkDesign = useStore(s => s.perKeyDesigns[keyId] || EMPTY_DESIGN);

  // Get colors - priority: per-key > colorway draft (editor live preview) > colorway > global
  const colorwayColors = useMemo(() => {
    if (colorwayDraft) {
      return getKeyColors(colorwayDraft, label);
    }
    if (selectedColorway) {
      return getKeyColors(selectedColorway, label);
    }
    return null;
  }, [colorwayDraft, selectedColorway, label]);

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

  // Re-key textures once the legends font arrives so glyph legends replace
  // the text-fallback ones drawn during the first frames.
  const [legendFontV, setLegendFontV] = useState(legendsFontLoaded ? 1 : 0);
  useEffect(() => {
    if (!legendsFontLoaded) {
      let on = true;
      legendsFontPromise.then(() => { if (on) setLegendFontV(1); });
      return () => { on = false; };
    }
  }, []);

  // Solid color texture - use simple sync version for speed.
  // profile is in the key because the legend inset (fillet fraction) depends on it.
  const textureKey = `${color}-${displayText}-${legendColor}-${legendPosition}-${font}-${legendFontV}-${w}-${h}-${profile}`;
  const solidTexture = useMemo(() => {
    if (imageMode === 'wrap') return null;
    return getCachedTexture(textureKey, () =>
      buildKeycapTextureFallback(color, displayText, legendColor, font, legendPosition, w, h, getTopInset(profile, w, h))
    );
  }, [color, displayText, legendColor, font, legendPosition, imageMode, w, h, profile, textureKey]);

  // Painted side-wall texture — per-key solid path only (wrap mode drapes the image)
  const sideTexture = useMemo(() => {
    if (imageMode === 'wrap') return null;
    return getCachedTexture(`side-${color}`, () => buildKeycapSideTexture(color));
  }, [color, imageMode]);

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

  const px = x !== undefined ? x * KEY_UNIT : 0;
  const pz = y !== undefined ? y * KEY_UNIT : 0;

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

          {/* Body - sides: painted wall texture in solid mode, flat color under image wrap */}
          <mesh geometry={bodyGeo} castShadow receiveShadow>
            <meshStandardMaterial
              color={sideTexture ? '#ffffff' : sideColor}
              map={sideTexture}
              roughness={isABS ? 0.42 : 0.78}
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
                roughness={isABS ? 0.42 : 0.78}
                metalness={0}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Top face. The canvas map already carries the exact key color —
              material color must stay white or three multiplies them (key
              renders color² and painted highlights get tinted). */}
          <mesh geometry={topGeo} castShadow receiveShadow>
            <meshStandardMaterial
              color={imageMode !== 'wrap' && activeTexture ? '#ffffff' : color}
              map={imageMode !== 'wrap' ? activeTexture : null}
              roughness={isABS ? 0.45 : 0.93}
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
                roughness={isABS ? 0.45 : 0.93}
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
