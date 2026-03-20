import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Stars } from '@react-three/drei'
import Keycap from './Keycap'

export default function KeyCapViewer() {
  return (
    <Canvas
      camera={{ position: [0, 2.5, 4.5], fov: 45 }}
      style={{ width: '100%', height: '100vh' }}
      shadows
    >
      <ambientLight intensity={0.6} />
      <spotLight position={[5, 8, 5]} intensity={2}
        castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[-4, 4, -4]} intensity={0.4} color="#6c63ff" />
      <Environment preset="city" />
      <Stars radius={100} depth={50} count={3000} factor={4} />
      <Keycap profile="cherry" />
      <OrbitControls enableZoom enablePan={false}
        minDistance={2} maxDistance={10} />
      <ContactShadows position={[0, -1.2, 0]}
        opacity={0.5} scale={8} blur={2} />
    </Canvas>
  )
}