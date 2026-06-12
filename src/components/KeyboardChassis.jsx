import React from 'react';
import { RoundedBox } from '@react-three/drei';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';

const KEY_UNIT = 1.05;

// Material params per case finish (STYLE tab options)
const FINISHES = {
  matte:   { roughness: 0.78, metalness: 0.08 },
  brushed: { roughness: 0.45, metalness: 0.50 },
  glossy:  { roughness: 0.22, metalness: 0.15 },
};

function shade(hex, factor) {
  const c = hex && hex.startsWith('#') && hex.length >= 7 ? hex : '#08080c';
  const r = Math.min(255, Math.round(parseInt(c.slice(1, 3), 16) * factor));
  const g = Math.min(255, Math.round(parseInt(c.slice(3, 5), 16) * factor));
  const b = Math.min(255, Math.round(parseInt(c.slice(5, 7), 16) * factor));
  return `rgb(${r},${g},${b})`;
}

export default function KeyboardChassis({ totalW, totalH }) {
  const { caseColor, caseStyle, caseFinish } = useStore(useShallow(s => ({
    caseColor: s.caseColor,
    caseStyle: s.caseStyle,
    caseFinish: s.caseFinish,
  })));

  const padX = 1.2;
  const padZ = 1.0;
  const plateW = totalW * KEY_UNIT + padX;
  const plateZ = totalH * KEY_UNIT + padZ;

  const fin = FINISHES[caseFinish] || FINISHES.matte;
  const radius = caseStyle === 'angular' ? 0.02 : 0.10;

  return (
    <group>
      {/* PART 1 — Bottom case (main body) */}
      <RoundedBox
        args={[plateW, 0.28, plateZ]}
        radius={radius}
        smoothness={4}
        position={[0, -0.38, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={caseColor || '#08080c'}
          roughness={fin.roughness}
          metalness={fin.metalness}
        />
      </RoundedBox>

      {/* PART 2 — Switch plate (dark surface in the gaps between keys,
          a separate part on real boards — stays dark under any case color) */}
      <RoundedBox
        args={[plateW - 0.3, 0.05, plateZ - 0.3]}
        radius={0.04}
        smoothness={4}
        position={[0, -0.18, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#111116"
          roughness={0.55}
          metalness={0.2}
        />
      </RoundedBox>

      {/* PART 3 — Front edge chamfer line, derived from the case color */}
      <mesh position={[0, -0.33, plateZ / 2 - 0.05]}>
        <boxGeometry args={[plateW - 0.4, 0.04, 0.06]} />
        <meshStandardMaterial
          color={shade(caseColor, 0.8)}
          roughness={fin.roughness}
          metalness={fin.metalness}
        />
      </mesh>
    </group>
  );
}
