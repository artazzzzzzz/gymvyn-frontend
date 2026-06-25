import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

/* ─── palette ─── */
const C = {
  bg: 'var(--bg-pill)', card: "var(--bg-card)", border: 'var(--border)',
  text: 'var(--text-primary)', sub: 'var(--text-secondary)',
  green: '#1a9955', greenBg: 'var(--success-bg)',
  blue: '#1a6fd4', blueBg: 'var(--accent-bg)',
  gray: 'var(--text-tertiary)', grayBg: 'var(--bg-pill)',
  red: '#d93025',
};

/* ─── avatar color pool (cycles by index) ─── */
const AV_POOL = [
  { bg: 'var(--accent-bg)', fg: '#1a6fd4' },
  { bg: 'var(--success-bg)', fg: '#1a9955' },
  { bg: '#fce8f3', fg: '#c0397b' },
  { bg: 'var(--warning-bg)', fg: '#c07800' },
  { bg: 'var(--bg-pill)', fg: 'var(--text-secondary)' },
  { bg: 'var(--success-bg)', fg: '#0a8c6c' },
];
function getAv(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AV_POOL[Math.abs(h) % AV_POOL.length];
}

/* ─── icons ─── */
const IcoBk = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IcoSrch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.gray} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IcoMore = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
  </svg>
);
const IcoClip = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gray} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);
const IcoSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bg-card)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

/* ─── AvatarCircle ─── */
function AvaCircle({ name, size = 44, radius = 14 }) {
  const av = getAv(name);
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: av.bg, color: av.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, letterSpacing: '0.3px',
    }}>{initials}</div>
  );
}

/* ─── UnreadBadge ─── */
function UnreadBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      minWidth: 20, height: 20, borderRadius: 10, background: C.blue, color: "var(--bg-card)",
      fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 5px', flexShrink: 0,
    }}>{count}</span>
  );
}

