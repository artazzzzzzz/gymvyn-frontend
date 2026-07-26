import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, Bookmark, BookmarkCheck,
  Camera, Maximize2,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '../utils/supabase'
import { EXERCISE_DATABASE } from '../data/exerciseDatabase'
import { EXERCISE_INSTRUCTIONS } from '../data/exerciseInstructions'

const API = import.meta.env.VITE_API_URL || ''

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function daysAgo(iso) {
  if (!iso) return null
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  if (diff < 14) return '1 week ago'
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`
  return `${Math.floor(diff / 30)} months ago`
}

function DifficultyDots({ level }) {
  const map = { Beginner: 1, Intermediate: 3, Advanced: 5 }
  const filled = map[level] ?? 2
  return (
    <span className="flex gap-0.5 justify-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`text-xs ${i < filled ? 'text-[var(--text-primary)]' : 'text-[var(--text-disabled)]'}`}
        >
          {i < filled ? '●' : '○'}
        </span>
      ))}
    </span>
  )
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-[var(--bg-pill)] rounded-lg ${className}`} />
}

const TABS = ['Summary', 'History', 'How To']

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrainerExerciseDetail() {
  const { name: rawName } = useParams()
  const name = decodeURIComponent(rawName)
  const navigate = useNavigate()

  const exercise = EXERCISE_DATABASE.find(e => e.name === name) || null

  const [metadata, setMetadata] = useState(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('Summary')
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [chartMetric, setChartMetric] = useState('Heaviest')
  const [chartRange, setChartRange] = useState('All')
  const [history, setHistory] = useState([])
  const [historyPage, setHistoryPage] = useState(0)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyFetched, setHistoryFetched] = useState(false)
  const [expandedSession, setExpandedSession] = useState(null)
  const [toast, setToast] = useState(null)
  const videoRef = useRef(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }

  useEffect(() => {
    fetch(`${API}/api/exercises/${encodeURIComponent(name)}/metadata`)
      .then(r => r.json())
      .then(({ data }) => setMetadata(data))
      .catch(() => setMetadata(null))
      .finally(() => setMetaLoading(false))
  }, [name])

  useEffect(() => {
    async function load() {
      const token = await getToken()
      if (!token) { setStatsLoading(false); return }
      const headers = { Authorization: `Bearer ${token}` }
      const [statsRes, bmRes] = await Promise.all([
        fetch(`${API}/api/exercises/${encodeURIComponent(name)}/stats`, { headers }),
        fetch(`${API}/api/exercises/${encodeURIComponent(name)}/bookmark`, { headers }),
      ])
      const statsJson = await statsRes.json()
      setStats(statsJson.data)
      setStatsLoading(false)
      const bmJson = await bmRes.json()
      setBookmarked(bmJson.bookmarked ?? false)
    }
    load().catch(() => setStatsLoading(false))
  }, [name])

  async function fetchHistory(page = 0) {
    const token = await getToken()
    if (!token) return
    setHistoryLoading(true)
    try {
      const res = await fetch(
        `${API}/api/exercises/${encodeURIComponent(name)}/history?page=${page}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const json = await res.json()
      if (page === 0) setHistory(json.data || [])
      else setHistory(prev => [...prev, ...(json.data || [])])
      setHistoryTotal(json.total || 0)
      setHistoryPage(page)
      setHistoryFetched(true)
    } finally {
      setHistoryLoading(false)
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab)
    if (tab === 'History' && !historyFetched) fetchHistory(0)
  }

  async function toggleBookmark() {
    const token = await getToken()
    if (!token || bookmarkLoading) return
    setBookmarkLoading(true)
    const method = bookmarked ? 'DELETE' : 'POST'
    try {
      const res = await fetch(`${API}/api/exercises/${encodeURIComponent(name)}/bookmark`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setBookmarked(json.bookmarked ?? !bookmarked)
    } finally {
      setBookmarkLoading(false)
    }
  }

  function filteredChartData() {
    if (!stats?.chart_data?.length) return []
    const now = Date.now()
    const cutoff = chartRange === '3M' ? 90 : chartRange === '6M' ? 180 : chartRange === '1Y' ? 365 : null
    const data = cutoff
      ? stats.chart_data.filter(d => (now - new Date(d.date)) / 86400000 <= cutoff)
      : stats.chart_data
    const key = chartMetric === 'Heaviest' ? 'heaviest' : chartMetric === '1RM' ? 'est_1rm' : 'volume'
    return data.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      value: d[key],
    }))
  }

  const instructions = EXERCISE_INSTRUCTIONS[name] || null

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-pill)]">

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[var(--bg-pill)] flex items-center justify-between px-4 py-3 border-b border-[var(--border)] pt-safe">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft size={24} strokeWidth={2} className="text-[var(--text-primary)]" />
        </button>
        <span className="text-[18px] font-bold text-[var(--text-primary)] truncate mx-3 flex-1 text-center">
          {name}
        </span>
        <button onClick={toggleBookmark} disabled={bookmarkLoading} className="p-1 -mr-1 bg-transparent border-0">
          {bookmarked
            ? <BookmarkCheck size={22} className="text-[var(--text-primary)]" />
            : <Bookmark size={22} className="text-[var(--text-tertiary)]" />}
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-28">

        {/* Video Hero */}
        <div className="mx-4 mt-3 rounded-2xl overflow-hidden bg-[#1C1C1E] aspect-video relative">
          {metaLoading ? (
            <Skeleton className="w-full h-full rounded-none" />
          ) : metadata?.video_url ? (
            videoPlaying ? (
              <video
                ref={videoRef}
                src={metadata.video_url}
                autoPlay
                controls
                playsInline
                muted
                preload="metadata"
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                {metadata.thumbnail_url && (
                  <img src={metadata.thumbnail_url} alt={name} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  onClick={() => setVideoPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div
                    className="bg-[var(--bg-card)] rounded-full flex items-center justify-center shadow-lg"
                    style={{ width: 60, height: 60 }}
                  >
                    <span className="text-[var(--text-primary)] text-xl ml-1">▶</span>
                  </div>
                </button>
                <div className="absolute bottom-2 left-3 flex items-center gap-1.5 pointer-events-none">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-white text-xs font-semibold tracking-wide">REC</span>
                  {metadata.video_duration && (
                    <span className="text-white text-xs opacity-80">{metadata.video_duration}</span>
                  )}
                </div>
                <div className="absolute bottom-2 right-3 text-white opacity-80 pointer-events-none">
                  <Maximize2 size={16} />
                </div>
              </>
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[var(--text-tertiary)]">
              <Camera size={32} />
              <span className="text-sm">Video coming soon</span>
            </div>
          )}
        </div>

        {/* Pills */}
        {exercise && (
          <div className="flex gap-2 px-4 mt-3 flex-wrap">
            <span className="bg-gray-900 text-white text-sm font-medium px-3 py-1 rounded-full">
              {exercise.equipment}
            </span>
            <span className="border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium px-3 py-1 rounded-full">
              {exercise.mechanics}
            </span>
            <span className="border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium px-3 py-1 rounded-full">
              {exercise.difficulty}
            </span>
          </div>
        )}

        {/* Stats row */}
        {exercise && (
          <div className="mx-4 mt-3 bg-[var(--bg-card)] rounded-2xl shadow-sm flex divide-x divide-[var(--border)]">
            {[
              { label: 'PRIMARY MUSCLE', value: exercise.muscle },
              { label: 'EQUIPMENT', value: exercise.equipment },
              { label: 'DIFFICULTY', value: <DifficultyDots level={exercise.difficulty} /> },
            ].map(({ label, value }) => (
              <div key={label} className="flex-1 flex flex-col items-center py-3 px-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium mb-1 text-center">{label}</span>
                <span className="text-[14px] font-semibold text-[var(--text-primary)] text-center">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex mt-4 border-b border-[var(--border)] px-4">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`mr-6 pb-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-[var(--text-primary)] border-b-2 border-[var(--border-strong)]'
                  : 'text-[var(--text-tertiary)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-4 pt-4">

          {activeTab === 'Summary' && (
            <div className="space-y-4">
              <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border-l-4 border-[var(--border-strong)] p-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Personal Best</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-40" />
                ) : stats?.personal_best ? (
                  <>
                    <p className="text-[28px] font-bold text-[var(--text-primary)] leading-tight">
                      {stats.personal_best.weight} kg × {stats.personal_best.reps} reps
                    </p>
                    <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">
                      Set {daysAgo(stats.personal_best.date)} · Est. 1RM: {stats.personal_best.est_1rm} kg
                    </p>
                  </>
                ) : (
                  <p className="text-[var(--text-tertiary)] text-sm">No workouts logged yet</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Heaviest Weight', value: stats?.heaviest_weight ? `${stats.heaviest_weight} kg` : '—' },
                  { label: 'Est. 1RM', value: stats?.best_1rm ? `${stats.best_1rm} kg` : '—' },
                  { label: 'Total Sets', value: stats?.total_sets ?? '—' },
                  { label: 'Best Volume', value: stats?.best_session_volume ? `${stats.best_session_volume} kg` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[var(--bg-card)] rounded-xl shadow-sm p-4">
                    <p className="text-[12px] text-[var(--text-tertiary)] mb-1">{label}</p>
                    {statsLoading
                      ? <Skeleton className="h-7 w-16" />
                      : <p className="text-[22px] font-bold text-[var(--text-primary)]">{value}</p>}
                  </div>
                ))}
              </div>

              {!statsLoading && stats?.chart_data?.length > 0 && (
                <div className="bg-[var(--bg-card)] rounded-xl shadow-sm p-4">
                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Progress</p>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {['Heaviest', '1RM', 'Volume'].map(m => (
                      <button
                        key={m}
                        onClick={() => setChartMetric(m)}
                        className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                          chartMetric === m ? 'bg-gray-900 text-white border-[var(--border-strong)]' : 'border-[var(--border)] text-[var(--text-tertiary)]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={filteredChartData()} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "var(--bg-card)", border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        formatter={v => [v, chartMetric]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--text-primary)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: 'var(--text-primary)' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {['3M', '6M', '1Y', 'All'].map(r => (
                      <button
                        key={r}
                        onClick={() => setChartRange(r)}
                        className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                          chartRange === r ? 'bg-[var(--text-primary)] text-[var(--bg-card)] border-[var(--border-strong)]' : 'border-[var(--border)] text-[var(--text-tertiary)]'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'History' && (
            <div className="space-y-3">
              {historyLoading && history.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : history.length === 0 ? (
                <p className="text-center text-[var(--text-tertiary)] py-8">No sessions recorded yet</p>
              ) : (
                <>
                  {history.map(session => (
                    <div key={session.id} className="bg-[var(--bg-card)] rounded-xl shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{fmtDate(session.date)}</p>
                          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                            {session.sets_count} sets · {session.volume} kg total
                          </p>
                        </div>
                        <span className="text-[var(--text-tertiary)] text-sm">{expandedSession === session.id ? '▲' : '▼'}</span>
                      </button>
                      {expandedSession === session.id && (
                        <div className="border-t border-[var(--border)] divide-y divide-gray-50">
                          {session.sets.map(set => (
                            <div
                              key={set.index}
                              className={`flex items-center justify-between px-4 py-2.5 ${set.is_pr ? 'bg-[var(--success-bg)]' : ''}`}
                            >
                              <span className={`text-sm ${set.is_pr ? 'text-[var(--success)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                                Set {set.index}
                              </span>
                              <span className={`text-sm ${set.is_pr ? 'text-[var(--success)] font-semibold' : 'text-[var(--text-primary)] font-medium'}`}>
                                {set.weight} kg · {set.reps} reps
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {history.length < historyTotal && (
                    <button
                      onClick={() => fetchHistory(historyPage + 1)}
                      disabled={historyLoading}
                      className="w-full py-3 text-sm font-medium text-[var(--text-tertiary)] border border-[var(--border)] rounded-xl"
                    >
                      {historyLoading ? 'Loading…' : 'Load more'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'How To' && (
            <div className="space-y-4 pb-4">
              {exercise?.instructions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Instructions</p>
                  {exercise.instructions.map((step, i) => (
                    <div key={i} className="bg-[var(--bg-card)] rounded-xl shadow-sm p-4 flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              )}

              {exercise?.tips?.length > 0 && (
                <div className="bg-[var(--warning-bg)] rounded-xl border-l-4 border-amber-400 p-4">
                  <p className="text-xs font-bold text-[var(--warning)] uppercase tracking-wider mb-2">Pro Tips</p>
                  {exercise.tips.map((tip, i) => (
                    <p key={i} className="text-sm text-[var(--warning)] leading-relaxed mb-1 last:mb-0">
                      · {tip}
                    </p>
                  ))}
                </div>
              )}

              {instructions?.commonMistakes && (
                <div className="bg-[var(--bg-card)] rounded-xl border-l-4 border-red-400 p-4 shadow-sm">
                  <p className="text-xs font-bold text-[var(--error)] uppercase tracking-wider mb-2">Common Mistakes</p>
                  {(Array.isArray(instructions.commonMistakes)
                    ? instructions.commonMistakes
                    : [instructions.commonMistakes]
                  ).map((m, i) => (
                    <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed mb-1 last:mb-0">
                      · {m}
                    </p>
                  ))}
                </div>
              )}

              {exercise?.secondary?.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Secondary Muscles</p>
                  <div className="flex flex-wrap gap-2">
                    {exercise.secondary.map(m => (
                      <span key={m} className="border border-[var(--border)] text-[var(--text-secondary)] text-sm px-3 py-1 rounded-full">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom CTA — Assign to Client */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-pill)]/95 backdrop-blur-sm border-t border-[var(--border)] px-4 pt-3 pb-6">
        <button
          onClick={() => showToast('Coming soon')}
          className="w-full bg-gray-900 text-white font-semibold rounded-xl"
          style={{ height: 52 }}
        >
          Assign to Client
        </button>
      </div>
    </div>
  )
}
