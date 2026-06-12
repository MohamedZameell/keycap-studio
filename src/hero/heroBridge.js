import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

// Hands the live R3F scene graph to the hero-render modal (which lives
// outside the Canvas). Kept dependency-free so StudioScreen's eager chunk
// doesn't pull the path tracer — that loads with the lazy modal.
export const heroBridge = { scene: null, camera: null, set: null };

export function HeroBridge() {
  const scene = useThree(s => s.scene);
  const camera = useThree(s => s.camera);
  const set = useThree(s => s.set);
  useEffect(() => {
    Object.assign(heroBridge, { scene, camera, set });
    return () => { Object.assign(heroBridge, { scene: null, camera: null, set: null }); };
  }, [scene, camera, set]);
  return null;
}
