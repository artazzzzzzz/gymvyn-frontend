import { useState, useEffect, useRef } from 'react'
import {
  assistantSendMessage,
  assistantGetAttention,
  assistantUpdateActionLog,
  apiFetch,
  postAnnouncement,
} from '../../utils/api'

// ── Action executor ───────────────────────────────────────────────────────────
// Maps proposed action tool names to existing authed api.js endpoints.
// The backend never mutates — the frontend executes through these existing paths.

async function executeAction(proposedAction, gymId) {
  const { tool, args } = proposedAction
  switch (tool) {
    case 'propose_post_announcement':
      return postAnnouncement({ gymId, postedBy: null, title: args.title, body: args.body, priority: args.priority })
    case 'propose_mark_payment_paid':
      return apiFetch(`/api/gym-payments/${args.payment_id}/mark-paid`, { method: 'POST' })
    case 'propose_renew_member':
      return apiFetch(`/api/gym-members/${args.member_id}/renew`, {
        method: 'POST',
        body: JSON.stringify({ months: args.months || 1 }),
      })
    case 'propose_record_payment':
      return apiFetch('/api/gym-payments', {
        method: 'POST',
        body: JSON.stringify({ gym_id: gymId, membership_id: args.membership_id, amount: args.amount }),
      })
    case 'propose_add_expense':
      return apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          gym_id: gymId, category: args.category,
          description: args.description, amount: args.amount,
          date: args.date || new Date().toISOString().slice(0, 10),
        }),
      })
    case 'propose_add_schedule':
      return apiFetch('/api/gym-schedule', {
        method: 'POST',
        body: JSON.stringify({
          gym_id: gymId, name: args.class_name, instructor: args.instructor,
          day_of_week: args.day_of_week, start_time: args.start_time,
          end_time: args.end_time, capacity: args.capacity,
        }),
      })
    case 'propose_record_staff_payout':
      return apiFetch('/api/staff-earnings/payout', {
        method: 'POST',
        body: JSON.stringify({ staffId: args.staff_id, amount: args.amount, notes: args.notes }),
      })
    case 'propose_delete_member':
      return apiFetch(`/api/gym-members/${args.member_id}`, { method: 'DELETE' })
    case 'propose_delete_expense':
      return apiFetch(`/api/expenses/${args.expense_id}?gym_id=${gymId}`, { method: 'DELETE' })
    default:
      throw new Error(`Unknown action: ${tool}`)
  }
}

const DESTRUCTIVE = new Set(['propose_delete_member', 'propose_delete_expense'])

function severityIcon(sev) {
  if (sev === 'high')   return '🔴'
  if (sev === 'medium') return '🟡'
  return '⚪'
}

