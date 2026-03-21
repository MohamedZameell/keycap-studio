import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useStore } from '../store';
import { playKeycapSound } from '../utils/soundEngine';

function buildFrustumBody() {
  try {
    const bottomW = 0.945;
    const height = 0.493;
    const topW = 0.787;
    
    const geo = new RoundedBoxGeometry(bottomW, height, bottomW, 8, 0.06);
    const pos = geo.attributes.position;
    
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const normalizedY = (y + height / 2) / height;
      const taper = 1 - (1 - topW/bottomW) * normalizedY;
      
      pos.setX(i, pos.getX(i) * taper);
      pos.setZ(i, pos.getZ(i) * taper);
    }
    
    geo.computeVertexNormals();
    return geo;
  } catch(e) {
    console.warn("Frustum build failed", e);
    return new THREE.BoxGeometry(0.945, 0.493, 0.945);
  }
}

function buildTopDish() {
  try {
    const topWidth = 0.787;
    const topDepth = 0.735;
    const geo = new THREE.PlaneGeometry(topWidth, topDepth, 20, 20);
    const pos = geo.attributes.position;
    
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x*x + y*y);
      const maxDist = Math.sqrt((topWidth/2)**2 + (topDepth/2)**2);
      const normalDist = dist / maxDist;
      const dip = -0.025 * (1 - normalDist * normalDist);
      pos.setZ(i, dip);
    }
    
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.rotateX(-Math.PI / 2);
    return geo;
  } catch(e) {
    console.warn("Top dish build failed", e);
    const plane = new THREE.PlaneGeometry(0.787, 0.735);
    plane.rotateX(-Math.PI/2);
    return plane;
  }
}

const TOP_SURFACE_W = 0.787;
const TOP_SURFACE_D = 0.735;

