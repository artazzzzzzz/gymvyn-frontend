import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import { supabase } from '../utils/supabase';

export default function ChatWindow({ conversationId, otherPersonName, onBack }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!conversationId || !user?.id) return;
    loadMessages();
    markRead();
    subscribeRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, user?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const data = await apiFetch(`/api/trainer/messages/${conversationId}?limit=50`);
      setMessages(data || []);
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async () => {
    try {
      await apiFetch('/api/trainer/messages/read', {
        method: 'POST',
        body: JSON.stringify({ conversationId, userId: user.id })
      });
    } catch (err) {
      // non-critical
    }
  };

  const subscribeRealtime = () => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new;
          // Avoid duplicates (our own optimistic messages)
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
          // Mark as read if it's from the other person
          if (newMsg.sender_id !== user.id) {
            markRead();
          }
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      )
      .subscribe();

    channelRef.current = channel;
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
      message_type: 'text',
      created_at: new Date().toISOString(),
      sender: { full_name: user.full_name || 'You' }
    };
    setMessages(prev => [...prev, optimistic]);
    setText('');
    setSending(true);

    try {
      const saved = await apiFetch('/api/trainer/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversationId,
          senderId: user.id,
          content,
          messageType: 'text'
        })
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
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800 bg-zinc-950">
        {onBack && (
          <button onClick={onBack} className="text-zinc-400 text-lg leading-none">←</button>
        )}
        <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <span className="text-emerald-400 font-bold text-sm">
            {(otherPersonName || '?')[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-semibold text-sm">{otherPersonName || 'Chat'}</p>
          <p className="text-[10px] text-emerald-400">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <span className="text-4xl mb-3">👋</span>
            <p className="text-zinc-400 text-sm">No messages yet</p>
            <p className="text-zinc-600 text-xs mt-1">Say hello to get started!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, msgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 px-2">
                  {isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : date}
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
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
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 ${showAvatar ? 'bg-emerald-500/15 flex items-center justify-center' : 'invisible'}`}>
                        {showAvatar && (
                          <span className="text-emerald-400 text-[9px] font-bold">
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
                            ? 'bg-emerald-500/20 border-emerald-500/30 rounded-br-sm'
                            : 'bg-zinc-800 border-zinc-700 rounded-bl-sm'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">📋</span>
                            <span className="text-xs font-medium text-emerald-400">Plan assigned</span>
                          </div>
                          <p className="text-sm text-white">{msg.content}</p>
                        </div>
                      ) : (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? 'bg-emerald-500 text-white rounded-br-sm'
                            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                        } ${msg.id.toString().startsWith('optimistic') ? 'opacity-70' : ''}`}>
                          {msg.content}
                        </div>
                      )}
                      <span className="text-[10px] text-zinc-600 mt-1 px-1">
                        {formatTime(msg.created_at)}
                        {isMe && msg.read_at && <span className="ml-1 text-emerald-500">✓✓</span>}
                        {isMe && !msg.read_at && !msg.id.toString().startsWith('optimistic') && <span className="ml-1">✓</span>}
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
      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 focus-within:border-emerald-500/50 transition-colors">
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
              className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
