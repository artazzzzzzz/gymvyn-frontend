import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { ChevronLeft, SendHorizontal } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { useAuth } from '../../hooks/useAuth'

const BASE = import.meta.env.VITE_API_URL || ''

async function chatFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

const ROLE_BADGE = {
  trainer:   { bg: 'var(--muscle-back)',      color: '#fff' },
  gym_owner: { bg: 'var(--muscle-chest)',     color: '#fff' },
  staff:     { bg: 'var(--muscle-shoulders)', color: '#fff' },
}

function formatTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (diffDays === 0) return time
  if (diffDays < 7) return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function SkeletonBubble({ align }) {
  return (
    <div style={{ display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        width: align === 'right' ? 180 : 220,
        height: 40,
        borderRadius: align === 'right' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: 'var(--bg-elevated)',
        opacity: 0.5,
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
    </div>
  )
}

export default function ChatWindow({ conversationId, otherUser, onBack }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const currentUserId = user?.id

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  // Load messages + subscribe on conversationId change
  useEffect(() => {
    if (!conversationId || !currentUserId) return

    setLoading(true)
    setMessages([])

    chatFetch(`/api/chat/messages/${conversationId}`)
      .then(data => {
        setMessages(data || [])
        setLoading(false)
        // Instant scroll on initial load
        setTimeout(() => scrollToBottom('instant'), 0)
      })
      .catch(() => setLoading(false))

    async function refetchMessages() {
      try {
        const data = await chatFetch(`/api/chat/messages/${conversationId}`)
        setMessages(prev => {
          if (!data || data.length <= prev.length) return prev
          scrollToBottom()
          return data
        })
      } catch {}
    }

    // Native (Capacitor WebView) only: poll instead of Supabase realtime.
    // On cold start / app-resume, the native WebView's WebSocket layer can
    // still be spinning up when the Realtime client tries to join, which
    // throws "tried to push ... before joining" (a documented Capacitor/
    // WKWebView timing issue, not something we've seen on plain web — see
    // GAPS.md). A push notification for this conversation (NativePushBridge)
    // triggers an immediate refetch below instead of waiting for the next
    // tick — polling stays as the fallback when push isn't available/denied.
    if (Capacitor.isNativePlatform()) {
      const interval = setInterval(refetchMessages, 3000)

      function onPushReceived(e) {
        if (e.detail?.data?.type === 'chat_message' && e.detail.data.conversationId === conversationId) {
          refetchMessages()
        }
      }
      window.addEventListener('gv:push-received', onPushReceived)

      return () => {
        clearInterval(interval)
        window.removeEventListener('gv:push-received', onPushReceived)
      }
    }

    // Web: Supabase realtime — INSERT on messages filtered by this conversation.
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const incoming = payload.new
          setMessages(prev => {
            // Skip if already exists (our own optimistic message was replaced)
            if (prev.some(m => m.id === incoming.id)) return prev
            return [...prev, incoming]
          })
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, scrollToBottom])

  // Scroll to bottom whenever messages array grows
  useEffect(() => {
    if (!loading && messages.length > 0) scrollToBottom()
  }, [messages.length, loading, scrollToBottom])

  const handleBack = () => {
    if (onBack) onBack()
    else navigate(-1)
  }

  const resizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 22
    const maxLines = 4
    el.style.height = Math.min(el.scrollHeight, lineHeight * maxLines) + 'px'
  }

  const handleTextChange = e => {
    setText(e.target.value)
    resizeTextarea()
  }

  const sendMessage = async () => {
    const content = text.trim()
    if (!content || sending) return

    const tempId = `opt-${Date.now()}`
    const optimistic = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      _optimistic: true,
    }

    setMessages(prev => [...prev, optimistic])
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setSending(true)

    try {
      const saved = await chatFetch('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({ conversationId, content }),
      })
      setMessages(prev => prev.map(m => m.id === tempId ? saved : m))
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setText(content)
      resizeTextarea()
      setError('Failed to send. Tap to retry.')
      setTimeout(() => setError(null), 3000)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const initials = otherUser?.full_name
    ? otherUser.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const roleBadgeStyle = ROLE_BADGE[otherUser?.role] || { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
  const roleLabel = otherUser?.role
    ? otherUser.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-primary)',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
        flexShrink: 0,
      }}>
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={22} />
        </button>

        <div style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {otherUser?.full_name || 'Chat'}
            </span>
            {roleLabel && (
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 20,
                background: roleBadgeStyle.bg,
                color: roleBadgeStyle.color,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {roleLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {loading ? (
          <>
            <SkeletonBubble align="left" />
            <SkeletonBubble align="right" />
            <SkeletonBubble align="left" />
          </>
        ) : messages.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary)',
            fontSize: 14,
            textAlign: 'center',
          }}>
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMe ? 'var(--bg-elevated)' : 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  opacity: msg._optimistic ? 0.65 : 1,
                  border: '1px solid var(--border)',
                }}>
                  {msg.content}
                </div>
                <span style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  marginTop: 3,
                  paddingLeft: isMe ? 0 : 2,
                  paddingRight: isMe ? 2 : 0,
                }}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error toast */}
      {error && (
        <div style={{
          margin: '0 16px 8px',
          padding: '8px 14px',
          background: 'var(--muscle-chest)',
          color: '#fff',
          borderRadius: 10,
          fontSize: 13,
          textAlign: 'center',
          flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* Input bar */}
      <div style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          flex: 1,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              lineHeight: '22px',
              fontFamily: 'inherit',
              maxHeight: 88, // 4 lines × 22px
              overflowY: 'auto',
            }}
          />
        </div>

        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
            background: text.trim() && !sending ? 'var(--text-primary)' : 'var(--border-strong)',
            color: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          <SendHorizontal size={18} />
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  )
}