export default function Keycap({ keyId, label, x, y, w = 1, h = 1, rowHeight, rowTilt, uvOffset = [0,0], uvScale = [1,1], isSelected, isPerformanceMode, singleKeyMode = false, onClick }) {
  const meshRef = useRef();
  const topMatRef = useRef();
  
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

  // FIX 5 — Use label as fallback when legendText empty
  const displayText = legendText && legendText.trim() !== '' ? legendText : label;
  
  const bodyGeo = useMemo(() => buildFrustumBody(), []);
  const topGeo = useMemo(() => buildTopDish(), []);

  const isSingleView = (x === undefined && y === undefined);
  const usePhysical = !isPerformanceMode || isSingleView;
  const MaterialCmp = usePhysical ? 'meshPhysicalMaterial' : 'meshStandardMaterial';

  // ============================================================
  // FIX 5 — Unified CanvasTexture using displayText (label fallback)
  // Uses browser's own Canvas2D font rendering — zero crash risk
  // ============================================================
  const legendTexture = useMemo(() => {
    if (!displayText) return null;
    
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, size, size);
    
    // Font must already be loaded in CSS via Google Fonts @import
    ctx.font = `bold 110px "${font}", sans-serif`;
    ctx.fillStyle = legendColor || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(displayText).slice(0, 6), size / 2, size / 2);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [displayText, legendColor, font]);

  // ============================================================
  // FIX 2 — Image textures with callback form of TextureLoader
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
      (err) => {
        console.error('Texture load failed:', err);
        if (!cancelled) setTileTexture(null);
      }
    );
    return () => { 
      cancelled = true; 
      setTileTexture(old => { if(old) old.dispose(); return null; });
    };
  }, [imageUrl, imageMode]);

  // TASK 1 — Wrap mode: clone texture per-key with correct UV slice
  // Each key needs its own texture clone so offset/repeat don't conflict
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
    return () => { 
      setWrapTexture(old => { if(old) old.dispose(); return null; }); 
      cloned.dispose(); 
    };
  }, [tileTexture, imageMode, uvOffset, uvScale]);

  // ============================================================
  // FIX 3 — Per-key image texture with callback
  // ============================================================
  const perKeyImage = pkDesign?.imageUrl;
  const [perKeyTexture, setPerKeyTexture] = useState(null);

  useEffect(() => {
    if (!perKeyImage) {
      setPerKeyTexture(null);
      return;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(perKeyImage, (tex) => {
      if (cancelled) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      setPerKeyTexture(tex);
    });
    return () => {
      cancelled = true;
      setPerKeyTexture(old => { if(old) old.dispose(); return null; });
    };
  }, [perKeyImage]);

  // Priority: perKey > wrap > tile > none
  const activeTexture = perKeyTexture || (imageMode === 'wrap' ? wrapTexture : (imageMode === 'tile' ? tileTexture : null));
  // FIX 1 — Body always uses keycap color; only the dish gets white when textured
  const resolvedColor = color;

  // Imperative material update — the root-cause fix for textures not appearing.
  // R3F's dynamic component pattern (<MaterialCmp>) doesn't reliably re-create
  // the material when map changes. Imperative ref mutation works every time.
  useEffect(() => {
    if (!topMatRef.current) return;
    if (activeTexture) {
      topMatRef.current.map = activeTexture;
      topMatRef.current.color.set('#ffffff');
    } else {
      topMatRef.current.map = null;
      const topCol = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.05);
      topMatRef.current.color.copy(topCol);
    }
    topMatRef.current.needsUpdate = true;
  }, [activeTexture, color]);

  // Animation: singleKeyMode gets gentle bob + slow Y spin, keyboard keys stay still
  // FIX 3 — Single key animation: force flat, slow spin + gentle bob
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (singleKeyMode) {
      meshRef.current.rotation.x = 0;  // force flat, no row tilt
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

  const isBg = keyId === 'bg' || keyId === 'bg2';

  // Material preset overrides
  const isABS = materialPreset === 'abs';
  const presetRoughness = isBg ? 0.4 : (isABS ? 0.35 : 0.72);
  const presetClearcoat = isBg ? 0.2 : (isABS ? 0.04 : 0.0);
  const presetEnvMap = isBg ? 1.5 : (isABS ? 0.2 : 0.12);

  const bodyMaterialParams = {
    color: resolvedColor,
    roughness: presetRoughness,
    metalness: 0.0,
    emissive: '#000000',
    emissiveIntensity: 0,
    ...(usePhysical ? { 
      clearcoat: presetClearcoat, 
      clearcoatRoughness: 0.4, 
      reflectivity: 0.5, 
      envMapIntensity: presetEnvMap 
    } : {})
  };
  
  const topColorObj = new THREE.Color(resolvedColor).lerp(new THREE.Color('#ffffff'), 0.05).getHexString();
  const topMaterialParams = {
    color: activeTexture ? '#ffffff' : ('#' + topColorObj),
    map: activeTexture || undefined,
    roughness: isABS ? 0.2 : 0.7,
    metalness: 0.0,
    emissive: '#000000',
    emissiveIntensity: 0,
    ...(usePhysical ? { clearcoat: isABS ? 0.06 : 0.0, clearcoatRoughness: 0.35, envMapIntensity: isABS ? 0.3 : 0.15 } : {})
  };

  const stemMaterialParams = {
    color: '#0a0a0a',
    roughness: 0.8,
    metalness: 0.0,
    emissive: '#000000',
    emissiveIntensity: 0
  };

  const topFaceY = 0.2465;
  let legendPos = [0, topFaceY + 0.02, -0.026];
  let legendRot = [-Math.PI / 2, 0, 0];
  if (legendPosition === 'top-left') { legendPos = [-0.25, topFaceY + 0.02, -0.2]; }
  if (legendPosition === 'top-right') { legendPos = [0.25, topFaceY + 0.02, -0.2]; }
  if (legendPosition === 'front') { legendPos = [0, 0.05, 0.48]; legendRot = [0, 0, 0]; }

  const px = x !== undefined ? x * 1.08 : 0;
  const pz = y !== undefined ? y * 1.08 : 0;

  return (
    <group 
      position={[px, 0, pz]}
      rotation={[rowTilt || 0, 0, 0]}
      onClick={(e) => {
        if(onClick) {
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
      <group ref={meshRef} scale={[w, 1, h]}>
        
        {/* Selected Key Highlight */}
        {isSelected && (
          <mesh scale={[1.04, 1.08, 1.04]} geometry={bodyGeo}>
            <meshStandardMaterial 
              color="#6c63ff"
              emissive="#000000"
              emissiveIntensity={0}
              wireframe={false}
              transparent
              opacity={0.25}
              side={THREE.BackSide}
            />
          </mesh>
        )}

        {/* 1. Frustum body */}
        <mesh geometry={bodyGeo} castShadow receiveShadow>
          <MaterialCmp {...bodyMaterialParams} color={bodyMaterialParams.color} />
        </mesh>

        {/* 2. Concave top dish surface — image texture applied here */}
        <mesh geometry={topGeo} position={[0, topFaceY, -0.026]} castShadow receiveShadow>
          <MaterialCmp ref={topMatRef} {...topMaterialParams} color={topMaterialParams.color} />
        </mesh>

        {/* Cherry MX stem underneath */}
        <group position={[0, -0.3865, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.24, 0.44]} />
            <MaterialCmp {...stemMaterialParams} color={stemMaterialParams.color} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[0.44, 0.24, 0.14]} />
            <MaterialCmp {...stemMaterialParams} color={stemMaterialParams.color} />
          </mesh>
        </group>
      </group>
      </group>

      {/* Legend via CanvasTexture — works for ALL fonts */}
      {legendPosition !== 'none' && displayText && legendTexture && (
        <mesh
          position={legendPos}
          rotation={legendRot}
          renderOrder={2}
        >
          <planeGeometry args={[TOP_SURFACE_W * 0.72, TOP_SURFACE_D * 0.72]} />
          <meshBasicMaterial
            map={legendTexture}
            transparent={true}
            depthWrite={false}
            alphaTest={0.01}
            polygonOffset={true}
            polygonOffsetFactor={-4}
            polygonOffsetUnits={-4}
          />
        </mesh>
      )}
    </group>
  );
}