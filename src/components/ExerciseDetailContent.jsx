import { useEffect, useRef, useState } from 'react'
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../utils/supabase'
import { EXERCISE_DATABASE } from '../data/exerciseDatabase'
import { EXERCISE_INSTRUCTIONS } from '../data/exerciseInstructions'

const API  = import.meta.env.VITE_API_URL || ''
const FONT = "'Inter', -apple-system, 'Helvetica Neue', sans-serif"
export const card = { background: 'var(--bg-card)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token ?? null
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(iso) {
  if (!iso) return null
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7)  return `${d} days ago`
  if (d < 14) return '1 week ago'
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`
  return `${Math.floor(d / 30)} months ago`
}

// ── Small components ──────────────────────────────────────────────────────────

function FullscreenIco() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.88)" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M16 21h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
    </svg>
  )
}

function DifficultyDots({ level }) {
  const count = { Beginner: 1, Intermediate: 3, Advanced: 5 }[level] ?? 2
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: 12, color: i < count ? 'var(--text-primary)' : 'var(--text-disabled)', lineHeight: 1 }}>
          {i < count ? '●' : '○'}
        </span>
      ))}
    </span>
  )
}

export function Skeleton({ w = '100%', h = 18 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: 'linear-gradient(90deg,var(--border) 25%,var(--border) 50%,var(--border) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

// ── Video hero ────────────────────────────────────────────────────────────────

function VideoHeroCard({ videoUrl, duration, exercise }) {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)

  return (
    <div style={{ ...card, marginBottom: 12, overflow: 'hidden' }}>
      <div
        onClick={() => videoUrl && setPlaying(v => !v)}
        style={{
          position: 'relative', width: '100%', paddingBottom: '56.25%',
          background: 'var(--text-primary)',
          cursor: videoUrl ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.7) 1px,transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        {videoUrl && playing ? (
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            controls
            playsInline
            muted
            preload="metadata"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : videoUrl ? (
          <>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.28)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M6 3l14 9-14 9V3z" fill="var(--text-primary)"/></svg>
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(to top,rgba(0,0,0,0.4),transparent)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', alignItems: 'center', gap: 5, pointerEvents: 'none' }}>
              <span style={{ fontSize: 8, color: 'var(--error)', fontWeight: 900, lineHeight: 1 }}>●</span>
              <span style={{ fontSize: 12, color: 'var(--bg-card)', fontFamily: FONT, letterSpacing: '0.04em' }}>
                REC{duration ? `  ${duration}` : ''}
              </span>
            </div>
            <div style={{ position: 'absolute', bottom: 10, right: 12, pointerEvents: 'none' }}>
              <FullscreenIco />
            </div>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="6" width="20" height="12" rx="3"/>
              <circle cx="12" cy="12" r="3"/>
              <path d="M7 6V4M17 6V4"/>
            </svg>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: FONT }}>Video coming soon</span>
          </div>
        )}
      </div>

      {exercise && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px 16px', flexWrap: 'wrap' }}>
          <span style={{ background: 'var(--text-primary)', color: 'var(--bg-card)', fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '5px 10px', lineHeight: 1 }}>
            {exercise.equipment}
          </span>
          {exercise.mechanics && (
            <span style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, borderRadius: 6, padding: '5px 10px', lineHeight: 1 }}>
              {exercise.mechanics}
            </span>
          )}
          <span style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, borderRadius: 6, padding: '5px 10px', lineHeight: 1 }}>
            {exercise.difficulty}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Stats info row ────────────────────────────────────────────────────────────

function StatsRow({ exercise }) {
  if (!exercise) return null
  return (
    <div style={{ ...card, marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex' }}>
        {[
          { label: 'PRIMARY MUSCLE', value: exercise.muscle },
          { label: 'EQUIPMENT',      value: exercise.equipment },
          { label: 'DIFFICULTY',     value: <DifficultyDots level={exercise.difficulty} /> },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', flex: 1 }}>
            <div style={{ flex: 1, padding: '16px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7, lineHeight: 1.4 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
            </div>
            {i < 2 && <div style={{ width: '0.5px', background: 'var(--bg-pill)', margin: '10px 0' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Progress chart ────────────────────────────────────────────────────────────

function ProgressChart({ chartData }) {
  const [range,  setRange]  = useState('All')
  const [metric, setMetric] = useState('Heaviest')

  const key = metric === 'Heaviest' ? 'heaviest' : metric === '1RM' ? 'est_1rm' : 'volume'

  const filtered = (() => {
    if (range === 'All') return chartData
    const cutoffs = { '3M': 90, '6M': 180, '1Y': 365 }
    const limit = cutoffs[range]
    const now = Date.now()
    return chartData.filter(d => (now - new Date(d.date)) / 86400000 <= limit)
  })()

  const data = filtered.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    value: d[key],
  }))

  const btnStyle = (active) => ({
    height: 22, padding: '0 7px', borderRadius: 11, border: 'none', cursor: 'pointer', fontFamily: FONT,
    fontSize: 11, fontWeight: 600,
    background: active ? 'var(--text-primary)' : 'transparent',
    color: active ? 'var(--bg-card)' : 'var(--text-tertiary)',
    transition: 'background 0.15s',
  })

  const metricStyle = (active) => ({
    height: 26, padding: '0 10px', borderRadius: 13, border: 'none', cursor: 'pointer', fontFamily: FONT,
    fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? 'var(--text-primary)' : 'var(--bg-pill)',
    color: active ? 'var(--bg-card)' : 'var(--text-tertiary)',
    transition: 'background 0.15s',
  })

  return (
    <div style={{ ...card, marginBottom: 12, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progress</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['3M','6M','1Y','All'].map(r => (
            <button key={r} onClick={() => setRange(r)} style={btnStyle(range === r)}>{r}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['Heaviest','1RM','Volume'].map(m => (
          <button key={m} onClick={() => setMetric(m)} style={metricStyle(metric === m)}>{m}</button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-tertiary)', fontFamily: FONT }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontFamily: FONT, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            formatter={v => [v, metric]}
            labelStyle={{ color: 'var(--text-tertiary)', fontWeight: 500 }}
          />
          <Line
            type="monotone" dataKey="value" stroke="var(--text-primary)" strokeWidth={2}
            dot={{ r: 3, fill: 'var(--bg-card)', stroke: 'var(--text-primary)', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: 'var(--text-primary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Summary tab ───────────────────────────────────────────────────────────────

function SummaryTab({ stats, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ ...card, padding: '18px 20px' }}><Skeleton h={64} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ ...card, padding: '16px 14px' }}><Skeleton h={52} /></div>)}
        </div>
      </div>
    )
  }

  const pb = stats?.personal_best

  return (
    <>
      <div style={{ ...card, marginBottom: 12, padding: '18px 20px', borderLeft: '3px solid var(--text-primary)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Personal Best
        </div>
        {pb ? (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {pb.weight} kg × {pb.reps} reps
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 7 }}>
              Set {timeAgo(pb.date)} · Est. 1RM: {pb.est_1rm} kg
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Log a workout to see your personal best</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'Heaviest Weight', value: stats?.heaviest_weight ? `${stats.heaviest_weight} kg` : '—' },
          { label: 'Est. 1RM',        value: stats?.best_1rm        ? `${stats.best_1rm} kg`        : '—' },
          { label: 'Total Sets',      value: stats?.total_sets      != null ? String(stats.total_sets) : '—' },
          { label: 'Best Volume',     value: stats?.best_session_volume ? `${stats.best_session_volume.toLocaleString()} kg` : '—' },
        ].map((item, i) => (
          <div key={i} style={{ ...card, padding: '16px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginBottom: 9, lineHeight: 1.3 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {stats?.chart_data?.length > 0 && <ProgressChart chartData={stats.chart_data} />}
    </>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({ name }) {
  const [sessions,    setSessions]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [page,        setPage]        = useState(0)
  const [total,       setTotal]       = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expanded,    setExpanded]    = useState(null)

  async function load(p = 0) {
    if (p === 0) setLoading(true); else setLoadingMore(true)
    try {
      const token = await getToken()
      if (!token) { setLoading(false); return }
      const res  = await fetch(`${API}/api/exercises/${encodeURIComponent(name)}/history?page=${p}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (p === 0) setSessions(json.data ?? [])
      else setSessions(prev => [...prev, ...(json.data ?? [])])
      setTotal(json.total ?? 0)
      setPage(p)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { load(0) }, [name])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0,1,2].map(i => <div key={i} style={{ ...card, padding: 16 }}><Skeleton h={40} /></div>)}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div style={{ ...card, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No workouts logged yet</div>
      </div>
    )
  }

  return (
    <>
      {sessions.map((session) => (
        <div key={session.id} style={{ ...card, marginBottom: 10, overflow: 'hidden' }}>
          <button
            onClick={() => setExpanded(expanded === session.id ? null : session.id)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px 12px', width: '100%', background: 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: FONT,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtDate(session.date)}</span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{session.sets_count} sets · {session.volume} kg</span>
          </button>

          {expanded === session.id && session.sets.map((set, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', padding: '10px 16px',
              background: set.is_pr ? 'var(--bg-hover)' : (i % 2 === 0 ? 'var(--bg-pill)' : 'var(--bg-card)'),
              borderTop: '0.5px solid var(--border)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', width: 46, flexShrink: 0, letterSpacing: '0.04em' }}>
                SET {set.index}
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{set.weight} kg</span>
              <span style={{ fontSize: 14, color: 'var(--text-tertiary)', marginRight: 16, minWidth: 60 }}>{set.reps} reps</span>
              <span style={{ fontSize: 15, color: set.is_pr ? 'var(--success)' : 'var(--text-tertiary)' }}>✓</span>
            </div>
          ))}
        </div>
      ))}

      {sessions.length < total && (
        <button
          onClick={() => load(page + 1)}
          disabled={loadingMore}
          style={{
            width: '100%', padding: '12px 0', background: 'transparent', border: 'none',
            fontSize: 13, color: 'var(--text-tertiary)', cursor: loadingMore ? 'default' : 'pointer', fontFamily: FONT,
          }}
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </>
  )
}

