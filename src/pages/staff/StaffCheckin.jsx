import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useStaffPermissions } from '../../hooks/useStaffPermissions'
import { useManualCheckinSearch } from '../../hooks/useManualCheckinSearch'
import NoAccessState from '../../components/staff/NoAccessState'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'
import { supabase } from '../../utils/supabase'
import { createPendingActionGuard, mergeInsideStatus } from '../../utils/manualCheckinSearch'
import { AppLoader, ButtonSpinner, InlineLoader, ListSkeleton, RefreshIndicator } from '../../components/loading/Loading'

export default function StaffCheckin() {
  const { permissions, gymId, loading: permsLoading } = useStaffPermissions()
  const API = import.meta.env.VITE_API_URL || ''

  const [activeTab, setActiveTab] = useState('manual')
  const [occupancy, setOccupancy] = useState({ current_occupancy: 0, today_total: 0, members_inside: [] })
  const { searchQuery, setSearchQuery, rawSearchResults, searching, searchError, clearSearch } = useManualCheckinSearch({ gymId })
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [historyData, setHistoryData] = useState({ total: 0, checkins: [] })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const occupancyIntervalRef = useRef(null)
  const isMountedRef = useRef(true)
  const [pendingCheckins, setPendingCheckins] = useState({})
  const pendingCheckinGuardRef = useRef(createPendingActionGuard())

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // isMountedRef guards the state update (not the in-flight request itself)
  // so a fetch that resolves after this effect instance has been torn down
  // — e.g. a fast unmount, or React StrictMode's dev-only double-invoke of
  // this effect — can never apply a stale response to a gone/superseded
  // component.
  const fetchOccupancy = useCallback(async () => {
    if (!gymId) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/gym-occupancy/${gymId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (isMountedRef.current) setOccupancy(data)
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
    const pendingKey = memberId || userId
    if (!pendingCheckinGuardRef.current.start(pendingKey)) return
    setPendingCheckins(current => ({ ...current, [pendingKey]: true }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ gym_id: gymId, member_id: memberId, user_id: userId, method: 'manual' }),
      })
      const data = await res.json()
      if (res.status === 409) { showToast('error', 'Already checked in today', memberName); return }
      if (!res.ok) { showToast('error', 'Check-in failed', data.error || ''); return }
      showToast('success', `${memberName} checked in`, membershipType || '')
      await fetchOccupancy()
    } catch {
      showToast('error', 'Check-in failed', 'Network error')
    } finally {
      pendingCheckinGuardRef.current.finish(pendingKey)
      setPendingCheckins(current => {
        const next = { ...current }
        delete next[pendingKey]
        return next
      })
    }
  }

  const handleCheckOut = async (checkinId, memberName) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ gym_id: gymId, checkin_id: checkinId }),
      })
      if (!res.ok) { showToast('error', 'Checkout failed', ''); return }
      showToast('success', `${memberName} checked out`, '')
      fetchOccupancy()
    } catch {
      showToast('error', 'Checkout failed', 'Network error')
    }
  }

  const searchResults = useMemo(() => {
    return mergeInsideStatus(rawSearchResults, occupancy.members_inside)
  }, [rawSearchResults, occupancy.members_inside])

  const fetchHistory = useCallback(async (date) => {
    if (!gymId) return
    setHistoryLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/gym-checkin-history/${gymId}?date=${date}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
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

  if (permsLoading) return <AppLoader label="Checking staff access" />
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
            { key: 'manual', label: 'Manual' },
            { key: 'history', label: 'History' },
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
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
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
              <button onClick={clearSearch} style={{
                position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', fontSize: 18, color: 'var(--text-tertiary)', cursor: 'pointer',
              }}>×</button>
            )}
            <InlineLoader
              label="Searching"
              visible={searching}
              style={{ position: 'absolute', right: searchQuery ? 42 : 16, top: '50%', transform: 'translateY(-50%)', fontSize: 12 }}
            />
          </div>

          {searchError && (
            <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'var(--error)' }}>
              {searchError}
            </div>
          )}

          {!searching && !searchError && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
              No members found
            </div>
          )}

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {searchResults.map(member => {
                const { bg, text } = getAvatarColor(member.full_name)
                const checkinPending = !!pendingCheckins[member.member_id || member.user_id]
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
                        disabled={checkinPending}
                        onClick={() => handleCheckIn(member.member_id, member.user_id, member.full_name, member.membership_type)}
                        style={{
                          backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)', border: 'none',
                          borderRadius: 8, height: 32, padding: '0 16px',
                          fontSize: 12, fontWeight: 500, cursor: checkinPending ? 'default' : 'pointer', flexShrink: 0,
                          opacity: checkinPending ? 0.65 : 1,
                        }}
                      >
                        {checkinPending ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 72, justifyContent: 'center' }}>
                            <ButtonSpinner size={12} /> Checking in...
                          </span>
                        ) : 'Check In'}
                      </button>
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

          {historyLoading && (historyData.checkins?.length ?? 0) === 0 ? (
            <ListSkeleton rows={4} />
          ) : (historyData.checkins?.length ?? 0) === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
              No check-ins on this date
            </div>
          ) : (
            <>
              <RefreshIndicator refreshing={historyLoading} />
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
                          {ci.checked_out_at ? duration : <span style={{ color: 'var(--success)' }}>Inside</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
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
            {toast.message}
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
