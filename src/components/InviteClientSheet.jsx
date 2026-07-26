import { useState, useRef, useEffect } from 'react'
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

export function InviteClientSheet({ open, onClose }) {
  const [val, setVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [clientName, setClientName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setVal(''); setLoading(false); setSuccess(false); setError(''); setClientName('')
    } else {
      setTimeout(() => inputRef.current?.focus(), 320)
    }
  }, [open])

  const send = async () => {
    if (!val.trim() || loading) return
    setError('')
    setLoading(true)
    try {
      const data = await authPost('/api/trainer/invite', { identifier: val.trim() })
      setClientName(data.client_name || val.trim())
      setSuccess(true)
      setTimeout(onClose, 1600)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 290,
          background: 'rgba(0,0,0,0.62)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'opacity 0.22s ease',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
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
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5 }}>Invite a Client</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Enter their phone number or email</div>
        </div>
        <div style={{ padding: '0 24px' }}>
          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '16px 0 4px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-bg)', border: '1.5px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Invite sent!</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{clientName}</div>
              </div>
            </div>
          ) : (
            <>
              <input
                ref={inputRef}
                value={val}
                onChange={e => { setVal(e.target.value); if (error) setError('') }}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Phone number or email"
                style={{
                  display: 'block', width: '100%', height: 52,
                  background: 'var(--bg-card)',
                  border: `1.5px solid ${error ? 'var(--error)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '0 16px',
                  fontSize: 15, color: 'var(--text-primary)', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { if (!error) e.target.style.borderColor = 'var(--text-primary)' }}
                onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border)' }}
              />
              {error && <div style={{ fontSize: 13, color: 'var(--error)', marginTop: 8 }}>{error}</div>}
              <button
                onClick={send}
                disabled={!val.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: 52, marginTop: 12,
                  background: 'var(--text-primary)', border: 'none', borderRadius: 12,
                  opacity: val.trim() ? 1 : 0.38,
                  cursor: val.trim() ? 'pointer' : 'default',
                  transition: 'opacity 0.2s',
                }}
              >
                {loading
                  ? <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.25)', borderTopColor: 'var(--bg-card)', borderRadius: '50%', animation: 'gv-spin 0.65s linear infinite' }} />
                  : <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--bg-card)' }}>Send Invite</span>
                }
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes gv-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
