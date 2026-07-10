// ============================================================
// UI KIT (2026-07 declutter pass) — shared primitives for the
// studio side panel. One accent, neutral section headers, real
// SVG icons (lucide path data — emoji are banned as icons),
// progressive disclosure via collapsible Sections.
// ============================================================
import React, { useState } from 'react';

// ---- tokens ---------------------------------------------------
export const T = {
  ink: '#f2f1f7',
  sub: '#9b98ab',
  mut: 'rgba(246,246,246,0.38)',
  line: 'rgba(246,246,246,0.08)',
  lineStrong: 'rgba(246,246,246,0.16)',
  card: 'rgba(246,246,246,0.035)',
  cardHover: 'rgba(246,246,246,0.07)',
  accent: '#cbb6ff',
  accentDim: 'rgba(203,182,255,0.12)',
  accentLine: 'rgba(203,182,255,0.45)',
  danger: '#ff6b81',
  dangerDim: 'rgba(255,107,129,0.12)',
  font: 'Inter, system-ui, sans-serif',
  heading: '"Space Grotesk", Inter, sans-serif',
};

// ---- icons (lucide 24-box path data, stroke) -------------------
const PATHS = {
  palette: 'M12 22a10 10 0 1 1 10-10c0 1.7-1.3 3-3 3h-2a2 2 0 0 0-2 2c0 .6.2 1 .5 1.4.3.5.5.9.5 1.6a2 2 0 0 1-2 2Z M7.5 10.5h.01 M10.5 7h.01 M14.5 7h.01 M17.5 10.5h.01',
  type: 'M4 7V4h16v3 M9 20h6 M12 4v16',
  sticker: 'M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z M15 3v4a2 2 0 0 0 2 2h4 M8 13h.01 M15 13h.01 M10 16.5c1 .6 3 .6 4 0',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  sparkles: 'M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3Z',
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  fileText: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5Z M14 2v4a2 2 0 0 0 2 2h4 M8 13h8 M8 17h5',
  pkg: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z M3.3 7 12 12l8.7-5 M12 22V12',
  printer: 'M6 9V3h12v6 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6Z',
  braces: 'M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1 M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1',
  vector: 'M4 19c8 0 8-14 16-14 M3 17h4v4H3Z M17 3h4v4h-4Z',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8Z',
  box: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
  droplet: 'M12 2.7S6 9.3 6 13.5a6 6 0 0 0 12 0C18 9.3 12 2.7 12 2.7Z',
  grid: 'M3 3h7v7H3Z M14 3h7v7h-7Z M14 14h7v7h-7Z M3 14h7v7H3Z',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M9 9h.01 M21 15l-4-4a2 2 0 0 0-2.8 0L6 19',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  clipboard: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2H9Z M9 14l2 2 4-4',
  keyboard: 'M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z M6 10h.01 M10 10h.01 M14 10h.01 M18 10h.01 M8 14h8',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  plus: 'M5 12h14 M12 5v14',
  x: 'M18 6 6 18 M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  monitor: 'M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M8 21h8 M12 17v4',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
};

export function Icon({ name, size = 16, sw = 1.75, style, color }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || 'currentColor'} strokeWidth={name === 'more' ? 2.6 : sw}
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      {d.split(' M').map((seg, i) => <path key={i} d={i === 0 ? seg : 'M' + seg} />)}
    </svg>
  );
}

// ---- section header / collapsible section ---------------------
const headerStyle = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  fontFamily: T.font, fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: T.sub, background: 'none', border: 'none',
  padding: 0, textAlign: 'left',
};

export function Section({ title, icon, children, collapsible = false, defaultOpen = false, badge, style }) {
  const [open, setOpen] = useState(defaultOpen);
  const expanded = !collapsible || open;
  return (
    <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, marginTop: 2, ...style }}>
      {collapsible ? (
        <button onClick={() => setOpen(o => !o)} style={{ ...headerStyle, cursor: 'pointer' }}>
          {icon && <Icon name={icon} size={13} color={T.sub} />}
          <span style={{ flex: 1 }}>{title}</span>
          {badge != null && <span style={{ color: T.mut, letterSpacing: 0, textTransform: 'none', fontWeight: 500 }}>{badge}</span>}
          <Icon name="chevronDown" size={14} color={T.mut}
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
        </button>
      ) : (
        <div style={headerStyle}>
          {icon && <Icon name={icon} size={13} color={T.sub} />}
          <span style={{ flex: 1 }}>{title}</span>
          {badge != null && <span style={{ color: T.mut, letterSpacing: 0, textTransform: 'none', fontWeight: 500 }}>{badge}</span>}
        </div>
      )}
      {expanded && <div style={{ paddingTop: 12 }}>{children}</div>}
    </div>
  );
}

// ---- segmented control ----------------------------------------
export function Segmented({ options, value, onChange, size = 'md' }) {
  const h = size === 'sm' ? 28 : 34;
  return (
    <div style={{ display: 'flex', background: T.card, borderRadius: 8, padding: 3, gap: 2 }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} title={o.title || o.label}
            style={{
              flex: 1, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: active ? 'rgba(246,246,246,0.09)' : 'transparent',
              color: active ? T.ink : T.sub, border: 'none', borderRadius: 6,
              fontFamily: T.font, fontSize: 12, fontWeight: active ? 600 : 500,
              cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
            }}>
            {o.icon && <Icon name={o.icon} size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---- action row (export lists etc.) ----------------------------
export function RowBtn({ icon, title, sub, right, onClick, disabled, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 44,
        padding: '9px 12px', marginBottom: 6, textAlign: 'left',
        background: hov && !disabled ? T.cardHover : T.card,
        border: `1px solid ${hov && !disabled ? T.lineStrong : T.line}`, borderRadius: 8,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s, border-color 0.15s',
      }}>
      {icon && <Icon name={icon} size={16} color={danger ? T.danger : T.sub} />}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: T.font, fontSize: 13, fontWeight: 600, color: danger ? T.danger : T.ink }}>{title}</span>
        {sub && <span style={{ display: 'block', fontFamily: T.font, fontSize: 11, color: T.mut, marginTop: 1 }}>{sub}</span>}
      </span>
      {right}
    </button>
  );
}
