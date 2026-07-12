import { useState, useEffect } from 'react'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'
import { useOwnerGymId } from '../../hooks/useOwnerGymId'
import { getGymInsights, apiFetch } from '../../utils/api'

// ─── Revenue bar chart ────────────────────────────────────────────────────────
function RevenueBarChart({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.amount), 1)
  const barW = 28
  const gap = 6
  const chartH = 60
  const totalW = data.length * (barW + gap) - gap
  return (
    <svg width={totalW} height={chartH + 20} style={{ overflow: 'visible', flexShrink: 0 }}>
      {data.map((d, i) => {
        const barH = Math.max(4, (d.amount / max) * chartH)
        const x = i * (barW + gap)
        const y = chartH - barH
        const isCurrentMonth = i === data.length - 1
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={isCurrentMonth ? 'var(--text-primary)' : 'var(--border)'} />
            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={9} fill="var(--text-tertiary)">{d.month}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Occupancy bar chart ──────────────────────────────────────────────────────
function OccupancyBarChart({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const barW = Math.floor((320 - (data.length - 1) * 6) / data.length)
  const chartH = 80
  const viewW = data.length * (barW + 6) - 6
  return (
    <svg width="100%" height={chartH + 28} viewBox={`0 0 ${viewW} ${chartH + 28}`} style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const barH = Math.max(4, (d.count / max) * chartH)
        const x = i * (barW + 6)
        const y = chartH - barH
        const isMax = d.count === max
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={isMax ? 'var(--text-primary)' : 'var(--border)'} />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--text-secondary)">{d.count}</text>
            <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={10} fill="var(--text-tertiary)">{d.day?.slice(0, 3)}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Heatmap helpers ──────────────────────────────────────────────────────────
const getHeatColor = (count) => {
  if (count === 0) return 'var(--heatmap-0)'
  if (count <= 5) return 'var(--heatmap-1)'
  if (count <= 15) return 'var(--heatmap-2)'
  if (count <= 25) return 'var(--heatmap-3)'
  return 'var(--heatmap-4)'
}

// Matches the backend's hour label format (routes/gymRoutes.js formatHour12)
// so lookups against checkin_heatmap line up.
function formatHour12(hour) {
  const period = hour < 12 ? 'A' : 'P'
  let h = hour % 12
  if (h === 0) h = 12
  return `${h}${period}`
}

const HEATMAP_ROW_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HEATMAP_VISIBLE_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
const HEATMAP_TICK_HOURS = [6, 8, 10, 12, 14, 16, 18, 20]

const rankConfig = {
  0: { label: '#1', bg: 'var(--warning-bg)', color: 'var(--warning)' },
  1: { label: '#2', bg: 'var(--bg-pill)', color: 'var(--text-secondary)' },
  2: { label: '#3', bg: 'var(--bg-pill)', color: 'var(--text-secondary)' },
}

export default function GymInsights() {
  const gymId = useOwnerGymId()
  const [stats, setStats] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [statsData, insightsData] = await Promise.all([
          apiFetch(`/api/gym-stats/${gymId}`),
          getGymInsights(gymId),
        ])
        setStats(statsData)
        setInsights(insightsData)
      } catch (err) {
        console.error('Insights fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [gymId])

  if (loading) return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Loading insights...</span>
    </div>
  )

  const revenue = insights?.revenue
  const thisMonthRevenue = revenue?.this_month || 0
  const lastMonthRevenue = revenue?.last_month || 0
  const growthPercent = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : (thisMonthRevenue > 0 ? 100 : 0)

  const occupancyWeekly = insights?.occupancy_weekly || []
  const peakDayEntry = occupancyWeekly.reduce(
    (best, d) => (!best || d.count > best.count ? d : best), null
  )
  const peakDay = peakDayEntry && peakDayEntry.count > 0 ? peakDayEntry.day : '—'

  const checkinHeatmap = insights?.checkin_heatmap || []
  const hourTotals = {} // hour label -> total count across all days
  checkinHeatmap.forEach(cell => {
    hourTotals[cell.hour] = (hourTotals[cell.hour] || 0) + cell.count
  })
  const peakHourEntry = Object.entries(hourTotals).reduce(
    (best, [hour, count]) => (!best || count > best.count ? { hour, count } : best), null
  )
  const peakHour = peakHourEntry && peakHourEntry.count > 0 ? peakHourEntry.hour : '—'

  const heatmapByKey = {}
  checkinHeatmap.forEach(cell => { heatmapByKey[`${cell.day}|${cell.hour}`] = cell.count })

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* STICKY HEADER */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: "var(--bg-card)", padding: '16px 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Insights</span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Last updated: just now</span>
      </div>

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── SECTION 1: REVENUE ─────────────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>REVENUE</div>

          {/* Hero revenue card */}
          <div style={{
            backgroundColor: "var(--bg-card)", borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)',
            padding: 20, marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
                  ₹{thisMonthRevenue.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>This month</div>
                <span style={{
                  display: 'inline-block', marginTop: 8,
                  backgroundColor: growthPercent >= 0 ? 'var(--success-bg)' : 'var(--error-bg)',
                  color: growthPercent >= 0 ? 'var(--success)' : 'var(--error)',
                  fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                }}>
                  {growthPercent >= 0 ? '+' : ''}{growthPercent}% vs last month
                </span>
              </div>
              <RevenueBarChart data={revenue?.monthly_trend} />
            </div>
          </div>

          {/* Secondary stats */}
          <div style={{
            backgroundColor: "var(--bg-card)", borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)', padding: 12,
            display: 'flex', alignItems: 'center',
          }}>
            {[
              { value: `₹${(revenue?.avg_per_month || 0).toLocaleString('en-IN')}`, label: 'Avg/month' },
              { value: `₹${(revenue?.ytd || 0).toLocaleString('en-IN')}`, label: 'YTD' },
            ].map((stat, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center',
                borderRight: i === 0 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{stat.value}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2,
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 2: ACTIVITY HEATMAP ─────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>ACTIVITY HEATMAP</div>

          <div style={{
            backgroundColor: "var(--bg-card)", borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)', padding: 16,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Check-in Patterns</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Past 28 days</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', marginLeft: 32, marginBottom: 4 }}>
                {HEATMAP_TICK_HOURS.map((h, i) => (
                  <div key={i} style={{ flex: 1, fontSize: 9, color: 'var(--text-tertiary)', textAlign: 'center' }}>{formatHour12(h)}</div>
                ))}
              </div>
              {HEATMAP_ROW_ORDER.map(day => (
                <div key={day} style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                  <div style={{ width: 28, fontSize: 9, color: 'var(--text-tertiary)', flexShrink: 0 }}>{day}</div>
                  <div style={{ display: 'flex', flex: 1, gap: 2 }}>
                    {HEATMAP_VISIBLE_HOURS.map(h => {
                      const hourLabel = formatHour12(h)
                      const count = heatmapByKey[`${day}|${hourLabel}`] || 0
                      return (
                        <div key={h} style={{
                          flex: 1, height: 18, borderRadius: 3,
                          backgroundColor: getHeatColor(count),
                        }} title={`${count} check-ins`} />
                      )
                    })}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, marginLeft: 32 }}>
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Low</span>
                <div style={{
                  flex: 1, height: 8, borderRadius: 4,
                  background: 'linear-gradient(to right, var(--heatmap-0), var(--heatmap-1), var(--heatmap-2), var(--heatmap-3), var(--heatmap-4))',
                }} />
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>High</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: OCCUPANCY ────────────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>OCCUPANCY</div>

          <div style={{
            backgroundColor: "var(--bg-card)", borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)', padding: 16,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
              Weekly Pattern
            </div>
            <OccupancyBarChart data={occupancyWeekly} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                { label: `${peakHour} Peak hour` },
                { label: `${peakDay} Peak day` },
              ].map((pill, i) => (
                <span key={i} style={{
                  backgroundColor: 'var(--bg-primary)', borderRadius: 8, padding: '8px 12px',
                  fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                }}>{pill.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── SECTION 4: TOP TRAINERS ──────────────────────────────────────── */}
        <div style={{ paddingBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>TOP TRAINERS</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(stats?.trainers?.top_trainers || []).map((trainer, i) => {
              const { bg, text } = getAvatarColor(trainer.name)
              const rank = rankConfig[i] || rankConfig[2]
              return (
                <div key={trainer.id} style={{
                  backgroundColor: "var(--bg-card)", borderRadius: 12,
                  border: '0.5px solid rgba(0,0,0,0.08)', padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      backgroundColor: bg, color: text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600, flexShrink: 0,
                    }}>{getInitials(trainer.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{trainer.name}</div>
                      <div style={{
                        fontSize: 13, color: 'var(--text-secondary)', marginTop: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {trainer.specializations?.join(' · ') || 'No specializations'}
                      </div>
                    </div>
                    <span style={{
                      backgroundColor: rank.bg, color: rank.color,
                      fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                    }}>{rank.label}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {[
                      { label: `${trainer.client_count} clients` },
                      { label: `⏱ ${trainer.avg_sessions_per_client || 0} sessions/client` },
                    ].map((pill, j) => (
                      <span key={j} style={{
                        backgroundColor: 'var(--bg-primary)', borderRadius: 6, padding: '6px 10px',
                        fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                      }}>{pill.label}</span>
                    ))}
                  </div>
                </div>
              )
            })}

            {(!stats?.trainers?.top_trainers || stats.trainers.top_trainers.length === 0) && (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
                No trainers added yet
              </div>
            )}
          </div>
        </div>

      </div>

      <GymBottomNav active="insights" onMorePress={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  )
}
