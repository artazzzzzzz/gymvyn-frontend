import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, X, Search, Mic, Camera,
  Trash2, Sparkles, RefreshCw, Check, Pencil, BookOpen, Settings,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

import BarcodeScanner from '../components/BarcodeScanner'
import DietSettingsSheet from '../components/DietSettingsSheet'
import {
  apiFetch,
  getMacros, calculateMacros,
  getFoodLogs, logFood, deleteFoodLog,
  searchFood, logFoodByVoice, logFoodByCamera,
  getDietPlan, generateDietPlan,
  createCustomMeal, getCustomMeals, deleteCustomMeal,
} from '../utils/api'

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MEALS = [
  { type: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { type: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { type: 'snack',     label: 'Snack',     emoji: '🍎' },
  { type: 'dinner',    label: 'Dinner',    emoji: '🌙' },
]

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toYMD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatDateLabel(d) {
  const today = new Date()
  const yest = new Date(); yest.setDate(today.getDate() - 1)
  const tom = new Date();  tom.setDate(today.getDate() + 1)
  if (isSameDay(d, today)) return 'Today'
  if (isSameDay(d, yest))  return 'Yesterday'
  if (isSameDay(d, tom))   return 'Tomorrow'
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function guessMealTypeNow() {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h < 19) return 'snack'
  return 'dinner'
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast System
// ─────────────────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto w-full max-w-sm bg-gray-900 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl"
          style={{
            borderLeft: '3px solid #10b981',
            animation: 'toastIn 0.3s ease-out',
          }}
        >
          <span className="text-emerald-400 shrink-0 text-base">✓</span>
          <span className="text-white text-sm flex-1 leading-snug">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="text-gray-600 hover:text-gray-400 transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function useToasts() {
  const [toasts, setToasts] = useState([])
  const addToast = useCallback((message) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])
  return { toasts, addToast, removeToast }
}

// ─────────────────────────────────────────────────────────────────────────────
// Calorie Ring
// ─────────────────────────────────────────────────────────────────────────────

function CalorieRing({ eaten, target }) {
  const size = 220
  const stroke = 16
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const safeTarget = target || 1
  const pct = Math.min(eaten / safeTarget, 1)
  const dash = pct * c
  const remaining = Math.max(target - eaten, 0)
  const over = eaten > target

  const [animDash, setAnimDash] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setTimeout(() => setAnimDash(dash), 60)
    })
    return () => cancelAnimationFrame(id)
  }, [dash])

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="#1f2937" strokeWidth={stroke} fill="none"
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={over ? '#f43f5e' : 'url(#ringGrad)'}
            strokeWidth={stroke} fill="none"
            strokeDasharray={`${animDash} ${c}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease-out' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-5xl font-bold tabular-nums tracking-tight leading-none ${over ? 'text-rose-400' : 'text-white'}`}>
            {over
              ? `+${Math.round(eaten - target).toLocaleString()}`
              : Math.round(remaining).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-2 font-medium uppercase tracking-widest">
            {over ? 'over goal' : 'remaining'}
          </div>
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-500 tabular-nums">
        Eaten: <span className="text-gray-200 font-semibold">{Math.round(eaten).toLocaleString()}</span>
        <span className="text-gray-700 mx-2">·</span>
        Goal: <span className="text-gray-200 font-semibold">{target?.toLocaleString() || '—'}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Macro Bar
// ─────────────────────────────────────────────────────────────────────────────

function MacroBar({ label, eaten, target, color, glowColor, delay = 0 }) {
  const pct = target ? Math.min((eaten / target) * 100, 100) : 0
  const [animPct, setAnimPct] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), delay + 300)
    return () => clearTimeout(t)
  }, [pct, delay])

  return (
    <div className="flex-1 min-w-0">
      <div className="text-xs text-gray-500 mb-1.5 font-medium">{label}</div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{
            width: `${animPct}%`,
            transition: 'width 0.7s ease-out',
            boxShadow: animPct > 5 ? `0 0 8px ${glowColor}` : 'none',
          }}
        />
      </div>
      <div className="text-xs text-gray-600 mt-1.5 tabular-nums">
        <span className="text-gray-300 font-medium">{Math.round(eaten)}g</span>
        {' '}<span className="text-gray-700">/ {target || '—'}g</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Actions
// ─────────────────────────────────────────────────────────────────────────────

