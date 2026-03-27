import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { BRANDS, FORM_FACTORS, PROFILES, LAYOUTS, getBrandModels } from '../data/keyboards';
import KeyboardSilhouette from '../components/KeyboardSilhouette';

// Background loader for global search
let globalModelsCache = null;
const loadAllModels = async () => {
  if (globalModelsCache) return globalModelsCache;
  const all = await Promise.all(BRANDS.map(b => getBrandModels(b)));
  globalModelsCache = all.flat();
  return globalModelsCache;
};

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
  const [brandModels, setBrandModels] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Eagerly load all models in background for instantaneous global search
  useEffect(() => {
    loadAllModels().then(setAllModels);
  }, []);

  const handleBrandSelect = async (b) => {
    setLocalBrand(b); 
    setStep(2); 
    setSelectedModelObj(null);
    setBrandSearch(''); // clear search when diving into a brand
    
    setModelsLoading(true);
    const m = await getBrandModels(b);
    setBrandModels(m || []);
    setModelsLoading(false);
  };

  const handleSelectModel = (model) => {
    setSelectedModelObj(model);
    store.setSelectedBrand(model.brand);
    store.setSelectedModel(model.model || model.name || 'Custom');
    store.setSelectedFormFactor(model.formFactor);
    store.setSelectedProfile(model.profile || 'OEM');
    store.setSelectedLayout(model.layout || 'ANSI');
    store.setKeyboardLEDType(model.ledType || 'None');
    setStep(3); // Go to confirm step
  };

  const finalizeEnthusiast = () => {
    store.setSelectedProfile(localProfile);
    store.setSelectedFormFactor(localFormFactor);
    store.setSelectedLayout(localLayout);
    store.setSelectedModel('Custom Build');
    store.setKeyboardLEDType('None');
    setStep(4);
  };

  const getLEDAdviceBox = (type) => {
    if (type?.includes('North')) return { color: '#0d9e75', icon: '↑', text: "North-facing LEDs shine UP through your legends. Use light or white legends for maximum glow." };
    if (type?.includes('South')) return { color: '#f5a623', icon: '↓', text: "South-facing LEDs create desk underglow. Any legend color works well." };
    if (type?.includes('Per-key')) return { color: '#6c63ff', icon: '✦', text: "Per-key RGB gives full color control per key. Pudding keycaps maximize this effect." };
    return { color: '#888899', icon: '—', text: "No backlight. Focus on strong color contrast between keycap and legend." };
  };

  const getLEDColor = (type) => getLEDAdviceBox(type).color;
  const countMap = { '100%': 104, '96%': 98, 'TKL': 87, '75%': 84, '65%': 68, '60%': 61, '40%': 47 };

  // Search logic
  const searchLower = brandSearch.toLowerCase().trim();
  const filteredBrands = useMemo(() => {
    if (!searchLower) return BRANDS;
    return BRANDS.filter(b => b.toLowerCase().includes(searchLower));
  }, [searchLower]);

  const filteredModels = useMemo(() => {
    if (!searchLower || searchLower.length < 2) return [];
    return allModels.filter(m => 
      (m.name || m.model || '').toLowerCase().includes(searchLower) ||
      (m.brand || '').toLowerCase().includes(searchLower) ||
      (m.formFactor || '').toLowerCase().includes(searchLower) ||
      (m.layout || '').toLowerCase().includes(searchLower)
    ).slice(0, 100); // limit to 100 to avoid freezing
  }, [searchLower, allModels]);
  
  const renderModelCard = (k) => {
    const isCardSelected = selectedModelObj?.id === k.id;
    return (
      <div key={k.id} className="model-card" style={isCardSelected ? { borderColor: '#6c63ff', boxShadow: '0 0 0 1px #6c63ff inset' } : {}} onClick={() => handleSelectModel(k)}>
        <h3 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {k.name || k.model}
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: getLEDColor(k.ledType), flexShrink: 0 }} title={k.ledType} />
        </h3>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16, pointerEvents: 'none' }}>
          <KeyboardSilhouette formFactor={k.formFactor} large={false} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ backgroundColor: '#6c63ff22', color: '#b3b0ff', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{k.formFactor}</span>
          <span style={{ backgroundColor: '#ffffff11', color: '#aaaaaa', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>{countMap[k.formFactor] || 60} Keys</span>
          {k.hotswap && <span style={{ backgroundColor: '#0d9e7522', color: '#4dffce', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Hotswap</span>}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#888899', flexWrap: 'wrap' }}>
          <span>{k.ledType || 'No LED'}</span>
          <span>{k.profile || 'OEM'} Profile</span>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <style>{`
        .brand-pill {
          background: rgba(16, 16, 20, 0.6); border: 1px solid rgba(246, 246, 246, 0.06);
          padding: 14px 20px; border-radius: 10px; color: var(--on-surface-variant);
          cursor: pointer; font-family: var(--font-heading); font-size: 14px; font-weight: 600;
          text-align: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(8px);
        }
        .brand-pill:hover {
          background: rgba(30, 30, 36, 0.8); color: var(--on-surface);
          transform: translateY(-3px); border-color: rgba(246, 246, 246, 0.12);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        .brand-pill.active {
          background: linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%);
          color: var(--on-primary); font-weight: 700; border-color: transparent;
          box-shadow: 0 4px 20px rgba(208, 188, 255, 0.3);
        }

        .model-card {
          background: rgba(16, 16, 20, 0.6); border: 1px solid rgba(246, 246, 246, 0.06);
          border-radius: 12px; padding: 24px; cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex; flex-direction: column; height: 100%;
          position: relative; overflow: hidden; backdrop-filter: blur(8px);
        }
        .model-card:hover {
          transform: translateY(-6px);
          background: rgba(22, 22, 26, 0.8);
          border-color: rgba(208, 188, 255, 0.25);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        }

        .enter-btn {
          width: 100%; height: 54px;
          background: linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%);
          color: var(--on-primary); font-family: var(--font-heading);
          font-size: 15px; font-weight: 700; border-radius: 10px;
          border: none; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 12px;
          box-shadow: 0 4px 20px rgba(208, 188, 255, 0.3);
        }
        .enter-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 28px rgba(208, 188, 255, 0.4);
        }

        .secondary-btn {
          width: 100%; height: 48px;
          background: transparent; color: var(--on-surface-variant);
          font-family: var(--font-heading); font-size: 14px; font-weight: 600;
          border-radius: 10px; border: 1px solid rgba(246, 246, 246, 0.1);
          cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .secondary-btn:hover {
          background: rgba(246, 246, 246, 0.05);
          border-color: rgba(246, 246, 246, 0.2);
          color: var(--on-surface);
        }

        .step-indicator {
          padding: 6px 12px; border-radius: 100px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--on-surface-variant); font-family: var(--font-mono);
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
          background: transparent;
        }
        .step-indicator.active {
          background: rgba(208, 188, 255, 0.15);
          color: var(--primary); font-weight: 600;
        }

        .brand-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; margin-top: 24px; }
        .model-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 24px; }

        @media (max-width: 1100px) { .model-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 700px) { .model-grid { grid-template-columns: 1fr; } .brand-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 500px) { .brand-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => {
          if (!path) { store.setScreen('entry'); }
          else if (step === 3 && path === 'beginner') { setStep(localBrand ? 2 : 1); setSelectedModelObj(null); }
          else if (step === 2 && path === 'beginner') { setStep(1); setLocalBrand(null); }
          else if (step === 4 && path === 'enthusiast') setStep(3);
          else if (step === 1) { store.setSelectionPath(null); setStep(1); }
          else if (step > 1) setStep(step - 1);
          else { store.setSelectionPath(null); store.setScreen('entry'); }
        }}>← Back</button>

        <div style={styles.progressContainer}>
          {!path ? (
            <span className="step-indicator active">Choose Your Path</span>
          ) : path === 'beginner' ? (
            <>
              <span className={`step-indicator ${step === 1 ? 'active' : ''}`}>Step 1: Brand</span>
              <span style={{color: '#444'}}>→</span>
              <span className={`step-indicator ${step === 2 ? 'active' : ''}`}>Step 2: Model</span>
              <span style={{color: '#444'}}>→</span>
              <span className={`step-indicator ${step === 3 ? 'active' : ''}`}>Step 3: Confirm</span>
            </>
          ) : (
            <>
              <span className={`step-indicator ${step === 1 ? 'active' : ''}`}>Step 1: Profile</span>
              <span style={{color: '#444'}}>→</span>
              <span className={`step-indicator ${step === 2 ? 'active' : ''}`}>Step 2: Form Factor</span>
              <span style={{color: '#444'}}>→</span>
              <span className={`step-indicator ${step === 3 ? 'active' : ''}`}>Step 3: Standard</span>
              <span style={{color: '#444'}}>→</span>
              <span className={`step-indicator ${step === 4 ? 'active' : ''}`}>Step 4: Confirm</span>
            </>
          )}
        </div>
      </div>

      <div style={styles.content}>
        {/* PATH SELECTION */}
        {!path && (
          <div style={styles.fadeContainer}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--secondary)',
                textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '16px',
              }}>Get Started</p>
              <h1 style={{
                fontFamily: 'var(--font-heading)', fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 700, color: 'var(--on-surface)', marginBottom: 12, letterSpacing: '-0.02em',
              }}>Choose your path</h1>
              <p style={{ fontSize: 16, color: 'var(--on-surface-variant)', maxWidth: 400, margin: '0 auto' }}>
                How would you like to set up your keyboard?
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 800, margin: '0 auto' }}>
              <button
                onClick={() => store.setSelectionPath('beginner')}
                style={{
                  padding: '40px 32px',
                  background: 'rgba(16, 16, 20, 0.6)',
                  border: '1px solid rgba(246, 246, 246, 0.06)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(12px)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(208, 188, 255, 0.3)';
                  e.currentTarget.style.background = 'rgba(208, 188, 255, 0.06)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(246, 246, 246, 0.06)';
                  e.currentTarget.style.background = 'rgba(16, 16, 20, 0.6)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'rgba(208, 188, 255, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, marginBottom: 20,
                }}>⌨️</div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 10 }}>I have a keyboard</h3>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                  Browse 800+ keyboard models and select your exact brand for accurate specs.
                </p>
                <div style={{ marginTop: 20, fontSize: 12, color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Recommended <span style={{ opacity: 0.6 }}>→</span>
                </div>
              </button>
              <button
                onClick={() => store.setSelectionPath('enthusiast')}
                style={{
                  padding: '40px 32px',
                  background: 'rgba(16, 16, 20, 0.6)',
                  border: '1px solid rgba(246, 246, 246, 0.06)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(12px)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(68, 226, 205, 0.3)';
                  e.currentTarget.style.background = 'rgba(68, 226, 205, 0.06)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(246, 246, 246, 0.06)';
                  e.currentTarget.style.background = 'rgba(16, 16, 20, 0.6)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'rgba(68, 226, 205, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, marginBottom: 20,
                }}>🔧</div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 10 }}>I know my setup</h3>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                  Manually select profile, form factor, and layout for custom builds.
                </p>
                <div style={{ marginTop: 20, fontSize: 12, color: 'var(--secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  For Enthusiasts <span style={{ opacity: 0.6 }}>→</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* BEGINNER PATH */}
        {path === 'beginner' && (
          <>
            {/* STEP 1: BRAND SELECTION */}
            {step === 1 && (
              <div style={styles.fadeContainer}>
                <div style={styles.stepTitle}>SELECT KEYBOARD BRAND</div>
                <input 
                  type="text" 
                  placeholder="SEARCH BRANDS OR EXACT MODELS (E.G. 'KEYCHRON' OR 'Q3')..." 
                  value={brandSearch}
                  onChange={e => setBrandSearch(e.target.value)}
                  style={{ width: '100%', padding: '16px 24px', borderRadius: '4px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none', marginTop: 20, transition: '0.2s' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
                />
                
                {filteredBrands.length > 0 && (
                  <>
                    <div style={{ marginTop: 48, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>BRANDS</div>
                    <div className="brand-grid">
                      {filteredBrands.map(b => (
                        <button key={b} className={`brand-pill ${localBrand === b ? 'active' : ''}`} onClick={() => handleBrandSelect(b)}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {searchLower.length >= 2 && filteredModels.length > 0 && (
                  <>
                    <div style={{ marginTop: 40, fontSize: 14, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Models</div>
                    <div className="model-grid">
                      {filteredModels.map(renderModelCard)}
                    </div>
                  </>
                )}
                
                {searchLower.length >= 2 && filteredBrands.length === 0 && filteredModels.length === 0 && (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: '#666' }}>
                    <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
                    No brands or models found for "{brandSearch}"
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: MODEL SELECTION */}
            {step === 2 && localBrand && (
              <div style={styles.fadeContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={styles.stepTitle}>{localBrand} Models</div>
                  <button style={{ background: 'none', border: 'none', color: '#6c63ff', cursor: 'pointer', fontSize: 15, textDecoration: 'underline' }} onClick={() => { setStep(1); setLocalBrand(null); }}>← Back to brands</button>
                </div>

                {modelsLoading ? (
                  <div style={{ padding: '80px 0', textAlign: 'center', color: '#6c63ff', fontSize: 18, animation: 'pulse 1.5s infinite' }}>Loading {localBrand} catalog...</div>
                ) : (
                  <div className="model-grid">
                    {brandModels.map(renderModelCard)}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ENTHUSIAST PATH */}
        {path === 'enthusiast' && step === 1 && (
          <div style={styles.fadeContainer}>
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
          <div style={styles.fadeContainer}>
            <div style={styles.stepTitle}>Step 2: Choose Form Factor</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: 24 }}>
              {FORM_FACTORS.map(ff => (
                <button key={ff} className="model-card"
                  style={localFormFactor === ff ? { borderColor: '#6c63ff', background: '#6c63ff11' } : {}}
                  onClick={() => { setLocalFormFactor(ff); setStep(3); }}>
                  <div style={{ pointerEvents: 'none' }}>
                    <KeyboardSilhouette formFactor={ff} large={true} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', textAlign: 'center', marginTop: '16px' }}>{ff}</div>
                  <div style={{ fontSize: '12px', color: '#888899', textAlign: 'center', marginTop: '4px' }}>{countMap[ff] || 60} Keys</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {path === 'enthusiast' && step === 3 && (
          <div style={styles.fadeContainer}>
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

        {/* STEP 3/4: CONFIRMATION SPEC CARD (Both paths merge here) */}
        {(step === 3 && path === 'beginner') || (step === 4 && path === 'enthusiast') ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <div style={styles.confirmCard}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>{store.selectedModel || 'Custom Build'}</h1>
              {store.selectedBrand && <div style={{ fontSize: 16, color: '#6c63ff', fontWeight: 600, marginBottom: 32 }}>{store.selectedBrand}</div>}

              {/* Three info columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
                <div style={styles.specColumn}>
                  <div style={styles.specLabel}>Form Factor</div>
                  <div style={styles.specValue}>{store.selectedFormFactor}</div>
                  <div style={{ ...styles.specLabel, marginTop: 16 }}>Key Count</div>
                  <div style={styles.specValue}>{countMap[store.selectedFormFactor] || '~60'}</div>
                </div>
                <div style={styles.specColumn}>
                  <div style={styles.specLabel}>Layout Standard</div>
                  <div style={styles.specValue}>{store.selectedLayout || 'ANSI'}</div>
                  <div style={{ ...styles.specLabel, marginTop: 16 }}>Profile</div>
                  <div style={styles.specValue}>{store.selectedProfile || 'OEM'}</div>
                </div>
                <div style={styles.specColumn}>
                  <div style={styles.specLabel}>LED Type</div>
                  <div style={{ ...styles.specValue, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getLEDColor(store.keyboardLEDType) }} />
                    {store.keyboardLEDType || 'None'}
                  </div>
                  <div style={{ ...styles.specLabel, marginTop: 16 }}>Hotswap</div>
                  {store.selectedModel !== 'Custom Build' ? (
                    <div style={{ ...styles.specValue, color: selectedModelObj?.hotswap ? '#4dffce' : '#fff' }}>
                      {selectedModelObj?.hotswap ? 'Yes' : 'N/A'}
                    </div>
                  ) : <div style={styles.specValue}>Custom</div>}
                </div>
              </div>

              {/* LED guidance */}
              {(() => {
                const adv = getLEDAdviceBox(store.keyboardLEDType);
                return (
                  <div style={{ padding: '20px 24px', backgroundColor: '#111', borderLeft: `4px solid ${adv.color}`, borderRadius: '0 8px 8px 0', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontWeight: 600, color: '#fff' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: adv.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff' }}>
                        {adv.icon}
                      </div>
                      Backlight Note
                    </div>
                    <p style={{ color: '#ccc', margin: 0, lineHeight: 1.5, fontSize: 14 }}>{adv.text}</p>
                  </div>
                );
              })()}

              <button className="enter-btn" onClick={() => store.setScreen('studio')}>
                Enter Designer →
              </button>
              <button className="secondary-btn" onClick={() => {
                setStep(path === 'beginner' ? (localBrand ? 2 : 1) : 3);
                setSelectedModelObj(null);
                store.setSelectedModel(null);
              }}>
                ← Change keyboard
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-dim)',
  },
  header: {
    display: 'flex', alignItems: 'center', padding: '20px 40px',
    borderBottom: '1px solid rgba(246, 246, 246, 0.06)', justifyContent: 'space-between',
    backgroundColor: 'rgba(6, 6, 8, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  progressContainer: { display: 'flex', gap: '20px', alignItems: 'center' },
  backBtn: {
    color: 'var(--on-surface-variant)', fontFamily: 'var(--font-heading)', fontWeight: 600,
    fontSize: '13px', padding: '10px 18px', borderRadius: '8px',
    backgroundColor: 'rgba(246, 246, 246, 0.05)', border: '1px solid rgba(246, 246, 246, 0.08)',
    cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  content: { flex: 1, padding: '64px 48px', maxWidth: '1200px', margin: '0 auto', width: '100%' },
  fadeContainer: { animation: 'fadeIn 0.3s ease-out' },
  stepTitle: {
    fontFamily: 'var(--font-heading)', fontSize: '36px', fontWeight: 700,
    color: 'var(--on-surface)', margin: 0, letterSpacing: '-0.02em',
  },

  enthusiastGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: 32 },
  selectCard: {
    backgroundColor: 'rgba(16, 16, 20, 0.6)', border: '1px solid rgba(246, 246, 246, 0.06)',
    borderRadius: '12px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', color: 'var(--on-surface)',
    fontFamily: 'var(--font-heading)', backdropFilter: 'blur(8px)',
  },
  selectCardActive: {
    backgroundColor: 'rgba(208, 188, 255, 0.08)', border: '1px solid rgba(208, 188, 255, 0.3)',
    borderRadius: '12px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
    color: 'var(--on-surface)', fontFamily: 'var(--font-heading)',
    boxShadow: '0 0 40px rgba(208, 188, 255, 0.15)',
  },

  confirmCard: {
    backgroundColor: 'rgba(16, 16, 20, 0.8)', border: '1px solid rgba(246, 246, 246, 0.08)',
    borderRadius: '16px', padding: '48px', width: '100%', maxWidth: '900px',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(16px)',
  },
  specColumn: {
    backgroundColor: 'rgba(6, 6, 8, 0.6)', padding: '24px', borderRadius: '12px',
    border: '1px solid rgba(246, 246, 246, 0.06)', flex: 1, display: 'flex', flexDirection: 'column',
  },
  specLabel: { fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', color: 'var(--secondary)', fontWeight: 500, letterSpacing: '0.12em' },
  specValue: { fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 600, color: 'var(--on-surface)', marginTop: 8 },
};