/* ─── formatTime helper (in-component) ─── */
function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ─── Message bubble ─── */
function BubbleMsg({ msg, showTime }) {
  if (msg.sender_type === 'system' || msg.is_system) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
        <span style={{
          fontSize: 11, color: C.sub, background: C.grayBg,
          borderRadius: 9999, padding: '3px 12px',
        }}>{msg.content || msg.text}</span>
      </div>
    );
  }

  const isT = msg.sender_type === 'trainer' || msg.from === 'trainer';
  const bg = isT ? "var(--text-primary)" : 'var(--bg-pill)';
  const col = isT ? "var(--bg-card)" : C.text;
  const rad = isT ? '18px 18px 4px 18px' : '18px 18px 18px 4px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isT ? 'flex-end' : 'flex-start' }}>
      <div style={{
        background: bg, color: col, borderRadius: rad,
        padding: '10px 13px', fontSize: 13, lineHeight: 1.5,
        maxWidth: '78%', wordBreak: 'break-word',
      }}>{msg.content || msg.text}</div>
      {showTime && msg.created_at && (
        <div style={{
          fontSize: 10, color: C.sub, marginTop: 3,
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════ */
export default function TrainerChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedConvoId = searchParams.get('convoId');

  /* ── existing state (preserved) ── */
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── new UI state ── */
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  /* ── polling logic (preserved) ── */
  useEffect(() => {
    if (!user?.id) return;
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (preselectedConvoId && conversations.length > 0) {
      const found = conversations.find(c => c.id === preselectedConvoId);
      if (found) setActiveConvo(found);
    }
  }, [preselectedConvoId, conversations]);

  /* load messages when convo opens */
  useEffect(() => {
    if (!activeConvo) return;
    loadMessages(activeConvo.id);
    markRead(activeConvo.id);
  }, [activeConvo?.id]);

  /* auto-scroll on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── API helpers (original preserved) ── */
  const loadConversations = async () => {
    try {
      const data = await apiFetch(`/api/trainer/conversations/${user.id}`);
      setConversations(data || []);
      if (data?.length > 0 && !activeConvo && preselectedConvoId) {
        const found = data.find(c => c.id === preselectedConvoId);
        if (found) setActiveConvo(found);
      }
    } catch (err) {
      console.error('Load conversations error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convoId) => {
    setMessagesLoading(true);
    try {
      const data = await apiFetch(`/api/trainer/messages/${convoId}`);
      setMessages(data || []);
    } catch (err) {
      console.error('Load messages error:', err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const markRead = async (convoId) => {
    try {
      await apiFetch(`/api/trainer/conversations/${convoId}/read`, { method: 'POST' });
    } catch (_) {}
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConvo || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    /* optimistic */
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_type: 'trainer',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      await apiFetch('/api/trainer/messages', {
        method: 'POST',
        body: JSON.stringify({ conversationId: activeConvo.id, senderId: user.id, content: text }),
      });
      await loadMessages(activeConvo.id);
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  /* ── preserved helpers ── */
  const getOtherPersonName = (convo) => {
    if (!convo) return '';
    return convo.client?.full_name || 'Client';
  };

  const formatLastTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const totalUnread = conversations.reduce((s, c) => s + (c.trainer_unread || 0), 0);

  /* ── filter + search ── */
  const FILTER_LABELS = ['All', `Unread (${totalUnread})`, 'Clients', 'Needs reply'];
  const filteredConvos = conversations.filter(c => {
    const name = getOtherPersonName(c).toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filter === `Unread (${totalUnread})` && !(c.trainer_unread > 0)) return false;
    return true;
  });

  /* ── message grouping helpers ── */
  const showTimestamp = (msgs, i) => {
    if (!msgs[i] || msgs[i].sender_type === 'system' || msgs[i].is_system) return false;
    const next = msgs.slice(i + 1).find(m => !m.is_system && m.sender_type !== 'system');
    return !next || next.sender_type !== msgs[i].sender_type;
  };
  const msgMarginTop = (msgs, i) => {
    if (i === 0) return 0;
    const prev = msgs[i - 1];
    const cur = msgs[i];
    if (prev.is_system || cur.is_system || prev.sender_type === 'system' || cur.sender_type === 'system') return 14;
    return prev.sender_type === cur.sender_type ? 6 : 16;
  };

  /* ── loading ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${C.blue}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const clientName = getOtherPersonName(activeConvo);

  return (
    <div style={{ height: '100vh', background: C.bg, display: 'flex', overflow: 'hidden', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ═══ CONVERSATION LIST ═══ */}
      <div style={{
        width: activeConvo ? undefined : '100%',
        maxWidth: activeConvo ? 340 : undefined,
        flexShrink: 0,
        display: activeConvo ? 'none' : 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${C.border}`,
        background: C.card,
        /* show on desktop always */
      }}
        className="chat-list-panel"
      >
        {/* Header */}
        <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '16px 16px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <button
                onClick={() => navigate('/trainer/dashboard')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.blue, fontSize: 13, display: 'flex', alignItems: 'center', gap: 2, padding: 0, marginBottom: 6, fontFamily: 'inherit' }}
              >
                <IcoBk /> Dashboard
              </button>
              <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Messages</span>
            </div>
            {totalUnread > 0 && (
              <span style={{
                minWidth: 24, height: 24, borderRadius: 12, background: C.red, color: "var(--bg-card)",
                fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 6px',
              }}>{totalUnread}</span>
            )}
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, height: 36,
            background: C.grayBg, borderRadius: 10, padding: '0 10px', marginBottom: 10,
          }}>
            <IcoSrch />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: 13, color: C.text, flex: 1, fontFamily: 'inherit',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
            )}
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {FILTER_LABELS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                  border: filter === f ? 'none' : `1px solid ${C.border}`,
                  background: filter === f ? C.text : C.card,
                  color: filter === f ? "var(--bg-card)" : C.sub, fontFamily: 'inherit',
                  transition: 'all 0.12s',
                }}
              >{f}</button>
            ))}
          </div>
        </div>

        {/* Conversation rows */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {filteredConvos.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>💬</p>
              <p style={{ color: C.sub, fontSize: 13 }}>No conversations yet</p>
              <p style={{ color: C.gray, fontSize: 11, marginTop: 4 }}>Conversations start when a client connects</p>
            </div>
          ) : (
            filteredConvos.map((convo, i) => {
              const name = getOtherPersonName(convo);
              const unread = convo.trainer_unread || 0;
              const isActive = activeConvo?.id === convo.id;

              return (
                <div key={convo.id}>
                  <button
                    onClick={() => setActiveConvo(convo)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '0 16px', height: 72, cursor: 'pointer', textAlign: 'left',
                      background: isActive ? 'var(--bg-pill)' : 'transparent',
                      border: 'none', fontFamily: 'inherit',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <AvaCircle name={name} size={44} radius={14} />
                      {unread > 0 && (
                        <span style={{
                          position: 'absolute', top: -2, right: -2,
                          width: 16, height: 16, borderRadius: '50%',
                          background: C.red, border: `1.5px solid ${C.card}`,
                          fontSize: 9, fontWeight: 700, color: "var(--bg-card)",
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{unread > 9 ? '9+' : unread}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: unread > 0 ? 700 : 600, color: C.text, marginBottom: 3 }}>{name}</div>
                      <div style={{
                        fontSize: 13, color: unread > 0 ? C.text : C.sub,
                        fontWeight: unread > 0 ? 600 : 400,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190,
                      }}>{convo.last_message_preview || 'No messages yet'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: C.sub }}>{formatLastTime(convo.last_message_at)}</span>
                      {unread > 0 && <UnreadBadge count={unread} />}
                    </div>
                  </button>
                  {i < filteredConvos.length - 1 && (
                    <div style={{ height: '0.5px', background: C.border, marginLeft: 72 }} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ borderTop: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0' }}>
            {[
              { label: 'Clients', icon: '👥', path: '/trainer/dashboard' },
              { label: 'Templates', icon: '📋', path: '/trainer/templates' },
              { label: 'Chat', icon: '💬', path: '/trainer/chat', active: true },
              { label: 'Profile', icon: '👤', path: '/trainer/settings' },
            ].map(tab => (
              <button
                key={tab.label}
                onClick={() => navigate(tab.path)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '4px 12px', background: 'none', border: 'none', cursor: 'pointer',
                  color: tab.active ? C.blue : C.gray, fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 18 }}>{tab.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CHAT WINDOW ═══ */}
      {activeConvo ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: "var(--bg-card)", overflow: 'hidden' }}>

          {/* Chat header */}
          <div style={{
            background: C.card, borderBottom: `1px solid ${C.border}`,
            flexShrink: 0, padding: '10px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setActiveConvo(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.blue, padding: '4px 0', display: 'flex', alignItems: 'center' }}
              >
                <IcoBk />
              </button>

              {/* center: avatar + name */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <AvaCircle name={clientName} size={36} radius={11} />
                  <span style={{
                    position: 'absolute', bottom: -1, right: -1,
                    width: 10, height: 10, borderRadius: '50%',
                    background: C.green, border: '1.5px solid var(--bg-card)',
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{clientName}</div>
                  <div style={{ fontSize: 11, color: C.green }}>Active today</div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/trainer/client/${activeConvo.client_id || activeConvo.client?.id}`)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, padding: 4 }}
              >
                <IcoMore />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', scrollbarWidth: 'none' }}>
            {messagesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
                <div style={{ width: 24, height: 24, border: `2px solid ${C.blue}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 60 }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>👋</p>
                <p style={{ color: C.sub, fontSize: 13 }}>No messages yet</p>
                <p style={{ color: C.gray, fontSize: 11, marginTop: 4 }}>Start the conversation!</p>
              </div>
            ) : (
              <>
                {/* Date separator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1, height: '0.5px', background: C.border }} />
                  <span style={{ fontSize: 11, color: C.sub, whiteSpace: 'nowrap' }}>
                    {new Date(messages[0]?.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <div style={{ flex: 1, height: '0.5px', background: C.border }} />
                </div>

                {messages.map((msg, i) => (
                  <div key={msg.id} style={{ marginTop: msgMarginTop(messages, i) }}>
                    <BubbleMsg msg={msg} showTime={showTimestamp(messages, i)} />
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input bar */}
          <div style={{
            flexShrink: 0, height: 64, background: C.card,
            borderTop: `0.5px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
          }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, display: 'flex', padding: 4 }}>
              <IcoClip />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Message ${clientName}…`}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 14, color: C.text, fontFamily: 'inherit',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: input.trim() ? "var(--text-primary)" : C.grayBg,
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s', flexShrink: 0,
              }}
            >
              {sending ? (
                <div style={{ width: 14, height: 14, border: '2px solid var(--bg-card)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <IcoSend />
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Desktop empty state */
        <div style={{ flex: 1, display: 'none', alignItems: 'center', justifyContent: 'center', background: C.bg }} className="chat-empty-desktop">
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>💬</p>
            <p style={{ color: C.sub, fontSize: 14 }}>Select a conversation</p>
          </div>
        </div>
      )}

      {/* Desktop layout override */}
      <style>{`
        @media (min-width: 768px) {
          .chat-list-panel {
            display: flex !important;
            width: 340px !important;
          }
          .chat-empty-desktop {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
