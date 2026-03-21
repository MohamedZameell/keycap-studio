import React from 'react';
import { useStore } from '../store';

export default function SupportScreen() {
  const setScreen = useStore(s => s.setScreen);

  return (
    <div style={{ backgroundColor: 'var(--surface-dim)', color: 'var(--on-surface)', minHeight: '100vh', fontFamily: 'var(--font-body)', position: 'relative' }}>
      <nav style={{ padding: '0 32px', height: '64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, cursor: 'pointer' }} onClick={() => setScreen('entry')}>Keycap Studio</div>
        <div style={{ display: 'flex', gap: '32px' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setScreen('gallery'); }} style={{ color: 'var(--on-surface-variant)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Gallery</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setScreen('about'); }} style={{ color: 'var(--on-surface-variant)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontWeight: 600 }}>About</a>
          <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', borderBottom: '2px solid var(--primary)', paddingBottom: '4px', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Support</a>
          <a href="https://github.com/MohamedZameel" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--on-surface-variant)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontWeight: 600 }}>GitHub</a>
        </div>
        <button style={{ background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', padding: '10px 24px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.05em' }} onClick={() => setScreen('selector')}>Build Now</button>
      </nav>

      <main>
        <section style={{ position: 'relative', paddingTop: '96px', paddingBottom: '64px', paddingLeft: '32px', paddingRight: '32px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '500px', background: 'linear-gradient(to bottom, rgba(208, 188, 255, 0.05), transparent)', pointerEvents: 'none' }}></div>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10 }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '64px', fontWeight: 700, margin: '0 0 24px 0', letterSpacing: '-0.02em' }}>Technical Support</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '20px', lineHeight: 1.6, marginBottom: '40px' }}>Precision is our priority. Whether you're troubleshooting a PCB layout or selecting the perfect profile, our machinist-grade resources are here to help.</p>
            
            <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
              <input type="text" placeholder="Search the documentation..." style={{ width: '100%', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', padding: '20px 24px', borderRadius: '4px', color: 'var(--on-surface)', fontFamily: 'var(--font-mono)', fontSize: '14px', outline: 'none' }} />
              <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'var(--surface-container-highest)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--outline)' }}>CMD + K</div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
            <div style={{ width: '40px', height: '2px', background: 'var(--primary)' }}></div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', margin: 0 }}>Frequently Asked Questions</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <details style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: '4px', padding: '24px', cursor: 'pointer' }} open>
              <summary style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 500, outline: 'none', listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
                How do I select my keyboard?
                <span style={{ fontSize: '14px', color: 'var(--outline)' }}>▼</span>
              </summary>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6, margin: 0 }}>Navigate to the <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>Build</span> tab in the SideNav. You can filter by form factor (60%, 65%, TKL) and case material. Once selected, the 3D viewport will update in real-time to reflect your chassis choice.</p>
              </div>
            </details>
            
            <details style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: '4px', padding: '24px', cursor: 'pointer' }}>
              <summary style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 500, outline: 'none', listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
                What file format do I export?
                <span style={{ fontSize: '14px', color: 'var(--outline)' }}>▼</span>
              </summary>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6, margin: 0 }}>We offer high-fidelity exports in <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>.JSON</span> for layout configurations and <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>.SVG</span> for custom plate milling templates. If you are ordering through our partners, the automated link will handle the handshake.</p>
              </div>
            </details>
            
            <details style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: '4px', padding: '24px', cursor: 'pointer' }}>
              <summary style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 500, outline: 'none', listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
                What is a keycap profile?
                <span style={{ fontSize: '14px', color: 'var(--outline)' }}>▼</span>
              </summary>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6, margin: 0 }}>A profile refers to the physical shape and height of the keycaps. <span style={{ color: 'var(--tertiary)' }}>Cherry</span> is the gold standard for ergonomics, while <span style={{ color: 'var(--tertiary)' }}>SA</span> offers a high-profile, retro spherical aesthetic. Check our Glossary below for a full technical breakdown.</p>
              </div>
            </details>
          </div>
        </section>

      </main>
    </div>
  );
}
