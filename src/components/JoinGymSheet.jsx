import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

const BASE = import.meta.env.VITE_API_URL || ''

async function authPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`)
  return data
}

export function JoinGymSheet({ open, onClose, onSuccess }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [focused, setFocused] = useState(false)

  const complete = code.trim().length === 6

  useEffect(() => {
    if (!open) { setCode(''); setError(''); setLoading(false); setSuccess(false) }
  }, [open])

  const handleJoin = async () => {
    if (!complete || loading || success) return
    setLoading(true)
    setError('')
    try {
      const data = await authPost('/api/gym/join', { join_code: code.trim().toUpperCase() })
      setSuccess(true)
      setTimeout(() => { onSuccess?.(data.gym_id, data.gym_name); onClose() }, 1000)
    } catch (err) {
      setError(err.message || 'Invalid gym code. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 190,
          background: 'rgba(0,0,0,0.62)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'opacity 0.22s ease',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        paddingBottom: 'calc(36px + env(safe-area-inset-bottom))',
        boxShadow: '0 -2px 20px rgba(0,0,0,0.10)',
        transform: open ? 'translateY(0)' : 'translateY(108%)',
        transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 6 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>
        {/* Header */}
        <div style={{ padding: '10px 24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5, lineHeight: 1.3 }}>Join a Gym</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>Enter your gym's code or scan their QR</div>
        </div>
        {/* Body */}
        <div style={{ padding: '0 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Gym Code
          </div>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Enter 6-digit code"
            maxLength={6}
            style={{
              width: '100%', height: 52, boxSizing: 'border-box',
              background: 'var(--bg-card)',
              border: `1px solid ${error ? 'var(--error)' : focused ? 'var(--text-primary)' : 'var(--border)'}`,
              borderRadius: 12, padding: '0 16px',
              fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
          />
          {error && (
            <div style={{ fontSize: 13, color: 'var(--error)', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
              {error}
            </div>
          )}
          {/* OR divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          {/* QR button */}
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', height: 52, padding: '0 16px',
            background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 12, cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
                <rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
                <rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none"/>
                <rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/>
                <rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/>
              </svg>
              <span style={{ fontSize: 15, color: 'var(--text-primary)' }}>Scan QR Code</span>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          {/* Join button */}
          <button
            onClick={handleJoin}
            disabled={!complete}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', height: 52, marginTop: 20,
              background: success ? 'var(--success)' : 'var(--text-primary)',
              border: 'none', borderRadius: 12,
              opacity: complete ? 1 : 0.4,
              cursor: complete ? 'pointer' : 'default',
              transition: 'opacity 0.2s, background 0.3s',
            }}
          >
            {loading ? (
              <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.25)', borderTopColor: 'var(--bg-card)', borderRadius: '50%', animation: 'gv-spin 0.65s linear infinite' }} />
            ) : success ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bg-card)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--bg-card)' }}>Joined!</span>
              </>
            ) : (
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--bg-card)' }}>Join Gym</span>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes gv-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
