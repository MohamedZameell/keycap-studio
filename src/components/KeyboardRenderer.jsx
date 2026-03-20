import React, { useMemo } from 'react';
import { useStore } from '../store';
import Keycap from './Keycap';
import { getLayoutForFormFactor } from '../data/layouts';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as THREE from 'three';

export default function KeyboardRenderer() {
  const formFactor = useStore(s => s.selectedFormFactor);
  const selectedKey = useStore(s => s.selectedKey);
  const setSelectedKey = useStore(s => s.setSelectedKey);
  
  const layout = useMemo(() => getLayoutForFormFactor(formFactor), [formFactor]);

  // Calculate bounding box to size the base plate
  const { width, depth, center } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    layout.forEach(k => {
      if (k.x < minX) minX = k.x;
      if (k.x + k.w > maxX) maxX = k.x + k.w;
      if (k.y < minY) minY = k.y;
      if (k.y + k.h > maxY) maxY = k.y + k.h;
    });

    const KEY_UNIT = 1.05;
    // Add 0.5 unit padding around the keys
    const w = (maxX - minX + 1.0) * KEY_UNIT;
    const d = (maxY - minY + 1.0) * KEY_UNIT;
    
    const cx = ((minX + maxX) / 2 - 0.5) * KEY_UNIT;
    const cz = ((minY + maxY) / 2 - 0.5) * KEY_UNIT;
    
    return { width: w, depth: d, center: [cx, cz] };
  }, [layout]);

  const baseGeo = useMemo(() => {
    return new RoundedBoxGeometry(width, 0.4, depth, 16, 0.15);
  }, [width, depth]);

  return (
    <group position={[-center[0], 0, -center[1]]}>
      {/* Base Plate */}
      <mesh geometry={baseGeo} position={[center[0], -0.4, center[1]]} receiveShadow>
        <meshStandardMaterial color="#1a1a2e" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Keys */}
      {layout.map((key) => (
        <Keycap
          key={key.id}
          keyId={key.id}
          label={key.label}
          x={key.x}
          y={key.y}
          w={key.w}
          h={key.h}
          isSelected={selectedKey === key.id}
          onClick={() => setSelectedKey(key.id)}
        />
      ))}
    </group>
  );
}
