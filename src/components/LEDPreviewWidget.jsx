import React from 'react';
import { useStore } from '../store';

export default function LEDPreviewWidget() {
  const ledType = useStore(s => s.keyboardLEDType) || 'None';
  const backlitEnabled = useStore(s => s.backlitEnabled);
  const backlitColor = useStore(s => s.backlitColor) || '#ffcc00';
  const keycapColor = useStore(s => s.globalColor) || '#6c63ff';
  const legendColor = useStore(s => s.globalLegendColor) || '#ffffff';

  if (!backlitEnabled) return null;

  const isNorth = ledType.includes('North');
  const isSouth = ledType.includes('South');
  const isPerKey = ledType.includes('Per-key');
  const isNone = ledType === 'None';

  return (
    <div style={styles.container}>
      {/* Inline animations for rays */}
      <style>{`
        @keyframes rayPulse {
          0% { opacity: 0; height: 0px; }
          40% { opacity: 0.8; }
          100% { opacity: 0; height: 28px; }
        }
      `}</style>
      
      <div style={styles.title}>LED PREVIEW</div>

      {/* CROSS-SECTION DIAGRAM */}
      <div style={styles.diagram}>
        
        {/* LAYER 1 — KEYCAP */}
        <div style={{...styles.layerKeycap, backgroundColor: keycapColor}}>
           <div style={{
             ...styles.legendArea, 
             backgroundColor: legendColor,
             boxShadow: isNorth ? `0 0 8px ${legendColor}` : 'none'
           }} />
        </div>

        {/* LAYER 2 — SWITCH HOUSING */}
        <div style={styles.layerSwitch}>
           <div style={styles.stem} />
           
           {!isNone && (
             <div style={{
               ...styles.ledDot, 
               backgroundColor: backlitColor,
               boxShadow: `0 0 10px 3px ${backlitColor}`,
               ...(isNorth ? { top: '-5px', left: '50%', transform: 'translateX(-50%)' } : {}),
               ...(isSouth ? { bottom: '-5px', left: '50%', transform: 'translateX(-50%)' } : {}),
               ...(isPerKey ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } : {})
             }}>
                
                {/* LIGHT RAY ANIMATIONS */}
                {isNorth && (
                  <>
                    <div style={{...styles.rayBase, background: `linear-gradient(to top, ${backlitColor}, transparent)`, borderBottomLeftRadius: '1px', borderBottomRightRadius: '1px', bottom: '100%', left: '50%', transform: 'translateX(-50%) rotate(0deg)', animationDelay: '0s'}} />
                    <div style={{...styles.rayBase, background: `linear-gradient(to top, ${backlitColor}, transparent)`, borderBottomLeftRadius: '1px', borderBottomRightRadius: '1px', bottom: '100%', left: '50%', transform: 'translateX(-50%) rotate(-15deg)', animationDelay: '0.2s'}} />
                    <div style={{...styles.rayBase, background: `linear-gradient(to top, ${backlitColor}, transparent)`, borderBottomLeftRadius: '1px', borderBottomRightRadius: '1px', bottom: '100%', left: '50%', transform: 'translateX(-50%) rotate(15deg)', animationDelay: '0.4s'}} />
                  </>
                )}
                {isSouth && (
                  <>
                    <div style={{...styles.rayBase, background: `linear-gradient(to top, ${backlitColor}, transparent)`, borderBottomLeftRadius: '1px', borderBottomRightRadius: '1px', top: '100%', left: '50%', transform: 'translateX(-50%) rotate(180deg)', animationDelay: '0s'}} />
                    <div style={{...styles.rayBase, background: `linear-gradient(to top, ${backlitColor}, transparent)`, borderBottomLeftRadius: '1px', borderBottomRightRadius: '1px', top: '100%', left: '50%', transform: 'translateX(-50%) rotate(200deg)', animationDelay: '0.2s'}} />
                    <div style={{...styles.rayBase, background: `linear-gradient(to top, ${backlitColor}, transparent)`, borderBottomLeftRadius: '1px', borderBottomRightRadius: '1px', top: '100%', left: '50%', transform: 'translateX(-50%) rotate(160deg)', animationDelay: '0.4s'}} />
                  </>
                )}
                {isPerKey && (
                  <>
                    <div style={{...styles.rayBase, background: `linear-gradient(to top, ${backlitColor}, transparent)`, borderBottomLeftRadius: '1px', borderBottomRightRadius: '1px', bottom: '100%', left: '50%', transform: 'translateX(-50%) rotate(0deg)', animationDelay: '0s'}} />
                    <div style={{...styles.rayBase, background: `linear-gradient(to top, ${backlitColor}, transparent)`, borderBottomLeftRadius: '1px', borderBottomRightRadius: '1px', top: '50%', left: '100%', transform: 'translateY(-50%) rotate(90deg)', transformOrigin: 'bottom center', animationDelay: '0.2s'}} />
                    <div style={{...styles.rayBase, background: `linear-gradient(to top, ${backlitColor}, transparent)`, borderBottomLeftRadius: '1px', borderBottomRightRadius: '1px', top: '100%', left: '50%', transform: 'translateX(-50%) rotate(180deg)', animationDelay: '0.4s'}} />
                    <div style={{...styles.rayBase, background: `linear-gradient(to top, ${backlitColor}, transparent)`, borderBottomLeftRadius: '1px', borderBottomRightRadius: '1px', top: '50%', right: '100%', transform: 'translateY(-50%) rotate(270deg)', transformOrigin: 'bottom center', animationDelay: '0.2s'}} />
                  </>
                )}

             </div>
           )}
        </div>

        {/* LAYER 3 — PCB */}
        <div style={styles.layerPCB}>
          <div style={styles.solderPoints}>
            <div style={styles.solderDot} />
            <div style={styles.solderDot} />
            <div style={styles.solderDot} />
            <div style={styles.solderDot} />
          </div>
        </div>
      </div>

      {/* LABELS BELOW DIAGRAM */}
      <div style={styles.mainCaption}>
        {isNorth && "Light shines through legend"}
        {isSouth && "Light glows between keys"}
        {isPerKey && "Full RGB per key"}
        {isNone && "No backlight"}
      </div>
      
      <div style={{...styles.subCaption, color: backlitColor}}>
        {isNorth && "Use light or white legends for max glow"}
        {isSouth && "Any legend color works — focus on contrast"}
        {isPerKey && "Pudding keycaps maximize this effect"}
        {isNone && "Design for daylight — prioritize contrast"}
      </div>

      {/* COMPATIBILITY ROW */}
      <div style={styles.compatContainer}>
        <div style={styles.compatLabel}>Best with:</div>
        <div style={styles.pillsWrapper}>
          {isNorth && (
            <>
              <span style={{...styles.compatPill, background: '#9c27b022', border: '1px solid #9c27b044', color: '#e1bee7'}}>Shine-through keycaps</span>
              <span style={{...styles.compatPill, background: '#9c27b022', border: '1px solid #9c27b044', color: '#e1bee7'}}>Light legends</span>
            </>
          )}
          {isSouth && (
            <>
              <span style={{...styles.compatPill, background: '#00bcd422', border: '1px solid #00bcd444', color: '#b2ebf2'}}>Any keycap profile</span>
              <span style={{...styles.compatPill, background: '#00bcd422', border: '1px solid #00bcd444', color: '#b2ebf2'}}>Cherry profile ✓</span>
            </>
          )}
          {isPerKey && (
            <>
              <span style={{...styles.compatPill, background: '#9c27b022', border: '1px solid #9c27b044', color: '#e1bee7'}}>Pudding keycaps</span>
              <span style={{...styles.compatPill, background: '#9c27b022', border: '1px solid #9c27b044', color: '#e1bee7'}}>Shine-through</span>
            </>
          )}
          {isNone && (
            <>
              <span style={{...styles.compatPill, background: '#88889922', border: '1px solid #88889944', color: '#e0e0e0'}}>PBT dye-sub</span>
              <span style={{...styles.compatPill, background: '#88889922', border: '1px solid #88889944', color: '#e0e0e0'}}>Any profile</span>
            </>
          )}
        </div>
      </div>
      
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    width: '220px',
    background: 'rgba(10, 10, 20, 0.92)',
    border: '1px solid #2a2a3a',
    borderRadius: '14px',
    padding: '16px',
    backdropFilter: 'blur(12px)',
    zIndex: 10,
    animation: 'fadeInOpacity 0.4s ease forwards',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  title: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#444460',
    marginBottom: '12px',
    fontWeight: 'bold'
  },
  diagram: {
    width: '180px',
    height: '160px',
    position: 'relative'
  },
  layerKeycap: {
    width: '100px',
    height: '60px',
    clipPath: 'polygon(10% 100%, 90% 100%, 85% 0%, 15% 0%)',
    borderRadius: '3px',
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    top: '0',
    display: 'flex',
    justifyContent: 'center'
  },
  legendArea: {
    width: '40px',
    height: '8px',
    borderRadius: '2px',
    marginTop: '8px'
  },
  layerSwitch: {
    width: '70px',
    height: '45px',
    background: '#1a1a2e',
    border: '1px solid #2a2a3a',
    borderRadius: '3px',
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    top: '62px',
    display: 'flex',
    justifyContent: 'center'
  },
  stem: {
    width: '14px',
    height: '28px',
    background: '#0a0a14',
    position: 'absolute',
    top: '8px'
  },
  ledDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    position: 'absolute',
    zIndex: 20
  },
  rayBase: {
    width: '2px',
    position: 'absolute',
    transformOrigin: 'bottom center',
    animation: 'rayPulse 1.5s ease-out infinite'
  },
  layerPCB: {
    width: '180px',
    height: '14px',
    background: '#0d1117',
    border: '1px solid #1a2332',
    borderRadius: '2px',
    position: 'absolute',
    top: '108px',
    left: '50%',
    transform: 'translateX(-50%)'
  },
  solderPoints: {
    display: 'flex',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
    height: '100%'
  },
  solderDot: {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    background: '#3a5a3a'
  },
  mainCaption: {
    fontSize: '13px',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: '12px'
  },
  subCaption: {
    fontSize: '11px',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: '4px'
  },
  compatContainer: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    width: '100%'
  },
  compatLabel: {
    fontSize: '10px',
    color: '#888899'
  },
  pillsWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '4px'
  },
  compatPill: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
    display: 'inline-block',
    margin: '2px'
  }
};
