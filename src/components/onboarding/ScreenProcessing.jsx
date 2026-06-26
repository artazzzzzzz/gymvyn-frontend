import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../utils/supabase'
import { calculateMacros } from '../../utils/api'

const MESSAGES = [
  'Setting up your dashboard...',
  'Personalising your plan...',
  'Almost there...',
]

async function saveWithRetry(payload, maxAttempts = 3) {
  let lastErr
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' })
      if (error) throw error
      return
    } catch (err) {
      lastErr = err
      if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 500))
    }
  }
  throw lastErr
}

async function seedProgress(userId, weightKg) {
  if (!weightKg) return
  // Only seed if no entry exists yet
  const { data } = await supabase
    .from('progress_entries')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
  if (data && data.length > 0) return
  await supabase.from('progress_entries').insert({
    user_id: userId,
    weight_kg: parseFloat(weightKg),
    notes: 'Starting weight',
    logged_at: new Date().toISOString(),
  })
}

export default function ScreenProcessing({ answers, onNext }) {
  const { user } = useAuth()
  const [msgIndex, setMsgIndex] = useState(0)
  const [error, setError] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const ranRef = useRef(false)

  async function runSave() {
    setError(null)
    setRetrying(false)
    try {
      const days = parseInt(answers.trainingDays) || 0
      const activity_level =
        days <= 1 ? 'sedentary' :
        days <= 3 ? 'light' :
        days <= 5 ? 'moderate' : 'active'

      const payload = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        goal: answers.goals?.[0] ?? null,
        experience: answers.experience,
        training_days: answers.trainingDays,
        priorities: answers.priorities,
        height: answers.height ? parseFloat(answers.height) : null,
        current_weight: answers.currentWeight ? parseFloat(answers.currentWeight) : null,
        target_weight: answers.targetWeight ? parseFloat(answers.targetWeight) : null,
        age: answers.age ? parseInt(answers.age, 10) : null,
        gender: answers.gender,
        activity_level,
      }
      await saveWithRetry(payload)
      await seedProgress(user.id, answers.currentWeight)

      // Pre-compute and persist macros so the diet page loads them instantly
      try { await calculateMacros(user.id) } catch (_) { /* non-fatal */ }

      onNext()
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    }
  }

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    // Rotating message animation
    let i = 0
    const interval = setInterval(() => {
      i++
      if (i < MESSAGES.length) {
        setMsgIndex(i)
      } else {
        clearInterval(interval)
      }
    }, 600)

    runSave()

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        flex: 1, alignItems: 'center', justifyContent: 'center',
        gap: 20, textAlign: 'center', padding: '0 8px',
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{
            fontSize: 14, color: 'var(--text-secondary)',
            backgroundColor: 'var(--error-bg)',
            padding: '12px 16px', borderRadius: 10,
            border: '1px solid var(--error-bg)',
          }}>
            {error}
          </div>
        </div>
        <button
          onClick={() => { setRetrying(true); runSave() }}
          disabled={retrying}
          style={{
            padding: '14px 32px',
            backgroundColor: 'var(--text-cta)',
            color: 'var(--bg-primary)',
            border: 'none', borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, alignItems: 'center', justifyContent: 'center',
      gap: 28,
    }}>
      {/* CSS-only spinner */}
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--text-cta)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 8,
          border: '2px solid var(--border)',
          borderBottomColor: 'var(--text-secondary)',
          borderRadius: '50%',
          animation: 'spin 1.4s linear infinite reverse',
        }} />
      </div>

      <div style={{ textAlign: 'center', minHeight: 28 }}>
        <p style={{
          fontSize: 16, fontWeight: 600,
          color: 'var(--text-primary)', margin: 0,
          transition: 'opacity 0.3s',
        }}>
          {MESSAGES[msgIndex]}
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
