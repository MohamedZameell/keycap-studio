import React, { useMemo } from 'react';
import { useStore } from '../store';
import Keycap from './Keycap';
import { getLayoutForFormFactor } from '../data/layouts';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const KEY_UNIT = 1.08;

export default function KeyboardRenderer() {
  const formFactor = useStore(s => s.selectedFormFactor);
  const selectedKey = useStore(s => s.selectedKey);
  const setSelectedKey = useStore(s => s.setSelectedKey);
  
  const layout = useMemo(() => {
    try {
      // Map correctly as instructed
      let mappedFF = 'SIXTY';
      if (formFactor === '75%') mappedFF = 'SEVENTY_FIVE';
      else if (formFactor === 'TKL' || formFactor === '80%') mappedFF = 'TKL_80';
      else if (formFactor === '100%') mappedFF = 'FULL_100';
      else if (formFactor === '65%') mappedFF = 'SIXTY_FIVE';

      const res = getLayoutForFormFactor(mappedFF) || getLayoutForFormFactor('SIXTY');
      return res && res.length ? res : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [formFactor]);

  // Calculate bounding box to center layout and size the base plate
  const { totalWidth, totalHeight, centerOffset } = useMemo(() => {
    if (!layout.length) return { totalWidth:0, totalHeight:0, centerOffset: [0,0] };
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    layout.forEach(k => {
      if (k.x < minX) minX = k.x;
      if (k.x + k.w > maxX) maxX = k.x + k.w;
      if (k.y < minY) minY = k.y;
      if (k.y + k.h > maxY) maxY = k.y + k.h;
    });

    const w = (maxX - minX + 0.5) * KEY_UNIT;
    const d = (maxY - minY + 0.5) * KEY_UNIT;
    
    const cx = ((minX + maxX) / 2 - 0.5) * KEY_UNIT;
    const cz = ((minY + maxY) / 2 - 0.5) * KEY_UNIT;
    
    return { totalWidth: w, totalHeight: d, centerOffset: [-cx, -cz] };
  }, [layout]);

  const baseGeo = useMemo(() => {
    if (totalWidth === 0) return null;
    return new RoundedBoxGeometry(totalWidth, 0.2, totalHeight, 16, 0.1);
  }, [totalWidth, totalHeight]);

  if (!layout || layout.length === 0) {
    return (
      <Text position={[0, 0, 0]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">
        Layout loading...
      </Text>
    );
  }

  return (
    <group position={[centerOffset[0], 0, centerOffset[1]]}>
      {/* Base Plate */}
      {baseGeo && (
        <mesh geometry={baseGeo} position={[-centerOffset[0], -0.35, -centerOffset[1]]} receiveShadow>
          <meshStandardMaterial color="#1a1a2e" roughness={0.7} metalness={0.3} />
        </mesh>
      )}

      {/* Keys */}
      {layout.map((key) => {
        const kw = Math.max(0.5, Math.min(8, Number(key.w) || 1));
        const kh = Math.max(0.5, Math.min(3, Number(key.h) || 1));
        return (
          <Keycap
            key={key.id}
            keyId={key.id}
            label={key.label}
            x={key.x}
            y={key.y}
            w={kw}
            h={kh}
            isSelected={selectedKey === key.id}
            onClick={() => setSelectedKey(key.id)}
          />
        );
      })}
    </group>
  );
}
