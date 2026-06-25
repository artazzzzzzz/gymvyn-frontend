import { supabase } from '../utils/supabase'

const BASE = import.meta.env.VITE_API_URL

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  }
}

export async function getFeedPosts(gymId, page = 1) {
  const headers = await authHeaders()
  const res = await fetch(`${BASE}/api/gym-feed/${gymId}/posts?page=${page}&limit=20`, { headers })
  if (!res.ok) throw new Error(`Failed to load feed (${res.status})`)
  return res.json()
}

export async function createPost(gymId, { post_type, content, title }) {
  const headers = await authHeaders()
  const res = await fetch(`${BASE}/api/gym-feed/${gymId}/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ post_type, content, title }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to post (${res.status})`)
  }
  return res.json()
}

export async function deletePost(gymId, postId) {
  const headers = await authHeaders()
  const res = await fetch(`${BASE}/api/gym-feed/${gymId}/posts/${postId}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error(`Failed to delete post (${res.status})`)
  return res.json()
}

export async function pinPost(gymId, postId) {
  const headers = await authHeaders()
  const res = await fetch(`${BASE}/api/gym-feed/${gymId}/posts/${postId}/pin`, {
    method: 'PATCH',
    headers,
  })
  if (!res.ok) throw new Error(`Failed to pin post (${res.status})`)
  return res.json()
}

export async function toggleLike(gymId, postId) {
  const headers = await authHeaders()
  const res = await fetch(`${BASE}/api/gym-feed/${gymId}/posts/${postId}/like`, {
    method: 'POST',
    headers,
  })
  if (!res.ok) throw new Error(`Failed to toggle like (${res.status})`)
  return res.json()
}

export async function getComments(gymId, postId, page = 1) {
  const headers = await authHeaders()
  const res = await fetch(
    `${BASE}/api/gym-feed/${gymId}/posts/${postId}/comments?page=${page}&limit=30`,
    { headers }
  )
  if (!res.ok) throw new Error(`Failed to load comments (${res.status})`)
  return res.json()
}

export async function createComment(gymId, postId, content) {
  const headers = await authHeaders()
  const res = await fetch(`${BASE}/api/gym-feed/${gymId}/posts/${postId}/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to comment (${res.status})`)
  }
  return res.json()
}

export async function deleteComment(gymId, postId, commentId) {
  const headers = await authHeaders()
  const res = await fetch(
    `${BASE}/api/gym-feed/${gymId}/posts/${postId}/comments/${commentId}`,
    { method: 'DELETE', headers }
  )
  if (!res.ok) throw new Error(`Failed to delete comment (${res.status})`)
  return res.json()
}
