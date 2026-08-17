import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'
import { formatRelative, istDateStr } from '../../utils/dateHelpers'
import { useOwnerGymId } from '../../hooks/useOwnerGymId'
import { useManualCheckinSearch } from '../../hooks/useManualCheckinSearch'
import { supabase } from '../../utils/supabase'
import { createPendingActionGuard, mergeInsideStatus } from '../../utils/manualCheckinSearch'
import { ButtonSpinner, InlineLoader, ListSkeleton, RefreshIndicator } from '../../components/loading/Loading'

export default function GymCheckin() {
  const gymId = useOwnerGymId()
  const API = import.meta.env.VITE_API_URL || ''

  const [activeTab, setActiveTab] = useState('scan')
  const [occupancy, setOccupancy] = useState({ current_occupancy: 0, today_total: 0, members_inside: [] })
  const [scanStatus, setScanStatus] = useState('idle')
  const [manualCode, setManualCode] = useState('')
  const { searchQuery, setSearchQuery, rawSearchResults, searching, searchError, clearSearch } = useManualCheckinSearch({ gymId })
  const [selectedDate, setSelectedDate] = useState(istDateStr())
  const [historyData, setHistoryData] = useState({ total: 0, checkins: [] })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const occupancyIntervalRef = useRef(null)
  const isMountedRef = useRef(true)
  const headerRef = useRef(null)
  const qrFileRef = useRef(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [pendingCheckins, setPendingCheckins] = useState({})
  const [qrScanning, setQrScanning] = useState(false)
  const pendingCheckinGuardRef = useRef(createPendingActionGuard())

  // Measure the sticky header (title row + tab bar) so the toast can be
  // pinned just below it instead of overlapping it with a guessed offset.
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => setHeaderHeight(el.offsetHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // ─── Occupancy polling ───────────────────────────────────────────────────
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
    } catch (err) {
      if (isMountedRef.current) console.error('Occupancy fetch failed:', err)
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

  // ─── Check-out ───────────────────────────────────────────────────────────
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

  // ─── QR image upload check-in ────────────────────────────────────────────
  const handleQRUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    // Reset the input so the same file can be picked again if needed
    e.target.value = ''

    setQrScanning(true)
    try {
      // Draw the image onto an offscreen canvas, then extract pixel data for jsQR
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0)
      const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height)

      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (!code) {
        showToast('error', 'No QR code found', 'Try a clearer or closer photo')
        return
      }

      // The QR payload is JSON: {gym_id, user_id, member_id, ts}
      // The backend's POST /api/checkin handles qr_payload natively.
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ gym_id: gymId, qr_payload: code.data }),
      })
      const data = await res.json()
      if (res.status === 409) { showToast('error', 'Already checked in today', data.error || ''); return }
      if (!res.ok) { showToast('error', 'Check-in failed', data.error || ''); return }
      showToast('success', `${data.member_name || 'Member'} checked in`, 'QR scan')
      await fetchOccupancy()
    } catch {
      showToast('error', 'Check-in failed', 'Network error')
    } finally {
      setQrScanning(false)
    }
  }

  const searchResults = useMemo(() => {
    return mergeInsideStatus(rawSearchResults, occupancy.members_inside)
  }, [rawSearchResults, occupancy.members_inside])

  // ─── History ─────────────────────────────────────────────────────────────
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
      const value = istDateStr(new Date(Date.now() - i * 86400000))
      dates.push({
        value,
        label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
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
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* STICKY HEADER + TABS */}
      <div ref={headerRef} style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: "var(--bg-card)", borderBottom: '0.5px solid rgba(0,0,0,0.08)',
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
            { key: 'scan', label: 'Scan QR' },
            { key: 'manual', label: 'Manual' },
            { key: 'history', label: 'History' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, height: 44, border: 'none', backgroundColor: 'transparent',
                fontSize: 13, fontWeight: 600,
                color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderBottom: activeTab === tab.key ? '2px solid var(--text-primary)' : '2px solid transparent',
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
            backgroundColor: 'var(--bg-camera)', borderRadius: 16, overflow: 'hidden', marginBottom: 12,
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
                backgroundColor: 'var(--success)', animation: 'scanLine 2s ease-in-out infinite',
                boxShadow: '0 0 8px var(--success)',
              }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '0 40px' }}>
                Point camera at member's QR code
              </span>
            </div>
          </div>

          {/* Helper buttons */}
          <input
            ref={qrFileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleQRUpload}
          />
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <button
              onClick={() => setActiveTab('manual')}
              style={{
                flex: 1, height: 40, backgroundColor: 'var(--bg-card)',
                border: '0.5px solid var(--text-primary)', borderRadius: 12,
                fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer',
              }}
            >Enter code manually</button>
            <button
              onClick={() => !qrScanning && qrFileRef.current?.click()}
              disabled={qrScanning}
              style={{
                flex: 1, height: 40, backgroundColor: 'var(--bg-card)',
                border: '0.5px solid var(--text-primary)', borderRadius: 12,
                fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                cursor: qrScanning ? 'default' : 'pointer',
                opacity: qrScanning ? 0.65 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {qrScanning ? (
                <>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    border: '1.5px solid var(--text-primary)',
                    borderTopColor: 'transparent',
                    animation: 'spin 0.7s linear infinite',
                    flexShrink: 0,
                  }} />
                  Scanning…
                </>
              ) : 'Upload QR image'}
            </button>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>

          {/* Today's scans */}
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>TODAY'S SCANS</div>

          {occupancy.members_inside.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
              No check-ins yet today
            </div>
          ) : (
            <div style={{
              backgroundColor: "var(--bg-card)", borderRadius: 12,
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
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{m.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{formatRelative(m.checked_in_at)}</div>
                    </div>
                    <span style={{
                      backgroundColor: 'var(--success-bg)', color: 'var(--success)',
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                    }}>Inside</span>
                  </div>
                )
              })}
              {occupancy.members_inside.length > 5 && (
                <div style={{
                  padding: '10px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-cta)',
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
                width: '100%', height: 52, border: '0.5px solid rgba(0,0,0,0.15)',
                borderRadius: 16, padding: '0 44px 0 44px', fontSize: 15,
                boxSizing: 'border-box', outline: 'none', backgroundColor: "var(--bg-card)",
              }}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', fontSize: 18, color: 'var(--text-tertiary)', cursor: 'pointer',
                }}
              >×</button>
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
                    backgroundColor: "var(--bg-card)", borderRadius: 12,
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
                        onClick={() => handleCheckIn(member.member_id, member.user_id, member.full_name, null, member.membership_type)}
                        style={{
                          backgroundColor: 'var(--text-primary)', color: "var(--bg-card)", border: 'none',
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

          {/* Currently Inside */}
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>CURRENTLY INSIDE</div>

          <div style={{
            backgroundColor: "var(--bg-card)", borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)',
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
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{m.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {new Date(m.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCheckOut(m.checkin_id, m.full_name)}
                        style={{
                          backgroundColor: "var(--bg-card)", color: 'var(--error)',
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
                  backgroundColor: selectedDate === d.value ? 'var(--text-primary)' : "var(--bg-card)",
                  color: selectedDate === d.value ? 'var(--bg-card)' : 'var(--text-primary)',
                  border: selectedDate === d.value ? 'none' : '0.5px solid rgba(0,0,0,0.12)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >{d.label}</button>
            ))}
          </div>

          {/* Stats strip */}
          <div style={{
            backgroundColor: "var(--bg-card)", borderRadius: 12,
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
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{stat.value}</div>
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
                      backgroundColor: "var(--bg-card)", borderRadius: 12,
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ci.membership_type || 'Member'}</span>
                          <span style={{
                            backgroundColor: ci.method === 'qr' ? 'var(--accent-bg)' : 'var(--bg-pill)',
                            color: ci.method === 'qr' ? 'var(--text-cta)' : 'var(--text-secondary)',
                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>{ci.method === 'qr' ? 'QR' : 'Manual'}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {new Date(ci.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {ci.checked_out_at
                            ? duration
                            : <span style={{ color: 'var(--success)' }}>Inside</span>
                          }
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

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', top: headerHeight + 12, left: 16, right: 16, zIndex: 100,
          backgroundColor: toast.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
          borderRadius: 16, padding: '14px 16px',
          animation: 'slideDown 0.3s ease',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          <style>{`@keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
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

      <GymBottomNav active="checkin" onMorePress={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  )
}
