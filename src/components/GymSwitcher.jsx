import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveGym } from '../contexts/ActiveGymContext'

// Slim gym-context strip at the top of every owner screen.
// Null for ≤1 gym (no visual change for the vast majority of owners).
// For 2+ gyms: a compact bar showing the active gym name + chevron,
// expanding to an inline dropdown. For needsGymSelection: a card prompt.
// Visual language: --bg-card / 0.5px border-bottom / CSS vars only.
export default function GymSwitcher() {
  const { gyms, activeGym, activeGymId, loading, needsGymSelection, setActiveGym } = useActiveGym()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close dropdown on outside click/tap
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [open])

  // Loading skeleton — AppLoader gates this component in practice, but kept
  // for correctness in case rendering races ahead of context resolution.
  if (loading) {
    return (
      <>
        <style>{`@keyframes sw-skel{from{opacity:.4}to{opacity:1}}`}</style>
        <div style={{
          background: 'var(--bg-card)',
          borderBottom: '0.5px solid rgba(0,0,0,0.08)',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--bg-pill)', animation: 'sw-skel 1.2s ease infinite alternate', flexShrink: 0 }} />
          <div style={{ width: 110, height: 13, borderRadius: 4, background: 'var(--bg-pill)', animation: 'sw-skel 1.2s ease infinite alternate 0.1s' }} />
        </div>
      </>
    )
  }

  // Single gym: render nothing — no visual regression.
  if (gyms.length <= 1) return null

  // No active gym resolved and multiple gyms exist — prompt the owner to pick.
  if (needsGymSelection) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        padding: '14px 16px 18px',
      }}>
        <p style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px',
        }}>
          Select gym to continue
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gyms.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGym(g.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px',
                background: 'var(--bg-pill)',
                border: 'none', borderRadius: 10,
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <BuildingIcon stroke="var(--text-secondary)" />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {g.name}
              </span>
              <ChevronRightIcon />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Normal multi-gym strip: shows active gym + chevron, expands inline list.
  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 50 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'var(--bg-card)',
          border: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
          padding: '9px 16px', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <BuildingIcon stroke="var(--text-secondary)" />
        <span style={{
          flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {activeGym?.name || 'Your Gym'}
        </span>
        <ChevronIcon rotated={open} />
      </button>

      {/* Inline dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Select gym"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 51,
            background: 'var(--bg-card)',
            borderBottom: '0.5px solid rgba(0,0,0,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
          }}
        >
          {gyms.map((g, i) => {
            const active = g.id === activeGymId
            return (
              <button
                key={g.id}
                role="option"
                aria-selected={active}
                onClick={() => { setActiveGym(g.id); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', textAlign: 'left',
                  background: active ? 'var(--bg-pill)' : 'transparent',
                  border: 'none',
                  borderBottom: i < gyms.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                  padding: '12px 16px', cursor: 'pointer',
                }}
              >
                <span style={{
                  flex: 1, fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: 'var(--text-primary)',
                }}>
                  {g.name}
                </span>
                {active && <CheckIcon />}
              </button>
            )
          })}
          {/* Add another gym — separator + action row */}
          <button
            onClick={() => { setOpen(false); navigate('/gym-onboarding?mode=add') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', textAlign: 'left',
              background: 'transparent', border: 'none',
              borderTop: '0.5px solid rgba(0,0,0,0.08)',
              padding: '12px 16px', cursor: 'pointer',
            }}
          >
            <PlusIcon />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
              Add another gym
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── SVG icons — inline to keep the file self-contained ───────────────────────

function BuildingIcon({ stroke }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stroke}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <rect x="3" y="9" width="13" height="13" rx="1" />
      <path d="M8 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
      <line x1="21" y1="9" x2="8" y2="9" />
    </svg>
  )
}

function ChevronIcon({ rotated }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="var(--text-tertiary)" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, transition: 'transform 0.2s', transform: rotated ? 'rotate(180deg)' : 'rotate(0)' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="var(--text-tertiary)" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="var(--success)" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="var(--text-secondary)" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
