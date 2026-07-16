import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../utils/api';
import ChatWindow from '../ChatWindow';
import ContactPicker from '../../components/chat/ContactPicker';
import { ListSkeleton } from '../../components/loading/Loading';

function formatLastTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function StaffChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
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
    // StaffLayout renders a persistent 64px bottom nav below the Outlet,
    // so the chat window gets a fixed height instead of the full viewport.
    return (
      <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        <ChatWindow
          conversationId={activeConvo.id}
          otherPersonName={activeConvo.other_user?.full_name}
          onBack={() => setActiveConvo(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 88 }}>
      <div style={{
        padding: '56px 20px 20px', backgroundColor: 'var(--bg-card)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Messages</span>
        <button
          onClick={openPicker}
          style={{
            width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--bg-hover)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--text-primary)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '20px' }}>
          <ListSkeleton rows={6} />
        </div>
      ) : conversations.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '80px 32px' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No conversations yet</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>Message gym members, trainers, or your owner</p>
          <button
            onClick={openPicker}
            style={{
              padding: '12px 24px', backgroundColor: 'var(--success)', color: 'var(--bg-card)',
              border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
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
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  backgroundColor: 'var(--success-bg)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 14 }}>
                    {(name || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: unread > 0 ? 700 : 600, color: 'var(--text-primary)' }}>{name}</span>
                    {role && (
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{role}</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 12, color: unread > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: unread > 0 ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{convo.last_message_preview || 'No messages yet'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{formatLastTime(convo.last_message_at)}</span>
                  {unread > 0 && (
                    <span style={{
                      minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9,
                      backgroundColor: 'var(--success)', color: 'var(--bg-card)',
                      fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{unread > 9 ? '9+' : unread}</span>
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
    </div>
  );
}
