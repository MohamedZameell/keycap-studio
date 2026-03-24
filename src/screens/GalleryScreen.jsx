import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import {
  isSupabaseConfigured,
  getGalleryDesigns,
  shareDesign,
  likeDesign,
  getUserLikes
} from '../lib/supabase';
import { SAMPLE_DESIGNS } from '../data/sampleDesigns';
import AuthModal from '../components/AuthModal';

export default function GalleryScreen() {
  const setScreen = useStore(s => s.setScreen);
  const store = useStore();
  const { user, profile, signOut, isAuthenticated } = useAuth();

  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [designName, setDesignName] = useState('');
  const [likedDesigns, setLikedDesigns] = useState([]);
  const [shareError, setShareError] = useState('');

  // Load designs
  useEffect(() => {
    async function loadDesigns() {
      if (isSupabaseConfigured) {
        try {
          const data = await getGalleryDesigns({
            orderBy: filter === 'Recent' ? 'recent' : 'likes'
          });
          // Map database columns to expected format
          const mapped = data.map(d => ({
            ...d,
            legendColor: d.legend_color,
            perKeyDesigns: d.per_key_designs,
            author: d.profiles?.username || 'Anonymous'
          }));
          setDesigns(mapped.length > 0 ? mapped : SAMPLE_DESIGNS);
        } catch (e) {
          console.error("Supabase load error:", e);
          setDesigns(SAMPLE_DESIGNS);
        }
      } else {
        setDesigns(SAMPLE_DESIGNS);
      }
      setLoading(false);
    }
    loadDesigns();
  }, [filter]);

  // Load user's likes
  useEffect(() => {
    async function loadLikes() {
      if (user) {
        const likes = await getUserLikes(user.id);
        setLikedDesigns(likes);
      } else {
        // Fallback to localStorage for non-authenticated users
        try {
          setLikedDesigns(JSON.parse(localStorage.getItem('likedDesigns') || '[]'));
        } catch { setLikedDesigns([]); }
      }
    }
    loadLikes();
  }, [user]);

  const handleShare = async () => {
    if (!designName.trim()) return;
    setShareError('');

    const newDesign = {
      name: designName,
      color: store.globalColor || '#6c63ff',
      legendColor: store.globalLegendColor || '#ffffff',
      keyboard: store.selectedModel || 'Custom Keyboard',
      theme: 'Community',
      font: store.globalFont || 'Inter',
      material: store.materialPreset || 'abs',
      profile: store.selectedProfile,
      perKeyDesigns: store.perKeyDesigns || {},
      images: store.keyboardImages?.filter(i => i.url) || []
    };

    if (isSupabaseConfigured) {
      const { data, error } = await shareDesign(newDesign);
      if (error) {
        setShareError(error.message);
        return;
      }
      // Refresh designs
      const refreshed = await getGalleryDesigns();
      const mapped = refreshed.map(d => ({
        ...d,
        legendColor: d.legend_color,
        perKeyDesigns: d.per_key_designs,
        author: d.profiles?.username || 'Anonymous'
      }));
      setDesigns(mapped);
    } else {
      // Demo mode
      setDesigns([{ ...newDesign, id: Date.now(), likes: 0 }, ...designs]);
      const payload = btoa(JSON.stringify({
        c: store.globalColor, lc: store.globalLegendColor, f: store.globalFont, m: store.materialPreset, k: store.selectedModel
      }));
      const shareUrl = `${window.location.origin}?d=${payload}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert("Demo Mode: Link copied! Configure Supabase to save permanently.");
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
    if (d.profile) store.setSelectedProfile(d.profile);
    store.setScreen('studio');
  };

  const handleLike = async (e, design) => {
    e.stopPropagation();
    const designId = design.id;
    if (likedDesigns.includes(designId)) return;

    if (isSupabaseConfigured && user) {
      const { error } = await likeDesign(designId);
      if (!error) {
        setLikedDesigns([...likedDesigns, designId]);
        setDesigns(designs.map(d =>
          d.id === designId ? { ...d, likes: d.likes + 1 } : d
        ));
      }
    } else {
      // Demo mode / not logged in
      const newLiked = [...likedDesigns, designId];
      setLikedDesigns(newLiked);
      localStorage.setItem('likedDesigns', JSON.stringify(newLiked));
      setDesigns(designs.map(d =>
        d.id === designId ? { ...d, likes: d.likes + 1 } : d
      ));
    }
  };

  // Filter and search
  let filtered = [...designs];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.keyboard?.toLowerCase().includes(q) ||
      d.author?.toLowerCase().includes(q)
    );
  }
  if (filter === 'Most Liked') filtered.sort((a, b) => b.likes - a.likes);
  if (filter === 'Recent') filtered.sort((a, b) => new Date(b.created_at || b.id) - new Date(a.created_at || a.id));

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
        .user-menu { position: relative; }
        .user-menu-btn { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: var(--on-primary); font-weight: 600; font-size: 14px; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button style={styles.backBtn} onClick={() => setScreen('entry')}>← BACK</button>
          <h1 style={styles.headerTitle}>COMMUNITY GALLERY</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button style={styles.shareBtn} onClick={() => setShowShareModal(true)}>SHARE DESIGN</button>

          {isAuthenticated ? (
            <div className="user-menu">
              <div className="user-menu-btn" onClick={signOut} title="Sign Out">
                <div className="user-avatar">
                  {(profile?.username || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span style={{ color: 'var(--on-surface-variant)', fontSize: '13px', fontFamily: 'var(--font-heading)' }}>
                  {profile?.username || 'User'}
                </span>
              </div>
            </div>
          ) : (
            <button style={styles.authBtn} onClick={() => setShowAuthModal(true)}>SIGN IN</button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div style={styles.filtersBar}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Most Liked', 'Recent'].map(f => (
            <button
              key={f}
              style={filter === f ? styles.filterBtnActive : styles.filterBtn}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="SEARCH DESIGNS, BRANDS, AUTHORS..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Grid */}
      <div style={styles.content}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--on-surface-variant)', marginTop: '40px' }}>Loading gallery...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--on-surface-variant)', marginTop: '40px' }}>No designs found</div>
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
                  <div style={styles.cardTitle}>{d.name}</div>
                  <div style={styles.cardKeyboard}>{d.keyboard}</div>
                  {d.author && <div style={styles.cardAuthor}>by {d.author}</div>}

                  <div style={styles.cardFooter}>
                    <span style={styles.cardTheme}>{d.theme}</span>
                    <button
                      onClick={(e) => handleLike(e, d)}
                      style={{
                        ...styles.likeBtn,
                        background: likedDesigns.includes(d.id) ? 'var(--primary)' : 'var(--surface-container-highest)',
                        color: likedDesigns.includes(d.id) ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                        cursor: likedDesigns.includes(d.id) ? 'default' : 'pointer'
                      }}
                    >
                      <span style={{ color: likedDesigns.includes(d.id) ? 'var(--on-primary)' : 'var(--primary)' }}>
                        {likedDesigns.includes(d.id) ? '★' : '☆'}
                      </span>
                      {d.likes}
                    </button>
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
            <h2 style={styles.modalTitle}>SHARE DESIGN</h2>
            <p style={styles.modalText}>
              Give your current design a name to share it with the Community Gallery.
              {!isAuthenticated && isSupabaseConfigured && (
                <span style={{ color: 'var(--primary)', display: 'block', marginTop: '8px' }}>
                  Sign in to have your name attached to the design.
                </span>
              )}
            </p>
            {shareError && <div style={styles.error}>{shareError}</div>}
            <input
              autoFocus
              type="text"
              placeholder="E.G. MIDNIGHT CYBERPUNK"
              value={designName}
              onChange={e => setDesignName(e.target.value)}
              style={{ ...styles.searchInput, width: '100%', marginBottom: '32px' }}
            />
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <button style={styles.cancelBtn} onClick={() => setShowShareModal(false)}>CANCEL</button>
              <button style={styles.confirmBtn} onClick={handleShare}>DEPLOY DESIGN</button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', width: '100%', backgroundColor: 'var(--surface-dim)', color: 'var(--on-surface)', display: 'flex', flexDirection: 'column' },
  header: { height: '72px', padding: '0 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', position: 'sticky', top: 0, zIndex: 10 },
  headerTitle: { fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--on-surface)' },
  backBtn: { backgroundColor: 'var(--surface-container)', border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s' },
  shareBtn: { backgroundColor: 'var(--primary)', color: 'var(--on-primary)', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s' },
  authBtn: { backgroundColor: 'transparent', border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  filtersBar: { padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  filterBtn: { backgroundColor: 'transparent', border: 'none', color: 'var(--on-surface-variant)', padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 600, transition: 'all 0.2s' },
  filterBtnActive: { backgroundColor: 'var(--surface-container-high)', border: 'none', color: 'var(--on-surface)', padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 600, borderRadius: '4px', boxShadow: 'inset 0 0 0 1px var(--primary)' },
  searchInput: { backgroundColor: 'var(--surface-container)', border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', padding: '12px 16px', borderRadius: '4px', width: '320px', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '13px', transition: '0.2s' },
  content: { padding: '0 48px 64px', flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px' },
  cardTitle: { fontSize: '18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '8px', letterSpacing: '-0.02em' },
  cardKeyboard: { fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--secondary)', marginBottom: '4px', letterSpacing: '0.1em' },
  cardAuthor: { fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--on-surface-variant)', marginBottom: '16px' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-heading)', fontWeight: 600 },
  cardTheme: { backgroundColor: 'var(--surface-container-highest)', padding: '6px 12px', borderRadius: '4px' },
  likeBtn: { display: 'flex', alignItems: 'center', gap: '6px', border: 'none', padding: '6px 12px', borderRadius: '4px', transition: 'all 0.2s', fontSize: '12px', fontFamily: 'var(--font-heading)', fontWeight: 600 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalContent: { backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '4px', padding: '48px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' },
  modalTitle: { marginTop: 0, marginBottom: '16px', fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--on-surface)', textTransform: 'uppercase', letterSpacing: '-0.02em' },
  modalText: { color: 'var(--on-surface-variant)', fontSize: '14px', marginBottom: '32px', fontFamily: 'var(--font-body)', lineHeight: 1.6 },
  error: { backgroundColor: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)', color: '#ff6b6b', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px' },
  cancelBtn: { backgroundColor: 'transparent', border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', transition: '0.2s' },
  confirmBtn: { backgroundColor: 'var(--primary)', border: 'none', color: 'var(--on-primary)', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', transition: '0.2s' }
};
