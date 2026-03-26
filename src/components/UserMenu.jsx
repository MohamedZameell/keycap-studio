import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store';
import { getUserDesigns, deleteUserDesign, supabase, isSupabaseConfigured } from '../lib/supabase';

export default function UserMenu() {
  const { user, profile, signOut, isAuthenticated } = useAuth();
  const setScreen = useStore(s => s.setScreen);
  const store = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile, designs, favorites, settings
  const [savedDesigns, setSavedDesigns] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load user data when menu opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadUserData();
    }
  }, [isOpen, isAuthenticated]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const designs = await getUserDesigns();
      setSavedDesigns(designs);
      setFavorites(designs.filter(d => d.is_favorite));
    } catch (err) {
      console.error('Error loading user data:', err);
    }
    setLoading(false);
  };

  const handleLoadDesign = (design) => {
    if (design.color) store.setGlobalColor(design.color);
    if (design.legend_color) store.setGlobalLegendColor(design.legend_color);
    if (design.keyboard) store.setSelectedModel(design.keyboard);
    if (design.font) store.setGlobalFont(design.font);
    if (design.material) store.setMaterialPreset(design.material);
    setIsOpen(false);
    setScreen('studio');
  };

  const handleDeleteDesign = async (e, designId) => {
    e.stopPropagation();
    if (confirm('Delete this design?')) {
      await deleteUserDesign(designId);
      loadUserData();
    }
  };

  const handleToggleFavorite = async (e, design) => {
    e.stopPropagation();
    if (!isSupabaseConfigured || !user) return;

    await supabase
      .from('user_designs')
      .update({ is_favorite: !design.is_favorite })
      .eq('id', design.id);
    loadUserData();
  };

  if (!isAuthenticated) return null;

  const userInitial = (profile?.username || user?.email || 'U').charAt(0).toUpperCase();
  const userName = profile?.username || user?.email?.split('@')[0] || 'User';

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--primary)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--on-primary)', fontWeight: 700, fontSize: 14,
          fontFamily: 'var(--font-heading)', cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          boxShadow: isOpen ? '0 0 0 2px var(--surface), 0 0 0 4px var(--primary)' : 'none'
        }}
      >
        {userInitial}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={styles.dropdown}>
          <style>{`
            .user-menu-tab { padding: 10px 16px; background: none; border: none; color: var(--on-surface-variant); font-family: var(--font-heading); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; transition: 0.2s; border-bottom: 2px solid transparent; }
            .user-menu-tab:hover { color: var(--on-surface); }
            .user-menu-tab.active { color: var(--primary); border-bottom-color: var(--primary); }
            .design-card { padding: 12px; background: var(--surface-container); border: 1px solid var(--outline-variant); border-radius: 4px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 12px; }
            .design-card:hover { border-color: var(--primary); background: var(--surface-container-high); }
            .design-color { width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0; }
            .design-info { flex: 1; min-width: 0; }
            .design-name { font-family: var(--font-heading); font-size: 13px; font-weight: 600; color: var(--on-surface); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .design-keyboard { font-family: var(--font-mono); font-size: 10px; color: var(--on-surface-variant); text-transform: uppercase; }
            .design-actions { display: flex; gap: 4px; }
            .design-action { width: 24px; height: 24px; border: none; background: none; color: var(--on-surface-variant); cursor: pointer; border-radius: 4px; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
            .design-action:hover { background: var(--surface-container-highest); color: var(--primary); }
            .empty-state { text-align: center; padding: 32px 16px; color: var(--on-surface-variant); font-family: var(--font-body); font-size: 14px; }
          `}</style>

          {/* Header */}
          <div style={styles.header}>
            <div style={styles.avatar}>{userInitial}</div>
            <div>
              <div style={styles.userName}>{userName}</div>
              <div style={styles.userEmail}>{user?.email}</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={styles.tabs}>
            {['profile', 'designs', 'favorites', 'settings'].map(tab => (
              <button
                key={tab}
                className={`user-menu-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={styles.content}>
            {activeTab === 'profile' && (
              <div style={styles.section}>
                <div style={styles.statGrid}>
                  <div style={styles.stat}>
                    <div style={styles.statValue}>{savedDesigns.length}</div>
                    <div style={styles.statLabel}>Saved Designs</div>
                  </div>
                  <div style={styles.stat}>
                    <div style={styles.statValue}>{favorites.length}</div>
                    <div style={styles.statLabel}>Favorites</div>
                  </div>
                </div>
                <button style={styles.menuBtn} onClick={() => { setScreen('gallery'); setIsOpen(false); }}>
                  Browse Gallery
                </button>
                <button style={styles.menuBtn} onClick={() => { setScreen('studio'); setIsOpen(false); }}>
                  Open Studio
                </button>
              </div>
            )}

            {activeTab === 'designs' && (
              <div style={styles.section}>
                {loading ? (
                  <div className="empty-state">Loading...</div>
                ) : savedDesigns.length === 0 ? (
                  <div className="empty-state">
                    No saved designs yet.<br />
                    Create one in the Studio!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {savedDesigns.map(design => (
                      <div key={design.id} className="design-card" onClick={() => handleLoadDesign(design)}>
                        <div className="design-color" style={{ background: design.color }} />
                        <div className="design-info">
                          <div className="design-name">{design.name}</div>
                          <div className="design-keyboard">{design.keyboard || 'Custom'}</div>
                        </div>
                        <div className="design-actions">
                          <button className="design-action" onClick={(e) => handleToggleFavorite(e, design)}>
                            {design.is_favorite ? '★' : '☆'}
                          </button>
                          <button className="design-action" onClick={(e) => handleDeleteDesign(e, design.id)}>
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div style={styles.section}>
                {loading ? (
                  <div className="empty-state">Loading...</div>
                ) : favorites.length === 0 ? (
                  <div className="empty-state">
                    No favorites yet.<br />
                    Star designs to add them here!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {favorites.map(design => (
                      <div key={design.id} className="design-card" onClick={() => handleLoadDesign(design)}>
                        <div className="design-color" style={{ background: design.color }} />
                        <div className="design-info">
                          <div className="design-name">{design.name}</div>
                          <div className="design-keyboard">{design.keyboard || 'Custom'}</div>
                        </div>
                        <div className="design-actions">
                          <button className="design-action" onClick={(e) => handleToggleFavorite(e, design)}>★</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div style={styles.section}>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>Email</span>
                  <span style={styles.settingValue}>{user?.email}</span>
                </div>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>Username</span>
                  <span style={styles.settingValue}>{profile?.username || 'Not set'}</span>
                </div>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>Member since</span>
                  <span style={styles.settingValue}>
                    {new Date(user?.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--outline-variant)' }}>
                  <button style={{ ...styles.menuBtn, background: 'rgba(255,100,100,0.1)', color: '#ff6b6b' }} onClick={signOut}>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 320,
    background: 'var(--surface)',
    border: '1px solid var(--outline-variant)',
    borderRadius: 4,
    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    zIndex: 1000,
    overflow: 'hidden'
  },
  header: {
    padding: 20,
    background: 'var(--surface-container)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderBottom: '1px solid var(--outline-variant)'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--on-primary)',
    fontWeight: 700,
    fontSize: 20,
    fontFamily: 'var(--font-heading)'
  },
  userName: {
    fontFamily: 'var(--font-heading)',
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--on-surface)'
  },
  userEmail: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--on-surface-variant)',
    marginTop: 2
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--outline-variant)',
    background: 'var(--surface-container-low)'
  },
  content: {
    maxHeight: 300,
    overflowY: 'auto'
  },
  section: {
    padding: 16
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 16
  },
  stat: {
    background: 'var(--surface-container)',
    padding: 16,
    borderRadius: 4,
    textAlign: 'center'
  },
  statValue: {
    fontFamily: 'var(--font-heading)',
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--primary)'
  },
  statLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase',
    marginTop: 4
  },
  menuBtn: {
    width: '100%',
    padding: 12,
    background: 'var(--surface-container)',
    border: '1px solid var(--outline-variant)',
    borderRadius: 4,
    color: 'var(--on-surface)',
    fontFamily: 'var(--font-heading)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 8,
    transition: '0.2s'
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid var(--outline-variant)'
  },
  settingLabel: {
    fontFamily: 'var(--font-heading)',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase'
  },
  settingValue: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--on-surface)'
  }
};
