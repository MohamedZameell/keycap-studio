import React from 'react';

export default function KeyboardSilhouette({ formFactor, large = false, showLabel = true }) {
  const ks = large ? 8 : 4; // keySize
  const gap = 1;
  const padding = large ? 8 : 4;

  // Helper to render a group of rows
  const renderRows = (rowsData) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: gap + 'px' }}>
        {rowsData.map((row, rIdx) => (
          <div key={rIdx} style={{ display: 'flex', gap: gap + 'px' }}>
            {row.map((k, kIdx) => {
              if (k === 'sp') {
                return <div key={kIdx} style={{ width: ks + 'px', flexShrink: 0 }} />;
              }
              const w = k * ks + ((k - 1) * gap);
              return (
                <div
                  key={kIdx}
                  style={{
                    width: w + 'px',
                    height: ks + 'px',
                    background: '#ffffff22',
                    borderRadius: '1px',
                    flexShrink: 0
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Define layout structures
  const sp = 'sp';
  
  const mainR0 = [1, sp, 1, 1, 1, 1, sp, 1, 1, 1, 1, sp, 1, 1, 1, 1];
  const mainR1 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2];
  const mainR2 = [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5];
  const mainR3 = [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25];
  const mainR4 = [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75];
  const mainR5 = [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25];

  const FULL_100 = {
    main: [mainR0, mainR1, mainR2, mainR3, mainR4, mainR5],
    nav: [
      [1, 1, 1], // prtsc
      [1, 1, 1], // ins
      [1, 1, 1], // del
      [sp, 1, sp], // up
      [1, 1, 1], // left down right
    ],
    numpad: [
      [1, 1, 1, 1], // nlk
      [1, 1, 1, 1], // 789+
      [1, 1, 1, 1], // 456+
      [1, 1, 1, 1], // 123E
      [2, 1, 1]     // 0.E
    ]
  };

  const TKL_80 = {
    main: FULL_100.main,
    nav: FULL_100.nav,
    numpad: []
  };

  const SEVENTY_FIVE = {
    main: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // esc F1-F12 del
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1], // R1 + Home
      [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1], // R2 + PgUp
      [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25, 1], // R3 + PgDn
      [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75, 1, 1], // R4 + Shift + Up + End
      [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1, 1] // R5 + Alt Fn Ctrl Left Down Right
    ],
    nav: [], numpad: []
  };

  const SIXTY_FIVE = {
    main: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
      [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1],
      [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25, 1],
      [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75, 1, 1],
      [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1, 1]
    ],
    nav: [], numpad: []
  };

  const SIXTY = {
    main: [
      mainR1,
      mainR2,
      mainR3,
      mainR4,
      mainR5
    ],
    nav: [], numpad: []
  };

  // Determine layout by matching string
  let layout = SIXTY;
  let desc = "60% — alphas only";
  
  const ff = formFactor || '';
  if (ff === '100%') {
    layout = FULL_100;
    desc = "Full size — numpad included";
  } else if (ff === '96%') {
    layout = FULL_100; // approximating 96 with 100
    desc = "Compact full — tight numpad";
  } else if (ff === 'TKL' || ff === '80%') {
    layout = TKL_80;
    desc = "Tenkeyless — no numpad";
  } else if (ff === '75%') {
    layout = SEVENTY_FIVE;
    desc = "75% — compressed TKL";
  } else if (ff === '65%') {
    layout = SIXTY_FIVE;
    desc = "65% — no function row";
  } else if (ff === '40%') {
    layout = SIXTY;
    desc = "40% — ultra compact";
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        display: 'inline-flex',
        flexDirection: 'row',
        gap: '4px',
        padding: padding + 'px',
        background: '#ffffff08',
        border: '1px solid #ffffff15',
        borderRadius: '4px',
      }}>
        {/* main body columns */}
        {layout.main.length > 0 && <div>{renderRows(layout.main)}</div>}
        
        {/* nav cluster if applicable */}
        {layout.nav.length > 0 && <div>{renderRows(layout.nav)}</div>}
        
        {/* numpad if 100% */}
        {layout.numpad.length > 0 && <div>{renderRows(layout.numpad)}</div>}
      </div>

      {showLabel && (
        <div style={{
          fontSize: (large ? 12 : 10) + 'px',
          color: '#888899',
          textAlign: 'center',
          marginTop: '8px'
        }}>
          {desc}
        </div>
      )}
    </div>
  );
}
