# Extracted Reference Code from Open Source Projects

All repos cloned to: `references/`

---

## 1. KEYSIM - Materials & Lighting (Best Reference)

### Keycap Materials (`references/keysim/src/three/key/materials.js`)

```javascript
// Dual material system: Lambert for top (legends), Standard for sides
const getMaterialSet = (opts) => {
  let legendTexture = keyTexture(opts);

  // TOP FACE - MeshLambertMaterial (better for textures)
  let top = new THREE.MeshLambertMaterial({
    map: legendTexture,
    lightMap: lightMap,
    lightMapIntensity: 0,
  });
  top.map.minFilter = THREE.LinearFilter;

  // SIDES - MeshStandardMaterial (for color)
  let side = new THREE.MeshStandardMaterial({
    aoMap: ambiantOcclusionMap,
    color: opts.background,
    aoMapIntensity: 0.4,
    lightMap: lightMap,
    lightMapIntensity: 0,
  });

  return [side, top];
};

// Highlight system via lightMapIntensity
export const enableHighlight = (key_mesh) => {
  key_mesh.material.forEach((m) => (m.lightMapIntensity = 0.2));
};
export const disableHighlight = (key_mesh) => {
  key_mesh.material.forEach((m) => (m.lightMapIntensity = 0));
};
```

### Lighting Setup (`references/keysim/src/three/sceneManager.js`)

```javascript
setupLights() {
  // Ambient - soft fill
  let ambiant = new THREE.AmbientLight("#ffffff", 0.5);
  this.scene.add(ambiant);

  // Primary - main light from top-right
  let primaryLight = new THREE.DirectionalLight("#dddddd", 0.7);
  primaryLight.position.set(5, 10, 10);
  primaryLight.target.position.set(0, -10, -10);
  this.scene.add(primaryLight, primaryLight.target);

  // Secondary - fill from back-left
  let shadowLight = new THREE.DirectionalLight("#FFFFFF", 0.2);
  shadowLight.position.set(-4, 3, -10);
  this.scene.add(shadowLight, shadowLight.target);
}

// Renderer settings
this.renderer = new THREE.WebGLRenderer({
  alpha: true,
  logarithmicDepthBuffer: true,
  antialias: true,
});
```

### Case Materials (`references/keysim/src/three/case/caseManager.js`)

```javascript
const MATERIAL_OPTIONS = {
  matte: {
    metalness: 0,
    roughness: 1,
    clearcoat: 0,
    aoMapIntensity: 0.1,
    clearcoatRoughness: 1,
    lightMapIntensity: 0.2,
  },
  brushed: {
    metalness: 0.4,
    aoMapIntensity: 0.4,
    envMapIntensity: 0.1,
  },
  glossy: {
    metalness: 0.8,
    roughness: 0.1,
    aoMapIntensity: 0.4,
    envMapIntensity: 0.5,
  },
};
```

### Canvas Texture for Legends (`references/keysim/src/three/key/texture.js`)

```javascript
export const keyTexture = (opts) => {
  let pxPerU = 128;
  let canvas = document.createElement("canvas");
  canvas.height = pxPerU * opts.h;
  canvas.width = pxPerU * opts.w;
  let ctx = canvas.getContext("2d");

  // Base color
  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Concave gradient for depth illusion
  let gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "rgba(255,255,255,0.2)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.0)");
  gradient.addColorStop(0.6, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.15)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Legend text
  ctx.fillStyle = opts.color;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillText(mainChar, offsetX, offsetY);

  return new THREE.CanvasTexture(canvas);
};
```

### Colorway JSON Structure

```json
{
  "id": "8008",
  "label": "8008",
  "swatches": {
    "base": { "background": "#747e92", "color": "#0e1415" },
    "mods": { "background": "#2b313f", "color": "#da526e" },
    "accent": { "background": "#da526e", "color": "#0e1415" }
  },
  "override": {
    "KC_SPC": "base",
    "KC_ENT": "accent",
    "KC_ESC": "accent"
  }
}
```

---

## 2. KL3V - Keycap Profile Models

### Available 3D Models (copied to `src/assets/models/`)

