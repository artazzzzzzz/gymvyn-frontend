import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../utils/supabase'
import { EXERCISE_DATABASE } from '../data/exerciseDatabase'
import { EXERCISE_INSTRUCTIONS } from '../data/exerciseInstructions'

const API  = import.meta.env.VITE_API_URL || ''
const FONT = "'Inter', -apple-system, 'Helvetica Neue', sans-serif"
const card = { background: '#FFF', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getToken() {
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

function BookmarkIcon({ filled }) {
  return (
    <svg width="20" height="22" viewBox="0 0 22 26"
      fill={filled ? '#111827' : 'none'}
      stroke={filled ? '#111827' : '#6B7280'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h14a2 2 0 012 2v18l-9-4-9 4V4a2 2 0 012-2z"/>
    </svg>
  )
}

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
        <span key={i} style={{ fontSize: 12, color: i < count ? '#111827' : '#D1D5DB', lineHeight: 1 }}>
          {i < count ? '●' : '○'}
        </span>
      ))}
    </span>
  )
}

function Skeleton({ w = '100%', h = 18 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: 'linear-gradient(90deg,#F3F4F6 25%,#E9EAEB 50%,#F3F4F6 75%)',
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
      {/* 16:9 area */}
      <div
        onClick={() => videoUrl && setPlaying(v => !v)}
        style={{
          position: 'relative', width: '100%', paddingBottom: '56.25%',
          background: '#1C1C1E',
          cursor: videoUrl ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        {/* subtle grid */}
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
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : videoUrl ? (
          <>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.28)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M6 3l14 9-14 9V3z" fill="#111827"/></svg>
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(to top,rgba(0,0,0,0.4),transparent)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', alignItems: 'center', gap: 5, pointerEvents: 'none' }}>
              <span style={{ fontSize: 8, color: '#EF4444', fontWeight: 900, lineHeight: 1 }}>●</span>
              <span style={{ fontSize: 12, color: '#FFF', fontFamily: FONT, letterSpacing: '0.04em' }}>
                REC{duration ? `  ${duration}` : ''}
              </span>
            </div>
            <div style={{ position: 'absolute', bottom: 10, right: 12, pointerEvents: 'none' }}>
              <FullscreenIco />
            </div>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="6" width="20" height="12" rx="3"/>
              <circle cx="12" cy="12" r="3"/>
              <path d="M7 6V4M17 6V4"/>
            </svg>
            <span style={{ fontSize: 13, color: '#6B7280', fontFamily: FONT }}>Video coming soon</span>
          </div>
        )}
      </div>

      {/* Pills */}
      {exercise && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px 16px', flexWrap: 'wrap' }}>
          <span style={{ background: '#111827', color: '#FFF', fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '5px 10px', lineHeight: 1 }}>
            {exercise.equipment}
          </span>
          {exercise.mechanics && (
            <span style={{ background: '#F3F4F6', color: '#374151', fontSize: 12, fontWeight: 500, borderRadius: 6, padding: '5px 10px', lineHeight: 1 }}>
              {exercise.mechanics}
            </span>
          )}
          <span style={{ background: '#F3F4F6', color: '#374151', fontSize: 12, fontWeight: 500, borderRadius: 6, padding: '5px 10px', lineHeight: 1 }}>
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
              <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7, lineHeight: 1.4 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1 }}>{s.value}</div>
            </div>
            {i < 2 && <div style={{ width: '0.5px', background: '#F3F4F6', margin: '10px 0' }} />}
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
    background: active ? '#111827' : 'transparent',
    color: active ? '#FFF' : '#9CA3AF',
    transition: 'background 0.15s',
  })

  const metricStyle = (active) => ({
    height: 26, padding: '0 10px', borderRadius: 13, border: 'none', cursor: 'pointer', fontFamily: FONT,
    fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? '#111827' : '#F3F4F6',
    color: active ? '#FFF' : '#6B7280',
    transition: 'background 0.15s',
  })

  return (
    <div style={{ ...card, marginBottom: 12, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progress</span>
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
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9CA3AF', fontFamily: FONT }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#FFF', border: '1px solid #F3F4F6', borderRadius: 8, fontSize: 12, fontFamily: FONT, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            formatter={v => [v, metric]}
            labelStyle={{ color: '#6B7280', fontWeight: 500 }}
          />
          <Line
            type="monotone" dataKey="value" stroke="#111827" strokeWidth={2}
            dot={{ r: 3, fill: '#FFF', stroke: '#111827', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: '#111827' }}
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
      {/* Personal best */}
      <div style={{ ...card, marginBottom: 12, padding: '18px 20px', borderLeft: '3px solid #111827' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Personal Best
        </div>
        {pb ? (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {pb.weight} kg × {pb.reps} reps
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 7 }}>
              Set {timeAgo(pb.date)} · Est. 1RM: {pb.est_1rm} kg
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#9CA3AF' }}>Log a workout to see your personal best</div>
        )}
      </div>

      {/* 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'Heaviest Weight', value: stats?.heaviest_weight ? `${stats.heaviest_weight} kg` : '—' },
          { label: 'Est. 1RM',        value: stats?.best_1rm        ? `${stats.best_1rm} kg`        : '—' },
          { label: 'Total Sets',      value: stats?.total_sets      != null ? String(stats.total_sets) : '—' },
          { label: 'Best Volume',     value: stats?.best_session_volume ? `${stats.best_session_volume.toLocaleString()} kg` : '—' },
        ].map((item, i) => (
          <div key={i} style={{ ...card, padding: '16px 14px' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400, marginBottom: 9, lineHeight: 1.3 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Chart — only if data exists */}
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
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>No workouts logged yet</div>
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
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmtDate(session.date)}</span>
            <span style={{ fontSize: 12, color: '#6B7280' }}>{session.sets_count} sets · {session.volume} kg</span>
          </button>

          {expanded === session.id && session.sets.map((set, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', padding: '10px 16px',
              background: set.is_pr ? '#F0FDF4' : (i % 2 === 0 ? '#F9F9F9' : '#FFF'),
              borderTop: '0.5px solid #F3F4F6',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', width: 46, flexShrink: 0, letterSpacing: '0.04em' }}>
                SET {set.index}
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#111827' }}>{set.weight} kg</span>
              <span style={{ fontSize: 14, color: '#6B7280', marginRight: 16, minWidth: 60 }}>{set.reps} reps</span>
              <span style={{ fontSize: 15, color: set.is_pr ? '#16A34A' : '#9CA3AF' }}>✓</span>
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
            fontSize: 13, color: '#6B7280', cursor: loadingMore ? 'default' : 'pointer', fontFamily: FONT,
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

  // Use exerciseDatabase instructions if available, else fall back to EXERCISE_INSTRUCTIONS
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
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>No instructions available for this exercise</div>
      </div>
    )
  }

  return (
    <>
      {steps.length > 0 && (
        <div style={{ ...card, marginBottom: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>
            HOW TO DO IT
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#111827', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#FFF', lineHeight: 1 }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, paddingTop: 2, margin: 0 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div style={{ background: '#FFFBEB', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12, padding: 20, borderLeft: '3px solid #92400E' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 10 }}>💡 Pro Tip</div>
          {tips.map((tip, i) => (
            <p key={i} style={{ fontSize: 13, color: '#78350F', lineHeight: 1.7, margin: 0, marginTop: i > 0 ? 6 : 0 }}>{tip}</p>
          ))}
        </div>
      )}

      {mistakes.length > 0 && (
        <div style={{ ...card, marginBottom: 12, padding: 20, borderLeft: '3px solid #EF4444' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', marginBottom: 12 }}>⚠️ Avoid These</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mistakes.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: '#EF4444', fontSize: 16, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>·</span>
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {exercise?.secondary?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Secondary Muscles
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {exercise.secondary.map(m => (
              <span key={m} style={{ background: '#F3F4F6', color: '#374151', fontSize: 12, fontWeight: 500, borderRadius: 20, padding: '5px 10px' }}>
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
  { bg: '#F3F4F6', dot: '#374151' }, { bg: '#EFF6FF', dot: '#185FA5' },
  { bg: '#F0FDF4', dot: '#15803D' }, { bg: '#FDF4FF', dot: '#7C3AED' },
  { bg: '#FFF7ED', dot: '#C2410C' }, { bg: '#FFF1F2', dot: '#BE123C' },
]

function RelatedSection({ exercise, currentName }) {
  if (!exercise) return null
  const muscle = exercise.muscle
  const related = EXERCISE_DATABASE
    .filter(e => e.muscle === muscle && e.name !== currentName)
    .slice(0, 6)
  if (related.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        YOU MIGHT ALSO LIKE
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {related.map((r, i) => {
          const c = RELATED_COLORS[i % RELATED_COLORS.length]
          return (
            <div key={r.name} style={{ minWidth: 140, height: 90, flexShrink: 0, ...card, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 14, height: 9, borderRadius: 3, background: c.dot, opacity: 0.82 }} />
              </div>
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.25 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{r.muscle}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = ['Summary', 'History', 'How To']

export default function ExerciseDetail() {
  const { name: rawName } = useParams()
  const name     = decodeURIComponent(rawName ?? '')
  const navigate = useNavigate()

  const exercise = EXERCISE_DATABASE.find(e => e.name === name) ?? null

  // ── API state ────────────────────────────────────────────────────────────────
  const [metadata,     setMetadata]     = useState(null)
  const [metaLoading,  setMetaLoading]  = useState(true)
  const [stats,        setStats]        = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [bookmarked,   setBookmarked]   = useState(false)
  const [bmLoading,    setBmLoading]    = useState(false)
  const [activeTab,    setActiveTab]    = useState(0)
  const [added,        setAdded]        = useState(false)

  // metadata — no auth
  useEffect(() => {
    setMetaLoading(true)
    fetch(`${API}/api/exercises/${encodeURIComponent(name)}/metadata`)
      .then(r => r.json())
      .then(j => setMetadata(j.data ?? null))
      .catch(() => setMetadata(null))
      .finally(() => setMetaLoading(false))
  }, [name])

  // stats + bookmark — auth
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setStatsLoading(true)
      const token = await getToken()
      if (!token || cancelled) { setStatsLoading(false); return }
      const headers = { Authorization: `Bearer ${token}` }
      try {
        const [sRes, bRes] = await Promise.all([
          fetch(`${API}/api/exercises/${encodeURIComponent(name)}/stats`,    { headers }),
          fetch(`${API}/api/exercises/${encodeURIComponent(name)}/bookmark`, { headers }),
        ])
        const [sJson, bJson] = await Promise.all([sRes.json(), bRes.json()])
        if (!cancelled) {
          setStats(sJson.data ?? null)
          setBookmarked(bJson.bookmarked ?? false)
        }
      } catch {
        // no auth / network failure → show empty states
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [name])

  async function toggleBookmark() {
    if (bmLoading) return
    setBmLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const method = bookmarked ? 'DELETE' : 'POST'
      const res  = await fetch(`${API}/api/exercises/${encodeURIComponent(name)}/bookmark`, {
        method, headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setBookmarked(json.bookmarked ?? !bookmarked)
    } finally {
      setBmLoading(false)
    }
  }

  function handleAdd() {
    if (added) return
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        background: '#F9F9F9', fontFamily: FONT, WebkitFontSmoothing: 'antialiased',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ flexShrink: 0, background: '#FFF', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', padding: '0 16px', height: 56 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <span style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.025em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 12px' }}>
            {exercise?.name ?? name}
          </span>

          <button
            onClick={toggleBookmark}
            disabled={bmLoading}
            style={{ width: 36, height: 36, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <BookmarkIcon filled={bookmarked} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div style={{ padding: '16px 16px 0' }}>
            <VideoHeroCard
              videoUrl={metaLoading ? null : (metadata?.video_url ?? null)}
              duration={metadata?.video_duration ?? null}
              exercise={exercise}
            />
            <StatsRow exercise={exercise} />
          </div>

          {/* Sticky tabs */}
          <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#FFF', display: 'flex', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
            {TABS.map((t, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={{
                flex: 1, height: 44, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: FONT,
                fontSize: 14, fontWeight: activeTab === i ? 600 : 400,
                color: activeTab === i ? '#111827' : '#9CA3AF',
                borderBottom: activeTab === i ? '2px solid #111827' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}>{t}</button>
            ))}
          </div>

          <div style={{ padding: '16px 16px 0' }}>
            {activeTab === 0 && <SummaryTab stats={stats} loading={statsLoading} />}
            {activeTab === 1 && <HistoryTab name={name} />}
            {activeTab === 2 && <HowToTab name={name} exercise={exercise} />}
            <RelatedSection exercise={exercise} currentName={name} />
          </div>
        </div>

        {/* CTA */}
        <div style={{ flexShrink: 0, background: '#FFF', borderTop: '1.5px solid #F3F4F6', padding: '14px 16px 28px' }}>
          <button
            onClick={handleAdd}
            style={{
              display: 'block', width: '100%', height: 52, borderRadius: 14, border: 'none',
              background: added ? '#14532D' : '#111827',
              fontSize: 15, fontWeight: 600, color: '#FFF',
              cursor: 'pointer', fontFamily: FONT, letterSpacing: '-0.01em',
              transition: 'background 0.25s',
            }}
          >
            {added ? '✓  Added to Workout' : 'Add to Workout'}
          </button>
        </div>
      </div>
    </>
  )
}
