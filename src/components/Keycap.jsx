import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useStore } from '../store';
import { playKeycapSound } from '../utils/soundEngine';

const FONT_URLS = {
  'Inter': 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
  'Oswald': 'https://fonts.gstatic.com/s/oswald/v49/TK3_WkUHHAIjg75cFRf3bXL8LICs13NvgUFoZAaRliE.woff2',
  'Press Start 2P': 'https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2',
  'Share Tech Mono': 'https://fonts.gstatic.com/s/sharetechmono/v15/J7aHnp1uDWRBEqV98dVQztYldFc7pAsEIc3Xew.woff2',
  'Playfair Display': 'https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQ.woff2',
  'Nunito': 'https://fonts.gstatic.com/s/nunito/v25/XRXI3I6Li01BKofiOc5wtlZ2di8HDDshRTM.woff2',
  'Rajdhani': 'https://fonts.gstatic.com/s/rajdhani/v10/LDI2apCSOBg7S-QT7pasEcOsc-bGkqIw.woff2',
  'Bebas Neue': 'https://fonts.gstatic.com/s/bebasneuepro/v7/8QI8diHEiO0g-GjvHqjDHsD3k9Ax5rUr.woff2',
};

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

export default function Keycap({ keyId, label, x, y, w = 1, h = 1, rowHeight, rowTilt, uvOffset, uvScale, isSelected, isPerformanceMode, onClick }) {
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
  let legendText = pkDesign.legendText || globalLegendText || label;
  const font = pkDesign.font || globalFont;
  const legendPosition = pkDesign.legendPosition || globalLegendPosition || 'top-center';
  
  // Font URL for drei Text
  const fontUrl = FONT_URLS[font] || FONT_URLS['Inter'];

  const bodyGeo = useMemo(() => buildFrustumBody(), []);
  const topGeo = useMemo(() => buildTopDish(), []);

  const isSingleView = (x === undefined && y === undefined);
  const usePhysical = !isPerformanceMode || isSingleView;
  const MaterialCmp = usePhysical ? 'meshPhysicalMaterial' : 'meshStandardMaterial';
  
  // Image textures
  const tileTexture = useMemo(() => {
    if (imageMode !== 'tile' || !imageUrl) return null;
    try {
      const loader = new THREE.TextureLoader();
      const tex = loader.load(imageUrl);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 1);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch { return null; }
  }, [imageMode, imageUrl]);

  const wrapTexture = useMemo(() => {
    if (imageMode !== 'wrap' || !imageUrl) return null;
    try {
      const loader = new THREE.TextureLoader();
      const tex = loader.load(imageUrl);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch { return null; }
  }, [imageMode, imageUrl]);

  // Apply UV offsets for wrap mode
  if (wrapTexture && uvOffset && uvScale) {
    wrapTexture.offset.set(uvOffset[0], 1 - uvOffset[1] - uvScale[1]);
    wrapTexture.repeat.set(uvScale[0], uvScale[1]);
  }

  const perKeyImage = pkDesign?.imageUrl;
  const perKeyTexture = useMemo(() => {
    if (!perKeyImage) return null;
    try {
      const loader = new THREE.TextureLoader();
      const tex = loader.load(perKeyImage);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch { return null; }
  }, [perKeyImage]);

  // Resolve which texture to use (priority: perKey > tile/wrap > none)
  const activeTexture = perKeyTexture || (imageMode === 'tile' ? tileTexture : null) || (imageMode === 'wrap' ? wrapTexture : null) || null;
  // When texture is active, use white so it shows pure image colors
  const resolvedColor = activeTexture ? '#ffffff' : color;

  useFrame(({ clock }) => {
    if (isSingleView && meshRef.current) {
      meshRef.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.06;
      meshRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.3;
    } else if (meshRef.current) {
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
    color: '#' + topColorObj,
    roughness: isABS ? 0.2 : 0.7,
    metalness: 0.0,
    emissive: '#000000',
    emissiveIntensity: 0,
    ...(activeTexture ? { map: activeTexture } : {}),
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
  let legendSize = 0.28;
  if (legendPosition === 'top-left') { legendPos = [-0.25, topFaceY + 0.02, -0.2]; }
  if (legendPosition === 'top-right') { legendPos = [0.25, topFaceY + 0.02, -0.2]; }
  if (legendPosition === 'front') { legendPos = [0, 0.05, 0.48]; legendRot = [0, 0, 0]; legendSize = 0.2; }
  if (legendPosition === 'none') legendText = '';

  const scaleY = 1;
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
        if (!isSingleView) {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        if (!isSingleView) {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }
      }}
    >
      <group ref={meshRef} scale={[w, scaleY, h]}>
        
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

        {/* 2. Concave top dish surface */}
        <mesh geometry={topGeo} position={[0, topFaceY, -0.026]} castShadow receiveShadow>
          <MaterialCmp {...topMaterialParams} color={topMaterialParams.color} />
        </mesh>

        {/* 4. Cherry MX stem underneath */}
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

      {/* 3. Legend text */}
      {legendText && legendPosition !== 'none' && (
        <Text
          position={legendPos}
          rotation={legendRot}
          fontSize={legendSize}
          color={legendColor}
          anchorX="center"
          anchorY="middle"
          depthOffset={-1}
          renderOrder={1}
          outlineWidth={0.004}
          outlineColor="rgba(0,0,0,0.3)"
          font={fontUrl}
        >
          {typeof legendText === 'string' ? legendText : ''}
        </Text>
      )}
    </group>
  );
}