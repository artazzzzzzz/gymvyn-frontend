import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { getAvatarColor, getInitials } from '../utils/avatarColor'

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

export function JoinTrainerSheet({ open, onClose, onSuccess }) {
  const [tab, setTab] = useState('code')
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [codeSuccess, setCodeSuccess] = useState(false)
  const [codeFocused, setCodeFocused] = useState(false)

  const [invites, setInvites] = useState([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [dismissedIds, setDismissedIds] = useState([])

  const complete = code.trim().length === 6

  const loadInvites = useCallback(async () => {
    setInvitesLoading(true)
    try {
      const data = await authReq('GET', '/api/trainer/pending-invites')
      setInvites(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('load pending invites:', e)
      setInvites([])
    } finally {
      setInvitesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setTab('code'); setCode(''); setCodeError(''); setCodeLoading(false); setCodeSuccess(false)
      setDismissedIds([])
    } else {
      loadInvites()
    }
  }, [open, loadInvites])

  const handleLink = async () => {
    if (!complete || codeLoading || codeSuccess) return
    setCodeLoading(true)
    setCodeError('')
    try {
      await authReq('POST', '/api/trainer/join', { trainer_code: code.trim().toUpperCase() })
      setCodeSuccess(true)
      setTimeout(() => { onSuccess?.(); onClose() }, 1000)
    } catch (err) {
      setCodeError(err.message || 'Invalid trainer code. Please check and try again.')
    } finally {
      setCodeLoading(false)
    }
  }

  const handleAccept = async (invite) => {
    setDismissedIds(ids => [...ids, invite.id])
    try {
      await authReq('PATCH', `/api/trainer/accept-invite/${invite.id}`)
      onSuccess?.()
    } catch (e) {
      console.error('accept invite:', e)
      setDismissedIds(ids => ids.filter(id => id !== invite.id))
    }
  }

  const handleDecline = async (invite) => {
    setDismissedIds(ids => [...ids, invite.id])
    try {
      await authReq('DELETE', `/api/trainer/decline-invite/${invite.id}`)
    } catch (e) {
      console.error('decline invite:', e)
      setDismissedIds(ids => ids.filter(id => id !== invite.id))
    }
  }

  const visibleInvites = invites.filter(inv => !dismissedIds.includes(inv.id))

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
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5, lineHeight: 1.3 }}>Link a Trainer</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>Enter your trainer's code or wait for their invite</div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-pill)', borderRadius: 8, padding: 4, margin: '0 24px 20px' }}>
          {[
            { id: 'code', label: 'Enter Code' },
            { id: 'invites', label: visibleInvites.length ? `Pending (${visibleInvites.length})` : 'Pending Invites' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, height: 36, border: 'none',
                background: tab === t.id ? 'var(--bg-card)' : 'transparent',
                borderRadius: 6,
                fontSize: 13, fontWeight: 600,
                color: tab === t.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* Content */}
        <div style={{ padding: '0 24px' }}>
          {tab === 'code' ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                Trainer Code
              </div>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))}
                onFocus={() => setCodeFocused(true)}
                onBlur={() => setCodeFocused(false)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                style={{
                  width: '100%', height: 52, boxSizing: 'border-box',
                  background: 'var(--bg-card)',
                  border: `1px solid ${codeError ? 'var(--error)' : codeFocused ? 'var(--text-primary)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '0 16px',
                  fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
              />
              {codeError && (
                <div style={{ fontSize: 13, color: 'var(--error)', textAlign: 'center', marginTop: 10 }}>{codeError}</div>
              )}
              <button
                onClick={handleLink}
                disabled={!complete}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', height: 52, marginTop: 20,
                  background: codeSuccess ? 'var(--success)' : 'var(--text-primary)',
                  border: 'none', borderRadius: 12,
                  opacity: complete ? 1 : 0.4,
                  cursor: complete ? 'pointer' : 'default',
                  transition: 'opacity 0.2s, background 0.3s',
                }}
              >
                {codeLoading ? (
                  <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.25)', borderTopColor: 'var(--bg-card)', borderRadius: '50%', animation: 'gv-spin 0.65s linear infinite' }} />
                ) : codeSuccess ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bg-card)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--bg-card)' }}>Linked!</span>
                  </>
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--bg-card)' }}>Link Trainer</span>
                )}
              </button>
            </>
          ) : invitesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'gv-spin 0.65s linear infinite' }} />
            </div>
          ) : visibleInvites.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--bg-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No pending invites</div>
            </div>
          ) : (
            <div>
              {visibleInvites.map(inv => {
                const { bg, text } = getAvatarColor(inv.trainer_name)
                const initials = getInitials(inv.trainer_name)
                return (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{initials}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.trainer_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Trainer invite</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => handleDecline(inv)} style={{ height: 30, padding: '0 12px', background: 'var(--bg-pill)', border: '1px solid var(--bg-pill)', borderRadius: 20, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                        Decline
                      </button>
                      <button onClick={() => handleAccept(inv)} style={{ height: 30, padding: '0 14px', background: 'var(--success-bg)', border: '1px solid var(--success-bg)', borderRadius: 20, color: 'var(--success)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Accept
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes gv-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
