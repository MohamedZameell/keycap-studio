// Path B realism layer (activated 2026-06-12 — keysim parity wasn't enough):
// 1. EnvLight — procedural RoomEnvironment as low-intensity IBL. Gives plastic
//    its sheen without the glare that killed the old full-intensity HDR preset.
//    scene.environmentIntensity scales it globally (three r163+), so no
//    per-material envMapIntensity plumbing is needed.
// 2. N8AO — real screen-space AO between caps and into the case moat. halfRes
//    keeps the 60fps bar; the painted side-wall ramp from M1 still does the
//    base-of-wall grounding, this adds the cap-to-cap proximity shading.
// postprocessing's final on-screen pass applies the renderer's own tone
// mapping (ACES @ 0.85) + sRGB encode, so no ToneMapping effect is needed.
import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer, N8AO } from '@react-three/postprocessing';

export function EnvLight({ intensity = 0.25 }) {
  const gl = useThree(s => s.gl);
  const scene = useThree(s => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    return () => {
      scene.environment = null;
      envTex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    scene.environmentIntensity = intensity;
    return () => { scene.environmentIntensity = 1; };
  }, [scene, intensity]);

  return null;
}

export function AOEffects() {
  return (
    <EffectComposer>
      <N8AO
        halfRes
        aoRadius={0.35}
        distanceFalloff={0.1}
        intensity={2.5}
        aoSamples={8}
        denoiseSamples={4}
        denoiseRadius={12}
      />
    </EffectComposer>
  );
}

export default function RealismPipeline({ envIntensity = 0.25 }) {
  return (
    <>
      <EnvLight intensity={envIntensity} />
      <AOEffects />
    </>
  );
}
