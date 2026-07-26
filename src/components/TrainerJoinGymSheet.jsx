import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

const BASE = import.meta.env.VITE_API_URL || ''

async function authReq(method, path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`)
  return data
}

export function TrainerJoinGymSheet({ open, onClose, onSuccess }) {
  const [status, setStatus] = useState(null) // { gym, pending_gym }
  const [statusLoading, setStatusLoading] = useState(true)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const complete = code.trim().length >= 4

  const loadStatus = async () => {
    setStatusLoading(true)
    try {
      const data = await authReq('GET', '/api/trainer/gym-status')
      setStatus(data)
    } catch (e) {
      console.error('load gym status:', e)
      setStatus({ gym: null, pending_gym: null })
    } finally {
      setStatusLoading(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setCode(''); setError(''); setLoading(false); setSuccess(false)
    } else {
      loadStatus()
    }
  }, [open])

  const handleSend = async () => {
    if (!complete || loading || success) return
    setLoading(true)
    setError('')
    try {
      await authReq('POST', '/api/trainer/join-gym', { trainer_join_code: code.trim().toUpperCase() })
      setSuccess(true)
      onSuccess?.()
      setTimeout(loadStatus, 300)
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
        paddingBottom: 36,
        boxShadow: '0 -2px 20px rgba(0,0,0,0.10)',
        transform: open ? 'translateY(0)' : 'translateY(108%)',
        transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 6 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>
        <div style={{ padding: '10px 24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5, lineHeight: 1.3 }}>Join a Gym</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>Enter the gym's trainer code to request to join</div>
        </div>

        <div style={{ padding: '0 24px' }}>
          {statusLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'gv-spin 0.65s linear infinite' }} />
            </div>
          ) : status?.gym ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>
                You're part of {status.gym.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                A trainer can only be affiliated with one gym at a time.
              </div>
            </div>
          ) : status?.pending_gym ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>
                Request sent to {status.pending_gym.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                Waiting for the gym owner to approve.
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                Gym Code
              </div>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10))}
                placeholder="Enter gym code"
                style={{
                  width: '100%', height: 52, boxSizing: 'border-box',
                  background: 'var(--bg-card)',
                  border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '0 16px',
                  fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  outline: 'none',
                }}
              />
              {error && (
                <div style={{ fontSize: 13, color: 'var(--error)', textAlign: 'center', marginTop: 10 }}>{error}</div>
              )}
              <button
                onClick={handleSend}
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
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--bg-card)' }}>Request sent!</span>
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--bg-card)' }}>Send Request</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes gv-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
