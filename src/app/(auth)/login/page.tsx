'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const t = useT()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'var(--s1)',
        borderRadius: 12,
        border: '1px solid var(--s4)',
        padding: 40,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48,
            background: 'var(--accent)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700, fontSize: 22,
            color: '#fff',
            fontFamily: 'IBM Plex Mono, monospace',
            margin: '0 auto 12px',
          }}>F</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Finova</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Personal Finance Management</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px',
                backgroundColor: 'var(--s2)',
                border: '1px solid var(--s4)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)', fontSize: 14, outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 14px',
                  paddingInlineEnd: '44px', // room for the toggle
                  backgroundColor: 'var(--s2)',
                  border: '1px solid var(--s4)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text)', fontSize: 14, outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  insetInlineEnd: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '18px',
                  padding: '4px',
                  lineHeight: 1,
                }}
                aria-label={showPassword ? t('إخفاء كلمة السر') : t('إظهار كلمة السر')}
                title={showPassword ? t('إخفاء كلمة السر') : t('إظهار كلمة السر')}
                aria-pressed={showPassword}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              backgroundColor: 'var(--accent)',
              color: '#fff', border: 'none',
              borderRadius: 'var(--radius)',
              fontWeight: 600, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
