import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

export default function MyTrainer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trainerInfo, setTrainerInfo] = useState(null);
  const [assignedPlans, setAssignedPlans] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [justConnected, setJustConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadTrainerData();
  }, [user?.id]);

  const loadTrainerData = async () => {
    try {
      const info = await apiFetch(`/api/trainer/my-trainer/${user.id}`);
      setTrainerInfo(info);

      if (info?.trainer_id) {
        const [plans, convos] = await Promise.all([
          apiFetch(`/api/trainer/assigned-plans/${user.id}?status=active`),
          apiFetch(`/api/trainer/conversations/${user.id}`)
        ]);
        setAssignedPlans(plans || []);
        setConversations(convos || []);
      }
    } catch (err) {
      console.error('Load trainer data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await apiFetch('/api/trainer/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ clientId: user.id, inviteCode: joinCode.trim() })
      });
      if (res.success) {
        setShowJoin(false);
        setJoinCode('');
        setJustConnected(true);
        loadTrainerData();
      }
    } catch (err) {
      alert(err.message || 'Invalid or expired code');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── No trainer linked ──────────────────────────────────
  if (!trainerInfo) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="px-5 pt-12 pb-6">
          <h1 className="text-2xl font-bold">My Trainer</h1>
          <p className="text-zinc-400 text-sm mt-1">Connect with your personal trainer</p>
        </div>

        <div className="px-5 space-y-4">
          {/* Hero empty state */}
          <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏋️‍♂️</span>
            </div>
            <h2 className="text-lg font-semibold mb-2">No trainer connected yet</h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Get a personal trainer on FitForge for custom workout plans, diet guidance, and direct coaching.
            </p>

            {!showJoin ? (
              <button
                onClick={() => setShowJoin(true)}
                className="w-full py-3.5 bg-emerald-500 rounded-xl font-semibold"
              >
                Enter Invite Code
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. AB3F7K"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  autoFocus
                  className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center text-2xl font-mono tracking-[0.3em] placeholder:text-zinc-600 placeholder:text-base placeholder:tracking-normal focus:border-emerald-500 focus:outline-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowJoin(false); setJoinCode(''); }}
                    className="flex-1 py-3 bg-zinc-800 rounded-xl font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoin}
                    disabled={joinCode.length < 4 || joining}
                    className="flex-1 py-3 bg-emerald-500 rounded-xl font-semibold text-sm disabled:opacity-40"
                  >
                    {joining ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* What you get section — feature cards */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <p className="text-sm font-medium text-zinc-300">What you get with a trainer</p>
            </div>
            {[
              { icon: '📋', title: 'Custom workout plans', desc: 'Tailored programs built for your goals' },
              { icon: '🥗', title: 'Personalised diet plans', desc: 'Macros and meals designed for you' },
              { icon: '💬', title: 'Direct messaging', desc: 'Ask questions, get feedback anytime' },
              { icon: '📈', title: 'Progress tracking', desc: 'Your trainer sees your logs in real time' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-zinc-800 last:border-0">
                <span className="text-xl mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pb-8">
            <p className="text-zinc-600 text-xs">
              Are you a trainer?{' '}
              <button onClick={() => navigate('/become-trainer')} className="text-emerald-400">
                Set up your profile →
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Trainer linked — full dashboard ───────────────────
  const trainerName = trainerInfo.trainer?.full_name || 'Your Trainer';
  const trainerProfile = trainerInfo.trainer_profile;
  const workoutPlan = assignedPlans.find(p => p.type === 'workout');
  const dietPlan = assignedPlans.find(p => p.type === 'diet');
  const conversation = conversations.find(
    c => c.trainer_id === trainerInfo.trainer_id
  );
  const unreadCount = conversation?.client_unread || 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-5">
        <p className="text-zinc-400 text-sm mb-1">Your coach</p>
        <h1 className="text-2xl font-bold">{trainerName}</h1>
      </div>

      <div className="px-5 space-y-3">

        {/* Just connected banner */}
        {justConnected && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <div>
              <p className="text-emerald-400 text-sm font-medium">Connected to {trainerName}!</p>
              <p className="text-zinc-400 text-xs">Your trainer will assign your first plan soon.</p>
            </div>
          </div>
        )}

        {/* Trainer profile card */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              {trainerProfile?.profile_photo_url ? (
                <img src={trainerProfile.profile_photo_url} className="w-full h-full rounded-full object-cover" alt={trainerName} />
              ) : (
                <span className="text-emerald-400 font-bold text-xl">{trainerName[0]}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{trainerName}</p>
              <p className="text-zinc-400 text-sm">
                {trainerProfile?.experience_years
                  ? `${trainerProfile.experience_years} yrs experience`
                  : 'Personal Trainer'}
                {trainerProfile?.city ? ` · ${trainerProfile.city}` : ''}
              </p>
              {trainerProfile?.specializations?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {trainerProfile.specializations.slice(0, 3).map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {trainerProfile?.bio && (
            <div className="px-5 pb-4 border-t border-zinc-800 pt-3">
              <p className="text-sm text-zinc-400 leading-relaxed">{trainerProfile.bio}</p>
            </div>
          )}
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-2 gap-3">

          {/* Workout plan card */}
          <button
            onClick={() => workoutPlan ? navigate('/workout') : null}
            className={`rounded-2xl border p-4 text-left transition-all ${
              workoutPlan
                ? 'bg-blue-500/10 border-blue-500/20 active:scale-95'
                : 'bg-zinc-900 border-zinc-800 opacity-60'
            }`}
          >
            <span className="text-2xl block mb-3">🏋️</span>
            <p className="font-semibold text-sm">Workout Plan</p>
            {workoutPlan ? (
              <>
                <p className="text-xs text-blue-400 mt-1 truncate">{workoutPlan.name}</p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {workoutPlan.plan_data?.days?.length || 0} days
                  {workoutPlan.starts_at
                    ? ` · Since ${new Date(workoutPlan.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                    : ''}
                </p>
              </>
            ) : (
              <p className="text-xs text-zinc-500 mt-1">Not assigned yet</p>
            )}
          </button>

          {/* Diet plan card */}
          <button
            onClick={() => dietPlan ? navigate('/diet') : null}
            className={`rounded-2xl border p-4 text-left transition-all ${
              dietPlan
                ? 'bg-green-500/10 border-green-500/20 active:scale-95'
                : 'bg-zinc-900 border-zinc-800 opacity-60'
            }`}
          >
            <span className="text-2xl block mb-3">🥗</span>
            <p className="font-semibold text-sm">Diet Plan</p>
            {dietPlan ? (
              <>
                <p className="text-xs text-green-400 mt-1 truncate">{dietPlan.name}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Tap to view</p>
              </>
            ) : (
              <p className="text-xs text-zinc-500 mt-1">Not assigned yet</p>
            )}
          </button>

          {/* Chat card */}
          <button
            onClick={() => navigate('/my-trainer/chat')}
            className="relative rounded-2xl border bg-amber-500/10 border-amber-500/20 p-4 text-left active:scale-95 transition-all"
          >
            {unreadCount > 0 && (
              <span className="absolute top-3 right-3 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            <span className="text-2xl block mb-3">💬</span>
            <p className="font-semibold text-sm">Chat</p>
            {conversation?.last_message_preview ? (
              <p className="text-xs text-zinc-500 mt-1 truncate">{conversation.last_message_preview}</p>
            ) : (
              <p className="text-xs text-zinc-500 mt-1">Message your trainer</p>
            )}
          </button>

          {/* Progress card */}
          <button
            onClick={() => navigate('/progress')}
            className="rounded-2xl border bg-purple-500/10 border-purple-500/20 p-4 text-left active:scale-95 transition-all"
          >
            <span className="text-2xl block mb-3">📈</span>
            <p className="font-semibold text-sm">Progress</p>
            <p className="text-xs text-zinc-500 mt-1">Shared with trainer</p>
          </button>
        </div>

        {/* Assigned workout plan detail */}
        {workoutPlan && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <p className="font-medium text-sm">Your workout plan</p>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Active</span>
            </div>
            <div className="px-5 py-4">
              <p className="font-semibold">{workoutPlan.name}</p>
              {workoutPlan.notes && (
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  📝 {workoutPlan.notes}
                </p>
              )}
              {workoutPlan.plan_data?.days?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {workoutPlan.plan_data.days.map((day, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <p className="text-sm text-zinc-300">{day.name || `Day ${day.day}`}</p>
                      <p className="text-xs text-zinc-500">
                        {day.exercises?.length || 0} exercises
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate('/workout')}
                className="w-full mt-4 py-3 bg-emerald-500 rounded-xl font-semibold text-sm"
              >
                Start Workout →
              </button>
            </div>
          </div>
        )}

        {/* Assigned diet plan detail */}
        {dietPlan && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <p className="font-medium text-sm">Your diet plan</p>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">Active</span>
            </div>
            <div className="px-5 py-4">
              <p className="font-semibold">{dietPlan.name}</p>
              {dietPlan.notes && (
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">📝 {dietPlan.notes}</p>
              )}
              <button
                onClick={() => navigate('/diet')}
                className="w-full mt-4 py-3 bg-green-500/80 rounded-xl font-semibold text-sm"
              >
                View Diet →
              </button>
            </div>
          </div>
        )}

        {/* Nothing assigned yet nudge */}
        {!workoutPlan && !dietPlan && (
          <div className="bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800 p-5 text-center">
            <p className="text-zinc-400 text-sm">Your trainer hasn't assigned any plans yet.</p>
            <p className="text-zinc-500 text-xs mt-1">Send them a message to get started.</p>
            <button
              onClick={() => navigate('/my-trainer/chat')}
              className="mt-3 px-5 py-2.5 bg-amber-500/15 border border-amber-500/20 rounded-xl text-amber-400 text-sm font-medium"
            >
              💬 Message trainer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
