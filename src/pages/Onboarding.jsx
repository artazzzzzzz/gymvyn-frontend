import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

const TOTAL_STEPS = 5

// ── Shared card ───────────────────────────────────────────────────────────────
function OptionCard({ icon, label, sublabel, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex flex-col gap-3 p-5 rounded-2xl border text-left',
        'cursor-pointer select-none transition-all duration-150 active:scale-[0.98]',
        selected
          ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/40 shadow-emerald-500/10 shadow-lg'
          : 'bg-[#141416] border-white/[0.08] hover:border-white/25 hover:bg-white/[0.03]',
      ].join(' ')}
    >
      {selected && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      <span className="text-2xl leading-none">{icon}</span>
      <div>
        <p className={`text-sm font-semibold leading-snug ${selected ? 'text-emerald-300' : 'text-zinc-200'}`}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{sublabel}</p>
        )}
      </div>
    </button>
  )
}

// ── Steps ─────────────────────────────────────────────────────────────────────
function StepGoal({ value, onChange }) {
  const options = [
    { value: 'bulk',     icon: '💪', label: 'Bulk',                 sublabel: 'Build size & strength' },
    { value: 'cut',      icon: '🔥', label: 'Cut',                  sublabel: 'Lose fat, keep muscle' },
    { value: 'maintain', icon: '⚖️', label: 'Maintain',             sublabel: 'Stay fit & healthy' },
    { value: 'athletic', icon: '⚡', label: 'Athletic Performance', sublabel: 'Speed, power & endurance' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map(o => (
        <OptionCard key={o.value} {...o} selected={value === o.value} onClick={() => onChange(o.value)} />
      ))}
    </div>
  )
}

function StepExperience({ value, onChange }) {
  const options = [
    { value: 'beginner',     icon: '🌱', label: 'Beginner',     sublabel: 'Less than 1 year training' },
    { value: 'intermediate', icon: '📈', label: 'Intermediate', sublabel: '1–3 years training' },
    { value: 'advanced',     icon: '🏆', label: 'Advanced',     sublabel: '3+ years training' },
  ]
  return (
    <div className="flex flex-col gap-3">
      {options.map(o => (
        <OptionCard key={o.value} {...o} selected={value === o.value} onClick={() => onChange(o.value)} />
      ))}
    </div>
  )
}

function StepEquipment({ value, onChange }) {
  const options = [
    { value: 'full_gym',    icon: '🏋️', label: 'Full Gym',          sublabel: 'Barbells, cables, machines & more' },
    { value: 'dumbbells',   icon: '🏃', label: 'Dumbbells Only',    sublabel: 'Free weights at home or small gym' },
    { value: 'bodyweight',  icon: '🤸', label: 'Bodyweight Only',   sublabel: 'No equipment needed' },
  ]
  return (
    <div className="flex flex-col gap-3">
      {options.map(o => (
        <OptionCard key={o.value} {...o} selected={value === o.value} onClick={() => onChange(o.value)} />
      ))}
    </div>
  )
}

