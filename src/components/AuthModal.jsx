import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthModal({ onClose }) {
  const { signIn, signUp, isConfigured } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  if (!isConfigured) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={e => e.stopPropagation()}>
          <h2 style={styles.title}>AUTH NOT CONFIGURED</h2>
          <p style={styles.text}>
            Supabase is not configured. Add your credentials to .env file:
          </p>
          <pre style={styles.code}>
            VITE_SUPABASE_URL=your_url{'\n'}
            VITE_SUPABASE_ANON_KEY=your_key
          </pre>
          <button style={styles.primaryBtn} onClick={onClose}>GOT IT</button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')
    setSuccess('')

    // Validate fields before submitting
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        if (!username.trim()) {
          setError('Username is required')
          setLoading(false)
          return
        }
        const result = await signUp(email, password, username)
        if (result?.error) {
          setError(result.error.message || 'Sign up failed')
        } else {
          setSuccess('Check your email to confirm your account!')
        }
      } else {
        const result = await signIn(email, password)
        if (result?.error) {
          setError(result.error.message || 'Sign in failed')
        } else {
          onClose()
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err.message || 'An unexpected error occurred')
    }
    setLoading(false)
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>×</button>

        <h2 style={styles.title}>
          {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
        </h2>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="USERNAME"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={styles.input}
              autoComplete="username"
            />
          )}

          <input
            type="email"
            placeholder="EMAIL"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
            autoComplete="email"
            required
          />

          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
          />

          <button
            type="submit"
            style={styles.primaryBtn}
            disabled={loading}
          >
            {loading ? 'LOADING...' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>OR</span>
        </div>

        <button
          style={styles.secondaryBtn}
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setSuccess('')
          }}
        >
          {mode === 'signin' ? 'CREATE NEW ACCOUNT' : 'SIGN IN INSTEAD'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--outline-variant)',
    borderRadius: '4px',
    padding: '48px',
    width: '100%',
    maxWidth: '400px',
    position: 'relative'
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    color: 'var(--on-surface-variant)',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 32px 0',
    color: 'var(--on-surface)',
    textTransform: 'uppercase',
    letterSpacing: '-0.02em'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  input: {
    backgroundColor: 'var(--surface-container)',
    border: '1px solid var(--outline-variant)',
    color: 'var(--on-surface)',
    padding: '14px 16px',
    borderRadius: '4px',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    transition: 'border-color 0.2s'
  },
  primaryBtn: {
    backgroundColor: 'var(--primary)',
    color: 'var(--on-primary)',
    border: 'none',
    padding: '14px 24px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'var(--font-heading)',
    fontWeight: 700,
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '8px'
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: 'var(--primary)',
    border: '1px solid var(--outline-variant)',
    padding: '14px 24px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    width: '100%'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
    gap: '16px'
  },
  dividerText: {
    color: 'var(--on-surface-variant)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    flex: '0 0 auto'
  },
  error: {
    backgroundColor: 'rgba(255,100,100,0.1)',
    border: '1px solid rgba(255,100,100,0.3)',
    color: '#ff6b6b',
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    fontFamily: 'var(--font-body)'
  },
  success: {
    backgroundColor: 'rgba(100,255,100,0.1)',
    border: '1px solid rgba(100,255,100,0.3)',
    color: '#6bff6b',
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    fontFamily: 'var(--font-body)'
  },
  text: {
    color: 'var(--on-surface-variant)',
    fontSize: '14px',
    lineHeight: 1.6,
    marginBottom: '16px'
  },
  code: {
    backgroundColor: 'var(--surface-container)',
    padding: '16px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--primary)',
    marginBottom: '24px',
    overflow: 'auto'
  }
}
