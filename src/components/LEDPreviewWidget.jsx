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
    <div style={styles.card}>
      <style>{`
        @keyframes rayGrow {
          0% { height: 0px; opacity: 0; }
          30% { opacity: 0.9; }
          100% { height: 26px; opacity: 0; }
        }
      `}</style>
      
      <div style={styles.title}>LED PREVIEW</div>

      {/* DIAGRAM CONTAINER */}
      <div style={styles.diagramWrap}>
        <div style={styles.diagram}>
          
          {/* LAYER 1 — KEYCAP */}
          <div style={{...styles.keycap, backgroundColor: keycapColor}}>
             <div style={{
               ...styles.legendRect, backgroundColor: legendColor, 
               boxShadow: isNorth ? `0 0 8px ${legendColor}` : 'none'
             }} />
          </div>

          {/* LAYER 2 — SWITCH HOUSING */}
          <div style={styles.switchBox}>
             <div style={styles.stem} />
          </div>

          {/* LAYER 3 — PCB */}
          <div style={styles.pcb}>
            <div style={{...styles.solder, left: '30%'}} />
            <div style={{...styles.solder, left: '40%'}} />
            <div style={{...styles.solder, left: '58%'}} />
            <div style={{...styles.solder, left: '68%'}} />
          </div>

          {/* Optional Labels */}
          <div style={{position: 'absolute', right: '-4px', top: '8px', fontSize: '9px', color: '#888899'}}>Legend</div>
          <div style={{position: 'absolute', right: '0px', top: '64px', fontSize: '9px', color: '#888899'}}>Switch</div>
          <div style={{position: 'absolute', right: '-12px', top: '98px', fontSize: '9px', color: '#888899'}}>PCB</div>

          {/* LAYER 4 — LED DOT */}
          {!isNone && (
            <div style={{
              ...styles.ledDot, 
              backgroundColor: backlitColor,
              boxShadow: `0 0 8px 3px ${backlitColor}`,
              ...(isNorth ? { top: '48px', left: '50%', transform: 'translateX(-50%)' } : {}),
              ...(isSouth ? { top: '92px', left: '50%', transform: 'translateX(-50%)' } : {}),
              ...(isPerKey ? { top: '68px', left: '50%', transform: 'translateX(-50%)' } : {})
            }}>
               
               {/* LAYER 5 — LIGHT RAYS */}
               {isNorth && (
                 <>
                   <div style={{...styles.ray, top: '42px', left: 'calc(50% - 10px)', transform: 'rotate(-20deg)', animationDelay: '0s', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                   <div style={{...styles.ray, top: '42px', left: 'calc(50% - 1px)', transform: 'rotate(0deg)', animationDelay: '0.3s', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                   <div style={{...styles.ray, top: '42px', left: 'calc(50% + 8px)', transform: 'rotate(20deg)', animationDelay: '0.6s', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                 </>
               )}
               {isSouth && (
                 <>
                   <div style={{...styles.ray, top: '94px', left: 'calc(50% - 10px)', transform: 'rotate(200deg)', transformOrigin: 'top center', animationDelay: '0s', background: `linear-gradient(to bottom, ${backlitColor}, transparent)`}} />
                   <div style={{...styles.ray, top: '94px', left: 'calc(50% - 1px)', transform: 'rotate(180deg)', transformOrigin: 'top center', animationDelay: '0.3s', background: `linear-gradient(to bottom, ${backlitColor}, transparent)`}} />
                   <div style={{...styles.ray, top: '94px', left: 'calc(50% + 8px)', transform: 'rotate(160deg)', transformOrigin: 'top center', animationDelay: '0.6s', background: `linear-gradient(to bottom, ${backlitColor}, transparent)`}} />
                 </>
               )}
               {isPerKey && (
                 <>
                   <div style={{...styles.ray, top: '62px', left: '50%', transform: 'rotate(0deg)', animationDelay: '0s', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                   <div style={{...styles.ray, top: '72px', left: '58%', transform: 'rotate(90deg)', animationDelay: '0.2s', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                   <div style={{...styles.ray, top: '78px', left: '50%', transform: 'rotate(180deg)', transformOrigin: 'top center', animationDelay: '0.4s', background: `linear-gradient(to bottom, ${backlitColor}, transparent)`}} />
                   <div style={{...styles.ray, top: '72px', left: '36%', transform: 'rotate(270deg)', animationDelay: '0.6s', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                 </>
               )}
            </div>
          )}
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
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
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
  card: {
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
    animation: 'fadeIn 0.4s ease forwards',
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
  diagramWrap: {
    position: 'relative',
    width: '180px',
    height: '120px',
    margin: '0 auto 12px',
    overflow: 'hidden',
    background: '#080810',
    border: '1px solid #1a1a2a',
    borderRadius: '8px',
    padding: '10px'
  },
  diagram: {
    position: 'relative',
    width: '100%',
    height: '100%'
  },
  keycap: {
    width: '90px',
    height: '52px',
    clipPath: 'polygon(12% 100%, 88% 100%, 78% 0%, 22% 0%)',
    borderRadius: '3px',
    border: '1px solid rgba(255,255,255,0.15)',
    position: 'absolute',
    top: '0px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1
  },
  legendRect: {
    width: '36px',
    height: '7px',
    borderRadius: '2px',
    position: 'absolute',
    top: '7px',
    left: '50%',
    transform: 'translateX(-50%)'
  },
  switchBox: {
    width: '58px',
    height: '42px',
    background: '#13132a',
    border: '1px solid #2a2a4a',
    borderRadius: '3px',
    position: 'absolute',
    top: '54px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2
  },
  stem: {
    width: '12px',
    height: '24px',
    background: '#0a0a1a',
    position: 'absolute',
    top: '6px',
    left: '50%',
    transform: 'translateX(-50%)'
  },
  pcb: {
    width: '160px',
    height: '16px',
    background: '#0d1a0d',
    border: '1px solid #1a3a1a',
    borderRadius: '2px',
    position: 'absolute',
    top: '98px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 0
  },
  solder: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: '#2a5a2a',
    position: 'absolute',
    top: '6px'
  },
  ledDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    position: 'absolute',
    zIndex: 10
  },
  ray: {
    position: 'absolute',
    width: '2px',
    borderRadius: '1px',
    transformOrigin: 'bottom center',
    animation: 'rayGrow 1.8s ease-out infinite'
  },
  mainCaption: {
    fontSize: '13px',
    color: '#ffffff',
    textAlign: 'center'
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
    width: '100%'
  },
  compatLabel: {
    fontSize: '10px',
    color: '#888899',
    marginBottom: '4px'
  },
  compatPill: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
    display: 'inline-block',
    margin: '2px'
  }
};
