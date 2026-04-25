import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  Apple, Loader2, Zap, AlertCircle, ChevronDown, RefreshCw,
  Utensils, Clock, Flame,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import BottomNav from '../components/BottomNav'

const API = import.meta.env.VITE_BACKEND_URL

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',   label: 'Sedentary',       sublabel: 'Little or no exercise' },
  { value: 'light',       label: 'Lightly Active',  sublabel: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderate',         sublabel: '3–5 days/week' },
  { value: 'active',      label: 'Very Active',      sublabel: '6–7 days/week' },
  { value: 'very_active', label: 'Extremely Active', sublabel: 'Physical job + training' },
]

const GOAL_OPTIONS = [
  { value: 'lose',     label: 'Lose Weight',   sublabel: '-300 kcal deficit' },
  { value: 'maintain', label: 'Maintain',       sublabel: 'Eat at TDEE' },
  { value: 'gain',     label: 'Gain Muscle',   sublabel: '+300 kcal surplus' },
]

function getTodayIndex() {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-36 gap-4">
      <Loader2 size={30} className="text-emerald-500 animate-spin" />
      <p className="text-gray-400 text-sm">Loading your plan…</p>
    </div>
  )
}

// ─── Generating animation ─────────────────────────────────────────────────────

function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center py-36 gap-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
          <Apple size={36} className="text-emerald-500" />
        </div>
        <span className="absolute -inset-2 rounded-3xl border border-emerald-500/40 animate-ping" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-white font-semibold text-base">AI is crafting your meal plan…</p>
        <p className="text-gray-500 text-sm">This usually takes 15–25 seconds</p>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-emerald-500/70 animate-bounce"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Form field components ────────────────────────────────────────────────────

function InputField({ label, unit, value, onChange, type = 'number', ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-gray-900 border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all pr-12"
          {...props}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-gray-900 border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all pr-10 cursor-pointer"
        >
          <option value="" disabled className="text-gray-600">Select…</option>
          {options.map(o => (
            <option key={o.value} value={o.value} className="bg-gray-900">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>
    </div>
  )
}

// ─── Generate form (Screen 1) ─────────────────────────────────────────────────

function GenerateForm({ onGenerate, prefill, error }) {
  const [form, setForm] = useState({
    weight: prefill?.current_weight ?? '',
    height: prefill?.height ?? '',
    age: prefill?.age ?? '',
    gender: '',
    activityLevel: '',
    goal: '',
  })

  const isValid = form.weight && form.height && form.age && form.gender && form.activityLevel && form.goal

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Hero card */}
      <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-6 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Apple size={28} className="text-emerald-500" />
        </div>
        <div>
          <h2 className="text-white font-bold text-xl">AI Diet Planner</h2>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
            Get a personalised 7-day Indian meal plan based on your TDEE
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Your stats</p>

        <div className="grid grid-cols-3 gap-3">
          <InputField
            label="Weight"
            unit="kg"
            value={form.weight}
            onChange={v => set('weight', v)}
            placeholder="75"
            min="30"
          />
          <InputField
            label="Height"
            unit="cm"
            value={form.height}
            onChange={v => set('height', v)}
            placeholder="175"
            min="100"
          />
          <InputField
            label="Age"
            unit="yrs"
            value={form.age}
            onChange={v => set('age', v)}
            placeholder="25"
            min="10"
          />
        </div>

        {/* Gender pills */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
            Gender
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[{ value: 'male', label: '♂ Male' }, { value: 'female', label: '♀ Female' }].map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => set('gender', g.value)}
                className={[
                  'py-3 rounded-xl border text-sm font-semibold transition-all duration-150',
                  form.gender === g.value
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-gray-800 border-white/[0.07] text-gray-400 hover:border-white/20',
                ].join(' ')}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <SelectField
          label="Activity Level"
          value={form.activityLevel}
          onChange={v => set('activityLevel', v)}
          options={ACTIVITY_OPTIONS}
        />

        <SelectField
          label="Goal"
          value={form.goal}
          onChange={v => set('goal', v)}
          options={GOAL_OPTIONS}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-400 text-xs leading-relaxed">{error}</p>
        </div>
      )}

      <button
        onClick={() => isValid && onGenerate(form)}
        disabled={!isValid}
        className={[
          'w-full font-semibold py-4 rounded-2xl transition-all duration-150 flex items-center justify-center gap-2',
          isValid
            ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] text-white shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_32px_rgba(16,185,129,0.5)]'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed',
        ].join(' ')}
      >
        <Zap size={16} />
        Generate My Diet Plan
      </button>
    </div>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatPill({ label, value, unit, color }) {
  return (
    <div className="bg-gray-900 border border-white/[0.07] rounded-xl p-3 flex flex-col gap-1 flex-1 min-w-0">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider truncate">{label}</p>
      <p className={`text-base font-bold ${color}`}>
        {value}<span className="text-xs font-medium text-gray-500 ml-0.5">{unit}</span>
      </p>
    </div>
  )
}

// ─── Meal card ────────────────────────────────────────────────────────────────

