import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'
import { InviteClientSheet } from './InviteClientSheet'

export function TrainerCodeCard() {
  const { user } = useAuth()
  const [trainerCode, setTrainerCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchCode = async () => {
      setLoading(true)
      setError(false)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/trainer/my-code`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        const data = await res.json()
        if (res.ok) {
          setTrainerCode(data.trainer_code || null)
        } else {
          console.error('TrainerCodeCard fetch error:', data)
          setError(true)
        }
      } catch (e) {
        console.error('TrainerCodeCard load error:', e)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchCode()
  }, [user])

  const displayCode = loading ? '' : (error || !trainerCode) ? '—' : trainerCode

  const copy = () => {
    if (!trainerCode) return
    navigator.clipboard.writeText(trainerCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const share = () => {
    if (!trainerCode) return
    if (navigator.share) {
      navigator.share({
        title: 'Link me as your trainer on Gymvyn',
        text: `Use code ${trainerCode} to link me as your trainer on Gymvyn`,
      }).catch(() => copy())
    } else {
      copy()
    }
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 20 }}>
        <div style={{ width: 140, height: 20, borderRadius: 6, background: 'var(--border)', marginBottom: 6, animation: 'gv-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: 200, height: 14, borderRadius: 4, background: 'var(--bg-pill)', marginBottom: 16, animation: 'gv-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, height: 54, borderRadius: 12, background: 'var(--bg-primary)', animation: 'gv-pulse 1.5s ease-in-out infinite' }} />
          <div style={{ width: 44, height: 54, borderRadius: 10, background: 'var(--bg-pill)', animation: 'gv-pulse 1.5s ease-in-out infinite' }} />
          <div style={{ width: 44, height: 54, borderRadius: 10, background: 'var(--bg-pill)', animation: 'gv-pulse 1.5s ease-in-out infinite' }} />
        </div>
        <style>{`@keyframes gv-pulse { 0%,100%{opacity:.45} 50%{opacity:1} }`}</style>
      </div>
    )
  }

  return (
    <>
      <div style={{ background: 'var(--bg-card)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Your Trainer Code
          </span>
          <button onClick={share} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0, borderRadius: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
        {/* Code pill */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 16, marginBottom: 8 }}>
          <span style={{
            fontSize: 22, fontWeight: 700, color: (error || !trainerCode) ? 'var(--text-tertiary)' : 'var(--text-primary)',
            fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
            letterSpacing: '0.1em',
          }}>
            {displayCode}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.55, marginBottom: 20 }}>
          Share this code with clients to link them to you
        </div>
        {/* QR */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, display: 'inline-flex' }}>
            <QRCodeSVG
              value={trainerCode ? `fitforge:trainer:${trainerCode}` : 'fitforge:trainer'}
              size={112} bgColor="#ffffff" fgColor="#000000"
            />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Scan to link</span>
        </div>
        {/* Copy */}
        <button onClick={copy} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', height: 44, marginBottom: 10,
          background: copied ? '#EAF3DE' : 'var(--border)',
          border: `1px solid ${copied ? 'var(--success)' : 'var(--text-primary)'}`,
          borderRadius: 10, cursor: 'pointer',
          transition: 'background 0.2s, border-color 0.2s',
        }}>
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ fontSize: 14, color: 'var(--success)', fontWeight: 500 }}>Copied!</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Copy Code</span>
            </>
          )}
        </button>
        {/* Invite */}
        <button onClick={() => setShowInvite(true)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', height: 44,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
          <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Invite Client</span>
        </button>
        <style>{`@keyframes gv-pulse { 0%,100%{opacity:.45} 50%{opacity:1} }`}</style>
      </div>

      <InviteClientSheet open={showInvite} onClose={() => setShowInvite(false)} />
    </>
  )
}
