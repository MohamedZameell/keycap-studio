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
          // Assume table name is 'designs'
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
          background: #16162a; border-radius: 12px; overflow: hidden; cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .gallery-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.5); border-color: rgba(108,99,255,0.3); }
        .gallery-card-top { height: 160px; display: flex; align-items: center; justify-content: center; position: relative; }
        .css-keycap {
          width: 80px; height: 80px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-primary, sans-serif); font-weight: bold; font-size: 24px;
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -4px 0 rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.4);
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <button style={styles.backBtn} onClick={() => setScreen('entry')}>← Back</button>
          <h1 style={{fontSize: '24px', fontWeight: 700, margin: 0}}>Community Gallery</h1>
        </div>
        <button style={styles.shareBtn} onClick={() => setShowShareModal(true)}>Share Your Design</button>
      </div>

      {/* Filters Bar */}
      <div style={styles.filtersBar}>
        <div style={{display: 'flex', gap: '12px'}}>
          {['All', 'Most Liked', 'Recent'].map(f => (
            <button key={f} style={filter === f ? styles.filterBtnActive : styles.filterBtn} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <input 
          type="text" 
          placeholder="Search designs or keyboards..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
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
                <div style={{ padding: '16px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>{d.name}</div>
                  <div style={{ fontSize: '12px', color: '#a09bf5', marginBottom: '12px' }}>{d.keyboard}</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888899' }}>
                    <span>{d.theme}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{color: '#ff4b4b'}}>♥</span> {d.likes}
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
            <h2 style={{marginTop: 0, marginBottom: '16px'}}>Share Your Design</h2>
            <p style={{color: '#888899', fontSize: '14px', marginBottom: '24px'}}>
              Give your current design a name to share it with the Community Gallery.
            </p>
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. Midnight Cyberpunk" 
              value={designName} 
              onChange={e => setDesignName(e.target.value)}
              style={{...styles.searchInput, width: '100%', marginBottom: '24px'}}
            />
            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
              <button style={styles.cancelBtn} onClick={() => setShowShareModal(false)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={handleShare}>Share Design</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', width: '100%',
    backgroundColor: '#0a0a0f', color: '#fff',
    display: 'flex', flexDirection: 'column'
  },
  header: {
    height: '72px', padding: '0 40px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(10px)',
    position: 'sticky', top: 0, zIndex: 10
  },
  backBtn: {
    backgroundColor: '#16162a', border: '1px solid #2a2a4a', color: '#888899',
    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
  },
  shareBtn: {
    backgroundColor: '#6c63ff', color: '#fff', border: 'none',
    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
  },
  filtersBar: {
    padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  filterBtn: {
    backgroundColor: 'transparent', border: 'none', color: '#888899',
    padding: '6px 12px', cursor: 'pointer', fontSize: '14px', fontWeight: 500
  },
  filterBtnActive: {
    backgroundColor: 'rgba(108,99,255,0.15)', border: 'none', color: '#b3b0ff',
    padding: '6px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, borderRadius: '16px'
  },
  searchInput: {
    backgroundColor: '#16162a', border: '1px solid #2a2a4a', color: '#fff',
    padding: '10px 16px', borderRadius: '8px', width: '300px', outline: 'none'
  },
  content: {
    padding: '0 40px 60px', flex: 1
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px'
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
  },
  modalContent: {
    backgroundColor: '#11111a', border: '1px solid #2a2a4a', borderRadius: '16px',
    padding: '32px', width: '100%', maxWidth: '400px'
  },
  cancelBtn: {
    backgroundColor: 'transparent', border: '1px solid #2a2a4a', color: '#888899',
    padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
  },
  confirmBtn: {
    backgroundColor: '#6c63ff', border: 'none', color: '#fff',
    padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
  }
};
