import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, AlertTriangle, AlertCircle, CheckCircle2, Loader2, RefreshCw,
  TrendingDown, ArrowDown, Activity, ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { getMlStatus, scoreGym, getChurnScores } from '../utils/api'
import GymOwnerNav from '../components/GymOwnerNav'

// ── Constants ────────────────────────────────────────────────────────────────

const RISK_STYLES = {
  high: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: AlertTriangle,
    label: 'High',
    dot: 'bg-red-400',
    emoji: '🔴',
  },
  medium: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: AlertCircle,
    label: 'Medium',
    dot: 'bg-amber-400',
    emoji: '🟡',
  },
  low: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: CheckCircle2,
    label: 'Low',
    dot: 'bg-emerald-400',
    emoji: '🟢',
  },
}

const AVATAR_PALETTE = [
  { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  { bg: 'bg-sky-500/15',     text: 'text-sky-400'     },
  { bg: 'bg-violet-500/15',  text: 'text-violet-400'  },
  { bg: 'bg-amber-500/15',   text: 'text-amber-400'   },
  { bg: 'bg-rose-500/15',    text: 'text-rose-400'    },
  { bg: 'bg-cyan-500/15',    text: 'text-cyan-400'    },
]

function avatarColor(name) {
  const s = (name || '?').toString()
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
}

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7)  return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Atoms ────────────────────────────────────────────────────────────────────

