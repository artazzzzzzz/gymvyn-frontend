import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import ChatWindow from './ChatWindow';

export default function ClientChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [trainerName, setTrainerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadConversation();
  }, [user?.id]);

  const loadConversation = async () => {
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!conversation) {
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
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatWindow
        conversationId={conversation.id}
        otherPersonName={trainerName}
        onBack={() => navigate('/my-trainer')}
      />
    </div>
  );
}
