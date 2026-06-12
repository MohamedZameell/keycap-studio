import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { KEY_UNIT } from '../data/layouts';

// Material params per case finish (STYLE tab options)
const FINISHES = {
  matte:   { roughness: 0.78, metalness: 0.08 },
  brushed: { roughness: 0.45, metalness: 0.50 },
  glossy:  { roughness: 0.22, metalness: 0.15 },
};

// Tray dimensions (scene units). Caps sit recessed inside the rim like a
// real high-profile case: rim top just under the cap bases, dark plate
// visible in the moat between the outer caps and the rim wall.
const MOAT = 0.07;          // dark gap between outer caps and rim wall
const WALL_T = 0.42;        // rim wall thickness
const RIM_TOP_Y = -0.05;    // cap bases are y=0, pressed dip is -0.04
const CASE_BOTTOM_Y = -0.52;
const BEVEL = 0.05;

function roundedRectShape(hw, hd, r) {
  const s = new THREE.Shape();
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + r);
  s.lineTo(hw, hd - r);
  s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - r);
  s.lineTo(-hw, -hd + r);
  s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return s;
}

export default function KeyboardChassis({ totalW, totalH }) {
  const { caseColor, caseStyle, caseFinish } = useStore(useShallow(s => ({
    caseColor: s.caseColor,
    caseStyle: s.caseStyle,
    caseFinish: s.caseFinish,
  })));

  const fin = FINISHES[caseFinish] || FINISHES.matte;
  const cornerR = caseStyle === 'angular' ? 0.06 : 0.22;

  const innerW = (totalW * KEY_UNIT) / 2 + MOAT;
  const innerD = (totalH * KEY_UNIT) / 2 + MOAT;
  const outerW = innerW + WALL_T;
  const outerD = innerD + WALL_T;

  // Rim: rounded rect with a rounded hole, extruded upward with a beveled
  // lip (the bevel is the rim's light-catching edge — replaces the old
  // hardcoded accent strip).
  const rimGeo = useMemo(() => {
    const shape = roundedRectShape(outerW, outerD, cornerR);
    shape.holes.push(roundedRectShape(innerW, innerD, 0.06));
    const depth = (RIM_TOP_Y - CASE_BOTTOM_Y) - 2 * BEVEL;
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL * 0.8,
      bevelSegments: 2,
      curveSegments: 8,
    });
    geo.rotateX(-Math.PI / 2); // extrude up: shape in XZ, +Y is the rim top
    geo.translate(0, CASE_BOTTOM_Y + BEVEL, 0);
    return geo;
  }, [outerW, innerW, outerD, innerD, cornerR]);

  return (
    <group>
      {/* Case rim (tray walls) */}
      <mesh geometry={rimGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={caseColor || '#08080c'}
          roughness={fin.roughness}
          metalness={fin.metalness}
        />
      </mesh>

      {/* Case floor — closes the tray silhouette from low angles */}
      <mesh position={[0, CASE_BOTTOM_Y + 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[outerW * 2 - 0.08, 0.06, outerD * 2 - 0.08]} />
        <meshStandardMaterial
          color={caseColor || '#08080c'}
          roughness={fin.roughness}
          metalness={fin.metalness}
        />
      </mesh>

      {/* Switch plate — the dark surface visible between caps and in the
          moat; tucks under the rim's inner wall */}
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[innerW * 2 + 0.15, 0.05, innerD * 2 + 0.15]} />
        <meshStandardMaterial color="#111116" roughness={0.55} metalness={0.2} />
      </mesh>
    </group>
  );
}