function RiskBadge({ risk }) {
  const s = RISK_STYLES[risk] ?? RISK_STYLES.low
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function SummaryCard({ risk, count, scoreRange }) {
  const s = RISK_STYLES[risk]
  const Icon = s.icon
  return (
    <div className={`bg-[#141416] border ${s.border} rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
          <Icon size={18} className={s.text} />
        </div>
        <span className="text-2xl">{s.emoji}</span>
      </div>
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">
        {s.label} risk
      </p>
      <p className="text-3xl font-bold text-white tabular-nums leading-tight">{count}</p>
      <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">Score {scoreRange}</p>
    </div>
  )
}

function ReasonTag({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.04] border border-white/[0.06] text-zinc-400">
      {children}
    </span>
  )
}

function ScoreBar({ score }) {
  const risk = score >= 61 ? 'high' : score >= 31 ? 'medium' : 'low'
  const barColor = risk === 'high' ? 'bg-red-500'
    : risk === 'medium' ? 'bg-amber-500'
    : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-300`}
             style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-bold text-white tabular-nums w-7 text-right">{score}</span>
    </div>
  )
}

function ModelStatusBanner({ status, statusError }) {
  if (statusError) {
    return (
      <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
        <ShieldAlert size={15} className="flex-shrink-0" />
        <span>ML service unreachable. {statusError}</span>
      </div>
    )
  }
  if (!status) return null
  if (status.trained === false) {
    return (
      <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
        <ShieldAlert size={15} className="flex-shrink-0" />
        <span>Model not trained — contact admin</span>
      </div>
    )
  }
  const auc = status.metrics?.roc_auc
  const nTest = status.metrics?.n_test
  return (
    <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 flex items-center gap-3 flex-wrap">
      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
        <Activity size={13} className="text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest">XGBoost model loaded</p>
        <p className="text-xs text-zinc-400 tabular-nums">
          <span className="text-zinc-300">{status.model_version}</span>
          {typeof nTest === 'number' && <> · evaluated on {nTest.toLocaleString()} members</>}
          {typeof auc === 'number' && <> · AUC <span className="text-emerald-400 font-semibold">{auc.toFixed(3)}</span></>}
        </p>
      </div>
    </div>
  )
}

function EmptyState({ onRun, busy }) {
  return (
    <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
        <Sparkles size={28} className="text-emerald-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No churn scores yet</h2>
      <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
        Click "Re-run Analysis" to score your active members with the trained XGBoost model.
      </p>
      <button
        onClick={onRun}
        disabled={busy}
        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        {busy ? 'Scoring members…' : 'Re-run Analysis'}
      </button>
    </div>
  )
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] mb-3" />
          <div className="h-3 w-20 bg-white/[0.04] rounded mb-2" />
          <div className="h-8 w-16 bg-white/[0.06] rounded" />
        </div>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GymInsights() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [gymId, setGymId]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const [status, setStatus]     = useState(null)
  const [statusError, setStatusError] = useState('')

  const [scores, setScores]     = useState([])
  const [summary, setSummary]   = useState({ total: 0, high: 0, medium: 0, low: 0 })
  const [scoring, setScoring]   = useState(false)
  const [scoreError, setScoreError] = useState('')

  const pollRef = useRef(null)

  async function refreshScores(id) {
    const fresh = await getChurnScores(id)
    setScores(fresh.scores || [])
    setSummary(fresh.summary || { total: 0, high: 0, medium: 0, low: 0 })
  }

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true); setError('')
      try {
        const { data: gym, error: gymErr } = await supabase
          .from('gyms')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (gymErr) throw gymErr
        if (!gym) throw new Error('No gym found for this account.')
        if (cancelled) return
        setGymId(gym.id)

        // Fetch model status + scores in parallel.
        const [mlStatus] = await Promise.all([
          getMlStatus().catch(err => { setStatusError(err.message); return null }),
          refreshScores(gym.id),
        ])
        if (!cancelled) setStatus(mlStatus)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  // 60-second polling so cron-driven score updates show up without a refresh.
  useEffect(() => {
    if (!gymId) return
    pollRef.current = setInterval(() => {
      refreshScores(gymId).catch(() => {})
    }, 60_000)
    return () => clearInterval(pollRef.current)
  }, [gymId])

  async function runAnalysis() {
    if (!gymId) return
    setScoring(true); setScoreError('')
    try {
      await scoreGym(gymId)
      await refreshScores(gymId)
    } catch (err) {
      setScoreError(err.message || 'Failed to score members.')
    } finally {
      setScoring(false)
    }
  }

  const atRisk = scores.filter(s => s.score >= 31)
  const lastScoredAt = scores.length > 0
    ? scores.reduce((latest, s) => {
        if (!latest) return s.predicted_at
        return new Date(s.predicted_at) > new Date(latest) ? s.predicted_at : latest
      }, null)
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] pb-28">
        <div className="max-w-6xl mx-auto px-5 py-10 sm:py-12">
          <div className="h-7 w-40 bg-white/[0.04] rounded mb-6 animate-pulse" />
          <div className="h-12 w-full bg-white/[0.04] rounded-xl mb-5 animate-pulse" />
          <SkeletonCards />
        </div>
        <GymOwnerNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-28 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-10 sm:py-12">
        <header className="mb-7 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">AI Insights</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Sparkles size={9} /> XGBoost
              </span>
            </div>
            <p className="text-zinc-500 text-sm">
              Churn predictions powered by XGBoost
              {summary.total > 0 && lastScoredAt && (
                <> · last scored {timeAgo(lastScoredAt)}</>
              )}
            </p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={scoring}
            className="inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-zinc-200 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scoring ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {scoring ? 'Scoring…' : 'Re-run Analysis'}
          </button>
        </header>

        <ModelStatusBanner status={status} statusError={statusError} />

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {scoreError && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {scoreError}
          </div>
        )}

        {summary.total === 0 ? (
          <EmptyState onRun={runAnalysis} busy={scoring} />
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
              <SummaryCard risk="high"   count={summary.high}   scoreRange="61–100" />
              <SummaryCard risk="medium" count={summary.medium} scoreRange="31–60"  />
              <SummaryCard risk="low"    count={summary.low}    scoreRange="0–30"   />
            </div>

            {/* Risk table */}
            <div className="bg-[#141416] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <TrendingDown size={14} className="text-red-400" />
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                  At-risk members ({atRisk.length})
                </p>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-zinc-500">
                  Highest score first <ArrowDown size={10} />
                </span>
              </div>

              {atRisk.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-zinc-500">
                  No at-risk members. All scores are in the low range.
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead className="bg-white/[0.02] border-b border-white/[0.04]">
                        <tr>
                          <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-5 py-3">Member</th>
                          <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-3 py-3">Phone</th>
                          <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-3 py-3">Score</th>
                          <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-3 py-3">Risk</th>
                          <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-3 py-3">Top reasons</th>
                          <th className="text-right text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-5 py-3">Last scored</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atRisk.map(s => {
                          const av = avatarColor(s.full_name)
                          return (
                            <tr
                              key={s.user_id}
                              onClick={() => navigate(`/gym/members/${s.user_id}`)}
                              className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                            >
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg ${av.bg} flex items-center justify-center flex-shrink-0`}>
                                    <span className={`text-[11px] font-bold ${av.text}`}>{initials(s.full_name)}</span>
                                  </div>
                                  <span className="text-sm font-medium text-white truncate">{s.full_name || 'Unknown'}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3.5 text-xs text-zinc-400 tabular-nums">{s.phone || '—'}</td>
                              <td className="px-3 py-3.5">
                                <ScoreBar score={s.score} />
                              </td>
                              <td className="px-3 py-3.5">
                                <RiskBadge risk={s.risk_label} />
                              </td>
                              <td className="px-3 py-3.5">
                                <div className="flex flex-wrap gap-1 max-w-[280px]">
                                  {(s.top_reasons || []).slice(0, 3).map((r, i) => (
                                    <ReasonTag key={i}>{r}</ReasonTag>
                                  ))}
                                  {(s.top_reasons?.length || 0) === 0 && (
                                    <span className="text-[11px] text-zinc-600">No risk factors</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-right text-[11px] text-zinc-500 tabular-nums">
                                {timeAgo(s.predicted_at)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile list */}
                  <ul className="md:hidden divide-y divide-white/[0.04]">
                    {atRisk.map(s => {
                      const av = avatarColor(s.full_name)
                      return (
                        <li
                          key={s.user_id}
                          onClick={() => navigate(`/gym/members/${s.user_id}`)}
                          className="px-4 py-3.5 active:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 mb-2.5">
                            <div className={`w-9 h-9 rounded-lg ${av.bg} flex items-center justify-center flex-shrink-0`}>
                              <span className={`text-xs font-bold ${av.text}`}>{initials(s.full_name)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white truncate">{s.full_name || 'Unknown'}</p>
                              <p className="text-[10px] text-zinc-500 tabular-nums">{timeAgo(s.predicted_at)} · {s.phone || 'no phone'}</p>
                            </div>
                            <RiskBadge risk={s.risk_label} />
                          </div>
                          <div className="mb-2.5">
                            <ScoreBar score={s.score} />
                          </div>
                          {(s.top_reasons || []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {s.top_reasons.slice(0, 4).map((r, i) => (
                                <ReasonTag key={i}>{r}</ReasonTag>
                              ))}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <GymOwnerNav />
    </div>
  )
}
