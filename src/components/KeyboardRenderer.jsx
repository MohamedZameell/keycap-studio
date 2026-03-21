import React, { useMemo } from 'react';
import { useStore } from '../store';
import Keycap from './Keycap';
import KeyboardChassis from './KeyboardChassis';
import { getLayoutForFormFactor } from '../data/layouts';
import { Text } from '@react-three/drei';

const KEY_UNIT = 1.08;

const ROW_HEIGHT = {
  0: 0.52, 1: 0.50, 2: 0.48,
  3: 0.44, 4: 0.46, 5: 0.48
};
const ROW_TILT = {
  0: 0.06, 1: 0.03, 2: 0.01,
  3: 0, 4: -0.03, 5: -0.05
};

export default function KeyboardRenderer({ onKeyClick }) {
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

  if (!layout || layout.length === 0) {
    return (
      <group position={[0, 0, 0]}>
        <Keycap keyId="placeholder" label="?" w={2} h={1} />
        <Text position={[0, 1.5, 0]} fontSize={0.4} color="#888899" anchorX="center" anchorY="middle">
          Select a keyboard to begin
        </Text>
      </group>
    );
  }

  return (
    <group position={[0, 0, 0]}>
      {/* Keyboard Chassis (replaces old flat base plate) */}
      <KeyboardChassis totalW={maxW} totalH={maxH} />

      {/* Keys calculate their offset natively to match the parent 0,0 center */}
      {layout.map((key) => {
        const kw = Math.max(0.5, Math.min(8, Number(key.w) || 1));
        const kh = Math.max(0.5, Math.min(3, Number(key.h) || 1));
        
        const gridX = Number(key.x) - minX - maxW / 2 + kw / 2;
        const gridZ = Number(key.y) - minZ - maxH / 2 + kh / 2;

        // UV offsets for wrap image mode
        const uvOffsetX = maxW > 0 ? (Number(key.x) - minX) / maxW : 0;
        const uvOffsetY = maxH > 0 ? (Number(key.y) - minZ) / maxH : 0;
        const uvScaleX = maxW > 0 ? kw / maxW : 1;
        const uvScaleY = maxH > 0 ? kh / maxH : 1;

        return (
          <Keycap
            key={key.id}
            keyId={key.id}
            label={key.label}
            x={gridX}
            y={gridZ}
            w={kw}
            h={kh}
            rowHeight={ROW_HEIGHT[key.row] ?? 0.50}
            rowTilt={ROW_TILT[key.row] ?? 0}
            uvOffset={[uvOffsetX, uvOffsetY]}
            uvScale={[uvScaleX, uvScaleY]}
            isSelected={selectedKey === key.id}
            isPerformanceMode={isPerformanceMode}
            onClick={() => onKeyClick ? onKeyClick(key.id) : setSelectedKey(key.id)}
          />
        );
      })}
    </group>
  );
}
