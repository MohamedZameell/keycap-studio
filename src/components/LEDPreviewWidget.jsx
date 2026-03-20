import React, { useState } from 'react';
import { useStore } from '../store';

export default function LEDPreviewWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  let dotColor = '#888899';
  if (isNorth) dotColor = '#a09bf5';
  if (isSouth) dotColor = '#f5a623';
  if (isPerKey) dotColor = '#5dcaa5';

  if (!isExpanded) {
    return (
      <div style={styles.collapsedPill} onClick={() => setIsExpanded(true)}>
        <div style={{width: '8px', height: '8px', borderRadius: '50%', background: dotColor}} />
        <span style={{fontSize: '12px', color: '#fff', fontWeight: 500, flex: 1}}>{ledType}</span>
        <span style={{fontSize: '12px', color: '#888899'}}>↑</span>
      </div>
    );
  }

  return (
    <div style={styles.outerContainer}>
      <style>{`
        @keyframes legendGlow {
          0%, 100% { box-shadow: 0 0 4px ${legendColor}, 0 0 8px ${legendColor}; opacity: 1; }
          50% { box-shadow: 0 0 8px ${legendColor}, 0 0 16px ${legendColor}, 0 0 24px ${legendColor}; opacity: 1; }
        }
        @keyframes ledPulse {
          0%, 100% { box-shadow: 0 0 6px 2px ${backlitColor}, 0 0 10px ${backlitColor}; }
          50% { box-shadow: 0 0 10px 4px ${backlitColor}, 0 0 20px ${backlitColor}, 0 0 30px ${backlitColor}; }
        }
        @keyframes rayUp {
          0% { height: 0; opacity: 0; }
          20% { opacity: 0.85; }
          100% { height: 30px; opacity: 0; }
        }
        @keyframes rayDown {
          0% { height: 0; opacity: 0; transform-origin: top center; }
          20% { opacity: 0.7; }
          100% { height: 24px; opacity: 0; }
        }
        @keyframes rayOut {
          0% { width: 0; opacity: 0; }
          20% { opacity: 0.7; }
          100% { width: 22px; opacity: 0; }
        }
        @keyframes pulseOpacity {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
        .collapsed-pill:hover { border-color: #6c63ff44; }
      `}</style>
      
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.title}>LED PREVIEW</div>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <div style={{
            ...styles.badge,
            ...(isNorth && { background: '#6c63ff22', color: '#a09bf5', border: '1px solid #6c63ff33' }),
            ...(isSouth && { background: '#f5a62322', color: '#f5a623', border: '1px solid #f5a62333' }),
            ...(isPerKey && { background: '#0d9e7522', color: '#5dcaa5', border: '1px solid #0d9e7533' }),
            ...(isNone && { background: '#44446622', color: '#888899', border: '1px solid #44446633' })
          }}>
            {isNorth && "North"}
            {isSouth && "South"}
            {isPerKey && "Per-key"}
            {isNone && "None"}
          </div>
          <span style={styles.collapseBtn} onClick={() => setIsExpanded(false)}>↓</span>
        </div>
      </div>

      {/* CROSS-SECTION DIAGRAM */}
      <div style={styles.diagram}>

        {/* LAYER 1 — KEYCAP */}
        <div style={{...styles.keycap, background: keycapColor}}>
           <div style={{
             ...styles.legendRect, 
             background: legendColor,
             animation: isNorth ? 'legendGlow 2s ease-in-out infinite' : 'none'
           }} />
           <div style={styles.keycapStemHole} />
           {/* Per-Key Body Glow */}
           {isPerKey && (
             <div style={{
               position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
               background: `${backlitColor}20`, clipPath: 'polygon(14% 100%, 86% 100%, 76% 0%, 24% 0%)',
               animation: 'pulseOpacity 2s ease-in-out infinite'
             }} />
           )}
        </div>

        {/* LAYER 2 — SWITCH HOUSING */}
        <div style={styles.switchHousing}>
          <div style={styles.switchStem} />
        </div>

        {/* LAYER 3 — PCB */}
        <div style={styles.pcb}>
          <div style={{...styles.solder, left: '20%'}} />
          <div style={{...styles.solder, left: '38%'}} />
          <div style={{...styles.solder, left: '56%'}} />
          <div style={{...styles.solder, left: '74%'}} />
        </div>
        
        {isSouth && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '20px',
            background: `linear-gradient(to top, ${backlitColor}33, transparent)`,
            opacity: 0.4, animation: 'pulseOpacity 2s ease-in-out infinite'
          }} />
        )}

        {/* SIDE LABELS */}
        <div style={styles.sideLabelWrap}>
          <div style={{...styles.sideLabel, top: '20px'}}>Legend <span style={styles.sideLine} /></div>
          <div style={{...styles.sideLabel, top: '88px'}}>Switch <span style={styles.sideLine} /></div>
          <div style={{...styles.sideLabel, top: '119px'}}>PCB <span style={styles.sideLine} /></div>
        </div>

        {/* LAYER 4 — LED DOT */}
        {!isNone && (
          <div style={{
            ...styles.ledDot, 
            background: backlitColor,
            ...(isNorth ? { top: '62px', left: '50%', transform: 'translateX(-50%)' } : {}),
            ...(isSouth ? { top: '106px', left: '50%', transform: 'translateX(-50%)' } : {}),
            ...(isPerKey ? { top: '84px', left: '50%', transform: 'translateX(-50%)' } : {})
          }}></div>
        )}

        {/* LAYER 5 — LIGHT RAYS */}
        {!isNone && (
          <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden'}}>
            {isNorth && (
              <>
                <div style={{...styles.ray, background: `linear-gradient(to top, ${backlitColor}, transparent)`, bottom: '98px', left: 'calc(50% - 12px)', transform: 'rotate(-18deg)', animation: 'rayUp 1.6s ease-out infinite', animationDelay: '0s'}} />
                <div style={{...styles.ray, background: `linear-gradient(to top, ${backlitColor}, transparent)`, bottom: '98px', left: 'calc(50% - 1px)', transform: 'rotate(0deg)', animation: 'rayUp 1.6s ease-out infinite', animationDelay: '0.3s'}} />
                <div style={{...styles.ray, background: `linear-gradient(to top, ${backlitColor}, transparent)`, bottom: '98px', left: 'calc(50% + 10px)', transform: 'rotate(18deg)', animation: 'rayUp 1.6s ease-out infinite', animationDelay: '0.6s'}} />
              </>
            )}
            {isSouth && (
              <>
                <div style={{...styles.rayDown, background: `linear-gradient(to bottom, ${backlitColor}, transparent)`, top: '110px', left: 'calc(50% - 1px)', animation: 'rayDown 1.6s ease-out infinite', animationDelay: '0s'}} />
                <div style={{...styles.rayDown, background: `linear-gradient(to bottom, ${backlitColor}, transparent)`, top: '108px', left: 'calc(50% - 14px)', transform: 'rotate(-30deg)', animation: 'rayDown 1.6s ease-out infinite', animationDelay: '0.25s'}} />
                <div style={{...styles.rayDown, background: `linear-gradient(to bottom, ${backlitColor}, transparent)`, top: '108px', left: 'calc(50% + 12px)', transform: 'rotate(30deg)', animation: 'rayDown 1.6s ease-out infinite', animationDelay: '0.5s'}} />
              </>
            )}
            {isPerKey && (
              <>
                <div style={{...styles.ray, background: `linear-gradient(to top, ${backlitColor}, transparent)`, bottom: '76px', left: '50%', transform: 'translateX(-50%) rotate(0deg)', animation: 'rayUp 1.6s ease-out infinite', animationDelay: '0s'}} />
                <div style={{...styles.rayLine, background: `linear-gradient(to right, ${backlitColor}, transparent)`, top: '84px', left: '96px', transform: 'translateY(-50%)', animation: 'rayOut 1.6s ease-out infinite', animationDelay: '0.2s'}} />
                <div style={{...styles.rayDown, background: `linear-gradient(to bottom, ${backlitColor}, transparent)`, top: '92px', left: '50%', transform: 'translateX(-50%)', animation: 'rayDown 1.6s ease-out infinite', animationDelay: '0.4s'}} />
                <div style={{...styles.rayLine, background: `linear-gradient(to left, ${backlitColor}, transparent)`, top: '84px', right: '96px', transform: 'translateY(-50%)', animation: 'rayOut 1.6s ease-out infinite', animationDelay: '0.6s'}} />
              </>
            )}
          </div>
        )}
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

      {/* COMPATIBILITY WARNING / INFO */}
      {isNorth && (
        <div style={styles.warningBox}>
          ⚠ Cherry profile keycaps may physically clash with north-facing LEDs. SA, DSA, XDA recommended.
        </div>
      )}
      {isSouth && (
        <div style={styles.infoBox}>
          ✓ Compatible with all keycap profiles. No interference issues.
        </div>
      )}

      {/* LEGEND PLACEMENT SECTION */}
      <div style={styles.legendPlacementSection}>
        <div style={styles.legendPlacementTitle}>Legend placement</div>
        
        {isNorth && (
          <div style={styles.optionsRow}>
            <div style={{...styles.optionCard, borderColor: '#0d9e75'}}>
              <div style={styles.optionTopView}>
                 <div style={{...styles.optionDot, top: '4px', left: '50%', transform: 'translateX(-50%)'}} />
              </div>
              <div style={styles.optionLabel}>Top center</div>
              <div style={{...styles.optionBadge, background: '#0d9e7522', color: '#5dcaa5'}}>Best for north LED</div>
              <div style={styles.optionReason}>Light shines directly through</div>
            </div>
            <div style={styles.optionCard}>
              <div style={styles.optionTopView}>
                 <div style={{...styles.optionDot, bottom: '4px', left: '50%', transform: 'translateX(-50%)'}} />
              </div>
              <div style={styles.optionLabel}>Front face</div>
              <div style={styles.optionBadge}>Works well</div>
            </div>
            <div style={styles.optionCard}>
              <div style={styles.optionTopView}>
                 <div style={{...styles.optionDot, top: '4px', left: '4px'}} />
              </div>
              <div style={styles.optionLabel}>Corner</div>
              <div style={styles.optionBadge}>Partial glow</div>
            </div>
          </div>
        )}

        {isSouth && (
          <div style={styles.optionsRow}>
            <div style={styles.optionCard}>
              <div style={styles.optionTopView}>
                 <div style={{...styles.optionDot, top: '4px', left: '50%', transform: 'translateX(-50%)'}} />
              </div>
              <div style={styles.optionLabel}>Top center</div>
              <div style={styles.optionBadge}>Works fine</div>
              <div style={styles.optionReason}>Soft glow through legend</div>
            </div>
            <div style={{...styles.optionCard, borderColor: '#0d9e75'}}>
              <div style={styles.optionTopView}>
                 <div style={{...styles.optionDot, bottom: '4px', left: '50%', transform: 'translateX(-50%)'}} />
              </div>
              <div style={styles.optionLabel}>Front face</div>
              <div style={{...styles.optionBadge, background: '#0d9e7522', color: '#5dcaa5'}}>Best for south LED</div>
              <div style={styles.optionReason}>Catches gap light perfectly</div>
            </div>
            <div style={styles.optionCard}>
              <div style={styles.optionTopView}>
                 <div style={{...styles.optionDot, top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}} />
              </div>
              <div style={styles.optionLabel}>Any position</div>
              <div style={styles.optionBadge}>No strong preference</div>
              <div style={styles.optionReason}>South LEDs are less directional</div>
            </div>
          </div>
        )}

        {isPerKey && (
          <div style={styles.optionsRow}>
            <div style={{...styles.optionCard, borderColor: '#0d9e75', width: '80px'}}>
              <div style={styles.optionTopView}>
                 <div style={{...styles.optionDot, top: '4px', left: '50%', transform: 'translateX(-50%)'}} />
              </div>
              <div style={styles.optionLabel}>Top center</div>
              <div style={{...styles.optionBadge, background: '#0d9e7522', color: '#5dcaa5'}}>Best for per-key RGB</div>
              <div style={styles.optionReason}>Maximum shine-through effect</div>
            </div>
            <div style={{...styles.optionCard, width: '80px'}}>
              <div style={styles.optionTopView}>
                 <div style={{...styles.optionDot, top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}} />
              </div>
              <div style={styles.optionLabel}>Any position</div>
              <div style={styles.optionBadge}>All positions work</div>
              <div style={styles.optionReason}>Light fills entire keycap</div>
            </div>
          </div>
        )}

        {isNone && (
          <div style={{fontSize: '11px', color: '#888899', lineHeight: 1.4, textAlign: 'center', padding: '0 8px'}}>
            Without backlight, focus on color contrast. Dark legend on light keycap or vice versa gives best visibility in daylight.
          </div>
        )}
      </div>

    </div>
  );
}

