import React, { useState } from 'react';
import { useStore } from '../store';

function KeycapGrid() {
  const rows = 16;
  const cols = 24;
  const keycaps = [];
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const delay = (r * 0.15) + (c * 0.1);
      keycaps.push(
        <div key={`${r}-${c}`} className="bg-keycap" style={{ animationDelay: `${delay}s` }} />
      );
    }
  }

  return (
    <div className="keycap-grid-container">
      <div className="keycap-grid">
        {keycaps}
      </div>
      <div className="grid-overlay" />
    </div>
  );
}

export default function EntryScreen() {
  const setScreen = useStore(s => s.setScreen);
  const setSelectionPath = useStore(s => s.setSelectionPath);
  const [showAbout, setShowAbout] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const handleBeginner = () => {
    setSelectionPath('beginner');
    setScreen('selector');
  };

  const handleEnthusiast = () => {
    setSelectionPath('enthusiast');
    setScreen('selector');
  };

  return (
    <div className="entry-container">
      <style>{`
        .entry-container {
          position: relative; width: 100%; min-height: 100vh;
          background-color: #050508; overflow: hidden;
          font-family: 'Inter', sans-serif;
        }

        /* Nav Bar */
        .nav-bar {
          position: fixed; top: 0; left: 0; right: 0; height: 56px;
          background: rgba(10, 10, 15, 0.8); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 32px; z-index: 100;
        }
        .nav-logo { display: flex; align-items: center; gap: 8px; color: white; font-weight: 600; font-size: 18px; }
        .nav-logo-accent { width: 12px; height: 12px; background: #6c63ff; border-radius: 3px; }
        .nav-links { display: flex; gap: 24px; }
        .nav-link { 
          color: #888899; font-size: 14px; text-decoration: none; cursor: pointer;
          transition: color 0.2s ease; background: none; border: none; padding: 0;
        }
        .nav-link:hover { color: white; }

        /* Animated Grid */
        .keycap-grid-container {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0; overflow: hidden;
          perspective: 1000px;
        }
        .keycap-grid {
          display: grid;
          grid-template-columns: repeat(24, 48px);
          grid-auto-rows: 48px;
          gap: 6px;
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotateX(30deg) scale(1.5);
          transform-style: preserve-3d;
        }
        .bg-keycap {
          width: 48px; height: 48px;
          border-radius: 8px;
          background: #111122;
          box-shadow: inset 0 4px 6px rgba(255,255,255,0.05), inset 0 -4px 6px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.4);
          animation: colorWave 8s ease-in-out infinite alternate;
        }
        .grid-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to bottom, rgba(5,5,8,0.2) 0%, rgba(5,5,8,0.8) 100%);
          z-index: 1; pointer-events: none;
        }

        @keyframes colorWave {
          0% { background: #111122; transform: translateZ(0px); }
          25% { background: #1a1a3a; transform: translateZ(4px); }
          50% { background: #2f1b4a; transform: translateZ(8px); }
          75% { background: #1a2a4a; transform: translateZ(4px); }
          100% { background: #0f1f2f; transform: translateZ(0px); }
        }

        /* Content */
        .main-content {
          position: relative; z-index: 10;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 100vh; padding-top: 56px; gap: 48px;
        }
        .header-title {
          font-size: clamp(40px, 6vw, 72px); font-weight: 800; letter-spacing: -2px;
          color: white; margin: 0; text-shadow: 0 4px 24px rgba(0,0,0,0.5);
        }
        .header-subtitle {
          font-size: clamp(16px, 2vw, 20px); color: #888899; margin: 12px 0 0 0;
          font-weight: 400; text-shadow: 0 2px 12px rgba(0,0,0,0.5);
        }
        
        .cards-row { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
        
        .glass-card {
          width: 360px; height: 220px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 20px; padding: 32px;
          display: flex; flex-direction: column; align-items: flex-start; text-align: left;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
                      border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .glass-card:hover {
          border-color: rgba(108, 99, 255, 0.5);
          transform: translateY(-8px);
          box-shadow: 0 20px 60px rgba(108, 99, 255, 0.15), inset 0 0 0 1px rgba(255,255,255,0.05);
        }
        .glass-card:hover .inner-glow { opacity: 1; }

        .inner-glow {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at 50% 0%, rgba(108, 99, 255, 0.1) 0%, transparent 60%);
          opacity: 0; transition: opacity 0.5s; border-radius: 20px; pointer-events: none;
        }

        .card-icon { font-size: 36px; margin-bottom: 16px; line-height: 1; }
        .card-title { font-size: 24px; font-weight: 700; color: white; margin: 0 0 8px 0; }
        .card-desc { font-size: 14px; color: #888899; line-height: 1.5; margin: 0; }
        .card-pill {
          margin-top: auto; padding: 6px 12px; border-radius: 100px;
          font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .pill-beginner { background: rgba(13, 158, 117, 0.15); color: #4dffce; }
        .pill-enthusiast { background: rgba(108, 99, 255, 0.15); color: #b3b0ff; }

        /* Footer */
        .footer {
          position: absolute; bottom: 24px; left: 0; right: 0;
          text-align: center; font-size: 12px; color: #444460;
          letter-spacing: 0.5px;
        }

        /* Modal */
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 200;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-content {
          background: #11111a; border: 1px solid #2a2a4a;
          border-top: 4px solid #6c63ff; border-radius: 16px;
          padding: 32px; width: 100%; max-width: 400px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          position: relative;
        }
        .modal-title { color: white; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; }
        .modal-text { color: #888899; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0; }
        .modal-close {
          position: absolute; top: 16px; right: 16px;
          background: none; border: none; color: #888899;
          font-size: 24px; cursor: pointer; line-height: 1;
        }
        .modal-close:hover { color: white; }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Nav */}
      <div className="nav-bar">
        <div className="nav-logo">
          <div className="nav-logo-accent" />
          Keycap Studio
        </div>
        <div className="nav-links">
          <button className="nav-link" onClick={() => setShowAbout(true)}>About</button>
          <button className="nav-link" onClick={() => setScreen('gallery')}>Gallery</button>
          <button className="nav-link" onClick={() => setShowSupport(true)}>Support</button>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="nav-link">GitHub ↗</a>
        </div>
      </div>

      <KeycapGrid />

      <div className="main-content">
        <div style={{ textAlign: 'center' }}>
          <h1 className="header-title">Keycap Studio</h1>
          <p className="header-subtitle">Design your dream keyboard. In 3D. Free.</p>
        </div>

        <div className="cards-row">
          <button className="glass-card" onClick={handleBeginner}>
            <div className="inner-glow" />
            <div className="card-icon">⌨️</div>
            <h2 className="card-title">I have a keyboard</h2>
            <p className="card-desc">Select from our database of 80+ real mechanical keyboards. We automatically set form factor and layout.</p>
            <div className="card-pill pill-beginner">Recommended for beginners</div>
          </button>

          <button className="glass-card" onClick={handleEnthusiast}>
            <div className="inner-glow" />
            <div className="card-icon">⚙️</div>
            <h2 className="card-title">I know my setup</h2>
            <p className="card-desc">Start from scratch. Choose your keycap profile, layout size, and ANSI/ISO standard manually.</p>
            <div className="card-pill pill-enthusiast">For keyboard enthusiasts</div>
          </button>
        </div>
      </div>

      <div className="footer">
        Keycap Studio — Free & Open Source — keycap-studio.vercel.app
      </div>

      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAbout(false)}>×</button>
            <h3 className="modal-title">About Keycap Studio</h3>
            <p className="modal-text">Keycap Studio is a free, open-source 3D keycap designer. Design your dream keyboard in real-time 3D and export manufacturer-ready files instantly.</p>
            <p className="modal-text">Check out the <b>Community Gallery</b> to see what others are creating!</p>
            <p className="modal-text" style={{ fontSize: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid #2a2a4a' }}>Built by the community, for the community.</p>
          </div>
        </div>
      )}

      {showSupport && (
        <div className="modal-overlay" onClick={() => setShowSupport(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSupport(false)}>×</button>
            <h3 className="modal-title">Need help?</h3>
            <p className="modal-text">• Check our GitHub issues</p>
            <p className="modal-text">• Join the Discord community</p>
            <p className="modal-text">• Email: support@keycapstudio.com</p>
          </div>
        </div>
      )}

    </div>
  );
}
