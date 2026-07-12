import { useState } from 'react'
import { X } from 'lucide-react'
import { generateDietPlan } from '../utils/api'

const DIET_TYPES = [
  { value: 'veg', label: 'Veg' },
  { value: 'non_veg', label: 'Non-Veg' },
  { value: 'eggetarian', label: 'Eggetarian' },
]

const CUISINES = [
  { value: 'north_indian', label: 'North Indian' },
  { value: 'south_indian', label: 'South Indian' },
  { value: 'gujarati', label: 'Gujarati' },
  { value: 'punjabi', label: 'Punjabi' },
]

export default function GenerateDietPlanSheet({ onClose, onGenerated, isRegenerate }) {
  const [dietType, setDietType] = useState('non_veg')
  const [cuisinePref, setCuisinePref] = useState('north_indian')
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
      const plan = await generateDietPlan({ dietType, cuisinePref })
      onGenerated(plan)
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
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {isRegenerate ? 'Regenerate Diet Plan' : 'AI Diet Plan'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>7 days of realistic Indian meals, built to your macros.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <span style={sectionLabel}>Diet Type</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DIET_TYPES.map(d => (
              <button key={d.value} style={pillStyle(dietType === d.value)} onClick={() => setDietType(d.value)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <span style={sectionLabel}>Cuisine</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CUISINES.map(c => (
              <button key={c.value} style={pillStyle(cuisinePref === c.value)} onClick={() => setCuisinePref(c.value)}>
                {c.label}
              </button>
            ))}
          </div>
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
          {loading ? 'Building your plan…' : isRegenerate ? 'Regenerate Plan →' : 'Generate Plan →'}
        </button>
      </div>
    </>
  )
}
