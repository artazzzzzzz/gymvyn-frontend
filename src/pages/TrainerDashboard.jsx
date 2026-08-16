import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

/* ── palette ── */
const C = {
  bg: 'var(--bg-primary)',
  card: "var(--bg-card)",
  hover: 'var(--bg-hover)',
  border: 'var(--border)',
  text: 'var(--text-primary)',
  sub: 'var(--text-secondary)',
  meta: 'var(--text-tertiary)',
  green: 'var(--success)',
  greenBg: 'var(--success-bg)',
  amber: 'var(--warning)',
  amberBg: 'var(--warning-bg)',
  blue: 'var(--accent)',
  blueBg: 'var(--accent-bg)',
  gray: 'var(--text-tertiary)',
  grayBg: 'var(--bg-pill)',
};

const AVATAR_COLORS = [
  { bg: 'var(--accent-bg)', text: 'var(--accent)' },
  { bg: 'var(--error-bg)', text: 'var(--error)' },
  { bg: 'var(--success-bg)', text: 'var(--success)' },
  { bg: 'var(--warning-bg)', text: 'var(--warning)' },
];

const FILTER_TABS = ['All', 'Active', 'Needs attention', 'No plan', 'Pending'];

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function getStatusFromClient(rel) {
  if (rel.status === 'pending') return 'pending';
  if (!rel.stats?.activePlans || rel.stats.activePlans === 0) return 'noplan';
  if (rel.stats?.lastWorkout) {
    const days = (Date.now() - new Date(rel.stats.lastWorkout)) / 86400000;
    if (days > 3) return 'attention';
  }
  return 'active';
}

function statusDotColor(status) {
  if (status === 'active') return C.green;
  if (status === 'attention') return C.amber;
  return C.gray;
}

function lastActiveText(rel) {
  if (rel.status === 'pending') return 'Pending invite';
  if (!rel.stats?.lastWorkout) return 'No activity';
  const days = Math.floor((Date.now() - new Date(rel.stats.lastWorkout)) / 86400000);
  if (days === 0) return 'Active today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

/* ── icons ── */
const IconCopy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);


/* ── StatCard ── */
function StatCard({ value, label, sub, subColor, subBg }) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: '16px 14px',
      display: 'flex', flexDirection: 'column', gap: 6,
      border: `0.5px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</span>
      <span style={{
        fontSize: 11, fontWeight: 600, color: C.meta, lineHeight: 1.3,
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>{label}</span>
      {sub && (
        <span style={{
          fontSize: 12, fontWeight: 500, color: subColor || C.meta,
          background: subBg || C.grayBg,
          borderRadius: 20, padding: '2px 8px', alignSelf: 'flex-start', marginTop: 2,
        }}>{sub}</span>
      )}
    </div>
  );
}

/* ── ClientCard ── */
function ClientCard({ rel, avatarIdx, onClick }) {
  const [pressed, setPressed] = useState(false);
  const av = AVATAR_COLORS[avatarIdx % AVATAR_COLORS.length];
  const name = rel.client?.full_name || rel.invite_email || 'Client';
  const initials = getInitials(name);
  const status = getStatusFromClient(rel);
  const goal = rel.client?.goal || '—';
  const planName = rel.stats?.planName || null;

  let badge, badgeColor, badgeBg;
  if (rel.status === 'pending') {
    badge = 'Pending invite'; badgeColor = C.amber; badgeBg = C.amberBg;
  } else if (!rel.stats?.activePlans || rel.stats.activePlans === 0) {
    badge = 'No plan assigned'; badgeColor = C.amber; badgeBg = C.amberBg;
  } else {
    badge = 'Workout + Diet'; badgeColor = C.blue; badgeBg = C.blueBg;
  }

  return (
    <div
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        background: pressed ? C.hover : C.card,
        borderRadius: 16, padding: '14px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        border: `0.5px solid ${C.border}`,
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: av.bg, color: av.text,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, flexShrink: 0, letterSpacing: '0.3px',
      }}>{initials}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{name}</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusDotColor(status), flexShrink: 0 }} />
        </div>
        <div style={{ fontSize: 12, color: C.meta, marginBottom: 6 }}>
          {goal}{planName ? ` · ${planName}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: badgeColor, background: badgeBg,
            borderRadius: 20, padding: '2px 8px',
          }}>{badge}</span>
          <span style={{ fontSize: 11, color: C.meta }}>{lastActiveText(rel)}</span>
        </div>
      </div>

      <IconChevronRight />
    </div>
  );
}

