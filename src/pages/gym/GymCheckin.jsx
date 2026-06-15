import { useState, useEffect, useRef, useCallback } from 'react'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'
import { formatRelative } from '../../utils/dateHelpers'

export default function GymCheckin() {
  const gymId = localStorage.getItem('gymId')
  const API = import.meta.env.VITE_API_URL || ''

  const [activeTab, setActiveTab] = useState('scan')
  const [occupancy, setOccupancy] = useState({ current_occupancy: 0, today_total: 0, members_inside: [] })
  const [scanStatus, setScanStatus] = useState('idle')
  const [manualCode, setManualCode] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [historyData, setHistoryData] = useState({ total: 0, checkins: [] })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const searchTimeoutRef = useRef(null)
  const occupancyIntervalRef = useRef(null)

  // ─── Occupancy polling ───────────────────────────────────────────────────
  const fetchOccupancy = useCallback(async () => {
    if (!gymId) return
    try {
      const res = await fetch(`${API}/api/gym-occupancy/${gymId}`)
      const data = await res.json()
      setOccupancy(data)
    } catch (err) {
      console.error('Occupancy fetch failed:', err)
    }
  }, [gymId])

  useEffect(() => {
    fetchOccupancy()
    occupancyIntervalRef.current = setInterval(fetchOccupancy, 30000)
    return () => clearInterval(occupancyIntervalRef.current)
  }, [fetchOccupancy])

  // ─── Toast ───────────────────────────────────────────────────────────────
  const showToast = (type, message, subtitle) => {
    setToast({ type, message, subtitle })
    setTimeout(() => setToast(null), 3000)
  }

  // ─── Check-in ────────────────────────────────────────────────────────────
  const handleCheckIn = async (memberId, userId, memberName, memberSince, membershipType) => {
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

  // ─── Check-out ───────────────────────────────────────────────────────────
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

  // ─── Search (debounced) ──────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return }
    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`${API}/api/gym-members-search/${gymId}?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        const insideIds = new Set(occupancy.members_inside.map(m => m.member_id))
        setSearchResults(
          (Array.isArray(data) ? data : []).map(m => ({ ...m, is_inside: insideIds.has(m.member_id) }))
        )
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(searchTimeoutRef.current)
  }, [searchQuery, gymId, occupancy.members_inside])

  // ─── History ─────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (date) => {
    if (!gymId) return
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API}/api/gym-checkin-history/${gymId}?date=${date}`)
      const data = await res.json()
      setHistoryData(data)
    } catch (err) {
      console.error('History fetch failed:', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [gymId])

  useEffect(() => {
    if (activeTab === 'history') fetchHistory(selectedDate)
  }, [activeTab, selectedDate, fetchHistory])

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const getDateStrip = () => {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push({
        value: d.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      })
    }
    return dates
  }

  const formatDuration = (checkedIn, checkedOut) => {
    if (!checkedOut) return null
    const diff = new Date(checkedOut) - new Date(checkedIn)
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F7F7F5', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* STICKY HEADER + TABS */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: 'white', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <div style={{
          padding: '16px 20px 12px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>Check-in</span>
          <span style={{
            backgroundColor: '#EAF3DE', color: '#3B6D11',
            fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 20,
          }}>● {occupancy.current_occupancy} Inside</span>
        </div>

        <div style={{ display: 'flex' }}>
          {[
            { key: 'scan', label: '📷 Scan QR' },
            { key: 'manual', label: '🔍 Manual' },
            { key: 'history', label: '📋 History' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, height: 44, border: 'none', backgroundColor: 'transparent',
                fontSize: 13, fontWeight: 600,
                color: activeTab === tab.key ? '#111' : '#999',
                borderBottom: activeTab === tab.key ? '2px solid #111' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >{tab.label}</button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: SCAN QR ─────────────────────────────────────────────── */}
      {activeTab === 'scan' && (
        <div style={{ padding: '20px 20px 0' }}>
          {/* QR Scanner box */}
          <div style={{
            width: '100%', paddingBottom: '100%', position: 'relative',
            backgroundColor: '#1a1a1a', borderRadius: 16, overflow: 'hidden', marginBottom: 12,
          }}>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 12,
            }}>
              {/* Corner brackets */}
              {[
                { top: 20, left: 20, borderTop: '3px solid white', borderLeft: '3px solid white' },
                { top: 20, right: 20, borderTop: '3px solid white', borderRight: '3px solid white' },
                { bottom: 20, left: 20, borderBottom: '3px solid white', borderLeft: '3px solid white' },
                { bottom: 20, right: 20, borderBottom: '3px solid white', borderRight: '3px solid white' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 24, height: 24, ...s }} />
              ))}
              <style>{`@keyframes scanLine{0%{top:20%}50%{top:75%}100%{top:20%}}`}</style>
              <div style={{
                position: 'absolute', left: '10%', right: '10%', height: 2,
                backgroundColor: '#10b981', animation: 'scanLine 2s ease-in-out infinite',
                boxShadow: '0 0 8px #10b981',
              }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '0 40px' }}>
                Point camera at member's QR code
              </span>
            </div>
          </div>

          {/* Helper buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {['Enter code manually', 'Upload QR image'].map((label, i) => (
              <button key={i} style={{
                flex: 1, height: 40, backgroundColor: 'white',
                border: '0.5px solid #111', borderRadius: 12,
                fontSize: 13, fontWeight: 500, color: '#111', cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>

          {/* Today's scans */}
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#999',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>TODAY'S SCANS</div>

          {occupancy.members_inside.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: '#999' }}>
              No check-ins yet today
            </div>
          ) : (
            <div style={{
              backgroundColor: 'white', borderRadius: 12,
              border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden',
            }}>
              {occupancy.members_inside.slice(0, 5).map((m, i) => {
                const { bg, text } = getAvatarColor(m.full_name)
                return (
                  <div key={m.checkin_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    borderBottom: i < Math.min(4, occupancy.members_inside.length - 1)
                      ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      backgroundColor: bg, color: text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 600, flexShrink: 0,
                    }}>{getInitials(m.full_name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{m.full_name}</div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{formatRelative(m.checked_in_at)}</div>
                    </div>
                    <span style={{
                      backgroundColor: '#E1F5EE', color: '#0F6E56',
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                    }}>Inside</span>
                  </div>
                )
              })}
              {occupancy.members_inside.length > 5 && (
                <div style={{
                  padding: '10px 16px', textAlign: 'center', fontSize: 13, color: '#185FA5',
                  borderTop: '0.5px solid rgba(0,0,0,0.06)', cursor: 'pointer',
                }}>View all</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MANUAL ──────────────────────────────────────────────── */}
      {activeTab === 'manual' && (
        <div style={{ padding: '16px 20px 0' }}>
          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              fontSize: 16, color: '#999', pointerEvents: 'none',
            }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', height: 52, border: '0.5px solid rgba(0,0,0,0.15)',
                borderRadius: 16, padding: '0 44px 0 44px', fontSize: 15,
                boxSizing: 'border-box', outline: 'none', backgroundColor: 'white',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', fontSize: 18, color: '#999', cursor: 'pointer',
                }}
              >×</button>
            )}
          </div>

          {searching && (
            <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#999' }}>
              Searching...
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {searchResults.map(member => {
                const { bg, text } = getAvatarColor(member.full_name)
                return (
                  <div key={member.member_id} style={{
                    backgroundColor: 'white', borderRadius: 12,
                    border: '0.5px solid rgba(0,0,0,0.08)',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      backgroundColor: bg, color: text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600, flexShrink: 0,
                    }}>{getInitials(member.full_name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{member.full_name}</div>
                      <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                        {member.phone || 'No phone'} · {member.membership_type || 'Member'}
                      </div>
                    </div>
                    {member.is_inside ? (
                      <span style={{
                        backgroundColor: '#E1F5EE', color: '#0F6E56',
                        fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                      }}>Inside</span>
                    ) : (
                      <button
                        onClick={() => handleCheckIn(member.member_id, member.user_id, member.full_name, null, member.membership_type)}
                        style={{
                          backgroundColor: '#111', color: 'white', border: 'none',
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

          {/* Currently Inside */}
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#999',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>CURRENTLY INSIDE</div>

          <div style={{
            backgroundColor: 'white', borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Currently Inside</span>
              <span style={{
                backgroundColor: '#E1F5EE', color: '#0F6E56',
                fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
              }}>{occupancy.current_occupancy}</span>
            </div>

            {occupancy.members_inside.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#999' }}>
                No members inside right now
              </div>
            ) : (
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {occupancy.members_inside.map((m, i) => {
                  const { bg, text } = getAvatarColor(m.full_name)
                  return (
                    <div key={m.checkin_id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                      borderBottom: i < occupancy.members_inside.length - 1
                        ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                      height: 48, boxSizing: 'border-box',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        backgroundColor: bg, color: text,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600, flexShrink: 0,
                      }}>{getInitials(m.full_name)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{m.full_name}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>
                          {new Date(m.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCheckOut(m.checkin_id, m.full_name)}
                        style={{
                          backgroundColor: 'white', color: '#A32D2D',
                          border: '0.5px solid #A32D2D', borderRadius: 8, height: 28,
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

      {/* ── TAB 3: HISTORY ─────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div style={{ padding: '16px 20px 0' }}>
          {/* Date strip */}
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4,
            marginBottom: 16, scrollbarWidth: 'none',
          }}>
            {getDateStrip().map(d => (
              <button
                key={d.value}
                onClick={() => setSelectedDate(d.value)}
                style={{
                  flexShrink: 0, width: 80, height: 36, borderRadius: 20,
                  backgroundColor: selectedDate === d.value ? '#111' : 'white',
                  color: selectedDate === d.value ? 'white' : '#111',
                  border: selectedDate === d.value ? 'none' : '0.5px solid rgba(0,0,0,0.12)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >{d.label}</button>
            ))}
          </div>

          {/* Stats strip */}
          <div style={{
            backgroundColor: 'white', borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)', padding: 12,
            display: 'flex', alignItems: 'center', marginBottom: 16,
          }}>
            {[
              { value: historyData.total || 0, label: 'Total' },
              { value: occupancy.today_total || 0, label: "Today's" },
              { value: '—', label: 'Peak Hour' },
            ].map((stat, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center',
                borderRight: i < 2 ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
              }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>{stat.value}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: '#999',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2,
                }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#999' }}>Loading...</div>
          ) : (historyData.checkins?.length ?? 0) === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#999' }}>
              No check-ins on this date
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(historyData.checkins || []).map(ci => {
                const { bg, text } = getAvatarColor(ci.full_name)
                const duration = formatDuration(ci.checked_in_at, ci.checked_out_at)
                return (
                  <div key={ci.id} style={{
                    backgroundColor: 'white', borderRadius: 12,
                    border: '0.5px solid rgba(0,0,0,0.08)', padding: 16,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      backgroundColor: bg, color: text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600, flexShrink: 0,
                    }}>{getInitials(ci.full_name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{ci.full_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: '#666' }}>{ci.membership_type || 'Member'}</span>
                        <span style={{
                          backgroundColor: ci.method === 'qr' ? '#E6F1FB' : '#F1EFE8',
                          color: ci.method === 'qr' ? '#185FA5' : '#5F5E5A',
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>{ci.method === 'qr' ? 'QR' : 'Manual'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
                        {new Date(ci.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                        {ci.checked_out_at
                          ? duration
                          : <span style={{ color: '#0F6E56' }}>● Still inside</span>
                        }
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: 16, right: 16, zIndex: 100,
          backgroundColor: toast.type === 'success' ? '#EAF3DE' : '#FCEBEB',
          borderRadius: 16, padding: '14px 16px',
          animation: 'slideDown 0.3s ease',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          <style>{`@keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <div style={{ fontSize: 15, fontWeight: 600, color: toast.type === 'success' ? '#3B6D11' : '#A32D2D' }}>
            {toast.type === 'success' ? '✓ ' : '⚠ '}{toast.message}
          </div>
          {toast.subtitle && (
            <div style={{ fontSize: 12, marginTop: 4, color: toast.type === 'success' ? '#3B6D11' : '#A32D2D' }}>
              {toast.subtitle}
            </div>
          )}
        </div>
      )}

      <GymBottomNav active="checkin" onMorePress={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  )
}
