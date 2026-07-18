import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import ChatWindow from './ChatWindow';
import { ListSkeleton, SkeletonBlock } from '../components/loading/Loading';

export default function ClientChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedConversationId = searchParams.get('conversationId');
  const selectedConversationName = searchParams.get('name') || 'Chat';
  const [conversation, setConversation] = useState(null);
  const [trainerName, setTrainerName] = useState('');
  const [loading, setLoading] = useState(!selectedConversationId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState(false);
  const [starting, setStarting] = useState(false);

  async function loadConversation() {
    try {
      // Get client's trainer info
      const trainerInfo = await apiFetch(`/api/trainer/my-trainer/${user.id}`);
      if (!trainerInfo?.trainer?.id) {
        setLoading(false);
        return;
      }

      setTrainerName(trainerInfo.trainer?.full_name || 'Your Trainer');

      // Get-or-create the conversation. This is permission-checked server
      // side (can_message) — it will only succeed while the trainer_clients
      // link is active.
      const { conversationId } = await apiFetch('/api/chat/start', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: trainerInfo.trainer.id }),
      });
      setConversation(conversationId ? { id: conversationId } : null);
    } catch (err) {
      console.error('Load client chat error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user?.id || selectedConversationId) return;
    void loadConversation();
  }, [user?.id, selectedConversationId]);

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
      setConversation(conversationId ? { id: conversationId } : null);
      setTrainerName(contact.full_name || 'Chat');
      setPickerOpen(false);
    } catch (err) {
      console.error('Start conversation error:', err);
    } finally {
      setStarting(false);
    }
  };

  const ContactPicker = () => (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={() => setPickerOpen(false)}
    >
      <div
        className="w-full sm:w-96 max-h-[70vh] bg-[var(--bg-primary)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="font-semibold text-sm text-[var(--text-primary)]">New Conversation</span>
          <button
            onClick={() => setPickerOpen(false)}
            className="text-[var(--text-tertiary)] text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contactsLoading ? (
            <div className="p-4">
              <ListSkeleton rows={4} />
            </div>
          ) : contactsError ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm text-[var(--text-primary)] mb-3">Couldn't load contacts, try again</p>
              <button
                onClick={openPicker}
                className="px-4 py-1.5 rounded-full text-xs font-semibold border border-[var(--border)] text-[var(--text-primary)]"
              >
                Retry
              </button>
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-center text-sm text-[var(--text-secondary)] py-10">No contacts available</p>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => startConversationWith(c)}
                disabled={starting}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--success-bg)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[var(--success)] font-bold text-sm">
                    {(c.full_name || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.full_name}</p>
                  <p className="text-xs text-[var(--text-tertiary)] capitalize">{c.role}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-full max-w-md px-5">
          <SkeletonBlock height={48} width="100%" radius={14} style={{ marginBottom: 16 }} />
          <ListSkeleton rows={4} />
        </div>
      </div>
    );
  }

  const displayedConversation = selectedConversationId ? { id: selectedConversationId } : conversation;
  const displayedName = selectedConversationId ? selectedConversationName : trainerName;

  if (!displayedConversation) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-4 flex justify-center text-[var(--text-tertiary)]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h2 className="text-lg font-semibold mb-2">No conversation yet</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6">
          Connect with a trainer to start messaging
        </p>
        <button
          onClick={() => navigate('/my-trainer')}
          className="px-6 py-3 bg-[var(--success)] rounded-xl font-semibold text-sm"
        >
          Find a Trainer
        </button>
        <button
          onClick={openPicker}
          className="mt-4 text-sm text-[var(--text-secondary)] underline"
        >
          New Conversation
        </button>
        {pickerOpen && <ContactPicker />}
      </div>
    );
  }

  return (
    // ConsumerLayout renders a persistent 64px fixed BottomNav below the
    // Outlet, so the chat window gets a fixed height instead of the full
    // viewport (h-screen pushes the input bar underneath the nav).
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <ChatWindow
        conversationId={displayedConversation.id}
        otherPersonName={displayedName}
        onBack={() => navigate('/my-trainer')}
        headerRight={(
          <button
            onClick={openPicker}
            className="w-8 h-8 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-primary)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      />
      {pickerOpen && <ContactPicker />}
    </div>
  );
}
