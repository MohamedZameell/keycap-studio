import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useStore } from '../store';

function buildFrustumBody() {
  try {
    const bottomW = 0.945;
    const height = 0.493;
    const topW = 0.787;
    
    // Create smoothly rounded box
    const geo = new RoundedBoxGeometry(bottomW, height, bottomW, 8, 0.06);
    const pos = geo.attributes.position;
    
    // Apply linear taper scale mapping Y bounds to scaling factor
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const normalizedY = (y + height / 2) / height; // 0 to 1
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

export default function Keycap({ keyId, label, x, y, w = 1, h = 1, isSelected, isPerformanceMode, onClick }) {
  const meshRef = useRef();
  
  const [hovered, setHovered] = useState(false);
  const globalColor = useStore(s => s.globalColor);
  const globalLegendColor = useStore(s => s.globalLegendColor);
  const globalLegendText = useStore(s => s.globalLegendText);
  const globalFont = useStore(s => s.globalFont);
  
  const perKeyDesigns = useStore(s => s.perKeyDesigns);
  const pkDesign = perKeyDesigns[keyId] || {};
  
  const color = pkDesign.color || globalColor;
  const legendColor = pkDesign.legendColor || globalLegendColor;
  let legendText = pkDesign.legendText || globalLegendText || label;
  const font = pkDesign.font || globalFont;
  const legendPosition = pkDesign.legendPosition || 'top-center';
  
  const bodyGeo = useMemo(() => buildFrustumBody(), []);
  const topGeo = useMemo(() => buildTopDish(), []);

  const isSingleView = (x === undefined && y === undefined);
  const usePhysical = !isPerformanceMode || isSingleView;
  const MaterialCmp = usePhysical ? 'meshPhysicalMaterial' : 'meshStandardMaterial';
  
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

  const isBg = keyId === 'bg';
  const bodyMaterialParams = {
    color: color,
    roughness: isBg ? 0.4 : 0.55,
    metalness: 0.0,
    emissive: '#000000',
    emissiveIntensity: 0,
    ...(usePhysical ? { 
      clearcoat: isBg ? 0.2 : 0.1, 
      clearcoatRoughness: 0.4, 
      reflectivity: 0.5, 
      envMapIntensity: isBg ? 1.5 : 0.6 
    } : {})
  };
  
  const topColorObj = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.05).getHexString();
  const topMaterialParams = {
    color: '#' + topColorObj,
    roughness: 0.45,
    metalness: 0.0,
    emissive: '#000000',
    emissiveIntensity: 0,
    ...(usePhysical ? { clearcoat: 0.12, clearcoatRoughness: 0.35, envMapIntensity: 0.7 } : {})
  };

  const stemMaterialParams = {
    color: '#0a0a0a',
    roughness: 0.8,
    metalness: 0.0
  };

  const topFaceY = 0.2465;
  let legendPos = [0, topFaceY + 0.02, -0.026];
  if (legendPosition === 'top-left') legendPos = [-0.25, topFaceY + 0.02, -0.2];
  if (legendPosition === 'top-right') legendPos = [0.25, topFaceY + 0.02, -0.2];
  if (legendPosition === 'front') legendPos = [0, 0, 0.48];
  if (legendPosition === 'none') legendText = '';

  const scaleY = 1;
  const px = x !== undefined ? x * 1.08 : 0;
  const pz = y !== undefined ? y * 1.08 : 0;

  return (
    <group 
      position={[px, 0, pz]} 
      onClick={(e) => {
        if(onClick) {
          e.stopPropagation();
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
            <meshBasicMaterial 
              color="#6c63ff"
              wireframe={false}
              transparent
              opacity={0.25}
              side={THREE.BackSide}
            />
          </mesh>
        )}

        {/* 1. Frustum body */}
        <mesh geometry={bodyGeo} castShadow receiveShadow>
          <MaterialCmp {...bodyMaterialParams} />
        </mesh>

        {/* 2. Concave top dish surface */}
        <mesh geometry={topGeo} position={[0, topFaceY, -0.026]} castShadow receiveShadow>
          <MaterialCmp {...topMaterialParams} />
        </mesh>

        {/* 4. Cherry MX stem underneath */}
        <group position={[0, -0.3865, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.24, 0.44]} />
            <MaterialCmp {...stemMaterialParams} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[0.44, 0.24, 0.14]} />
            <MaterialCmp {...stemMaterialParams} />
          </mesh>
        </group>
      </group>

      {/* 3. Legend text */}
      {legendText && legendPosition !== 'none' && (
        <Text
          position={legendPos}
          rotation={legendPosition === 'front' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
          fontSize={0.28}
          color={legendColor}
          anchorX="center"
          anchorY="middle"
          depthOffset={-1}
          renderOrder={1}
          outlineWidth={0.004}
          outlineColor="rgba(0,0,0,0.3)"
          font={font === 'Inter' ? undefined : undefined} 
        >
          {typeof legendText === 'string' ? legendText : ''}
        </Text>
      )}
    </group>
  );
}