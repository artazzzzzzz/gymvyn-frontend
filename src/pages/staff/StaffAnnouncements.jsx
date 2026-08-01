import { useState, useEffect, useCallback } from 'react'
import { useStaffPermissions } from '../../hooks/useStaffPermissions'
import { useAuth } from '../../hooks/useAuth'
import NoAccessState from '../../components/staff/NoAccessState'
import { getGymAnnouncements, postAnnouncement, deleteAnnouncement } from '../../utils/api'

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

const PRIORITY_META = {
  normal: { label: 'Normal', bg: 'var(--bg-pill)', color: 'var(--text-secondary)' },
  important: { label: 'Important', bg: 'var(--warning-bg)', color: 'var(--warning)' },
  urgent: { label: 'Urgent', bg: 'var(--error-bg)', color: 'var(--error)' },
}

function PostSheet({ gymId, userId, onClose, onPosted }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('normal')
  const [submitting, setSubmitting] = useState(false)

  const handlePost = async () => {
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    try {
      await postAnnouncement({ gymId, postedBy: userId, title: title.trim(), body: body.trim(), priority })
      onPosted()
    } catch {
      alert('Failed to post announcement')
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
            New Announcement
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Announcement title..."
              style={{
                width: '100%', height: 48, borderRadius: 12, padding: '0 16px',
                border: '0.5px solid var(--border-strong)',
                backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
                fontSize: 15, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Message</div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your announcement..."
              rows={4}
              style={{
                width: '100%', borderRadius: 12, padding: '12px 16px',
                border: '0.5px solid var(--border-strong)',
                backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
                fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Priority</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(PRIORITY_META).map(([k, m]) => (
                <button
                  key={k}
                  onClick={() => setPriority(k)}
                  style={{
                    flex: 1, height: 36, border: 'none', borderRadius: 20, cursor: 'pointer',
                    fontSize: 13, fontWeight: 500,
                    backgroundColor: priority === k ? m.bg : 'var(--bg-pill)',
                    color: priority === k ? m.color : 'var(--text-secondary)',
                    outline: priority === k ? `1.5px solid ${m.color}` : 'none',
                  }}
                >{m.label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{
              flex: 1, height: 48, backgroundColor: 'var(--bg-pill)',
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
              color: 'var(--text-primary)', cursor: 'pointer',
            }}>Cancel</button>
            <button
              onClick={handlePost}
              disabled={submitting || !title.trim() || !body.trim()}
              style={{
                flex: 2, height: 48, backgroundColor: 'var(--text-primary)',
                border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
                color: 'var(--bg-card)', cursor: 'pointer',
                opacity: (submitting || !title.trim() || !body.trim()) ? 0.5 : 1,
              }}
            >{submitting ? 'Posting...' : 'Post Announcement'}</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function StaffAnnouncements() {
  const { permissions, gymId, loading: permsLoading } = useStaffPermissions()
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [showPostSheet, setShowPostSheet] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchAnnouncements = useCallback(async () => {
    if (!gymId) return
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getGymAnnouncements(gymId)
      setAnnouncements(Array.isArray(data) ? data : [])
    } catch {
      showToast('error', 'Failed to load announcements')
      setFetchError('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return
    setDeleting(id)
    try {
      await deleteAnnouncement(id)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      showToast('success', 'Announcement deleted')
    } catch {
      showToast('error', 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  if (permsLoading) return <LoadingSpinner />
  if (!permissions.view_announcements) return (
    <NoAccessState
      message="Announcements Access Required"
      subtitle="Ask your gym owner to grant you announcements permission."
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
        padding: '16px 20px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Announcements</span>
        <button
          onClick={() => setShowPostSheet(true)}
          style={{
            height: 36, padding: '0 16px', backgroundColor: 'var(--text-primary)',
            color: 'var(--bg-card)', border: 'none', borderRadius: 20,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >+ Post</button>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : fetchError ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 14, color: 'var(--error)', marginBottom: 16, fontWeight: 500 }}>{fetchError}</div>
            <button
              onClick={fetchAnnouncements}
              style={{
                height: 40, padding: '0 20px', backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 20,
                fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
              }}
            >Try again</button>
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 7.65v8.7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.65a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><polyline points="22 7 12 14 2 7"/></svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No announcements</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Post an announcement to inform your gym members</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {announcements.map(ann => {
              const meta = PRIORITY_META[ann.priority] || PRIORITY_META.normal
              const isOwn = ann.posted_by === user?.id
              return (
                <div key={ann.id} style={{
                  backgroundColor: 'var(--bg-card)', borderRadius: 16,
                  border: '0.5px solid var(--border)', padding: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1, marginRight: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {ann.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {ann.posted_by_name || 'Staff'} · {formatDate(ann.created_at)}
                        {isOwn && (
                          <span style={{
                            marginLeft: 6,
                            backgroundColor: 'var(--accent-bg)', color: 'var(--accent)',
                            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
                          }}>You</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {ann.priority !== 'normal' && (
                        <span style={{
                          backgroundColor: meta.bg, color: meta.color,
                          fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                        }}>{meta.label}</span>
                      )}
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(ann.id)}
                          disabled={deleting === ann.id}
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            backgroundColor: 'var(--error-bg)', border: 'none',
                            fontSize: 14, cursor: 'pointer', color: 'var(--error)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: deleting === ann.id ? 0.5 : 1,
                          }}
                        >×</button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {ann.body}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showPostSheet && (
        <PostSheet
          gymId={gymId}
          userId={user?.id}
          onClose={() => setShowPostSheet(false)}
          onPosted={() => {
            setShowPostSheet(false)
            showToast('success', 'Announcement posted')
            fetchAnnouncements()
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
