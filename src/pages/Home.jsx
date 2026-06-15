import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { useStreak } from '../hooks/useStreak'
import { apiFetch, getMyGym, getGymOccupancy } from '../utils/api'

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
      stroke="#111111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function DumbbellIcon({ color = '#999' }) {
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

  // ── Existing state ────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null)
  const { current: streakDays } = useStreak(user?.id)

  // ── New state ─────────────────────────────────────────────────────────────
  const [todayWorkout,   setTodayWorkout]   = useState(null)
  const [stats,          setStats]          = useState({ weight: null, calories: 0, prs: 0 })
  const [weightChange,   setWeightChange]   = useState(null)
  const [trainerData,    setTrainerData]    = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [gymData,        setGymData]        = useState(null)

  const [loading,        setLoading]        = useState(true)
  const [weekCompleted,  setWeekCompleted]  = useState(0)
  const [hasNewPlan,     setHasNewPlan]     = useState(false)

  // ── Derived ───────────────────────────────────────────────────────────────
  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there'
  const todayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
  const totalDays = 6
  const isActive  = (path) => location.pathname === path

  // ── Profile fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase.from('users').select('full_name, goal, training_days, role, gym_id')
      .eq('id', user.id).maybeSingle()
      .then(({ data }) => setProfile(data))
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
          supabase.from('food_logs').select('calories')
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

        // Weight
        const w0 = progress?.[0]?.weight_kg ?? null
        const w1 = progress?.[1]?.weight_kg ?? null
        setWeightChange(w0 != null && w1 != null ? +(w0 - w1).toFixed(1) : null)
        setStats({
          weight:   w0,
          calories: (foodLogs ?? []).reduce((s, l) => s + (l.calories ?? 0), 0),
          prs:      prs?.length ?? 0,
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
  useEffect(() => {
    if (!user) return
    apiFetch(`/api/trainer/my-trainer/${user.id}`)
      .then(d => setTrainerData(d))
      .catch(() => setTrainerData(null))
  }, [user])

  // ── Gym fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.gym_id || !user?.id) return
    Promise.all([getMyGym(user.id), getGymOccupancy(profile.gym_id)])
      .then(([gym, occ]) => setGymData({ ...gym, occupancy: occ?.count ?? occ?.occupancy ?? null }))
      .catch(() => setGymData(null))
  }, [profile?.gym_id, user?.id])

  async function handleSkip() {
    if (!user) return
    await supabase.from('workout_logs').insert({
      user_id: user.id,
      started_at: new Date().toISOString(),
      notes: 'Rest day',
      duration_minutes: 0,
      exercises: [],
    }).catch(console.error)
  }

  const hasTrainer = trainerData?.status === 'active'
  const hasGym     = !!profile?.gym_id

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#F7F7F5', paddingBottom: 96 }}>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 — PAGE HEADER
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ paddingTop: 56, paddingLeft: 20, paddingRight: 20, paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* Left */}
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#111111', lineHeight: 1.2, margin: 0 }}>
              {getGreeting(firstName)}
            </h1>
            <p style={{ fontSize: 13, color: '#999999', marginTop: 2 }}>{todayDate}</p>
          </div>
          {/* Bell */}
          <button style={{ width: 36, height: 36, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            <BellIcon />
            <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, background: '#E53E3E', borderRadius: '50%', border: '2px solid #F7F7F5' }} />
          </button>
        </div>
        {/* Thick divider */}
        <div style={{ height: 2, background: '#111111', marginTop: 16, marginBottom: 20, borderRadius: 1 }} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 — TODAY'S WORKOUT CARD
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ margin: '0 20px' }}>
        <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 20 }}>

          {/* A: TODAY label */}
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: 8 }}>
            TODAY
          </p>

          {/* B: Workout title */}
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111111', lineHeight: 1.2, margin: 0 }}>
            {todayWorkout?.name || 'Push A — Chest & Shoulders'}
          </h2>

          {/* C: Meta line */}
          <p style={{ fontSize: 13, color: '#999999', marginTop: 6 }}>
            {todayWorkout?.exercise_count || 6} exercises · ~{todayWorkout?.estimated_duration || 45} min · {todayWorkout?.difficulty || 'Intermediate'}
          </p>

          {/* D: Week progress */}
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 13, color: '#999999', marginBottom: 8 }}>
              Day {Math.min(weekCompleted + 1, totalDays)} of {totalDays} this week
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: totalDays }).map((_, i) => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: i < weekCompleted ? '#111111' : 'transparent',
                  border: i < weekCompleted ? 'none' : '1.5px solid #CCCCCC',
                }} />
              ))}
            </div>
          </div>

          {/* E: Begin button */}
          <button
            onClick={() => navigate('/workout/live', { state: { plan: todayWorkout } })}
            style={{
              width: '100%', height: 52, background: '#111111', borderRadius: 12,
              border: 'none', cursor: 'pointer', marginTop: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseDown={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(0.99)' }}
            onMouseUp={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = '' }}
          >
            <span style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>Begin →</span>
          </button>

          {/* F: Rest link */}
          <button
            onClick={handleSkip}
            style={{ width: '100%', textAlign: 'center', fontSize: 13, color: '#999999', background: 'none', border: 'none', cursor: 'pointer', marginTop: 12, padding: '4px 0' }}
          >
            Rest →
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3 — STATS ROW
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '16px 20px 0' }}>

        {/* Streak */}
        <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#111111' }}>{streakDays}</span>
            <span style={{ fontSize: 16 }}>🔥</span>
          </div>
          <p style={{ fontSize: 11, color: '#999999', marginTop: 4 }}>day streak</p>
        </div>

        {/* Weight */}
        <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#111111' }}>{stats.weight ?? '—'}</span>
            {stats.weight != null && <span style={{ fontSize: 11, color: '#999999', marginLeft: 2, marginBottom: 2 }}>kg</span>}
          </div>
          <p style={{ fontSize: 11, color: '#999999', marginTop: 4 }}>bodyweight</p>
          {weightChange != null && (
            <p style={{ fontSize: 11, fontWeight: 500, marginTop: 2, color: weightChange < 0 ? '#3B6D11' : '#A32D2D' }}>
              {weightChange < 0 ? '↓' : '↑'} {Math.abs(weightChange)} today
            </p>
          )}
        </div>

        {/* Calories */}
        <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#111111' }}>{stats.calories}</span>
            <span style={{ fontSize: 11, color: '#999999', marginBottom: 2 }}>kcal</span>
          </div>
          <p style={{ fontSize: 11, color: '#999999', marginTop: 4 }}>calories</p>
          <p style={{ fontSize: 11, color: '#999999' }}>of 2000</p>
        </div>

        {/* PRs */}
        <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 14 }}>🏆</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#111111' }}>{stats.prs}</span>
          </div>
          <p style={{ fontSize: 11, color: '#999999', marginTop: 4 }}>personal</p>
          <p style={{ fontSize: 11, color: '#999999' }}>records</p>
          <p style={{ fontSize: 10, color: '#BBBBBB' }}>this month</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 — QUICK ACTIONS (2×2 grid)
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, margin: '16px 20px 0' }}>
        {[
          {
            label: 'Log food', path: '/diet',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/>
              </svg>
            ),
          },
          {
            label: 'View progress', path: '/progress',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            ),
          },
          {
            label: 'Community', path: '/community',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <path d="M12 11V7"/>
                <circle cx="12" cy="5" r="2"/>
                <line x1="8" y1="15" x2="8" y2="15" strokeWidth="2.5"/>
                <line x1="12" y1="15" x2="12" y2="15" strokeWidth="2.5"/>
                <line x1="16" y1="15" x2="16" y2="15" strokeWidth="2.5"/>
              </svg>
            ),
          },
        ].map(({ label, path, icon }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12,
              padding: 16, height: 56, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {icon}
              <span style={{ fontSize: 14, fontWeight: 500, color: '#111111' }}>{label}</span>
            </div>
            <span style={{ fontSize: 18, color: '#CCCCCC', lineHeight: 1 }}>›</span>
          </button>
        ))}

        {hasGym && (
          <button
            onClick={() => navigate('/my-gym')}
            style={{
              background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12,
              padding: 16, height: 56, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/>
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                <path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#111111' }}>My Gym</span>
            </div>
            <span style={{ fontSize: 18, color: '#CCCCCC', lineHeight: 1 }}>›</span>
          </button>
        )}

        {hasTrainer && (
          <button
            onClick={() => navigate('/my-trainer')}
            style={{
              background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12,
              padding: 16, height: 56, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <polyline points="16 11 18 13 22 9"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#111111' }}>My Trainer</span>
            </div>
            <span style={{ fontSize: 18, color: '#CCCCCC', lineHeight: 1 }}>›</span>
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5 — TRAINER CARD
      ═══════════════════════════════════════════════════════════ */}
      {hasTrainer && (
        <div style={{ margin: '16px 20px 0' }}>
          <div style={{
            background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12,
            padding: '16px 16px 16px 0', display: 'flex',
          }}>
            {/* Left accent bar */}
            <div style={{ width: 3, background: '#0F6E56', borderRadius: 2, flexShrink: 0, alignSelf: 'stretch', marginRight: 14 }} />
            {/* Content */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: 6 }}>
                FROM YOUR TRAINER
              </p>
              {hasNewPlan ? (
                <>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111111', lineHeight: 1.3 }}>
                    New plan assigned by {trainerData?.trainer?.full_name || 'your trainer'}
                  </p>
                  <p style={{ fontSize: 13, color: '#999999', marginTop: 3 }}>Starting today</p>
                  <button
                    onClick={() => navigate('/my-trainer')}
                    style={{ fontSize: 13, fontWeight: 500, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 10 }}
                  >
                    View plan →
                  </button>
                </>
              ) : (
                <div onClick={() => navigate('/my-trainer')} style={{ cursor: 'pointer' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111111', lineHeight: 1.3 }}>
                    {trainerData?.trainer?.full_name || 'Your Trainer'}
                  </p>
                  <p style={{ fontSize: 13, color: '#999999', marginTop: 3 }}>View plans & chat</p>
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
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: 10 }}>
            RECENT ACTIVITY
          </p>
          {recentActivity.map((ev, i) => (
            <div key={i} style={{
              background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12,
              padding: '14px 16px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 36, height: 36, background: '#F1EFE8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DumbbellIcon />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.label}</p>
                <p style={{ fontSize: 12, color: '#999999', marginTop: 2 }}>{formatRelativeTime(ev.date)}</p>
              </div>
              {ev.xp && <span style={{ fontSize: 13, fontWeight: 600, color: '#D97706', flexShrink: 0 }}>{ev.xp}</span>}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
