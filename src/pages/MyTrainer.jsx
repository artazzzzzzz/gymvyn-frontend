import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

export default function MyTrainer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trainerInfo, setTrainerInfo]     = useState(null);
  const [assignedPlans, setAssignedPlans] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showJoin, setShowJoin]           = useState(false);
  const [joinCode, setJoinCode]           = useState('');
  const [joining, setJoining]             = useState(false);
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

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0F6E56] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── No trainer linked ────────────────────────────────────────────────────────
  if (!trainerInfo) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="px-5 pt-12 pb-6">
          <h1 className="text-2xl font-bold">My Trainer</h1>
          <p className="text-zinc-400 text-sm mt-1">Connect with your personal trainer</p>
        </div>

        <div className="px-5 space-y-4">
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
                  className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center text-2xl font-mono tracking-[0.3em] placeholder:text-zinc-600 placeholder:text-base placeholder:tracking-normal focus:border-emerald-500 focus:outline-none uppercase"
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

  // ── Trainer linked — derive display values ───────────────────────────────────
  const trainerName    = trainerInfo.trainer?.full_name || 'Rohan Patel';
  const trainerProfile = trainerInfo.trainer_profile;
  const trainerInitials = trainerName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const trainerTitle   = trainerProfile?.bio
    ? 'Personal Trainer'
    : 'Certified Strength Coach';
  const experienceYrs  = trainerProfile?.experience_years
    ? `${trainerProfile.experience_years} yrs`
    : '6 yrs';
  const workoutPlan    = assignedPlans.find(p => p.type === 'workout');
  const dietPlan       = assignedPlans.find(p => p.type === 'diet');
  const conversation   = conversations.find(c => c.trainer_id === trainerInfo.trainer_id);
  const unreadCount    = conversation?.client_unread || 0;
  const lastMsg        = conversation?.last_message_preview || 'Great session yesterday! For next week I want you to...';

  // Week progress for active plan
  const planStartDate  = workoutPlan?.starts_at ? new Date(workoutPlan.starts_at) : new Date('2025-06-01');
  const totalWeeks     = 12;
  const weeksElapsed   = Math.max(1, Math.ceil((Date.now() - planStartDate.getTime()) / (7 * 24 * 3600 * 1000)))
  const progressPct    = Math.min(100, Math.round((weeksElapsed / totalWeeks) * 100));

  // Specializations pills
  const specs = trainerProfile?.specializations?.length > 0
    ? trainerProfile.specializations.slice(0, 4)
    : ['Strength Training', 'Fat Loss', 'Hypertrophy', 'Nutrition'];
  const specColors = [
    { bg: '#E1F5EE', color: '#0F6E56' },
    { bg: '#E6F1FB', color: '#185FA5' },
    { bg: '#EAF3DE', color: '#3B6D11' },
    { bg: '#FAEEDA', color: '#854F0B' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F5] pb-28">

      {/* TOP BAR */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/[0.06] h-14 flex items-center justify-between px-5">
        <span className="text-xl font-semibold text-[#111]">My Trainer</span>
        <button
          onClick={() => navigate('/client/chat')}
          className="bg-[#111] text-white text-[13px] font-semibold px-4 h-9 rounded-xl flex items-center"
        >
          Message →
        </button>
      </div>

      <div className="pt-[72px] pb-6">

        {/* ── Just connected banner ─────────────────────────── */}
        {justConnected && (
          <div className="mx-5 mb-4 bg-[#E1F5EE] border border-[#0F6E56]/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <div>
              <p className="text-[#0F6E56] text-sm font-medium">Connected to {trainerName}!</p>
              <p className="text-[#999] text-xs">Your trainer will assign your first plan soon.</p>
            </div>
          </div>
        )}

        {/* ── TRAINER PROFILE CARD ──────────────────────────── */}
        <div className="relative mx-5">
          {/* Bleeding avatar */}
          <div
            className="absolute z-10 flex items-center justify-center rounded-full"
            style={{
              top: -8, left: -8,
              width: 64, height: 64,
              background: '#0F6E56',
              border: '3px solid white',
            }}
          >
            {trainerProfile?.profile_photo_url ? (
              <img
                src={trainerProfile.profile_photo_url}
                className="w-full h-full rounded-full object-cover"
                alt={trainerName}
              />
            ) : (
              <span className="text-[22px] font-bold text-white leading-none">{trainerInitials}</span>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.08] p-5 overflow-visible">
            {/* Name block — padded to clear avatar */}
            <div className="pl-14 mb-4" style={{ minHeight: 56 }}>
              <p className="text-[18px] font-bold text-[#111] leading-tight tracking-tight">{trainerName}</p>
              <p className="text-[13px] text-[#999] mt-0.5">{trainerTitle}</p>
              {/* Stars */}
              <div className="flex items-center gap-0.5 mt-1">
                {[0,1,2,3,4].map(i => (
                  <span key={i} className="text-[12px]" style={{ color: '#D4A017' }}>★</span>
                ))}
                <span className="text-[13px] font-semibold text-[#111] ml-1">4.9</span>
                <span className="text-[12px] text-[#999] ml-0.5">(47 reviews)</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 border-t border-b border-black/[0.06]">
              {[
                { val: experienceYrs, label: 'Experience' },
                { val: '23',          label: 'Clients'     },
                { val: '₹800',        label: 'Per Session' },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center py-2.5 ${i > 0 ? 'border-l border-black/[0.06]' : ''}`}
                >
                  <span className="text-base font-bold text-[#111] leading-none whitespace-nowrap">{s.val}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-[#999] mt-1 whitespace-nowrap">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Specializations */}
            <div className="mt-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-2">Specializes In</p>
              <div className="flex flex-wrap gap-1.5">
                {specs.map((s, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{
                      background: specColors[i % specColors.length].bg,
                      color:      specColors[i % specColors.length].color,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Bio */}
            <p className="mt-3 text-[13px] text-[#666] leading-relaxed">
              {trainerProfile?.bio ||
                '7 years coaching competitive athletes and everyday fitness enthusiasts. Evidence-based programming, no fluff.'}
            </p>
          </div>
        </div>

        {/* ── ACTIVE PLAN ───────────────────────────────────── */}
        <div className="mx-5 mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-3">Active Plan</p>
          <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <span className="bg-[#E1F5EE] text-[#0F6E56] text-[10px] font-medium uppercase tracking-widest px-2.5 py-0.5 rounded-full whitespace-nowrap">
                Assigned by Trainer
              </span>
              <span className="text-[12px] text-[#999]">
                Started {planStartDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {/* Plan name */}
            <p className="text-[18px] font-bold text-[#111] mt-2.5 leading-snug tracking-tight">
              {workoutPlan?.name || 'Push / Pull / Legs — 6 Day'}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {['6 days/week', 'Intermediate', '12 weeks'].map((m, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-[12px] text-[#CCC]">·</span>}
                  <span className="text-[12px] text-[#999]">{m}</span>
                </span>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-3.5">
              <div className="flex justify-between">
                <span className="text-[12px] text-[#999]">Week {weeksElapsed} of {totalWeeks}</span>
                <span className="text-[12px] text-[#999]">{progressPct}% complete</span>
              </div>
              <div className="mt-1.5 h-2 bg-[#F1EFE8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0F6E56] rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Trainer's note */}
            <div className="mt-3 bg-[#F7F7F5] rounded-xl p-3 flex gap-2.5">
              <div className="w-0.5 bg-[#0F6E56] rounded-full shrink-0" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#0F6E56] mb-1">Trainer's Note</p>
                <p className="text-[13px] text-[#444] leading-relaxed">
                  {workoutPlan?.notes ||
                    'Focus on progressive overload this week. Add 2.5kg to bench and squat if sets felt comfortable last session.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3.5">
              <button
                onClick={() => navigate('/workout')}
                className="flex-1 h-10 bg-[#111] text-white text-[13px] font-semibold rounded-xl whitespace-nowrap"
              >
                View Full Plan →
              </button>
              <button
                onClick={() => navigate('/workout')}
                className="flex-1 h-10 bg-transparent border border-black/[0.08] text-[#111] text-[13px] font-medium rounded-xl whitespace-nowrap"
              >
                Log Today's Session
              </button>
            </div>
          </div>
        </div>

        {/* ── MESSAGES ──────────────────────────────────────── */}
        <div className="mx-5 mt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">Messages</p>
            <button
              onClick={() => navigate('/client/chat')}
              className="text-[13px] font-medium text-[#185FA5]"
            >
              View all →
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
            {/* Message row */}
            <div className="flex items-center gap-3">
              {/* Trainer avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: '#0F6E56', border: '2px solid white' }}
              >
                <span className="text-[12px] font-bold text-white leading-none">{trainerInitials}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <span className="text-[14px] font-semibold text-[#111]">{trainerName}</span>
                  <span className="text-[12px] text-[#999] shrink-0 ml-2">
                    {conversation?.last_message_time ? '2h ago' : '2h ago'}
                  </span>
                </div>
                <p className="text-[13px] text-[#999] mt-0.5 truncate">{lastMsg}</p>
              </div>

              {/* Unread badge */}
              {unreadCount > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#111] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  {unreadCount}
                </div>
              )}
              {unreadCount === 0 && (
                <div className="w-5 h-5 rounded-full bg-[#111] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  2
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#F1EFE8] my-3" />

            {/* Quick reply chips */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: '👍 Got it!',                    dark: false },
                { label: "📅 When's our next check-in?",  dark: false },
                { label: '💬 Reply',                      dark: true  },
              ].map((c, i) => (
                <button
                  key={i}
                  onClick={() => navigate('/client/chat')}
                  className="h-7 px-3 rounded-full text-[12px] whitespace-nowrap"
                  style={{
                    background: c.dark ? '#111' : 'transparent',
                    color:      c.dark ? '#fff' : '#666',
                    border:     c.dark ? 'none' : '0.5px solid rgba(0,0,0,0.10)',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── PROGRESS SHARED ───────────────────────────────── */}
        <div className="mx-5 mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-3">
            Shared with Trainer
          </p>
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
            <div className="grid grid-cols-2">
              {[
                { val: '72.4 kg', label: 'Weight this week',  sub: '↓ 0.3 from last',  subColor: '#3B6D11' },
                { val: '4 / 6',  label: 'Workouts done',      sub: 'this week',          subColor: '#999'    },
                { val: '78/100', label: 'Avg form score',      sub: 'last 7 sessions',    subColor: '#999'    },
                { val: '🔥 6',   label: 'Day streak',          sub: 'personal best: 14', subColor: '#999'    },
              ].map((c, i) => (
                <div
                  key={i}
                  className="p-4"
                  style={{
                    borderRight:  i % 2 === 0 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                    borderBottom: i < 2       ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <p className="text-[18px] font-bold text-[#111] leading-tight">{c.val}</p>
                  <p className="text-[11px] text-[#999] mt-0.5 leading-snug">{c.label}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: c.subColor }}>{c.sub}</p>
                </div>
              ))}
            </div>
            <div className="py-2.5 flex items-center justify-center gap-1.5 border-t border-black/[0.04]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="#CCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span className="text-[11px] text-[#CCC]">Your trainer can see this data</span>
            </div>
          </div>
        </div>

        {/* ── NEXT CHECK-IN ─────────────────────────────────── */}
        <div className="mx-5 mt-5">
          <div className="bg-white rounded-xl border border-black/[0.06] p-4 flex items-center gap-3.5">
            {/* Calendar icon */}
            <div className="w-11 h-11 rounded-xl bg-[#F1EFE8] flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#111" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8"  y1="2" x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#111]">Next Check-in</p>
              <p className="text-[13px] text-[#999] mt-0.5">Tuesday, Jun 10 · 6:00 PM</p>
              <p className="text-[12px] text-[#185FA5] mt-0.5">Video call with {trainerName.split(' ')[0]}</p>
            </div>

            <button className="bg-[#111] text-white text-[12px] font-semibold px-3.5 py-1.5 rounded-xl shrink-0 whitespace-nowrap">
              Join →
            </button>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-6" />
      </div>
    </div>
  );
}
