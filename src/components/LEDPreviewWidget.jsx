import React from 'react';
import { useStore } from '../store';

export default function LEDPreviewWidget() {
  const ledType = useStore(s => s.keyboardLEDType) || 'None';
  const backlitEnabled = useStore(s => s.backlitEnabled);
  const backlitColor = useStore(s => s.backlitColor);
  const globalColor = useStore(s => s.globalColor) || '#6c63ff';
  const globalLegendColor = useStore(s => s.globalLegendColor) || '#ffffff';

  if (!backlitEnabled) return null;

  const isNorth = ledType.includes('North');
  const isSouth = ledType.includes('South');
  const isPerKey = ledType.includes('Per-key');
  const isNone = ledType === 'None';

  let dotStyle = { display: 'none' };
  if (isNorth) dotStyle = { top: '-8px', left: '50%', transform: 'translateX(-50%)' };
  if (isSouth) dotStyle = { bottom: '-14px', left: '50%', transform: 'translateX(-50%)' };
  if (isPerKey) dotStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div style={styles.card}>
      <div style={styles.title}>LED Preview</div>
      
      <div style={styles.diagram}>
        {/* Switch Housing Context Box */}
        <div style={styles.switchBox}>
          
          {/* Keycap Trapezoid */}
          <div style={{...styles.keycap, backgroundColor: globalColor}}>
             <div style={{...styles.legend, backgroundColor: globalLegendColor, boxShadow: (isNorth || isPerKey) ? `0 0 8px ${backlitColor}` : 'none'}} />
          </div>
          
          {/* Stem */}
          <div style={styles.stem} />
          
          {/* PCB */}
          <div style={styles.pcb} />
          
          {/* LED Dot & Rays */}
          {!isNone && (
            <div style={{...styles.ledDot, ...dotStyle, backgroundColor: backlitColor, boxShadow: `0 0 8px ${backlitColor}`}}>
              {isNorth && (
                <>
                  <div style={{...styles.ray, top: '-20px', left: '2px', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                  <div style={{...styles.ray, top: '-18px', left: '-6px', transform: 'rotate(-25deg)', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                  <div style={{...styles.ray, top: '-18px', left: '10px', transform: 'rotate(25deg)', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                </>
              )}
              {isSouth && (
                <>
                  <div style={{...styles.ray, top: '4px', left: '2px', transform: 'rotate(180deg)', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                  <div style={{...styles.ray, top: '2px', left: '-6px', transform: 'rotate(135deg)', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                  <div style={{...styles.ray, top: '2px', left: '10px', transform: 'rotate(-135deg)', background: `linear-gradient(to top, ${backlitColor}, transparent)`}} />
                </>
              )}
              {isPerKey && [0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                <div key={deg} style={{...styles.ray, top: '3px', left: '2px', transformOrigin: 'top center', transform: `rotate(${deg}deg)`, height: '15px', background: `linear-gradient(to bottom, ${backlitColor}, transparent)`}} />
              ))}
            </div>
          )}

        </div>
      </div>

      <div style={styles.caption}>
        {isNorth && "Light shines through your legend"}
        {isSouth && "Light glows between keys toward desk"}
        {isPerKey && "Full RGB control per individual key"}
        {isNone && "No backlight on this keyboard"}
      </div>

      <div style={styles.recommendation}>
        {isNorth && "Use light or white legend colors for maximum glow effect"}
        {isSouth && "Legend color does not affect light output. Focus on color contrast instead."}
        {isPerKey && "Pudding or shine-through keycaps maximize this effect dramatically."}
        {isNone && "Focus on strong color contrast between keycap base and legend."}
      </div>
    </div>
  );
}

const styles = {
  card: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    background: '#0f0f18ee',
    border: '1px solid #2a2a3a',
    borderRadius: '12px',
    padding: '16px',
    width: '200px',
    backdropFilter: 'blur(8px)',
    transition: 'opacity 0.3s',
    zIndex: 100,
    animation: 'fadeIn 0.3s ease'
  },
  title: {
    fontSize: '11px',
    textTransform: 'uppercase',
    color: '#888899',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  diagram: {
    width: '120px',
    height: '100px',
    margin: '0 auto',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  switchBox: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  keycap: {
    width: '60px',
    height: '45px',
    clipPath: 'polygon(8% 100%, 92% 100%, 82% 0%, 18% 0%)',
    borderRadius: '3px',
    position: 'absolute',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 5
  },
  legend: {
    width: '16px',
    height: '3px',
    marginTop: '4px',
    borderRadius: '1px'
  },
  stem: {
    width: '8px',
    height: '14px',
    backgroundColor: '#222',
    position: 'absolute',
    top: '55px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 4
  },
  pcb: {
    width: '100%',
    height: '2px',
    backgroundColor: '#333',
    position: 'absolute',
    bottom: '10px'
  },
  ledDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    position: 'absolute',
    zIndex: 6
  },
  ray: {
    position: 'absolute',
    width: '2px',
    height: '20px'
  },
  caption: {
    fontSize: '11px',
    color: '#888899',
    textAlign: 'center',
    marginTop: '8px'
  },
  recommendation: {
    fontSize: '10px',
    color: '#6c63ff',
    textAlign: 'center',
    marginTop: '4px',
    fontStyle: 'italic'
  }
};
