import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings, Flame, Snowflake, Dumbbell, Utensils, TrendingUp, Users,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import {
  getXPProfile, getXPEvents, getXPChallenges, getMuscleBalance,
} from '../utils/api'
import {
  LEVEL_THRESHOLDS, getLevelName, getMultiplierColors, SOURCE_CONFIG,
  MUSCLE_GROUPS, formatTimeAgo,
} from '../utils/xpConstants'
import StreakFreezeSheet from '../components/StreakFreezeSheet'

const SOURCE_ICONS = {
  train: Dumbbell, fuel: Utensils, improve: TrendingUp, show_up: Flame, connect: Users,
}

const SECTION_LABEL = {
  fontSize: 11, fontWeight: 500, color: 'var(--text-muted)',
  letterSpacing: '0.08em', textTransform: 'uppercase',
  marginTop: 24, marginBottom: 10,
}

const CARD = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: 16,
}

function CircularRing({ size = 80, stroke = 4, progress = 0, children }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - Math.min(1, Math.max(0, progress)) * circumference
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="var(--bg-input)" strokeWidth={stroke} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="var(--accent)" strokeWidth={stroke} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  )
}

function ChallengeRing({ size = 20, progress = 0, completed = false }) {
  if (completed) return <CheckCircle2 size={size} color="var(--success)" fill="var(--success-bg)" />
  const stroke = 2.5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - Math.min(1, Math.max(0, progress)) * circumference
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--bg-input)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke="var(--accent)" strokeWidth={stroke} fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

