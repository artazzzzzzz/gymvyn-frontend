import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAssignedDietPlan } from '../hooks/useAssignedDietPlan';
import AssignedDietPlanView from '../components/diet/AssignedDietPlanView';
import { unlinkTrainer } from '../utils/api';

const BASE = import.meta.env.VITE_API_URL || '';

async function authFetch(path) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status });
  return data;
}

async function authPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`);
  return data;
}

function Skeleton({ width = '100%', height = 16, radius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--bg-pill) 25%, var(--border) 50%, var(--bg-pill) 75%)',
      backgroundSize: '200% 100%',
      animation: 'gv-pulse 1.4s ease-in-out infinite',
      ...style,
    }} />
  );
}

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return day < 7 ? `${day}d ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const specColors = [
  { bg: '#E1F5EE', color: 'var(--success)' },
  { bg: 'var(--accent-bg)', color: 'var(--text-cta)' },
  { bg: 'var(--success-bg)', color: 'var(--success)' },
  { bg: 'var(--warning-bg)', color: 'var(--warning)' },
];

export default function MyTrainer() {
  const navigate = useNavigate();
  const { refetchLinks } = useOutletContext() || {};

  const { plan: dietPlan, loading: dietLoading } = useAssignedDietPlan();

  const [trainer,      setTrainer]      = useState(null);
  const [plan,         setPlan]         = useState(null);
  const [conversation, setConversation] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [noTrainer,    setNoTrainer]    = useState(false);
  const [loadError,    setLoadError]    = useState(false);

  const [showJoin,       setShowJoin]       = useState(false);
  const [joinCode,       setJoinCode]       = useState('');
  const [joining,        setJoining]        = useState(false);
  const [justConnected,  setJustConnected]  = useState(false);

  const [menuOpen,          setMenuOpen]          = useState(false);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen]  = useState(false);
  const [unlinking,         setUnlinking]          = useState(false);
  const [unlinkError,       setUnlinkError]        = useState('');

  useEffect(() => { load() }, []);

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await authFetch('/api/trainer/my-trainer');
      setTrainer(data.trainer);
      setPlan(data.plan);
      setConversation(data.conversation || null);
      setNoTrainer(false);
    } catch (err) {
      if (err.status === 404) {
        setNoTrainer(true);
      } else {
        // 401/403/500/network — do NOT treat as "not linked". Show a
        // distinct error state so an auth/backend failure never looks
        // identical to a genuine unlinked trainer.
        console.error('Load trainer error:', err);
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      await authPost('/api/trainer/join', { trainer_code: joinCode.trim().toUpperCase() });
      setShowJoin(false);
      setJoinCode('');
      setJustConnected(true);
      load();
    } catch (err) {
      alert(err.message || 'Invalid or expired code');
    } finally {
      setJoining(false);
    }
  }

  async function confirmUnlink() {
    setUnlinking(true);
    setUnlinkError('');
    try {
      await unlinkTrainer();
      setUnlinkConfirmOpen(false);
      setTrainer(null);
      setPlan(null);
      setConversation(null);
      setNoTrainer(true);
      refetchLinks?.();
    } catch (err) {
      setUnlinkError(err.message || 'Could not unlink from trainer.');
    } finally {
      setUnlinking(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] pb-36">
        <style>{`@keyframes gv-pulse { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }`}</style>
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)] h-14 flex items-center px-5">
          <span className="text-xl font-semibold text-[var(--text-primary)]">My Trainer</span>
        </div>
        <div className="pt-[72px] px-5 space-y-5">
          {/* Trainer card skeleton */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5">
            <div className="pl-14" style={{ minHeight: 56 }}>
              <Skeleton width={160} height={20} style={{ marginBottom: 8 }} />
              <Skeleton width={110} height={14} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[1,2,3].map(i => <Skeleton key={i} height={40} />)}
            </div>
            <div className="mt-3 flex gap-2">
              {[1,2,3].map(i => <Skeleton key={i} width={80} height={26} radius={20} />)}
            </div>
            <Skeleton height={14} style={{ marginTop: 12 }} />
            <Skeleton height={14} width="75%" style={{ marginTop: 4 }} />
          </div>
          {/* Plan skeleton */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4">
            <Skeleton width={100} height={14} style={{ marginBottom: 10 }} />
            <Skeleton width="60%" height={20} style={{ marginBottom: 8 }} />
            <Skeleton height={8} />
          </div>
        </div>
      </div>
    );
  }

  // ── No trainer linked ────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] pb-36">
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)] h-14 flex items-center px-5">
          <span className="text-xl font-semibold text-[var(--text-primary)]">My Trainer</span>
        </div>
        <div className="pt-[72px] px-5 space-y-4">
          <div className="bg-[var(--bg-card)] rounded-2xl p-8 border border-[var(--border)] text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--error-bg)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Couldn't load your trainer</h2>
            <p className="text-[var(--text-tertiary)] text-sm mb-6 leading-relaxed">
              Something went wrong loading this page. Your trainer link (if any) is unaffected — try again.
            </p>
            <button
              onClick={load}
              className="w-full py-3.5 rounded-xl font-semibold text-[var(--cta-text)] border"
              style={{ background: 'var(--cta-bg)', borderColor: 'var(--cta-border)' }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (noTrainer) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] pb-36">
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)] h-14 flex items-center px-5">
          <span className="text-xl font-semibold text-[var(--text-primary)]">My Trainer</span>
        </div>
        <div className="pt-[72px] px-5 space-y-4">
          <div className="bg-[var(--bg-card)] rounded-2xl p-8 border border-[var(--border)] text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--success-bg)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 6.5h11M6.5 17.5h11M4 8.5v7M9 5.5v13M15 5.5v13M20 8.5v7"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">No trainer connected yet</h2>
            <p className="text-[var(--text-tertiary)] text-sm mb-6 leading-relaxed">
              Get a personal trainer on Gymvyn for custom workout plans, diet guidance, and direct coaching.
            </p>

            {!showJoin ? (
              <button
                onClick={() => setShowJoin(true)}
                className="w-full py-3.5 rounded-xl font-semibold text-[var(--cta-text)] border"
                style={{ background: 'var(--cta-bg)', borderColor: 'var(--cta-border)' }}
              >
                Enter Trainer Code
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
                  className="w-full px-4 py-4 rounded-xl text-[var(--text-primary)] text-center text-2xl font-mono tracking-[0.3em] focus:outline-none uppercase placeholder:text-[var(--text-tertiary)] placeholder:text-base placeholder:tracking-normal"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)' }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowJoin(false); setJoinCode(''); }}
                    className="flex-1 py-3 rounded-xl font-medium text-sm text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--bg-elevated)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoin}
                    disabled={joinCode.length < 4 || joining}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-40 border text-[var(--cta-text)]"
                    style={{ background: 'var(--cta-bg)', borderColor: 'var(--cta-border)' }}
                  >
                    {joining ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <p className="text-sm font-medium text-[var(--text-primary)]">What you get with a trainer</p>
            </div>
            {[
              { title: 'Custom workout plans',    desc: 'Tailored programs built for your goals' },
              { title: 'Personalised diet plans', desc: 'Macros and meals designed for you' },
              { title: 'Direct messaging',        desc: 'Ask questions, get feedback anytime' },
              { title: 'Progress tracking',       desc: 'Your trainer sees your logs in real time' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pb-8">
            <p className="text-[var(--text-tertiary)] text-xs">
              Are you a trainer?{' '}
              <button onClick={() => navigate('/become-trainer')} className="text-[var(--text-cta)]">
                Set up your profile →
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Trainer linked ───────────────────────────────────────────────────────────
  const trainerName     = trainer?.full_name || '—';
  const trainerInitials = trainerName !== '—'
    ? trainerName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const specs           = trainer?.specializations?.length > 0 ? trainer.specializations.slice(0, 4) : [];
  const experienceYrs   = trainer?.experience_years ? `${trainer.experience_years} yrs` : '—';
  const hourlyRate      = trainer?.hourly_rate ? `₹${trainer.hourly_rate}` : '—';

  const planStartDate   = plan?.starts_at ? new Date(plan.starts_at) : null;
  const totalWeeks      = plan?.plan_data?.weeks ?? null;
  const weeksElapsed    = planStartDate
    ? Math.max(1, Math.ceil((Date.now() - planStartDate.getTime()) / (7 * 24 * 3600 * 1000)))
    : null;
  const progressPct     = (weeksElapsed && totalWeeks)
    ? Math.min(100, Math.round((weeksElapsed / totalWeeks) * 100))
    : null;

  const unreadCount     = conversation?.client_unread || 0;
  const lastMsg         = conversation?.last_message_preview || null;
  const lastMsgTime     = conversation ? timeAgo(conversation.last_message_at) : null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-36">
      <style>{`@keyframes gv-pulse { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }`}</style>

      {/* TOP BAR */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)] h-14 flex items-center justify-between px-5 gap-2">
        <span className="text-xl font-semibold text-[var(--text-primary)]">My Trainer</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/client/chat')}
            className="text-[13px] font-semibold px-4 h-9 rounded-xl flex items-center border"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
          >
            Message →
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="w-9 h-9 bg-[var(--bg-pill)] rounded-xl flex items-center justify-center shrink-0"
            >
              <MoreVertical size={18} className="text-[var(--text-primary)]" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); setUnlinkError(''); setUnlinkConfirmOpen(true); }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-[var(--error)]"
                  >
                    Leave this trainer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="pt-[72px] pb-6">

        {/* Just connected banner */}
        {justConnected && (
          <div className="mx-5 mb-4 bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <div>
              <p className="text-[var(--success)] text-sm font-medium">Connected to {trainerName}!</p>
              <p className="text-[var(--text-tertiary)] text-xs">Your trainer will assign your first plan soon.</p>
            </div>
          </div>
        )}

        {/* ── TRAINER PROFILE CARD ─────────────────────────── */}
        <div className="relative mx-5">
          <div
            className="absolute z-10 flex items-center justify-center rounded-full"
            style={{ top: -8, left: -8, width: 64, height: 64, background: 'var(--success)', border: '3px solid var(--bg-primary)' }}
          >
            {trainer?.profile_photo_url ? (
              <img
                src={trainer.profile_photo_url}
                className="w-full h-full rounded-full object-cover"
                alt={trainerName}
              />
            ) : (
              <span className="text-[22px] font-bold text-white leading-none">{trainerInitials}</span>
            )}
          </div>

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 overflow-visible">
            <div className="pl-14 mb-4" style={{ minHeight: 56 }}>
              <p className="text-[18px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">{trainerName}</p>
              <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">Personal Trainer</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 border-t border-b border-[var(--border)]">
              {[
                { val: experienceYrs, label: 'Experience' },
                { val: hourlyRate,    label: 'Per Session' },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center py-2.5 ${i > 0 ? 'border-l border-[var(--border)]' : ''}`}
                >
                  <span className="text-base font-bold text-[var(--text-primary)] leading-none whitespace-nowrap">{s.val}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mt-1 whitespace-nowrap">{s.label}</span>
                </div>
              ))}
              <div className="flex flex-col items-center py-2.5 border-l border-[var(--border)]" />
            </div>

            {/* Specializations */}
            {specs.length > 0 && (
              <div className="mt-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Specializes In</p>
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
            )}

            {/* Bio */}
            {trainer?.bio && (
              <p className="mt-3 text-[13px] text-[var(--text-secondary)] leading-relaxed">{trainer.bio}</p>
            )}
          </div>
        </div>

        {/* ── ACTIVE PLAN ──────────────────────────────────── */}
        <div className="mx-5 mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Active Plan</p>
          {!plan ? (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4">
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: 'center', padding: '12px 0' }}>
                No plan assigned yet
              </p>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between">
                <span className="bg-[var(--success-bg)] text-[var(--success)] text-[10px] font-medium uppercase tracking-widest px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  Assigned by Trainer
                </span>
                {planStartDate && (
                  <span className="text-[12px] text-[var(--text-tertiary)]">
                    Started {planStartDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>

              <p className="text-[18px] font-bold text-[var(--text-primary)] mt-2.5 leading-snug tracking-tight">
                {plan.name || '—'}
              </p>

              {/* Progress bar — only when we have enough data */}
              {weeksElapsed && totalWeeks && progressPct !== null && (
                <div className="mt-3.5">
                  <div className="flex justify-between">
                    <span className="text-[12px] text-[var(--text-tertiary)]">Week {weeksElapsed} of {totalWeeks}</span>
                    <span className="text-[12px] text-[var(--text-tertiary)]">{progressPct}% complete</span>
                  </div>
                  <div className="mt-1.5 h-2 bg-[var(--bg-pill)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--success)] rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Trainer's note */}
              {plan.notes && (
                <div className="mt-3 bg-[var(--bg-primary)] rounded-xl p-3 flex gap-2.5">
                  <div className="w-0.5 bg-[var(--success)] rounded-full shrink-0" />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--success)] mb-1">Trainer's Note</p>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{plan.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-3.5">
                <button
                  onClick={() => navigate('/workout')}
                  className="flex-1 h-10 text-[13px] font-semibold rounded-xl whitespace-nowrap border"
                  style={{ background: 'var(--cta-bg)', borderColor: 'var(--cta-border)', color: 'var(--cta-text)' }}
                >
                  View Full Plan →
                </button>
                <button
                  onClick={() => navigate('/workout')}
                  className="flex-1 h-10 bg-transparent border border-[var(--border)] text-[var(--text-primary)] text-[13px] font-medium rounded-xl whitespace-nowrap"
                >
                  Log Today's Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── DIET PLAN ────────────────────────────────────── */}
        <div className="mx-5 mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Your Diet Plan</p>
          {dietLoading ? (
            <div style={{ height: 120, borderRadius: 16, background: 'linear-gradient(90deg, var(--bg-pill) 25%, var(--border) 50%, var(--bg-pill) 75%)', backgroundSize: '200% 100%', animation: 'gv-pulse 1.4s ease-in-out infinite' }} />
          ) : dietPlan ? (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4">
              <AssignedDietPlanView plan={dietPlan} />
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>
                Your trainer hasn't assigned a diet plan yet.
              </p>
            </div>
          )}
        </div>

        {/* ── MESSAGES ─────────────────────────────────────── */}
        <div className="mx-5 mt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Messages</p>
            <button
              onClick={() => navigate('/client/chat')}
              className="text-[13px] font-medium text-[var(--text-cta)]"
            >
              View all →
            </button>
          </div>

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4">
            {!conversation ? (
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: 'center', padding: '8px 0' }}>
                No messages yet
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ background: 'var(--success)', border: '1px solid var(--border)' }}
                  >
                    {trainer?.profile_photo_url ? (
                      <img src={trainer.profile_photo_url} className="w-full h-full rounded-full object-cover" alt="" />
                    ) : (
                      <span className="text-[12px] font-bold text-white leading-none">{trainerInitials}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[14px] font-semibold text-[var(--text-primary)]">{trainerName}</span>
                      {lastMsgTime && (
                        <span className="text-[12px] text-[var(--text-tertiary)] shrink-0 ml-2">{lastMsgTime}</span>
                      )}
                    </div>
                    <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5 truncate">
                      {lastMsg || 'Start a conversation'}
                    </p>
                  </div>

                  {unreadCount > 0 && (
                    <div className="w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] text-[11px] font-bold flex items-center justify-center shrink-0">
                      {unreadCount}
                    </div>
                  )}
                </div>

                <div className="h-px bg-[var(--border)] my-3" />

                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: 'Got it!',                    dark: false },
                    { label: "When's our next check-in?",  dark: false },
                    { label: 'Reply',                      dark: true  },
                  ].map((c, i) => (
                    <button
                      key={i}
                      onClick={() => navigate('/client/chat')}
                      className="h-7 px-3 rounded-full text-[12px] whitespace-nowrap"
                      style={{
                        background: c.dark ? "var(--text-primary)" : 'transparent',
                        color:      c.dark ? "var(--bg-primary)" : "var(--text-secondary)",
                        border:     c.dark ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="h-6" />
      </div>

      {unlinkConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-6"
          onClick={() => !unlinking && setUnlinkConfirmOpen(false)}
        >
          <div
            className="relative w-full max-w-xs bg-[var(--bg-card)] rounded-2xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Leave {trainerName}?</p>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5">
              Your history will be saved but they will no longer have access to your data. You can connect with a new trainer anytime.
            </p>
            {unlinkError && (
              <p className="text-xs text-[var(--error)] mb-3">{unlinkError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setUnlinkConfirmOpen(false)}
                disabled={unlinking}
                className="flex-1 py-3 rounded-xl font-medium text-sm text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--bg-elevated)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnlink}
                disabled={unlinking}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white bg-[var(--error)] disabled:opacity-60"
              >
                {unlinking ? 'Leaving…' : 'Leave Trainer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
