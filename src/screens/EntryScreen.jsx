import React, { Suspense } from 'react';
import { useStore } from '../store';
import { Canvas } from '@react-three/fiber';
import Keycap from '../components/Keycap';
import { Environment, Float, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function BackgroundKeycap() {
  const groupRef = React.useRef();
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003;
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.0003) * 0.1;
    }
  });

  return (
    <group ref={groupRef} scale={[2.2, 2.2, 2.2]}>
       <Keycap keyId="bg" label="K" isSelected={false} />
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
        <Canvas camera={{ position: [0, 2, 6], fov: 35 }}>
          <Environment preset="studio" background={false}/>
          <directionalLight position={[5, 8, 3]} intensity={2.0} />
          <ambientLight intensity={0.4} />
          <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
          <Suspense fallback={null}>
            <BackgroundKeycap />
          </Suspense>
        </Canvas>
      </div>

      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Keycap Studio</h1>
          <p style={styles.subtitle}>Design your dream keyboard. In 3D. Free.</p>
        </div>

        <div style={styles.cardsRow}>
          {/* Beginner Card */}
          <button style={styles.card} onClick={handleBeginner} className="hover-scale">
            <div style={styles.icon}>⌨️</div>
            <h2 style={styles.cardTitle}>I have a keyboard</h2>
            <p style={styles.cardDesc}>Select your exact keyboard model and we'll set everything up for you.</p>
            <div style={styles.tagBeginner}>Recommended for beginners</div>
          </button>

          {/* Enthusiast Card */}
          <button style={styles.card} onClick={handleEnthusiast} className="hover-scale">
            <div style={styles.icon}>⚙️</div>
            <h2 style={styles.cardTitle}>I know my setup</h2>
            <p style={styles.cardDesc}>Choose your keycap profile, layout size, and standard manually.</p>
            <div style={styles.tagEnthusiast}>For keyboard enthusiasts</div>
          </button>
        </div>
      </div>
      
      <style>{`
        .hover-scale { transition: transform 0.2s ease, border-color 0.2s ease; }
        .hover-scale:hover { transform: translateY(-4px) scale(1.02); border-color: var(--primary-accent); }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-color)',
    overflow: 'hidden'
  },
  canvasContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.15, // subtle background
    pointerEvents: 'none'
  },
  content: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '64px',
    maxWidth: '1000px',
    padding: '0 24px',
    textAlign: 'center'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  title: {
    fontSize: '64px',
    fontWeight: 700,
    letterSpacing: '-1.5px',
    color: 'var(--text-primary)',
    margin: 0
  },
  subtitle: {
    fontSize: '20px',
    color: 'var(--text-secondary)',
    margin: 0
  },
  cardsRow: {
    display: 'flex',
    gap: '32px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '32px',
    width: '380px',
    textAlign: 'left',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)'
  },
  icon: {
    fontSize: '48px',
    marginBottom: '24px'
  },
  cardTitle: {
    fontSize: '28px',
    marginBottom: '12px',
    color: 'var(--text-primary)'
  },
  cardDesc: {
    fontSize: '16px',
    lineHeight: 1.5,
    color: 'var(--text-secondary)',
    marginBottom: '32px'
  },
  tagBeginner: {
    marginTop: 'auto',
    backgroundColor: 'rgba(13, 158, 117, 0.15)',
    color: 'var(--success)',
    padding: '6px 14px',
    borderRadius: 'var(--radius-pill)',
    fontSize: '14px',
    fontWeight: 600
  },
  tagEnthusiast: {
    marginTop: 'auto',
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    color: 'var(--primary-accent)',
    padding: '6px 14px',
    borderRadius: 'var(--radius-pill)',
    fontSize: '14px',
    fontWeight: 600
  }
};
