// Path B realism layer, v2 (research pass 2026-06-12).
// 1. EnvLight — procedural STUDIO environment: large softbox panels +
//    a thin rim strip, PMREM'd into an env map. Product-photo reflections
//    (long soft highlights along the cap fillets) instead of the generic
//    RoomEnvironment office. HDR panel colors (>1) carry the punch;
//    scene.environmentIntensity scales it globally (three r163+).
// 2. N8AO — screen-space AO. Tuned per the n8ao docs: distanceFalloff is
//    a RATIO (default 1, ~0.5 for small scenes; 0.1 nearly kills the
//    effect), and Medium-quality samples (16/8) — we have the headroom.
// 3. GroundShadow — ShadowMaterial plane so the key light throws a real
//    offset directional shadow (the reference renders all have one;
//    ContactShadows alone reads as a radial blob).
// postprocessing's final on-screen pass applies the renderer's own tone
// mapping (ACES @ 0.85) + sRGB encode, so no ToneMapping effect is needed.
import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { EffectComposer, N8AO } from '@react-three/postprocessing';

function buildStudioScene() {
  const scene = new THREE.Scene();
  const panel = (w, h, intensity, x, y, z) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(intensity, intensity, intensity),
        side: THREE.DoubleSide,
      })
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  panel(12, 8, 5.0, -6, 9, 5);   // key softbox: high, left, slightly in front
  panel(10, 6, 1.6, 7, 5, 3);    // fill: right, weaker
  panel(16, 1.6, 3.0, 0, 6, -9); // rim strip: long + thin behind -> edge highlight lines
  panel(24, 24, 0.4, 0, -10, 0); // floor bounce, dim
  return scene;
}

export function EnvLight({ intensity = 0.5 }) {
  const gl = useThree(s => s.gl);
  const scene = useThree(s => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const studio = buildStudioScene();
    // small blur sigma turns the hard panels into softboxes
    const envTex = pmrem.fromScene(studio, 0.08).texture;
    scene.environment = envTex;
    studio.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
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
        aoRadius={0.4}
        distanceFalloff={0.5}
        intensity={2.5}
        aoSamples={16}
        denoiseSamples={8}
        denoiseRadius={12}
      />
    </EffectComposer>
  );
}

// Catches the real shadow of the key directional light. Sits just below
// ContactShadows' plane so the two compose: tight contact blob + soft
// offset directional throw.
export function GroundShadow({ y = -0.532, opacity = 0.28, size = 60 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <shadowMaterial transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

export default function RealismPipeline({ envIntensity = 0.62 }) {
  return (
    <>
      <EnvLight intensity={envIntensity} />
      <AOEffects />
    </>
  );
}
