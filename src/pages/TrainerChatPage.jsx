import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import ChatWindow from './ChatWindow';
import { ButtonSpinner, ListSkeleton, RefreshIndicator, SkeletonBlock } from '../components/loading/Loading';

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
const IcoPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
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
function BubbleMsg({ msg, showTime, currentUserId }) {
  const isT = msg.sender_id === currentUserId;
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
  const conversationsRef = useRef([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  /* ── new UI state ── */
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  /* ── new conversation contact picker ── */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState(false);
  const [startingContact, setStartingContact] = useState(false);

  /* ── polling logic (preserved) ── */
  useEffect(() => {
    if (!user?.id) return;
    loadConversations();
    const interval = setInterval(loadConversations, 5000);

    // A push notification for any conversation (see NativePushBridge)
    // triggers an immediate list reload instead of waiting for the next
    // poll tick — polling above stays as the fallback when push isn't
    // available/denied.
    function onPushReceived(e) {
      if (e.detail?.data?.type === 'chat_message') loadConversations();
    }
    window.addEventListener('gv:push-received', onPushReceived);

    return () => {
      clearInterval(interval);
      window.removeEventListener('gv:push-received', onPushReceived);
    };
  }, [user?.id]);

  useEffect(() => {
    if (preselectedConvoId && conversations.length > 0) {
      const found = conversations.find(c => c.id === preselectedConvoId);
      if (found) setActiveConvo(found);
    }
  }, [preselectedConvoId, conversations]);

  /* load messages when convo opens — GET /api/chat/messages/:id also
     resets this user's unread counter server-side */
  useEffect(() => {
    if (!activeConvo) return;
    loadMessages(activeConvo.id);
  }, [activeConvo?.id]);

  /* auto-scroll on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── API helpers (migrated to /api/chat/*, the schema-correct,
     participant-checked backend — /api/trainer/conversations|messages/*
     no longer exist server-side) ── */
  const loadConversations = async () => {
    try {
      const data = await apiFetch('/api/chat/conversations');
      const nextConversations = data || [];
      conversationsRef.current = nextConversations;
      setConversations(nextConversations);
      setFetchError(null);
      if (data?.length > 0 && !activeConvo && preselectedConvoId) {
        const found = data.find(c => c.id === preselectedConvoId);
        if (found) setActiveConvo(found);
      }
    } catch (err) {
      console.error('Load conversations error:', err);
      // Keep active conversations visible when a background poll fails.
      if (conversationsRef.current.length === 0) setFetchError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convoId) => {
    setMessagesLoading(true);
    try {
      const data = await apiFetch(`/api/chat/messages/${convoId}`);
      setMessages(data || []);
    } catch (err) {
      console.error('Load messages error:', err);
      if (messages.length === 0) setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConvo || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    /* optimistic */
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      await apiFetch('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({ conversationId: activeConvo.id, content: text }),
      });
      await loadMessages(activeConvo.id);
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setContactsLoading(true);
    setContactsError(false);
    try {
      const data = await apiFetch('/api/chat/contacts');
      setContacts(data || []);
    } catch (err) {
      console.error('Load contacts error:', err);
      setContacts([]);
      setContactsError(true);
    } finally {
      setContactsLoading(false);
    }
  };

  const startConversationWith = async (contact) => {
    if (startingContact) return;
    setStartingContact(true);
    try {
      // POST /api/chat/start get-or-creates: a repeat call with the same
      // targetUserId returns the same conversationId, so this never
      // creates a duplicate conversation.
      const { conversationId } = await apiFetch('/api/chat/start', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: contact.id }),
      });
      const data = await apiFetch('/api/chat/conversations');
      setConversations(data || []);
      const found = (data || []).find(c => c.id === conversationId);
      setActiveConvo(found || {
        id: conversationId,
        other_user: { id: contact.id, full_name: contact.full_name, role: contact.role },
        unread: 0,
      });
      setPickerOpen(false);
    } catch (err) {
      console.error('Start conversation error:', err);
    } finally {
      setStartingContact(false);
    }
  };

  /* ── preserved helpers ── */
  const getOtherPersonName = (convo) => {
    if (!convo) return '';
    return convo.other_user?.full_name || 'Client';
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

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  /* ── filter + search ── */
  const FILTER_LABELS = ['All', `Unread (${totalUnread})`, 'Clients', 'Needs reply'];
  const filteredConvos = conversations.filter(c => {
    const name = getOtherPersonName(c).toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filter === `Unread (${totalUnread})` && !(c.unread > 0)) return false;
    return true;
  });

  /* ── message grouping helpers (messages have no sender_type/is_system in
     the real schema, so grouping is purely by sender_id) ── */
  const showTimestamp = (msgs, i) => {
    if (!msgs[i]) return false;
    const next = msgs[i + 1];
    return !next || next.sender_id !== msgs[i].sender_id;
  };
  const msgMarginTop = (msgs, i) => {
    if (i === 0) return 0;
    const prev = msgs[i - 1];
    const cur = msgs[i];
    return prev.sender_id === cur.sender_id ? 6 : 16;
  };

  /* ── loading ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, padding: 16 }}>
        <SkeletonBlock height={24} width="42%" style={{ marginTop: 20, marginBottom: 12 }} />
        <SkeletonBlock height={36} width="100%" radius={10} style={{ marginBottom: 10 }} />
        <ListSkeleton rows={6} />
      </div>
    );
  }

  const clientName = getOtherPersonName(activeConvo);

  // TrainerLayout owns a fixed 64px navigation bar. Keeping the shared chat
  // inside the remaining dynamic viewport makes the composer visible above it
  // and lets 100dvh shrink correctly when a mobile keyboard opens.
  if (activeConvo) {
    return (
      <div style={{ height: 'calc(100dvh - 64px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ChatWindow
          conversationId={activeConvo.id}
          otherPersonName={clientName}
          onBack={() => setActiveConvo(null)}
          headerRight={(
            <button
              onClick={() => navigate(`/trainer/client/${activeConvo.other_user?.id}`)}
              aria-label={`Open ${clientName}'s profile`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, padding: 4 }}
            >
              <IcoMore />
            </button>
          )}
        />
      </div>
    );
  }

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={openPicker}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: C.grayBg,
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: C.text,
                }}
              >
                <IcoPlus />
              </button>
              {totalUnread > 0 && (
                <span style={{
                  minWidth: 24, height: 24, borderRadius: 12, background: C.red, color: "var(--bg-card)",
                  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 6px',
                }}>{totalUnread}</span>
              )}
            </div>
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
          {fetchError && conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 32px' }}>
              <div style={{ fontSize: 14, color: 'var(--error)', marginBottom: 16, fontWeight: 500 }}>{fetchError}</div>
              <button onClick={loadConversations} style={{ height: 40, padding: '0 20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>Try again</button>
            </div>
          ) : filteredConvos.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: C.sub }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <p style={{ color: C.sub, fontSize: 13 }}>No conversations yet</p>
              <p style={{ color: C.gray, fontSize: 11, marginTop: 4 }}>Conversations start when a client connects</p>
            </div>
          ) : (
            filteredConvos.map((convo, i) => {
              const name = getOtherPersonName(convo);
              const unread = convo.unread || 0;
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
              { label: 'Clients',   path: '/trainer/dashboard',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { label: 'Templates', path: '/trainer/templates',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
              { label: 'Chat',      path: '/trainer/chat', active: true, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
              { label: 'Profile',   path: '/trainer/settings',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
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
                <span>{tab.icon}</span>
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
                onClick={() => navigate(`/trainer/client/${activeConvo.other_user?.id}`)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, padding: 4 }}
              >
                <IcoMore />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', scrollbarWidth: 'none' }}>
            {messagesLoading && messages.length === 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <SkeletonBlock height={38} width="68%" radius={18} />
                <SkeletonBlock height={38} width="52%" radius={18} style={{ justifySelf: 'end' }} />
                <SkeletonBlock height={56} width="74%" radius={18} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 60 }}>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: C.sub }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <p style={{ color: C.sub, fontSize: 13 }}>No messages yet</p>
                <p style={{ color: C.gray, fontSize: 11, marginTop: 4 }}>Start the conversation!</p>
              </div>
            ) : (
              <>
                <RefreshIndicator refreshing={messagesLoading} />
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
                    <BubbleMsg msg={msg} showTime={showTimestamp(messages, i)} currentUserId={user.id} />
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
                <ButtonSpinner size={14} />
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
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: C.sub }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
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

      {/* ═══ NEW CONVERSATION PICKER ═══ */}
      {pickerOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setPickerOpen(false)}
        >
          <div
            style={{ width: '100%', maxWidth: 420, maxHeight: '70vh', background: C.card, borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>New Conversation</span>
              <button
                onClick={() => setPickerOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: 20, lineHeight: 1, padding: 0 }}
              >×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {contactsLoading ? (
                <div style={{ padding: 16 }}>
                  <ListSkeleton rows={4} />
                </div>
              ) : contactsError ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <p style={{ color: C.text, fontSize: 13, marginBottom: 12 }}>Couldn't load contacts, try again</p>
                  <button
                    onClick={openPicker}
                    style={{
                      padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${C.border}`, background: C.card, color: C.text,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >Retry</button>
                </div>
              ) : contacts.length === 0 ? (
                <p style={{ textAlign: 'center', color: C.sub, fontSize: 13, padding: '32px 0' }}>No contacts available</p>
              ) : (
                contacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => startConversationWith(c)}
                    disabled={startingContact}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'inherit', opacity: startingContact ? 0.6 : 1,
                    }}
                  >
                    <AvaCircle name={c.full_name} size={36} radius={11} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.full_name}</div>
                      <div style={{ fontSize: 11, color: C.sub, textTransform: 'capitalize' }}>{c.role}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