const styles = {
  collapsedPill: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    width: '140px',
    height: '36px',
    background: 'rgba(8, 8, 18, 0.95)',
    border: '1px solid #1e1e3a',
    borderRadius: '20px',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    zIndex: 100,
    transition: 'all 0.2s',
    boxSizing: 'border-box'
  },
  outerContainer: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    width: '210px',
    background: 'rgba(8, 8, 18, 0.95)',
    border: '1px solid #1e1e3a',
    borderRadius: '14px',
    padding: '14px 16px 16px',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    zIndex: 100,
    fontFamily: 'inherit',
    transformOrigin: 'bottom right',
    animation: 'scaleUp 0.3s ease forwards'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  title: {
    fontSize: '9px',
    letterSpacing: '0.12em',
    color: '#444466',
    fontWeight: 500
  },
  badge: {
    fontSize: '9px',
    padding: '2px 8px',
    borderRadius: '8px'
  },
  collapseBtn: {
    fontSize: '12px',
    color: '#444466',
    cursor: 'pointer',
    padding: '0 4px',
    fontWeight: 'bold'
  },
  diagram: {
    width: '178px',
    height: '160px',
    position: 'relative',
    background: '#05050f',
    border: '1px solid #1a1a2e',
    borderRadius: '8px',
    overflow: 'hidden',
    margin: '0 auto 12px'
  },
  keycap: {
    position: 'absolute',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '88px',
    height: '56px',
    clipPath: 'polygon(14% 100%, 86% 100%, 76% 0%, 24% 0%)',
    border: '1px solid rgba(255,255,255,0.15)',
    zIndex: 2
  },
  legendRect: {
    position: 'absolute',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '32px',
    height: '7px',
    borderRadius: '2px'
  },
  keycapStemHole: {
    position: 'absolute',
    bottom: '0px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '10px',
    height: '8px',
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '1px 1px 0 0'
  },
  switchHousing: {
    position: 'absolute',
    top: '66px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '54px',
    height: '44px',
    background: '#0e0e20',
    border: '1px solid #252540',
    borderRadius: '3px',
    zIndex: 1
  },
  switchStem: {
    position: 'absolute',
    top: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '10px',
    height: '22px',
    background: '#070710',
    borderRadius: '1px'
  },
  pcb: {
    position: 'absolute',
    top: '112px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '162px',
    height: '14px',
    background: '#071207',
    border: '1px solid #143314',
    borderRadius: '2px',
    zIndex: 0
  },
  solder: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: '#1a5c1a',
    position: 'absolute',
    top: '5px'
  },
  ledDot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    position: 'absolute',
    animation: 'ledPulse 1.5s ease-in-out infinite',
    zIndex: 10
  },
  ray: {
    position: 'absolute',
    width: '2px',
    borderRadius: '2px',
    transformOrigin: 'bottom center'
  },
  rayDown: {
    position: 'absolute',
    width: '2px',
    borderRadius: '2px',
    transformOrigin: 'top center'
  },
  rayLine: {
    position: 'absolute',
    height: '2px',
    borderRadius: '2px',
    transformOrigin: 'left center'
  },
  sideLabelWrap: {
    position: 'absolute',
    left: '142px',
    width: '36px',
    height: '100%',
    top: 0
  },
  sideLabel: {
    position: 'absolute',
    fontSize: '9px',
    color: '#555570',
    display: 'flex',
    alignItems: 'center',
    right: '8px'
  },
  sideLine: {
    position: 'absolute',
    right: '-8px',
    width: '6px',
    height: '1px',
    background: '#555570'
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
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    justifyContent: 'center'
  },
  compatLabel: {
    fontSize: '10px',
    color: '#888899'
  },
  pillsWrapper: {
    display: 'inline-flex',
    gap: '4px'
  },
  compatPill: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
    display: 'inline-block',
    margin: '2px'
  },
  warningBox: {
    background: '#f5a62311',
    border: '1px solid #f5a62333',
    borderRadius: '6px',
    padding: '6px 8px',
    marginTop: '8px',
    fontSize: '10px',
    color: '#f5a623'
  },
  infoBox: {
    background: '#0d9e7511',
    border: '1px solid #0d9e7533',
    borderRadius: '6px',
    padding: '6px 8px',
    marginTop: '8px',
    fontSize: '10px',
    color: '#5dcaa5'
  },
  legendPlacementSection: {
    borderTop: '1px solid #1e1e3a',
    paddingTop: '10px',
    marginTop: '10px'
  },
  legendPlacementTitle: {
    fontSize: '10px',
    textTransform: 'uppercase',
    color: '#888899',
    letterSpacing: '0.08em',
    marginBottom: '8px'
  },
  optionsRow: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center'
  },
  optionCard: {
    flex: 1,
    background: '#0a0a18',
    border: '1px solid #1e1e3a',
    borderRadius: '6px',
    padding: '6px 4px',
    textAlign: 'center',
    cursor: 'default',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  optionTopView: {
    width: '28px',
    height: '28px',
    background: '#1a1a30',
    border: '1px solid #2a2a4a',
    borderRadius: '3px',
    margin: '0 auto 4px',
    position: 'relative'
  },
  optionDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#6c63ff',
    position: 'absolute'
  },
  optionLabel: {
    fontSize: '9px',
    color: '#fff',
    fontWeight: 500
  },
  optionBadge: {
    fontSize: '8px',
    padding: '1px 5px',
    borderRadius: '6px',
    marginTop: '2px',
    background: '#44446622',
    color: '#888899'
  },
  optionReason: {
    fontSize: '9px',
    color: '#888899',
    marginTop: '4px',
    lineHeight: 1.2
  }
};
