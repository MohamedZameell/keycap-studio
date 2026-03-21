import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SAMPLE_DESIGNS } from '../data/sampleDesigns';

export default function GalleryScreen() {
  const setScreen = useStore(s => s.setScreen);
  const store = useStore();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [designName, setDesignName] = useState('');

  useEffect(() => {
    async function loadDesigns() {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.from('designs').select('*').order('likes', { ascending: false });
          if (error) throw error;
          setDesigns(data || []);
        } catch(e) {
          console.error("Supabase load error, falling back to sample designs:", e);
          setDesigns(SAMPLE_DESIGNS);
        }
      } else {
        setDesigns(SAMPLE_DESIGNS);
      }
      setLoading(false);
    }
    loadDesigns();
  }, []);

  const handleShare = async () => {
    if (!designName.trim()) return;
    
    const newDesign = {
      name: designName,
      color: store.globalColor || '#6c63ff',
      legendColor: store.globalLegendColor || '#ffffff',
      keyboard: store.selectedModel || 'Custom Keyboard',
      theme: 'Community Submission',
      font: store.globalFont || 'Inter',
      material: store.materialPreset || 'abs',
      likes: 0
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('designs').insert([newDesign]);
        const { data } = await supabase.from('designs').select('*').order('likes', { ascending: false });
        if (data) setDesigns(data);
      } catch (e) {
        console.error("Failed to share to supabase", e);
      }
    } else {
      // Demo mode: add to local state and show copy link alert
      setDesigns([{ ...newDesign, id: Math.random() }, ...designs]);
      
      const payload = btoa(JSON.stringify({
        c: store.globalColor, lc: store.globalLegendColor, f: store.globalFont, m: store.materialPreset, k: store.selectedModel
      }));
      const shareUrl = `${window.location.origin}?d=${payload}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert("Demo Mode: Link copied to clipboard! (Configure Supabase to save permanently to gallery)");
      });
    }
    setShowShareModal(false);
    setDesignName('');
  };

  const handleLoadDesign = (d) => {
    if (d.color) store.setGlobalColor(d.color);
    if (d.legendColor) store.setGlobalLegendColor(d.legendColor);
    if (d.keyboard) store.setSelectedModel(d.keyboard);
    if (d.font) store.setGlobalFont(d.font);
    if (d.material) store.setMaterialPreset(d.material);
    store.setScreen('studio');
  };

  let filtered = [...designs];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.keyboard.toLowerCase().includes(q)
    );
  }
  if (filter === 'Most Liked') filtered.sort((a,b) => b.likes - a.likes);
  // Simplistic filtering for "Recent" by assuming newer items have larger IDs just for demo, or normally using created_at
  if (filter === 'Recent') filtered.sort((a,b) => b.id - a.id);

  return (
    <div style={styles.container}>
      <style>{`
        .gallery-card {
          background: var(--surface-container); border-radius: 4px; overflow: hidden; cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border: 1px solid var(--outline-variant); display: flex; flex-direction: column;
        }
        .gallery-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.5); border-color: var(--primary); }
        .gallery-card-top { height: 200px; display: flex; align-items: center; justify-content: center; position: relative; }
        .css-keycap {
          width: 80px; height: 80px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-heading, sans-serif); font-weight: bold; font-size: 24px;
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -4px 0 rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.4);
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <button style={styles.backBtn} onClick={() => setScreen('entry')} onMouseEnter={e => e.target.style.borderColor = 'var(--primary)'} onMouseLeave={e => e.target.style.borderColor = 'var(--outline-variant)'}>← BACK</button>
          <h1 style={{fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--on-surface)'}}>COMMUNITY GALLERY</h1>
        </div>
        <button style={styles.shareBtn} onClick={() => setShowShareModal(true)} onMouseEnter={e => { e.target.style.background = 'var(--surface-container-high)'; e.target.style.color = 'var(--primary)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--primary)'; }} onMouseLeave={e => { e.target.style.background = 'var(--primary)'; e.target.style.color = 'var(--on-primary)'; e.target.style.boxShadow = 'none'; }}>SHARE DESIGN</button>
      </div>

      {/* Filters Bar */}
      <div style={styles.filtersBar}>
        <div style={{display: 'flex', gap: '8px'}}>
          {['All', 'Most Liked', 'Recent'].map(f => (
            <button key={f} style={filter === f ? styles.filterBtnActive : styles.filterBtn} onClick={() => setFilter(f)}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <input 
          type="text" 
          placeholder="SEARCH DESIGNS OR BRANDS..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
        />
      </div>

      {/* Grid */}
      <div style={styles.content}>
        {loading ? (
          <div style={{textAlign: 'center', color: '#888899', marginTop: '40px'}}>Loading gallery...</div>
        ) : (
          <div style={styles.grid}>
            {filtered.map((d, i) => (
              <div key={d.id || i} className="gallery-card" onClick={() => handleLoadDesign(d)}>
                <div className="gallery-card-top" style={{ backgroundColor: `${d.color}22` }}>
                  <div className="css-keycap" style={{ backgroundColor: d.color, color: d.legendColor, fontFamily: d.font }}>
                    {d.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div style={{ padding: '24px' }}>
                  <div style={{ fontSize: '18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '8px', letterSpacing: '-0.02em' }}>{d.name}</div>
                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--secondary)', marginBottom: '16px', letterSpacing: '0.1em' }}>{d.keyboard}</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                    <span style={{ backgroundColor: 'var(--surface-container-highest)', padding: '6px 12px', borderRadius: '4px' }}>{d.theme}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{color: 'var(--primary)'}}>★</span> {d.likes}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div style={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{marginTop: 0, marginBottom: '16px', fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--on-surface)', textTransform: 'uppercase', letterSpacing: '-0.02em'}}>SHARE DESIGN</h2>
            <p style={{color: 'var(--on-surface-variant)', fontSize: '14px', marginBottom: '32px', fontFamily: 'var(--font-body)', lineHeight: 1.6}}>
              Give your current design a name to share it with the Community Gallery.
            </p>
            <input 
              autoFocus
              type="text" 
              placeholder="E.G. MIDNIGHT CYBERPUNK" 
              value={designName} 
              onChange={e => setDesignName(e.target.value)}
              style={{...styles.searchInput, width: '100%', marginBottom: '32px'}}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
            />
            <div style={{display: 'flex', gap: '16px', justifyContent: 'flex-end'}}>
              <button style={styles.cancelBtn} onClick={() => setShowShareModal(false)} onMouseEnter={e => e.target.style.backgroundColor = 'var(--surface)'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>CANCEL</button>
              <button style={styles.confirmBtn} onClick={handleShare} onMouseEnter={e => { e.target.style.background = 'var(--surface-container-high)'; e.target.style.color = 'var(--primary)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--primary)'; }} onMouseLeave={e => { e.target.style.background = 'var(--primary)'; e.target.style.color = 'var(--on-primary)'; e.target.style.boxShadow = 'none'; }}>DEPLOY DESIGN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', width: '100%', backgroundColor: 'var(--surface-dim)', color: 'var(--on-surface)', display: 'flex', flexDirection: 'column' },
  header: { height: '72px', padding: '0 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', position: 'sticky', top: 0, zIndex: 10 },
  backBtn: { backgroundColor: 'var(--surface-container)', border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s' },
  shareBtn: { backgroundColor: 'var(--primary)', color: 'var(--on-primary)', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s' },
  filtersBar: { padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  filterBtn: { backgroundColor: 'transparent', border: 'none', color: 'var(--on-surface-variant)', padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 600, transition: 'all 0.2s' },
  filterBtnActive: { backgroundColor: 'var(--surface-container-high)', border: 'none', color: 'var(--on-surface)', padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 600, borderRadius: '4px', boxShadow: 'inset 0 0 0 1px var(--primary)' },
  searchInput: { backgroundColor: 'var(--surface-container)', border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', padding: '12px 16px', borderRadius: '4px', width: '320px', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '13px', transition: '0.2s' },
  content: { padding: '0 48px 64px', flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalContent: { backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '4px', padding: '48px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' },
  cancelBtn: { backgroundColor: 'transparent', border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', transition: '0.2s' },
  confirmBtn: { backgroundColor: 'var(--primary)', border: 'none', color: 'var(--on-primary)', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', transition: '0.2s' }
};
