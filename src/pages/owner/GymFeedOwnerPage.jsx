import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, RefreshCw, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useOwnerGymId } from '../../hooks/useOwnerGymId'
import { getFeedPosts, deletePost, toggleLike, pinPost } from '../../hooks/useGymFeed'
import FeedPostCard from '../../components/feed/FeedPostCard'
import CommentSheet from '../../components/feed/CommentSheet'
import ComposePostSheet from '../../components/feed/ComposePostSheet'

export default function GymFeedOwnerPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const gymId     = useOwnerGymId()

  const [posts,           setPosts]           = useState([])
  const [page,            setPage]            = useState(1)
  const [hasMore,         setHasMore]         = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [loadingMore,     setLoadingMore]     = useState(false)
  const [error,           setError]           = useState(null)

  const [activeCommentPost, setActiveCommentPost] = useState(null)
  const [isComposeOpen,     setIsComposeOpen]     = useState(false)

  const loadFeed = useCallback(async (p = 1, reset = false) => {
    if (!gymId) return
    reset ? setLoading(true) : setLoadingMore(true)
    setError(null)
    try {
      const result  = await getFeedPosts(gymId, p)
      const incoming = result.posts || []
      setPosts(prev => reset ? incoming : [...prev, ...incoming])
      setPage(p)
      setHasMore((result.total || 0) > (reset ? incoming.length : posts.length + incoming.length))
    } catch (err) {
      setError(err.message || 'Could not load feed.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [gymId])

  useEffect(() => {
    if (gymId) loadFeed(1, true)
  }, [gymId])

  async function handleLikeToggle(post) {
    setPosts(prev => prev.map(p =>
      p.id !== post.id ? p : {
        ...p,
        user_has_liked: !p.user_has_liked,
        like_count: p.user_has_liked ? p.like_count - 1 : p.like_count + 1,
      }
    ))
    try {
      await toggleLike(gymId, post.id)
    } catch {
      setPosts(prev => prev.map(p =>
        p.id !== post.id ? p : { ...p, user_has_liked: post.user_has_liked, like_count: post.like_count }
      ))
    }
  }

  async function handleDelete(post) {
    try {
      await deletePost(gymId, post.id)
      setPosts(prev => prev.filter(p => p.id !== post.id))
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  async function handlePinToggle(post) {
    try {
      const updated = await pinPost(gymId, post.id)
      setPosts(prev => {
        const next = prev.map(p => p.id !== post.id ? p : { ...p, is_pinned: updated.is_pinned })
        return [...next].sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1
          if (!a.is_pinned && b.is_pinned) return 1
          return new Date(b.created_at) - new Date(a.created_at)
        })
      })
    } catch (err) {
      console.error('Pin error:', err)
    }
  }

  function handlePostCreated(newPost) {
    setPosts(prev => [newPost, ...prev])
    setIsComposeOpen(false)
  }

  function handleCommentClose() {
    setActiveCommentPost(null)
    if (gymId) loadFeed(1, true)
  }

  const pinnedPosts   = posts.filter(p => p.is_pinned)
  const unpinnedPosts = posts.filter(p => !p.is_pinned)

  if (!gymId) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ color: 'var(--text-tertiary)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 88 }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        height: 60, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 4 }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Gym Feed</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Owner view — full moderation</p>
        </div>
        <button
          onClick={() => loadFeed(1, true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {/* Feed content */}
      <div style={{ paddingTop: 72, padding: '72px 16px 0' }}>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
            <Loader2 size={24} style={{ color: 'var(--text-tertiary)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <p style={{ color: 'var(--error)', fontSize: 14, marginBottom: 12 }}>{error}</p>
            <button
              onClick={() => loadFeed(1, true)}
              style={{
                padding: '9px 18px', borderRadius: 10, fontSize: 13,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 64 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No posts yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Post an announcement to get the feed started.</p>
          </div>
        ) : (
          <>
            {pinnedPosts.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Pinned
                </p>
                {pinnedPosts.map(post => (
                  <div key={post.id} style={{ marginBottom: 12 }}>
                    <FeedPostCard
                      post={post}
                      currentUserId={user?.id}
                      currentUserRole="gym_owner"
                      gymOwnerId={user?.id}
                      onLikeToggle={handleLikeToggle}
                      onDelete={handleDelete}
                      onPinToggle={handlePinToggle}
                      onCommentTap={setActiveCommentPost}
                    />
                  </div>
                ))}
                {unpinnedPosts.length > 0 && (
                  <div style={{ height: 1, background: 'var(--divider)', margin: '4px 0 16px' }} />
                )}
              </>
            )}

            {unpinnedPosts.map(post => (
              <div key={post.id} style={{ marginBottom: 12 }}>
                <FeedPostCard
                  post={post}
                  currentUserId={user?.id}
                  currentUserRole="gym_owner"
                  gymOwnerId={user?.id}
                  onLikeToggle={handleLikeToggle}
                  onDelete={handleDelete}
                  onPinToggle={handlePinToggle}
                  onCommentTap={setActiveCommentPost}
                />
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => loadFeed(page + 1)}
                disabled={loadingMore}
                style={{
                  width: '100%', padding: '12px 0', fontSize: 14,
                  color: 'var(--text-secondary)', background: 'var(--bg-card)',
                  border: '1px solid var(--border)', borderRadius: 12,
                  cursor: loadingMore ? 'default' : 'pointer', marginTop: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {loadingMore
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                  : 'Load more'
                }
              </button>
            )}
          </>
        )}
      </div>

      {/* Compose FAB */}
      <button
        onClick={() => setIsComposeOpen(true)}
        style={{
          position: 'fixed', bottom: 88, right: 20, zIndex: 40,
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--text-primary)', color: 'var(--bg-primary)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        }}
      >
        <Plus size={22} />
      </button>

      <CommentSheet
        isOpen={!!activeCommentPost}
        onClose={handleCommentClose}
        post={activeCommentPost}
        gymId={gymId}
        currentUserId={user?.id}
        currentUserRole="gym_owner"
      />

      <ComposePostSheet
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        gymId={gymId}
        userRole="gym_owner"
        onPostCreated={handlePostCreated}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
