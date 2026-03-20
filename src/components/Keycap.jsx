import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

function buildFrustumBody() {
  try {
    const hh = 0.2465; // half of 0.493
    const bx = 0.945 / 2;
    const bz = 0.945 / 2;
    const tx = 0.787 / 2;
    const tz = 0.735 / 2;
    const tzo = -0.026;

    const v = [];
    const idx = [];
    
    // 8 vertices
    const FBL = [-bx, -hh,  bz];
    const FBR = [ bx, -hh,  bz];
    const BBL = [-bx, -hh, -bz];
    const BBR = [ bx, -hh, -bz];
    
    const FTL = [-tx,  hh,  tz + tzo];
    const FTR = [ tx,  hh,  tz + tzo];
    const BTL = [-tx,  hh, -tz + tzo];
    const BTR = [ tx,  hh, -tz + tzo];

    let i = 0;
    const pushFace = (p1, p2, p3, p4) => {
      v.push(...p1, ...p2, ...p3, ...p4);
      idx.push(i, i+1, i+2, i, i+2, i+3);
      i += 4;
    };

    pushFace(FTL, FBL, FBR, FTR); // Front
    pushFace(BTR, BBR, BBL, BTL); // Back
    pushFace(BTL, BBL, FBL, FTL); // Left
    pushFace(FTR, FBR, BBR, BTR); // Right
    pushFace(BBL, BBR, FBR, FBL); // Bottom

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  } catch(e) {
    console.warn("Frustum build failed", e);
    return new THREE.BoxGeometry(0.945, 0.493, 0.945);
  }
}

function buildTopDish() {
  try {
    const tx = 0.787;
    const tz = 0.735;
    const geo = new THREE.PlaneGeometry(tx, tz, 16, 16);
    geo.rotateX(-Math.PI / 2);
    
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for(let i=0; i<pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const dx = v.x / (tx / 2);
      const dz = v.z / (tz / 2);
      const distSq = dx*dx + dz*dz;
      const dip = -0.018 * (1 - Math.min(distSq, 1.0));
      v.y += dip;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  } catch(e) {
    console.warn("Top dish build failed", e);
    const plane = new THREE.PlaneGeometry(0.787, 0.735);
    plane.rotateX(-Math.PI/2);
    return plane;
  }
}

export default function Keycap({ keyId, label, x, y, w = 1, h = 1, isSelected, onClick }) {
  const meshRef = useRef();
  
  const globalColor = useStore(s => s.globalColor);
  const globalLegendColor = useStore(s => s.globalLegendColor);
  const globalLegendText = useStore(s => s.globalLegendText);
  const globalFont = useStore(s => s.globalFont);
  const backlitEnabled = useStore(s => s.backlitEnabled);
  const backlitColor = useStore(s => s.backlitColor);
  const perKeyDesigns = useStore(s => s.perKeyDesigns);
  
  const pkDesign = perKeyDesigns[keyId] || {};
  
  const color = pkDesign.color || globalColor;
  const legendColor = pkDesign.legendColor || globalLegendColor;
  let legendText = pkDesign.legendText || globalLegendText || label;
  const font = pkDesign.font || globalFont;
  const legendPosition = pkDesign.legendPosition || 'top-center';
  
  const bodyGeo = useMemo(() => buildFrustumBody(), []);
  const topGeo = useMemo(() => buildTopDish(), []);

  // Animation applies if no X/Y provided (single mode or bg)
  const isSingleView = (x === undefined && y === undefined);
  
  useFrame(({ clock }) => {
    if (isSingleView && meshRef.current) {
      meshRef.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.06;
      meshRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.3;
    }
  });

  const materialParams = { color, roughness: 0.15, metalness: 0.1 };
  
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
    >
      <group ref={meshRef} scale={[w, scaleY, h]}>
        
        {/* Wireframe Outline */}
        {isSelected && (
          <mesh geometry={bodyGeo} scale={1.05}>
            <meshBasicMaterial color="#6c63ff" wireframe />
          </mesh>
        )}

        {/* 1. Frustum body */}
        <mesh geometry={bodyGeo} castShadow receiveShadow>
          <meshStandardMaterial {...materialParams} />
        </mesh>

        {/* 2. Concave top dish surface */}
        <mesh geometry={topGeo} position={[0, topFaceY, -0.026]} castShadow receiveShadow>
          <meshStandardMaterial {...materialParams} />
        </mesh>

        {/* 4. Cherry MX stem underneath */}
        <group position={[0, -0.3865, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.24, 0.44]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[0.44, 0.24, 0.14]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>

        {/* 6. Backlit */}
        {backlitEnabled && (
          <pointLight position={[0, -0.3, 0]} intensity={1.5} color={backlitColor} distance={2} />
        )}
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
          depthOffset={-2}
          font={font === 'Inter' ? undefined : undefined} 
        >
          {typeof legendText === 'string' ? legendText : ''}
        </Text>
      )}
    </group>
  );
}