function QuickActions({ onSearch, onVoice, onCamera }) {
  const actions = [
    { label: 'Search', Icon: Search, onClick: onSearch, iconColor: 'text-emerald-400', ringColor: 'ring-emerald-500/20' },
    { label: 'Voice',  Icon: Mic,    onClick: onVoice,  iconColor: 'text-violet-400',  ringColor: 'ring-violet-500/20' },
    { label: 'Camera', Icon: Camera, onClick: onCamera, iconColor: 'text-sky-400',     ringColor: 'ring-sky-500/20' },
  ]

  return (
    <div className="flex items-center justify-center gap-10">
      {actions.map(({ label, Icon, onClick, iconColor, ringColor }) => (
        <button
          key={label}
          onClick={onClick}
          className="flex flex-col items-center gap-2 group"
        >
          <div className={`w-14 h-14 rounded-full bg-gray-800 border border-gray-700/80 flex items-center justify-center ${iconColor} active:scale-90 hover:ring-2 ${ringColor} transition-all duration-150 shadow-lg`}>
            <Icon size={21} strokeWidth={2} />
          </div>
          <span className="text-xs text-gray-500 font-medium">{label}</span>
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Meal Section
// ─────────────────────────────────────────────────────────────────────────────

function FoodLogItem({ log, onDelete }) {
  const [showDelete, setShowDelete] = useState(false)
  return (
    <div
      onClick={() => setShowDelete(s => !s)}
      className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-800/60 last:border-0 cursor-pointer"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm text-white font-medium truncate leading-tight">{log.food_name}</div>
        <div className="text-xs text-gray-600 mt-0.5">
          {Number(log.quantity) || 1} {log.serving_unit || 'serving'}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm tabular-nums text-gray-400 font-medium">
          {Math.round(Number(log.calories) || 0)} kcal
        </span>
        {showDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-7 h-7 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center hover:bg-rose-500/25 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

function MealSection({ meal, logs, expanded, onToggle, onAddFood, onDeleteLog }) {
  const items = logs.filter(l => l.meal_type === meal.type)
  const cal = Math.round(items.reduce((s, l) => s + Number(l.calories || 0), 0))

  return (
    <div className="bg-gray-900 border border-gray-800/50 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none">{meal.emoji}</span>
          <div className="text-left">
            <div className="text-white font-semibold text-sm">{meal.label}</div>
            {!expanded && items.length > 0 && (
              <div className="text-xs text-gray-600 mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {cal > 0 && (
            <span className="text-sm tabular-nums font-bold text-emerald-400">{cal} kcal</span>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-600 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4">
            {items.length === 0 ? (
              <div className="text-xs text-gray-700 italic py-1 mb-2">No items logged yet</div>
            ) : (
              <div className="mb-2">
                {items.map(l => (
                  <FoodLogItem key={l.id} log={l} onDelete={() => onDeleteLog(l.id)} />
                ))}
              </div>
            )}
            <button
              onClick={() => onAddFood(meal.type)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-700 hover:border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/5 active:bg-emerald-500/10 text-sm font-medium transition-all duration-200"
            >
              <Plus size={15} /> Add Food
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Food Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddFoodModal({ open, mealType, defaultMode = 'search', userId, logDate, onClose, onLogged }) {
  const [mode, setMode] = useState(defaultMode)

  useEffect(() => { if (open) setMode(defaultMode) }, [open, defaultMode])

  if (!open) return null

  const mealLabel = MEALS.find(m => m.type === mealType)?.label || mealType

  const TABS = [
    { id: 'search',   label: 'Search',   Icon: Search },
    { id: 'voice',    label: 'Voice',    Icon: Mic },
    { id: 'camera',   label: 'Camera',   Icon: Camera },
    { id: 'manual',   label: 'Manual',   Icon: Pencil },
    { id: 'mymeals',  label: 'My Meals', Icon: BookOpen },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-lg bg-gray-950 rounded-t-3xl max-h-[92vh] flex flex-col"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 shrink-0">
          <div className="text-white font-bold text-base">
            Add to <span className="text-emerald-400">{mealLabel}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode tabs — 5 tabs, compact */}
        <div className="flex gap-1 px-4 mb-4 shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                mode === t.id
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-gray-900 text-gray-500 hover:text-white hover:bg-gray-800'
              }`}
            >
              <t.Icon size={13} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
          {mode === 'search' && (
            <SearchTab userId={userId} mealType={mealType} onLogged={onLogged} />
          )}
          {mode === 'voice' && (
            <VoiceTab userId={userId} mealType={mealType} onLogged={onLogged} onClose={onClose} />
          )}
          {mode === 'camera' && (
            <CameraTab userId={userId} mealType={mealType} onLogged={onLogged} onClose={onClose} />
          )}
          {mode === 'manual' && (
            <ManualTab
              userId={userId}
              mealType={mealType}
              logDate={logDate || toYMD(new Date())}
              onLogged={onLogged}
            />
          )}
          {mode === 'mymeals' && (
            <MyMealsTab
              userId={userId}
              mealType={mealType}
              logDate={logDate || toYMD(new Date())}
              onLogged={onLogged}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Macro Donut (MFP-style)
// ─────────────────────────────────────────────────────────────────────────────

function MacroDonut({ calories, carbG, fatG, protG }) {
  const SIZE   = 124
  const STROKE = 16
  const R      = (SIZE - STROKE) / 2
  const C      = 2 * Math.PI * R   // circumference ≈ 339

  const carbCal = carbG * 4
  const fatCal  = fatG  * 9
  const protCal = protG * 4
  const total   = carbCal + fatCal + protCal

  const carbPct = total > 0 ? Math.round(carbCal / total * 100) : 0
  const fatPct  = total > 0 ? Math.round(fatCal  / total * 100) : 0
  const protPct = total > 0 ? 100 - carbPct - fatPct            : 0

  // Arc lengths & start offsets
  const carbLen = total > 0 ? (carbCal / total) * C : 0
  const fatLen  = total > 0 ? (fatCal  / total) * C : 0
  const protLen = total > 0 ? (protCal / total) * C : 0

  // stroke-dashoffset trick: to start segment at position P → dashoffset = C - P
  const cx = SIZE / 2, cy = SIZE / 2

  const Seg = ({ len, offset, color }) => len < 0.5 ? null : (
    <circle
      cx={cx} cy={cy} r={R}
      stroke={color} strokeWidth={STROKE} fill="none"
      strokeDasharray={`${len} ${C - len}`}
      strokeDashoffset={C - offset}
      strokeLinecap="butt"
    />
  )

  return (
    <div className="flex items-center gap-5">
      {/* Ring */}
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={R} stroke="#1f2937" strokeWidth={STROKE} fill="none" />
          {total > 0 ? (
            <>
              <Seg len={carbLen} offset={0}                    color="#2dd4bf" />
              <Seg len={fatLen}  offset={carbLen}              color="#a78bfa" />
              <Seg len={protLen} offset={carbLen + fatLen}     color="#fbbf24" />
            </>
          ) : (
            <circle cx={cx} cy={cy} r={R} stroke="#374151" strokeWidth={STROKE} fill="none" />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-2xl leading-none tabular-nums">
            {Math.round(calories)}
          </span>
          <span className="text-gray-500 text-[10px] mt-0.5 uppercase tracking-wide">cal</span>
        </div>
      </div>

      {/* Macro columns */}
      <div className="flex gap-5">
        {[
          { label: 'Carbs',   g: carbG, pct: carbPct, color: 'text-teal-400'   },
          { label: 'Fat',     g: fatG,  pct: fatPct,  color: 'text-violet-400' },
          { label: 'Protein', g: protG, pct: protPct, color: 'text-amber-400'  },
        ].map(({ label, g, pct, color }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span className={`text-base font-bold tabular-nums ${color}`}>{pct}%</span>
            <span className="text-white font-semibold text-sm tabular-nums">{g.toFixed(1)}g</span>
            <span className="text-gray-500 text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Tab
// ─────────────────────────────────────────────────────────────────────────────

function SearchTab({ userId, mealType, onLogged }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState(null)
  const [logging, setLogging] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  // MFP detail state
  const [servingAmtStr, setServingAmtStr] = useState('1') // how much of one serving
  const [numServStr,    setNumServStr]    = useState('1') // how many servings
  const [detailMeal,    setDetailMeal]    = useState(mealType)

  const handleBarcodeResult = async (barcode) => {
    setShowScanner(false)
    setLoading(true)
    try {
      const result = await apiFetch(`/api/food-barcode/${barcode}`)
      if (result) {
        setPicked(result)
      } else {
        alert('Product not found. Try searching by name.')
      }
    } catch (err) {
      alert('Barcode not found in database')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const data = await searchFood(q.trim())
        if (!cancelled) setResults(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q])

  async function handleLog() {
    if (!picked) return
    setLogging(true)
    try {
      const factor = Math.max(0.01, parseFloat(servingAmtStr) || 1)
                   * Math.max(0.01, parseFloat(numServStr)    || 1)
      await logFood({
        userId,
        log_date: toYMD(new Date()),
        mealType: detailMeal,
        foodName: picked.name,
        quantity: factor,
        servingUnit: picked.serving_unit,
        calories: (Number(picked.calories_per_serving) || 0) * factor,
        proteinG: (Number(picked.protein_g) || 0) * factor,
        carbsG:   (Number(picked.carbs_g)   || 0) * factor,
        fatG:     (Number(picked.fat_g)     || 0) * factor,
        loggedVia: 'manual',
        foodId: picked.id,
      })
      const cal = Math.round((Number(picked.calories_per_serving) || 0) * factor)
      onLogged(picked.name, cal)
      setPicked(null)
      setQ('')
      setServingAmtStr('1')
      setNumServStr('1')
      setDetailMeal(mealType)
    } catch (e) {
      alert(e.message || 'Failed to log food')
    } finally {
      setLogging(false)
    }
  }

  // ── MFP-style food detail ──────────────────────────────────────────────────
  if (picked) {
    const base = {
      cal:  Number(picked.calories_per_serving) || 0,
      prot: Number(picked.protein_g) || 0,
      carb: Number(picked.carbs_g)   || 0,
      fat:  Number(picked.fat_g)     || 0,
    }
    // factor = servingAmt × numServings
    const sAmt = Math.max(0.01, parseFloat(servingAmtStr) || 1)
    const nSrv = Math.max(0.01, parseFloat(numServStr)    || 1)
    const factor = sAmt * nSrv

    const totalCal  = base.cal  * factor
    const totalProt = base.prot * factor
    const totalCarb = base.carb * factor
    const totalFat  = base.fat  * factor

    return (
      <div className="space-y-5 pb-2">
        {/* Back */}
        <button
          onClick={() => { setPicked(null); setServingAmtStr('1'); setNumServStr('1') }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors"
        >
          <ChevronLeft size={15} /> Back to results
        </button>

        {/* Food name + badge */}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg leading-tight">{picked.name}</h2>
            {picked.is_combo && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full uppercase font-semibold">Combo</span>
            )}
          </div>
          {/* Verified badge */}
          <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Check size={13} className="text-emerald-400" strokeWidth={3} />
          </div>
        </div>

        {/* Serving inputs */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
          {/* Serving size */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-gray-300">Serving Size</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.01"
                step="0.5"
                value={servingAmtStr}
                onChange={e => setServingAmtStr(e.target.value)}
                onBlur={e => {
                  const n = parseFloat(e.target.value)
                  setServingAmtStr(isNaN(n) || n <= 0 ? '1' : String(n))
                }}
                className="w-20 text-center bg-gray-800 border border-gray-700 text-white font-semibold tabular-nums text-sm rounded-xl py-1.5 outline-none focus:border-emerald-500 transition-colors"
              />
              <span className="text-sm text-gray-500 min-w-[2.5rem]">
                {picked.serving_unit || 'serving'}
              </span>
            </div>
          </div>
          {/* Number of servings */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-gray-300">Number of Servings</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNumServStr(s => String(Math.max(0.5, +(parseFloat(s) - 0.5).toFixed(1))))}
                className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 text-white flex items-center justify-center text-lg hover:bg-gray-700 active:scale-90 transition-all"
              >−</button>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={numServStr}
                onChange={e => setNumServStr(e.target.value)}
                onBlur={e => {
                  const n = parseFloat(e.target.value)
                  setNumServStr(isNaN(n) || n <= 0 ? '1' : String(+n.toFixed(2)))
                }}
                className="w-16 text-center bg-gray-800 border border-gray-700 text-white font-semibold tabular-nums text-sm rounded-xl py-1.5 outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                onClick={() => setNumServStr(s => String(+(parseFloat(s) + 0.5).toFixed(1)))}
                className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 text-white flex items-center justify-center text-lg hover:bg-gray-700 active:scale-90 transition-all"
              >+</button>
            </div>
          </div>
          {/* Meal selector */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-gray-300">Meal</span>
            <select
              value={detailMeal}
              onChange={e => setDetailMeal(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-1.5 outline-none focus:border-emerald-500 transition-colors"
            >
              {MEALS.map(m => (
                <option key={m.type} value={m.type}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Macro donut */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <MacroDonut
            calories={totalCal}
            carbG={totalCarb}
            fatG={totalFat}
            protG={totalProt}
          />
        </div>

        {/* Log button */}
        <button
          onClick={handleLog}
          disabled={logging}
          className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-bold text-base disabled:opacity-60 active:scale-[0.98] transition-transform shadow-lg shadow-emerald-500/20"
        >
          {logging ? 'Logging…' : 'Log Food'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 focus-within:border-emerald-500/40 transition-colors">
          <Search size={16} className="text-gray-600 shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search foods… (try 'dal chawal')"
            className="flex-1 bg-transparent text-white placeholder:text-gray-700 outline-none text-sm"
          />
          {q && (
            <button onClick={() => setQ('')} className="text-gray-600 hover:text-gray-400 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h2v16H3V4zm3 0h1v16H6V4zm2 0h3v16H8V4zm4 0h1v16h-1V4zm2 0h2v16h-2V4zm3 0h1v16h-1V4zm2 0h2v16h-2V4z"/>
          </svg>
          Scan
        </button>
      </div>

      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-900 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && q && results.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <div className="text-sm text-gray-500">No results for "{q}"</div>
          <div className="text-xs text-gray-700 mt-1">Try searching in Hindi or English</div>
        </div>
      )}

      {!q && (
        <div className="text-center py-10 text-gray-700 text-sm">
          Search for dal, roti, paneer, biryani…
        </div>
      )}

      <div className="space-y-2">
        {results.map(r => (
          <button
            key={r.id || r.off_id || r.name}
            onClick={() => setPicked(r)}
            className="w-full bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 text-left active:bg-gray-800 transition-all"
          >
            <div className="flex items-center gap-3">
              {r.image_url && (
                <img
                  src={r.image_url}
                  alt={r.name}
                  className="w-10 h-10 rounded-lg object-cover bg-zinc-800 flex-shrink-0"
                  onError={e => { e.target.style.display = 'none' }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-white font-semibold truncate">{r.name}</span>
                  {r.is_combo && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full uppercase font-semibold shrink-0">combo</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {r.brand && <span>{r.brand} · </span>}
                  {Math.round(r.calories_per_serving)} kcal · {r.serving_description}
                </p>
                {r.source_label && (
                  <p className="text-[10px] text-zinc-600 mt-0.5">{r.source_label}</p>
                )}
              </div>
              <div className="text-right shrink-0 ml-1">
                <div className="text-[10px] text-gray-600 tabular-nums">
                  P{Math.round(r.protein_g)} · C{Math.round(r.carbs_g)} · F{Math.round(r.fat_g)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual Tab
// ─────────────────────────────────────────────────────────────────────────────

const MANUAL_UNITS = ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'katori', 'plate', 'bowl', 'scoop', 'slice', 'tbsp', 'tsp']

const FIELD_BASE = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-600'

function ManualTab({ userId, mealType, logDate, onLogged }) {
  const EMPTY = { name: '', serving: '', unit: 'g', calories: '', protein: '', carbs: '', fat: '' }
  const [form, setForm] = useState(EMPTY)
  const [logging, setLogging] = useState(false)
  const [error, setError]   = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleLog() {
    if (!form.name.trim()) { setError('Food name is required'); return }
    const serving = parseFloat(form.serving)
    if (!form.serving || isNaN(serving) || serving <= 0) { setError('Enter a valid serving size'); return }
    const cal = parseFloat(form.calories)
    if (!form.calories || isNaN(cal) || cal < 0)  { setError('Enter valid calories'); return }
    setError('')
    setLogging(true)
    try {
      await logFood({
        userId,
        log_date: logDate,
        mealType,
        foodName:    form.name.trim(),
        quantity:    serving,
        servingUnit: form.unit,
        calories:    cal,
        proteinG:    parseFloat(form.protein) || 0,
        carbsG:      parseFloat(form.carbs)   || 0,
        fatG:        parseFloat(form.fat)      || 0,
        loggedVia:   'manual',
      })
      onLogged(form.name.trim(), Math.round(cal))
      setForm(EMPTY)
    } catch (e) {
      setError(e.message || 'Failed to log food')
    } finally {
      setLogging(false)
    }
  }

  const isReady = form.name.trim() && form.serving && form.calories

  return (
    <div className="space-y-4 pb-2">
      {/* Food name */}
      <div>
        <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
          Food Name <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g., Chicken Breast"
          className={FIELD_BASE}
          autoComplete="off"
        />
      </div>

      {/* Serving size + unit */}
      <div>
        <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
          Serving Size <span className="text-rose-400">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={form.serving}
            onChange={e => set('serving', e.target.value)}
            placeholder="150"
            className={`${FIELD_BASE} flex-1`}
          />
          <select
            value={form.unit}
            onChange={e => set('unit', e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors"
          >
            {MANUAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Calories */}
      <div>
        <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
          Calories (kcal) <span className="text-rose-400">*</span>
        </label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={form.calories}
          onChange={e => set('calories', e.target.value)}
          placeholder="165"
          className={FIELD_BASE}
        />
      </div>

      {/* Macros row */}
      <div>
        <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
          Macros <span className="text-gray-700">(optional)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'protein', label: 'Protein (g)', placeholder: '31',  color: 'focus:border-sky-500' },
            { key: 'carbs',   label: 'Carbs (g)',   placeholder: '0',   color: 'focus:border-amber-500' },
            { key: 'fat',     label: 'Fat (g)',     placeholder: '3.6', color: 'focus:border-rose-500' },
          ].map(({ key, label, placeholder, color }) => (
            <div key={key}>
              <div className="text-[10px] text-gray-600 mb-1 text-center">{label}</div>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className={`w-full bg-gray-800 border border-gray-700 rounded-xl px-2 py-2.5 text-white text-sm text-center outline-none transition-colors placeholder:text-gray-700 ${color}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Live preview */}
      {(form.calories || form.protein || form.carbs || form.fat) && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex gap-3 text-xs">
            {form.protein && <span className="text-sky-400 font-medium">P {form.protein}g</span>}
            {form.carbs   && <span className="text-amber-400 font-medium">C {form.carbs}g</span>}
            {form.fat     && <span className="text-rose-400 font-medium">F {form.fat}g</span>}
          </div>
          {form.calories && (
            <span className="text-emerald-400 font-bold tabular-nums">{form.calories} kcal</span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5">
          <span className="text-rose-400 text-sm">{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleLog}
        disabled={logging || !isReady}
        className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform shadow-lg shadow-emerald-500/20"
      >
        {logging ? 'Logging…' : 'Log Food'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// My Meals Tab  (saved custom meals)
// ─────────────────────────────────────────────────────────────────────────────

// ── MealBuilder — search + add foods, then save as a named meal ──────────────
function MealBuilder({ userId, onSaved, onCancel }) {
  const [name, setName]       = useState('')
  const [items, setItems]     = useState([])          // [{food_name,qty,serving_unit,calories,protein_g,carbs_g,fat_g}]
  const [q, setQ]             = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    let cancelled = false
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const data = await searchFood(q.trim())
        if (!cancelled) setResults(Array.isArray(data) ? data : [])
      } catch { if (!cancelled) setResults([]) }
      finally  { if (!cancelled) setSearching(false) }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q])

  function addFood(r) {
    setItems(prev => [...prev, {
      food_name:   r.name,
      quantity:    1,
      serving_unit: r.serving_unit || 'serving',
      calories:    Number(r.calories_per_serving) || 0,
      protein_g:   Number(r.protein_g) || 0,
      carbs_g:     Number(r.carbs_g)   || 0,
      fat_g:       Number(r.fat_g)     || 0,
    }])
    setQ('')
    setResults([])
  }

  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  const totals = items.reduce((a, it) => ({
    cal:  a.cal  + it.calories,
    prot: a.prot + it.protein_g,
    carb: a.carb + it.carbs_g,
    fat:  a.fat  + it.fat_g,
  }), { cal: 0, prot: 0, carb: 0, fat: 0 })

  async function handleSave() {
    if (!name.trim())       { setError('Give your meal a name'); return }
    if (items.length === 0) { setError('Add at least one food'); return }
    setError('')
    setSaving(true)
    try {
      await createCustomMeal({ userId, name: name.trim(), items })
      onSaved()
    } catch (e) {
      setError(e.message || 'Failed to save meal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Back */}
      <button onClick={onCancel} className="flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors">
        <ChevronLeft size={15} /> Back to My Meals
      </button>

      {/* Meal name */}
      <div>
        <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Meal Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., My Breakfast Combo"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-600"
          autoComplete="off"
        />
      </div>

      {/* Food search */}
      <div>
        <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Add Foods</label>
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 focus-within:border-emerald-500/50 transition-colors">
          <Search size={15} className="text-gray-600 shrink-0" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search and tap to add…"
            className="flex-1 bg-transparent text-white placeholder:text-gray-700 outline-none text-sm"
          />
          {q && <button onClick={() => setQ('')} className="text-gray-600"><X size={13} /></button>}
        </div>

        {searching && <div className="h-1 bg-emerald-500/30 rounded animate-pulse mt-1" />}

        {results.length > 0 && (
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
            {results.map(r => (
              <button
                key={r.id}
                onClick={() => addFood(r)}
                className="w-full flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-left hover:border-emerald-500/40 active:bg-gray-700 transition-all"
              >
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium truncate">{r.name}</div>
                  <div className="text-xs text-gray-600">{r.serving_description}</div>
                </div>
                <div className="text-xs text-gray-400 tabular-nums shrink-0 ml-2">
                  {Math.round(r.calories_per_serving)} kcal
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Foods in this meal</div>
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">{it.food_name}</div>
                <div className="text-xs text-gray-600">{it.quantity} {it.serving_unit} · {Math.round(it.calories)} kcal</div>
              </div>
              <button onClick={() => removeItem(idx)} className="text-gray-600 hover:text-rose-400 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Running totals */}
          <div className="flex gap-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs">
            <span className="text-emerald-400 font-bold tabular-nums">{Math.round(totals.cal)} kcal</span>
            <span className="text-sky-400">P {totals.prot.toFixed(1)}g</span>
            <span className="text-amber-400">C {totals.carb.toFixed(1)}g</span>
            <span className="text-rose-400">F {totals.fat.toFixed(1)}g</span>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5">{error}</div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !name.trim() || items.length === 0}
        className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform shadow-lg shadow-emerald-500/20"
      >
        {saving ? 'Saving…' : 'Save Meal'}
      </button>
    </div>
  )
}

// ── MyMealsTab — list + log + delete ─────────────────────────────────────────
function MyMealsTab({ userId, mealType, logDate, onLogged }) {
  const [meals, setMeals]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [building, setBuilding] = useState(false)
  const [loggingId, setLoggingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  async function loadMeals() {
    setLoading(true)
    try {
      const data = await getCustomMeals(userId)
      setMeals(Array.isArray(data) ? data : [])
    } catch { setMeals([]) }
    finally  { setLoading(false) }
  }

  useEffect(() => { if (userId) loadMeals() }, [userId])

  async function handleLog(meal) {
    setLoggingId(meal.id)
    try {
      for (const it of (meal.items || [])) {
        await logFood({
          userId,
          log_date:    logDate,
          mealType,
          foodName:    it.food_name,
          quantity:    it.quantity || 1,
          servingUnit: it.serving_unit,
          calories:    it.calories    || 0,
          proteinG:    it.protein_g   || 0,
          carbsG:      it.carbs_g     || 0,
          fatG:        it.fat_g       || 0,
          loggedVia:   'custom_meal',
        })
      }
      onLogged(meal.name, Math.round(meal.total_calories || 0))
    } catch (e) {
      alert(e.message || 'Failed to log meal')
    } finally {
      setLoggingId(null)
    }
  }

  async function handleDelete(meal) {
    setDeletingId(meal.id)
    try {
      await deleteCustomMeal(meal.id)
      setMeals(prev => prev.filter(m => m.id !== meal.id))
    } catch (e) {
      alert(e.message || 'Failed to delete meal')
    } finally {
      setDeletingId(null)
    }
  }

  if (building) {
    return (
      <MealBuilder
        userId={userId}
        onSaved={() => { setBuilding(false); loadMeals() }}
        onCancel={() => setBuilding(false)}
      />
    )
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Create button */}
      <button
        onClick={() => setBuilding(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-gray-700 hover:border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/5 text-sm font-semibold transition-all"
      >
        <Plus size={16} /> Create New Meal
      </button>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-900 animate-pulse" />
          ))}
        </div>
      ) : meals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm text-gray-400 font-medium">No saved meals yet</div>
          <div className="text-xs text-gray-600 mt-1">Build a meal and save it for quick logging.</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {meals.map(meal => (
            <div key={meal.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="text-white font-bold text-sm truncate">{meal.name}</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {(meal.items || []).length} item{(meal.items || []).length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(meal)}
                  disabled={deletingId === meal.id}
                  className="text-gray-700 hover:text-rose-400 disabled:opacity-40 transition-colors shrink-0"
                >
                  {deletingId === meal.id
                    ? <RefreshCw size={14} className="animate-spin" />
                    : <Trash2 size={14} />}
                </button>
              </div>

              {/* Macro summary */}
              <div className="flex gap-3 text-xs mb-3">
                <span className="text-emerald-400 font-bold tabular-nums">
                  {Math.round(meal.total_calories || 0)} kcal
                </span>
                <span className="text-sky-400">P {Math.round(meal.total_protein_g || 0)}g</span>
                <span className="text-amber-400">C {Math.round(meal.total_carbs_g  || 0)}g</span>
                <span className="text-rose-400">F {Math.round(meal.total_fat_g     || 0)}g</span>
              </div>

              {/* Log button */}
              <button
                onClick={() => handleLog(meal)}
                disabled={loggingId === meal.id}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-sm shadow-emerald-500/20"
              >
                {loggingId === meal.id
                  ? <><RefreshCw size={13} className="animate-spin" /> Logging…</>
                  : <><Check size={13} /> Log Meal</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Tab
// ─────────────────────────────────────────────────────────────────────────────

function VoiceTab({ userId, mealType, onLogged, onClose }) {
  const [supported] = useState(() =>
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition))
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const recRef = useRef(null)

  function startListening() {
    if (!supported) return
    setError('')
    setTranscript('')
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'hi-IN'
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (e) => {
      let txt = ''
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript
      setTranscript(txt)
    }
    rec.onerror = (e) => { setError(e.error || 'voice error'); setListening(false) }
    rec.onend = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  function stopListening() {
    try { recRef.current?.stop() } catch { /* noop */ }
    setListening(false)
  }

  async function submit() {
    if (!transcript.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const items = await logFoodByVoice({ userId, transcript: transcript.trim(), mealType })
      setParsed(Array.isArray(items) ? items : [])
    } catch (e) {
      setError(e.message || 'Failed to parse voice input')
    } finally {
      setSubmitting(false)
    }
  }

  async function removeParsed(id) {
    try {
      await deleteFoodLog(id)
      setParsed(p => p.filter(x => x.id !== id))
    } catch (e) {
      alert(e.message || 'Failed to remove item')
    }
  }

  function confirmAll() {
    onLogged()
    onClose()
  }

  if (!supported) {
    return (
      <div className="flex flex-col items-center py-12 gap-3">
        <div className="text-5xl">🎤</div>
        <div className="text-sm text-gray-400 text-center">Voice input is not supported in this browser.</div>
        <div className="text-xs text-gray-600 text-center">Try Chrome or Safari on mobile.</div>
      </div>
    )
  }

  if (parsed) {
    const total = parsed.reduce((s, it) => s + (Number(it.calories) || 0), 0)
    return (
      <div className="space-y-3">
        <div className="text-sm text-gray-500">
          We heard: <span className="text-gray-300 italic">"{transcript}"</span>
        </div>

        {parsed.length === 0 ? (
          <div className="text-sm text-gray-600 italic py-4 text-center">Nothing was parsed. Try again.</div>
        ) : (
          <div className="space-y-2">
            {parsed.map(it => (
              <div key={it.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm text-white font-semibold truncate">{it.food_name}</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {Number(it.quantity) || 1} {it.serving_unit || ''} · {Math.round(Number(it.calories) || 0)} kcal
                  </div>
                </div>
                <button
                  onClick={() => removeParsed(it.id)}
                  className="w-8 h-8 rounded-full text-rose-400 hover:bg-rose-500/15 flex items-center justify-center transition-colors ml-3 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {parsed.length > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-emerald-300">Total</span>
            <span className="text-xl font-bold text-emerald-400 tabular-nums">{Math.round(total)} kcal</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => { setParsed(null); setTranscript('') }}
            className="flex-1 py-3.5 rounded-2xl bg-gray-800 text-white font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} /> Try Again
          </button>
          <button
            onClick={confirmAll}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Check size={14} /> Log All
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center pt-6 pb-4">
      {/* Mic button with pulse rings */}
      <div className="relative">
        {listening && (
          <>
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ transform: 'scale(1.4)' }} />
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" style={{ transform: 'scale(1.8)', animationDelay: '0.4s' }} />
          </>
        )}
        <button
          onClick={listening ? stopListening : startListening}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
            listening
              ? 'bg-emerald-500 text-black shadow-emerald-500/40'
              : 'bg-gray-800 text-white border border-gray-700 hover:border-gray-600 hover:bg-gray-750'
          }`}
        >
          <Mic size={36} strokeWidth={listening ? 2.5 : 2} />
        </button>
      </div>

      <div className="mt-6 text-sm text-center px-4 leading-relaxed">
        {listening
          ? <span className="text-emerald-400 font-semibold">Listening… speak in English or Hinglish</span>
          : <span className="text-gray-500">Tap to start.<br />Try: "lunch mein dal chawal aur 2 roti khaya"</span>
        }
      </div>

      {transcript && (
        <div className="mt-5 w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white leading-relaxed">
          {transcript}
        </div>
      )}

      {error && <div className="mt-3 text-xs text-rose-400 text-center">{error}</div>}

      {transcript && !listening && (
        <button
          disabled={submitting}
          onClick={submit}
          className="mt-5 w-full py-4 rounded-2xl bg-emerald-500 text-black font-bold disabled:opacity-50 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform"
        >
          {submitting ? 'Parsing…' : 'Parse & Log'}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera Tab
// ─────────────────────────────────────────────────────────────────────────────

function CameraTab({ userId, mealType, onLogged, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [imageB64, setImageB64] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setReady(true)
      } catch (e) {
        setError(e.message || 'Camera permission denied')
      }
    }
    if (!imageB64 && !parsed) start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [imageB64, parsed])

  function capture() {
    const v = videoRef.current
    if (!v) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth || 720
    canvas.height = v.videoHeight || 1280
    const ctx = canvas.getContext('2d')
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    const b64 = canvas.toDataURL('image/jpeg', 0.82)
    setImageB64(b64)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const items = await logFoodByCamera({ userId, imageBase64: imageB64, mealType })
      setParsed(Array.isArray(items) ? items : [])
    } catch (e) {
      setError(e.message || 'Failed to analyze photo')
    } finally {
      setSubmitting(false)
    }
  }

  async function removeParsed(id) {
    try {
      await deleteFoodLog(id)
      setParsed(p => p.filter(x => x.id !== id))
    } catch (e) {
      alert(e.message || 'Failed to remove item')
    }
  }

  const confColor = (conf) => {
    const c = (conf || 'medium').toLowerCase()
    if (c === 'high') return 'bg-emerald-500/15 text-emerald-400'
    if (c === 'low') return 'bg-rose-500/15 text-rose-400'
    return 'bg-amber-500/15 text-amber-400'
  }

  if (parsed) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-gray-500">Detected items:</div>
        {parsed.length === 0 ? (
          <div className="text-sm text-gray-600 italic py-4 text-center">No food detected. Try again.</div>
        ) : (
          <div className="space-y-2">
            {parsed.map(it => (
              <div key={it.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-semibold truncate">{it.food_name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase font-semibold shrink-0 ${confColor(it.confidence)}`}>
                      {(it.confidence || 'med').slice(0, 3)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {Number(it.quantity) || 1} {it.serving_unit || ''} · {Math.round(Number(it.calories) || 0)} kcal
                  </div>
                </div>
                <button
                  onClick={() => removeParsed(it.id)}
                  className="w-8 h-8 rounded-full text-rose-400 hover:bg-rose-500/15 flex items-center justify-center transition-colors ml-3 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => { setParsed(null); setImageB64(null) }}
            className="flex-1 py-3.5 rounded-2xl bg-gray-800 text-white font-semibold hover:bg-gray-700 transition-colors"
          >Retry</button>
          <button
            onClick={() => { onLogged(); onClose() }}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Check size={14} /> Log All
          </button>
        </div>
      </div>
    )
  }

  if (imageB64) {
    return (
      <div className="space-y-3">
        <img src={imageB64} alt="captured" className="w-full rounded-2xl object-cover max-h-72" />
        {error && <div className="text-xs text-rose-400 text-center">{error}</div>}
        <div className="flex gap-2">
          <button
            onClick={() => setImageB64(null)}
            className="flex-1 py-3.5 rounded-2xl bg-gray-800 text-white font-semibold"
          >Retake</button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-black font-bold disabled:opacity-60 shadow-lg shadow-emerald-500/20"
          >
            {submitting ? 'Analyzing…' : 'Analyze Photo'}
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-12 gap-3">
        <div className="text-5xl">📷</div>
        <div className="text-sm text-gray-400 text-center leading-relaxed">{error}</div>
        <div className="text-xs text-gray-600 text-center">Grant camera access or use Search instead</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[3/4] w-full bg-black rounded-2xl overflow-hidden border border-gray-800">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-700">
            <Camera size={32} />
            <span className="text-sm">Starting camera…</span>
          </div>
        )}
        {/* Viewfinder corners */}
        {ready && (
          <>
            <div className="absolute top-5 left-5 w-7 h-7 border-t-2 border-l-2 border-emerald-500 rounded-tl-sm" />
            <div className="absolute top-5 right-5 w-7 h-7 border-t-2 border-r-2 border-emerald-500 rounded-tr-sm" />
            <div className="absolute bottom-5 left-5 w-7 h-7 border-b-2 border-l-2 border-emerald-500 rounded-bl-sm" />
            <div className="absolute bottom-5 right-5 w-7 h-7 border-b-2 border-r-2 border-emerald-500 rounded-br-sm" />
          </>
        )}
      </div>

      {/* iPhone-style shutter button */}
      <div className="flex justify-center">
        <button
          onClick={capture}
          disabled={!ready}
          className="w-[72px] h-[72px] rounded-full border-[4px] border-white p-1.5 disabled:opacity-40 active:scale-90 transition-all"
        >
          <div className="w-full h-full rounded-full bg-white" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// My Plan Tab
// ─────────────────────────────────────────────────────────────────────────────

function MyPlanTab({ userId, plan, onPlanGenerated, onSwitchToToday, onMealLogged }) {
  const [dietType, setDietType] = useState('non_veg')
  const [cuisine, setCuisine] = useState('north_indian')
  const [generating, setGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = (new Date().getDay() + 6) % 7  // Mon=0..Sun=6
    return d
  })

  async function handleGenerate() {
    setGenerating(true)
    try {
      const newPlan = await generateDietPlan({ userId, dietType, cuisinePref: cuisine })
      onPlanGenerated(newPlan)
    } catch (e) {
      alert(e.message || 'Failed to generate plan')
    } finally {
      setGenerating(false)
    }
  }

  if (!plan) {
    return (
      <div className="px-4 py-6">
        <div className="bg-gray-900 border border-gray-800/50 rounded-3xl p-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🍽️</div>
            <h2 className="text-xl font-bold text-white leading-tight">
              Get Your Personalized<br />
              <span className="text-emerald-400">AI Diet Plan</span>
            </h2>
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">
              7-day meal plan tailored to your goals<br />and Indian food preferences
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-600 mb-2.5 font-semibold uppercase tracking-widest">Diet preference</div>
              <div className="flex gap-2">
                {[
                  { v: 'veg',        l: 'Veg',     e: '🌿' },
                  { v: 'non_veg',    l: 'Non-Veg', e: '🍗' },
                  { v: 'eggetarian', l: 'Egg',      e: '🥚' },
                ].map(o => (
                  <button
                    key={o.v}
                    onClick={() => setDietType(o.v)}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                      dietType === o.v
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >{o.e} {o.l}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-600 mb-2.5 font-semibold uppercase tracking-widest">Cuisine style</div>
              <div className="flex gap-2">
                {[
                  { v: 'north_indian', l: 'North' },
                  { v: 'south_indian', l: 'South' },
                  { v: 'mixed',        l: 'Mixed' },
                ].map(o => (
                  <button
                    key={o.v}
                    onClick={() => setCuisine(o.v)}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                      cuisine === o.v
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >{o.l}</button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-6 w-full py-4 rounded-2xl bg-emerald-500 text-black font-bold text-base disabled:opacity-60 active:scale-[0.98] transition-transform shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            {generating ? 'Generating plan…' : 'Generate My Plan'}
          </button>
        </div>
      </div>
    )
  }

  const planData = plan.plan_data || {}
  const days = Array.isArray(planData.days) ? planData.days : []
  const day = days[selectedDay] || days[0]

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {DAY_NAMES.map((dn, i) => (
          <button
            key={dn}
            onClick={() => setSelectedDay(i)}
            className={`shrink-0 w-12 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              selectedDay === i
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-gray-900 text-gray-500 hover:text-white border border-gray-800'
            }`}
          >{dn}</button>
        ))}
      </div>

      {!day ? (
        <div className="text-sm text-gray-600 italic text-center py-8">No data for this day.</div>
      ) : (
        <>
          {(day.meals || []).map((m, idx) => (
            <PlanMealCard
              key={idx}
              meal={m}
              userId={userId}
              onLogged={() => { onMealLogged?.(); onSwitchToToday() }}
            />
          ))}

          {day.day_total && (
            <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-4">
              <div className="text-xs text-gray-600 uppercase tracking-widest mb-3 font-semibold">Day total</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { val: Math.round(day.day_total.calories), label: 'kcal', color: 'text-emerald-400' },
                  { val: `${Math.round(day.day_total.protein_g)}g`, label: 'Protein', color: 'text-sky-400' },
                  { val: `${Math.round(day.day_total.carbs_g)}g`, label: 'Carbs', color: 'text-amber-400' },
                  { val: `${Math.round(day.day_total.fat_g)}g`, label: 'Fat', color: 'text-rose-400' },
                ].map(({ val, label, color }) => (
                  <div key={label} className="text-center">
                    <div className={`text-base font-bold tabular-nums ${color}`}>{val}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full py-3 rounded-2xl border border-gray-800 text-gray-500 hover:text-white hover:border-gray-700 hover:bg-gray-900 flex items-center justify-center gap-2 transition-all disabled:opacity-60 text-sm font-medium"
      >
        <RefreshCw size={14} /> {generating ? 'Regenerating…' : 'Regenerate Plan'}
      </button>
    </div>
  )
}

function PlanMealCard({ meal, userId, onLogged }) {
  const [logging, setLogging] = useState(false)
  const items = Array.isArray(meal.items) ? meal.items : []
  const mealInfo = MEALS.find(m => m.type === meal.meal_type)

  async function logAll() {
    setLogging(true)
    try {
      const today = toYMD(new Date())
      for (const it of items) {
        await logFood({
          userId,
          log_date: today,
          mealType: meal.meal_type,
          foodName: it.name,
          quantity: 1,
          servingUnit: it.quantity || null,
          calories: Number(it.calories) || 0,
          proteinG: Number(it.protein_g) || 0,
          carbsG:   Number(it.carbs_g)   || 0,
          fatG:     Number(it.fat_g)     || 0,
          loggedVia: 'plan',
        })
      }
      onLogged?.()
    } catch (e) {
      alert(e.message || 'Failed to log meal')
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{mealInfo?.emoji || '🍽️'}</span>
          <span className="text-white font-bold capitalize">{meal.meal_type}</span>
        </div>
        <span className="text-sm tabular-nums text-emerald-400 font-bold">{Math.round(meal.meal_calories || 0)} kcal</span>
      </div>

      <div className="space-y-2 mb-4">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between text-sm border-b border-gray-800/50 last:border-0 pb-2 last:pb-0">
            <div className="text-gray-300 min-w-0 truncate">
              {it.name} <span className="text-gray-700">· {it.quantity}</span>
            </div>
            <div className="text-gray-500 tabular-nums shrink-0 ml-2 text-xs">{Math.round(it.calories || 0)}</div>
          </div>
        ))}
      </div>

      <button
        onClick={logAll}
        disabled={logging}
        className="w-full py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md shadow-emerald-500/15"
      >
        <Check size={14} /> {logging ? 'Logging…' : 'Log This Meal'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Summary Bar
// ─────────────────────────────────────────────────────────────────────────────

function DailySummaryBar({ totals }) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/95 backdrop-blur-md border border-gray-800 rounded-2xl px-5 py-2.5 flex items-center justify-between shadow-2xl pointer-events-auto">
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-gray-500">Total</span>
            <span className="text-sm font-bold text-white tabular-nums ml-1">{Math.round(totals.totalCalories || 0)}</span>
            <span className="text-xs text-gray-600">kcal</span>
          </div>
          <div className="w-px h-3 bg-gray-700" />
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-sky-400">P</span>
            <span className="text-xs text-gray-300 tabular-nums font-medium">{Math.round(totals.totalProtein || 0)}g</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-amber-400">C</span>
            <span className="text-xs text-gray-300 tabular-nums font-medium">{Math.round(totals.totalCarbs || 0)}g</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-rose-400">F</span>
            <span className="text-xs text-gray-300 tabular-nums font-medium">{Math.round(totals.totalFat || 0)}g</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Today Tab
// ─────────────────────────────────────────────────────────────────────────────

function TodayTab({
  isLoading, logsLoading, macros, macrosError, totals, logs, expanded,
  onToggleMeal, onAddFood, onDeleteLog,
  selectedDate, onPrevDay, onNextDay, onJumpToday,
  onOpenQuickAction,
}) {
  const isToday = isSameDay(selectedDate, new Date())

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Date nav */}
      <div className="flex items-center justify-center gap-3 py-1">
        <button
          onClick={onPrevDay}
          className="w-9 h-9 rounded-full hover:bg-gray-900 text-gray-600 hover:text-white flex items-center justify-center transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={onJumpToday}
          className={`text-sm font-bold px-5 py-1.5 rounded-full transition-all ${
            isToday
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : 'text-white hover:bg-gray-900 border border-transparent'
          }`}
        >
          {formatDateLabel(selectedDate)}
        </button>
        <button
          onClick={onNextDay}
          className="w-9 h-9 rounded-full hover:bg-gray-900 text-gray-600 hover:text-white flex items-center justify-center transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Macros error */}
      {macrosError && !isLoading && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 text-sm text-amber-300">
          <span className="shrink-0">⚠️</span>
          <span>
            {macrosError.includes('weight/height/age')
              ? 'Complete your profile to see calorie targets.'
              : `Couldn't load calorie targets.`}
          </span>
        </div>
      )}

      {/* Hero calorie card */}
      <div className="bg-gray-900 border border-gray-800/50 rounded-3xl p-5 space-y-5">
        {isLoading ? (
          <div className="flex flex-col items-center gap-5">
            <div className="w-[220px] h-[220px] rounded-full bg-gray-800 animate-pulse" />
            <div className="text-xs text-gray-700 animate-pulse">Loading…</div>
            <div className="flex gap-4 w-full">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-1 space-y-2">
                  <div className="h-2 bg-gray-800 rounded animate-pulse" />
                  <div className="h-1.5 bg-gray-800 rounded animate-pulse" />
                  <div className="h-2 bg-gray-800 rounded-full animate-pulse w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <CalorieRing
              eaten={Math.round(totals.totalCalories || 0)}
              target={macros?.calories || 0}
            />
            <div className="flex gap-4">
              <MacroBar label="Protein" eaten={totals.totalProtein || 0} target={macros?.protein_g || 0} color="bg-sky-500"   glowColor="rgba(14,165,233,0.4)"  delay={0} />
              <MacroBar label="Carbs"   eaten={totals.totalCarbs   || 0} target={macros?.carbs_g   || 0} color="bg-amber-500" glowColor="rgba(245,158,11,0.4)"  delay={150} />
              <MacroBar label="Fat"     eaten={totals.totalFat     || 0} target={macros?.fat_g     || 0} color="bg-rose-500"  glowColor="rgba(244,63,94,0.4)"   delay={300} />
            </div>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl py-4 px-4">
        <QuickActions
          onSearch={() => onOpenQuickAction('search')}
          onVoice={() => onOpenQuickAction('voice')}
          onCamera={() => onOpenQuickAction('camera')}
        />
      </div>

      {/* Meal sections */}
      <div className="space-y-2.5">
        {(isLoading || logsLoading)
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-gray-900 animate-pulse" />
            ))
          : MEALS.map(m => (
              <MealSection
                key={m.type}
                meal={m}
                logs={logs}
                expanded={expanded.has(m.type)}
                onToggle={() => onToggleMeal(m.type)}
                onAddFood={onAddFood}
                onDeleteLog={onDeleteLog}
              />
            ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Diet() {
  const { user } = useAuth()
  const userId = user?.id
  const { toasts, addToast, removeToast } = useToasts()

  const [activeTab, setActiveTab] = useState('today')
  const [showDietSettings, setShowDietSettings] = useState(false)
  const [macros, setMacros] = useState(null)
  const [macrosError, setMacrosError] = useState(null)
  const [logs, setLogs] = useState([])
  const [totals, setTotals] = useState({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 })
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [expanded, setExpanded] = useState(() => new Set(['breakfast', 'lunch', 'snack', 'dinner']))
  const [isLoading, setIsLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addMealType, setAddMealType] = useState('breakfast')
  const [addMode, setAddMode] = useState('search')

  const [plan, setPlan] = useState(null)

  const dateYMD = useMemo(() => toYMD(selectedDate), [selectedDate])
  const [waterGlasses, setWaterGlasses] = useState(0)
  const [waterGoalMl, setWaterGoalMl]   = useState(2500)
  const [waterEditing, setWaterEditing] = useState(false)
  const [waterGoalInput, setWaterGoalInput] = useState('')

  // ── Load macros + plan on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function loadInit() {
      setIsLoading(true)
      setMacrosError(null)

      let macrosData = null

      // Prefer user-saved goals from user_macros over backend API calculation
      try {
        const { data: savedMacros } = await supabase
          .from('user_macros')
          .select('calories, protein_g, carbs_g, fat_g, water_goal_ml')
          .eq('user_id', userId)
          .maybeSingle()
        if (savedMacros?.calories) {
          macrosData = {
            calories:  savedMacros.calories,
            protein_g: savedMacros.protein_g,
            carbs_g:   savedMacros.carbs_g,
            fat_g:     savedMacros.fat_g,
          }
          if (savedMacros.water_goal_ml) setWaterGoalMl(savedMacros.water_goal_ml)
        }
      } catch (_) { /* ignore, fall through to API */ }

      if (!macrosData) {
        try {
          const r = await getMacros(userId)
          macrosData = r?.macros ?? null
          if (!macrosData) {
            const calc = await calculateMacros(userId)
            macrosData = calc?.macros ?? null
          }
        } catch (err) {
          try {
            const calc = await calculateMacros(userId)
            macrosData = calc?.macros ?? null
          } catch (calcErr) {
            if (!cancelled) setMacrosError(calcErr.message)
          }
        }
      }

      if (!cancelled) setMacros(macrosData)
      console.log('[Diet] macros loaded:', macrosData)

      try {
        const p = await getDietPlan(userId)
        if (!cancelled) setPlan(p)
      } catch (err) {
        console.warn('[Diet] getDietPlan failed:', err.message)
        if (!cancelled) setPlan(null)
      }

      if (!cancelled) setIsLoading(false)
    }

    loadInit()
    return () => { cancelled = true }
  }, [userId])

  // ── Load / refresh food logs whenever date or userId changes ─────────────────
  async function refreshLogs(dateStr) {
    if (!userId) return
    const d = dateStr || dateYMD
    setLogsLoading(true)
    try {
      const r = await getFoodLogs(userId, d)
      setLogs(Array.isArray(r.logs) ? r.logs : [])
      setTotals(r.totals || { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 })
    } catch (err) {
      console.error('[Diet] getFoodLogs error:', err.message)
      setLogs([])
      setTotals({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 })
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return
    refreshLogs(dateYMD)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dateYMD])

  // ── Load water goal + today's intake ───────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function loadWater() {
      const [{ data: userRow }, { data: waterRow }] = await Promise.all([
        supabase.from('users').select('water_goal_ml').eq('id', userId).maybeSingle(),
        supabase.from('water_logs').select('glasses_count').eq('user_id', userId).eq('log_date', dateYMD).maybeSingle(),
      ])
      if (cancelled) return
      if (userRow?.water_goal_ml) setWaterGoalMl(userRow.water_goal_ml)
      setWaterGlasses(waterRow?.glasses_count ?? 0)
    }
    loadWater()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dateYMD])

  async function handleWaterChange(newCount) {
    if (!userId) return
    setWaterGlasses(newCount)
    await supabase.from('water_logs').upsert(
      { user_id: userId, log_date: dateYMD, glasses_count: newCount },
      { onConflict: 'user_id,log_date' }
    )
  }

  async function saveWaterGoal() {
    const ml = parseInt(waterGoalInput, 10)
    if (!ml || ml <= 0) { setWaterEditing(false); return }
    setWaterGoalMl(ml)
    setWaterEditing(false)
    if (userId) {
      await supabase.from('users').update({ water_goal_ml: ml }).eq('id', userId)
    }
  }

  function toggleMeal(type) {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(type)) n.delete(type); else n.add(type)
      return n
    })
  }

  function openAdd(mealType, mode = 'search') {
    setAddMealType(mealType)
    setAddMode(mode)
    setShowAddModal(true)
  }

  async function handleDeleteLog(id) {
    try {
      await deleteFoodLog(id)
      refreshLogs(dateYMD)
    } catch (e) {
      alert(e.message || 'Failed to delete')
    }
  }

  function shiftDate(days) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d)
  }

  // Called when a food item is logged — stays in modal, shows toast, refreshes
  function handleLogged(foodName, calories) {
    refreshLogs(dateYMD)
    if (foodName) {
      addToast(`Logged ${foodName} (${calories} kcal)`)
    }
  }

  // ── Diet Tracker redesign helpers ──────────────────────────────────────────
  const DIET_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
  const DIET_MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' }

  const dietTotals = useMemo(() => ({
    calories: Math.round(logs.reduce((s, l) => s + (l.calories || 0), 0)),
    protein:  Math.round(logs.reduce((s, l) => s + (l.protein  || 0), 0)),
    carbs:    Math.round(logs.reduce((s, l) => s + (l.carbs    || 0), 0)),
    fat:      Math.round(logs.reduce((s, l) => s + (l.fat      || 0), 0)),
  }), [logs])

  const dietMealLogs = useMemo(() => {
    const result = {}
    DIET_MEAL_TYPES.forEach(m => { result[m] = logs.filter(l => l.meal_type === m) })
    return result
  }, [logs])

  const activeGoals = macros
    ? { calories: macros.calories || 2400, protein: macros.protein_g || 180, carbs: macros.carbs_g || 240, fat: macros.fat_g || 70 }
    : { calories: 2400, protein: 180, carbs: 240, fat: 70 }

  const macroConfig = {
    protein: { color: '#185FA5', trackColor: '#E6F1FB', label: 'PROTEIN', key: 'protein', goal: activeGoals.protein },
    carbs:   { color: '#854F0B', trackColor: '#FAEEDA', label: 'CARBS',   key: 'carbs',   goal: activeGoals.carbs   },
    fat:     { color: '#993C1D', trackColor: '#FAECE7', label: 'FAT',     key: 'fat',     goal: activeGoals.fat     },
  }

  const dietInsights = useMemo(() => {
    const goals = { calories: macros?.calories || 2400, protein: macros?.protein_g || 180 }
    const prot = Math.round(logs.reduce((s, l) => s + (l.protein || 0), 0))
    const cal  = Math.round(logs.reduce((s, l) => s + (l.calories || 0), 0))
    const list = []
    const protDiff = goals.protein - prot
    const calDiff  = goals.calories - cal
    if (protDiff > 20)       list.push({ color: '#854F0B', text: `Protein is ${protDiff}g below target` })
    else if (protDiff < -10) list.push({ color: '#A32D2D', text: `Protein ${Math.abs(protDiff)}g over target` })
    else                     list.push({ color: '#3B6D11', text: 'Protein on track 💪' })
    if (calDiff > 0) list.push({ color: '#3B6D11', text: `${calDiff} kcal remaining for today` })
    else             list.push({ color: '#A32D2D', text: `${Math.abs(calDiff)} kcal over daily goal` })
    return list.slice(0, 3)
  }, [logs, macros])

  const getFoodEmoji = (name) => {
    const n = name?.toLowerCase() || ''
    if (n.includes('chicken') || n.includes('meat')) return '🍗'
    if (n.includes('rice'))   return '🍚'
    if (n.includes('oat'))    return '🥣'
    if (n.includes('banana')) return '🍌'
    if (n.includes('egg'))    return '🥚'
    if (n.includes('milk'))   return '🥛'
    if (n.includes('paneer') || n.includes('cheese')) return '🧀'
    if (n.includes('dal')    || n.includes('lentil')) return '🫘'
    if (n.includes('shake')  || n.includes('protein') || n.includes('whey')) return '💪'
    if (n.includes('salad')) return '🥗'
    return '🍽️'
  }

  function handleDietSettingsSaved({ calories, protein_g, carbs_g, fat_g, water_goal_ml }) {
    setMacros(prev => ({ ...(prev || {}), calories, protein_g, carbs_g, fat_g }))
    setWaterGoalMl(water_goal_ml)
    setShowDietSettings(false)
    addToast('Diet settings saved')
  }

  const isDietToday  = (date) => date.toDateString() === new Date().toDateString()
  const dietPrevStr  = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
  const dietNextStr  = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
  const dietLabel    = isDietToday(selectedDate) ? 'Today' : selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const dietMealCal  = (meal) => (dietMealLogs[meal] || []).reduce((s, l) => s + (l.calories || 0), 0)

  return (
    <div className="min-h-screen bg-[#F7F7F5] pb-24">

      {/* Fixed Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/5 h-14 flex items-center justify-between px-5">
        <button onClick={() => shiftDate(-1)} className="text-sm font-medium text-[#999]">← {dietPrevStr()}</button>
        <span className="text-base font-medium text-[#111]">{dietLabel}</span>
        <div className="flex items-center gap-3">
          {!isDietToday(selectedDate) && (
            <button
              onClick={() => shiftDate(1)}
              className="text-sm font-medium text-[#999]"
            >
              {dietNextStr()} →
            </button>
          )}
          <button
            onClick={() => setShowDietSettings(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <Settings size={18} color="#999" />
          </button>
        </div>
      </div>

      <div className="pt-[72px] px-5">

        {/* Macro Summary Card */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 mt-0">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[28px] font-medium text-[#111] tabular-nums">{dietTotals.calories.toLocaleString()}</span>
              <p className="text-xs text-[#999] mt-0.5">kcal consumed</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#999]">{activeGoals.calories.toLocaleString()} kcal goal</p>
              {(() => {
                const rem = activeGoals.calories - dietTotals.calories
                return (
                  <p className={`text-[13px] font-medium mt-0.5 ${rem >= 0 ? 'text-[#3B6D11]' : 'text-[#A32D2D]'}`}>
                    {rem >= 0 ? `${rem} remaining` : `${Math.abs(rem)} over`}
                  </p>
                )
              })()}
            </div>
          </div>
          {/* Calorie bar */}
          <div className="mt-3 h-2 w-full bg-[#F1EFE8] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((dietTotals.calories / activeGoals.calories) * 100, 100)}%`,
                backgroundColor: dietTotals.calories > activeGoals.calories ? '#A32D2D' : '#111',
              }}
            />
          </div>
          {/* Macro mini bars */}
          <div className="grid grid-cols-3 divide-x divide-black/[0.06] mt-4">
            {Object.values(macroConfig).map(({ color, trackColor, label, key, goal }) => (
              <div key={key} className="flex flex-col items-center py-1 px-2">
                <span className="text-base font-medium text-[#111] tabular-nums">{dietTotals[key]}g</span>
                <span className="text-[10px] uppercase tracking-widest text-[#999] mt-0.5">{label}</span>
                <div className="w-10 h-1 rounded-full mt-1.5 overflow-hidden" style={{ backgroundColor: trackColor }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((dietTotals[key] / goal) * 100, 100)}%`, backgroundColor: color }} />
                </div>
                <span className="text-[10px] text-[#CCC] mt-1">/ {goal}g</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { icon: '📷', label: 'Camera', mode: 'camera' },
            { icon: '🎤', label: 'Voice',  mode: 'voice'  },
            { icon: '🔍', label: 'Search', mode: 'search' },
          ].map(({ icon, label, mode }) => (
            <button key={label} onClick={() => openAdd(guessMealTypeNow(), mode)}
              className="bg-white border border-black/[0.06] rounded-xl h-11 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#111] active:bg-[#F7F7F5] transition-colors">
              <span>{icon}</span>{label}
            </button>
          ))}
        </div>

        {/* Meal Sections */}
        <div className="mt-4">
          {DIET_MEAL_TYPES.map((meal, mealIdx) => (
            <div key={meal}>
              <div className="flex items-center py-3">
                <span className="text-[15px] font-medium text-[#111]">{DIET_MEAL_LABELS[meal]}</span>
                {dietMealCal(meal) > 0 && (
                  <span className="text-[13px] text-[#999] ml-2 flex-1">{Math.round(dietMealCal(meal))} kcal</span>
                )}
                <button onClick={() => openAdd(meal, 'search')} className="text-[13px] font-medium text-[#185FA5]">+ Add</button>
              </div>

              {(dietMealLogs[meal] || []).length > 0 ? (
                (dietMealLogs[meal] || []).map(log => (
                  <div key={log.id} className="bg-white rounded-xl border border-black/[0.06] p-4 mb-2 flex items-center">
                    <div className="w-10 h-10 rounded-[10px] bg-[#F1EFE8] flex items-center justify-center shrink-0 text-lg">
                      {getFoodEmoji(log.food_name)}
                    </div>
                    <div className="flex-1 ml-3 min-w-0">
                      <p className="text-sm font-medium text-[#111] truncate">{log.food_name}</p>
                      <p className="text-xs text-[#999] mt-0.5">
                        {log.amount_g ? `${log.amount_g}g · ` : ''}{Number(log.quantity) || 1} serving
                      </p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-[13px] font-medium text-[#111]">{Math.round(log.calories || 0)} kcal</p>
                      <p className="text-[10px] text-[#999] mt-0.5">
                        P{Math.round(log.protein || 0)}g C{Math.round(log.carbs || 0)}g F{Math.round(log.fat || 0)}g
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-black/10 rounded-xl p-4 flex items-center justify-center mb-2">
                  <span className="text-[13px] text-[#999]">+ Log {DIET_MEAL_LABELS[meal]}</span>
                </div>
              )}

              {mealIdx < DIET_MEAL_TYPES.length - 1 && (
                <div className="border-t border-black/[0.04] mt-1 mb-1" />
              )}
            </div>
          ))}
        </div>

        {/* Water Tracker */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium uppercase tracking-widest text-[#999]">WATER</span>
            {waterEditing ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={waterGoalInput}
                  onChange={e => setWaterGoalInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveWaterGoal(); if (e.key === 'Escape') setWaterEditing(false) }}
                  placeholder="ml"
                  autoFocus
                  className="w-20 text-right text-[13px] border border-black/10 rounded-lg px-2 py-0.5 focus:outline-none focus:border-[#185FA5]"
                />
                <button onClick={saveWaterGoal} className="text-[12px] font-medium text-[#185FA5]">Save</button>
                <button onClick={() => setWaterEditing(false)} className="text-[12px] text-[#999]">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium text-[#111]">
                  {(waterGlasses * 250 / 1000).toFixed(2)}L / {(waterGoalMl / 1000).toFixed(1)}L
                </span>
                <button
                  onClick={() => { setWaterGoalInput(String(waterGoalMl)); setWaterEditing(true) }}
                  className="text-[#999] hover:text-[#111] transition-colors"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: Math.max(8, Math.ceil(waterGoalMl / 250)) }, (_, i) => (
              <button
                key={i}
                onClick={() => handleWaterChange(waterGlasses === i + 1 ? i : i + 1)}
                className={`w-9 h-9 rounded-full border transition-colors flex items-center justify-center ${
                  i < waterGlasses ? 'bg-[#E6F1FB] border-[#185FA5]' : 'bg-white border-black/10'
                }`}
              >
                {i < waterGlasses && <span className="w-2 h-2 rounded-full bg-[#185FA5]" />}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#CCC] mt-2">250ml per tap</p>
        </div>

        {/* Nutrition Insights */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-4 mt-3 mb-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[#999] mb-3">TODAY'S INSIGHTS</p>
          {dietInsights.map((ins, i) => (
            <div key={i} className={`flex items-center gap-2 ${i > 0 ? 'mt-2.5' : ''}`}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ins.color }} />
              <span className="text-[13px] text-[#111]">{ins.text}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {showDietSettings && (
        <DietSettingsSheet
          userId={userId}
          onClose={() => setShowDietSettings(false)}
          onSave={handleDietSettingsSaved}
        />
      )}

      <AddFoodModal
        open={showAddModal}
        mealType={addMealType}
        defaultMode={addMode}
        userId={userId}
        logDate={dateYMD}
        onClose={() => setShowAddModal(false)}
        onLogged={handleLogged}
      />

    </div>
  )
}
