import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../utils/supabase'

export default function LogStatsSheet({ user, onClose, onSave }) {
  const [weight, setWeight]         = useState('')
  const [bodyFat, setBodyFat]       = useState('')
  const [muscleMass, setMuscleMass] = useState('')
  const [notes, setNotes]           = useState('')
  const [logDate, setLogDate]       = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  async function handleSave() {
    if (!weight && !bodyFat && !muscleMass) {
      setError('Enter at least one value')
      return
    }
    setSaving(true)
    setError('')

    // For today: use actual current time so multiple same-day logs plot at
    // distinct X positions on the graph. For past dates: use noon to avoid
    // midnight UTC ambiguity (new Date("YYYY-MM-DD") is always midnight UTC).
    const todayStr = new Date().toISOString().split('T')[0]
    const logged_at = logDate === todayStr
      ? new Date().toISOString()
      : new Date(`${logDate}T12:00:00`).toISOString()

    const { error: dbError } = await supabase
      .from('progress_entries')
      .insert({
        user_id:     user.id,
        weight_kg:   weight     ? parseFloat(weight)     : null,
        body_fat:    bodyFat    ? parseFloat(bodyFat)    : null,
        muscle_mass: muscleMass ? parseFloat(muscleMass) : null,
        notes:       notes || null,
        logged_at,
      })

    // Keep users.current_weight in sync so dashboard/profile reflect latest weight
    if (!dbError && weight) {
      await supabase
        .from('users')
        .update({ current_weight: parseFloat(weight) })
        .eq('id', user.id)
    }

    setSaving(false)

    if (dbError) {
      console.error('Log error:', dbError)
      setError('Failed to save. Try again.')
      return
    }

    onSave()
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid var(--border)',
    fontSize: 16,
    color: 'var(--text-primary)',
    background: 'var(--bg-elevated)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 6,
    display: 'block',
  }

  const fieldStyle = { display: 'flex', flexDirection: 'column' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        maxHeight: '90vh',
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          borderBottom: '1px solid var(--border)',
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Log Body Stats</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="var(--text-tertiary)" />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Date */}
            <div style={fieldStyle}>
              <span style={labelStyle}>Date</span>
              <input
                type="date"
                value={logDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setLogDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Weight */}
            <div style={fieldStyle}>
              <span style={labelStyle}>Weight (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Body Fat */}
            <div style={fieldStyle}>
              <span style={labelStyle}>Body Fat (%)</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                value={bodyFat}
                onChange={e => setBodyFat(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Muscle Mass */}
            <div style={fieldStyle}>
              <span style={labelStyle}>Muscle Mass (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                value={muscleMass}
                onChange={e => setMuscleMass(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Notes */}
            <div style={fieldStyle}>
              <span style={labelStyle}>Notes (optional)</span>
              <textarea
                placeholder="e.g. morning weigh-in, post-workout…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
            </div>

            {/* Error */}
            {error && (
              <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{error}</p>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: 14,
                background: saving ? 'var(--border)' : 'var(--text-primary)',
                color: saving ? 'var(--text-tertiary)' : 'var(--bg-primary)',
                border: 'none',
                fontSize: 16,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {saving && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
              {saving ? 'Saving…' : 'Save Entry'}
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