function buildGreeting(items) {
  if (!items?.length) return "Hi! I'm your gym assistant. Ask me anything or tell me what you'd like to do."
  const lines = items.map(it => `${severityIcon(it.severity)} ${it.title} — ${it.description}`)
  return `Here's what needs attention today:\n\n${lines.join('\n')}\n\nAsk me about any of these, or what else can I help you with?`
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, onConfirm, onCancel, loading }) {
  const isUser = msg.role === 'user'
  const hasAction = !!msg.proposedAction && !msg.proposedAction._executed && !msg.proposedAction._cancelled
  const isDone = msg.proposedAction?._executed
  const isDestructive = msg.proposedAction && DESTRUCTIVE.has(msg.proposedAction.tool)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: '88%',
        padding: '10px 14px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser
          ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
          : msg.isError
            ? 'rgba(239,68,68,0.12)'
            : 'var(--bg-card)',
        color: isUser ? '#fff' : 'var(--text-primary)',
        fontSize: 14,
        lineHeight: 1.55,
        border: isUser ? 'none' : '0.5px solid rgba(0,0,0,0.08)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>

      {hasAction && (
        <div style={{
          marginTop: 8,
          maxWidth: '88%',
          padding: '12px 14px',
          borderRadius: 14,
          background: isDestructive ? 'rgba(239,68,68,0.08)' : 'rgba(79,70,229,0.08)',
          border: `1px solid ${isDestructive ? 'rgba(239,68,68,0.3)' : 'rgba(79,70,229,0.3)'}`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: isDestructive ? '#ef4444' : '#7c3aed', marginBottom: 6 }}>
            {isDestructive ? '⚠️ Confirm destructive action' : '✦ Proposed action'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>
            {msg.proposedAction.summary}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onConfirm(msg.proposedAction)}
              disabled={loading}
              style={{
                flex: 1, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isDestructive ? '#ef4444' : '#4f46e5',
                color: '#fff', fontWeight: 600, fontSize: 13,
                opacity: loading ? 0.6 : 1,
              }}
            >
              Confirm
            </button>
            <button
              onClick={() => onCancel(msg.proposedAction)}
              disabled={loading}
              style={{
                flex: 1, height: 36, borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text-secondary)', fontWeight: 500, fontSize: 13,
                opacity: loading ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isDone && (
        <div style={{ fontSize: 12, color: '#10b981', marginTop: 4, marginLeft: 4 }}>
          ✓ Completed
        </div>
      )}
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px', background: 'var(--bg-card)', borderRadius: '18px 18px 18px 4px', border: '0.5px solid rgba(0,0,0,0.08)', width: 60 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--text-secondary)',
          display: 'block',
          animation: 'dot-bounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function AssistantPanel({ isOpen, onClose, gymId, onBadgeClear }) {
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  // Load attention greeting on first open
  useEffect(() => {
    if (!isOpen || !gymId || messages.length > 0) return
    let cancelled = false

    assistantGetAttention(gymId)
      .then(({ items }) => {
        if (cancelled) return
        if (items?.length) onBadgeClear?.()
        setMessages([{
          id: 'greeting',
          role: 'assistant',
          content: buildGreeting(items),
          isGreeting: true,
        }])
      })
      .catch(() => {
        if (cancelled) return
        setMessages([{ id: 'greeting', role: 'assistant', content: "Hi! What can I help you with today?", isGreeting: true }])
      })

    return () => { cancelled = true }
  }, [isOpen, gymId])

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMessages([])
        setConversationId(null)
        setInput('')
      }, 300)
    }
  }, [isOpen])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 350)
  }, [isOpen])

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const result = await assistantSendMessage({ gymId, conversationId, message: text })
      setConversationId(result.conversationId)

      if (result.proposedAction) {
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: `I'd like to: ${result.proposedAction.summary}`,
          proposedAction: result.proposedAction,
        }])
      } else {
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: result.answer || 'Done.',
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, something went wrong: ${err.message}`,
        isError: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(proposedAction) {
    setLoading(true)
    try {
      await executeAction(proposedAction, gymId)
      if (proposedAction.actionLogId) {
        await assistantUpdateActionLog(proposedAction.actionLogId, 'executed', gymId).catch(() => {})
      }
      setMessages(prev => prev.map(m =>
        m.proposedAction?.actionLogId === proposedAction.actionLogId
          ? { ...m, proposedAction: { ...m.proposedAction, _executed: true } }
          : m
      ))
      setMessages(prev => [...prev, { id: `done-${Date.now()}`, role: 'assistant', content: 'Done! Anything else?' }])
      showToast('Action completed')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(proposedAction) {
    if (proposedAction.actionLogId) {
      await assistantUpdateActionLog(proposedAction.actionLogId, 'cancelled', gymId).catch(() => {})
    }
    setMessages(prev => prev.map(m =>
      m.proposedAction?.actionLogId === proposedAction.actionLogId
        ? { ...m, proposedAction: { ...m.proposedAction, _cancelled: true } }
        : m
    ))
    setMessages(prev => [...prev, { id: `cancel-${Date.now()}`, role: 'assistant', content: "Got it, I won't do that. Anything else I can help with?" }])
  }

  if (!isOpen && messages.length === 0) return null

  return (
    <>
      {/* Dot bounce keyframes */}
      <style>{`
        @keyframes dot-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 49, opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '85dvh',
        background: 'var(--bg-primary)',
        borderRadius: '20px 20px 0 0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '14px 16px 12px',
          borderBottom: '0.5px solid rgba(0,0,0,0.08)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: 10,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="14" r="1" fill="white" stroke="none"/>
              <circle cx="15" cy="14" r="1" fill="white" stroke="none"/>
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Gym Assistant</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Powered by AI</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              loading={loading}
            />
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 10 }}>
              <TypingDots />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '10px 12px',
          borderTop: '0.5px solid rgba(0,0,0,0.08)',
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'var(--bg-primary)',
          flexShrink: 0,
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="Ask about revenue, members, attendance…"
            rows={1}
            style={{
              flex: 1, resize: 'none', border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 16, padding: '10px 14px', fontSize: 14,
              background: 'var(--bg-card)', color: 'var(--text-primary)',
              outline: 'none', lineHeight: 1.4, maxHeight: 100,
              fontFamily: 'inherit',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: input.trim() && !loading ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? 'white' : 'var(--text-secondary)'} strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#fff', padding: '10px 20px', borderRadius: 10,
          fontSize: 14, fontWeight: 500, zIndex: 60,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
        }}>
          {toast.message}
        </div>
      )}
    </>
  )
}
