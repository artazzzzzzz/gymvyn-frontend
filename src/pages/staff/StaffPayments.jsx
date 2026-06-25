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

const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
]

function CollectModal({ gymId, onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [method, setMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (gymId) {
      fetch(`${API}/api/gyms/${gymId}`)
        .then(r => r.json())
        .then(data => setPlans(data.membership_plans || []))
        .catch(() => {})
    }
  }, [gymId])

  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`${API}/api/gym-members-search/${gymId}?q=${encodeURIComponent(searchQ)}`)
        const data = await res.json()
        setSearchResults(Array.isArray(data) ? data : [])
      } catch {} finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [searchQ, gymId])

  const handleSubmit = async () => {
    if (!selectedMember || !amount) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${API}/api/gym-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gym_id: gymId,
          user_id: selectedMember.user_id,
          membership_id: selectedMember.member_id,
          amount: parseFloat(amount),
          payment_method: method,
          plan_name: selectedPlan?.name || 'Manual Payment',
          notes,
        }),
      })
      if (!res.ok) throw new Error('Payment failed')
      onSuccess()
    } catch (err) {
      alert(err.message)
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
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
            {step === 1 ? 'Select Member' : 'Payment Details'}
          </div>

          {step === 1 && (
            <>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <input
                  placeholder="Search member..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  style={{
                    width: '100%', height: 48, borderRadius: 12, padding: '0 16px',
                    border: '0.5px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              {searching && <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '8px 0' }}>Searching...</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.map(m => {
                  const { bg, text } = getAvatarColor(m.full_name || '')
                  return (
                    <div
                      key={m.member_id}
                      onClick={() => { setSelectedMember(m); setStep(2) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        backgroundColor: 'var(--bg-elevated)', borderRadius: 12,
                        border: '0.5px solid var(--border)', cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        backgroundColor: bg, color: text,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600,
                      }}>{getInitials(m.full_name || '')}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{m.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.membership_type || 'Member'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {step === 2 && selectedMember && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                backgroundColor: 'var(--bg-elevated)', borderRadius: 12, padding: '12px 16px', marginBottom: 20,
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedMember.full_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedMember.membership_type || 'Member'}</div>
                </div>
              </div>

              {plans.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Plan</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {plans.map(p => (
                      <button
                        key={p.name}
                        onClick={() => { setSelectedPlan(p); setAmount(String(p.price)) }}
                        style={{
                          padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                          backgroundColor: selectedPlan?.name === p.name ? 'var(--text-primary)' : 'var(--bg-pill)',
                          color: selectedPlan?.name === p.name ? 'var(--bg-card)' : 'var(--text-primary)',
                          border: 'none', cursor: 'pointer',
                        }}
                      >{p.name} — ₹{p.price}</button>
                    ))}
                  </div>
                </>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount (₹)</div>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%', height: 48, borderRadius: 12, padding: '0 16px',
                    border: '0.5px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
                    fontSize: 16, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Method</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setMethod(k)}
                      style={{
                        flex: 1, height: 36, borderRadius: 20, fontSize: 13, fontWeight: 500,
                        backgroundColor: method === k ? 'var(--text-primary)' : 'var(--bg-pill)',
                        color: method === k ? 'var(--bg-card)' : 'var(--text-primary)',
                        border: 'none', cursor: 'pointer',
                      }}
                    >{v}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes (optional)</div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%', borderRadius: 12, padding: '12px 16px',
                    border: '0.5px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
                    fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1, height: 48, backgroundColor: 'var(--bg-pill)',
                    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
                    color: 'var(--text-primary)', cursor: 'pointer',
                  }}
                >Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !amount}
                  style={{
                    flex: 2, height: 48, backgroundColor: 'var(--text-primary)',
                    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
                    color: 'var(--bg-card)', cursor: 'pointer',
                    opacity: (submitting || !amount) ? 0.5 : 1,
                  }}
                >{submitting ? 'Processing...' : 'Collect Payment'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function StaffPayments() {
  const { permissions, gymId, loading: permsLoading } = useStaffPermissions()
  const [activeTab, setActiveTab] = useState('recent')
  const [payments, setPayments] = useState([])
  const [summary, setSummary] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showCollect, setShowCollect] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchPayments = useCallback(async () => {
    if (!gymId) return
    setLoading(true)
    try {
      const [sumRes, listRes] = await Promise.all([
        fetch(`${API}/api/gym-payments/${gymId}/summary`),
        fetch(`${API}/api/gym-payments/${gymId}${filter !== 'all' ? `?method=${filter}` : ''}`),
      ])
      const sumData = await sumRes.json()
      const listData = await listRes.json()
      setSummary(sumData)
      setPayments(Array.isArray(listData) ? listData : (listData.payments || []))
    } catch {
      showToast('error', 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [gymId, filter])

  useEffect(() => {
    if (gymId && (permissions.view_payments || permissions.collect_payment)) fetchPayments()
  }, [gymId, fetchPayments, permissions.view_payments, permissions.collect_payment])

  const canView = permissions.view_payments || permissions.collect_payment

  if (permsLoading) return <LoadingSpinner />
  if (!canView) return (
    <NoAccessState
      message="Payments Access Required"
      subtitle="Ask your gym owner to grant you payments permission."
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
        <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Payments</span>
          {permissions.collect_payment && (
            <button
              onClick={() => setShowCollect(true)}
              style={{
                height: 36, padding: '0 16px', backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-card)', border: 'none', borderRadius: 20,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >+ Collect</button>
          )}
        </div>
        <div style={{ display: 'flex' }}>
          {[
            permissions.view_payments && { key: 'recent', label: 'Recent' },
            permissions.collect_payment && { key: 'collect', label: 'Collect' },
          ].filter(Boolean).map(tab => (
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

      {activeTab === 'recent' && permissions.view_payments && (
        <div style={{ padding: '16px 20px 0' }}>
          {summary && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 12, marginBottom: 20,
            }}>
              {[
                { label: "Today's Revenue", value: `₹${(summary.today_revenue || 0).toLocaleString('en-IN')}` },
                { label: 'This Month', value: `₹${(summary.month_revenue || 0).toLocaleString('en-IN')}` },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  backgroundColor: 'var(--bg-card)', borderRadius: 12,
                  border: '0.5px solid var(--border)', padding: 16,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                backgroundColor: filter === f.key ? 'var(--text-primary)' : 'var(--bg-pill)',
                color: filter === f.key ? 'var(--bg-card)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 500,
              }}>{f.label}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>Loading...</div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>No payments found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {payments.map((p, i) => {
                const { bg, text } = getAvatarColor(p.full_name || p.member_name || '')
                const name = p.full_name || p.member_name || 'Unknown'
                return (
                  <div key={p.id || i} style={{
                    backgroundColor: 'var(--bg-card)', borderRadius: 12,
                    border: '0.5px solid var(--border)', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      backgroundColor: bg, color: text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600, flexShrink: 0,
                    }}>{getInitials(name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {p.plan_name || 'Payment'} · {PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>
                        ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'collect' && permissions.collect_payment && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💳</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            Collect Payment
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.5 }}>
            Search for a member and record their payment
          </div>
          <button
            onClick={() => setShowCollect(true)}
            style={{
              height: 48, padding: '0 32px', backgroundColor: 'var(--text-primary)',
              color: 'var(--bg-card)', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >Collect Payment</button>
        </div>
      )}

      {showCollect && (
        <CollectModal
          gymId={gymId}
          onClose={() => setShowCollect(false)}
          onSuccess={() => {
            setShowCollect(false)
            showToast('success', 'Payment recorded')
            fetchPayments()
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
