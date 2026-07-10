import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { useStreak } from '../hooks/useStreak'
import { apiFetch, getMyGym, getGymOccupancy, getMacros, calculateMacros, getXPProfile, useStreakFreeze } from '../utils/api'
import PrimaryButton from '../components/PrimaryButton'
import AIPlanGenerator from '../components/AIPlanGenerator'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(name) {
  const h = new Date().getHours()
  if (h < 12) return `Good morning, ${name}`
  if (h < 17) return `Afternoon, ${name}`
  return `Good evening, ${name}`
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

function startOfWeek() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Inline SVGs ─────────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function DumbbellIcon({ color = "var(--text-tertiary)" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h11"/>
      <path d="M6.5 17.5h11"/>
      <line x1="3" y1="9" x2="3" y2="15" strokeWidth="3"/>
      <line x1="21" y1="9" x2="21" y2="15" strokeWidth="3"/>
      <line x1="6" y1="6" x2="6" y2="18" strokeWidth="2.5"/>
      <line x1="18" y1="6" x2="18" y2="18" strokeWidth="2.5"/>
    </svg>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { user, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const { setShowJoinGym, setShowJoinTrainer } = useOutletContext() || {}

  // ── Existing state ────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null)
  const [macroGoals, setMacroGoals] = useState(null)
  const { current: streakDays } = useStreak(user?.id)

  // ── New state ─────────────────────────────────────────────────────────────
  const [todayWorkout,   setTodayWorkout]   = useState(null)
  const [stats,          setStats]          = useState({ weight: null, calories: 0, prs: 0 })
  const [weightChange,   setWeightChange]   = useState(null)
  const [trainerData,    setTrainerData]    = useState(null)
  const [trainerLoadError, setTrainerLoadError] = useState(false)
  const [recentActivity, setRecentActivity] = useState([])
  const [gymData,        setGymData]        = useState(null)

  const [loading,        setLoading]        = useState(true)
  const [weekCompleted,  setWeekCompleted]  = useState(0)
  const [hasNewPlan,     setHasNewPlan]     = useState(false)
  const [showAIBuilder,  setShowAIBuilder]  = useState(false)
  const [todayLogs,      setTodayLogs]      = useState([])
  const [todayMacros,    setTodayMacros]    = useState({ protein: 0, carbs: 0, fat: 0 })
  const [freezesRemaining, setFreezesRemaining] = useState(null)
  const [restFreezeResult, setRestFreezeResult] = useState(null)

  // ── Derived ───────────────────────────────────────────────────────────────
  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there'
  const todayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
  const totalDays = 6
  const isActive  = (path) => location.pathname === path

  const todayStr      = new Date().toISOString().split('T')[0]
  const workedOutToday = todayLogs.some(l => l.started_at?.startsWith(todayStr) && l.notes !== 'Rest day')
  const restedToday    = todayLogs.some(l => l.started_at?.startsWith(todayStr) && l.notes === 'Rest day')
  const hasPlan        = !!todayWorkout

  // ── Profile fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase.from('users').select('full_name, goal, training_days, role, gym_id')
      .eq('id', user.id).maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [user])

  // ── Macro goals fetch (same source of truth as Diet page) ──────────────────
  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function loadMacroGoals() {
      let macrosData = null
      try {
        const { data: savedMacros } = await supabase
          .from('user_macros')
          .select('calories, protein_g, carbs_g, fat_g')
          .eq('user_id', user.id)
          .maybeSingle()
        if (savedMacros?.calories) macrosData = savedMacros
      } catch (_) { /* fall through */ }

      if (!macrosData) {
        try {
          const r = await getMacros(user.id)
          macrosData = r?.macros ?? null
          if (!macrosData) {
            const calc = await calculateMacros(user.id)
            macrosData = calc?.macros ?? null
          }
        } catch (_) {
          try {
            const calc = await calculateMacros(user.id)
            macrosData = calc?.macros ?? null
          } catch (_) { /* ignore */ }
        }
      }

      if (!cancelled) setMacroGoals(macrosData)
    }
    loadMacroGoals()
    return () => { cancelled = true }
  }, [user])

  // ── Main data fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      try {
        const userId    = user.id
        const weekStart = startOfWeek()
        const monStart  = startOfMonth()
        const today     = new Date().toISOString().split('T')[0]

        const [
          { data: assignedPlans },
          { data: userPlans },
          { data: workoutLogs },
          { data: progress },
          { data: foodLogs },
          { data: prs },
          { data: recentLogs },
        ] = await Promise.all([
          supabase.from('assigned_plans').select('*')
            .eq('client_id', userId).eq('status', 'active').eq('type', 'workout'),
          supabase.from('user_workout_plans').select('*')
            .eq('user_id', userId).eq('is_active', true).limit(1),
          supabase.from('workout_logs').select('started_at, exercises, notes')
            .eq('user_id', userId).gte('started_at', weekStart.toISOString()),
          supabase.from('progress_entries').select('weight_kg, created_at')
            .eq('user_id', userId).order('created_at', { ascending: false }).limit(2),
          supabase.from('food_logs').select('calories, protein_g, carbs_g, fat_g')
            .eq('user_id', userId).eq('log_date', today),
          supabase.from('personal_records').select('id')
            .eq('user_id', userId).gte('achieved_at', monStart.toISOString()),
          supabase.from('workout_logs').select('started_at, exercises, notes')
            .eq('user_id', userId).order('started_at', { ascending: false }).limit(5),
        ])

        if (cancelled) return

        // Today's workout
        const activePlan = assignedPlans?.[0] ?? userPlans?.[0] ?? null
        let workout = null
        if (activePlan?.plan_data?.days?.length) {
          const origin = activePlan.starts_at ?? activePlan.created_at ?? new Date().toISOString()
          const idx = Math.max(0,
            Math.floor((Date.now() - new Date(origin)) / 86400000) %
            activePlan.plan_data.days.length
          )
          workout = activePlan.plan_data.days[idx] ?? null
        }
        setTodayWorkout(workout)
        setWeekCompleted(workoutLogs?.length ?? 0)
        setTodayLogs(workoutLogs ?? [])

        // Weight
        const w0 = progress?.[0]?.weight_kg ?? null
        const w1 = progress?.[1]?.weight_kg ?? null
        setWeightChange(w0 != null && w1 != null ? +(w0 - w1).toFixed(1) : null)
        setStats({
          weight:   w0,
          calories: (foodLogs ?? []).reduce((s, l) => s + (l.calories ?? 0), 0),
          prs:      prs?.length ?? 0,
        })
        setTodayMacros({
          protein: Math.round((foodLogs ?? []).reduce((s, l) => s + (l.protein_g ?? 0), 0)),
          carbs:   Math.round((foodLogs ?? []).reduce((s, l) => s + (l.carbs_g   ?? 0), 0)),
          fat:     Math.round((foodLogs ?? []).reduce((s, l) => s + (l.fat_g     ?? 0), 0)),
        })

        // Recent activity
        setRecentActivity(
          (recentLogs ?? []).slice(0, 4).map(l => ({
            label:  l.notes && l.notes !== 'Rest day' ? l.notes : 'Workout completed',
            date:   l.started_at,
            xp:     l.notes === 'Rest day' ? null : `+${(l.exercises?.length ?? 0) * 2} XP`,
            isRest: l.notes === 'Rest day',
          }))
        )

        // New plan?
        if (assignedPlans?.length) {
          setHasNewPlan(assignedPlans.some(p => new Date(p.created_at) > Date.now() - 86400000))
        }
      } catch (err) {
        console.error('[Home] load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  // ── Trainer fetch ─────────────────────────────────────────────────────────
  // The backend returns 200 + null body for "no trainer linked" — it never
  // 404s for that case. So anything caught here (401/403/500/network) is a
  // genuine failure, not a real unlinked state; don't conflate the two.
  useEffect(() => {
    if (!user) return
    setTrainerLoadError(false)
    apiFetch(`/api/trainer/my-trainer/${user.id}`)
      .then(d => setTrainerData(d))
      .catch(() => { setTrainerData(null); setTrainerLoadError(true) })
  }, [user])

  // ── Gym fetch ─────────────────────────────────────────────────────────────
  // gym_memberships (via getMyGym) is the source of truth for gym linkage —
  // users.gym_id is a denormalized field that can go stale, so it must not
  // gate this fetch or decide "linked" on its own.
  useEffect(() => {
    if (!user?.id) return
    getMyGym(user.id)
      .then(async (gym) => {
        if (!gym?.linked || !gym?.gym?.id) {
          setGymData(null)
          return
        }
        const occ = await getGymOccupancy(gym.gym.id).catch(() => null)
        setGymData({ ...gym, occupancy: occ?.count ?? occ?.occupancy ?? null })
      })
      .catch(() => setGymData(null))
  }, [user?.id])

  // ── XP profile fetch (freezes remaining) ──────────────────────────────────
  useEffect(() => {
    if (!user) return
    getXPProfile()
      .then(p => setFreezesRemaining(p?.freezesRemaining ?? null))
      .catch(() => setFreezesRemaining(null))
  }, [user])

  async function handleSkip() {
    if (!user) return

    // Rest days draw from the same streak-freeze pool as the manual "Use a
    // freeze" button — same endpoint, same user_xp.freezes_remaining counter.
    let freezeResult = null
    try {
      freezeResult = await useStreakFreeze()
      if (freezeResult?.success && typeof freezeResult.freezesRemaining === 'number') {
        setFreezesRemaining(freezeResult.freezesRemaining)
      }
    } catch (err) {
      console.error('[Home] freeze error:', err)
    }
    setRestFreezeResult(freezeResult)

    // Log the rest day regardless of freeze outcome — it's still a real,
    // record-keeping entry even when there's no freeze left to protect it.
    const startedAt = new Date().toISOString()
    const { error } = await supabase.from('workout_logs').insert({
      user_id: user.id,
      started_at: startedAt,
      notes: 'Rest day',
      duration_minutes: 0,
      exercises: [],
    })
    if (error) {
      console.error('[Home] handleSkip error:', error)
      return
    }
    setTodayLogs(logs => [...logs, { started_at: startedAt, notes: 'Rest day', exercises: [] }])
  }

  // Was today's rest day left unprotected because the monthly freeze pool is
  // exhausted? (Other rejection reasons — streak already intact / already
  // active today — mean no protection was needed in the first place.)
  const restUnprotected = restFreezeResult
    ? restFreezeResult.success === false && restFreezeResult.reason === 'No freezes remaining'
    : freezesRemaining === 0

  const hasTrainer = trainerData?.status === 'active'
  const hasGym     = !!gymData?.linked

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-primary)', paddingBottom: 96 }}>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 — PAGE HEADER
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ paddingTop: 56, paddingLeft: 20, paddingRight: 20, paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* Left */}
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2, margin: 0 }}>
              {getGreeting(firstName)}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{todayDate}</p>
          </div>
          {/* Bell */}
          <button style={{ width: 36, height: 36, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            <BellIcon />
            <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, background: 'var(--error)', borderRadius: '50%', border: '2px solid var(--bg-primary)' }} />
          </button>
        </div>
        {/* Thick divider */}
        <div style={{ height: 2, background: "var(--text-primary)", marginTop: 16, marginBottom: 20, borderRadius: 1 }} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 — TODAY'S WORKOUT CARD
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ margin: '0 20px' }}>
        <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 16, padding: 20 }}>

          {/* State C — worked out today */}
          {workedOutToday ? (
            <>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--success)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                DONE TODAY
              </p>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {todayWorkout?.name || 'Workout completed'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6 }}>
                Great work — rest up or log another session
              </p>
              <button
                onClick={() => navigate('/workout')}
                style={{ marginTop: 14, fontSize: 13, fontWeight: 500, color: 'var(--text-cta)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Start another →
              </button>
            </>
          ) : restedToday ? (
            /* State D — rest day marked */
            <>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                TODAY
              </p>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Rest day
              </h2>
              {restUnprotected ? (
                <p style={{ fontSize: 13, color: 'var(--error)', marginTop: 6 }}>
                  No freezes left this month — this rest day won't protect your streak.
                </p>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6 }}>
                  Recovery is part of the plan. See you tomorrow.
                </p>
              )}
            </>
          ) : hasPlan ? (
            /* State B — plan exists, not yet done */
            <>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                TODAY
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
                {todayWorkout.name}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6 }}>
                {todayWorkout.exercise_count ?? '—'} exercises
                {todayWorkout.estimated_duration ? ` · ~${todayWorkout.estimated_duration} min` : ''}
                {todayWorkout.difficulty ? ` · ${todayWorkout.difficulty}` : ''}
              </p>
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                  Day {Math.min(weekCompleted + 1, totalDays)} of {totalDays} this week
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Array.from({ length: totalDays }).map((_, i) => (
                    <div key={i} style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: i < weekCompleted ? 'var(--text-primary)' : 'transparent',
                      border: i < weekCompleted ? 'none' : '1.5px solid var(--text-tertiary)',
                    }} />
                  ))}
                </div>
              </div>
              <PrimaryButton
                onClick={() => navigate('/workout/live', { state: { plan: todayWorkout } })}
                style={{ marginTop: 16, borderRadius: 12 }}
              >
                Begin →
              </PrimaryButton>
              <button
                onClick={handleSkip}
                style={{ width: '100%', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 12, padding: '4px 0' }}
              >
                Mark as rest →
              </button>
            </>
          ) : (
            /* State A — no plan */
            <>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                TODAY
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
                No plan yet
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6, marginBottom: 16 }}>
                Create a structured plan or jump straight into a session.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <PrimaryButton
                  onClick={() => navigate('/workout/plans/new')}
                  style={{ flex: 1, borderRadius: 12 }}
                >
                  Create plan
                </PrimaryButton>
                <button
                  onClick={() => navigate('/workout/live')}
                  style={{
                    flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 15, fontWeight: 600,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text-primary)', cursor: 'pointer',
                  }}
                >
                  Empty workout
                </button>
              </div>
              <button
                onClick={() => setShowAIBuilder(true)}
                style={{
                  width: '100%', marginTop: 8, padding: '11px 0', borderRadius: 12,
                  fontSize: 14, fontWeight: 500, border: 'none',
                  background: 'var(--bg-pill)', color: 'var(--text-primary)', cursor: 'pointer',
                }}
              >
                Build with AI →
              </button>
              <button
                onClick={handleSkip}
                style={{ width: '100%', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 12, padding: '4px 0' }}
              >
                Mark as rest →
              </button>
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2.5 — TODAY'S NUTRITION CARD
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ margin: '12px 20px 0' }}>
        <div
          onClick={() => navigate('/diet')}
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 16, padding: 16, cursor: 'pointer' }}
        >

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: 0 }}>
              TODAY'S NUTRITION
            </p>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {stats.calories} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: 12 }}>/ {macroGoals?.calories ?? 2000} kcal</span>
            </span>
          </div>

          {/* Progress bar */}
          {(() => {
            const goal = macroGoals?.calories ?? 2000
            const pct = Math.min(100, Math.round((stats.calories / goal) * 100))
            return (
              <div style={{ height: 5, background: 'var(--bg-pill)', borderRadius: 99, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--text-primary)', borderRadius: 99, transition: 'width 0.3s ease' }} />
              </div>
            )
          })()}

          {/* Macro pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Protein', value: todayMacros.protein, unit: 'g', goal: macroGoals?.protein_g ?? 150 },
              { label: 'Carbs',   value: todayMacros.carbs,   unit: 'g', goal: macroGoals?.carbs_g   ?? 200 },
              { label: 'Fat',     value: todayMacros.fat,      unit: 'g', goal: macroGoals?.fat_g     ?? 65  },
            ].map(({ label, value, unit, goal }) => {
              const pct = Math.min(100, Math.round((value / goal) * 100))
              const isWarn = value > goal && (label === 'Carbs' || label === 'Fat')
              return (
                <div key={label} style={{ flex: 1, background: isWarn ? 'rgba(220,53,69,0.12)' : 'var(--bg-pill)', borderRadius: 10, padding: '8px 10px', textAlign: 'center', overflow: 'hidden' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isWarn ? 'var(--error)' : 'var(--text-primary)' }}>{value}{unit}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ height: 3, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--text-primary)', borderRadius: 99 }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Log buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={e => { e.stopPropagation(); navigate('/diet?log=voice') }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 500,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-primary)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3"/>
                <path d="M5 10a7 7 0 0 0 14 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="8" y1="22" x2="16" y2="22"/>
              </svg>
              Voice
            </button>
            <button
              onClick={e => { e.stopPropagation(); navigate('/diet?log=snap') }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 500,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-primary)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Snap
            </button>
            <button
              onClick={e => { e.stopPropagation(); navigate('/diet?log=manual') }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 500,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-primary)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Search
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3 — STATS ROW
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '16px 20px 0' }}>

        {/* Streak — tap to open XP profile */}
        <button
          onClick={() => navigate('/xp')}
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '12px 10px', textAlign: 'left', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{streakDays}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c-4 5-4 9-1 12a5 5 0 0 0 9-1c0-5-3-7-8-11z"/>
              <path d="M9 16c0 2 1.3 3 3 3"/>
            </svg>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>day streak</p>
        </button>

        {/* Weight */}
        <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{stats.weight ?? '—'}</span>
            {stats.weight != null && <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 2, marginBottom: 2 }}>kg</span>}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>bodyweight</p>
          {weightChange != null && (
            <p style={{ fontSize: 11, fontWeight: 500, marginTop: 2, color: weightChange < 0 ? 'var(--success)' : 'var(--error)' }}>
              {weightChange < 0 ? '↓' : '↑'} {Math.abs(weightChange)} today
            </p>
          )}
        </div>

        {/* PRs */}
        <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
            </svg>
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{stats.prs}</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>personal</p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>records</p>
          <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>this month</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 — QUICK ACTIONS (2×2 grid)
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, margin: '16px 20px 0' }}>
        {[
          {
            label: 'View progress', path: '/progress',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            ),
          },
          {
            label: 'Community', path: '/community',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            ),
          },
          {
            label: 'AI Coach', path: '/chat',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <path d="M12 11V7"/>
                <circle cx="12" cy="5" r="2"/>
                <line x1="8" y1="15" x2="8" y2="15" strokeWidth="2.5"/>
                <line x1="12" y1="15" x2="12" y2="15" strokeWidth="2.5"/>
                <line x1="16" y1="15" x2="16" y2="15" strokeWidth="2.5"/>
              </svg>
            ),
          },
          {
            label: 'Leaderboard', path: '/leaderboard',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
            ),
          },
        ].map(({ label, path, icon }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12,
              padding: 16, height: 56, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {icon}
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{label}</span>
            </div>
            <span style={{ fontSize: 18, color: "var(--text-tertiary)", lineHeight: 1 }}>›</span>
          </button>
        ))}

        {/* My Gym — always visible */}
        <button
          onClick={() => hasGym ? navigate('/my-gym') : setShowJoinGym?.(true)}
          style={{
            background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12,
            padding: 16, height: 56, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={hasGym ? "var(--text-primary)" : "var(--text-tertiary)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/>
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
              <path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
            </svg>
            <div>
              <span style={{ fontSize: 14, fontWeight: 500, color: hasGym ? "var(--text-primary)" : "var(--text-tertiary)", display: 'block' }}>My Gym</span>
              {!hasGym && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Tap to join</span>}
            </div>
          </div>
          <span style={{ fontSize: 18, color: "var(--text-tertiary)", lineHeight: 1 }}>{hasGym ? '›' : '+'}</span>
        </button>

        {/* My Trainer — always visible */}
        <button
          onClick={() => {
            if (trainerLoadError) return apiFetch(`/api/trainer/my-trainer/${user.id}`).then(setTrainerData).then(() => setTrainerLoadError(false)).catch(() => setTrainerLoadError(true))
            return hasTrainer ? navigate('/my-trainer') : setShowJoinTrainer?.(true)
          }}
          style={{
            background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12,
            padding: 16, height: 56, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={hasTrainer ? "var(--text-primary)" : "var(--text-tertiary)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <polyline points="16 11 18 13 22 9"/>
            </svg>
            <div>
              <span style={{ fontSize: 14, fontWeight: 500, color: hasTrainer ? "var(--text-primary)" : "var(--text-tertiary)", display: 'block' }}>My Trainer</span>
              {trainerLoadError ? (
                <span style={{ fontSize: 11, color: "var(--error)" }}>Couldn't load — tap to retry</span>
              ) : !hasTrainer && (
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Tap to link</span>
              )}
            </div>
          </div>
          <span style={{ fontSize: 18, color: "var(--text-tertiary)", lineHeight: 1 }}>{hasTrainer ? '›' : '+'}</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5 — TRAINER CARD
      ═══════════════════════════════════════════════════════════ */}
      {hasTrainer && (
        <div style={{ margin: '16px 20px 0' }}>
          <div style={{
            background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12,
            padding: '16px 16px 16px 0', display: 'flex',
          }}>
            {/* Left accent bar */}
            <div style={{ width: 3, background: 'var(--success)', borderRadius: 2, flexShrink: 0, alignSelf: 'stretch', marginRight: 14 }} />
            {/* Content */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: "var(--text-tertiary)", marginBottom: 6 }}>
                FROM YOUR TRAINER
              </p>
              {hasNewPlan ? (
                <>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
                    New plan assigned by {trainerData?.trainer?.full_name || 'your trainer'}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 3 }}>Starting today</p>
                  <button
                    onClick={() => navigate('/my-trainer')}
                    style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-cta)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 10 }}
                  >
                    View plan →
                  </button>
                </>
              ) : (
                <div onClick={() => navigate('/my-trainer')} style={{ cursor: 'pointer' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
                    {trainerData?.trainer?.full_name || 'Your Trainer'}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 3 }}>View plans & chat</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6 — RECENT ACTIVITY
      ═══════════════════════════════════════════════════════════ */}
      {recentActivity.length > 0 && (
        <div style={{ margin: '20px 20px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: "var(--text-tertiary)", marginBottom: 10 }}>
            RECENT ACTIVITY
          </p>
          {recentActivity.map((ev, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12,
              padding: '14px 16px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 36, height: 36, background: 'var(--bg-pill)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DumbbellIcon />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.label}</p>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{formatRelativeTime(ev.date)}</p>
              </div>
              {ev.xp && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--xp-gold)', flexShrink: 0 }}>{ev.xp}</span>}
            </div>
          ))}
        </div>
      )}

      {showAIBuilder && <AIPlanGenerator onClose={() => setShowAIBuilder(false)} />}
    </div>
  )
}
