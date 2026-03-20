import React, { useState } from 'react';
import { useStore } from '../store';
import { KEYBOARDS, BRANDS, FORM_FACTORS, PROFILES, LAYOUTS } from '../data/keyboards';
import KeyboardSilhouette from '../components/KeyboardSilhouette';

export default function SelectorScreen() {
  const store = useStore();
  const path = store.selectionPath; // 'beginner' or 'enthusiast'

  const [step, setStep] = useState(1);
  const [localBrand, setLocalBrand] = useState(null);
  const [selectedModelObj, setSelectedModelObj] = useState(null);
  
  // Enthusiast temp state before final confirm
  const [localProfile, setLocalProfile] = useState(null);
  const [localFormFactor, setLocalFormFactor] = useState(null);
  const [localLayout, setLocalLayout] = useState(null);

  // Beginner: Store selection
  const handleSelectModel = (model) => {
    setSelectedModelObj(model);
    store.setSelectedBrand(model.brand);
    store.setSelectedModel(model.model);
    store.setSelectedFormFactor(model.formFactor);
    store.setSelectedProfile(model.profile);
    store.setSelectedLayout(model.layout);
    store.setKeyboardLEDType(model.ledType);
    setStep('confirm'); // Shows spec card below
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

  const getLEDAdviceBox = (type) => {
    if(type?.includes('North')) return { color: '#0d9e75', text: "North-facing LEDs shine UP through your legends. Use light or white legends for maximum glow." };
    if(type?.includes('South')) return { color: '#f5a623', text: "South-facing LEDs create desk underglow. Any legend color works well." };
    if(type?.includes('Per-key')) return { color: '#6c63ff', text: "Per-key RGB gives full color control per key. Pudding keycaps maximize this effect." };
    return { color: '#888899', text: "No backlight. Focus on strong color contrast between keycap and legend." };
  };

  return (
    <div style={styles.container}>
      {/* Header and Progress Indicator */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => {
          if (step === 'confirm' && path === 'beginner') {
             setStep(2);
             setSelectedModelObj(null);
          }
          else if (step > 1 && step !== 'confirm') setStep(step - 1);
          else if (step === 'confirm' && path === 'enthusiast') setStep(3);
          else { store.setSelectionPath(null); store.setScreen('entry'); }
        }}>← Back</button>
        
        <div style={styles.progressContainer}>
          {path === 'beginner' ? (
            <>
              <span style={step >= 1 ? styles.stepActive : styles.stepInactive}>Step 1: Brand</span> <span style={styles.stepArrow}>→</span> 
              <span style={step >= 2 ? styles.stepActive : styles.stepInactive}>Step 2: Model</span> <span style={styles.stepArrow}>→</span> 
              <span style={step === 'confirm' ? styles.stepActive : styles.stepInactive}>Step 3: Confirm</span>
            </>
          ) : (
            <>
              <span style={step >= 1 ? styles.stepActive : styles.stepInactive}>Step 1: Profile</span> <span style={styles.stepArrow}>→</span> 
              <span style={step >= 2 ? styles.stepActive : styles.stepInactive}>Step 2: Form Factor</span> <span style={styles.stepArrow}>→</span> 
              <span style={step >= 3 ? styles.stepActive : styles.stepInactive}>Step 3: Standard</span> <span style={styles.stepArrow}>→</span> 
              <span style={step === 'confirm' ? styles.stepActive : styles.stepInactive}>Step 4: Confirm</span>
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
               <div style={styles.brandGrid}>
               {BRANDS.map(b => {
                 const isSelected = localBrand === b;
                 return (
                   <button key={b} style={isSelected ? styles.brandPillActive : styles.brandPill} onClick={() => { setLocalBrand(b); setStep(2); setSelectedModelObj(null); }}>
                     {b}
                   </button>
                 );
               })}
             </div>
            )}

            {(step === 2 || step === 'confirm') && localBrand && (
              <>
                <div style={styles.stepTitleWrapper}>
                  <div style={styles.stepTitle}>Select Model ({localBrand})</div>
                  <button style={styles.textLinkBtn} onClick={() => {setStep(1); setLocalBrand(null); setSelectedModelObj(null);}}>← Back to brands</button>
                </div>
                
                <div style={styles.modelsGrid}>
                  {KEYBOARDS.filter(k => k.brand === localBrand).map(k => {
                    const isCardSelected = selectedModelObj?.id === k.id;
                    return (
                      <div key={k.id} style={isCardSelected ? styles.modelCardSelected : styles.modelCard} onClick={() => handleSelectModel(k)}>
                        {isCardSelected && <div style={styles.cardCheckmark}>✓</div>}
                        <h3 style={styles.modelName}>{k.model}</h3>
                        <div style={{display:'flex',justifyContent:'center', margin:'10px 0'}}>
                          <KeyboardSilhouette 
                            formFactor={k.formFactor} 
                            large={false} 
                          />
                        </div>
                        <div style={styles.badges}>
                          <span style={styles.badge}>{k.formFactor}</span>
                          <span style={styles.badge}>{k.keyCount} Keys</span>
                        </div>
                        <div style={styles.modelSpecs}>
                          <div>{k.ledType}</div>
                          <div>{k.profile} Profile</div>
                          {k.hotswap && <div style={{color: 'var(--success)'}}>Hotswap</div>}
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
              {FORM_FACTORS.map(ff => {
                const countMap = { '100%': 104, '96%': 98, 'TKL': 87, '75%': 84, '65%': 68, '60%': 61, '40%': 47 };
                return (
                  <button key={ff} 
                    style={localFormFactor === ff ? styles.silhouetteCardActive : styles.silhouetteCard} 
                    onClick={() => { setLocalFormFactor(ff); setStep(3); }}>
                    <div style={{ pointerEvents: 'none' }}>
                      <KeyboardSilhouette formFactor={ff} large={true} />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', textAlign: 'center', marginTop: '16px' }}>{ff}</div>
                    <div style={{ fontSize: '12px', color: '#888899', textAlign: 'center', marginTop: '4px' }}>{countMap[ff] || 60} Keys</div>
                  </button>
                );
              })}
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

        {/* CONFIRMATION CARD (Shows BELOW) */}
        {step === 'confirm' && (
          <div style={styles.confirmWrapper}>
            <div style={styles.confirmCard}>
              <h1 style={{fontSize: '32px', color: '#fff', marginBottom: '16px'}}>{store.selectedModel || 'Custom'} Layout</h1>
              
              <div style={styles.specDisplay}>
                <span style={styles.badgeLarge}>{store.selectedFormFactor} Layout</span>
                <span style={styles.badgeLarge}>{store.selectedLayout} Standard</span>
                <span style={styles.badgeLarge}>{store.selectedProfile} Profile</span>
              </div>
              
              {(() => {
                const adv = getLEDAdviceBox(store.keyboardLEDType);
                return (
                  <div style={{...styles.ledGuidanceBox, borderColor: adv.color}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600, color: '#fff'}}>
                      <div style={{width: 12, height: 12, borderRadius: '50%', backgroundColor: adv.color}} />
                      {store.keyboardLEDType || 'No Backlight'}
                    </div>
                    <p style={{color: '#ccc', margin: 0, lineHeight: 1.5}}>{adv.text}</p>
                  </div>
                );
              })()}

              <button style={styles.enterBtn} onClick={() => store.setScreen('studio')}>
                Enter Designer →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: { width: '100%', minHeight: '100vh', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' },
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
  
  brandGrid: { display: 'flex', flexWrap: 'wrap', gap: '16px' },
  brandPill: { padding: '16px 32px', borderRadius: '32px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--text-muted)', fontSize: '18px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' },
  brandPillActive: { padding: '16px 32px', borderRadius: '32px', backgroundColor: 'var(--primary-accent)', border: '1px solid var(--primary-accent)', fontSize: '18px', color: '#fff', cursor: 'pointer', fontWeight: 600 },
  
  modelsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' },
  modelCard: { position: 'relative', backgroundColor: 'var(--card-bg)', border: '2px solid var(--border-color)', borderRadius: '12px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s' },
  modelCardSelected: { position: 'relative', backgroundColor: 'var(--card-bg)', border: '2px solid var(--primary-accent)', borderRadius: '12px', padding: '24px', cursor: 'pointer', transform: 'translateY(-4px)' },
  cardCheckmark: { position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--primary-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  modelName: { fontSize: '24px', marginBottom: '16px' },
  silhouetteProxy: { width: '100%', height: '30px', backgroundColor: '#111', borderRadius: '4px', marginBottom: '16px', display: 'flex', alignItems: 'center', padding: '2px' },
  silhouetteInner: { height: '100%', backgroundColor: '#333', borderRadius: '2px' },
  badges: { display: 'flex', gap: '8px', marginBottom: '16px' },
  badge: { backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '16px', fontSize: '13px' },
  modelSpecs: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' },
  
  enthusiastGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  selectCard: { backgroundColor: 'var(--card-bg)', border: '2px solid var(--border-color)', borderRadius: '12px', padding: '32px 16px', textAlign: 'center', cursor: 'pointer' },
  selectCardActive: { backgroundColor: 'var(--card-bg)', border: '2px solid var(--primary-accent)', borderRadius: '12px', padding: '32px 16px', textAlign: 'center', cursor: 'pointer' },
  silhouetteCard: { backgroundColor: 'var(--card-bg)', border: '2px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  silhouetteCardActive: { backgroundColor: '#6c63ff11', border: '2px solid #6c63ff', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  
  confirmWrapper: { display: 'flex', justifyContent: 'center', marginTop: '48px', paddingBottom: '48px' },
  confirmCard: { backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '800px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  specDisplay: { display: 'flex', gap: '12px', marginBottom: '32px' },
  badgeLarge: { backgroundColor: '#222', padding: '8px 16px', borderRadius: '6px', fontSize: '16px', border: '1px solid #333' },
  ledGuidanceBox: { padding: '24px', backgroundColor: '#111', borderLeft: '4px solid', borderRadius: '0 8px 8px 0', marginBottom: '32px' },
  enterBtn: { width: '100%', padding: '20px', backgroundColor: 'var(--primary-accent)', color: '#fff', fontSize: '20px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', border: 'none' }
};