function MealCard({ meal }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-gray-900 border border-white/[0.07] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Utensils size={15} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{meal.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock size={10} className="text-gray-600" />
              <span className="text-xs text-gray-500">{meal.time}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">
            {meal.totalCalories} kcal
          </span>
          <ChevronDown
            size={14}
            className={`text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-2 border-t border-white/[0.05]">
          {meal.foods?.map((food, i) => (
            <div key={i} className="flex items-start justify-between gap-3 py-1.5">
              <div className="min-w-0">
                <p className="text-gray-200 text-sm font-medium leading-snug">{food.item}</p>
                <p className="text-gray-600 text-xs mt-0.5">{food.quantity}</p>
              </div>
              <span className="text-gray-400 text-sm font-medium shrink-0">{food.calories} kcal</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Day tab pill ─────────────────────────────────────────────────────────────

function DayPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl shrink-0 transition-all duration-150',
        active
          ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
          : 'bg-gray-900 border border-white/[0.07] hover:border-white/[0.15]',
      ].join(' ')}
    >
      <span className={`text-[11px] font-bold ${active ? 'text-white' : 'text-gray-400'}`}>
        {label}
      </span>
    </button>
  )
}

// ─── Dashboard (Screen 2) ─────────────────────────────────────────────────────

function Dashboard({ plan, onRegenerate }) {
  const [activeDay, setActiveDay] = useState(getTodayIndex())

  const dayData = plan.weekPlan?.[activeDay]
  const dayCalories = dayData?.meals?.reduce((sum, m) => sum + (m.totalCalories ?? 0), 0) ?? 0
  const pct = Math.min(100, Math.round((dayCalories / plan.targetCalories) * 100))

  return (
    <div className="space-y-5 pb-6">
      {/* Macro stats */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <StatPill label="Target" value={plan.targetCalories} unit="kcal" color="text-emerald-400" />
          <StatPill label="TDEE" value={plan.tdee} unit="kcal" color="text-white" />
        </div>
        <div className="flex gap-2">
          <StatPill label="Protein" value={plan.macros?.protein} unit="g" color="text-sky-400" />
          <StatPill label="Carbs" value={plan.macros?.carbs} unit="g" color="text-amber-400" />
          <StatPill label="Fat" value={plan.macros?.fat} unit="g" color="text-rose-400" />
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
        {DAY_LABELS.map((label, i) => (
          <DayPill
            key={label}
            label={label}
            active={activeDay === i}
            onClick={() => setActiveDay(i)}
          />
        ))}
      </div>

      {/* Day calories progress */}
      {dayData && (
        <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame size={15} className="text-emerald-500" />
              <span className="text-sm font-semibold text-white">
                {dayData.day || DAY_LABELS[activeDay]}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {dayCalories} <span className="text-gray-600">/ {plan.targetCalories} kcal</span>
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">{pct}% of daily target</p>
        </div>
      )}

      {/* Meal cards */}
      {dayData?.meals?.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Meals</p>
          {dayData.meals.map((meal, i) => (
            <MealCard key={i} meal={meal} />
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-6 text-center">
          <p className="text-gray-500 text-sm">No meals for this day.</p>
        </div>
      )}

      {/* Regenerate */}
      <button
        onClick={onRegenerate}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20 text-sm font-medium transition-all duration-150 active:scale-[0.97]"
      >
        <RefreshCw size={14} />
        Regenerate Plan
      </button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Diet() {
  const { user } = useAuth()

  const [status, setStatus]   = useState('loading') // loading | form | generating | ready | error
  const [plan, setPlan]       = useState(null)
  const [error, setError]     = useState('')
  const [prefill, setPrefill] = useState(null)

  useEffect(() => {
    if (!user) return
    loadPlanAndProfile()
  }, [user])

  async function loadPlanAndProfile() {
    setStatus('loading')
    try {
      const [planRes, profileRes] = await Promise.allSettled([
        axios.get(`${API}/diet-plan/${user.id}`).catch(e => {
          if (e.response?.status === 404) return { data: null }
          throw e
        }),
        supabase
          .from('users')
          .select('current_weight, height, age')
          .eq('id', user.id)
          .maybeSingle(),
      ])

      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        setPrefill(profileRes.value.data)
      }

      const planData = planRes.status === 'fulfilled' ? planRes.value?.data : null
      if (planData?.weekPlan?.length) {
        setPlan(planData)
        setStatus('ready')
      } else {
        setStatus('form')
      }
    } catch (err) {
      setStatus('form')
    }
  }

  async function handleGenerate(form) {
    setStatus('generating')
    setError('')
    try {
      const payload = {
        userId:        user.id,
        weight:        Number(form.weight),
        height:        Number(form.height),
        age:           Number(form.age),
        gender:        form.gender,
        activityLevel: form.activityLevel,
        goal:          form.goal,
      }
      const { data } = await axios.post(`${API}/generate-diet-plan`, payload)
      setPlan(data)
      setStatus('ready')
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to generate plan. Please try again.'
      setError(msg)
      setStatus('form')
    }
  }

  function handleRegenerate() {
    setPlan(null)
    setStatus('form')
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24 overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[480px] h-[220px] bg-emerald-500/[0.04] blur-[90px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Diet</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {status === 'ready' ? '7-day Indian meal plan' : 'AI-powered nutrition planning'}
        </p>
      </header>

      <div className="relative z-10 px-5">
        {status === 'loading'    && <LoadingState />}
        {status === 'generating' && <GeneratingState />}
        {(status === 'form' || status === 'error') && (
          <GenerateForm
            onGenerate={handleGenerate}
            prefill={prefill}
            error={error}
          />
        )}
        {status === 'ready' && plan && (
          <Dashboard plan={plan} onRegenerate={handleRegenerate} />
        )}
      </div>

      <BottomNav />
    </div>
  )
}
