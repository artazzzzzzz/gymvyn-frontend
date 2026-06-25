import { useState, useEffect, useRef, useCallback } from 'react'
import { useStaffPermissions } from '../../hooks/useStaffPermissions'
import NoAccessState from '../../components/staff/NoAccessState'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'

function LoadingSpinner() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2px solid var(--border-strong)', borderTopColor: 'var(--text-primary)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function StaffCheckin() {
  const { permissions, gymId, loading: permsLoading } = useStaffPermissions()
  const API = import.meta.env.VITE_API_URL || ''

  const [activeTab, setActiveTab] = useState('manual')
  const [occupancy, setOccupancy] = useState({ current_occupancy: 0, today_total: 0, members_inside: [] })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [historyData, setHistoryData] = useState({ total: 0, checkins: [] })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const searchTimeoutRef = useRef(null)
  const occupancyIntervalRef = useRef(null)

  const fetchOccupancy = useCallback(async () => {
    if (!gymId) return
    try {
      const res = await fetch(`${API}/api/gym-occupancy/${gymId}`)
      const data = await res.json()
      setOccupancy(data)
    } catch {}
  }, [gymId])

  useEffect(() => {
    fetchOccupancy()
    occupancyIntervalRef.current = setInterval(fetchOccupancy, 30000)
    return () => clearInterval(occupancyIntervalRef.current)
  }, [fetchOccupancy])

  const showToast = (type, message, subtitle) => {
    setToast({ type, message, subtitle })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCheckIn = async (memberId, userId, memberName, membershipType) => {
    try {
      const res = await fetch(`${API}/api/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_id: gymId, member_id: memberId, user_id: userId, method: 'manual' }),
      })
      const data = await res.json()
      if (res.status === 409) { showToast('error', 'Already checked in today', memberName); return }
      if (!res.ok) { showToast('error', 'Check-in failed', data.error || ''); return }
      showToast('success', `${memberName} checked in`, membershipType || '')
      fetchOccupancy()
      setSearchResults(prev => prev.map(m => m.member_id === memberId ? { ...m, is_inside: true } : m))
    } catch {
      showToast('error', 'Check-in failed', 'Network error')
    }
  }

  const handleCheckOut = async (checkinId, memberName) => {
    try {
      const res = await fetch(`${API}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_id: gymId, checkin_id: checkinId }),
      })
      if (!res.ok) { showToast('error', 'Checkout failed', ''); return }
      showToast('success', `${memberName} checked out`, '')
      fetchOccupancy()
    } catch {
      showToast('error', 'Checkout failed', 'Network error')
    }
  }

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return }
    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`${API}/api/gym-members-search/${gymId}?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        const insideIds = new Set(occupancy.members_inside.map(m => m.member_id))
        setSearchResults((Array.isArray(data) ? data : []).map(m => ({ ...m, is_inside: insideIds.has(m.member_id) })))
      } catch {} finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(searchTimeoutRef.current)
  }, [searchQuery, gymId, occupancy.members_inside])

  const fetchHistory = useCallback(async (date) => {
    if (!gymId) return
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API}/api/gym-checkin-history/${gymId}?date=${date}`)
      const data = await res.json()
      setHistoryData(data)
    } catch {} finally {
      setHistoryLoading(false)
    }
  }, [gymId])

  useEffect(() => {
    if (activeTab === 'history') fetchHistory(selectedDate)
  }, [activeTab, selectedDate, fetchHistory])

  const getDateStrip = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return {
        value: d.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      }
    })
  }

  const formatDuration = (checkedIn, checkedOut) => {
    if (!checkedOut) return null
    const mins = Math.floor((new Date(checkedOut) - new Date(checkedIn)) / 60000)
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  if (permsLoading) return <LoadingSpinner />
  if (!permissions.checkin) return (
    <NoAccessState
      message="Check-in Access Required"
      subtitle="Ask your gym owner to grant you check-in permission."
    />
  )

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: 'var(--bg-card)', borderBottom: '0.5px solid var(--border)',
      }}>
        <div style={{
          padding: '16px 20px 12px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Check-in</span>
          <span style={{
            backgroundColor: 'var(--success-bg)', color: 'var(--success)',
            fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 20,
          }}>● {occupancy.current_occupancy} Inside</span>
        </div>
        <div style={{ display: 'flex' }}>
          {[
            { key: 'manual', label: '🔍 Manual' },
            { key: 'history', label: '📋 History' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, height: 44, border: 'none', backgroundColor: 'transparent',
              fontSize: 13, fontWeight: 600,
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: activeTab === tab.key ? '2px solid var(--text-primary)' : '2px solid transparent',
              cursor: 'pointer',
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {activeTab === 'manual' && (
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              fontSize: 16, color: 'var(--text-tertiary)', pointerEvents: 'none',
            }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', height: 52, border: '0.5px solid var(--border-strong)',
                borderRadius: 16, padding: '0 44px 0 44px', fontSize: 15,
                boxSizing: 'border-box', outline: 'none',
                backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)',
              }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} style={{
                position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', fontSize: 18, color: 'var(--text-tertiary)', cursor: 'pointer',
              }}>×</button>
            )}
          </div>

          {searching && (
            <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
              Searching...
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {searchResults.map(member => {
                const { bg, text } = getAvatarColor(member.full_name)
                return (
                  <div key={member.member_id} style={{
                    backgroundColor: 'var(--bg-card)', borderRadius: 12,
                    border: '0.5px solid var(--border)',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      backgroundColor: bg, color: text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600, flexShrink: 0,
                    }}>{getInitials(member.full_name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{member.full_name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {member.phone || 'No phone'} · {member.membership_type || 'Member'}
                      </div>
                    </div>
                    {member.is_inside ? (
                      <span style={{
                        backgroundColor: 'var(--success-bg)', color: 'var(--success)',
                        fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                      }}>Inside</span>
                    ) : (
                      <button
                        onClick={() => handleCheckIn(member.member_id, member.user_id, member.full_name, member.membership_type)}
                        style={{
                          backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)', border: 'none',
                          borderRadius: 8, height: 32, padding: '0 16px',
                          fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
                        }}
                      >Check In</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>CURRENTLY INSIDE</div>

          <div style={{
            backgroundColor: 'var(--bg-card)', borderRadius: 12,
            border: '0.5px solid var(--border)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: '0.5px solid var(--divider)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Currently Inside</span>
              <span style={{
                backgroundColor: 'var(--success-bg)', color: 'var(--success)',
                fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
              }}>{occupancy.current_occupancy}</span>
            </div>
            {occupancy.members_inside.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                No members inside right now
              </div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {occupancy.members_inside.map((m, i) => {
                  const { bg, text } = getAvatarColor(m.full_name)
                  return (
                    <div key={m.checkin_id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                      borderBottom: i < occupancy.members_inside.length - 1 ? '0.5px solid var(--divider)' : 'none',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        backgroundColor: bg, color: text,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600, flexShrink: 0,
                      }}>{getInitials(m.full_name)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{m.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {new Date(m.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCheckOut(m.checkin_id, m.full_name)}
                        style={{
                          backgroundColor: 'var(--bg-card)', color: 'var(--error)',
                          border: '0.5px solid var(--error)', borderRadius: 8, height: 28,
                          padding: '0 12px', fontSize: 11, fontWeight: 500,
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >Check Out</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4,
            marginBottom: 16, scrollbarWidth: 'none',
          }}>
            {getDateStrip().map(d => (
              <button key={d.value} onClick={() => setSelectedDate(d.value)} style={{
                flexShrink: 0, height: 36, padding: '0 16px', borderRadius: 20,
                backgroundColor: selectedDate === d.value ? 'var(--text-primary)' : 'var(--bg-card)',
                color: selectedDate === d.value ? 'var(--bg-card)' : 'var(--text-primary)',
                border: selectedDate === d.value ? 'none' : '0.5px solid var(--border-strong)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>{d.label}</button>
            ))}
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card)', borderRadius: 12,
            border: '0.5px solid var(--border)', padding: 12,
            display: 'flex', alignItems: 'center', marginBottom: 16,
          }}>
            {[
              { value: historyData.total || 0, label: 'Selected Day' },
              { value: occupancy.today_total || 0, label: "Today's Total" },
            ].map((stat, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center',
                borderRight: i === 0 ? '0.5px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2,
                }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading...</div>
          ) : (historyData.checkins?.length ?? 0) === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
              No check-ins on this date
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(historyData.checkins || []).map(ci => {
                const { bg, text } = getAvatarColor(ci.full_name)
                const duration = formatDuration(ci.checked_in_at, ci.checked_out_at)
                return (
                  <div key={ci.id} style={{
                    backgroundColor: 'var(--bg-card)', borderRadius: 12,
                    border: '0.5px solid var(--border)', padding: 16,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      backgroundColor: bg, color: text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600, flexShrink: 0,
                    }}>{getInitials(ci.full_name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{ci.full_name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {ci.membership_type || 'Member'}
                        <span style={{
                          marginLeft: 6,
                          backgroundColor: 'var(--bg-pill)',
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: 'var(--text-secondary)',
                        }}>{ci.method === 'qr' ? 'QR' : 'Manual'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {new Date(ci.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {ci.checked_out_at ? duration : <span style={{ color: 'var(--success)' }}>● Inside</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: 16, right: 16, zIndex: 100,
          backgroundColor: toast.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
          borderRadius: 16, padding: '14px 16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: toast.type === 'success' ? 'var(--success)' : 'var(--error)' }}>
            {toast.type === 'success' ? '✓ ' : '⚠ '}{toast.message}
          </div>
          {toast.subtitle && (
            <div style={{ fontSize: 12, marginTop: 4, color: toast.type === 'success' ? 'var(--success)' : 'var(--error)' }}>
              {toast.subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
