import { useState, useEffect } from 'react'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'

const gymId = typeof localStorage !== 'undefined' ? localStorage.getItem('gymId') : null

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
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={isCurrentMonth ? '#111' : '#E0E0E0'} />
            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={9} fill="#999">{d.month}</text>
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
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={isMax ? '#111' : '#E0E0E0'} />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#555">{d.count}</text>
            <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={10} fill="#999">{d.day?.slice(0, 3)}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Heatmap helpers ──────────────────────────────────────────────────────────
const getHeatColor = (count) => {
  if (count === 0) return '#F0F0F0'
  if (count <= 5) return '#DBEAFE'
  if (count <= 15) return '#93C5FD'
  if (count <= 25) return '#3B82F6'
  return '#1D4ED8'
}

// ─── Churn helpers ────────────────────────────────────────────────────────────
const getRiskBarWidth = (score) => `${Math.round(score * 100)}%`

const riskConfig = {
  high:   { label: 'High',   bg: '#FCEBEB', color: '#A32D2D', barColor: '#A32D2D' },
  medium: { label: 'Medium', bg: '#FAEEDA', color: '#854F0B', barColor: '#854F0B' },
  low:    { label: 'Low',    bg: '#EAF3DE', color: '#3B6D11', barColor: '#3B6D11' },
}

const rankConfig = {
  0: { label: '#1', bg: '#FAEEDA', color: '#854F0B' },
  1: { label: '#2', bg: '#F1EFE8', color: '#5F5E5A' },
  2: { label: '#3', bg: '#F1EFE8', color: '#5F5E5A' },
}