| Profile | Files | Use Case |
|---------|-------|----------|
| Cherry | `cherry-r1.stl` to `cherry-r4.stl`, `cherry-space.stl` | Row-specific Cherry profile |
| SA | `sa-1u-r1.stl` to `sa-1u-r4.stl`, `sa-7u-space.stl` | Tall sculptured |
| DSA | `dsa.stl`, `dsa.3ds` | Uniform spherical |
| XDA | `xda.stl`, `xda.3ds` | Uniform flat |
| Choc | `choc.stl`, `choc.3ds` | Low profile |

### Loading STL in Three.js

```javascript
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

const loader = new STLLoader();
loader.load('path/to/cherry-r3.stl', (geometry) => {
  geometry.computeBoundingBox();
  const material = new THREE.MeshStandardMaterial({
    color: keycapColor,
    metalness: 0.5,
    roughness: 0.6
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
});
```

### Key Scaling Formula

```javascript
const UNIT = 19.05; // mm per key unit
const scale = (unitSize) => (unitSize * 19 / 18.5) - (1 / 18.5);

// Position keys
mesh.position.x = key.centerX() * 19;
mesh.position.z = key.centerY() * 19;
mesh.scale.x = scale(key.width);
mesh.scale.z = scale(key.height);
```

---

## 3. 3D-KEYBOARD - Animation & Sound

### Key Press Animation (copied sounds to `src/assets/sounds/`)

```javascript
import { Howl } from 'howler';

const samples = [
  new Howl({ src: ['sounds/194795.mp3'], sprite: { click: [0, 100], clack: [100, 200] }}),
  new Howl({ src: ['sounds/194796.mp3'], sprite: { click: [0, 100], clack: [100, 200] }}),
  // ... 5 total samples
];

// Keyframe animation for press
const pressKF = new THREE.VectorKeyframeTrack('.position', [0, 0.02], [0, 0, 0, 0, -0.004, 0]);
const releaseKF = new THREE.VectorKeyframeTrack('.position', [0, 0.01], [0, 0, 0, 0, 0.004, 0]);

const pressClip = new THREE.AnimationClip('press', 0.02, [pressKF]);
const releaseClip = new THREE.AnimationClip('release', 0.01, [releaseKF]);

// Per-key mixer
const mixer = new THREE.AnimationMixer(keyMesh);
const pressAction = mixer.clipAction(pressClip);
pressAction.setLoop(THREE.LoopOnce);
pressAction.clampWhenFinished = true;

// On keydown
function keyDown(e) {
  pressAction.play();
  samples[Math.floor(Math.random() * 5)].play('click');
}

// On keyup
function keyUp(e) {
  releaseAction.play();
  samples[Math.floor(Math.random() * 5)].play('clack');
}
```

### Lighting Setup with Shadows

```javascript
// Hemisphere light for ambient
const hemi = new THREE.HemisphereLight(0xffffff, 0x101010, 0.2);
scene.add(hemi);

// Main directional with shadows
const main = new THREE.DirectionalLight(0xbabfba, 3);
main.position.set(-3, 6, 2);
main.castShadow = true;
main.shadow.mapSize.set(4096, 4096);
main.shadow.camera.near = 0.001;
main.shadow.camera.far = 10;
main.shadow.radius = 4;
scene.add(main);

// Renderer shadow settings
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
```

---

## 4. KLE_RENDER - Color Tinting

### Brightness-Based Texture Selection (copied images to `src/assets/textures/`)

```javascript
// 5 brightness variants: GMK_BASE1.png (bright) to GMK_BASE5.png (dark)
function getBaseVariant(hexColor) {
  const rgb = hexToRgb(hexColor);
  const brightness = 0.3 * rgb.r + 0.59 * rgb.g + 0.11 * rgb.b;

  if (brightness > 176) return 1;      // Very light
  else if (brightness > 128) return 2; // Light
  else if (brightness > 80) return 3;  // Medium
  else if (brightness > 32) return 4;  // Dark
  else return 5;                        // Very dark
}
```

### Lab Color Space Tinting (more realistic than RGB)

```javascript
// Concept: convert base image to Lab, replace L/a/b with target color values
// This preserves texture highlights while changing color

// In Three.js, approximate with:
const material = new THREE.MeshStandardMaterial({
  map: baseTexture,
  color: targetColor,  // Multiplies with texture
  metalness: 0.1,
  roughness: 0.7
});
```

---

## 5. KEYBOARD-LAYOUT-EDITOR - Layout Data

