import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { getAvatarColor, getInitials } from '../utils/avatarColor'

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name, photoUrl, size = 36 }) {
  const { bg, text } = getAvatarColor(name)
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        alt=""
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size, backgroundColor: bg, color: text }}
      className="rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0"
    >
      {getInitials(name)}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-[var(--text-tertiary)]">{message}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Community() {
  const { user } = useAuth()
  const userId = user?.id

  const [activeTab, setActiveTab] = useState('feed')

  // Feed
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)

  // Buddies
  const [myBuddies, setMyBuddies] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [suggestedUsers, setSuggestedUsers] = useState([])
  const [buddiesLoading, setBuddiesLoading] = useState(true)

  // Post compose sheet
  const [showCompose, setShowCompose] = useState(false)
  const [postText, setPostText] = useState('')
  const [postSubmitting, setPostSubmitting] = useState(false)

  // Toast
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef(null)

  function showToast(msg) {
    setToast(msg)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 3000)
  }

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadFeed = useCallback(async () => {
    if (!userId) return
    setPostsLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, users:user_id(full_name), post_likes(user_id), post_comments(id)')
      .order('created_at', { ascending: false })
      .limit(20)
    setPosts(data ?? [])
    setPostsLoading(false)
  }, [userId])

  const loadLeaderboard = useCallback(async () => {
    if (!userId) return
    setLeaderboardLoading(true)

    // Monday of current week at midnight
    const now = new Date()
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // 0=Mon
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek)
    monday.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('workout_logs')
      .select('user_id, users:user_id(full_name)')
      .gte('completed_at', monday.toISOString())
      .not('completed_at', 'is', null)
      .limit(500)

    if (data) {
      const counts = {}
      data.forEach(log => {
        const uid = log.user_id
        if (!counts[uid]) {
          counts[uid] = { user_id: uid, name: log.users?.full_name || 'Gymvyn User', count: 0 }
        }
        counts[uid].count++
      })
      const ranked = Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((u, i) => ({ ...u, rank: i + 1, isMe: u.user_id === userId }))
      setLeaderboard(ranked)
    }
    setLeaderboardLoading(false)
  }, [userId])

  const loadBuddies = useCallback(async () => {
    if (!userId) return
    setBuddiesLoading(true)

    const [{ data: accepted }, { data: pending }, { data: allUsers }] = await Promise.all([
      supabase
        .from('buddy_requests')
        .select('id, sender_id, receiver_id, sender:sender_id(id, full_name), receiver:receiver_id(id, full_name)')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted'),
      supabase
        .from('buddy_requests')
        .select('id, sender_id, sender:sender_id(id, full_name)')
        .eq('receiver_id', userId)
        .eq('status', 'pending'),
      supabase
        .from('users')
        .select('id, full_name')
        .neq('id', userId)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    const connectedIds = new Set(
      (accepted ?? []).flatMap(b => [b.sender_id, b.receiver_id])
    )
    const pendingIds = new Set((pending ?? []).map(b => b.sender_id))

    const buddyList = (accepted ?? []).map(b => {
      const isSender = b.sender_id === userId
      const other = isSender ? b.receiver : b.sender
      return { id: b.id, user_id: other?.id, name: other?.full_name || 'Gymvyn User' }
    })

    const suggested = (allUsers ?? [])
      .filter(u => !connectedIds.has(u.id) && !pendingIds.has(u.id))
      .slice(0, 5)

    setMyBuddies(buddyList)
    setPendingRequests(pending ?? [])
    setSuggestedUsers(suggested)
    setBuddiesLoading(false)
  }, [userId])

  useEffect(() => {
    if (activeTab === 'feed') loadFeed()
    else if (activeTab === 'leaderboard') loadLeaderboard()
    else if (activeTab === 'buddies') loadBuddies()
  }, [activeTab, loadFeed, loadLeaderboard, loadBuddies])

  // ── Actions ────────────────────────────────────────────────────────────────

  async function toggleLike(post) {
    if (!userId) return
    const isLiked = post.post_likes?.some(l => l.user_id === userId)

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== post.id) return p
      const newLikes = isLiked
        ? p.post_likes.filter(l => l.user_id !== userId)
        : [...(p.post_likes ?? []), { user_id: userId }]
      return { ...p, post_likes: newLikes }
    }))

    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', userId)
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: userId })
    }
  }

  async function handleSubmitPost() {
    if (!postText.trim() || postSubmitting) return
    setPostSubmitting(true)
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: userId, content: postText.trim() })
      .select('*, users:user_id(full_name), post_likes(user_id), post_comments(id)')
      .single()
    if (error) {
      showToast('Failed to post. Try again.')
    } else {
      setPosts(prev => [data, ...prev])
      setPostText('')
      setShowCompose(false)
      showToast('Posted!')
    }
    setPostSubmitting(false)
  }

  async function acceptBuddy(requestId) {
    const { error } = await supabase
      .from('buddy_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)
    if (!error) {
      showToast('Buddy added!')
      loadBuddies()
    }
  }

  async function addBuddy(receiverId) {
    const { error } = await supabase
      .from('buddy_requests')
      .insert({ sender_id: userId, receiver_id: receiverId, status: 'pending' })
    if (!error) {
      setSuggestedUsers(prev => prev.filter(u => u.id !== receiverId))
      showToast('Buddy request sent!')
    }
  }

  // ── Post card ──────────────────────────────────────────────────────────────

  function PostCard({ post }) {
    const isLiked = post.post_likes?.some(l => l.user_id === userId)
    const likeCount = post.post_likes?.length ?? 0
    const commentCount = post.post_comments?.length ?? 0
    const authorName = post.users?.full_name || 'Gymvyn User'

    return (
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4">
        <div className="flex items-center gap-2">
          <Avatar name={authorName} size={36} />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">{authorName}</p>
          </div>
          <span className="text-xs text-[var(--text-tertiary)]">{timeAgo(post.created_at)}</span>
        </div>

        <p className="mt-3 text-sm text-[var(--text-primary)] leading-snug whitespace-pre-wrap">{post.content}</p>

        {post.image_url && (
          <img
            src={post.image_url}
            className="mt-3 w-full rounded-xl object-cover max-h-64"
            alt=""
          />
        )}

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
          <button
            onClick={() => toggleLike(post)}
            className="text-[13px] text-[var(--text-tertiary)] flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={isLiked ? 'var(--error)' : 'none'} stroke={isLiked ? 'var(--error)' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span>{likeCount}</span>
          </button>
          <span className="text-[13px] text-[var(--text-tertiary)] flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {commentCount}
          </span>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[var(--text-primary)] text-white text-sm px-4 py-2 rounded-xl z-[200] whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)] h-14 flex items-center justify-between px-5">
        <span className="text-xl font-semibold text-[var(--text-primary)]">Community</span>
        <button
          onClick={() => setShowCompose(true)}
          className="w-9 h-9 bg-[var(--bg-pill)] rounded-xl flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      {/* Tab row */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="grid grid-cols-3">
          {[
            { id: 'feed', label: 'Feed' },
            { id: 'leaderboard', label: 'Leaderboard' },
            { id: 'buddies', label: 'Buddies' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-3 text-[14px] transition-colors border-b-2 ${
                activeTab === t.id
                  ? 'font-semibold text-[var(--text-primary)] border-[var(--text-primary)]'
                  : 'font-normal text-[var(--text-tertiary)] border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="pt-[108px]">

        {/* ── Feed ── */}
        {activeTab === 'feed' && (
          <div className="px-5 mt-4 space-y-3">
            {postsLoading
              ? <Spinner />
              : posts.length === 0
                ? <EmptyState message="No posts yet. Be the first to share something!" />
                : posts.map(p => <PostCard key={p.id} post={p} />)
            }
          </div>
        )}

        {/* ── Leaderboard ── */}
        {activeTab === 'leaderboard' && (
          <div className="px-5 mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Workouts This Week</p>
            {leaderboardLoading
              ? <Spinner />
              : leaderboard.length === 0
                ? <EmptyState message="No workouts logged this week yet." />
                : (
                  <div className="space-y-2">
                    {leaderboard.map(u => {
                      const medal = u.rank
                      return (
                        <div
                          key={u.user_id}
                          className={`rounded-xl border p-4 flex items-center gap-3 ${
                            u.isMe ? 'bg-[var(--text-primary)] border-[var(--text-primary)]' : 'bg-[var(--bg-card)] border-[var(--border)]'
                          }`}
                        >
                          <span className={`text-base font-bold w-6 text-center ${u.isMe ? 'text-white' : 'text-[var(--text-tertiary)]'}`}>
                            {medal}
                          </span>
                          <Avatar name={u.name} size={36} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${u.isMe ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                              {u.isMe ? 'You' : u.name}
                            </p>
                          </div>
                          <span className={`text-sm font-semibold tabular-nums ${u.isMe ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                            {u.count} {u.count === 1 ? 'workout' : 'workouts'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
            }
          </div>
        )}

        {/* ── Buddies ── */}
        {activeTab === 'buddies' && (
          <div className="px-5 mt-4">
            {buddiesLoading
              ? <Spinner />
              : (
                <>
                  {/* Pending incoming requests */}
                  {pendingRequests.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Pending Requests</p>
                      <div className="space-y-2 mb-5">
                        {pendingRequests.map(r => (
                          <div key={r.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex items-center gap-3">
                            <Avatar name={r.sender?.full_name} size={40} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[var(--text-primary)]">{r.sender?.full_name || 'Gymvyn User'}</p>
                              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Wants to train with you</p>
                            </div>
                            <button
                              onClick={() => acceptBuddy(r.id)}
                              className="text-[13px] font-medium text-white bg-[var(--text-primary)] px-3 py-1.5 rounded-xl"
                            >
                              Accept
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* My buddies */}
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Your Buddies</p>
                  {myBuddies.length === 0
                    ? (
                      <div className="text-center py-6 mb-5">
                        <p className="text-sm text-[var(--text-tertiary)]">No buddies yet. Find people to train with!</p>
                      </div>
                    )
                    : (
                      <div className="space-y-2 mb-5">
                        {myBuddies.map(b => (
                          <div key={b.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex items-center gap-3">
                            <Avatar name={b.name} size={40} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[var(--text-primary)]">{b.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }

                  {/* Suggested users */}
                  {suggestedUsers.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Suggested</p>
                      <div className="space-y-2">
                        {suggestedUsers.map(u => (
                          <div key={u.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex items-center gap-3">
                            <Avatar name={u.full_name} size={40} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[var(--text-primary)]">{u.full_name || 'Gymvyn User'}</p>
                            </div>
                            <button
                              onClick={() => addBuddy(u.id)}
                              className="text-[13px] font-medium text-white bg-[var(--text-primary)] px-3 py-1.5 rounded-xl"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )
            }
          </div>
        )}
      </div>

      {/* ── Compose sheet ── */}
      {showCompose && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[100]"
            onClick={() => { setShowCompose(false); setPostText('') }}
          />
          <div
            className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] rounded-t-2xl z-[101] p-5 flex flex-col"
            style={{ height: '85vh' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-semibold text-[var(--text-primary)]">New Post</span>
              <button
                onClick={() => { setShowCompose(false); setPostText('') }}
                className="w-7 h-7 flex items-center justify-center text-[var(--text-tertiary)] text-lg"
              >
                ✕
              </button>
            </div>

            <textarea
              autoFocus
              value={postText}
              onChange={e => setPostText(e.target.value.slice(0, 500))}
              placeholder="What's on your mind?"
              rows={6}
              className="w-full resize-none border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)] flex-1"
            />

            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-[var(--text-tertiary)]">{postText.length} / 500</span>
            </div>

            <button
              onClick={handleSubmitPost}
              disabled={!postText.trim() || postSubmitting}
              className="w-full mt-4 py-3 rounded-2xl font-semibold text-sm bg-[var(--bg-card)] border border-[var(--text-primary)] text-[var(--text-primary)] disabled:bg-[var(--bg-pill)] disabled:border-[var(--border)] disabled:text-[var(--text-tertiary)] transition-opacity"
            >
              {postSubmitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
