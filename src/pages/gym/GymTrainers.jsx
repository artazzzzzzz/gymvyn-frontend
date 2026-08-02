import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'
import { useOwnerGymId } from '../../hooks/useOwnerGymId'
import { supabase } from '../../utils/supabase'

async function authReq(API, method, path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`)
  return data
}

const statusConfig = {
  active:  { label: 'Active',  bg: 'var(--success-bg)', color: 'var(--success)' },
  invited: { label: 'Invited', bg: 'var(--warning-bg)', color: 'var(--warning)' },
  manual:  { label: 'Manual',  bg: 'var(--bg-pill)', color: 'var(--text-secondary)' },
}

const formatSpecializations = (specs) => {
  if (!specs || specs.length === 0) return 'No specializations added'
  return specs.join(' · ')
}

export default function GymTrainers() {
  const navigate = useNavigate()
  const gymId = useOwnerGymId()
  const API = import.meta.env.VITE_API_URL || ''

  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [showRemoveSheet, setShowRemoveSheet] = useState(false)
  const [selectedTrainer, setSelectedTrainer] = useState(null)
  const [activeTab, setActiveTab] = useState('phone')
  const [inviteValue, setInviteValue] = useState('')
  const [manualForm, setManualForm] = useState({ full_name: '', phone: '', specializations: '' })
  const [submitting, setSubmitting] = useState(false)
  const [moreOpenId, setMoreOpenId] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [trainerJoinCode, setTrainerJoinCode] = useState(null)
  const [joinCodeLoading, setJoinCodeLoading] = useState(false)
  const [joinCodeCopied, setJoinCodeCopied] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  const [showRequestsSheet, setShowRequestsSheet] = useState(false)
  const [requestActionId, setRequestActionId] = useState(null)

  const fetchTrainers = async () => {
    if (!gymId) return
    setLoading(true)
    setError(null)
    try {
      const data = await authReq(API, 'GET', `/api/gym-trainers/${gymId}`)
      setTrainers(Array.isArray(data) ? data : (data?.trainers ?? []))
    } catch (err) {
      setError('Failed to load trainers')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingRequests = async () => {
    try {
      const data = await authReq(API, 'GET', '/api/gym/trainer-join-requests')
      setPendingRequests(Array.isArray(data) ? data : [])
    } catch {
      setPendingRequests([])
    }
  }

  const fetchTrainerJoinCode = async () => {
    setJoinCodeLoading(true)
    try {
      const data = await authReq(API, 'GET', '/api/gym/trainer-join-code')
      setTrainerJoinCode(data.trainer_join_code || null)
    } catch {
      setTrainerJoinCode(null)
    } finally {
      setJoinCodeLoading(false)
    }
  }

  useEffect(() => {
    if (gymId) { fetchTrainers(); fetchPendingRequests() }
    else setLoading(false)
  }, [gymId])

  const handleAcceptRequest = async (req) => {
    setRequestActionId(req.id)
    try {
      await authReq(API, 'PATCH', `/api/gym/trainer-join-requests/${req.id}/accept`)
      setPendingRequests(prev => prev.filter(r => r.id !== req.id))
      fetchTrainers()
    } catch (err) {
      alert(err.message || 'Failed to accept request')
    } finally {
      setRequestActionId(null)
    }
  }

  const handleDeclineRequest = async (req) => {
    setRequestActionId(req.id)
    try {
      await authReq(API, 'DELETE', `/api/gym/trainer-join-requests/${req.id}`)
      setPendingRequests(prev => prev.filter(r => r.id !== req.id))
    } catch (err) {
      alert(err.message || 'Failed to decline request')
    } finally {
      setRequestActionId(null)
    }
  }

  const handleInvite = async () => {
    if (!inviteValue.trim()) return
    setSubmitting(true)
    try {
      await authReq(API, 'POST', '/api/gym-trainers/invite', { gym_id: gymId, type: activeTab, value: inviteValue.trim() })
      setInviteValue('')
      setShowAddSheet(false)
      fetchTrainers()
    } catch {
      alert('Failed to send invite')
    } finally {
      setSubmitting(false)
    }
  }

  const handleManualAdd = async () => {
    if (!manualForm.full_name.trim()) return
    setSubmitting(true)
    try {
      await authReq(API, 'POST', '/api/gym-trainers/manual', {
        gym_id: gymId,
        full_name: manualForm.full_name.trim(),
        phone: manualForm.phone.trim() || null,
        specializations: manualForm.specializations
          ? manualForm.specializations.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        experience_years: 0,
      })
      setManualForm({ full_name: '', phone: '', specializations: '' })
      setShowAddSheet(false)
      fetchTrainers()
    } catch {
      alert('Failed to add trainer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async () => {
    if (!selectedTrainer) return
    setSubmitting(true)
    try {
      await authReq(API, 'DELETE', `/api/gym-trainers/${selectedTrainer.id}`)
      setShowRemoveSheet(false)
      setSelectedTrainer(null)
      fetchTrainers()
    } catch {
      alert('Failed to remove trainer')
    } finally {
      setSubmitting(false)
    }
  }

  const totalCount = trainers.length
  const activeCount = trainers.filter(t => t.status === 'active').length
  const invitedCount = trainers.filter(t => t.status === 'invited').length

  const inputStyle = {
    width: '100%', height: 52, border: '0.5px solid rgba(0,0,0,0.15)',
    borderRadius: 12, padding: '0 16px', fontSize: 15,
    boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* STICKY HEADER */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: 'var(--bg-primary)',
        padding: '16px 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Trainers</span>
        <button
          onClick={() => setShowAddSheet(true)}
          style={{
            backgroundColor: 'var(--text-primary)', color: "var(--bg-card)",
            border: 'none', borderRadius: 10, height: 32,
            padding: '0 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >+ Add Trainer</button>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* SUMMARY STRIP */}
        {!loading && !error && (
          <div style={{
            backgroundColor: "var(--bg-card)", borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)',
            padding: 12, display: 'flex', alignItems: 'center',
          }}>
            {[
              { value: totalCount, label: 'Total' },
              { value: activeCount, label: 'Active' },
              { value: invitedCount, label: 'Invited' },
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
        )}

        {/* MANAGE PAYOUTS CARD */}
        <button
          onClick={() => navigate('/gym/finance?section=trainer-payouts')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            backgroundColor: 'var(--bg-card)', borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)', padding: '14px 16px',
            cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            backgroundColor: 'var(--warning-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
              <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Manage Payouts</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Rates, earnings & payout records</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* PENDING JOIN REQUESTS BANNER */}
        {pendingRequests.length > 0 && (
          <button
            onClick={() => setShowRequestsSheet(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              backgroundColor: 'var(--warning-bg)', borderRadius: 12,
              border: '0.5px solid rgba(0,0,0,0.08)', padding: '14px 16px',
              cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: 'var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {pendingRequests.length} pending join request{pendingRequests.length === 1 ? '' : 's'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
                Trainers requesting to join your gym
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
            Loading trainers...
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--error)', fontSize: 14 }}>
            <p style={{ margin: '0 0 16px' }}>{error}</p>
            <button onClick={fetchTrainers} style={{ height: 40, padding: '0 20px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 600 }}>Try again</button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && trainers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              No trainers yet
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Add your first trainer to get started
            </div>
            <button
              onClick={() => setShowAddSheet(true)}
              style={{
                backgroundColor: 'var(--text-primary)', color: "var(--bg-card)",
                border: 'none', borderRadius: 12, height: 52,
                padding: '0 32px', fontSize: 15, fontWeight: 500, cursor: 'pointer',
              }}
            >Add Trainer</button>
          </div>
        )}

        {/* TRAINER CARDS */}
        {!loading && !error && trainers.map(trainer => {
          const { bg, text } = getAvatarColor(trainer.full_name)
          const initials = getInitials(trainer.full_name)
          const status = statusConfig[trainer.status] || statusConfig.manual

          return (
            <div key={trainer.id} style={{
              backgroundColor: "var(--bg-card)", borderRadius: 12,
              border: '0.5px solid rgba(0,0,0,0.08)',
              padding: 16, position: 'relative',
            }}>
              {/* ROW 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  backgroundColor: bg, color: text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 600, flexShrink: 0,
                }}>{initials}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 18, fontWeight: 600, color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{trainer.full_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {formatSpecializations(trainer.specializations)}
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMoreOpenId(moreOpenId === trainer.id ? null : trainer.id)}
                    style={{
                      background: 'none', border: 'none',
                      fontSize: 20, color: 'var(--text-tertiary)', cursor: 'pointer',
                      padding: '4px 8px', lineHeight: 1,
                    }}
                  >⋮</button>

                  {moreOpenId === trainer.id && (
                    <div style={{
                      position: 'absolute', right: 0, top: 32,
                      backgroundColor: "var(--bg-card)", borderRadius: 10,
                      border: '0.5px solid rgba(0,0,0,0.12)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      zIndex: 20, minWidth: 160,
                    }}>
                      <button
                        onClick={() => {
                          setSelectedTrainer(trainer)
                          setMoreOpenId(null)
                          setShowRemoveSheet(true)
                        }}
                        style={{
                          display: 'block', width: '100%',
                          padding: '12px 16px', textAlign: 'left',
                          background: 'none', border: 'none',
                          fontSize: 14, color: 'var(--error)', cursor: 'pointer',
                        }}
                      >Remove Trainer</button>
                    </div>
                  )}
                </div>
              </div>

              {/* ROW 2: Stats pills */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { label: `${trainer.client_count ?? 0} clients` },
                  { label: `⏱ ${trainer.experience_years ?? 0} yrs exp` },
                ].map((pill, i) => (
                  <span key={i} style={{
                    backgroundColor: 'var(--bg-primary)', borderRadius: 6,
                    padding: '6px 10px', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                  }}>{pill.label}</span>
                ))}
                <span style={{
                  backgroundColor: status.bg, borderRadius: 20,
                  padding: '6px 10px', fontSize: 12, fontWeight: 500, color: status.color,
                }}>{status.label}</span>
              </div>

              {/* ROW 3: Manual warning */}
              {trainer.status === 'manual' && (
                <div style={{
                  marginTop: 10, backgroundColor: 'var(--warning-bg)',
                  borderLeft: '3px solid var(--warning)',
                  borderRadius: '0 8px 8px 0',
                  padding: '8px 10px',
                  fontSize: 11, color: 'var(--warning)',
                }}>
                  ⚠ Not on platform yet — invite them to claim this profile
                </div>
              )}
            </div>
          )
        })}
      </div>

      <GymBottomNav active="trainers" onMorePress={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      {/* OVERLAY for 3-dot menu */}
      {moreOpenId && (
        <div
          onClick={() => setMoreOpenId(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 15 }}
        />
      )}

      {/* ADD TRAINER SHEET */}
      {showAddSheet && (
        <>
          <div
            onClick={() => setShowAddSheet(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: "var(--bg-card)", borderRadius: '20px 20px 0 0',
            zIndex: 51, padding: '0 0 32px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '12px auto 0' }} />
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                Add Trainer
              </div>

              {/* Tab bar */}
              <div style={{
                display: 'flex', gap: 4, backgroundColor: 'var(--bg-primary)',
                borderRadius: 8, padding: 4, marginBottom: 20,
              }}>
                {[
                  { key: 'phone', label: 'Phone' },
                  { key: 'email', label: '✉ Email' },
                  { key: 'manual', label: '✏ Manual' },
                  { key: 'code', label: '🔑 Code' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key); setInviteValue('')
                      if (tab.key === 'code' && !trainerJoinCode) fetchTrainerJoinCode()
                    }}
                    style={{
                      flex: 1, padding: '8px 0',
                      backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
                      border: activeTab === tab.key ? '0.5px solid rgba(0,0,0,0.12)' : 'none',
                      borderRadius: 6, fontSize: 11, fontWeight: 600,
                      color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: 'pointer',
                    }}
                  >{tab.label}</button>
                ))}
              </div>

              {/* Phone tab */}
              {activeTab === 'phone' && (
                <div>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={inviteValue}
                    onChange={e => setInviteValue(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    They'll receive an SMS with a link to join Gymvyn and get linked to your gym.
                  </div>
                  <button
                    onClick={handleInvite}
                    disabled={submitting || !inviteValue.trim()}
                    style={{
                      width: '100%', height: 52, backgroundColor: 'var(--text-primary)', color: "var(--bg-card)",
                      border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                      cursor: 'pointer', opacity: submitting || !inviteValue.trim() ? 0.5 : 1,
                    }}
                  >{submitting ? 'Sending...' : 'Send Invite'}</button>
                </div>
              )}

              {/* Email tab */}
              {activeTab === 'email' && (
                <div>
                  <input
                    type="email"
                    placeholder="trainer@example.com"
                    value={inviteValue}
                    onChange={e => setInviteValue(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    They'll receive an email invite to join Gymvyn.
                  </div>
                  <button
                    onClick={handleInvite}
                    disabled={submitting || !inviteValue.trim()}
                    style={{
                      width: '100%', height: 52, backgroundColor: 'var(--text-primary)', color: "var(--bg-card)",
                      border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                      cursor: 'pointer', opacity: submitting || !inviteValue.trim() ? 0.5 : 1,
                    }}
                  >{submitting ? 'Sending...' : 'Send Invite'}</button>
                </div>
              )}

              {/* Manual tab */}
              {activeTab === 'manual' && (
                <div>
                  {[
                    { key: 'full_name', placeholder: 'Full Name*', type: 'text' },
                    { key: 'phone', placeholder: 'Phone (optional) — +91 98765 43210', type: 'tel' },
                    { key: 'specializations', placeholder: 'Specializations (optional) — e.g. Strength, Cardio', type: 'text' },
                  ].map(field => (
                    <div key={field.key} style={{ marginBottom: 12 }}>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={manualForm[field.key]}
                        onChange={e => setManualForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        style={inputStyle}
                      />
                      {field.key === 'specializations' && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                          Comma-separated. Trainer can edit later.
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleManualAdd}
                    disabled={submitting || !manualForm.full_name.trim()}
                    style={{
                      width: '100%', height: 52, backgroundColor: 'var(--text-primary)', color: "var(--bg-card)",
                      border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                      cursor: 'pointer', opacity: submitting || !manualForm.full_name.trim() ? 0.5 : 1,
                      marginTop: 8,
                    }}
                  >{submitting ? 'Adding...' : 'Add to Gym'}</button>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 16 }}>
                    This trainer won't have an app account until they sign up.<br />
                    They can claim this profile using their phone number.
                  </div>
                </div>
              )}

              {/* Code tab */}
              {activeTab === 'code' && (
                <div>
                  <div style={{
                    background: 'var(--bg-primary)', borderRadius: 12, padding: 16,
                    marginBottom: 8, textAlign: 'center',
                  }}>
                    <span style={{
                      fontSize: 22, fontWeight: 700,
                      color: joinCodeLoading || !trainerJoinCode ? 'var(--text-tertiary)' : 'var(--text-primary)',
                      fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
                      letterSpacing: '0.1em',
                    }}>
                      {joinCodeLoading ? 'Loading…' : (trainerJoinCode || '—')}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20, textAlign: 'center' }}>
                    Share this code — a trainer enters it from their app to request joining your gym. You'll need to approve the request before they're linked.
                  </div>
                  <button
                    onClick={() => {
                      if (!trainerJoinCode) return
                      navigator.clipboard.writeText(trainerJoinCode).catch(() => {})
                      setJoinCodeCopied(true)
                      setTimeout(() => setJoinCodeCopied(false), 2000)
                    }}
                    disabled={!trainerJoinCode}
                    style={{
                      width: '100%', height: 52,
                      backgroundColor: joinCodeCopied ? 'var(--success-bg)' : 'var(--text-primary)',
                      color: joinCodeCopied ? 'var(--success)' : "var(--bg-card)",
                      border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                      cursor: trainerJoinCode ? 'pointer' : 'default',
                      opacity: trainerJoinCode ? 1 : 0.5,
                    }}
                  >{joinCodeCopied ? 'Copied!' : 'Copy Code'}</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* PENDING JOIN REQUESTS SHEET */}
      {showRequestsSheet && (
        <>
          <div
            onClick={() => setShowRequestsSheet(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: "var(--bg-card)", borderRadius: '20px 20px 0 0',
            zIndex: 51, padding: '0 0 32px',
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '12px auto 0' }} />
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                Pending Join Requests
              </div>

              {pendingRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
                  No pending requests
                </div>
              ) : (
                pendingRequests.map(req => {
                  const { bg, text } = getAvatarColor(req.full_name)
                  const initials = getInitials(req.full_name)
                  const busy = requestActionId === req.id
                  return (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{initials}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {req.full_name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                          {formatSpecializations(req.specializations)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => handleDeclineRequest(req)}
                          disabled={busy}
                          style={{ height: 30, padding: '0 12px', background: 'var(--bg-pill)', border: '1px solid var(--bg-pill)', borderRadius: 20, color: 'var(--text-secondary)', fontSize: 13, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
                        >Decline</button>
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          disabled={busy}
                          style={{ height: 30, padding: '0 14px', background: 'var(--success-bg)', border: '1px solid var(--success-bg)', borderRadius: 20, color: 'var(--success)', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
                        >Accept</button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* REMOVE SHEET */}
      {showRemoveSheet && selectedTrainer && (
        <>
          <div
            onClick={() => { setShowRemoveSheet(false); setSelectedTrainer(null) }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: "var(--bg-card)", borderRadius: '20px 20px 0 0',
            zIndex: 51, padding: '0 20px 32px',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '12px auto 16px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                backgroundColor: getAvatarColor(selectedTrainer.full_name).bg,
                color: getAvatarColor(selectedTrainer.full_name).text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 600,
              }}>{getInitials(selectedTrainer.full_name)}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedTrainer.full_name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {formatSpecializations(selectedTrainer.specializations)}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Remove {selectedTrainer.full_name} from your gym?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              They'll lose access to gym features. Their Gymvyn account stays active.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={handleRemove}
                disabled={submitting}
                style={{
                  width: '100%', height: 52, backgroundColor: 'var(--error)', color: "var(--bg-card)",
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', opacity: submitting ? 0.6 : 1,
                }}
              >{submitting ? 'Removing...' : 'Remove Trainer'}</button>
              <button
                onClick={() => { setShowRemoveSheet(false); setSelectedTrainer(null) }}
                style={{
                  width: '100%', height: 52, backgroundColor: "var(--bg-card)", color: 'var(--text-primary)',
                  border: '0.5px solid var(--text-primary)', borderRadius: 12, fontSize: 15, fontWeight: 500,
                  cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
