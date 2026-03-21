import React, { useState, useEffect } from 'react';

export default function SignInModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const show = () => setIsOpen(true);
    const hide = () => setIsOpen(false);
    
    document.addEventListener('showSignIn', show);
    document.addEventListener('hideSignIn', hide);
    return () => {
      document.removeEventListener('showSignIn', show);
      document.removeEventListener('hideSignIn', hide);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setIsOpen(false)}>
      <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.3s ease-out; }
        .modal-content { background: var(--surface); border: 1px solid var(--outline-variant); border-radius: 4px; padding: 48px; width: 100%; max-width: 440px; box-shadow: 0 24px 64px rgba(0,0,0,0.8); position: relative; display: flex; flex-direction: column; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .modal-close { position: absolute; top: 24px; right: 24px; background: transparent; border: none; color: var(--on-surface-variant); font-size: 24px; cursor: pointer; transition: 0.2s; }
        .modal-close:hover { color: var(--on-surface); transform: scale(1.1); }
        .oauth-btn { width: 100%; padding: 12px; background: var(--surface-container); border: 1px solid var(--outline-variant); border-radius: 4px; color: var(--on-surface); font-family: var(--font-heading); font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: 0.2s; margin-bottom: 12px; }
        .oauth-btn:hover { background: var(--surface-container-high); border-color: var(--primary); color: var(--primary); }
        .divider { display: flex; align-items: center; text-align: center; color: var(--on-surface-variant); font-family: var(--font-mono); font-size: 11px; margin: 24px 0; }
        .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid var(--outline-variant); }
        .divider::before { margin-right: 16px; }
        .divider::after { margin-left: 16px; }
        .input-field { width: 100%; padding: 14px 16px; background: var(--surface-container-lowest); border: 1px solid var(--outline-variant); border-radius: 4px; color: var(--on-surface); font-family: var(--font-body); font-size: 14px; outline: none; transition: 0.2s; box-sizing: border-box; }
        .input-field:focus { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
        .submit-btn { width: 100%; padding: 14px; background: var(--primary); color: var(--on-primary); border: none; border-radius: 4px; font-family: var(--font-heading); font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 16px; transition: 0.2s; text-transform: uppercase; letter-spacing: 0.05em; }
        .submit-btn:hover { background: var(--surface-container-high); color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
        @keyframes fadeIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(12px); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setIsOpen(false)}>×</button>
        
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: 'var(--surface-container-high)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid var(--outline-variant)' }}>
            <div style={{ width: 24, height: 24, backgroundColor: 'var(--primary)', borderRadius: '2px' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>Sign in into Studio</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--on-surface-variant)', marginTop: 8 }}>Access your cloud designs and orders.</p>
        </div>

        <button className="oauth-btn">Continue with Google</button>
        <button className="oauth-btn">Continue with Apple</button>

        <div className="divider">OR</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input-field" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="submit-btn" onClick={() => setIsOpen(false)}>Sign In with Email</button>
        </div>
        
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: 24 }}>
          By clicking continue, you agree to our <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Terms of Service</a> and <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
