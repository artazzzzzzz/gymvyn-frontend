import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getXPLeaderboard, getActiveSeason } from '../utils/api'
import { getAvatarColor, getInitials } from '../utils/avatarColor'
import { getLevelName } from '../utils/xpConstants'

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

const RANK_BADGES = {
  1: { bg: 'var(--warning-bg)', border: 'var(--warning)', color: 'var(--warning)' },
  2: { bg: 'var(--bg-pill)', border: 'var(--border)', color: 'var(--text-secondary)' },
  3: { bg: '#FAECE7', border: '#F0997B', color: '#993C1D' },
}

function LevelPill({ level }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 500,
      background: 'var(--bg-pill)', color: 'var(--text-secondary)',
      padding: '2px 6px', borderRadius: 6,
    }}>
      {getLevelName(level)}
    </span>
  )
}

function PodiumColumn({ entry, rank, size }) {
  const colors = getAvatarColor(entry.fullName)
  const initials = getInitials(entry.fullName)
  const badge = RANK_BADGES[rank]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 80 }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: size, height: size, borderRadius: size / 2,
          background: colors.bg, color: colors.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size > 48 ? 18 : 16, fontWeight: 600,
        }}>
          {initials}
        </div>
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 20, height: 20, borderRadius: 10,
          background: badge.bg, border: `1.5px solid ${badge.border}`,
          color: badge.color, fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {rank}
        </div>
      </div>
      <p style={{
        fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
        maxWidth: 92, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        margin: 0, textAlign: 'center',
      }}>
        {(entry.fullName || '').split(' ')[0]}
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
        {entry.totalXP?.toLocaleString() || 0} XP
      </p>
      <LevelPill level={entry.level || 1} />
    </div>
  )
}

export default function Leaderboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('gym')
  const [data, setData] = useState({ leaderboard: [], myRank: null })
  const [season, setSeason] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    setLoading(true); setError(null)
    Promise.all([
      getXPLeaderboard(tab).catch(err => { throw err }),
      getActiveSeason().catch(() => null),
    ])
      .then(([lb, s]) => {
        setData({
          leaderboard: lb?.leaderboard || [],
          myRank: lb?.myRank || lb?.selfRank || null,
        })
        setSeason(s)
      })
      .catch(err => setError(err.message || 'Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }, [user, tab])

  const board = data.leaderboard
  const top3 = board.slice(0, 3)
  const rest = board.slice(3)
  const me = data.myRank

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 56, paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0 }}>
          Leaderboard
        </h1>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: 'var(--bg-pill)', borderRadius: 12,
          padding: 3, marginTop: 16, width: 'fit-content',
        }}>
          {['gym', 'global'].map(t => {
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: active ? 'var(--black-cta)' : 'transparent',
                  color: active ? 'var(--black-cta-text)' : 'var(--text-secondary)',
                  border: 'none', borderRadius: 10,
                  padding: '8px 20px', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {t === 'gym' ? 'My gym' : 'Global'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Season banner */}
      {season?.season && (
        <div style={{ margin: '16px 20px 0' }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: '0 16px 16px 0',
            padding: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                {season.season.name}
              </span>
              <span style={{ fontSize: 13, color: 'var(--accent)' }}>
                {season.daysRemaining ?? 0} days left
              </span>
            </div>
            <div style={{ height: 3, background: 'var(--bg-input)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, 100 - ((season.daysRemaining || 0) / 30) * 100))}%`,
                background: 'var(--accent)',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Loading / error / empty */}
      {loading && (
        <p style={{ color: 'var(--text-muted)', padding: '24px 20px', textAlign: 'center' }}>
          Loading…
        </p>
      )}

      {!loading && error && tab === 'gym' && /gym/i.test(error) && (
        <div style={{ margin: '24px 20px 0', ...CARD, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            Join a gym to see the gym leaderboard.
          </p>
          <button
            onClick={() => navigate('/my-gym')}
            style={{
              marginTop: 12, height: 44, padding: '0 20px',
              background: 'var(--bg-card)', color: 'var(--text-primary)',
              border: '1px solid var(--text-primary)', borderRadius: 12,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            Find a gym
          </button>
        </div>
      )}

      {!loading && !error && board.length === 0 && (
        <p style={{ color: 'var(--text-muted)', padding: '24px 20px', textAlign: 'center' }}>
          No leaderboard entries yet
        </p>
      )}

      {/* Top 3 podium */}
      {!loading && top3.length > 0 && (
        <div style={{ margin: '20px 20px 0' }}>
          <div style={{ ...CARD }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12 }}>
              {top3[1] && (
                <div style={{ order: 1, paddingBottom: 8 }}>
                  <PodiumColumn entry={top3[1]} rank={2} size={44} />
                </div>
              )}
              {top3[0] && (
                <div style={{ order: 2 }}>
                  <PodiumColumn entry={top3[0]} rank={1} size={52} />
                </div>
              )}
              {top3[2] && (
                <div style={{ order: 3, paddingBottom: 8 }}>
                  <PodiumColumn entry={top3[2]} rank={3} size={44} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rankings list (4th+) */}
      {!loading && rest.length > 0 && (
        <div style={{ margin: '12px 20px 0' }}>
          <p style={SECTION_LABEL}>RANKINGS</p>
          <div style={CARD}>
            {rest.map((entry, i) => {
              const colors = getAvatarColor(entry.fullName)
              const initials = getInitials(entry.fullName)
              const isMe = entry.userId === user?.id
              return (
                <div
                  key={entry.userId || i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px',
                    borderTop: i === 0 ? 'none' : '0.5px solid var(--divider)',
                    background: isMe ? 'var(--accent-bg)' : 'transparent',
                    borderRadius: isMe ? 12 : 0,
                    margin: isMe ? '4px -12px' : 0,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', width: 28 }}>
                    {entry.rank || (i + 4)}
                  </span>
                  <div style={{
                    width: 32, height: 32, borderRadius: 16,
                    background: colors.bg, color: colors.text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{
                      fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {entry.fullName}
                    </span>
                    <LevelPill level={entry.level || 1} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {entry.totalXP?.toLocaleString() || 0}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* My position (sticky bottom) */}
      {!loading && me && !board.find(r => r.userId === user?.id) && (
        <div style={{
          position: 'fixed', bottom: 80, left: 0, right: 0, zIndex: 40,
          background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
          padding: '12px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Trophy size={18} color="var(--accent)" />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              Your rank: #{me.rank}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              {(me.totalXP || 0).toLocaleString()} XP
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
