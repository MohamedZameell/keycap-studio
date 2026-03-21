import React from 'react';
import { useStore } from '../store';

export default function AboutScreen() {
  const setScreen = useStore(s => s.setScreen);

  return (
    <div style={{ backgroundColor: 'var(--surface-dim)', color: 'var(--on-surface)', minHeight: '100vh', fontFamily: 'var(--font-body)', position: 'relative' }}>
      <nav style={{ padding: '0 32px', height: '64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, cursor: 'pointer' }} onClick={() => setScreen('entry')}>Keycap Studio</div>
        <div style={{ display: 'flex', gap: '32px' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setScreen('gallery'); }} style={{ color: 'var(--on-surface-variant)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Gallery</a>
          <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', borderBottom: '2px solid var(--primary)', paddingBottom: '4px', fontFamily: 'var(--font-body)', fontWeight: 600 }}>About</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setScreen('support'); }} style={{ color: 'var(--on-surface-variant)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Support</a>
          <a href="https://github.com/MohamedZameel" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--on-surface-variant)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontWeight: 600 }}>GitHub</a>
        </div>
        <button style={{ background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', padding: '10px 24px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.05em' }} onClick={() => setScreen('selector')}>Build Now</button>
      </nav>

      <main>
        <div style={{ minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '20%', left: '25%', width: '400px', height: '400px', borderRadius: '50%', background: 'var(--primary)', opacity: 0.1, filter: 'blur(100px)' }}></div>
          <div style={{ position: 'absolute', bottom: '20%', right: '25%', width: '400px', height: '400px', borderRadius: '50%', background: 'var(--secondary)', opacity: 0.1, filter: 'blur(100px)' }}></div>
          
          <div style={{ position: 'relative', zIndex: 10, maxWidth: '900px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--secondary)', letterSpacing: '0.3em', textTransform: 'uppercase', fontSize: '12px', display: 'block', marginBottom: '24px' }}>V.01 ALPHA RELEASE</span>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '72px', fontWeight: 700, margin: '0 0 32px 0', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              The first free <br/><span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>3D keycap designer</span>
            </h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '20px', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto' }}>
              Precision-milled for the enthusiast community. No subscriptions, no gatekeeping—just pure digital craftsmanship.
            </p>
          </div>
        </div>

        <div style={{ padding: '96px 32px', background: 'var(--surface-container-low)', display: 'flex', justifyContent: 'center' }}>
          <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', gap: '64px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '40px', fontWeight: 700, margin: '0 0 32px 0', letterSpacing: '-0.02em' }}>Why we built it</h2>
              <div style={{ color: 'var(--on-surface-variant)', fontSize: '18px', lineHeight: 1.8 }}>
                <p style={{ marginBottom: '24px' }}>The keyboard hobby is tactile, three-dimensional, and physical. Yet, for years, designers have been forced to conceptualize their art in 2D flat files or expensive, closed CAD ecosystems.</p>
                <p style={{ marginBottom: '24px' }}>We believe <span style={{ color: 'var(--on-surface)', fontWeight: 600 }}>2D is hard</span> because it asks you to imagine the light, the texture, and the shadows. <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>3D is the future</span> because it lets you feel the board before it even hits the CNC mill.</p>
                <p>Keycap Studio was born from the frustration of technical barriers. We built a bridge between creative vision and physical reality.</p>
              </div>
            </div>
            <div style={{ flex: 1, background: 'var(--surface-container-highest)', aspectRatio: '1', borderRadius: '4px', overflow: 'hidden' }}>
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCB1NGlL3I2jWOpVj6sBPFdDO1fmDGrflYZbAXJ2oaFgdL4gTtnLR1Rt-zfDOc0P3Oa3SvEDrKy7-sQHFuJ7caTqfYqRJU8VPWiLvmlQiuThHEhz3m1KChWestjo0RLLMsao_Q22XRwyzESzMVKKX5DG3oRGW-CpiQPSJYb7JunlhIEg1zhfNmqGXYSzUBAlCO9fpWTGuzcSKVy-uoj-VdFRNCUbpMe1SxZzkJFsdmrMvkGd_VMSUktBouhP90DCJCzqQtZb24O-7Dq" alt="Keyboard Chassis" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
            </div>
          </div>
        </div>

        <div style={{ padding: '128px 32px', background: 'var(--surface-container-lowest)', textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.2em', padding: '4px 16px', border: '1px solid var(--outline-variant)', background: 'var(--surface)', display: 'inline-block', marginBottom: '32px' }}>Open Source Core</span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '48px', fontWeight: 700, margin: '0 0 32px 0', letterSpacing: '-0.02em' }}>Built for the community</h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '20px', maxWidth: '700px', margin: '0 auto 48px auto', lineHeight: 1.6 }}>Keycap Studio is an open-source project. We believe the future of design tools shouldn't be locked behind a subscription. Help us build the future of keyboard design on GitHub.</p>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
            <a href="https://github.com/MohamedZameel" target="_blank" rel="noopener noreferrer" style={{ background: 'var(--on-surface)', color: 'var(--surface)', textDecoration: 'none', padding: '16px 40px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', borderRadius: '4px' }}>View Source on GitHub</a>
            <a href="#" style={{ background: 'transparent', border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', textDecoration: 'none', padding: '16px 40px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', borderRadius: '4px' }}>Join Discord</a>
          </div>
        </div>
      </main>
    </div>
  );
}
