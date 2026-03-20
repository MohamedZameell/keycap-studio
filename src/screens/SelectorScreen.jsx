import React, { useState } from 'react';
import { useStore } from '../store';
import { KEYBOARDS, BRANDS, FORM_FACTORS, PROFILES, LAYOUTS } from '../data/keyboards';

export default function SelectorScreen() {
  const store = useStore();
  const path = store.selectionPath; // 'beginner' or 'enthusiast'

  const [step, setStep] = useState(1);
  const [localBrand, setLocalBrand] = useState(null);
  
  // Enthusiast temp state before final confirm
  const [localProfile, setLocalProfile] = useState(null);
  const [localFormFactor, setLocalFormFactor] = useState(null);
  const [localLayout, setLocalLayout] = useState(null);

  // Beginner: Complete setup from database
  const handleSelectModel = (model) => {
    store.setSelectedBrand(model.brand);
    store.setSelectedModel(model.model);
    store.setSelectedFormFactor(model.formFactor);
    store.setSelectedProfile(model.profile);
    store.setSelectedLayout(model.layout);
    store.setKeyboardLEDType(model.ledType);
    setStep('confirm');
  };

  // Enthusiast: Complete manual setup
  const finalizeEnthusiast = () => {
    store.setSelectedProfile(localProfile);
    store.setSelectedFormFactor(localFormFactor);
    store.setSelectedLayout(localLayout);
    store.setSelectedModel('Custom Build');
    store.setKeyboardLEDType('None'); // default assumption for heavy customization
    setStep('confirm');
  };

  const getLEDAdvice = (type) => {
    if(type?.includes('North')) return "Your LEDs shine through the legend. Use light-colored legends for maximum glow effect.";
    if(type?.includes('South')) return "Your LEDs create desk glow. Legend color has less impact on light output.";
    if(type?.includes('Per-key')) return "Full RGB control per key. Pudding or shine-through keycaps will maximize the RGB effect.";
    return "No backlight. Focus on color contrast between your keycap and legend colors.";
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => {
          if (step > 1 && step !== 'confirm') setStep(step - 1);
          else if (step === 'confirm') setStep(path === 'beginner' ? 2 : 3);
          else { store.setSelectionPath(null); store.setScreen('entry'); }
        }}>← Back</button>
        <h2 style={styles.title}>
          {step === 'confirm' ? 'Confirm Specifications' : (path === 'beginner' ? 'Select Keyboard' : 'Custom Specifications')}
        </h2>
      </div>

      <div style={styles.content}>
        {/* BEGINNER PATH */}
        {path === 'beginner' && step === 1 && (
          <div style={styles.grid}>
            <div style={styles.stepTitle}>Select Brand</div>
            <div style={styles.brandGrid}>
              {BRANDS.map(b => (
                <button key={b} style={styles.pillBtn} onClick={() => { setLocalBrand(b); setStep(2); }}>
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {path === 'beginner' && step === 2 && (
          <div style={styles.grid}>
            <div style={styles.stepTitle}>Select Model ({localBrand})</div>
            <div style={styles.modelsGrid}>
              {KEYBOARDS.filter(k => k.brand === localBrand).map(k => (
                <div key={k.id} style={styles.modelCard} onClick={() => handleSelectModel(k)}>
                  <h3 style={styles.modelName}>{k.model}</h3>
                  <div style={styles.badges}>
                    <span style={styles.badge}>{k.formFactor}</span>
                    <span style={styles.badge}>{k.keyCount} Keys</span>
                  </div>
                  <p style={styles.modelDesc}>{k.description}</p>
                  <div style={styles.modelSpecs}>
                    <div>LED: {k.ledType}</div>
                    <div>Profile: {k.profile}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ENTHUSIAST PATH */}
        {path === 'enthusiast' && step === 1 && (
          <div style={styles.grid}>
            <div style={styles.stepTitle}>Step 1: Choose Profile</div>
            <div style={styles.enthusiastGrid}>
              {PROFILES.map(p => (
                <button key={p} style={{...styles.selectCard, borderColor: localProfile === p ? 'var(--primary-accent)' : 'var(--border-color)'}} 
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
            <div style={styles.enthusiastGrid}>
              {FORM_FACTORS.map(ff => (
                <button key={ff} style={{...styles.selectCard, borderColor: localFormFactor === ff ? 'var(--primary-accent)' : 'var(--border-color)'}} 
                  onClick={() => { setLocalFormFactor(ff); setStep(3); }}>
                  <h3>{ff}</h3>
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
                <button key={l} style={{...styles.selectCard, borderColor: localLayout === l ? 'var(--primary-accent)' : 'var(--border-color)'}} 
                  onClick={() => { setLocalLayout(l); finalizeEnthusiast(); }}>
                  <h3>{l}</h3>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CONFIRMATION CARD */}
        {step === 'confirm' && (
          <div style={styles.confirmWrapper}>
            <div style={styles.confirmCard}>
              <h2 style={{marginBottom: '24px'}}>Keyboard Spec Card</h2>
              
              <div style={styles.specRow}>
                <strong>Model</strong>
                <span>{store.selectedModel || 'Custom'}</span>
              </div>
              <div style={styles.specRow}>
                <strong>Form Factor</strong>
                <span>{store.selectedFormFactor} ({store.selectedLayout})</span>
              </div>
              <div style={styles.specRow}>
                <strong>Profile</strong>
                <span>{store.selectedProfile}</span>
              </div>
              
              <div style={styles.ledBox}>
                <div style={styles.ledBoxTitle}>💡 Lighting Guidance ({store.keyboardLEDType || 'None'})</div>
                <div style={styles.ledBoxDesc}>{getLEDAdvice(store.keyboardLEDType)}</div>
              </div>

              <button style={styles.enterBtn} onClick={() => store.setScreen('studio')}>
                Enter Designer
              </button>
            </div>
          </div>
        )}

      </div>
      
      <style>{`
        .model-card-hover:hover { border-color: var(--primary-accent); cursor: pointer; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-color)',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '32px 48px',
    borderBottom: '1px solid var(--border-color)',
    gap: '24px'
  },
  backBtn: {
    color: 'var(--text-secondary)',
    fontSize: '16px',
    padding: '8px 16px',
    borderRadius: 'var(--radius-btn)',
    backgroundColor: 'var(--panel-bg)'
  },
  title: {
    fontSize: '24px',
    fontWeight: 600
  },
  content: {
    flex: 1,
    padding: '48px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px'
  },
  stepTitle: {
    fontSize: '20px',
    color: 'var(--text-secondary)'
  },
  brandGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px'
  },
  pillBtn: {
    padding: '12px 24px',
    borderRadius: 'var(--radius-pill)',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    fontSize: '18px',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  modelsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px'
  },
  modelCard: {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  modelName: {
    fontSize: '22px',
    marginBottom: '12px'
  },
  badges: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px'
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px'
  },
  modelDesc: {
    color: 'var(--text-secondary)',
    marginBottom: '16px',
    fontSize: '14px',
    lineHeight: 1.4
  },
  modelSpecs: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--text-muted)'
  },
  enthusiastGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px'
  },
  selectCard: {
    backgroundColor: 'var(--card-bg)',
    border: '2px solid var(--border-color)',
    borderRadius: '12px',
    padding: '32px 16px',
    textAlign: 'center',
    cursor: 'pointer'
  },
  confirmWrapper: {
    display: 'flex',
    justifyContent: 'center'
  },
  confirmCard: {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '600px'
  },
  specRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 0',
    borderBottom: '1px solid var(--border-color)',
    fontSize: '16px'
  },
  ledBox: {
    marginTop: '32px',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderLeft: '4px solid var(--primary-accent)',
    padding: '16px',
    borderRadius: '0 8px 8px 0'
  },
  ledBoxTitle: {
    fontWeight: 600,
    marginBottom: '8px',
    color: 'var(--text-primary)'
  },
  ledBoxDesc: {
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    fontSize: '14px'
  },
  enterBtn: {
    marginTop: '40px',
    width: '100%',
    padding: '16px',
    backgroundColor: 'var(--primary-accent)',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 600,
    borderRadius: 'var(--radius-btn)',
    textAlign: 'center'
  }
};