export default function XPProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile,    setProfile]    = useState(null)
  const [events,     setEvents]     = useState([])
  const [challenges, setChallenges] = useState([])
  const [balance,    setBalance]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [freezeOpen, setFreezeOpen] = useState(false)

  const loadAll = async () => {
    try {
      const [p, e, c, m] = await Promise.all([
        getXPProfile().catch(() => null),
        getXPEvents(1, 30).catch(() => ({ events: [] })),
        getXPChallenges().catch(() => ({ challenges: [] })),
        getMuscleBalance().catch(() => null),
      ])
      setProfile(p)
      setEvents(e?.events || [])
      setChallenges(Array.isArray(c) ? c : (c?.challenges || []))
      setBalance(m)
    } catch (err) {
      console.error('[XPProfile] load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user) loadAll() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ───────────────────────────────────────────────────────
  const level         = profile?.level ?? 1
  const levelName     = profile?.levelName ?? getLevelName(level)
  const totalXP       = profile?.totalXP ?? 0
  const currentBase   = LEVEL_THRESHOLDS[level] ?? 0
  const nextLevel     = level < 20 ? level + 1 : null
  const nextLevelXP   = profile?.nextLevelXP ?? (nextLevel ? LEVEL_THRESHOLDS[nextLevel] : null)
  const xpInLevel     = totalXP - currentBase
  const xpNeeded      = nextLevelXP != null ? (nextLevelXP - currentBase) : 1
  const levelProgress = nextLevelXP != null ? Math.max(0, Math.min(1, xpInLevel / xpNeeded)) : 1
  const xpToNext      = nextLevelXP != null ? Math.max(0, nextLevelXP - totalXP) : 0

  const streak       = profile?.currentStreak ?? 0
  const multiplier   = profile?.streakMultiplier ?? 1
  const multColors   = getMultiplierColors(multiplier)
  const freezes      = profile?.freezesRemaining ?? 0
  const lastActive   = profile?.lastActiveDate

  // 7-day streak dots ending today (Mon..Sun labels)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (6 - i))
    return { dateStr: d.toISOString().split('T')[0], label: 'MTWTFSS'[(d.getDay() + 6) % 7] }
  })

  // Active dates inferred from events (source = show_up daily_active)
  const activeDates = new Set(
    events
      .filter(ev => ev.source === 'show_up' || ev.action === 'daily_active')
      .map(ev => (ev.created_at || '').split('T')[0])
  )
  if (lastActive) activeDates.add(lastActive)

  // ── Weekly XP per source ─────────────────────────────────────────────────
  const weekStart = (() => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - ((day + 6) % 7)); d.setHours(0,0,0,0); return d })()
  const weeklyBySource = events.reduce((acc, ev) => {
    if (new Date(ev.created_at) < weekStart) return acc
    const src = ev.source || 'train'
    acc[src] = (acc[src] || 0) + (ev.final_xp || 0)
    return acc
  }, {})
  const weeklyTotal = Object.values(weeklyBySource).reduce((s, v) => s + v, 0)
  const weeklyMax = Math.max(1, ...Object.values(weeklyBySource))

  const sourceOrder = ['train', 'fuel', 'improve', 'show_up', 'connect']

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '56px 20px', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 56, paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0 }}>
          Your progress
        </h1>
        <button
          onClick={() => setFreezeOpen(true)}
          aria-label="Streak freezes"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <Settings size={22} color="var(--text-secondary)" />
        </button>
      </div>

      {/* Level + XP Hero Card */}
      <div style={{ margin: '20px 20px 0' }}>
        <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 16 }}>
          <CircularRing progress={levelProgress}>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{level}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>{levelName}</span>
          </CircularRing>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-primary)', lineHeight: 1 }}>
                {totalXP.toLocaleString()}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>XP</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Level {level} · {levelName}
            </p>
            <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(levelProgress * 100)}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {nextLevel != null ? `${xpToNext.toLocaleString()} XP to Level ${nextLevel}` : 'Max level reached'}
            </p>
          </div>
        </div>
      </div>

      {/* Streak + Multiplier */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '12px 20px 0' }}>
        {/* Streak box */}
        <div style={{ ...CARD, borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <Flame size={18} color={streak > 0 ? 'var(--error)' : 'var(--text-muted)'} fill={streak > 0 ? 'var(--error-bg)' : 'none'} />
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{streak}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>day streak</p>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, gap: 4 }}>
            {last7.map(({ dateStr, label }, i) => {
              const isToday = dateStr === todayStr
              const active = activeDates.has(dateStr)
              const dotStyle = isToday && !active
                ? { background: 'transparent', border: '1.5px solid var(--accent)' }
                : active
                  ? { background: 'var(--accent)', border: '1.5px solid var(--accent)' }
                  : { background: 'var(--border)', border: '1.5px solid var(--border)' }
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, ...dotStyle }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
            <Snowflake size={12} color="var(--text-muted)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{freezes} freezes left</span>
          </div>
        </div>

        {/* Multiplier box */}
        <div style={{ ...CARD, borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Multiplier</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: 8 }}>
            <span style={{
              background: multColors.bg, color: multColors.text,
              fontSize: 14, fontWeight: 800,
              padding: '4px 10px', borderRadius: 8,
            }}>
              {multiplier}x
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
            Streak XP boost
          </p>
        </div>
      </div>

      {/* This Week — XP sources */}
      <div style={{ margin: '0 20px' }}>
        <p style={SECTION_LABEL}>THIS WEEK</p>
        <div style={CARD}>
          {sourceOrder.map((src, i) => {
            const conf = SOURCE_CONFIG[src]
            const Icon = SOURCE_ICONS[src]
            const xp = weeklyBySource[src] || 0
            const pct = Math.round((xp / weeklyMax) * 100)
            return (
              <div key={src} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : '0.5px solid var(--divider)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 16,
                  background: conf.bg, color: conf.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={16} color={conf.color} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', minWidth: 60 }}>
                  {conf.label}
                </span>
                <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: conf.color, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', minWidth: 36, textAlign: 'right' }}>
                  {xp}
                </span>
              </div>
            )
          })}
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10, textAlign: 'right' }}>
            {weeklyTotal.toLocaleString()} XP this week
          </p>
        </div>
      </div>

      {/* Weekly Challenges */}
      <div style={{ margin: '0 20px' }}>
        <p style={SECTION_LABEL}>WEEKLY CHALLENGES</p>
        <div style={CARD}>
          {challenges.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
              Challenges generate on Monday
            </p>
          ) : (
            challenges.map((c, i) => {
              const target = Number(c.target_value) || 1
              const current = Number(c.current_value ?? c.progress ?? 0)
              const progress = Math.min(1, current / target)
              const done = !!c.completed
              return (
                <div key={c.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderTop: i === 0 ? 'none' : '0.5px solid var(--divider)',
                }}>
                  <ChallengeRing progress={progress} completed={done} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                      {c.title}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {c.description}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 8,
                    background: done ? 'var(--success-bg)' : 'var(--bg-pill)',
                    color: done ? 'var(--success)' : 'var(--text-secondary)',
                    flexShrink: 0,
                  }}>
                    +{c.xp_reward} XP
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Muscle Balance */}
      <div style={{ margin: '0 20px' }}>
        <p style={SECTION_LABEL}>MUSCLE BALANCE</p>
        <div style={CARD}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {MUSCLE_GROUPS.map(group => {
              const trained = balance?.trainedGroups?.includes(group)
              const skipped = balance?.skippedGroups?.includes(group)
              const penaltyActive = (balance?.penalty || 0) > 0 && skipped
              const dotColor = trained
                ? 'var(--accent)'
                : penaltyActive
                  ? 'var(--error)'
                  : 'var(--border)'
              const textColor = trained
                ? 'var(--text-primary)'
                : penaltyActive
                  ? 'var(--error)'
                  : 'var(--text-muted)'
              return (
                <div key={group} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: dotColor }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: textColor, textTransform: 'capitalize' }}>
                    {group}
                  </span>
                  {penaltyActive && (
                    <span style={{ fontSize: 10, color: 'var(--error)' }}>−15 XP</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ margin: '0 20px' }}>
        <p style={SECTION_LABEL}>RECENT</p>
        <div style={CARD}>
          {events.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
              No activity yet
            </p>
          ) : (
            events.slice(0, 8).map((ev, i) => {
              const src = ev.source || 'train'
              const conf = SOURCE_CONFIG[src] || SOURCE_CONFIG.train
              const Icon = SOURCE_ICONS[src] || Dumbbell
              const xp = ev.final_xp || 0
              const positive = xp >= 0
              return (
                <div key={ev.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderTop: i === 0 ? 'none' : '0.5px solid var(--divider)',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12,
                    background: conf.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={12} color={conf.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, textTransform: 'capitalize' }}>
                      {(ev.action || '').replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatTimeAgo(ev.created_at)}
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 500,
                    color: positive ? 'var(--success)' : 'var(--error)',
                    minWidth: 40, textAlign: 'right',
                  }}>
                    {positive ? '+' : ''}{xp}
                  </span>
                </div>
              )
            })
          )}
          <button
            onClick={() => navigate('/xp/events')}
            style={{
              width: '100%', textAlign: 'center', padding: '10px 0 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, color: 'var(--accent)', fontWeight: 500,
            }}
          >
            View all →
          </button>
        </div>
      </div>

      <StreakFreezeSheet
        isOpen={freezeOpen}
        onClose={() => setFreezeOpen(false)}
        freezesRemaining={freezes}
        currentStreak={streak}
        lastActiveDate={lastActive}
        onUsed={loadAll}
      />
    </div>
  )
}
