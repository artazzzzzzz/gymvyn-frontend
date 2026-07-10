import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'

const BASE = import.meta.env.VITE_API_URL || ''

export function GymCodeCard() {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [gymName, setGymName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true)
      setError(false)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${BASE}/api/gym/my-gym-code`, {
          headers: { ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        })
        if (!res.ok) {
          // A failed request (401/403/500) must never fall through to the
          // placeholder literal below — that would show a fake code as if
          // it were real.
          setError(true)
          return
        }
        const d = await res.json()
        setCode(d.join_code || '')
        setGymName(d.gym_name || '')
      } catch (e) {
        console.error('GymCodeCard load error:', e)
        setError(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const share = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join my gym on Gymvyn',
        text: `Use code ${code} to join ${gymName} on Gymvyn`,
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
    <div style={{ background: 'var(--bg-card)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 20 }}>
      {/* Title + subtitle */}
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Member join code</div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>Share with members to link instantly</div>

      {/* Code pill + copy + share + qr */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showQR ? 12 : 0 }}>
        <div style={{ flex: 1, background: 'var(--bg-primary)', borderRadius: 12, padding: 16, minWidth: 0 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: (error || !code) ? 'var(--text-tertiary)' : 'var(--text-primary)', fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace", letterSpacing: '0.1em' }}>
            {error || !code ? '—' : code}
          </span>
        </div>
        <button
          onClick={copy}
          style={{
            width: 44, height: 44, flexShrink: 0,
            background: copied ? '#EAF3DE' : 'var(--bg-card)',
            border: `1px solid ${copied ? 'var(--success)' : 'var(--border)'}`,
            borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s, border-color 0.2s',
          }}
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          )}
        </button>
        <button
          onClick={share}
          style={{
            width: 44, height: 44, flexShrink: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
        </button>
        <button
          onClick={() => setShowQR(v => !v)}
          style={{
            width: 44, height: 44, flexShrink: 0,
            background: showQR ? 'var(--bg-pill)' : 'var(--bg-card)',
            border: `1px solid ${showQR ? '#D0CCBB' : 'var(--border)'}`,
            borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
            <rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
            <rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none"/>
            <rect x="14" y="14" width="3" height="3" fill="currentColor" stroke="none"/>
            <rect x="18" y="14" width="3" height="3" fill="currentColor" stroke="none"/>
            <rect x="14" y="18" width="3" height="3" fill="currentColor" stroke="none"/>
            <rect x="18" y="18" width="3" height="3" fill="currentColor" stroke="none"/>
          </svg>
        </button>
      </div>

      {/* QR panel */}
      {showQR && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 4 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, display: 'inline-flex' }}>
            <QRCodeSVG value={code ? `fitforge:gym:${code}` : 'fitforge:gym'} size={112} bgColor="#ffffff" fgColor="#000000" />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Scan to join</span>
        </div>
      )}

      <style>{`@keyframes gv-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
