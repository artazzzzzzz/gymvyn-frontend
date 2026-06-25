import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EXERCISE_DATABASE } from '../data/exerciseDatabase'
import ExerciseDetailContent, { getToken } from '../components/ExerciseDetailContent'

const API  = import.meta.env.VITE_API_URL || ''

function BookmarkIcon({ filled }) {
  return (
    <svg width="20" height="22" viewBox="0 0 22 26"
      fill={filled ? 'var(--text-primary)' : 'none'}
      stroke={filled ? 'var(--text-primary)' : 'var(--text-tertiary)'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h14a2 2 0 012 2v18l-9-4-9 4V4a2 2 0 012-2z"/>
    </svg>
  )
}

export default function ExerciseDetail() {
  const { name: rawName } = useParams()
  const name     = decodeURIComponent(rawName ?? '')
  const navigate = useNavigate()

  const exercise = EXERCISE_DATABASE.find(e => e.name === name) ?? null

  const [bookmarked, setBookmarked] = useState(false)
  const [bmLoading,  setBmLoading]  = useState(false)
  const [added,      setAdded]      = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await getToken()
      if (!token || cancelled) return
      try {
        const res  = await fetch(`${API}/api/exercises/${encodeURIComponent(name)}/bookmark`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (!cancelled) setBookmarked(json.bookmarked ?? false)
      } catch { /* no auth */ }
    })()
    return () => { cancelled = true }
  }, [name])

  async function toggleBookmark() {
    if (bmLoading) return
    setBmLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const method = bookmarked ? 'DELETE' : 'POST'
      const res  = await fetch(`${API}/api/exercises/${encodeURIComponent(name)}/bookmark`, {
        method, headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setBookmarked(json.bookmarked ?? !bookmarked)
    } finally {
      setBmLoading(false)
    }
  }

  function handleAdd() {
    if (added) return
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-pill)', fontFamily: "'Inter', -apple-system, 'Helvetica Neue', sans-serif",
      WebkitFontSmoothing: 'antialiased', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: "var(--bg-card)", borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', height: 56 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <span style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 12px' }}>
          {exercise?.name ?? name}
        </span>

        <button
          onClick={toggleBookmark}
          disabled={bmLoading}
          style={{ width: 36, height: 36, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <BookmarkIcon filled={bookmarked} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <ExerciseDetailContent name={name} />
      </div>

      {/* CTA */}
      <div style={{ flexShrink: 0, background: "var(--bg-card)", borderTop: '1.5px solid var(--border)', padding: '14px 16px 28px' }}>
        <button
          onClick={handleAdd}
          style={{
            display: 'block', width: '100%', height: 52, borderRadius: 14, border: 'none',
            background: added ? 'var(--success)' : 'var(--text-primary)',
            fontSize: 15, fontWeight: 600, color: "var(--bg-card)",
            cursor: 'pointer', fontFamily: "'Inter', -apple-system, sans-serif", letterSpacing: '-0.01em',
            transition: 'background 0.25s',
          }}
        >
          {added ? '✓  Added to Workout' : 'Add to Workout'}
        </button>
      </div>
    </div>
  )
}
