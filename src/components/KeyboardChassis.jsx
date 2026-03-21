import React, { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';

const KEY_UNIT = 1.12;

export default function KeyboardChassis({ totalW, totalH }) {
  const padX = 1.8;
  const padZ = 1.4;
  const plateW = totalW * KEY_UNIT + padX;
  const plateZ = totalH * KEY_UNIT + padZ;

  return (
    <group>
      {/* PART 1 — Bottom case (main body) */}
      <RoundedBox
        args={[plateW, 0.45, plateZ]}
        radius={0.12}
        smoothness={6}
        position={[0, -0.55, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#08080c"
          roughness={0.65}
          metalness={0.35}
          clearcoat={0.5}
          clearcoatRoughness={0.15}
          envMapIntensity={0.8}
          emissive="#000000"
          emissiveIntensity={0}
        />
      </RoundedBox>

      {/* PART 2 — Switch plate (surface keys sit on) */}
      <RoundedBox
        args={[plateW - 0.3, 0.06, plateZ - 0.3]}
        radius={0.06}
        smoothness={4}
        position={[0, -0.29, 0]}
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#111116"
          roughness={0.6}
          metalness={0.2}
          clearcoat={0.2}
          emissive="#000000"
          emissiveIntensity={0}
        />
      </RoundedBox>

      {/* PART 3 — Front edge accent (thin strip) */}
      <mesh position={[0, -0.33, plateZ / 2 - 0.05]}>
        <boxGeometry args={[plateW - 0.4, 0.04, 0.06]} />
        <meshPhysicalMaterial
          color="#5b54cc"
          roughness={0.7}
          metalness={0.4}
          emissive="#000000"
          emissiveIntensity={0}
        />
      </mesh>
    </group>
  );
}
