import { useEffect, useState } from 'react'
import { Snowflake } from 'lucide-react'
import { useStreakFreeze } from '../utils/api'
import PrimaryButton from './PrimaryButton'

export default function StreakFreezeSheet({ isOpen, onClose, freezesRemaining = 0, currentStreak = 0, lastActiveDate = null, onUsed }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Compute reset date label (1st of next month)
  const nextResetLabel = (() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + 1)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  })()

  // Streak intact if last_active_date is today or yesterday
  const today = new Date().toISOString().split('T')[0]
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0] })()
  const streakIntact = lastActiveDate === today || lastActiveDate === yesterday

  const disabled = freezesRemaining <= 0 || streakIntact || submitting

  const disabledReason = freezesRemaining <= 0
    ? 'No freezes remaining'
    : streakIntact
      ? 'Your streak is intact — no freeze needed'
      : null

  async function handleUseFreeze() {
    if (disabled) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await useStreakFreeze()
      if (res.success) {
        onUsed?.(res)
        onClose?.()
      } else {
        setError(res.reason || 'Could not use freeze')
      }
    } catch (err) {
      setError(err.message || 'Could not use freeze')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.4)',
          transition: 'opacity 0.3s',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
          background: 'var(--bg-card)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          transition: 'transform 0.3s ease-out',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          paddingBottom: 24,
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>

        <div style={{ padding: '12px 20px 0' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Streak freezes
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
            Protect your streak on rest days. You get 6 each month.
          </p>

          {/* 6 snowflake circles */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const used = i >= freezesRemaining
              return (
                <div
                  key={i}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    background: used ? 'var(--bg-input)' : 'var(--accent-bg)',
                    border: `1px solid ${used ? 'var(--border)' : 'var(--accent)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Snowflake
                    size={16}
                    color={used ? 'var(--border)' : 'var(--accent)'}
                  />
                </div>
              )
            })}
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
            {freezesRemaining} remaining · Resets {nextResetLabel}
          </p>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--error)', textAlign: 'center', marginTop: 8 }}>
              {error}
            </p>
          )}
          {disabledReason && !error && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
              {disabledReason}
            </p>
          )}

          <PrimaryButton
            onClick={handleUseFreeze}
            disabled={disabled}
            style={{ marginTop: 20, fontSize: 15, pointerEvents: disabled ? 'none' : 'auto' }}
          >
            {submitting ? 'Using…' : 'Use a freeze'}
          </PrimaryButton>
        </div>
      </div>
    </>
  )
}
