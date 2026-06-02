import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import ChatWindow from './ChatWindow';
import { supabase } from '../utils/supabase';

export default function TrainerChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedConvoId = searchParams.get('convoId');

  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadConversations();
    subscribeConversations();
  }, [user?.id]);

  useEffect(() => {
    if (preselectedConvoId && conversations.length > 0) {
      const found = conversations.find(c => c.id === preselectedConvoId);
      if (found) setActiveConvo(found);
    }
  }, [preselectedConvoId, conversations]);

  const loadConversations = async () => {
    try {
      const data = await apiFetch(`/api/trainer/conversations/${user.id}`);
      setConversations(data || []);
      // Auto-open first if on desktop or preselected
      if (data?.length > 0 && !activeConvo) {
        if (preselectedConvoId) {
          const found = data.find(c => c.id === preselectedConvoId);
          if (found) setActiveConvo(found);
        }
      }
    } catch (err) {
      console.error('Load conversations error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to conversation updates (new messages = preview update)
  const subscribeConversations = () => {
    supabase
      .channel('trainer-convos')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations'
      }, () => {
        loadConversations();
      })
      .subscribe();
  };

  const getOtherPersonName = (convo) => {
    if (!convo) return '';
    // Trainer sees client name
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Mobile: show list OR chat window */}
      {/* Desktop (md+): show both side by side */}

      <div className="flex flex-1 h-screen">
        {/* Conversation list — always visible on md+, hidden on mobile when chat open */}
        <div className={`${activeConvo ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 md:border-r border-zinc-800 flex-shrink-0`}>
          {/* Header */}
          <div className="px-5 pt-12 pb-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <button onClick={() => navigate('/trainer/dashboard')} className="text-zinc-400 text-sm mb-1 block">
                  ← Dashboard
                </button>
                <h1 className="text-xl font-bold">Messages</h1>
              </div>
              {totalUnread > 0 && (
                <span className="w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl mb-3">💬</p>
                <p className="text-zinc-400 text-sm">No conversations yet</p>
                <p className="text-zinc-600 text-xs mt-1">
                  Conversations start automatically when a client connects
                </p>
              </div>
            ) : (
              conversations.map(convo => {
                const name = getOtherPersonName(convo);
                const unread = convo.trainer_unread || 0;
                const isActive = activeConvo?.id === convo.id;

                return (
                  <button
                    key={convo.id}
                    onClick={() => setActiveConvo(convo)}
                    className={`w-full flex items-center gap-3 px-5 py-4 border-b border-zinc-800/50 text-left transition-colors ${
                      isActive ? 'bg-zinc-800' : 'hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0 relative">
                      <span className="text-emerald-400 font-bold text-sm">{name[0]?.toUpperCase()}</span>
                      {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${unread > 0 ? 'text-white' : 'text-zinc-300'}`}>
                          {name}
                        </p>
                        <span className="text-[10px] text-zinc-600 flex-shrink-0 ml-2">
                          {formatLastTime(convo.last_message_at)}
                        </span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-zinc-300 font-medium' : 'text-zinc-500'}`}>
                        {convo.last_message_preview || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom nav */}
          <div className="border-t border-zinc-800">
            <div className="flex justify-around py-3">
              {[
                { label: 'Clients', icon: '👥', path: '/trainer/dashboard' },
                { label: 'Templates', icon: '📋', path: '/trainer/templates' },
                { label: 'Chat', icon: '💬', path: '/trainer/chat', active: true },
                { label: 'Profile', icon: '👤', path: '/trainer/settings' }
              ].map(tab => (
                <button
                  key={tab.label}
                  onClick={() => navigate(tab.path)}
                  className={`flex flex-col items-center gap-1 px-3 ${tab.active ? 'text-emerald-400' : 'text-zinc-500'}`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat window */}
        {activeConvo ? (
          <div className="flex-1 flex flex-col">
            <ChatWindow
              conversationId={activeConvo.id}
              otherPersonName={getOtherPersonName(activeConvo)}
              onBack={() => setActiveConvo(null)}
            />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-zinc-950">
            <div className="text-center">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-zinc-400">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