### JSON Layout Format

```javascript
// Compact format
[
  { "name": "My Keyboard", "author": "User" },  // Metadata
  [{ "w": 1.5 }, "Tab", "Q", "W", "E", "R"],    // Row 1
  [{ "w": 1.75 }, "Caps", "A", "S", "D", "F"],  // Row 2
  // ...
]

// Key properties (short names)
{
  w: 1.25,    // width in units
  h: 1,       // height in units
  x: 0.25,    // x offset
  y: 0,       // y offset
  r: 15,      // rotation degrees
  rx: 1,      // rotation center x
  ry: 0,      // rotation center y
  c: "#cccccc", // keycap color
  t: "#000000", // legend color
  a: 4,       // alignment (0-7)
}
```

### 12 Label Positions

```
Position grid:
 0  1  2
 3  4  5
 6  7  8
 9 10 11

Common usage:
- 0: Main legend (A, B, C)
- 1: Secondary (shift symbol: @, #)
- 4: Center (for icons)
- 9: Front print
```

---

## 6. GMK COLOR REFERENCE

### Category Colors

```javascript
export const GMK_CATEGORIES = {
  red:     { hex: '#7f0000', name: 'Red' },
  green:   { hex: '#2e7d32', name: 'Green' },
  blue:    { hex: '#002171', name: 'Blue' },
  yellow:  { hex: '#fbc02d', name: 'Yellow' },
  pink:    { hex: '#f06292', name: 'Pink' },
  purple:  { hex: '#4a148c', name: 'Purple' },
  orange:  { hex: '#e65100', name: 'Orange' },
  brown:   { hex: '#3e2723', name: 'Brown' },
  white:   { hex: '#E0E0E0', name: 'White' },
  grey:    { hex: '#494949', name: 'Grey/Beige' },
  black:   { hex: '#000000', name: 'Black' },
};
```

---

## 7. JORIC/KEYCAPS - OpenSCAD Parameters

### Key Measurements

```javascript
const KEYCAP_PARAMS = {
  unit: 19.05,              // mm per 1u
  baseWidth: 18.16,         // 1u keycap base width
  baseHeight: 18.16,        // 1u keycap base height
  wallThickness: 3,         // mm
  keytopThickness: 1,       // mm
};

// Calculate dimensions for any size
function getKeycapSize(units) {
  return KEYCAP_PARAMS.baseWidth + (KEYCAP_PARAMS.unit * (units - 1));
}
// 1u = 18.16mm, 1.25u = 23.42mm, 2u = 37.21mm, etc.
```

### Profile Depths (DCS)

```javascript
const DCS_PROFILE = {
  row1: { depth: 8.5, tilt: -1 },
  row2: { depth: 7.5, tilt: 3 },
  row3: { depth: 6.0, tilt: 7 },
  row4: { depth: 6.0, tilt: 16 },
  row5: { depth: 11.5, tilt: -6 },  // Bottom row (space)
};
```

---

## Assets Copied to Project

```
src/assets/
├── models/
│   ├── cherry-r1.stl through cherry-r4.stl, cherry-space.stl
│   ├── sa-1u-r1.stl through sa-1u-r4.stl, sa-7u-space.stl
│   ├── dsa.stl, dsa.3ds
│   ├── xda.stl, xda.3ds
│   ├── choc.stl, choc.3ds
│   ├── mx-switch.stl, choc-switch.stl
│   └── pcb.stl
├── sounds/
│   └── 194795.mp3 through 194799.mp3 (keyboard click/clack)
└── textures/
    ├── GMK_BASE1.png through GMK_BASE5.png
    ├── GMK_SPACE1.png through GMK_SPACE5.png
    ├── GMK_ISO1.png through GMK_ISO5.png
    ├── SA_BASE1.png through SA_BASE5.png
    └── ... (50 total base images)
```

---

## Quick Integration Tips

1. **For better keycap materials**: Use keysim's dual-material approach (Lambert top + Standard sides)

2. **For realistic colors**: Use the 5 brightness variants from kle_render based on target color luminance

3. **For typing sounds**: Import Howler.js and use the 5 mp3 samples with random selection

4. **For key animations**: Use Three.js AnimationMixer with VectorKeyframeTracks for press/release

5. **For accurate profiles**: Load the STL models instead of procedural geometry