/* ── main ── */
export default function TrainerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchVal, setSearchVal] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [profileRes, clientsRes] = await Promise.all([
        apiFetch(`/api/trainer/profile/${user.id}`),
        apiFetch(`/api/trainer/clients/${user.id}`)
      ]);
      setProfile(profileRes);
      setClients(clientsRes);
    } catch (err) {
      // An error here (401/403/500/network) must not render as "no
      // profile / no clients" — that's indistinguishable from a genuinely
      // empty trainer account.
      console.error('Load dashboard error:', err);
      setFetchError('Failed to load your dashboard');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (profile?.invite_code) {
      navigator.clipboard.writeText(profile.invite_code).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const shareInviteCode = () => {
    if (navigator.share && profile?.invite_code) {
      navigator.share({ title: 'Gymvyn Invite Code', text: `Join me on Gymvyn! Use code: ${profile.invite_code}` }).catch(() => {});
    }
  };

  const activeClients = clients.filter(c => c.status === 'active');
  const pendingClients = clients.filter(c => c.status === 'pending');
  const withPlans = activeClients.filter(c => c.stats?.activePlans > 0);
  const noPlans = activeClients.filter(c => !c.stats?.activePlans || c.stats.activePlans === 0);
  const needsAttention = activeClients.filter(c => getStatusFromClient(c) === 'attention');
  // The "Active clients" stat card and the "Active" filter tab below must
  // agree on what "active" means — a relationship that's active but has no
  // plan yet (or needs attention) is its own filter tab, not "Active".
  // Bug: the stat card used to count activeClients.length (relationship
  // status alone), which could be higher than what the Active tab actually
  // shows, producing "3 active" on the dashboard next to "No clients yet"
  // on the filtered list.
  const trulyActiveClients = activeClients.filter(c => getStatusFromClient(c) === 'active');

  const filteredClients = clients.filter(rel => {
    const name = (rel.client?.full_name || rel.invite_email || '').toLowerCase();
    if (searchVal && !name.includes(searchVal.toLowerCase())) return false;
    if (activeFilter === 'Active') return rel.status === 'active' && getStatusFromClient(rel) === 'active';
    if (activeFilter === 'Needs attention') return getStatusFromClient(rel) === 'attention';
    if (activeFilter === 'No plan') return getStatusFromClient(rel) === 'noplan';
    if (activeFilter === 'Pending') return rel.status === 'pending';
    return true;
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const trainerName = user?.full_name?.split(' ')[0] || 'Coach';
  const trainerInitials = getInitials(user?.full_name || 'RP');

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });


  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.text, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 8 }}>{fetchError}</h2>
          <p style={{ fontSize: 13, color: C.meta, marginBottom: 20, lineHeight: 1.5 }}>
            Something went wrong loading this page. Your profile and clients are unaffected — try again.
          </p>
          <button
            onClick={loadData}
            style={{
              padding: '12px 24px', borderRadius: 12, border: `0.5px solid ${C.border}`,
              background: C.text, color: C.bg, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 80 }}>

      {/* scrollable body */}
      <div style={{ padding: '52px 16px 0' }}>

        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.3px' }}>
              {greeting()}, {trainerName}
            </div>
            <div style={{ fontSize: 13, color: C.meta, marginTop: 3 }}>{dateStr}</div>
          </div>
          <div
            onClick={() => navigate('/trainer/settings')}
            style={{
              width: 42, height: 42, borderRadius: 13,
              background: C.text, color: "var(--bg-card)",
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, flexShrink: 0, letterSpacing: '0.5px',
              cursor: 'pointer',
            }}
          >{trainerInitials}</div>
        </div>

        {/* stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <StatCard
            value={trulyActiveClients.length}
            label="Active clients"
            sub={trulyActiveClients.length > 0 ? `${pendingClients.length > 0 ? `+${pendingClients.length} pending` : 'all active'}` : 'none yet'}
            subColor={trulyActiveClients.length > 0 ? C.green : C.sub}
            subBg={trulyActiveClients.length > 0 ? C.greenBg : C.grayBg}
          />
          <StatCard
            value={withPlans.length + noPlans.length}
            label="Plans assigned"
            sub={`${withPlans.length} with plan · ${noPlans.length} without`}
          />
          <StatCard
            value={needsAttention.length}
            label="Need attention"
            sub={needsAttention.length > 0 ? 'inactive 3+ days' : 'all up to date'}
            subColor={needsAttention.length > 0 ? C.amber : C.green}
            subBg={needsAttention.length > 0 ? C.amberBg : C.greenBg}
          />
          <StatCard
            value={pendingClients.length}
            label="Pending invites"
            sub={pendingClients.length > 0 ? 'awaiting response' : 'none pending'}
            subColor={pendingClients.length > 0 ? C.amber : C.sub}
            subBg={pendingClients.length > 0 ? C.amberBg : C.grayBg}
          />
        </div>

        {/* invite code card */}
        {profile?.invite_code && (
          <div style={{
            background: C.card, borderRadius: 18, padding: '16px 16px',
            border: `0.5px solid ${C.border}`, marginBottom: 22,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: C.meta, marginBottom: 4,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>Your invite code</div>
            <div style={{ fontSize: 12, color: C.meta, marginBottom: 14 }}>
              Share with new clients to link instantly
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                flex: 1, background: C.grayBg, borderRadius: 12, padding: '10px 14px',
                fontFamily: 'monospace',
                fontSize: 22, fontWeight: 700, letterSpacing: '3px', color: C.text,
              }}>{profile.invite_code}</div>
              <button
                onClick={copyInviteCode}
                style={{
                  width: 42, height: 42, borderRadius: 12, border: `0.5px solid ${C.border}`,
                  background: copied ? C.greenBg : C.card,
                  color: copied ? C.green : C.sub,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                }}
              >
                {copied ? <IconCheck /> : <IconCopy />}
              </button>
              <button
                onClick={shareInviteCode}
                style={{
                  width: 42, height: 42, borderRadius: 12, border: `0.5px solid ${C.border}`,
                  background: C.card, color: C.sub,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <IconShare />
              </button>
            </div>
          </div>
        )}

        {/* client list section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Clients</span>
          <span
            onClick={() => navigate('/trainer/templates')}
            style={{ fontSize: 12, fontWeight: 600, color: C.blue, cursor: 'pointer' }}
          >Manage templates</span>
        </div>

        {/* search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.card, borderRadius: 12, padding: '10px 12px',
          border: `0.5px solid ${C.border}`, marginBottom: 12,
        }}>
          <IconSearch />
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search clients…"
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: C.text, flex: 1, fontFamily: 'inherit',
            }}
          />
        </div>

        {/* filter chips */}
        <div style={{
          display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 14,
          scrollbarWidth: 'none',
        }}>
          {FILTER_TABS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                border: activeFilter === f ? 'none' : `0.5px solid ${C.border}`,
                background: activeFilter === f ? C.text : C.card,
                color: activeFilter === f ? "var(--bg-card)" : C.sub,
                transition: 'all 0.15s',
              }}
            >{f}</button>
          ))}
        </div>

        {/* client cards */}
        {filteredClients.length === 0 ? (
          <div style={{
            background: C.card, borderRadius: 18, padding: '40px 24px',
            border: `0.5px solid ${C.border}`, textAlign: 'center',
          }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: C.sub }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>No clients yet</div>
            <div style={{ fontSize: 13, color: C.meta }}>Share your invite code to get started</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredClients.map((rel, i) => (
              <ClientCard
                key={rel.id}
                rel={rel}
                avatarIdx={i}
                onClick={() => rel.status !== 'pending' && rel.client_id && navigate(`/trainer/client/${rel.client_id}`)}
              />
            ))}
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>

    </div>
  );
}
