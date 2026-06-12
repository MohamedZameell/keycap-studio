import * as THREE from 'three';
import { GradientEquirectTexture, ShapedAreaLight, PhysicalCamera } from 'three-gpu-pathtracer';

// Builds the path-traceable hero scene from the live viewport scene.
// Staging recipe (matches the reference render): floating board centered
// at origin, blue-grey gradient sweep as env+background, one big softbox
// upper-left + weak cool fill right, matte shadow-catcher floor so the
// board "floats" on the gradient with soft GI shadow, physical camera at
// a low 3/4 with mild DOF.
//
// Keep = opaque MeshStandard/MeshPhysical meshes (cap tops/sides, chassis,
// plate). Strip = lights (we light our own), ShadowMaterial + drei
// ContactShadows, transparent overlays, BackSide selection shells.
// Geometries and materials are SHARED with the live scene — the path
// tracer snapshots them into its own BVH/atlas on setScene, and texture
// repeat transforms (molded-grain normal map) carry through per material.

// el kept under the lens half-angle (16.5deg) for hero/front so the
// backdrop wall fills the top of frame like the reference.
export const HERO_PRESETS = {
  hero: { label: '¾ Hero', az: -0.42, el: 0.34, fill: 0.78, fStop: 4.5 },
  front: { label: 'Front Low', az: 0, el: 0.2, fill: 0.8, fStop: 5 },
  top: { label: 'Top Down', az: -0.12, el: 1.22, fill: 0.66, fStop: 8 },
  close: { label: 'Close-up', az: -0.55, el: 0.3, fill: 1.6, fStop: 2.2 },
};

// Seamless studio cyclorama: flat floor -> quarter-round cove -> vertical
// back wall, like a real product-photo sweep. The softbox's falloff across
// it produces the reference backdrop gradient physically.
function buildSweepGeometry(width, floorDepth, radius, wallHeight, segs = 32) {
  const curve = [];
  curve.push({ z: floorDepth, y: 0, ny: 1, nz: 0 });
  curve.push({ z: 0, y: 0, ny: 1, nz: 0 });
  for (let i = 1; i <= segs; i++) {
    const t = (i / segs) * (Math.PI / 2);
    curve.push({ z: -Math.sin(t) * radius, y: radius - Math.cos(t) * radius, ny: Math.cos(t), nz: Math.sin(t) });
  }
  curve.push({ z: -radius, y: radius + wallHeight, ny: 0, nz: 1 });

  const positions = [], normals = [], uvs = [], indices = [];
  curve.forEach((p, i) => {
    positions.push(-width / 2, p.y, p.z, width / 2, p.y, p.z);
    normals.push(0, p.ny, p.nz, 0, p.ny, p.nz);
    uvs.push(0, i / (curve.length - 1), 1, i / (curve.length - 1));
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export function buildHeroScene(sourceScene, { aspect = 16 / 9, angle = 'hero' } = {}) {
  const scene = new THREE.Scene();
  const board = new THREE.Group();
  scene.add(board);

  sourceScene.updateMatrixWorld(true);
  sourceScene.traverse(src => {
    if (!src.isMesh || !src.visible || !src.geometry) return;
    const mat = src.material;
    if (!mat || Array.isArray(mat)) return;
    if (!mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) return;
    if (mat.transparent || mat.side === THREE.BackSide) return;
    for (let o = src.parent; o; o = o.parent) { if (o.visible === false) return; }
    const mesh = new THREE.Mesh(src.geometry, mat);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(src.matrixWorld);
    board.add(mesh);
  });
  if (board.children.length === 0) throw new Error('Nothing to render — no board meshes found');

  // Center the board, bottom resting at y=0
  const bbox = new THREE.Box3().setFromObject(board);
  const center = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3());
  board.position.set(-center.x, -bbox.min.y, -center.z);

  // Gradient sweep: lights AND backgrounds the shot
  const grad = new GradientEquirectTexture();
  grad.topColor.set(0xcdd2e4);
  grad.bottomColor.set(0x747c9e);
  grad.exponent = 3;
  grad.update();
  scene.environment = grad;
  scene.background = grad;
  scene.environmentIntensity = 0.55;
  scene.backgroundIntensity = 0.85;

  // Softbox key, upper-left (area light + MIS = the reference softbox)
  const key = new ShapedAreaLight(new THREE.Color(0xfff5ec), 7.5, size.x * 0.7, size.x * 0.5);
  key.position.set(-size.x * 0.55, size.x * 0.62, size.z * 0.9);
  key.lookAt(0, 0, 0);
  scene.add(key);

  // Cool fill, right, weak — lifts the shadowed walls a touch
  const fill = new ShapedAreaLight(new THREE.Color(0xdfe8ff), 1.2, size.x * 0.45, size.x * 0.35);
  fill.position.set(size.x * 0.7, size.x * 0.35, size.z * 0.5);
  fill.lookAt(0, 0, 0);
  scene.add(fill);

  // Cyclorama sweep behind/below the floating board. (The path tracer's
  // `matte` flag is NOT a shadow catcher in v0.0.24 — it just punches a
  // transparent hole — so the backdrop is real geometry instead.)
  const floatGap = Math.max(0.35, size.x * 0.035);
  const sweepMat = new THREE.MeshStandardMaterial({ color: 0x8d95ba, roughness: 0.96, metalness: 0 });
  const sweep = new THREE.Mesh(
    buildSweepGeometry(size.x * 8, size.x * 2.2, size.x * 0.9, size.x * 1.6),
    sweepMat
  );
  sweep.position.set(0, -floatGap, -size.z * 1.4);
  scene.add(sweep);

  // Physical camera, low 3/4, slight downward tilt, focus on front edge
  const preset = HERO_PRESETS[angle] || HERO_PRESETS.hero;
  const camera = new PhysicalCamera(33, aspect, 0.05, 500);
  const hfov = 2 * Math.atan(Math.tan((33 * Math.PI) / 360) * aspect);
  // board spans `fill` of the frame width
  const dist = size.x / (2 * Math.tan(hfov / 2) * preset.fill);
  const { az, el } = preset;
  camera.position.set(
    Math.sin(az) * dist * Math.cos(el),
    Math.sin(el) * dist,
    Math.cos(az) * dist * Math.cos(el)
  );
  const target = new THREE.Vector3(0, size.y * 0.3, 0);
  camera.lookAt(target);
  camera.fStop = preset.fStop || 4.5;
  camera.focusDistance = camera.position.distanceTo(target) - size.z * 0.35;
  camera.apertureBlades = 6;
  camera.updateMatrixWorld();

  return {
    scene,
    camera,
    size,
    dispose() {
      grad.dispose();
      sweep.geometry.dispose();
      sweepMat.dispose();
      // board geometries/materials are shared with the live scene — not ours
    },
  };
}
