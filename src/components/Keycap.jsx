import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { playKeycapSound } from '../utils/soundEngine';

// ============================================================
// TASK 6 — Darken a hex color by a luminance factor
// ============================================================
function darkenColor(hex, factor) {
  const c = hex || '#888888';
  const r = parseInt(c.slice(1, 3), 16);
  const g = parseInt(c.slice(3, 5), 16);
  const b = parseInt(c.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

// ============================================================
// TASK 3 — Cherry MX profile keycap geometry (body only: sides + bottom)
// ============================================================
function createBodyGeometry(widthU = 1, heightU = 1) {
  const scale = 1 / 19.05;
  const W = 17.5 * widthU * scale;
  const D = 17.5 * heightU * scale;
  const tw = 14.0 * widthU * scale;
  const td = 13.0 * heightU * scale;
  const H = 9.4 * scale;

  const positions = [];
  const uvs = [];
  const indices = [];

  function pushVert(x, y, z, u, v) {
    positions.push(x, y, z);
    uvs.push(u, v);
    return (positions.length / 3) - 1;
  }

  // --- BOTTOM FACE ---
  const b0 = pushVert(-W / 2, 0, -D / 2, 0, 0);
  const b1 = pushVert(W / 2, 0, -D / 2, 1, 0);
  const b2 = pushVert(W / 2, 0, D / 2, 1, 1);
  const b3 = pushVert(-W / 2, 0, D / 2, 0, 1);
  indices.push(b0, b2, b1, b0, b3, b2);

  // --- SIDE WALLS (4 sides, each a quad from base to top) ---
  const baseCorners = [
    [-W / 2, 0, -D / 2],
    [W / 2, 0, -D / 2],
    [W / 2, 0, D / 2],
    [-W / 2, 0, D / 2],
  ];
  const topCorners = [
    [-tw / 2, H, -td / 2],
    [tw / 2, H, -td / 2],
    [tw / 2, H, td / 2],
    [-tw / 2, H, td / 2],
  ];

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const bl = baseCorners[i];
    const br = baseCorners[j];
    const tr = topCorners[j];
    const tl = topCorners[i];
    const uL = i / 4;
    const uR = (i + 1) / 4;
    const v0 = pushVert(bl[0], bl[1], bl[2], uL, 0);
    const v1 = pushVert(br[0], br[1], br[2], uR, 0);
    const v2 = pushVert(tr[0], tr[1], tr[2], uR, 1);
    const v3 = pushVert(tl[0], tl[1], tl[2], uL, 1);
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
// TASK 3 — Cherry MX profile keycap top face geometry (dish + chamfers)
// ============================================================
function createTopFaceGeometry(widthU = 1, heightU = 1) {
  const scale = 1 / 19.05;
  const tw = 14.0 * widthU * scale;
  const td = 13.0 * heightU * scale;
  const H = 9.4 * scale;
  const dishDepth = 0.6 * scale;
  const chamfer = 0.7 * scale;
  const dishCols = 10;
  const dishRows = 6;

  const positions = [];
  const uvs = [];
  const indices = [];

  function pushVert(x, y, z, u, v) {
    positions.push(x, y, z);
    uvs.push(u, 1 - v);
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

      const dishOffset = -dishDepth * Math.sin(Math.PI * u);
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
  // Front edge: z = -td/2
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

  // Back edge: z = td/2
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

  // Left edge: x = -tw/2
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

  // Right edge: x = tw/2
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

  // Corner patches (4 triangles connecting chamfer strip endpoints to wall top corners)
  // Front-left corner
  {
    const corner = pushVert(-tw / 2, H, -td / 2, 0, 0);
    const dishCorner = topStartIdx; // row=0, col=0
    const frontEdge = pushVert(-tw / 2 + chamfer, H, -td / 2, 0, 0);
    const leftEdge = pushVert(-tw / 2, H, -td / 2 + chamfer, 0, 0);
    indices.push(corner, frontEdge, dishCorner);
    indices.push(corner, dishCorner, leftEdge);
  }
  // Front-right corner
  {
    const corner = pushVert(tw / 2, H, -td / 2, 1, 0);
    const dishCorner = topStartIdx + dishCols; // row=0, col=dishCols
    const frontEdge = pushVert(tw / 2 - chamfer, H, -td / 2, 1, 0);
    const rightEdge = pushVert(tw / 2, H, -td / 2 + chamfer, 1, 0);
    indices.push(corner, dishCorner, frontEdge);
    indices.push(corner, rightEdge, dishCorner);
  }
  // Back-left corner
  {
    const corner = pushVert(-tw / 2, H, td / 2, 0, 1);
    const dishCorner = topStartIdx + dishRows * (dishCols + 1); // row=dishRows, col=0
    const backEdge = pushVert(-tw / 2 + chamfer, H, td / 2, 0, 1);
    const leftEdge = pushVert(-tw / 2, H, td / 2 - chamfer, 0, 1);
    indices.push(corner, dishCorner, backEdge);
    indices.push(corner, leftEdge, dishCorner);
  }
  // Back-right corner
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
// TASK 4 — Bake legend into top-face canvas texture
// ============================================================
function buildKeycapTextureFallback(color, legend, legendColor, legendFont, legendPosition) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color || '#7c6bb0';
  ctx.fillRect(0, 0, 512, 512);
  if (legend && legend.trim() !== '') {
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

async function buildKeycapTexture({ color, legend, legendColor, legendFont, legendPosition }) {
  // Ensure font is loaded before drawing
  const fontFamily = legendFont || 'Inter';
  try {
    await document.fonts.load(`160px "${fontFamily}"`);
  } catch (e) {
    // fallback silently
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = color || '#7c6bb0';
  ctx.fillRect(0, 0, 512, 512);

  const grad = ctx.createRadialGradient(256, 180, 20, 256, 200, 220);
  grad.addColorStop(0, 'rgba(255,255,255,0.10)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  if (legend && legend.trim() !== '') {
    const posMap = {
      'center':       [256, 256],
      'top-center':   [256, 160],
      'top-left':     [110, 130],
      'top-right':    [400, 130],
      'bottom-left':  [110, 390],
      'bottom-right': [400, 390],
      'front':        [256, 400],
      'none':         null,
    };
    const pos = posMap[legendPosition] || posMap['center'];
    if (pos) {
      const [tx, ty] = pos;
      ctx.fillStyle = legendColor || '#ffffff';
      const fontSize = legend.length > 3 ? 100 : legend.length > 1 ? 130 : 160;
      ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.fillText(legend, tx, ty);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ============================================================
// Main Keycap component
// ============================================================
export default function Keycap({ keyId, label, x, y, w = 1, h = 1, rowHeight, rowTilt, uvOffset = [0, 0], uvScale = [1, 1], isSelected, isPerformanceMode, singleKeyMode = false, onClick }) {
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

  const perKeyDesigns = useStore(s => s.perKeyDesigns);
  const pkDesign = perKeyDesigns[keyId] || {};

  const color = pkDesign.color || globalColor;
  const legendColor = pkDesign.legendColor || globalLegendColor;
  let legendText = pkDesign.legendText || globalLegendText;
  const font = pkDesign.font || globalFont;
  const legendPosition = pkDesign.legendPosition || globalLegendPosition || 'top-center';

  const displayText = legendText && legendText.trim() !== '' ? legendText : label;
  const isSingleView = (x === undefined && y === undefined);

  // ============================================================
  // Separate body and top-face geometries (memoized per width/height)
  // ============================================================
  const bodyGeo = useMemo(() => createBodyGeometry(w, h), [w, h]);
  const topGeo = useMemo(() => createTopFaceGeometry(w, h), [w, h]);

  // ============================================================
  // TASK 4 — Baked legend texture (regenerated when design changes)
  // ============================================================
  const [topTexture, setTopTexture] = useState(() =>
    buildKeycapTextureFallback(color, displayText, legendColor, font, legendPosition)
  );

  useEffect(() => {
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
  }, [color, displayText, legendColor, font, legendPosition]);

  // ============================================================
  // Image texture handling
  // ============================================================
  const [tileTexture, setTileTexture] = useState(null);

  useEffect(() => {
    if (!imageUrl || imageMode === 'none' || imageMode === 'perkey') {
      setTileTexture(null);
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
        tex.repeat.set(1, 1);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setTileTexture(tex);
      },
      undefined,
      () => { if (!cancelled) setTileTexture(null); }
    );
    return () => { cancelled = true; };
  }, [imageUrl, imageMode]);

  const [wrapTexture, setWrapTexture] = useState(null);

  useEffect(() => {
    if (!tileTexture || imageMode !== 'wrap') {
      setWrapTexture(null);
      return;
    }
    const cloned = tileTexture.clone();
    cloned.wrapS = THREE.ClampToEdgeWrapping;
    cloned.wrapT = THREE.ClampToEdgeWrapping;
    cloned.offset.set(uvOffset[0], 1 - uvOffset[1] - uvScale[1]);
    cloned.repeat.set(uvScale[0], uvScale[1]);
    cloned.needsUpdate = true;
    setWrapTexture(cloned);
    return () => { cloned.dispose(); };
  }, [tileTexture, imageMode, uvOffset, uvScale]);

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

  // Priority: perKey > wrap > tile > baked legend texture
  const activeTopTexture = perKeyTexture || (imageMode === 'wrap' ? wrapTexture : (imageMode === 'tile' ? tileTexture : topTexture));

  // ============================================================
  // TASK 6 — Material presets
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

          {/* Body mesh: sides + bottom — darkened color, no texture */}
          <mesh geometry={bodyGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color={sideColor}
              {...sideMatProps}
            />
          </mesh>

          {/* Top face mesh: dish + chamfers — legend texture applied here */}
          <mesh geometry={topGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              map={activeTopTexture}
              color="#ffffff"
              {...topMatProps}
            />
          </mesh>

          {/* Cherry MX stem underneath */}
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