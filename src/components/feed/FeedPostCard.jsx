import { useState } from 'react'
import { Heart, MessageCircle, MoreHorizontal, Pin, Trash2 } from 'lucide-react'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7)  return `${day}d ago`
  const w = Math.floor(day / 7)
  return w < 5 ? `${w}w ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?'
}

const ROLE_LABELS = {
  gym_owner: 'Owner',
  trainer:   'Trainer',
  staff:     'Staff',
  consumer:  'Member',
  gym_member: 'Member',
}

const TYPE_BADGE = {
  announcement: { label: 'Announcement', bg: 'var(--accent-bg)',   color: 'var(--accent)' },
  tip:          { label: 'Trainer Tip',   bg: 'var(--success-bg)',  color: 'var(--success)' },
  achievement:  { label: 'Achievement',   bg: 'var(--xp-gold-bg)', color: 'var(--xp-gold)' },
}

export default function FeedPostCard({
  post,
  currentUserId,
  currentUserRole,
  gymOwnerId,
  onLikeToggle,
  onDelete,
  onPinToggle,
  onCommentTap,
}) {
  const [expanded, setExpanded]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)

  const badge    = TYPE_BADGE[post.post_type]
  const isAchievement = post.post_type === 'achievement'
  const canModify = (
    currentUserId === post.author_id ||
    currentUserRole === 'gym_owner'  ||
    currentUserRole === 'staff'
  )
  const canPin = currentUserRole === 'gym_owner' || currentUserRole === 'staff'

  const cardStyle = {
    background:   isAchievement ? 'var(--xp-gold-bg)' : 'var(--bg-card)',
    border:       `1px solid ${isAchievement ? 'var(--xp-gold)' : 'var(--border)'}`,
    borderLeft:   isAchievement ? '4px solid var(--xp-gold)' : undefined,
    borderRadius: 16,
    padding:      16,
    position:     'relative',
  }

  return (
    <div style={cardStyle}>
      {/* Pin label */}
      {post.is_pinned && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 4,
          color: 'var(--text-secondary)', fontSize: 11,
        }}>
          <Pin size={11} />
          <span>Pinned</span>
        </div>
      )}

      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          flexShrink: 0,
        }}>
          {initials(post.author_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              {post.author_name || 'Someone'}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px',
              borderRadius: 99, background: 'var(--bg-pill)',
              color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {ROLE_LABELS[post.author_role] || 'Member'}
            </span>
            {badge && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px',
                borderRadius: 99, background: badge.bg, color: badge.color,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {badge.label}
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{timeAgo(post.created_at)}</span>
        </div>
        {canModify && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{ padding: 4, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <>
                <div
                  onClick={() => setMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                />
                <div style={{
                  position: 'absolute', top: 28, right: 0, zIndex: 20,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 12, minWidth: 140, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                }}>
                  {canPin && (
                    <button
                      onClick={() => { setMenuOpen(false); onPinToggle?.(post) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '10px 14px', background: 'none',
                        border: 'none', cursor: 'pointer', fontSize: 13,
                        color: 'var(--text-primary)', textAlign: 'left',
                      }}
                    >
                      <Pin size={14} />
                      {post.is_pinned ? 'Unpin' : 'Pin'}
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); onDelete?.(post) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '10px 14px', background: 'none',
                      border: 'none', cursor: 'pointer', fontSize: 13,
                      color: 'var(--error)', textAlign: 'left',
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      {post.title && (
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          {post.title}
        </p>
      )}

      {/* Content */}
      <div>
        <p
          style={{
            fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5,
            display: '-webkit-box', WebkitBoxOrient: 'vertical',
            WebkitLineClamp: expanded ? 'unset' : 4,
            overflow: expanded ? 'visible' : 'hidden',
          }}
        >
          {post.content}
        </p>
        {post.content?.length > 200 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
          >
            Read more
          </button>
        )}
      </div>

      {/* Image */}
      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          style={{
            width: '100%', maxHeight: 256, objectFit: 'cover',
            borderRadius: 12, marginTop: 10,
          }}
        />
      )}

      {/* Bottom action row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14 }}>
        <button
          onClick={() => onLikeToggle?.(post)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 13, padding: 0,
          }}
        >
          <Heart
            size={17}
            fill={post.user_has_liked ? 'var(--error)' : 'none'}
            stroke={post.user_has_liked ? 'var(--error)' : 'currentColor'}
            style={{ transition: 'fill 0.15s, stroke 0.15s' }}
          />
          <span>{post.like_count || 0}</span>
        </button>

        <button
          onClick={() => onCommentTap?.(post)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 13, padding: 0,
          }}
        >
          <MessageCircle size={17} />
          <span>{post.comment_count || 0}</span>
        </button>
      </div>
    </div>
  )
}
