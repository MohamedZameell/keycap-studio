import React, { useState } from 'react';
import { useStore } from '../store';
import { KEYBOARDS, BRANDS, FORM_FACTORS, PROFILES, LAYOUTS } from '../data/keyboards';
import KeyboardSilhouette from '../components/KeyboardSilhouette';

export default function SelectorScreen() {
  const store = useStore();
  const path = store.selectionPath;

  const [step, setStep] = useState(1);
  const [localBrand, setLocalBrand] = useState(null);
  const [selectedModelObj, setSelectedModelObj] = useState(null);
  const [localProfile, setLocalProfile] = useState(null);
  const [localFormFactor, setLocalFormFactor] = useState(null);
  const [localLayout, setLocalLayout] = useState(null);
  const [brandSearch, setBrandSearch] = useState('');

  const handleSelectModel = (model) => {
    setSelectedModelObj(model);
    store.setSelectedBrand(model.brand);
    store.setSelectedModel(model.model);
    store.setSelectedFormFactor(model.formFactor);
    store.setSelectedProfile(model.profile);
    store.setSelectedLayout(model.layout);
    store.setKeyboardLEDType(model.ledType);
    setStep('confirm');
  };

  const finalizeEnthusiast = () => {
    store.setSelectedProfile(localProfile);
    store.setSelectedFormFactor(localFormFactor);
    store.setSelectedLayout(localLayout);
    store.setSelectedModel('Custom Build');
    store.setKeyboardLEDType('None');
    setStep('confirm');
  };

  const getLEDAdviceBox = (type) => {
    if (type?.includes('North')) return { color: '#0d9e75', icon: '↑', text: "North-facing LEDs shine UP through your legends. Use light or white legends for maximum glow." };
    if (type?.includes('South')) return { color: '#f5a623', icon: '↓', text: "South-facing LEDs create desk underglow. Any legend color works well." };
    if (type?.includes('Per-key')) return { color: '#6c63ff', icon: '✦', text: "Per-key RGB gives full color control per key. Pudding keycaps maximize this effect." };
    return { color: '#888899', icon: '—', text: "No backlight. Focus on strong color contrast between keycap and legend." };
  };

  const getLEDColor = (type) => getLEDAdviceBox(type).color;

  const countMap = { '100%': 104, '96%': 98, 'TKL': 87, '75%': 84, '65%': 68, '60%': 61, '40%': 47 };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes bgShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .brand-pill { transition: transform 0.15s, box-shadow 0.15s; }
        .brand-pill:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(108,99,255,0.2); }
        .model-card { transition: transform 0.2s, box-shadow 0.2s; }
        .model-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .enter-btn { position: relative; overflow: hidden; }
        .enter-btn:hover {
          background: linear-gradient(90deg, #6c63ff 0%, #8b7fff 25%, #6c63ff 50%, #8b7fff 75%, #6c63ff 100%);
          background-size: 200% auto;
          animation: shimmer 1.5s linear infinite;
        }
        .secondary-btn { transition: background-color 0.2s, color 0.2s; }
        .secondary-btn:hover { background-color: rgba(255,255,255,0.05); color: #fff; }
        .step-indicator { border-bottom: 2px solid transparent; padding-bottom: 2px; transition: all 0.3s ease; }
        .step-indicator.active { border-bottom-color: #6c63ff; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => {
          if (step === 'confirm' && path === 'beginner') { setStep(2); setSelectedModelObj(null); }
          else if (step > 1 && step !== 'confirm') setStep(step - 1);
          else if (step === 'confirm' && path === 'enthusiast') setStep(3);
          else { store.setSelectionPath(null); store.setScreen('entry'); }
        }}>← Back</button>

        <div style={styles.progressContainer}>
          {path === 'beginner' ? (
            <>
              <span className={`step-indicator ${step >= 1 ? 'active' : ''}`} style={step >= 1 ? styles.stepActive : styles.stepInactive}>Step 1: Brand</span>
              <span style={styles.stepArrow}>→</span>
              <span className={`step-indicator ${step >= 2 ? 'active' : ''}`} style={step >= 2 ? styles.stepActive : styles.stepInactive}>Step 2: Model</span>
              <span style={styles.stepArrow}>→</span>
              <span className={`step-indicator ${step === 'confirm' ? 'active' : ''}`} style={step === 'confirm' ? styles.stepActive : styles.stepInactive}>Step 3: Confirm</span>
            </>
          ) : (
            <>
              <span className={`step-indicator ${step >= 1 ? 'active' : ''}`} style={step >= 1 ? styles.stepActive : styles.stepInactive}>Step 1: Profile</span>
              <span style={styles.stepArrow}>→</span>
              <span className={`step-indicator ${step >= 2 ? 'active' : ''}`} style={step >= 2 ? styles.stepActive : styles.stepInactive}>Step 2: Form Factor</span>
              <span style={styles.stepArrow}>→</span>
              <span className={`step-indicator ${step >= 3 ? 'active' : ''}`} style={step >= 3 ? styles.stepActive : styles.stepInactive}>Step 3: Standard</span>
              <span style={styles.stepArrow}>→</span>
              <span className={`step-indicator ${step === 'confirm' ? 'active' : ''}`} style={step === 'confirm' ? styles.stepActive : styles.stepInactive}>Step 4: Confirm</span>
            </>
          )}
        </div>
      </div>

      <div style={styles.content}>
        {/* BEGINNER PATH */}
        {path === 'beginner' && (step === 1 || step === 2 || step === 'confirm') && (
          <div style={styles.grid}>
            {step === 1 && <div style={styles.stepTitle}>Select Keyboard Brand</div>}

            {(step === 1 || step === 2 || step === 'confirm') && (
              <>
                {step === 1 && (
                  <input 
                    type="text" 
                    placeholder="Search over 80+ keyboards..." 
                    value={brandSearch}
                    onChange={e => setBrandSearch(e.target.value)}
                    style={{ width: '100%', maxWidth: '400px', margin: '0 auto 16px', display: 'block', padding: '14px 20px', borderRadius: '12px', border: '1px solid #2a2a4a', backgroundColor: '#0a0a18', color: '#fff', fontSize: '16px', outline: 'none' }}
                  />
                )}
                <div style={styles.brandGrid}>
                  {BRANDS.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase())).map(b => {
                    const isSelected = localBrand === b;
                    return (
                      <button key={b} className="brand-pill" style={isSelected ? styles.brandPillActive : styles.brandPill}
                        onClick={() => { setLocalBrand(b); setStep(2); setSelectedModelObj(null); }}>
                        {b}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {(step === 2 || step === 'confirm') && localBrand && (
              <>
                <div style={styles.stepTitleWrapper}>
                  <div style={styles.stepTitle}>Select Model ({localBrand})</div>
                  <button style={styles.textLinkBtn} onClick={() => { setStep(1); setLocalBrand(null); setSelectedModelObj(null); }}>← Back to brands</button>
                </div>

                <div style={styles.modelsGrid}>
                  {KEYBOARDS.filter(k => k.brand === localBrand).map(k => {
                    const isCardSelected = selectedModelObj?.id === k.id;
                    return (
                      <div key={k.id} className="model-card" style={isCardSelected ? styles.modelCardSelected : styles.modelCard} onClick={() => handleSelectModel(k)}>
                        {isCardSelected && <div style={styles.cardCheckmark}>✓</div>}
                        <h3 style={styles.modelName}>
                          {k.model}
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: getLEDColor(k.ledType), marginLeft: 8, verticalAlign: 'middle', marginBottom: 2 }} title={k.ledType} />
                        </h3>
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0', flex: 1 }}>
                          <KeyboardSilhouette formFactor={k.formFactor} large={false} />
                        </div>
                        <div style={styles.badges}>
                          <span style={{ ...styles.badge, backgroundColor: 'rgba(108, 99, 255, 0.15)', color: '#b3b0ff' }}>{k.formFactor}</span>
                          <span style={{ ...styles.badge, backgroundColor: 'rgba(13, 158, 117, 0.15)', color: '#4dffce' }}>{k.keyCount} Keys</span>
                        </div>
                        <div style={styles.modelSpecs}>
                          <div>{k.ledType}</div>
                          <div>{k.profile} Profile</div>
                          {k.hotswap && <div style={{ color: 'var(--success)' }}>Hotswap</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ENTHUSIAST PATH */}
        {path === 'enthusiast' && step === 1 && (
          <div style={styles.grid}>
            <div style={styles.stepTitle}>Step 1: Choose Profile</div>
            <div style={styles.enthusiastGrid}>
              {PROFILES.map(p => (
                <button key={p} style={localProfile === p ? styles.selectCardActive : styles.selectCard}
                  onClick={() => { setLocalProfile(p); setStep(2); }}>
                  <h3>{p} Profile</h3>
                </button>
              ))}
            </div>
          </div>
        )}

        {path === 'enthusiast' && step === 2 && (
          <div style={styles.grid}>
            <div style={styles.stepTitle}>Step 2: Choose Form Factor</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {FORM_FACTORS.map(ff => (
                <button key={ff} className="model-card"
                  style={localFormFactor === ff ? styles.silhouetteCardActive : styles.silhouetteCard}
                  onClick={() => { setLocalFormFactor(ff); setStep(3); }}>
                  <div style={{ pointerEvents: 'none' }}>
                    <KeyboardSilhouette formFactor={ff} large={true} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', textAlign: 'center', marginTop: '16px' }}>{ff}</div>
                  <div style={{ fontSize: '12px', color: '#888899', textAlign: 'center', marginTop: '4px' }}>{countMap[ff] || 60} Keys</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {path === 'enthusiast' && step === 3 && (
          <div style={styles.grid}>
            <div style={styles.stepTitle}>Step 3: Choose Layout Standard</div>
            <div style={styles.enthusiastGrid}>
              {LAYOUTS.map(l => (
                <button key={l} style={localLayout === l ? styles.selectCardActive : styles.selectCard}
                  onClick={() => { setLocalLayout(l); finalizeEnthusiast(); }}>
                  <h3>{l}</h3>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* REDESIGNED CONFIRMATION CARD */}
        {step === 'confirm' && (
          <div style={styles.confirmWrapper}>
            <div style={styles.confirmCard}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{store.selectedModel || 'Custom'} Layout</h1>
              {store.selectedBrand && <div style={{ fontSize: 14, color: '#6c63ff', fontWeight: 600, marginBottom: 24 }}>{store.selectedBrand}</div>}

              {/* Three info columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={styles.specColumn}>
                  <div style={styles.specLabel}>Form Factor</div>
                  <div style={styles.specValue}>{store.selectedFormFactor}</div>
                  <div style={{ ...styles.specLabel, marginTop: 12 }}>Key Count</div>
                  <div style={styles.specValue}>{countMap[store.selectedFormFactor] || '~60'}</div>
                </div>
                <div style={styles.specColumn}>
                  <div style={styles.specLabel}>Layout Standard</div>
                  <div style={styles.specValue}>{store.selectedLayout || 'ANSI'}</div>
                  <div style={{ ...styles.specLabel, marginTop: 12 }}>Profile</div>
                  <div style={styles.specValue}>{store.selectedProfile || 'Cherry'}</div>
                </div>
                <div style={styles.specColumn}>
                  <div style={styles.specLabel}>LED Type</div>
                  <div style={styles.specValue}>{store.keyboardLEDType || 'None'}</div>
                  <div style={{ ...styles.specLabel, marginTop: 12 }}>Hotswap</div>
                  <div style={styles.specValue}>{selectedModelObj?.hotswap ? 'Yes' : 'N/A'}</div>
                </div>
              </div>

              {/* LED guidance */}
              {(() => {
                const adv = getLEDAdviceBox(store.keyboardLEDType);
                return (
                  <div style={{ ...styles.ledGuidanceBox, borderColor: adv.color, backgroundColor: `${adv.color}08` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600, color: '#fff' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: adv.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>
                        {adv.icon}
                      </div>
                      {store.keyboardLEDType || 'No Backlight'}
                    </div>
                    <p style={{ color: '#ccc', margin: 0, lineHeight: 1.5, fontSize: 13 }}>{adv.text}</p>
                  </div>
                );
              })()}

              {/* Action buttons */}
              <button className="enter-btn" style={styles.enterBtn} onClick={() => store.setScreen('studio')}>
                Enter Designer →
              </button>
              <button className="secondary-btn" style={styles.secondaryBtn} onClick={() => {
                setStep(path === 'beginner' ? 2 : 3);
                setSelectedModelObj(null);
                store.setSelectedModel(null);
              }}>
                ← Change keyboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column',
    background: 'radial-gradient(ellipse at 20% 50%, #6c63ff08 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #0d9e7508 0%, transparent 60%), #0a0a0f',
  },
  header: { display: 'flex', alignItems: 'center', padding: '24px 48px', borderBottom: '1px solid var(--border-color)', justifyContent: 'space-between' },
  progressContainer: { display: 'flex', gap: '8px', alignItems: 'center' },
  stepActive: { color: 'var(--primary-accent)', fontWeight: 600 },
  stepInactive: { color: 'var(--text-muted)' },
  stepArrow: { color: 'var(--text-muted)' },
  backBtn: { color: 'var(--text-secondary)', fontSize: '16px', padding: '8px 16px', borderRadius: 'var(--radius-btn)', backgroundColor: 'var(--panel-bg)' },
  content: { flex: 1, padding: '48px', maxWidth: '1200px', margin: '0 auto', width: '100%' },
  grid: { display: 'flex', flexDirection: 'column', gap: '24px' },
  stepTitleWrapper: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  stepTitle: { fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' },
  textLinkBtn: { color: 'var(--text-secondary)', textDecoration: 'underline', backgroundColor: 'transparent', padding: 0 },

  brandGrid: { display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', maxHeight: '400px', overflowY: 'auto', padding: '10px' },
  brandPill: { padding: '12px 24px', borderRadius: '32px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--text-muted)', fontSize: '16px', color: 'var(--text-secondary)', cursor: 'pointer' },
  brandPillActive: { padding: '12px 24px', borderRadius: '32px', backgroundColor: 'var(--primary-accent)', border: '1px solid var(--primary-accent)', fontSize: '16px', color: '#fff', cursor: 'pointer', fontWeight: 600 },

  modelsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' },
  modelCard: { position: 'relative', backgroundColor: 'var(--card-bg)', border: '2px solid var(--border-color)', borderRadius: '12px', padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' },
  modelCardSelected: { position: 'relative', backgroundColor: 'var(--card-bg)', border: '2px solid var(--primary-accent)', borderRadius: '12px', padding: '24px', cursor: 'pointer', transform: 'translateY(-4px)', display: 'flex', flexDirection: 'column', height: '100%' },
  cardCheckmark: { position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--primary-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  modelName: { fontSize: '24px', marginBottom: '16px' },
  badges: { display: 'flex', gap: '8px', marginBottom: '16px' },
  badge: { backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '16px', fontSize: '13px' },
  modelSpecs: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' },

  enthusiastGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  selectCard: { backgroundColor: 'var(--card-bg)', border: '2px solid var(--border-color)', borderRadius: '12px', padding: '32px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  selectCardActive: { backgroundColor: 'var(--card-bg)', border: '2px solid var(--primary-accent)', borderRadius: '12px', padding: '32px 16px', textAlign: 'center', cursor: 'pointer' },
  silhouetteCard: { backgroundColor: 'var(--card-bg)', border: '2px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  silhouetteCardActive: { backgroundColor: '#6c63ff11', border: '2px solid #6c63ff', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' },

  confirmWrapper: { display: 'flex', justifyContent: 'center', marginTop: '48px', paddingBottom: '48px' },
  confirmCard: { backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '800px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },

  specColumn: { backgroundColor: '#161626', padding: '16px 20px', borderRadius: '8px' },
  specLabel: { fontSize: 10, textTransform: 'uppercase', color: '#444460', fontWeight: 700, letterSpacing: '0.5px' },
  specValue: { fontSize: 14, fontWeight: 500, color: '#fff', marginTop: 2 },

  ledGuidanceBox: { padding: '20px', backgroundColor: '#111', borderLeft: '4px solid', borderRadius: '0 8px 8px 0', marginBottom: '24px' },

  enterBtn: { width: '100%', padding: '18px', backgroundColor: 'var(--primary-accent)', color: '#fff', fontSize: '18px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', border: 'none', marginBottom: 10 },
  secondaryBtn: { width: '100%', padding: '12px', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', border: '1px solid var(--border-color)', transition: 'all 0.2s' },
};
