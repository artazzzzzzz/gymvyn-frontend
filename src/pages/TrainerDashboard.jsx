import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

export default function TrainerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const [profileRes, clientsRes] = await Promise.all([
        apiFetch(`/api/trainer/profile/${user.id}`),
        apiFetch(`/api/trainer/clients/${user.id}`)
      ]);
      setProfile(profileRes);
      setClients(clientsRes);
    } catch (err) {
      console.error('Load dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (profile?.invite_code) {
      navigator.clipboard.writeText(profile.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await apiFetch('/api/trainer/invite-client', {
        method: 'POST',
        body: JSON.stringify({
          trainerId: user.id,
          clientEmail: inviteEmail.trim(),
          gymId: profile?.gym_id || null
        })
      });
      setInviteEmail('');
      setShowInvite(false);
      loadData();
    } catch (err) {
      alert('Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const activeClients = clients.filter(c => c.status === 'active');
  const pendingClients = clients.filter(c => c.status === 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-zinc-400 text-sm">Welcome back</p>
            <h1 className="text-2xl font-bold">{user?.full_name || 'Coach'}</h1>
          </div>
          <button
            onClick={() => navigate('/trainer/settings')}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Invite code banner */}
        {profile?.invite_code && (
          <button
            onClick={copyInviteCode}
            className="mt-4 w-full flex items-center justify-between px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🔗</span>
              <div className="text-left">
                <p className="text-emerald-400 text-xs font-medium">Your invite code</p>
                <p className="text-emerald-300 font-mono font-bold text-lg tracking-wider">
                  {profile.invite_code}
                </p>
              </div>
            </div>
            <span className="text-emerald-400 text-sm">
              {copied ? '✓ Copied!' : 'Copy'}
            </span>
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <p className="text-2xl font-bold text-emerald-400">{activeClients.length}</p>
            <p className="text-xs text-zinc-400 mt-1">Active clients</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <p className="text-2xl font-bold text-amber-400">{pendingClients.length}</p>
            <p className="text-xs text-zinc-400 mt-1">Pending</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {profile?.specializations?.length || 0}
            </p>
            <p className="text-xs text-zinc-400 mt-1">Specialties</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 mb-6">
        <div className="flex gap-3">
          <button
            onClick={() => setShowInvite(true)}
            className="flex-1 py-3 bg-emerald-500 rounded-xl font-semibold text-sm"
          >
            + Invite Client
          </button>
          <button
            onClick={() => navigate('/trainer/templates')}
            className="flex-1 py-3 bg-zinc-900 border border-zinc-800 rounded-xl font-medium text-sm"
          >
            Plan Templates
          </button>
        </div>
      </div>

      {/* Client list */}
      <div className="px-5">
        <h2 className="text-lg font-semibold mb-3">Your clients</h2>

        {activeClients.length === 0 && pendingClients.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-zinc-400 mb-1">No clients yet</p>
            <p className="text-zinc-500 text-sm">
              Share your invite code or send invites to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pending invites */}
            {pendingClients.map(rel => (
              <div
                key={rel.id}
                className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                    <span className="text-amber-400 text-sm">⏳</span>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-300">
                      {rel.invite_email || rel.invite_phone || 'Pending invite'}
                    </p>
                    <p className="text-xs text-amber-400">Pending</p>
                  </div>
                </div>
                <span className="text-xs text-zinc-500 font-mono">{rel.invite_code}</span>
              </div>
            ))}

            {/* Active clients */}
            {activeClients.map(rel => (
              <button
                key={rel.id}
                onClick={() => navigate(`/trainer/client/${rel.client_id}`)}
                className="w-full bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center justify-between text-left hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <span className="text-emerald-400 font-bold text-sm">
                      {(rel.client?.full_name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{rel.client?.full_name || 'Client'}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                      <span>{rel.client?.goal || '—'}</span>
                      <span>·</span>
                      <span>{rel.stats?.weeklyWorkouts || 0} workouts/wk</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {rel.stats?.activePlans > 0 ? (
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                      {rel.stats.activePlans} plan{rel.stats.activePlans > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">No plan</span>
                  )}
                  {rel.stats?.lastWorkout && (
                    <p className="text-[10px] text-zinc-600 mt-1">
                      Last: {new Date(rel.stats.lastWorkout).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-zinc-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Invite a client</h3>
              <button onClick={() => setShowInvite(false)} className="text-zinc-400 text-xl">×</button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-2">Client email</label>
              <input
                type="email"
                placeholder="client@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              Or share your invite code: <span className="text-emerald-400 font-mono font-bold">{profile?.invite_code}</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 py-3 bg-zinc-800 rounded-xl font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={sendInvite}
                disabled={!inviteEmail.trim() || inviting}
                className="flex-1 py-3 bg-emerald-500 rounded-xl font-semibold text-sm disabled:opacity-40"
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800">
        <div className="flex justify-around py-3">
          {[
            { label: 'Clients', icon: '👥', path: '/trainer/dashboard', active: true },
            { label: 'Templates', icon: '📋', path: '/trainer/templates' },
            { label: 'Chat', icon: '💬', path: '/trainer/chat' },
            { label: 'Profile', icon: '👤', path: '/trainer/settings' }
          ].map(tab => (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-3 ${
                tab.active ? 'text-emerald-400' : 'text-zinc-500'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