export default function GymInsights() {
  const API = import.meta.env.VITE_API_URL || ''
  const [stats, setStats] = useState(null)
  const [churnScores, setChurnScores] = useState(null)
  const [heatmap, setHeatmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLowRisk, setShowLowRisk] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [statsRes, churnRes, heatmapRes] = await Promise.all([
          fetch(`${API}/api/gym-stats/${gymId}`),
          fetch(`${API}/api/ml/scores/${gymId}`),
          fetch(`${API}/api/gym-activity-heatmap/${gymId}`),
        ])
        const [statsData, churnData, heatmapData] = await Promise.all([
          statsRes.json(),
          churnRes.json(),
          heatmapRes.json(),
        ])
        setStats(statsData)
        setChurnScores(churnData)
        setHeatmap(heatmapData)
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
      minHeight: '100vh', backgroundColor: '#F7F7F5',
      display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <span style={{ fontSize: 14, color: '#999' }}>Loading insights...</span>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F7F7F5', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* STICKY HEADER */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: 'white', padding: '16px 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>Insights</span>
        <span style={{ fontSize: 12, color: '#999' }}>Last updated: just now</span>
      </div>

      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── SECTION 1: REVENUE ─────────────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#999',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>REVENUE</div>

          {/* Hero revenue card */}
          <div style={{
            backgroundColor: 'white', borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)',
            padding: 20, marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#111' }}>
                  ₹{stats?.revenue?.this_month?.toLocaleString('en-IN') || '—'}
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>This month</div>
                <span style={{
                  display: 'inline-block', marginTop: 8,
                  backgroundColor: '#EAF3DE', color: '#3B6D11',
                  fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                }}>
                  +{stats?.revenue?.growth_percent || 0}% vs last month
                </span>
              </div>
              <RevenueBarChart data={stats?.revenue?.monthly_chart} />
            </div>
          </div>

          {/* Secondary stats */}
          <div style={{
            backgroundColor: 'white', borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)', padding: 12,
            display: 'flex', alignItems: 'center',
          }}>
            {[
              { value: `₹${(18200).toLocaleString('en-IN')}`, label: 'Avg/month' },
              { value: `₹${(243000).toLocaleString('en-IN')}`, label: 'YTD' },
            ].map((stat, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center',
                borderRight: i === 0 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{stat.value}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: '#999',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2,
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 2: ACTIVITY HEATMAP ─────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#999',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>ACTIVITY HEATMAP</div>

          <div style={{
            backgroundColor: 'white', borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)', padding: 16,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Check-in Patterns</span>
              <span style={{ fontSize: 12, color: '#999' }}>Past 28 days</span>
            </div>

            {heatmap ? (() => {
              const visibleHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
              const hourLabels = ['6A', '8A', '10A', '12P', '2P', '4P', '6P', '8P']
              const rowOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
              const days = heatmap.heatmap || []
              const sortedDays = rowOrder.map(d => days.find(r => r.day === d) || { day: d, hours: [] })

              return (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', marginLeft: 32, marginBottom: 4 }}>
                    {hourLabels.map((h, i) => (
                      <div key={i} style={{ flex: 1, fontSize: 9, color: '#999', textAlign: 'center' }}>{h}</div>
                    ))}
                  </div>
                  {sortedDays.map(row => (
                    <div key={row.day} style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                      <div style={{ width: 28, fontSize: 9, color: '#999', flexShrink: 0 }}>{row.day.slice(0, 3)}</div>
                      <div style={{ display: 'flex', flex: 1, gap: 2 }}>
                        {visibleHours.map(h => {
                          const cell = row.hours?.find(hr => hr.hour === h)
                          const count = cell?.count || 0
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
                    <span style={{ fontSize: 9, color: '#999' }}>Low</span>
                    <div style={{
                      flex: 1, height: 8, borderRadius: 4,
                      background: 'linear-gradient(to right, #F0F0F0, #DBEAFE, #93C5FD, #3B82F6, #1D4ED8)',
                    }} />
                    <span style={{ fontSize: 9, color: '#999' }}>High</span>
                  </div>
                </div>
              )
            })() : (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: '#999' }}>
                No heatmap data available
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 3: OCCUPANCY ────────────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#999',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>OCCUPANCY</div>

          <div style={{
            backgroundColor: 'white', borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)', padding: 16,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 16 }}>
              Weekly Pattern
            </div>
            <OccupancyBarChart data={stats?.occupancy?.weekly_chart} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                { label: `🕕 ${stats?.occupancy?.peak_hour || '—'} Peak hour` },
                { label: `📅 ${stats?.occupancy?.peak_day || '—'} Peak day` },
              ].map((pill, i) => (
                <span key={i} style={{
                  backgroundColor: '#F7F7F5', borderRadius: 8, padding: '8px 12px',
                  fontSize: 12, fontWeight: 500, color: '#555',
                }}>{pill.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── SECTION 4: CHURN RISK ───────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#999',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>CHURN RISK</span>
            <span style={{
              backgroundColor: '#EEEDFE', color: '#3C3489',
              fontSize: 10, fontWeight: 600, padding: '4px 8px', borderRadius: 20,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>AI</span>
          </div>

          {churnScores?.summary && (
            <div style={{
              backgroundColor: 'white', borderRadius: 12,
              border: '0.5px solid rgba(0,0,0,0.08)', padding: 12,
              marginBottom: 10, display: 'flex', alignItems: 'center',
            }}>
              {[
                { value: churnScores.summary.high_risk_count, label: 'High', color: '#A32D2D' },
                { value: churnScores.summary.medium_risk_count, label: 'Medium', color: '#854F0B' },
                { value: churnScores.summary.low_risk_count, label: 'Low', color: '#3B6D11' },
              ].map((stat, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center',
                  borderRight: i < 2 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: stat.color }}>{stat.value}</div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: '#999',
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2,
                  }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(churnScores?.scores || [])
              .filter(s => showLowRisk ? true : s.risk_level !== 'low')
              .map(member => {
                const { bg, text } = getAvatarColor(member.full_name)
                const risk = riskConfig[member.risk_level] || riskConfig.low
                const scorePercent = Math.round(member.risk_score * 100)
                const visibleFactors = member.risk_factors?.slice(0, 3) || []
                const hiddenCount = (member.risk_factors?.length || 0) - 3

                return (
                  <div key={member.user_id} style={{
                    backgroundColor: 'white', borderRadius: 12,
                    border: '0.5px solid rgba(0,0,0,0.08)', padding: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        backgroundColor: bg, color: text,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 600, flexShrink: 0,
                      }}>{getInitials(member.full_name)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{member.full_name}</div>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{member.membership_type}</div>
                      </div>
                      <span style={{
                        backgroundColor: risk.bg, color: risk.color,
                        fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                      }}>{risk.label}</span>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#999' }}>Risk score</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>{scorePercent}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 8, backgroundColor: '#F0F0F0', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: getRiskBarWidth(member.risk_score),
                          backgroundColor: risk.barColor, borderRadius: 8,
                        }} />
                      </div>
                    </div>

                    {visibleFactors.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {visibleFactors.map((f, i) => (
                          <span key={i} style={{
                            backgroundColor: '#F7F7F5', borderRadius: 6, padding: '5px 9px', fontSize: 11, color: '#555',
                          }}>{f}</span>
                        ))}
                        {hiddenCount > 0 && (
                          <span style={{
                            backgroundColor: '#F1EFE8', borderRadius: 6, padding: '5px 9px', fontSize: 11, color: '#5F5E5A',
                          }}>+{hiddenCount} more</span>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#666' }}>
                        Last visit: {member.last_visit_days_ago} days ago
                      </span>
                      <button style={{
                        backgroundColor: 'white', color: '#111', border: '0.5px solid #111',
                        borderRadius: 8, height: 28, padding: '0 12px',
                        fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      }}>Remind</button>
                    </div>
                  </div>
                )
              })}
          </div>

          {(churnScores?.summary?.low_risk_count || 0) > 0 && (
            <button
              onClick={() => setShowLowRisk(prev => !prev)}
              style={{
                background: 'none', border: 'none', color: '#185FA5',
                fontSize: 13, cursor: 'pointer', marginTop: 8,
                padding: '8px 0', display: 'block',
              }}
            >
              {showLowRisk
                ? 'Hide low risk members'
                : `Show ${churnScores.summary.low_risk_count} low risk members`
              }
            </button>
          )}
        </div>

        {/* ── SECTION 5: TOP TRAINERS ──────────────────────────────────────── */}
        <div style={{ paddingBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#999',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>TOP TRAINERS</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(stats?.trainers?.top_trainers || []).map((trainer, i) => {
              const { bg, text } = getAvatarColor(trainer.name)
              const rank = rankConfig[i] || rankConfig[2]
              return (
                <div key={trainer.id} style={{
                  backgroundColor: 'white', borderRadius: 12,
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
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{trainer.name}</div>
                      <div style={{
                        fontSize: 13, color: '#666', marginTop: 2,
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
                      { label: `👥 ${trainer.client_count} clients` },
                      { label: `⏱ ${trainer.avg_sessions_per_client || 0} sessions/client` },
                    ].map((pill, j) => (
                      <span key={j} style={{
                        backgroundColor: '#F7F7F5', borderRadius: 6, padding: '6px 10px',
                        fontSize: 12, fontWeight: 500, color: '#555',
                      }}>{pill.label}</span>
                    ))}
                  </div>
                </div>
              )
            })}

            {(!stats?.trainers?.top_trainers || stats.trainers.top_trainers.length === 0) && (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: '#999' }}>
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
