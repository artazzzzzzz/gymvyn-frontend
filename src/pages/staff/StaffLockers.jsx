import { useState, useEffect, useCallback } from 'react'
import { useStaffPermissions } from '../../hooks/useStaffPermissions'
import NoAccessState from '../../components/staff/NoAccessState'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'
import { supabase } from '../../utils/supabase'

const API = import.meta.env.VITE_API_URL || ''

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

const STATUS_META = {
  available:   { label: 'Available',    bg: 'var(--success-bg)',  color: 'var(--success)', cardBorder: 'var(--success)' },
  occupied:    { label: 'Occupied',     bg: 'var(--error-bg)',    color: 'var(--error)',   cardBorder: 'var(--error)' },
  maintenance: { label: 'Maintenance',  bg: 'var(--warning-bg)', color: 'var(--warning)', cardBorder: 'var(--warning)' },
}

async function staffApiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  return res
}

function AssignSheet({ locker, gymId, onClose, onSuccess }) {
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [duration, setDuration] = useState('30')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await staffApiFetch(`/api/gym-members-search/${gymId}?q=${encodeURIComponent(searchQ)}`)
        const data = await res.json()
        setSearchResults(Array.isArray(data) ? data : [])
      } catch {} finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [searchQ, gymId])

  const handleAssign = async () => {
    if (!selectedMember || !duration) return
    setSubmitting(true)
    try {
      const res = await staffApiFetch(`/api/staff/lockers/${locker.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ member_id: selectedMember.user_id, duration_days: parseInt(duration) }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to assign')
        return
      }
      onSuccess()
    } catch {
      alert('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
        padding: '8px 0 40px', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 4, backgroundColor: 'var(--border-strong)', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Assign Locker {locker.label}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            {locker.is_paid ? `₹${locker.price} · Paid locker` : 'Free locker'}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Search Member</div>
            <input
              placeholder="Name or phone..."
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setSelectedMember(null) }}
              style={{
                width: '100%', height: 48, borderRadius: 12, padding: '0 16px',
                border: '0.5px solid var(--border-strong)',
                backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {searching && <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '8px 0' }}>Searching...</div>}

          {!selectedMember && searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {searchResults.map(m => (
                <div
                  key={m.member_id}
                  onClick={() => { setSelectedMember(m); setSearchQ(m.full_name) }}
                  style={{
                    padding: '10px 14px', backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 10, border: '0.5px solid var(--border)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{m.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.membership_type || 'Member'}</div>
                </div>
              ))}
            </div>
          )}

          {selectedMember && (
            <div style={{
              padding: '10px 14px', backgroundColor: 'var(--success-bg)',
              borderRadius: 10, marginBottom: 16,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>{selectedMember.full_name}</div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Duration</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['7', '30', '60', '90', '180', '365'].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  style={{
                    padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    backgroundColor: duration === d ? 'var(--text-primary)' : 'var(--bg-pill)',
                    color: duration === d ? 'var(--bg-card)' : 'var(--text-primary)',
                  }}
                >{d}d</button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAssign}
            disabled={submitting || !selectedMember}
            style={{
              width: '100%', height: 48, backgroundColor: 'var(--text-primary)',
              color: 'var(--bg-card)', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              opacity: (submitting || !selectedMember) ? 0.5 : 1,
            }}
          >{submitting ? 'Assigning...' : 'Assign Locker'}</button>
        </div>
      </div>
    </>
  )
}

function LockerDetailSheet({ locker, onClose, onAssign, onRelease }) {
  const [releasing, setReleasing] = useState(false)
  const meta = STATUS_META[locker.status] || STATUS_META.available

  const handleRelease = async () => {
    if (!confirm(`Release locker ${locker.label}? This will end the current assignment.`)) return
    setReleasing(true)
    try {
      const res = await staffApiFetch(`/api/staff/lockers/${locker.id}/release`, { method: 'PATCH' })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to release')
        return
      }
      onRelease()
    } catch {
      alert('Network error')
    } finally {
      setReleasing(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
        padding: '8px 0 40px',
      }}>
        <div style={{ width: 40, height: 4, backgroundColor: 'var(--border-strong)', borderRadius: 2, margin: '0 auto 20px' }} />
        <div style={{ padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              {locker.label}
            </div>
            <span style={{
              backgroundColor: meta.bg, color: meta.color,
              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
            }}>{meta.label}</span>
          </div>

          {locker.status === 'occupied' && locker.assignment && (
            <div style={{
              backgroundColor: 'var(--bg-elevated)', borderRadius: 12, padding: 16, marginBottom: 20,
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {locker.assignment.member_name || 'Member'}
              </div>
              {locker.assignment.expires_at && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Expires: {new Date(locker.assignment.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
              {locker.assignment.payment_status && (
                <div style={{
                  marginTop: 8, display: 'inline-block',
                  backgroundColor: locker.assignment.payment_status === 'paid' ? 'var(--success-bg)' : 'var(--warning-bg)',
                  color: locker.assignment.payment_status === 'paid' ? 'var(--success)' : 'var(--warning)',
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                }}>{locker.assignment.payment_status === 'paid' ? 'Paid' : 'Unpaid'}</div>
              )}
            </div>
          )}

          {locker.is_paid && (
            <div style={{ marginBottom: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
              Price: ₹{locker.price}/period
            </div>
          )}

          {locker.status === 'available' && (
            <button onClick={() => { onClose(); onAssign(locker) }} style={{
              width: '100%', height: 48, backgroundColor: 'var(--text-primary)',
              color: 'var(--bg-card)', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>Assign Locker</button>
          )}

          {locker.status === 'occupied' && (
            <button onClick={handleRelease} disabled={releasing} style={{
              width: '100%', height: 48, backgroundColor: 'var(--error-bg)',
              color: 'var(--error)', border: '0.5px solid var(--error)', borderRadius: 12,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              opacity: releasing ? 0.5 : 1,
            }}>{releasing ? 'Releasing...' : 'Release Locker'}</button>
          )}
        </div>
      </div>
    </>
  )
}

export default function StaffLockers() {
  const { permissions, gymId, loading: permsLoading } = useStaffPermissions()
  const [lockers, setLockers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedLocker, setSelectedLocker] = useState(null)
  const [showAssignSheet, setShowAssignSheet] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchLockers = useCallback(async () => {
    if (!gymId) return
    setLoading(true)
    try {
      const res = await staffApiFetch('/api/staff/lockers')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setLockers(Array.isArray(data) ? data : [])
    } catch {
      showToast('error', 'Failed to load lockers')
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => { fetchLockers() }, [fetchLockers])

  const filtered = filter === 'all' ? lockers : lockers.filter(l => l.status === filter)

  const counts = lockers.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  if (permsLoading) return <LoadingSpinner />
  if (!permissions.manage_lockers) return (
    <NoAccessState
      message="Locker Access Required"
      subtitle="Ask your gym owner to grant you locker management permission."
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
        padding: '16px 20px 12px',
      }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Lockers</span>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {Object.entries(STATUS_META).map(([k, m]) => (
            <div key={k} style={{
              backgroundColor: m.bg, borderRadius: 12, padding: '12px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{counts[k] || 0}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: m.color, marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[{ key: 'all', label: 'All' }, ...Object.entries(STATUS_META).map(([k, m]) => ({ key: k, label: m.label }))].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              backgroundColor: filter === f.key ? 'var(--text-primary)' : 'var(--bg-pill)',
              color: filter === f.key ? 'var(--bg-card)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 500,
            }}>{f.label}</button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
            No lockers found
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {filtered.map(locker => {
              const meta = STATUS_META[locker.status] || STATUS_META.available
              return (
                <div
                  key={locker.id}
                  onClick={() => setSelectedLocker(locker)}
                  style={{
                    backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 12,
                    border: `0.5px solid ${meta.cardBorder}`,
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{locker.label}</div>
                  <span style={{
                    display: 'inline-block', backgroundColor: meta.bg, color: meta.color,
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  }}>{meta.label}</span>
                  {locker.assignment?.member_name && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {locker.assignment.member_name}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedLocker && !showAssignSheet && (
        <LockerDetailSheet
          locker={selectedLocker}
          onClose={() => setSelectedLocker(null)}
          onAssign={l => { setSelectedLocker(null); setShowAssignSheet(l) }}
          onRelease={() => {
            setSelectedLocker(null)
            showToast('success', `Locker ${selectedLocker.label} released`)
            fetchLockers()
          }}
        />
      )}

      {showAssignSheet && (
        <AssignSheet
          locker={showAssignSheet}
          gymId={gymId}
          onClose={() => setShowAssignSheet(null)}
          onSuccess={() => {
            setShowAssignSheet(null)
            showToast('success', `Locker ${showAssignSheet.label} assigned`)
            fetchLockers()
          }}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: 16, right: 16, zIndex: 100,
          backgroundColor: toast.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
          borderRadius: 16, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: toast.type === 'error' ? 'var(--error)' : 'var(--success)' }}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
