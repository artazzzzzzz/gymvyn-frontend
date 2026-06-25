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
      if (!trainerInfo?.trainer_id) {
        setLoading(false);
        return;
      }

      setTrainerName(trainerInfo.trainer?.full_name || 'Your Trainer');

      // Get their conversation
      const convos = await apiFetch(`/api/trainer/conversations/${user.id}`);
      const convo = (convos || []).find(
        c => c.trainer_id === trainerInfo.trainer_id
      );
      setConversation(convo || null);
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
        <p className="text-4xl mb-4">💬</p>
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
