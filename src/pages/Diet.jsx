import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Settings, Pencil, Scan,
  Search, Mic, BookOpen, X, Droplets, Info, Camera,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

import DietSettingsSheet from '../components/DietSettingsSheet'
import FoodLoggerSheet from '../components/FoodLoggerSheet'
import VoiceDietRecorder from '../components/VoiceDietRecorder'
import VoiceDietConfirmSheet from '../components/VoiceDietConfirmSheet'
import EditFoodLogSheet from '../components/EditFoodLogSheet'
import FoodPhotoCapture from '../components/FoodPhotoCapture'
import { useAssignedDietPlan } from '../hooks/useAssignedDietPlan'
import AssignedDietPlanView from '../components/diet/AssignedDietPlanView'
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
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch',     label: 'Lunch'     },
  { type: 'snack',     label: 'Snack'     },
  { type: 'dinner',    label: 'Dinner'    },
]

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
    <div style={{ position: 'fixed', top: 16, left: 0, right: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 16px', pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto', width: '100%', maxWidth: 360, backgroundColor: "var(--text-primary)", borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', borderLeft: '3px solid var(--success)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
          <span style={{ color: "var(--bg-card)", fontSize: 13, flex: 1, lineHeight: 1.4 }}>{t.message}</span>
          <button onClick={() => onRemove(t.id)} style={{ color: "var(--text-secondary)", background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex' }}>
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
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Diet() {
  const { user } = useAuth()
  const userId = user?.id
  const { toasts, addToast, removeToast } = useToasts()

  const { plan: trainerDietPlan } = useAssignedDietPlan()
  const [dietTab, setDietTab] = useState('log') // 'log' | 'trainer'

  const [showDietSettings, setShowDietSettings] = useState(false)
  const [macros, setMacros] = useState(null)
  const [macrosError, setMacrosError] = useState(null)
  const [logs, setLogs] = useState([])
  const [totals, setTotals] = useState({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 })
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addMealType, setAddMealType] = useState('breakfast')
  const [addMode, setAddMode] = useState('search')

  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [voiceParseResult, setVoiceParseResult] = useState(null)

  const [showPhotoCapture, setShowPhotoCapture] = useState(false)
  const [editingLog, setEditingLog] = useState(null)

  const [plan, setPlan] = useState(null)

  const dateYMD = useMemo(() => toYMD(selectedDate), [selectedDate])
  const [waterGlasses, setWaterGlasses] = useState(0)
  const [waterGoalMl, setWaterGoalMl] = useState(2500)
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

      try {
        const { data: savedMacros } = await supabase
          .from('user_macros')
          .select('calories, protein_g, carbs_g, fat_g, water_goal_ml')
          .eq('user_id', userId)
          .maybeSingle()
        if (savedMacros?.calories) {
          macrosData = { calories: savedMacros.calories, protein_g: savedMacros.protein_g, carbs_g: savedMacros.carbs_g, fat_g: savedMacros.fat_g }
          if (savedMacros.water_goal_ml) setWaterGoalMl(savedMacros.water_goal_ml)
        }
      } catch (_) { /* fall through */ }

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

      try {
        const p = await getDietPlan(userId)
        if (!cancelled) setPlan(p)
      } catch (err) {
        if (!cancelled) setPlan(null)
      }

      if (!cancelled) setIsLoading(false)
    }

    loadInit()
    return () => { cancelled = true }
  }, [userId])

  // ── Load food logs ──────────────────────────────────────────────────────────
  async function refreshLogs(dateStr) {
    if (!userId) return
    const d = dateStr || dateYMD
    setLogsLoading(true)
    try {
      const r = await getFoodLogs(userId, d)
      setLogs(Array.isArray(r.logs) ? r.logs : [])
      setTotals(r.totals || { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 })
    } catch (err) {
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

  // ── Water ───────────────────────────────────────────────────────────────────
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

  const [waterGoalError, setWaterGoalError] = useState('')

  async function saveWaterGoal() {
    const l = parseFloat(waterGoalInput)
    if (isNaN(l) || l < 0.5 || l > 6) {
      setWaterGoalError('Enter a value between 0.5L and 6L')
      return
    }
    const ml = Math.round(l * 1000)
    setWaterGoalMl(ml); setWaterEditing(false); setWaterGoalError('')
    if (userId) await supabase.from('users').update({ water_goal_ml: ml }).eq('id', userId)
  }

  function openAdd(mealType, mode = 'search') {
    setAddMealType(mealType); setAddMode(mode); setShowAddModal(true)
  }

  async function handleDeleteLog(id) {
    try { await deleteFoodLog(id); refreshLogs(dateYMD) }
    catch (e) { alert(e.message || 'Failed to delete') }
  }

  function shiftDate(days) {
    const d = new Date(selectedDate); d.setDate(d.getDate() + days); setSelectedDate(d)
  }

  function handleLogged(foodName, calories) {
    refreshLogs(dateYMD)
    if (foodName) addToast(`Logged ${foodName} (${calories} kcal)`)
  }

  function handleDietSettingsSaved({ calories, protein_g, carbs_g, fat_g, water_goal_ml }) {
    setMacros(prev => ({ ...(prev || {}), calories, protein_g, carbs_g, fat_g }))
    setWaterGoalMl(water_goal_ml)
    setShowDietSettings(false)
    addToast('Diet settings saved')
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const DIET_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
  const DIET_MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' }

  const dietTotals = useMemo(() => ({
    calories: Math.round(logs.reduce((s, l) => s + (l.calories  || 0), 0)),
    protein:  Math.round(logs.reduce((s, l) => s + (l.protein_g || 0), 0)),
    carbs:    Math.round(logs.reduce((s, l) => s + (l.carbs_g   || 0), 0)),
    fat:      Math.round(logs.reduce((s, l) => s + (l.fat_g     || 0), 0)),
  }), [logs])

  const dietMealLogs = useMemo(() => {
    const result = {}
    DIET_MEAL_TYPES.forEach(m => { result[m] = logs.filter(l => l.meal_type === m) })
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs])

  const activeGoals = macros
    ? { calories: macros.calories || 2400, protein: macros.protein_g || 180, carbs: macros.carbs_g || 240, fat: macros.fat_g || 70 }
    : { calories: 2400, protein: 180, carbs: 240, fat: 70 }

  const isDietToday = (date) => date.toDateString() === new Date().toDateString()
  const dietPrevStr = () => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
  const dietNextStr = () => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
  const dietLabel   = isDietToday(selectedDate) ? 'Today' : selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  const calorieGoal     = activeGoals.calories
  const caloriesConsumed = dietTotals.calories
  const remaining       = calorieGoal - caloriesConsumed
  const isOver          = remaining < 0

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 100 }}>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── HEADER ── */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 16, position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-primary)' }}>
        <button onClick={() => shiftDate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, color: "var(--text-tertiary)", background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ChevronLeft size={16} color="var(--text-tertiary)" />
          {dietPrevStr()}
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>{dietLabel}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isDietToday(selectedDate) && (
            <button onClick={() => shiftDate(1)}
              style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, color: "var(--text-tertiary)", background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {dietNextStr()}
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </button>
          )}
          <button onClick={() => setShowDietSettings(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
            <Settings size={22} color="var(--text-primary)" />
          </button>
        </div>
      </div>

      {/* ── TAB BAR (only when trainer plan exists) ── */}
      {trainerDietPlan && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 16px 4px', backgroundColor: 'var(--bg-primary)' }}>
          {[
            { key: 'log', label: 'Log' },
            { key: 'trainer', label: 'Trainer Plan' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDietTab(key)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: dietTab === key ? 600 : 400,
                cursor: 'pointer',
                border: dietTab === key ? '1.5px solid var(--border-strong)' : '0.5px solid var(--border)',
                background: dietTab === key ? 'var(--bg-elevated)' : 'transparent',
                color: dietTab === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── TRAINER PLAN VIEW ── */}
      {trainerDietPlan && dietTab === 'trainer' ? (
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', marginBottom: 12, background: 'var(--bg-elevated)', border: '0.5px solid var(--border)', borderRadius: 10 }}>
            <Info size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              This is your trainer-assigned plan. Log your actual food intake in the Log tab.
            </p>
          </div>
          <AssignedDietPlanView plan={trainerDietPlan} />
        </div>
      ) : (
      <>{/* ── CALORIE HERO CARD ── */}

      <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 20, marginLeft: 16, marginRight: 16, marginTop: 8, padding: 20 }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 52, fontWeight: 800, color: "var(--text-primary)", letterSpacing: '-2px', lineHeight: 1, margin: 0 }}>
              {caloriesConsumed}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: '4px 0 0 0' }}>kcal consumed</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>/ {calorieGoal}</p>
            <div style={{
              display: 'inline-block',
              backgroundColor: isOver ? 'var(--error-bg)' : 'var(--success-bg)',
              color: isOver ? 'var(--error)' : 'var(--success)',
              fontSize: 12, fontWeight: 500,
              borderRadius: 999, paddingLeft: 10, paddingRight: 10,
              paddingTop: 4, paddingBottom: 4, marginTop: 4,
            }}>
              {isOver ? `${Math.abs(remaining)} over` : `${remaining} remaining`}
            </div>
          </div>
        </div>

        {/* Calorie progress bar */}
        <div style={{ width: '100%', height: 6, backgroundColor: 'var(--bg-pill)', borderRadius: 3, marginTop: 16, marginBottom: 20 }}>
          <div style={{
            height: '100%', borderRadius: 3,
            backgroundColor: isOver ? 'var(--error)' : "var(--text-primary)",
            width: `${Math.min((caloriesConsumed / calorieGoal) * 100, 100)}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>

        {/* Macro grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
          {[
            { key: 'protein', label: 'PROTEIN', color: '#5B8FF9', goal: activeGoals.protein },
            { key: 'carbs',   label: 'CARBS',   color: '#F6C244', goal: activeGoals.carbs   },
            { key: 'fat',     label: 'FAT',     color: 'var(--error)', goal: activeGoals.fat     },
          ].map(({ key, label, color, goal }, idx) => (
            <div key={key} style={{
              paddingLeft: idx === 0 ? 0 : 4,
              paddingRight: idx === 2 ? 0 : 4,
              borderRight: idx < 2 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{dietTotals[key]}g</span>
              <div style={{ fontSize: 10, fontWeight: 500, color: "var(--text-tertiary)", letterSpacing: '0.08em', marginTop: 2, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>/ {goal}g</div>
              <div style={{ width: '100%', height: 3, backgroundColor: 'var(--bg-pill)', borderRadius: 999, marginTop: 6 }}>
                <div style={{ height: '100%', backgroundColor: color, borderRadius: 999, width: `${Math.min((dietTotals[key] / goal) * 100, 100)}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── QUICK LOG STRIP ── */}
      <div style={{ display: 'flex', overflowX: 'auto', padding: '12px 16px', gap: 8, scrollbarWidth: 'none' }}>
        {/* AI Voice button */}
        <button onClick={() => setShowVoiceRecorder(true)}
          style={{
            backgroundColor: 'var(--text-primary)', border: 'none', borderRadius: 12,
            paddingLeft: 14, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--bg-card)', whiteSpace: 'nowrap',
            cursor: 'pointer', flexShrink: 0,
          }}>
          <Mic size={15} />
          AI Voice
        </button>

        {/* AI Camera button */}
        <button onClick={() => setShowPhotoCapture(true)}
          style={{
            backgroundColor: 'var(--text-primary)', border: 'none', borderRadius: 12,
            paddingLeft: 14, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--bg-card)', whiteSpace: 'nowrap',
            cursor: 'pointer', flexShrink: 0,
          }}>
          <Camera size={15} />
          AI Snap
        </button>

        {[
          { label: 'Search', Icon: Search,   mode: 'search'  },
          { label: 'Scan',   Icon: Scan,     mode: 'camera'  },
          { label: 'Voice',  Icon: Mic,      mode: 'voice'   },
          { label: 'Manual', Icon: Pencil,   mode: 'manual'  },
          { label: 'Saved',  Icon: BookOpen, mode: 'mymeals' },
        ].map(({ label, Icon, mode }) => (
          <button key={label} onClick={() => openAdd(guessMealTypeNow(), mode)}
            style={{
              backgroundColor: "var(--bg-card)", border: '1px solid var(--border)', borderRadius: 12,
              paddingLeft: 14, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: "var(--text-primary)", whiteSpace: 'nowrap',
              cursor: 'pointer', flexShrink: 0,
            }}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── MEAL SECTIONS ── */}
      {DIET_MEAL_TYPES.map(meal => {
        const items = dietMealLogs[meal] || []
        const label = DIET_MEAL_LABELS[meal]
        return (
          <div key={meal}>
            {/* Section header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
              <button onClick={() => openAdd(meal, 'search')}
                style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: "var(--text-primary)", color: "var(--bg-card)", fontSize: 20, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                +
              </button>
            </div>

            {items.length === 0 ? (
              <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 14, marginLeft: 16, marginRight: 16, padding: 16, border: '1px solid var(--bg-pill)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: "var(--text-tertiary)" }}>+ Add food</span>
                <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>— kcal</span>
              </div>
            ) : (
              <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 14, marginLeft: 16, marginRight: 16, overflow: 'hidden' }}>
                {items.map((log, idx) => (
                  <div key={log.id} onClick={() => setEditingLog(log)} style={{
                    padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{log.food_name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                        {Number(log.quantity) || 1} {log.serving_unit || 'serving'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{Math.round(log.calories || 0)} kcal</span>
                      <button onClick={e => { e.stopPropagation(); handleDeleteLog(log.id); }}
                        style={{ fontSize: 18, color: "var(--text-tertiary)", marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0 }}>
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {/* Meal total footer */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--bg-pill)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Total</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      `P: ${Math.round(items.reduce((s, l) => s + (l.protein_g || 0), 0))}g`,
                      `C: ${Math.round(items.reduce((s, l) => s + (l.carbs_g   || 0), 0))}g`,
                      `F: ${Math.round(items.reduce((s, l) => s + (l.fat_g     || 0), 0))}g`,
                    ].map(pill => (
                      <span key={pill} style={{ fontSize: 11, backgroundColor: 'var(--border)', paddingLeft: 8, paddingRight: 8, paddingTop: 3, paddingBottom: 3, borderRadius: 4, color: "var(--text-secondary)" }}>
                        {pill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* ── WATER SECTION ── */}
      <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 14, marginLeft: 16, marginRight: 16, marginTop: 8, padding: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Water</span>
          {waterEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="number" value={waterGoalInput} onChange={e => { setWaterGoalInput(e.target.value); setWaterGoalError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') saveWaterGoal(); if (e.key === 'Escape') { setWaterEditing(false); setWaterGoalError('') } }}
                  step="0.5" min="0.5" max="6" placeholder="e.g. 2.5" autoFocus
                  style={{ width: 80, fontSize: 13, border: `1px solid ${waterGoalError ? 'var(--error)' : 'var(--border)'}`, borderRadius: 8, padding: '2px 8px', textAlign: 'right', outline: 'none' }} />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>L</span>
                <button onClick={saveWaterGoal} style={{ fontSize: 12, color: 'var(--text-cta)', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
                <button onClick={() => { setWaterEditing(false); setWaterGoalError('') }} style={{ fontSize: 12, color: "var(--text-tertiary)", background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
              {waterGoalError && <span style={{ fontSize: 11, color: 'var(--error)' }}>{waterGoalError}</span>}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {(waterGlasses * 250 / 1000).toFixed(1)}L / {(waterGoalMl / 1000).toFixed(1)}L
              </span>
              <button onClick={() => { setWaterGoalInput((waterGoalMl / 1000).toString()); setWaterGoalError(''); setWaterEditing(true) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: "var(--text-tertiary)", display: 'flex', alignItems: 'center' }}>
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Water progress bar */}
        <div style={{ width: '100%', height: 6, backgroundColor: 'var(--bg-pill)', borderRadius: 3, marginTop: 12, marginBottom: 14 }}>
          <div style={{
            height: '100%', backgroundColor: '#5B8FF9', borderRadius: 3,
            width: `${Math.min((waterGlasses * 250 / waterGoalMl) * 100, 100)}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Water circles — one per 250ml up to goal */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 4, paddingRight: 4 }}>
          {Array.from({ length: Math.ceil(waterGoalMl / 250) }, (_, i) => {
            const filled = i < waterGlasses
            return (
              <button key={i} onClick={() => handleWaterChange(waterGlasses === i + 1 ? i : i + 1)}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  backgroundColor: filled ? '#5B8FF9' : "var(--bg-card)",
                  border: filled ? 'none' : '1.5px solid var(--border)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {filled && <Droplets size={14} color="var(--bg-card)" />}
              </button>
            )
          })}
        </div>
      </div>

      </>
      )}

      {/* ── MODALS ── */}
      {showDietSettings && (
        <DietSettingsSheet
          userId={userId}
          onClose={() => setShowDietSettings(false)}
          onSave={handleDietSettingsSaved}
        />
      )}

      <FoodLoggerSheet
        open={showAddModal}
        mealType={addMealType}
        defaultMode={addMode}
        userId={userId}
        logDate={dateYMD}
        onClose={() => setShowAddModal(false)}
        onLogged={handleLogged}
      />

      {showVoiceRecorder && (
        <VoiceDietRecorder
          onParsed={(result) => { setVoiceParseResult(result); setShowVoiceRecorder(false); }}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}

      {showPhotoCapture && (
        <FoodPhotoCapture
          onParsed={(result) => { setVoiceParseResult(result); setShowPhotoCapture(false); }}
          onClose={() => setShowPhotoCapture(false)}
        />
      )}

      {voiceParseResult && (
        <VoiceDietConfirmSheet
          parseResult={voiceParseResult}
          logDate={dateYMD}
          onSaved={(count) => {
            setVoiceParseResult(null);
            addToast(`Logged ${count} item${count !== 1 ? 's' : ''}`);
            refreshLogs(dateYMD);
          }}
          onClose={() => setVoiceParseResult(null)}
        />
      )}

      {editingLog && (
        <EditFoodLogSheet
          logEntry={editingLog}
          onSaved={() => {
            setEditingLog(null);
            addToast('Food entry updated');
            refreshLogs(dateYMD);
          }}
          onClose={() => setEditingLog(null)}
        />
      )}

    </div>
  )
}
