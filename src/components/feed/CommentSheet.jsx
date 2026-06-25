import { useState, useEffect, useRef } from 'react'
import { Send, Trash2, Loader2 } from 'lucide-react'
import { getComments, createComment, deleteComment } from '../../hooks/useGymFeed'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return day < 7 ? `${day}d ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export default function CommentSheet({ isOpen, onClose, post, gymId, currentUserId, currentUserRole }) {
  const [comments,  setComments]  = useState([])
  const [page,      setPage]      = useState(1)
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sending,   setSending]   = useState(false)
  const [text,      setText]      = useState('')
  const inputRef    = useRef(null)
  const listRef     = useRef(null)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && post?.id) {
      setComments([])
      setPage(1)
      fetchComments(1, true)
    }
  }, [isOpen, post?.id])

  async function fetchComments(p = 1, reset = false) {
    if (!gymId || !post?.id) return
    reset ? setLoading(true) : setLoadingMore(true)
    try {
      const result = await getComments(gymId, post.id, p)
      setComments(prev => reset ? (result.comments || []) : [...prev, ...(result.comments || [])])
      setTotal(result.total || 0)
      setPage(p)
    } catch (err) {
      console.error('Load comments error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  async function handleSend() {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    try {
      const comment = await createComment(gymId, post.id, content)
      setComments(prev => [...prev, comment])
      setTotal(t => t + 1)
      setText('')
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      }, 50)
    } catch (err) {
      console.error('Comment error:', err)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(comment) {
    try {
      await deleteComment(gymId, post.id, comment.id)
      setComments(prev => prev.filter(c => c.id !== comment.id))
      setTotal(t => Math.max(0, t - 1))
    } catch (err) {
      console.error('Delete comment error:', err)
    }
  }

  const canDeleteComment = (comment) =>
    comment.author_id === currentUserId ||
    currentUserRole === 'gym_owner'      ||
    currentUserRole === 'staff'

  const hasMore = comments.length < total

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
          display: 'flex', flexDirection: 'column',
          maxHeight: '85vh',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>

        {/* Post summary */}
        {post && (
          <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{post.author_name}</span>
              {' · '}
              {post.content?.slice(0, 100)}{post.content?.length > 100 ? '…' : ''}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {total} comment{total !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        <div style={{ height: 1, background: 'var(--divider)', flexShrink: 0 }} />

        {/* Comment list */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
              <Loader2 size={22} style={{ color: 'var(--text-tertiary)', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : comments.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, paddingTop: 32 }}>
              No comments yet. Be the first.
            </p>
          ) : (
            <>
              {comments.map(comment => (
                <div key={comment.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0,
                  }}>
                    {initials(comment.author_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {comment.author_name}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {timeAgo(comment.created_at)}
                      </span>
                      {canDeleteComment(comment) && (
                        <button
                          onClick={() => handleDelete(comment)}
                          style={{
                            marginLeft: 'auto', background: 'none', border: 'none',
                            cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2,
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
              {hasMore && (
                <button
                  onClick={() => fetchComments(page + 1)}
                  disabled={loadingMore}
                  style={{
                    width: '100%', padding: '8px 0', fontSize: 13,
                    color: 'var(--text-secondary)', background: 'none',
                    border: 'none', cursor: 'pointer', marginBottom: 8,
                  }}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Input row */}
        <div style={{
          padding: '10px 16px 24px',
          borderTop: '1px solid var(--divider)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          background: 'var(--bg-card)',
        }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Add a comment…"
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 12,
              border: '1.5px solid var(--border)', fontSize: 14,
              background: 'var(--bg-elevated)', color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: text.trim() ? 'var(--text-primary)' : 'var(--bg-pill)',
              border: 'none', cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            {sending
              ? <Loader2 size={15} style={{ color: 'var(--bg-primary)', animation: 'spin 1s linear infinite' }} />
              : <Send size={15} style={{ color: text.trim() ? 'var(--bg-primary)' : 'var(--text-tertiary)' }} />
            }
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
