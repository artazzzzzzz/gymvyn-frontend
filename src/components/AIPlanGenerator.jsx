import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { supabase } from '../utils/supabase'

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const GOALS = [
  { value: 'build muscle', label: 'Build Muscle' },
  { value: 'lose fat', label: 'Lose Fat' },
  { value: 'improve strength', label: 'Strength' },
  { value: 'general fitness', label: 'General Fitness' },
]

const EXPERIENCE = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const DAYS = [3, 4, 5, 6]

export default function AIPlanGenerator({ onClose }) {
  const navigate = useNavigate()
  const [goal, setGoal] = useState('build muscle')
  const [experience, setExperience] = useState('intermediate')
  const [trainingDays, setTrainingDays] = useState(4)
  const [preferences, setPreferences] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pillStyle = (active) => ({
    padding: '8px 16px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--text-primary)' : 'var(--bg-pill)',
    color: active ? 'var(--bg-card)' : 'var(--text-secondary)',
    flexShrink: 0,
  })

  const sectionLabel = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-tertiary)',
    marginBottom: 10,
    display: 'block',
  }

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${BASE_URL}/api/ai/workout/generate-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ goal, experience, trainingDays, preferences }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      navigate('/workout/plans/new', { state: { aiPlan: data.plan } })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to generate plan. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
        padding: '20px 20px 48px', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>AI Plan Builder</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>Answer 3 questions. Get a full plan.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <span style={sectionLabel}>Goal</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {GOALS.map(g => (
              <button key={g.value} style={pillStyle(goal === g.value)} onClick={() => setGoal(g.value)}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <span style={sectionLabel}>Experience</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {EXPERIENCE.map(e => (
              <button key={e.value} style={pillStyle(experience === e.value)} onClick={() => setExperience(e.value)}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <span style={sectionLabel}>Days per week</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {DAYS.map(d => (
              <button key={d} style={pillStyle(trainingDays === d)} onClick={() => setTrainingDays(d)}>
                {d} days
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <span style={sectionLabel}>Anything else? (optional)</span>
          <textarea
            value={preferences}
            onChange={e => setPreferences(e.target.value)}
            placeholder="e.g. no barbell, focus on hypertrophy, bad knees..."
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-primary)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 12px',
              color: 'var(--text-primary)', fontSize: 14,
              resize: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 13, color: 'var(--error, #FF3B30)', marginBottom: 12, textAlign: 'center' }}>{error}</div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 14,
            background: loading ? 'var(--bg-pill)' : 'var(--text-primary)',
            color: 'var(--bg-card)', fontSize: 15, fontWeight: 600,
            border: 'none', cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Building your plan…' : 'Generate Plan →'}
        </button>
      </div>
    </>
  )
}
