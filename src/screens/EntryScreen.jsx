import React, { Suspense } from 'react';
import { useStore } from '../store';
import { Canvas, useFrame } from '@react-three/fiber';
import Keycap from '../components/Keycap';
import { Environment, Stars } from '@react-three/drei';

function PrimaryKeycap() {
  const groupRef = React.useRef();
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003;
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[1.5, 0, -1.5]} rotation={[-0.3, 0.4, 0]} scale={[2.0, 2.0, 2.0]}>
      <Keycap keyId="bg" label="K" isSelected={false} />
    </group>
  );
}

function SecondaryKeycap() {
  const groupRef = React.useRef();
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y -= 0.002;
      groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.4) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[-2.5, 1.2, -3]} rotation={[-0.3, -0.4, 0.1]} scale={[1.2, 1.2, 1.2]}>
      <Keycap keyId="bg2" label="S" isSelected={false} />
    </group>
  );
}

export default function EntryScreen() {
  const setScreen = useStore(s => s.setScreen);
  const setSelectionPath = useStore(s => s.setSelectionPath);

  const handleBeginner = () => {
    setSelectionPath('beginner');
    setScreen('selector');
  };

  const handleEnthusiast = () => {
    setSelectionPath('enthusiast');
    setScreen('selector');
  };

  return (
    <div style={styles.container}>
      {/* 3D Background */}
      <div style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 1.5, 7], fov: 45 }}>
          <Environment preset="apartment" background={false} />
          <directionalLight position={[5, 8, 3]} intensity={2.0} />
          <ambientLight intensity={0.4} />
          <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
          <Suspense fallback={null}>
            <PrimaryKeycap />
            <SecondaryKeycap />
          </Suspense>
        </Canvas>
      </div>

      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Keycap Studio</h1>
          <p style={styles.subtitle}>Design your dream keyboard. In 3D. Free.</p>
        </div>

        <div style={styles.cardsRow}>
          <button style={styles.card} onClick={handleBeginner} className="hover-scale">
            <div style={styles.icon}>⌨️</div>
            <h2 style={styles.cardTitle}>I have a keyboard</h2>
            <p style={styles.cardDesc}>Select your exact keyboard model and we'll set everything up for you.</p>
            <div style={styles.tagBeginner}>Recommended for beginners</div>
          </button>

          <button style={styles.card} onClick={handleEnthusiast} className="hover-scale">
            <div style={styles.icon}>⚙️</div>
            <h2 style={styles.cardTitle}>I know my setup</h2>
            <p style={styles.cardDesc}>Choose your keycap profile, layout size, and standard manually.</p>
            <div style={styles.tagEnthusiast}>For keyboard enthusiasts</div>
          </button>
        </div>
      </div>

      <style>{`
        .hover-scale { transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
        .hover-scale:hover { transform: translateY(-4px) scale(1.02); border-color: var(--primary-accent); box-shadow: 0 16px 32px rgba(108, 99, 255, 0.15); }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative', width: '100%', height: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'var(--bg-color)', overflow: 'hidden'
  },
  canvasContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.2, pointerEvents: 'none'
  },
  content: {
    position: 'relative', zIndex: 10,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 'clamp(40px, 6vh, 64px)', maxWidth: '1000px', padding: '0 24px', textAlign: 'center'
  },
  header: { display: 'flex', flexDirection: 'column', gap: '12px' },
  title: {
    fontSize: 'clamp(48px, 6vw, 80px)', fontWeight: 700, letterSpacing: '-1.5px',
    color: 'var(--text-primary)', margin: 0
  },
  subtitle: { fontSize: 'clamp(16px, 2vw, 22px)', color: 'var(--text-secondary)', margin: 0 },
  cardsRow: { display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'stretch' },
  card: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
    borderRadius: '16px', padding: '32px', width: '380px', height: '100%', textAlign: 'left',
    position: 'relative', overflow: 'hidden', backdropFilter: 'blur(10px)'
  },
  icon: { fontSize: '48px', marginBottom: '16px' },
  cardTitle: { fontSize: 'clamp(22px, 2.5vw, 28px)', marginBottom: '12px', color: 'var(--text-primary)' },
  cardDesc: { fontSize: '16px', lineHeight: 1.5, color: 'var(--text-secondary)', marginBottom: '32px' },
  tagBeginner: {
    marginTop: 'auto', backgroundColor: 'rgba(13, 158, 117, 0.15)',
    color: 'var(--success)', padding: '6px 14px', borderRadius: 'var(--radius-pill)',
    fontSize: '14px', fontWeight: 600
  },
  tagEnthusiast: {
    marginTop: 'auto', backgroundColor: 'rgba(108, 99, 255, 0.15)',
    color: 'var(--primary-accent)', padding: '6px 14px', borderRadius: 'var(--radius-pill)',
    fontSize: '14px', fontWeight: 600
  }
};