// ── How To tab ────────────────────────────────────────────────────────────────

function HowToTab({ name, exercise }) {
  const inst = EXERCISE_INSTRUCTIONS[name] ?? EXERCISE_INSTRUCTIONS[exercise?.name] ?? null

  const steps = exercise?.instructions?.length
    ? exercise.instructions
    : inst
      ? [inst.setup, inst.execution].filter(Boolean)
      : []

  const tips = exercise?.tips?.length
    ? exercise.tips
    : inst?.tips ?? []

  const mistakes = inst?.common_mistakes ?? []

  if (!steps.length && !tips.length && !mistakes.length) {
    return (
      <div style={{ ...card, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No instructions available for this exercise</div>
      </div>
    )
  }

  return (
    <>
      {steps.length > 0 && (
        <div style={{ ...card, marginBottom: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>
            HOW TO DO IT
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--text-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--bg-card)', lineHeight: 1 }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: 2, margin: 0 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div style={{ background: 'var(--bg-pill)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12, padding: 20, borderLeft: '3px solid var(--warning)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)', marginBottom: 10 }}>💡 Pro Tip</div>
          {tips.map((tip, i) => (
            <p key={i} style={{ fontSize: 13, color: 'var(--warning)', lineHeight: 1.7, margin: 0, marginTop: i > 0 ? 6 : 0 }}>{tip}</p>
          ))}
        </div>
      )}

      {mistakes.length > 0 && (
        <div style={{ ...card, marginBottom: 12, padding: 20, borderLeft: '3px solid var(--error)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--error)', marginBottom: 12 }}>⚠️ Avoid These</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mistakes.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--error)', fontSize: 16, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>·</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {exercise?.secondary?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Secondary Muscles
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {exercise.secondary.map(m => (
              <span key={m} style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, borderRadius: 20, padding: '5px 10px' }}>
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ── Related section ───────────────────────────────────────────────────────────

const RELATED_COLORS = [
  { bg: 'var(--bg-pill)', dot: 'var(--text-secondary)' }, { bg: '#EFF6FF', dot: 'var(--text-cta)' },
  { bg: 'var(--bg-hover)', dot: 'var(--success)' }, { bg: '#FDF4FF', dot: '#7C3AED' },
  { bg: '#FFF7ED', dot: '#C2410C' }, { bg: '#FFF1F2', dot: '#BE123C' },
]

function RelatedSection({ exercise, currentName, onRelatedPress }) {
  if (!exercise) return null
  const muscle = exercise.muscle
  const related = EXERCISE_DATABASE
    .filter(e => e.muscle === muscle && e.name !== currentName)
    .slice(0, 6)
  if (related.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        YOU MIGHT ALSO LIKE
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {related.map((r, i) => {
          const c = RELATED_COLORS[i % RELATED_COLORS.length]
          return (
            <div
              key={r.name}
              onClick={() => onRelatedPress?.(r.name)}
              style={{ minWidth: 140, height: 90, flexShrink: 0, ...card, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', cursor: onRelatedPress ? 'pointer' : 'default' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 14, height: 9, borderRadius: 3, background: c.dot, opacity: 0.82 }} />
              </div>
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.25 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{r.muscle}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main shared content ───────────────────────────────────────────────────────

const TABS = ['Summary', 'History', 'How To']

export default function ExerciseDetailContent({ name }) {
  const exercise = EXERCISE_DATABASE.find(e => e.name === name) ?? null

  const [metadata,     setMetadata]     = useState(null)
  const [metaLoading,  setMetaLoading]  = useState(true)
  const [stats,        setStats]        = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeTab,    setActiveTab]    = useState(0)
  const [relatedName,  setRelatedName]  = useState(null)

  const displayName  = relatedName ?? name
  const displayEx    = relatedName
    ? EXERCISE_DATABASE.find(e => e.name === relatedName) ?? null
    : exercise

  useEffect(() => {
    setMetaLoading(true)
    setMetadata(null)
    fetch(`${API}/api/exercises/${encodeURIComponent(displayName)}/metadata`)
      .then(r => r.json())
      .then(j => setMetadata(j.data ?? null))
      .catch(() => setMetadata(null))
      .finally(() => setMetaLoading(false))
  }, [displayName])

  useEffect(() => {
    let cancelled = false
    setStatsLoading(true)
    setStats(null)
    ;(async () => {
      const token = await getToken()
      if (!token || cancelled) { setStatsLoading(false); return }
      try {
        const res  = await fetch(`${API}/api/exercises/${encodeURIComponent(displayName)}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (!cancelled) setStats(json.data ?? null)
      } catch {
        // show empty stats on error
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [displayName])

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <div style={{ padding: '16px 16px 0' }}>
        <VideoHeroCard
          videoUrl={metaLoading ? null : (metadata?.video_url ?? null)}
          duration={metadata?.video_duration ?? null}
          exercise={displayEx}
        />
        <StatsRow exercise={displayEx} />
      </div>

      {/* Sticky tabs */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg-card)', display: 'flex', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            flex: 1, height: 44, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: FONT,
            fontSize: 14, fontWeight: activeTab === i ? 600 : 400,
            color: activeTab === i ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom: activeTab === i ? '2px solid var(--text-primary)' : '2px solid transparent',
            marginBottom: -1, transition: 'color 0.15s',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {activeTab === 0 && <SummaryTab stats={stats} loading={statsLoading} />}
        {activeTab === 1 && <HistoryTab name={displayName} />}
        {activeTab === 2 && <HowToTab name={displayName} exercise={displayEx} />}
        <RelatedSection
          exercise={displayEx}
          currentName={displayName}
          onRelatedPress={n => { setRelatedName(n); setActiveTab(0) }}
        />
      </div>
    </>
  )
}
