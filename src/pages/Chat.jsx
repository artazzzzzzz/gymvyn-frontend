import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

// ── Static data ───────────────────────────────────────────────────────────────

const sampleMessages = [
  {
    id: '1', role: 'user',
    text: "What's the best rep range for building muscle size?",
    time: '2:34 PM',
  },
  {
    id: '2', role: 'assistant',
    structured: true,
    intro: 'For hypertrophy (muscle size), the research points to:',
    bullets: [
      '6–12 reps is the classic hypertrophy range — enough mechanical tension with sufficient volume.',
      '15–30 reps also works if taken close to failure. Volume is king.',
      'Most important: progressive overload week over week.',
    ],
    rec: {
      label: 'For your goals',
      text: 'Stick to 8–12 reps on compounds, 12–15 on isolation. Add weight when you hit the top of the range.',
    },
    time: '2:34 PM',
  },
  {
    id: '3', role: 'user',
    text: 'Got it. Should I go to failure every set?',
    time: '2:36 PM',
  },
]

const suggestions = [
  { icon: '💪', text: 'Plan my next\ncut phase' },
  { icon: '🏋️', text: 'Fix my squat\nform' },
  { icon: '🥗', text: 'What should I\neat today?' },
  { icon: '📊', text: 'How much protein\ndo I need?' },
]

const quickChips = [
  '💪 Workout advice',
  '🥗 Nutrition help',
  '😴 Recovery tips',
  '📈 Check my progress',
]

// ── Sub-components ────────────────────────────────────────────────────────────

function UserBubble({ msg }) {
  return (
    <div className="flex flex-col items-end mx-5 mb-3">
      <div className="max-w-[75%] bg-[#111] text-white rounded-[18px] rounded-br-[4px] px-4 py-3">
        <p className="text-[14px] leading-relaxed">{msg.text}</p>
      </div>
      <span className="text-[10px] text-[#CCC] mt-1">{msg.time}</span>
    </div>
  )
}

