import { useEffect, useRef } from 'react'
import ExerciseDetailContent from './ExerciseDetailContent'

export default function ExerciseDetailSheet({ isOpen, exerciseName, onClose }) {
  const scrollRef = useRef(null)

  // Reset scroll when a new exercise opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [isOpen, exerciseName])

  if (!isOpen || !exerciseName) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--bg-pill)',
          borderRadius: '20px 20px 0 0',
          height: '92dvh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sheet header */}
        <div style={{
          flexShrink: 0,
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', height: 56,
          borderRadius: '20px 20px 0 0',
        }}>
          {/* Drag handle */}
          <div style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            width: 36, height: 4, borderRadius: 2, background: 'var(--border)',
          }} />

          <span style={{
            flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: '-0.025em', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}>
            {exerciseName}
          </span>

          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10,
              border: 'none', background: 'var(--bg-pill)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <ExerciseDetailContent name={exerciseName} />
        </div>
      </div>
    </div>
  )
}
