import { HexColorPicker } from 'react-colorful'
import { useState } from 'react'
import { useStore } from '../store'
import './ControlPanel.css'

const FONTS = [
  { name: 'Inter', label: 'Inter — Modern' },
  { name: 'Oswald', label: 'Oswald — Bold' },
  { name: 'Press Start 2P', label: 'Press Start 2P — Pixel' },
  { name: 'Share Tech Mono', label: 'Share Tech Mono — Mono' },
  { name: 'Playfair Display', label: 'Playfair — Elegant' },
  { name: 'Nunito', label: 'Nunito — Rounded' },
  { name: 'Rajdhani', label: 'Rajdhani — Futuristic' },
  { name: 'Bebas Neue', label: 'Bebas Neue — Gaming' },
]

export default function ControlPanel() {
  const {
    color, setColor,
    legendColor, setLegendColor,
    legend, setLegend,
    font, setFont,
    roughness, setRoughness,
    metalness, setMetalness,
    backlit, setBacklit,
    backlitColor, setBacklitColor,
  } = useStore()

  const [activeTab, setActiveTab] = useState('color')
  const [activePicker, setActivePicker] = useState('base')

  return (
    <div className="panel">
      <div className="panel-header">
        <h1>Keycap Studio</h1>
        <p>Design your keycap in 3D</p>
      </div>

      <div className="tabs">
        {['color', 'legend', 'material', 'backlit'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'color' && (
        <div className="tab-content">
          <div className="picker-toggle">
            <button
              className={activePicker === 'base' ? 'active' : ''}
              onClick={() => setActivePicker('base')}
            >
              Base color
            </button>
            <button
              className={activePicker === 'legend' ? 'active' : ''}
              onClick={() => setActivePicker('legend')}
            >
              Legend color
            </button>
          </div>
          <HexColorPicker
            color={activePicker === 'base' ? color : legendColor}
            onChange={activePicker === 'base' ? setColor : setLegendColor}
          />
          <div className="hex-display">
            <span>{activePicker === 'base' ? color : legendColor}</span>
            <div className="color-swatch" style={{
              background: activePicker === 'base' ? color : legendColor
            }} />
          </div>
        </div>
      )}

      {activeTab === 'legend' && (
        <div className="tab-content">
          <label className="field-label">Legend text</label>
          <input
            className="text-input"
            value={legend}
            onChange={e => setLegend(e.target.value)}
            maxLength={4}
            placeholder="A"
          />
          <label className="field-label">Font</label>
          <div className="font-list">
            {FONTS.map(f => (
              <button
                key={f.name}
                className={`font-option ${font === f.name ? 'active' : ''}`}
                style={{ fontFamily: f.name }}
                onClick={() => setFont(f.name)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'material' && (
        <div className="tab-content">
          <label className="field-label">
            Roughness — {roughness < 0.3 ? 'Glossy (ABS)' : 'Matte (PBT)'}
          </label>
          <input
            type="range" min="0" max="1" step="0.01"
            value={roughness}
            onChange={e => setRoughness(parseFloat(e.target.value))}
            className="slider"
          />
          <label className="field-label">
            Metalness — {metalness > 0.5 ? 'Metallic' : 'Plastic'}
          </label>
          <input
            type="range" min="0" max="1" step="0.01"
            value={metalness}
            onChange={e => setMetalness(parseFloat(e.target.value))}
            className="slider"
          />
          <div className="material-presets">
            <label className="field-label">Presets</label>
            <div className="preset-row">
              <button onClick={() => { setRoughness(0.8); setMetalness(0.0) }}>PBT matte</button>
              <button onClick={() => { setRoughness(0.2); setMetalness(0.05) }}>ABS glossy</button>
              <button onClick={() => { setRoughness(0.3); setMetalness(0.8) }}>Aluminium</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'backlit' && (
        <div className="tab-content">
          <div className="toggle-row">
            <label className="field-label">RGB backlit</label>
            <button
              className={`toggle-btn ${backlit ? 'on' : 'off'}`}
              onClick={() => setBacklit(!backlit)}
            >
              {backlit ? 'ON' : 'OFF'}
            </button>
          </div>
          {backlit && (
            <>
              <label className="field-label">Backlit color</label>
              <HexColorPicker color={backlitColor} onChange={setBacklitColor} />
              <div className="hex-display">
                <span>{backlitColor}</span>
                <div className="color-swatch" style={{ background: backlitColor }} />
              </div>
            </>
          )}
          {!backlit && (
            <p className="hint">Turn on backlit to see RGB glow underneath the keycap</p>
          )}
        </div>
      )}
    </div>
  )
}