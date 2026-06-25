import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createPost } from '../../hooks/useGymFeed'

const TYPE_OPTIONS = {
  consumer:  null,
  trainer:   [
    { value: 'general', label: 'General' },
    { value: 'tip',     label: 'Trainer Tip' },
  ],
  gym_owner: [
    { value: 'general',      label: 'General' },
    { value: 'announcement', label: 'Announcement' },
  ],
  staff: [
    { value: 'general',      label: 'General' },
    { value: 'announcement', label: 'Announcement' },
  ],
}

const TYPES_WITH_TITLE = ['announcement', 'tip']

export default function ComposePostSheet({ isOpen, onClose, gymId, userRole, onPostCreated }) {
  const options    = TYPE_OPTIONS[userRole] || null
  const defaultType = options?.[0]?.value || 'general'

  const [postType, setPostType] = useState(defaultType)
  const [title,    setTitle]    = useState('')
  const [content,  setContent]  = useState('')
  const [posting,  setPosting]  = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setPostType(defaultType)
      setTitle('')
      setContent('')
      setError('')
    }
  }, [isOpen])

  async function handlePost() {
    const trimmed = content.trim()
    if (!trimmed || posting) return
    setPosting(true)
    setError('')
    try {
      const post = await createPost(gymId, {
        post_type: postType,
        content:   trimmed,
        title:     title.trim() || undefined,
      })
      onPostCreated?.(post)
      onClose?.()
    } catch (err) {
      setError(err.message || 'Failed to post. Try again.')
    } finally {
      setPosting(false)
    }
  }

  const showTitle = TYPES_WITH_TITLE.includes(postType)

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.5)',
          transition: 'opacity 0.3s',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
          background: 'var(--bg-card)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          transition: 'transform 0.3s ease-out',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          paddingBottom: 32,
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>New Post</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '0 16px' }}>
          {/* Type selector (only if multiple options) */}
          {options && options.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPostType(opt.value)}
                  style={{
                    padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                    border: postType === opt.value ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
                    background: postType === opt.value ? 'var(--text-primary)' : 'var(--bg-pill)',
                    color: postType === opt.value ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Title input */}
          {showTitle && (
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 12,
                border: '1.5px solid var(--border)', fontSize: 14,
                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                outline: 'none', marginBottom: 10, boxSizing: 'border-box',
              }}
            />
          )}

          {/* Content textarea */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 12,
              border: '1.5px solid var(--border)', fontSize: 14,
              background: 'var(--bg-elevated)', color: 'var(--text-primary)',
              outline: 'none', resize: 'none', lineHeight: 1.5,
              minHeight: 100, boxSizing: 'border-box',
            }}
          />

          {error && (
            <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>{error}</p>
          )}

          {/* Post button */}
          <button
            onClick={handlePost}
            disabled={!content.trim() || posting}
            style={{
              width: '100%', padding: '13px 0', marginTop: 12,
              borderRadius: 12, fontSize: 15, fontWeight: 600,
              background: content.trim() ? 'var(--text-primary)' : 'var(--bg-pill)',
              color: content.trim() ? 'var(--bg-primary)' : 'var(--text-tertiary)',
              border: 'none', cursor: content.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
          >
            {posting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
