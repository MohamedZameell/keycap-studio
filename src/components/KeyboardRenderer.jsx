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

  // Safe boundaries mapped from exact layouts
  const { totalWidth, totalHeight, centerOffset } = useMemo(() => {
    if (!layout.length) return { totalWidth:0, totalHeight:0, centerOffset: [0,0] };
    
    // Fallbacks handled gracefully as numbers
    const safeLayout = layout.map(k => ({
      ...k,
      w: Math.max(0.5, Math.min(8, Number(k.w) || 1)),
      h: Math.max(0.5, Math.min(3, Number(k.h) || 1))
    }));

    const minX = Math.min(...safeLayout.map(k => k.x));
    const minZ = Math.min(...safeLayout.map(k => k.y));
    const maxX = Math.max(...safeLayout.map(k => k.x + k.w));
    const maxZ = Math.max(...safeLayout.map(k => k.y + k.h));
    
    const totalW = maxX - minX;
    const totalH = maxZ - minZ;
    
    return { 
      totalWidth: totalW, 
      totalHeight: totalH, 
      centerOffset: [-(minX + totalW/2) * KEY_UNIT, -(minZ + totalH/2) * KEY_UNIT] 
    };
  }, [layout]);

  const baseGeo = useMemo(() => {
    if (totalWidth === 0) return null;
    return new RoundedBoxGeometry(totalWidth * KEY_UNIT + 1.0, 0.2, totalHeight * KEY_UNIT + 0.8, 16, 0.1);
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
      {/* Base Plate explicitly centered on self node with offset bounding box dimensions */}
      {baseGeo && (
        <mesh geometry={baseGeo} position={[0, -0.36, 0]} receiveShadow>
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
