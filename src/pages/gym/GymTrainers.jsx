import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'

const statusConfig = {
  active:  { label: 'Active',  bg: '#EAF3DE', color: '#3B6D11' },
  invited: { label: 'Invited', bg: '#FAEEDA', color: '#854F0B' },
  manual:  { label: 'Manual',  bg: '#F1EFE8', color: '#5F5E5A' },
}

const formatSpecializations = (specs) => {
  if (!specs || specs.length === 0) return 'No specializations added'
  return specs.join(' · ')
}

export default function GymTrainers() {
  const navigate = useNavigate()
  const gymId = localStorage.getItem('gymId')
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

  const fetchTrainers = async () => {
    if (!gymId) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/gym-trainers/${gymId}`)
      const data = await res.json()
      setTrainers(Array.isArray(data) ? data : (data?.trainers ?? []))
    } catch (err) {
      setError('Failed to load trainers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gymId) fetchTrainers()
    else setLoading(false)
  }, [gymId])

  const handleInvite = async () => {
    if (!inviteValue.trim()) return
    setSubmitting(true)
    try {
      await fetch(`${API}/api/gym-trainers/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gym_id: gymId, type: activeTab, value: inviteValue.trim() }),
      })
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
      await fetch(`${API}/api/gym-trainers/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gym_id: gymId,
          full_name: manualForm.full_name.trim(),
          phone: manualForm.phone.trim() || null,
          specializations: manualForm.specializations
            ? manualForm.specializations.split(',').map(s => s.trim()).filter(Boolean)
            : [],
          experience_years: 0,
        }),
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
      await fetch(`${API}/api/gym-trainers/${selectedTrainer.id}`, { method: 'DELETE' })
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
      minHeight: '100vh', backgroundColor: '#F7F7F5', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* STICKY HEADER */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: '#F7F7F5',
        padding: '16px 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>Trainers</span>
        <button
          onClick={() => setShowAddSheet(true)}
          style={{
            backgroundColor: '#111', color: 'white',
            border: 'none', borderRadius: 10, height: 32,
            padding: '0 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >+ Add Trainer</button>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* SUMMARY STRIP */}
        {!loading && !error && (
          <div style={{
            backgroundColor: 'white', borderRadius: 12,
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
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>{stat.value}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: '#999',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2,
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999', fontSize: 14 }}>
            Loading trainers...
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#A32D2D', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && trainers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>👥</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 8 }}>
              No trainers yet
            </div>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
              Add your first trainer to get started
            </div>
            <button
              onClick={() => setShowAddSheet(true)}
              style={{
                backgroundColor: '#111', color: 'white',
                border: 'none', borderRadius: 12, height: 52,
                padding: '0 32px', fontSize: 15, fontWeight: 500, cursor: 'pointer',
              }}
            >Add Trainer</button>
          </div>
        )}

        {/* TRAINER CARDS */}
        {!loading && trainers.map(trainer => {
          const { bg, text } = getAvatarColor(trainer.full_name)
          const initials = getInitials(trainer.full_name)
          const status = statusConfig[trainer.status] || statusConfig.manual

          return (
            <div key={trainer.id} style={{
              backgroundColor: 'white', borderRadius: 12,
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
                    fontSize: 18, fontWeight: 600, color: '#111',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{trainer.full_name}</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                    {formatSpecializations(trainer.specializations)}
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMoreOpenId(moreOpenId === trainer.id ? null : trainer.id)}
                    style={{
                      background: 'none', border: 'none',
                      fontSize: 20, color: '#999', cursor: 'pointer',
                      padding: '4px 8px', lineHeight: 1,
                    }}
                  >⋮</button>

                  {moreOpenId === trainer.id && (
                    <div style={{
                      position: 'absolute', right: 0, top: 32,
                      backgroundColor: 'white', borderRadius: 10,
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
                          fontSize: 14, color: '#A32D2D', cursor: 'pointer',
                        }}
                      >Remove Trainer</button>
                    </div>
                  )}
                </div>
              </div>

              {/* ROW 2: Stats pills */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { label: `👥 ${trainer.client_count ?? 0} clients` },
                  { label: `⏱ ${trainer.experience_years ?? 0} yrs exp` },
                ].map((pill, i) => (
                  <span key={i} style={{
                    backgroundColor: '#F7F7F5', borderRadius: 6,
                    padding: '6px 10px', fontSize: 12, fontWeight: 500, color: '#555',
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
                  marginTop: 10, backgroundColor: '#FAEEDA',
                  borderLeft: '3px solid #854F0B',
                  borderRadius: '0 8px 8px 0',
                  padding: '8px 10px',
                  fontSize: 11, color: '#854F0B',
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
            backgroundColor: 'white', borderRadius: '20px 20px 0 0',
            zIndex: 51, padding: '0 0 32px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, margin: '12px auto 0' }} />
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 16 }}>
                Add Trainer
              </div>

              {/* Tab bar */}
              <div style={{
                display: 'flex', gap: 4, backgroundColor: '#F7F7F5',
                borderRadius: 8, padding: 4, marginBottom: 20,
              }}>
                {[
                  { key: 'phone', label: '📱 Phone' },
                  { key: 'email', label: '✉ Email' },
                  { key: 'manual', label: '✏ Manual' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setInviteValue('') }}
                    style={{
                      flex: 1, padding: '8px 0',
                      backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
                      border: activeTab === tab.key ? '0.5px solid rgba(0,0,0,0.12)' : 'none',
                      borderRadius: 6, fontSize: 11, fontWeight: 600,
                      color: activeTab === tab.key ? '#111' : '#999', cursor: 'pointer',
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
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>
                    They'll receive an SMS with a link to join FitForge and get linked to your gym.
                  </div>
                  <button
                    onClick={handleInvite}
                    disabled={submitting || !inviteValue.trim()}
                    style={{
                      width: '100%', height: 52, backgroundColor: '#111', color: 'white',
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
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>
                    They'll receive an email invite to join FitForge.
                  </div>
                  <button
                    onClick={handleInvite}
                    disabled={submitting || !inviteValue.trim()}
                    style={{
                      width: '100%', height: 52, backgroundColor: '#111', color: 'white',
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
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                          Comma-separated. Trainer can edit later.
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleManualAdd}
                    disabled={submitting || !manualForm.full_name.trim()}
                    style={{
                      width: '100%', height: 52, backgroundColor: '#111', color: 'white',
                      border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                      cursor: 'pointer', opacity: submitting || !manualForm.full_name.trim() ? 0.5 : 1,
                      marginTop: 8,
                    }}
                  >{submitting ? 'Adding...' : 'Add to Gym'}</button>
                  <div style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 16 }}>
                    This trainer won't have an app account until they sign up.<br />
                    They can claim this profile using their phone number.
                  </div>
                </div>
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
            backgroundColor: 'white', borderRadius: '20px 20px 0 0',
            zIndex: 51, padding: '0 20px 32px',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, margin: '12px auto 16px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                backgroundColor: getAvatarColor(selectedTrainer.full_name).bg,
                color: getAvatarColor(selectedTrainer.full_name).text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 600,
              }}>{getInitials(selectedTrainer.full_name)}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>
                  {selectedTrainer.full_name}
                </div>
                <div style={{ fontSize: 13, color: '#666' }}>
                  {formatSpecializations(selectedTrainer.specializations)}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 8 }}>
              Remove {selectedTrainer.full_name} from your gym?
            </div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>
              They'll lose access to gym features. Their FitForge account stays active.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={handleRemove}
                disabled={submitting}
                style={{
                  width: '100%', height: 52, backgroundColor: '#A32D2D', color: 'white',
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', opacity: submitting ? 0.6 : 1,
                }}
              >{submitting ? 'Removing...' : 'Remove Trainer'}</button>
              <button
                onClick={() => { setShowRemoveSheet(false); setSelectedTrainer(null) }}
                style={{
                  width: '100%', height: 52, backgroundColor: 'white', color: '#111',
                  border: '0.5px solid #111', borderRadius: 12, fontSize: 15, fontWeight: 500,
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
