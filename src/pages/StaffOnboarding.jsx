import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_URL || 'https://fitforge-backend-production.up.railway.app'

export default function StaffOnboarding() {
  const { user, markOnboardingComplete } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim() || loading) return
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await import('../utils/supabase').then(m => m.supabase.auth.getSession())
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(`${API}/api/staff/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ staffCode: code.trim().toUpperCase() }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to join gym')

      localStorage.setItem(`gv_role_${user?.id}`, 'staff')
      markOnboardingComplete()
      navigate('/staff/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '0 20px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ paddingTop: 56, paddingBottom: 40 }}>
        <div style={{
          width: 44, height: 44, backgroundColor: 'var(--bg-card)',
          borderRadius: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginBottom: 24,
          border: '1px solid var(--border)',
        }}>
          <span style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 900, letterSpacing: '-0.5px' }}>GV</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.15 }}>
          Join your gym
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.5 }}>
          Enter the 6-character staff code your gym owner gave you.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. AB12CD"
          maxLength={6}
          autoFocus
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 8,
            textAlign: 'center',
            border: '1.5px solid var(--border-strong)',
            borderRadius: 12,
            padding: '18px 12px',
            outline: 'none',
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
          }}
        />

        {error && (
          <div style={{
            backgroundColor: 'var(--error-bg)',
            border: '1px solid var(--error)',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 14,
            color: 'var(--error)',
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={code.length < 6 || loading}
          style={{
            backgroundColor: 'var(--cta-bg)',
            color: 'var(--cta-text)',
            border: '1px solid var(--cta-border)',
            borderRadius: 12,
            padding: '16px',
            fontSize: 16,
            fontWeight: 600,
            cursor: code.length < 6 || loading ? 'default' : 'pointer',
            opacity: code.length < 6 || loading ? 0.45 : 1,
            transition: 'opacity 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading ? (
            <div style={{
              width: 18, height: 18,
              border: '2px solid white',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
          ) : 'Join Gym'}
        </button>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
