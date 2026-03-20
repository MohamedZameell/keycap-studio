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

  const { totalW, totalH, minX, minZ, maxW, maxH } = useMemo(() => {
    if (!layout.length) return { totalW:0, totalH:0, minX:0, minZ:0, maxW:0, maxH:0 };
    
    const safeLayout = layout.map(k => ({
      ...k,
      w: Math.max(0.5, Math.min(8, Number(k.w) || 1)),
      h: Math.max(0.5, Math.min(3, Number(k.h) || 1))
    }));

    const minX = Math.min(...safeLayout.map(k => Number(k.x)));
    const minZ = Math.min(...safeLayout.map(k => Number(k.y)));
    const maxX = Math.max(...safeLayout.map(k => Number(k.x) + (Number(k.w) || 1)));
    const maxZ = Math.max(...safeLayout.map(k => Number(k.y) + (Number(k.h) || 1)));
    
    const maxW = maxX - minX;
    const maxH = maxZ - minZ;
    const totalW = maxW * KEY_UNIT;
    const totalH = maxH * KEY_UNIT;
    
    return { totalW, totalH, minX, minZ, maxW, maxH };
  }, [layout]);

  const isPerformanceMode = layout.length > 80;

  const baseGeo = useMemo(() => {
    if (totalW === 0) return null;
    return new RoundedBoxGeometry(totalW + 1.2, 0.22, totalH + 0.8, 16, 0.05);
  }, [totalW, totalH]);

  if (!layout || layout.length === 0) {
    return (
      <Text position={[0, 0, 0]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">
        Layout loading...
      </Text>
    );
  }

  return (
    <group position={[0, 0, 0]}>
      {/* Base plate is centered at [0, -0.36, 0] */}
      {baseGeo && (
        <mesh geometry={baseGeo} position={[0, -0.36, 0]} receiveShadow>
          <meshStandardMaterial 
            color="#111118" 
            roughness={0.7} 
            metalness={0.1} 
          />
        </mesh>
      )}

      {/* Keys calculate their offset natively to match the parent 0,0 center */}
      {layout.map((key) => {
        const kw = Math.max(0.5, Math.min(8, Number(key.w) || 1));
        const kh = Math.max(0.5, Math.min(3, Number(key.h) || 1));
        
        // Convert explicitly so Keycap's internal 1.08 scalar equates exactly to the user's `posX` world map definition
        const gridX = Number(key.x) - minX - maxW / 2 + kw / 2;
        const gridZ = Number(key.y) - minZ - maxH / 2 + kh / 2;

        return (
          <Keycap
            key={key.id}
            keyId={key.id}
            label={key.label}
            x={gridX}
            y={gridZ}
            w={kw}
            h={kh}
            isSelected={selectedKey === key.id}
            isPerformanceMode={isPerformanceMode}
            onClick={() => setSelectedKey(key.id)}
          />
        );
      })}
    </group>
  );
}