function AiBubble({ msg }) {
  return (
    <div className="flex items-start gap-2 mx-5 mb-3">
      {/* Avatar */}
      <div className="w-7 h-7 bg-[#111] rounded-full flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[11px] font-bold text-white">F</span>
      </div>
      <div className="flex-1 max-w-[85%]">
        <div className="bg-white border border-black/[0.06] rounded-[4px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[18px] px-4 py-3">
          {msg.structured ? (
            <>
              <p className="text-[14px] font-medium text-[#111] leading-snug">{msg.intro}</p>
              <div className="mt-2 space-y-2">
                {msg.bullets.map((b, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#111] mt-2 shrink-0" />
                    <p className="text-[13px] text-[#444] leading-relaxed">{b}</p>
                  </div>
                ))}
              </div>
              {msg.rec && (
                <div className="mt-3 bg-[#F7F7F5] border border-black/[0.06] rounded-[10px] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-1">
                    🎯 {msg.rec.label}
                  </p>
                  <p className="text-[13px] text-[#111] leading-relaxed">{msg.rec.text}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-[14px] text-[#111] leading-relaxed">{msg.text}</p>
          )}
        </div>
        <span className="text-[10px] text-[#CCC] mt-1 ml-1 block">{msg.time}</span>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 mx-5 mb-3">
      <div className="w-7 h-7 bg-[#111] rounded-full flex items-center justify-center shrink-0">
        <span className="text-[11px] font-bold text-white">F</span>
      </div>
      <div className="bg-white border border-black/[0.06] rounded-[4px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[18px] px-4 py-3">
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#BBB]"
              style={{
                animation: 'ffChatBounce 900ms ease-in-out infinite',
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Chat() {
  const navigate = useNavigate()
  const { user }  = useAuth()

  const [messages,   setMessages]   = useState([])
  const [inputText,  setInputText]  = useState('')
  const [isTyping,   setIsTyping]   = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  // Auto-scroll to bottom on new message / typing indicator
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Auto-grow textarea
  function autoGrow(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }

  const sendMessage = async (textOverride) => {
    const text = (textOverride ?? inputText).trim()
    if (!text) return

    const time = new Date().toLocaleTimeString('en-IN', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
    const userMsg = { id: Date.now().toString(), role: 'user', text, time }

    setMessages(prev => [...prev, userMsg])
    setInputText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setIsTyping(true)
    setHasStarted(true)

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: user?.id,
          history: messages.map(m => ({
            role: m.role,
            content: m.text || m.intro || '',
          })),
        }),
      })
      const data = await res.json()
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.response || data.reply || "Here's my advice...",
        time: new Date().toLocaleTimeString('en-IN', {
          hour: 'numeric', minute: '2-digit', hour12: true,
        }),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "Sorry, I'm having trouble connecting right now. Try again.",
        time: new Date().toLocaleTimeString('en-IN', {
          hour: 'numeric', minute: '2-digit', hour12: true,
        }),
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col">

      {/* Bounce keyframes */}
      <style>{`
        @keyframes ffChatBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

      {/* TOP BAR */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/[0.06] h-14 flex items-center justify-between px-5">
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-[#999]">
          ← Back
        </button>
        <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
          <span className="text-base font-semibold text-[#111]">AI Coach</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11]" />
            <span className="text-[11px] text-[#3B6D11]">Online</span>
          </div>
        </div>
        <button className="w-9 h-9 bg-[#F1EFE8] rounded-xl flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
      </div>

      {/* SCROLLABLE MESSAGE AREA */}
      <div className="flex-1 pt-[72px] pb-[140px] overflow-y-auto">

        {/* WELCOME STATE */}
        {!hasStarted && messages.length === 0 && (
          <div className="px-5 pt-8 pb-4">
            {/* AI mark */}
            <div className="w-16 h-16 bg-[#111] rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-[28px] font-bold text-white">F</span>
            </div>
            <h2 className="text-xl font-bold text-[#111] text-center mt-4">
              Your AI Fitness Coach
            </h2>
            <p className="text-sm text-[#999] text-center mt-2 px-6 leading-relaxed">
              Ask me anything about workouts, nutrition, recovery, or your progress.
            </p>

            {/* Suggestion chips 2×2 */}
            <div className="grid grid-cols-2 gap-2.5 mt-8">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const text = s.text.replace('\n', ' ')
                    setInputText(text)
                    setHasStarted(true)
                    sendMessage(text)
                  }}
                  className="bg-white border border-black/[0.08] rounded-2xl p-4 text-left flex flex-col gap-1.5 active:bg-[#F7F7F5] transition-colors"
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-[14px] font-medium text-[#111] leading-snug whitespace-pre-line">
                    {s.text}
                  </span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mt-6">
              <div className="flex-1 h-px bg-black/[0.05]" />
              <span className="text-[11px] text-[#CCC]">or ask anything below</span>
              <div className="flex-1 h-px bg-black/[0.05]" />
            </div>
          </div>
        )}

        {/* SAMPLE THREAD (shown in welcome state below chips) */}
        {!hasStarted && messages.length === 0 && (
          <div className="mt-2">
            {sampleMessages.map(msg =>
              msg.role === 'user'
                ? <UserBubble key={msg.id} msg={msg} />
                : <AiBubble   key={msg.id} msg={msg} />
            )}
          </div>
        )}

        {/* REAL MESSAGES */}
        {hasStarted && messages.map(msg =>
          msg.role === 'user'
            ? <UserBubble key={msg.id} msg={msg} />
            : <AiBubble   key={msg.id} msg={msg} />
        )}

        {/* TYPING INDICATOR */}
        {isTyping && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* INPUT BAR — fixed above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-black/[0.06]">

        {/* Quick chips — only when input is empty */}
        {inputText === '' && (
          <div className="flex gap-2 px-4 pt-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {quickChips.map((c, i) => (
              <button
                key={i}
                onClick={() => {
                  const text = c.replace(/^[^\s]+ /, '')
                  setInputText(text)
                  setHasStarted(true)
                  sendMessage(text)
                }}
                className="shrink-0 h-7 px-3 rounded-full border border-black/10 text-[13px] text-[#666] whitespace-nowrap"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 px-4 pt-2 pb-3">
          {/* Attachment */}
          <button className="w-9 h-9 bg-[#F1EFE8] rounded-xl flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#999" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={e => {
              setInputText(e.target.value)
              autoGrow(e.target)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach..."
            rows={1}
            className="flex-1 bg-[#F1EFE8] rounded-2xl px-4 py-2.5 text-sm text-[#111] placeholder-[#999] focus:outline-none resize-none leading-relaxed min-h-[40px] max-h-[100px]"
            style={{ overflowY: inputText.split('\n').length > 3 ? 'auto' : 'hidden' }}
          />

          {/* Send */}
          <button
            onClick={() => sendMessage()}
            disabled={!inputText.trim()}
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              inputText.trim() ? 'bg-[#111]' : 'bg-[#F1EFE8]'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={inputText.trim() ? 'white' : '#CCC'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>
      </div>

    </div>
  )
}
