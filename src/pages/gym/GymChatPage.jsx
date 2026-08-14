import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../utils/api';
import ChatWindow from '../ChatWindow';
import ContactPicker from '../../components/chat/ContactPicker';
import GymBottomNav from '../../components/GymBottomNav';
import MoreSheet from '../../components/MoreSheet';

function formatLastTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function GymChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  // Mirrors ClientChatPage's ?conversationId=&name= deep-link pattern — a
  // caller (e.g. "Send Message" on a member's detail page) that already did
  // POST /api/chat/start lands directly in that conversation instead of the
  // conversation list.
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(() => {
    const params = new URLSearchParams(location.search);
    const conversationId = params.get('conversationId');
    if (!conversationId) return null;
    return { id: conversationId, other_user: { full_name: params.get('name') || 'Chat' } };
  });
  const [loading, setLoading] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [starting, setStarting] = useState(false);

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

  const loadConversations = async () => {
    try {
      const data = await apiFetch('/api/chat/conversations');
      setConversations(data || []);
    } catch (err) {
      console.error('Load conversations error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setContactsLoading(true);
    try {
      const data = await apiFetch('/api/chat/contacts');
      setContacts(data || []);
    } catch (err) {
      console.error('Load contacts error:', err);
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  const startConversationWith = async (contact) => {
    if (starting) return;
    setStarting(true);
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
      setStarting(false);
    }
  };

  if (activeConvo) {
    return (
      <div className="h-screen flex flex-col">
        <ChatWindow
          conversationId={activeConvo.id}
          otherPersonName={activeConvo.other_user?.full_name}
          onBack={() => setActiveConvo(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      <div className="px-4 pt-14 pb-4 bg-[var(--bg-card)] flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Messages</h1>
        <button
          onClick={openPicker}
          className="w-9 h-9 rounded-full bg-[var(--bg-pill)] flex items-center justify-center text-[var(--text-primary)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
          <div className="mb-4 flex justify-center text-[var(--text-tertiary)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No conversations yet</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Message your staff, trainers, or members
          </p>
          <button
            onClick={openPicker}
            className="px-6 py-3 bg-[var(--success)] rounded-xl font-semibold text-sm"
          >
            New Conversation
          </button>
        </div>
      ) : (
        <div>
          {conversations.map((convo) => {
            const name = convo.other_user?.full_name || 'Unknown';
            const role = convo.other_user?.role;
            const unread = convo.unread || 0;
            return (
              <button
                key={convo.id}
                onClick={() => setActiveConvo(convo)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)]"
              >
                <div className="w-11 h-11 rounded-2xl bg-[var(--success-bg)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[var(--success)] font-bold text-sm">
                    {(name || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${unread > 0 ? 'font-bold' : 'font-semibold'} text-[var(--text-primary)] truncate`}>{name}</p>
                    {role && (
                      <span className="text-[10px] text-[var(--text-tertiary)] capitalize flex-shrink-0">{role}</span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${unread > 0 ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                    {convo.last_message_preview || 'No messages yet'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[11px] text-[var(--text-tertiary)]">{formatLastTime(convo.last_message_at)}</span>
                  {unread > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--success)] text-[var(--bg-card)] text-[10px] font-bold flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {pickerOpen && (
        <ContactPicker
          contacts={contacts}
          loading={contactsLoading}
          selecting={starting}
          onSelect={startConversationWith}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <GymBottomNav onMorePress={() => setMoreOpen(true)} />
      <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}