function StepBodyStats({ value, onChange }) {
  const numFields = [
    { key: 'current_weight', label: 'Current weight', placeholder: '75',  unit: 'kg' },
    { key: 'target_weight',  label: 'Target weight',  placeholder: '80',  unit: 'kg' },
    { key: 'height',         label: 'Height',         placeholder: '178', unit: 'cm' },
    { key: 'age',            label: 'Age',            placeholder: '25',  unit: 'yrs' },
  ]
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Full name</label>
        <input
          type="text"
          value={value.full_name}
          onChange={e => onChange({ ...value, full_name: e.target.value })}
          placeholder="Your name"
          className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {numFields.map(({ key, label, placeholder, unit }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={value[key]}
                onChange={e => onChange({ ...value, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-medium pointer-events-none">
                {unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepSchedule({ value, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-zinc-300 mb-3">Days per week</p>
        <div className="grid grid-cols-4 gap-3">
          {[3, 4, 5, 6].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => onChange({ ...value, training_days: d })}
              className={[
                'py-4 rounded-xl border text-sm font-bold cursor-pointer',
                'transition-all duration-150 active:scale-[0.97]',
                value.training_days === d
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-[#141416] border-white/[0.08] text-zinc-400 hover:border-white/25 hover:text-white',
              ].join(' ')}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-600 mt-2">days / week</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Injuries or limitations
          <span className="text-zinc-600 font-normal ml-1">(optional)</span>
        </label>
        <textarea
          value={value.injuries}
          onChange={e => onChange({ ...value, injuries: e.target.value })}
          placeholder="e.g. Bad lower back, left knee pain..."
          rows={3}
          className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none"
        />
      </div>
    </div>
  )
}

// ── Step metadata ─────────────────────────────────────────────────────────────
const STEPS = [
  { title: "What's your main goal?",       subtitle: "We'll tailor everything around this." },
  { title: 'Your experience level?',       subtitle: 'Honest answers lead to better results.' },
  { title: 'What equipment do you have?',  subtitle: "We'll only programme exercises you can do." },
  { title: 'Your body stats',              subtitle: 'Used to calculate your targets. You can update these later.' },
  { title: 'Your schedule',               subtitle: "Consistency beats perfection — pick what you can stick to." },
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const { user, setOnboardingComplete } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    goal: '',
    experience: '',
    equipment: '',
    full_name: '',
    current_weight: '',
    target_weight: '',
    height: '',
    age: '',
    training_days: null,
    injuries: '',
  })

  function isStepValid() {
    switch (step) {
      case 1: return !!form.goal
      case 2: return !!form.experience
      case 3: return !!form.equipment
      case 4: return !!(form.full_name && form.current_weight && form.target_weight && form.height && form.age)
      case 5: return !!form.training_days
      default: return false
    }
  }

  function update(patch) {
    setError('')
    setForm(f => ({ ...f, ...patch }))
  }

  async function handleNext() {
    if (!isStepValid()) {
      setError(step === 4 ? 'Please fill in all fields.' : 'Please select an option.')
      return
    }

    setError('')

    if (step < TOTAL_STEPS) {
      setStep(s => s + 1)
      return
    }

    // Step 5 — save and redirect
    setSaving(true)
    const { error: dbError } = await supabase.from('users').upsert({
      id: user.id,
      full_name: form.full_name,
      goal: form.goal,
      experience: form.experience,
      equipment: form.equipment,
      current_weight: Number(form.current_weight),
      height: Number(form.height),
      age: Number(form.age),
      target_weight: Number(form.target_weight),
      training_days: form.training_days,
      injuries: form.injuries || null,
    })
    setSaving(false)

    if (dbError) {
      console.error('Onboarding save error:', dbError)
      setError(dbError.message || 'Failed to save your profile. Please try again.')
      return
    }

    setOnboardingComplete(true)
    navigate('/home')
  }

  const meta = STEPS[step - 1]
  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen bg-[#0c0c0e] flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 pt-8 pb-0 shrink-0">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              FitForge <span className="text-emerald-400">AI</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500 tabular-nums shrink-0">{step} / {TOTAL_STEPS}</span>
          </div>

          {/* Step segments */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${
                  i < step ? 'bg-emerald-500' : 'bg-white/[0.06]'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 px-6 py-8 overflow-y-auto">
        <div className="max-w-lg mx-auto flex flex-col min-h-full">
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white mb-1">{meta.title}</h1>
            <p className="text-zinc-400 text-sm">{meta.subtitle}</p>
          </div>

          {/* Step content */}
          <div>
            {step === 1 && (
              <StepGoal
                value={form.goal}
                onChange={v => update({ goal: v })}
              />
            )}
            {step === 2 && (
              <StepExperience
                value={form.experience}
                onChange={v => update({ experience: v })}
              />
            )}
            {step === 3 && (
              <StepEquipment
                value={form.equipment}
                onChange={v => update({ equipment: v })}
              />
            )}
            {step === 4 && (
              <StepBodyStats
                value={form}
                onChange={patch => { setError(''); setForm(patch) }}
              />
            )}
            {step === 5 && (
              <StepSchedule
                value={form}
                onChange={patch => { setError(''); setForm(patch) }}
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8 pb-4">
            {step > 1 && (
              <button
                type="button"
                onClick={() => { setError(''); setStep(s => s - 1) }}
                className="px-6 py-3 rounded-xl border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/25 text-sm font-medium transition-all duration-150 cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all duration-150 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : step === TOTAL_STEPS ? (
                'Finish & go to dashboard'
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
