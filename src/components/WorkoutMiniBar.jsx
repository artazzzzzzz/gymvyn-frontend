import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronUp, Trash2 } from 'lucide-react'
import { useWorkoutSessionContext } from '../contexts/WorkoutSessionContext'
import { useXPToast } from './XPToast'

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

export default function WorkoutMiniBar() {
  const navigate = useNavigate()
  const { showXPToast } = useXPToast()
  const { isActive, elapsedSeconds, exercises, finishSession } = useWorkoutSessionContext()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!isActive) return null

  const currentExercise = exercises[0]?.exerciseName ?? ''

  async function handleConfirmEnd() {
    setSaving(true)
    const summary = await finishSession()
    setSaving(false)
    setConfirmOpen(false)
    if (summary) {
      if (summary.xpResult) showXPToast(summary.xpResult)
      navigate(`/workout/summary/${summary.workoutId}`, {
        state: { summary },
        replace: false,
      })
    }
  }

  return (
    <>
      {/* Mini bar */}
      <div style={{
        width: '100%',
        height: 64,
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        flexShrink: 0,
      }}>
        {/* Left: chevron up — navigate to live session */}
        <button
          onClick={() => navigate('/workout/live')}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--bg-hover)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ChevronUp size={20} color="var(--text-primary)" />
        </button>

        {/* Center: timer + exercise name */}
        <button
          onClick={() => navigate('/workout/live')}
          style={{
            flex: 1, background: 'none', border: 'none',
            cursor: 'pointer', textAlign: 'left', padding: '0 4px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#4CAF50', flexShrink: 0,
            }} />
            <span style={{
              fontSize: 15, fontWeight: 600,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              Workout {formatElapsed(elapsedSeconds)}
            </span>
          </div>
          {currentExercise ? (
            <div style={{
              fontSize: 13, color: 'var(--text-secondary)',
              marginTop: 1, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {currentExercise}
            </div>
          ) : null}
        </button>

        {/* Right: trash */}
        <button
          onClick={() => setConfirmOpen(true)}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--bg-hover)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Trash2 size={18} color="var(--error)" />
        </button>
      </div>

      {/* Confirm dialog */}
      {confirmOpen && (
        <div
          onClick={() => setConfirmOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: 'var(--bg-card)',
              borderRadius: '20px 20px 0 0',
              padding: '32px 24px 40px',
            }}
          >
            <h2 style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--text-primary)', textAlign: 'center', margin: '0 0 8px',
            }}>
              End workout?
            </h2>
            <p style={{
              fontSize: 14, color: 'var(--text-secondary)',
              textAlign: 'center', margin: '0 0 28px', lineHeight: 1.5,
            }}>
              Your progress will be saved.
            </p>
            <button
              onClick={handleConfirmEnd}
              disabled={saving}
              style={{
                width: '100%', padding: 14, borderRadius: 12,
                background: 'var(--error)', color: 'white',
                fontWeight: 600, fontSize: 15, border: 'none',
                marginBottom: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'End Workout'}
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              style={{
                width: '100%', padding: 14, borderRadius: 12,
                background: 'var(--border)', color: 'var(--text-primary)',
                fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer',
              }}
            >
              Keep Going
            </button>
          </div>
        </div>
      )}
    </>
  )
}
