import { useState, useEffect, useCallback } from 'react'
import { useStaffPermissions } from '../../hooks/useStaffPermissions'
import { useAuth } from '../../hooks/useAuth'
import NoAccessState from '../../components/staff/NoAccessState'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'

const API = import.meta.env.VITE_API_URL || ''
const LIMIT = 20

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

function MemberDetailSheet({ member, onClose, canCollectPayment, gymId, onCollectPayment }) {
  if (!member) return null
  const { bg, text } = getAvatarColor(member.full_name || '')
  const statusColor = member.status === 'active' ? 'var(--success)' : member.status === 'expiring_soon' ? 'var(--warning)' : 'var(--error)'
  const statusBg = member.status === 'active' ? 'var(--success-bg)' : member.status === 'expiring_soon' ? 'var(--warning-bg)' : 'var(--error-bg)'

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40,
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
        padding: '8px 0 40px',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 4, backgroundColor: 'var(--border-strong)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            backgroundColor: bg, color: text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, flexShrink: 0,
          }}>{getInitials(member.full_name || '')}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{member.full_name}</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>{member.phone || 'No phone'}</div>
          </div>
          <span style={{
            backgroundColor: statusBg, color: statusColor,
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
          }}>{member.status === 'active' ? 'Active' : member.status === 'expiring_soon' ? 'Expiring' : 'Inactive'}</span>
        </div>

        <div style={{ margin: '0 20px', backgroundColor: 'var(--bg-elevated)', borderRadius: 12, overflow: 'hidden' }}>
          {[
            { label: 'Membership', value: member.membership_type || '—' },
            { label: 'Member Since', value: member.created_at ? new Date(member.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
            { label: 'Expires', value: member.end_date ? new Date(member.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
            { label: 'Email', value: member.email || '—' },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? '0.5px solid var(--divider)' : 'none',
            }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>

        {canCollectPayment && (
          <div style={{ padding: '20px 20px 0' }}>
            <button
              onClick={() => { onClose(); onCollectPayment(member) }}
              style={{
                width: '100%', height: 48, backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-card)', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >Collect Payment</button>
          </div>
        )}
      </div>
    </>
  )
}

export default function StaffMembers() {
  const { permissions, gymId, loading: permsLoading } = useStaffPermissions()
  const { user } = useAuth()

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selectedMember, setSelectedMember] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchMembers = useCallback(async (pg = 1, f = filter) => {
    if (!gymId) return
    setLoading(true)
    try {
      const statusParam = f !== 'all' ? `&status=${f}` : ''
      const res = await fetch(`${API}/api/gym-members?gymId=${gymId}&page=${pg}&limit=${LIMIT}${statusParam}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.members || [])
      setMembers(pg === 1 ? list : prev => [...prev, ...list])
      setHasMore(list.length === LIMIT)
    } catch {
      showToast('error', 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [gymId, filter])

  useEffect(() => {
    if (gymId) { setPage(1); fetchMembers(1, filter) }
  }, [gymId, filter])

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'expiring_soon', label: 'Expiring' },
    { key: 'inactive', label: 'Inactive' },
  ]

  if (permsLoading) return <LoadingSpinner />
  if (!permissions.view_members) return (
    <NoAccessState
      message="Members Access Required"
      subtitle="Ask your gym owner to grant you member view permission."
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
        <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Members</span>
      </div>

      <div style={{
        display: 'flex', gap: 8, padding: '12px 20px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 20,
            backgroundColor: filter === f.key ? 'var(--text-primary)' : 'var(--bg-pill)',
            color: filter === f.key ? 'var(--bg-card)' : 'var(--text-secondary)',
            border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>{f.label}</button>
        ))}
      </div>

      <div style={{ padding: '0 20px' }}>
        {loading && members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
            Loading...
          </div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 14, color: 'var(--text-tertiary)' }}>
            No members found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(member => {
              const { bg, text } = getAvatarColor(member.full_name || '')
              const isExpiring = member.status === 'expiring_soon'
              const isInactive = member.status === 'inactive' || member.status === 'at_risk'
              return (
                <div
                  key={member.member_id || member.id}
                  onClick={() => setSelectedMember(member)}
                  style={{
                    backgroundColor: 'var(--bg-card)', borderRadius: 12,
                    border: '0.5px solid var(--border)',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    backgroundColor: bg, color: text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 600, flexShrink: 0,
                  }}>{getInitials(member.full_name || '')}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{member.full_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {member.membership_type || 'Member'} · {member.phone || 'No phone'}
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    backgroundColor: isInactive ? 'var(--error-bg)' : isExpiring ? 'var(--warning-bg)' : 'var(--success-bg)',
                    color: isInactive ? 'var(--error)' : isExpiring ? 'var(--warning)' : 'var(--success)',
                  }}>
                    {isInactive ? 'Inactive' : isExpiring ? 'Expiring' : 'Active'}
                  </span>
                </div>
              )
            })}

            {hasMore && (
              <button
                onClick={() => { const next = page + 1; setPage(next); fetchMembers(next) }}
                style={{
                  width: '100%', height: 44, backgroundColor: 'var(--bg-card)',
                  border: '0.5px solid var(--border)', borderRadius: 12,
                  fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer', marginTop: 4,
                }}
              >Load more</button>
            )}
          </div>
        )}
      </div>

      {selectedMember && (
        <MemberDetailSheet
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          canCollectPayment={permissions.collect_payment}
          gymId={gymId}
          onCollectPayment={() => {}}
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
