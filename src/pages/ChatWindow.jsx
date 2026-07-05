import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

export default function ChatWindow({ conversationId, otherPersonName, onBack, headerRight }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    loadMessages();
    const cleanup = subscribeRealtime();
    return cleanup;
  }, [conversationId, user?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      // GET /api/chat/messages/:id also resets this user's unread counter
      // server-side, so there's no separate mark-read call.
      const data = await apiFetch(`/api/chat/messages/${conversationId}`);
      setMessages(data || []);
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeRealtime = () => {
    const interval = setInterval(() => {
      loadMessages();
    }, 3000);
    return () => clearInterval(interval);
  };

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || sending) return;

    // Optimistic update
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      sender: { full_name: user.full_name || 'You' }
    };
    setMessages(prev => [...prev, optimistic]);
    setText('');
    setSending(true);

    try {
      const saved = await apiFetch('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({ conversationId, content })
      });
      // Replace optimistic with real
      setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...saved, sender: optimistic.sender } : m));
    } catch (err) {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setText(content); // restore
      console.error('Send error:', err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  const isToday = (dateStr) => {
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    return dateStr === today;
  };

  const isYesterday = (dateStr) => {
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    return dateStr === yesterday;
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        {onBack && (
          <button onClick={onBack} className="text-[var(--text-secondary)] text-lg leading-none">←</button>
        )}
        <div className="w-9 h-9 rounded-full bg-[var(--success-bg)] flex items-center justify-center flex-shrink-0">
          <span className="text-[var(--success)] font-bold text-sm">
            {(otherPersonName || '?')[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-semibold text-sm">{otherPersonName || 'Chat'}</p>
          <p className="text-[10px] text-[var(--success)]">Online</p>
        </div>
        {headerRight && <div className="ml-auto">{headerRight}</div>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="mb-3 text-[var(--text-tertiary)]">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">No messages yet</p>
            <p className="text-[var(--text-tertiary)] text-xs mt-1">Say hello to get started!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, msgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[var(--bg-hover)]" />
                <span className="text-[10px] text-[var(--text-tertiary)] px-2">
                  {isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : date}
                </span>
                <div className="flex-1 h-px bg-[var(--bg-hover)]" />
              </div>

              {msgs.map((msg, idx) => {
                const isMe = msg.sender_id === user.id;
                const isPlanShare = msg.message_type === 'plan_share';
                const showAvatar = !isMe && (idx === 0 || msgs[idx - 1]?.sender_id !== msg.sender_id);

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar for other person */}
                    {!isMe && (
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 ${showAvatar ? 'bg-[var(--success-bg)] flex items-center justify-center' : 'invisible'}`}>
                        {showAvatar && (
                          <span className="text-[var(--success)] text-[9px] font-bold">
                            {(otherPersonName || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}

                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      {/* Plan share pill */}
                      {isPlanShare ? (
                        <div className={`px-4 py-3 rounded-2xl border ${
                          isMe
                            ? 'bg-[var(--bg-elevated)] border-[var(--border)] rounded-br-sm'
                            : 'bg-[var(--bg-hover)] border-[var(--border-strong)] rounded-bl-sm'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            <span className="text-xs font-medium text-[var(--success)]">Plan assigned</span>
                          </div>
                          <p className="text-sm text-[var(--text-primary)]">{msg.content}</p>
                        </div>
                      ) : (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? 'bg-[var(--success)] text-[var(--text-primary)] rounded-br-sm'
                            : 'bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-bl-sm'
                        } ${msg.id.toString().startsWith('optimistic') ? 'opacity-70' : ''}`}>
                          {msg.content}
                        </div>
                      )}
                      <span className="text-[10px] text-[var(--text-tertiary)] mt-1 px-1">
                        {formatTime(msg.created_at)}
                        {isMe && msg.read_at && <span className="ml-1 text-[var(--success)]">✓</span>}
                        {isMe && !msg.read_at && !msg.id.toString().startsWith('optimistic') && <span className="ml-1 text-[var(--text-tertiary)]">✓</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-2.5 focus-within:border-[var(--cta-border)] transition-colors">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Message..."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none resize-none leading-relaxed"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="w-10 h-10 bg-[var(--success)] rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
