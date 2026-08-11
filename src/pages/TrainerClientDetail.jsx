import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import AssignedDietPlanView from '../components/diet/AssignedDietPlanView';
import AIPlanGenerator from '../components/AIPlanGenerator';
import AIDietPlanGenerator from '../components/AIDietPlanGenerator';
import { supabase } from '../utils/supabase';
import {
  BarChart, Bar, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { searchExercises } from '../data/exerciseDatabase';

/* ── palette ── */
const C = {
  bg: 'var(--bg-pill)', card: "var(--bg-card)", border: 'var(--border)',
  text: 'var(--text-primary)', sub: "var(--text-tertiary)",
  green: 'var(--success)', greenBg: 'var(--success-bg)',
  amber: 'var(--warning)', amberBg: 'var(--warning-bg)',
  blue: 'var(--text-cta)', blueBg: 'var(--accent-bg)',
  red: 'var(--error)', redBg: 'var(--error-bg)',
  teal: 'var(--success)', tealBg: 'var(--success-bg)',
  gray: 'var(--text-tertiary)', grayBg: 'var(--bg-pill)',
  coral: '#D85A30', coralBg: '#FAECE7',
};

const SL = {
  fontSize: 11, fontWeight: 600, color: C.sub,
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
};

const CARD = {
  background: C.card, borderRadius: 12,
  border: `0.5px solid ${C.border}`,
  padding: '16px',
};

/* ── avatar color from name hash ── */
const AVATAR_PALETTE = [
  { bg: 'var(--accent-bg)', text: 'var(--text-cta)' },
  { bg: 'var(--error-bg)', text: 'var(--error)' },
  { bg: 'var(--success-bg)', text: 'var(--success)' },
  { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  { bg: '#f3e8fb', text: '#7b2fbf' },
];
function nameColor(name = '') {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

/* ── week math (no date-fns) ── */
function getMondayOfWeek(date) {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  d.setHours(0, 0, 0, 0);
  return d;
}
function isoDate(d) { return d.toISOString().split('T')[0]; }

/* ── icons ── */
const IcoBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IcoCheck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill={C.greenBg} />
    <polyline points="7.5 12 10.5 15 16.5 9"
      stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcoX = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill={C.redBg} />
    <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" stroke={C.red} strokeWidth="2" strokeLinecap="round" />
    <line x1="15.5" y1="8.5" x2="8.5" y2="15.5" stroke={C.red} strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IcoChevron = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IcoPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IcoTrophy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H3l1 7h2M18 9h3l-1 7h-2M6 9V4h12v5M12 17v4M8 21h8" />
    <path d="M6 9c0 3.3 2.7 6 6 6s6-2.7 6-6" />
  </svg>
);
const IcoCamera = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="var(--text-disabled)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

/* ── animated progress bar ── */
function AnimBar({ pct, color }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 100); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height: 6, background: C.grayBg, borderRadius: 9999, overflow: 'hidden' }}>
      <div style={{
        width: `${w}%`, height: '100%', background: color, borderRadius: 9999,
        transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
      }} />
    </div>
  );
}

/* ── metric card ── */
function MetricCard({ value, unit, label, sub, subColor }) {
  return (
    <div style={{
      background: C.grayBg, borderRadius: 12, padding: '14px 12px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 11, fontWeight: 500, color: C.sub }}>{unit}</span>}
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>{label}</span>
      {sub && <span style={{ fontSize: 11, fontWeight: 600, color: subColor || C.sub, marginTop: 1 }}>{sub}</span>}
    </div>
  );
}

/* ── note card ── */
function NoteCard({ accent, text, date }) {
  return (
    <div style={{
      background: C.card, borderRadius: 12,
      borderLeft: `3px solid ${accent}`, padding: '12px 14px',
      boxShadow: `0 0 0 0.5px ${C.border}`,
    }}>
      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.55, marginBottom: 6 }}>{text}</p>
      <span style={{ fontSize: 11, color: C.sub }}>{date}</span>
    </div>
  );
}

/* ── plan status badge ── */
function PlanBadge({ status }) {
  const map = {
    active: { color: C.green, bg: C.greenBg, label: 'Active' },
    completed: { color: "var(--text-secondary)", bg: 'var(--bg-pill)', label: 'Completed' },
    replaced: { color: C.amber, bg: C.amberBg, label: 'Replaced' },
  };
  const s = map[status] || map.completed;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: s.color, background: s.bg,
      borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

/* ── empty state ── */
function EmptyState({ text }) {
  return (
    <div style={{ ...CARD, textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ fontSize: 13, color: C.sub }}>{text}</div>
    </div>
  );
}

/* ── section heading ── */
function SectionHeading({ label, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <p style={{ ...SL, marginBottom: 0 }}>{label}</p>
      {action && (
        <button onClick={onAction} style={{
          fontSize: 11, fontWeight: 600, color: C.blue,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 3,
        }}>{action}</button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   OVERVIEW TAB
──────────────────────────────────────────── */
function OverviewTab({ data, clientId, onAddNote, localNotes }) {
  const navigate = useNavigate();
  const { client, macros, workoutLogs } = data;

  const completedWorkouts = workoutLogs?.filter(w => w.completed_at) || [];

  // startingWeightEntry/latestWeightEntry are queried server-side ordered by
  // logged_at (not created_at) and unaffected by the 10-row cap on the
  // general progressEntries list, so they reliably reflect the true first
  // and most recent weigh-ins. weight_kg is numeric-as-string from Postgres —
  // always parse before use.
  const startWeight = data?.startingWeightEntry?.weight_kg != null
    ? parseFloat(data.startingWeightEntry.weight_kg)
    : (client?.current_weight != null ? parseFloat(client.current_weight) : null);
  const currentWeight = data?.latestWeightEntry?.weight_kg != null
    ? parseFloat(data.latestWeightEntry.weight_kg)
    : (client?.current_weight != null ? parseFloat(client.current_weight) : null);
  const weightLost = startWeight != null && currentWeight != null
    ? +(startWeight - currentWeight).toFixed(1)
    : null;

  const targetWeight = client?.target_weight != null ? parseFloat(client.target_weight) : null;
  const weightLossPct = startWeight != null && targetWeight != null && currentWeight != null && startWeight !== targetWeight
    ? Math.min(100, Math.max(0, Math.round(
        ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100
      )))
    : 0;

  const last30 = completedWorkouts.filter(w => {
    const d = new Date(w.completed_at);
    return (Date.now() - d) / 86400000 <= 30;
  });
  const adherencePct = Math.min(100, Math.round((last30.length / 20) * 100));

  const recentLogs = [...completedWorkouts]
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, 4);

  const allNotes = [...(data.notes || []), ...localNotes];

  return (
    <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section>
        <p style={SL}>At a glance</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <MetricCard value={currentWeight ?? '—'} unit={currentWeight ? 'kg' : ''} label="Current weight"
            sub={weightLost > 0 ? `↓ ${weightLost} kg since start` : null} subColor={C.green} />
          <MetricCard value={completedWorkouts.length} label="Workouts done" sub={`last 30 days: ${last30.length}`} />
          <MetricCard value={macros?.calories ?? '—'} unit={macros?.calories ? 'kcal' : ''} label="Calorie target"
            sub={macros ? `${macros.protein_g}g P · ${macros.carbs_g}g C` : null} />
          <MetricCard value={`${adherencePct}%`} label="Adherence (30d)"
            sub={adherencePct >= 80 ? 'On track' : adherencePct >= 50 ? 'Needs focus' : 'Needs attention'}
            subColor={adherencePct >= 80 ? C.green : adherencePct >= 50 ? C.amber : C.red} />
        </div>
      </section>

      <section style={CARD}>
        <p style={SL}>Goal progress</p>
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Weight loss</span>
            <span style={{ fontSize: 11, color: C.sub }}>{startWeight ?? '?'} → {targetWeight ?? '?'} kg</span>
          </div>
          <AnimBar pct={weightLossPct} color={C.blue} />
          {weightLost != null ? (
            <p style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>
              <span style={{ color: C.green, fontWeight: 600 }}>{weightLost} kg lost</span>
              {targetWeight && currentWeight ? ` · ${(parseFloat(currentWeight) - parseFloat(targetWeight)).toFixed(1)} kg remaining` : ''}
            </p>
          ) : <p style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>No weight data yet</p>}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Workout adherence</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.teal }}>{adherencePct}%</span>
          </div>
          <AnimBar pct={adherencePct} color={C.teal} />
        </div>
      </section>

      <section style={CARD}>
        <p style={SL}>Recent workouts</p>
        {recentLogs.length === 0 ? (
          <p style={{ fontSize: 13, color: C.sub, textAlign: 'center', padding: '16px 0' }}>No workouts logged yet</p>
        ) : recentLogs.map((log, i) => {
          const dateStr = new Date(log.completed_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const name = log.plan_day_name || log.name || 'Workout';
          const muscle = log.exercises?.slice(0, 2).map(e => e.name || e.exercise_name).join(' + ') || '';
          return (
            <div key={log.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 11, paddingBottom: 11, minHeight: 44 }}>
                <IcoCheck />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{name}</div>
                  {muscle && <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{muscle}</div>}
                </div>
                <span style={{ fontSize: 11, color: C.sub, whiteSpace: 'nowrap' }}>{dateStr}</span>
              </div>
              {i < recentLogs.length - 1 && <div style={{ height: 1, background: C.border }} />}
            </div>
          );
        })}
      </section>

      <section>
        <SectionHeading label="Trainer notes" action="+ Add note" onAction={onAddNote} />
        {allNotes.length === 0 ? (
          <div style={{ ...CARD, textAlign: 'center', padding: '24px' }}>
            <p style={{ fontSize: 13, color: C.sub }}>No notes yet — tap + Add note</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allNotes.map((note, i) => (
              <NoteCard key={i} accent={i % 2 === 0 ? C.blue : C.green}
                text={note.text || note.content || note}
                date={note.date || note.created_at
                  ? new Date(note.date || note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : ''} />
            ))}
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <button onClick={() => navigate(`/trainer/assign-plan?clientId=${clientId}`)}
          style={{ height: 44, borderRadius: 8, border: 'none', background: C.text, color: "var(--bg-card)", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Assign plan
        </button>
        <button onClick={() => navigate('/trainer/chat')}
          style={{ height: 44, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Message
        </button>
        <button onClick={onAddNote}
          style={{ height: 44, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Note
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   WORKOUTS TAB
──────────────────────────────────────────── */
function WorkoutsTab({ data, clientId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activePlan, setActivePlan] = useState(null);
  const [weekLogs, setWeekLogs] = useState([]);
  const [openDays, setOpenDays] = useState([0]);
  const [showExPicker, setShowExPicker] = useState(false);
  const [pickerDayIdx, setPickerDayIdx] = useState(0);
  const [exSearch, setExSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [showAIDietBuilder, setShowAIDietBuilder] = useState(false);
  const clientName = data?.client?.full_name;

  // Monday-based week
  const today = new Date();
  const weekStart = getMondayOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      // fetch active workout plan
      try {
        const plans = await apiFetch(`/api/trainer/assigned-plans/${clientId}`);
        const active = (plans || []).find(p => p.status === 'active' && p.type === 'workout')
          || (plans || []).find(p => p.status === 'active');
        setActivePlan(active || null);
      } catch {
        setActivePlan(data?.assignedPlans?.find(p => p.status === 'active' && p.type === 'workout') || null);
      }
      // fetch this week's logs
      try {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const logs = await apiFetch(
          `/api/workout-logs?userId=${clientId}&from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`
        );
        setWeekLogs(logs || []);
      } catch {
        setWeekLogs((data?.workoutLogs || []).filter(w => new Date(w.completed_at || w.started_at) >= weekStart));
      }
      setLoading(false);
    })();
  }, [clientId]);

  const planDays = activePlan?.plan_data?.days || activePlan?.days || activePlan?.workout_days || [];

  // dates with a log this week
  const loggedDates = new Set(weekLogs.map(l => {
    const d = new Date(l.completed_at || l.started_at);
    return isoDate(d);
  }));

  const todayISO = isoDate(today);
  const doneSessions = weekDays.filter(d => loggedDates.has(isoDate(d))).length;
  const passedDays = weekDays.filter(d => isoDate(d) <= todayISO).length;
  const adherencePct = passedDays > 0 ? Math.round((doneSessions / passedDays) * 100) : 0;

  const weeksAssigned = activePlan?.starts_at
    ? Math.max(1, Math.ceil((Date.now() - new Date(activePlan.starts_at)) / (7 * 86400000)))
    : null;
  const totalWeeks = activePlan?.ends_at
    ? Math.ceil((new Date(activePlan.ends_at) - new Date(activePlan.starts_at)) / (7 * 86400000))
    : 12;

  const toggleDay = (i) =>
    setOpenDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);

  // exercise picker search
  const pickerResults = exSearch.trim().length > 0
    ? searchExercises(exSearch, {}).slice(0, 20)
    : [];

  const addExerciseToPlan = async (exercise) => {
    if (!activePlan?.template_id) return;
    const updatedDays = planDays.map((day, i) =>
      i === pickerDayIdx
        ? { ...day, exercises: [...(day.exercises || []), { name: exercise.name, sets: 3, reps: '8–12' }] }
        : day
    );
    try {
      await apiFetch(`/api/trainer/templates/${activePlan.template_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ plan_data: { days: updatedDays } }),
      });
      setActivePlan(prev => ({ ...prev, plan_data: { days: updatedDays } }));
    } catch (err) {
      console.error('Add exercise error:', err);
    }
    setShowExPicker(false);
    setExSearch('');
  };

  return (
    <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>

      {/* ── active plan banner ── */}
      {activePlan ? (
        <div style={{ ...CARD, borderLeft: `3px solid ${C.blue}`, paddingLeft: 13 }}>
          <p style={{ ...SL, marginBottom: 6 }}>Current plan</p>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            {activePlan.name || activePlan.template_name || 'Workout Plan'}
          </div>
          {activePlan.starts_at && (
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>
              Assigned {new Date(activePlan.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {weeksAssigned ? ` · Week ${weeksAssigned} of ${totalWeeks}` : ''}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => activePlan.template_id && navigate(`/trainer/templates/${activePlan.template_id}/edit`)}
              style={{ height: 36, paddingInline: 14, borderRadius: 8, border: `1.5px solid ${C.border}`, background: 'transparent', fontSize: 12, fontWeight: 600, color: C.text, cursor: 'pointer' }}>
              Edit plan
            </button>
            <button
              onClick={() => navigate(`/trainer/assign-plan?clientId=${clientId}&replace=true`)}
              style={{ height: 36, paddingInline: 14, borderRadius: 8, border: `1.5px solid ${C.border}`, background: 'transparent', fontSize: 12, fontWeight: 600, color: C.text, cursor: 'pointer' }}>
              Replace plan
            </button>
          </div>
        </div>
      ) : (
        <div style={{ ...CARD, textAlign: 'center', padding: '32px' }}>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: C.sub }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11M6.5 17.5h11M4 8.5v7M9 5.5v13M15 5.5v13M20 8.5v7"/></svg>
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>No active workout plan</p>
          <button
            onClick={() => navigate(`/trainer/assign-plan?clientId=${clientId}&type=workout`)}
            style={{ marginTop: 8, height: 36, paddingInline: 16, borderRadius: 8, border: 'none', background: C.text, color: "var(--bg-card)", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Assign plan
          </button>
        </div>
      )}

      {/* ── build AI plan for client ── */}
      <button
        onClick={() => setShowAIBuilder(true)}
        style={{
          width: '100%', height: 48, borderRadius: 10,
          border: `1.5px solid ${C.border}`, background: 'transparent',
          fontSize: 14, fontWeight: 600, color: C.text, cursor: 'pointer',
        }}>
        Build AI Plan for {clientName || 'Client'}
      </button>
      {showAIBuilder && (
        <AIPlanGenerator
          onClose={() => setShowAIBuilder(false)}
          clientUserId={clientId}
          clientName={clientName}
        />
      )}

      {/* ── build AI diet plan for client ── */}
      <button
        onClick={() => setShowAIDietBuilder(true)}
        style={{
          width: '100%', height: 48, borderRadius: 10,
          border: `1.5px solid ${C.border}`, background: 'transparent',
          fontSize: 14, fontWeight: 600, color: C.text, cursor: 'pointer',
        }}>
        Build AI Diet Plan for {clientName || 'Client'}
      </button>
      {showAIDietBuilder && (
        <AIDietPlanGenerator
          onClose={() => setShowAIDietBuilder(false)}
          clientUserId={clientId}
          clientName={clientName}
        />
      )}

      {/* ── weekly adherence strip ── */}
      <section style={CARD}>
        <p style={SL}>This week</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          {weekDays.map((d, i) => {
            const iso = isoDate(d);
            const isFuture = iso > todayISO;
            const isToday = iso === todayISO;
            const done = loggedDates.has(iso);
            const missed = !isFuture && !isToday && !done;

            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 10, color: isToday ? C.text : C.sub, fontWeight: isToday ? 700 : 400 }}>
                  {DAY_LABELS[i]}
                </span>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: done ? C.greenBg : missed ? C.redBg : 'transparent',
                  border: done ? 'none' : missed ? 'none' : `0.5px solid var(--border-strong)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {missed && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: C.sub }}>
          <span style={{ fontWeight: 600, color: C.text }}>{doneSessions}</span> of {passedDays} sessions done
          {passedDays > 0 && <span> · <span style={{ color: adherencePct >= 80 ? C.green : C.amber, fontWeight: 600 }}>{adherencePct}% adherence</span></span>}
        </p>
      </section>

      {/* ── plan days accordion ── */}
      {planDays.length > 0 ? (
        <section>
          <p style={SL}>Plan days</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {planDays.map((day, i) => {
              const isOpen = openDays.includes(i);
              const exCount = (day.exercises || []).length;
              // check if this day was missed (rough heuristic: no log on the corresponding weekday)
              const weekDayForPlan = weekDays[i % 7];
              const dayIsMissed = weekDayForPlan && isoDate(weekDayForPlan) < todayISO && !loggedDates.has(isoDate(weekDayForPlan));

              return (
                <div key={i} style={{
                  ...CARD, padding: 0, overflow: 'hidden',
                  background: dayIsMissed ? 'var(--error-bg)' : C.card,
                }}>
                  <button
                    onClick={() => toggleDay(i)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left', minHeight: 44,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
                        {day.name || day.day_name || `Day ${i + 1}`}
                      </div>
                      {day.muscles && (
                        <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                          {Array.isArray(day.muscles) ? day.muscles.join(', ') : day.muscles}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: C.sub,
                      background: C.grayBg, borderRadius: 20, padding: '2px 8px',
                      flexShrink: 0,
                    }}>{exCount} ex</span>
                    <IcoChevron open={isOpen} />
                  </button>

                  {isOpen && exCount > 0 && (
                    <div style={{ borderTop: `0.5px solid rgba(0,0,0,0.06)` }}>
                      {(day.exercises || []).map((ex, j) => (
                        <div key={j} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0 14px', minHeight: 40,
                          borderTop: j > 0 ? `0.5px solid rgba(0,0,0,0.06)` : 'none',
                        }}>
                          <span style={{ fontSize: 13, color: C.text }}>{ex.name || ex.exercise_name || 'Exercise'}</span>
                          <span style={{ fontSize: 12, color: C.sub, fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : ex.sets ? `${ex.sets} sets` : ''}
                            {ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}
                          </span>
                        </div>
                      ))}
                      <button
                        onClick={() => { setPickerDayIdx(i); setShowExPicker(true); }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 6, padding: '10px 14px', background: 'none', border: 'none',
                          borderTop: `0.5px solid rgba(0,0,0,0.06)`, cursor: 'pointer',
                          fontSize: 12, fontWeight: 600, color: C.blue,
                        }}>
                        <IcoPlus /> Add exercise
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : !loading && (
        <section>
          <p style={SL}>Recent sessions</p>
          {(data?.workoutLogs || []).length === 0 ? (
            <EmptyState text="No workouts logged yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...(data?.workoutLogs || [])]
                .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
                .slice(0, 6)
                .map(log => (
                  <div key={log.id} style={CARD}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                          {log.plan_day_name || new Date(log.completed_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                          {log.duration_minutes ? `${log.duration_minutes} min` : ''}
                          {log.exercises?.length ? ` · ${log.exercises.length} exercises` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, borderRadius: 20, padding: '3px 9px' }}>Done</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* ── floating add button ── */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)', maxWidth: 480, zIndex: 40,
      }}>
        <button
          onClick={() => { setPickerDayIdx(0); setShowExPicker(true); }}
          style={{
            width: '100%', height: 48, borderRadius: 12, border: 'none',
            background: "var(--text-primary)", color: "var(--bg-card)",
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}>
          <IcoPlus /> Add exercise to plan
        </button>
      </div>

      {/* ── exercise picker sheet ── */}
      {showExPicker && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={e => { if (e.target === e.currentTarget) { setShowExPicker(false); setExSearch(''); } }}>
          <div style={{
            background: C.card, borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 520, maxHeight: '75vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 -4px 30px rgba(0,0,0,0.12)',
          }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: `0.5px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                  Add to {planDays[pickerDayIdx]?.name || `Day ${pickerDayIdx + 1}`}
                </span>
                <button onClick={() => { setShowExPicker(false); setExSearch(''); }}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.sub }}>×</button>
              </div>
              <input
                value={exSearch}
                onChange={e => setExSearch(e.target.value)}
                placeholder="Search exercises…"
                autoFocus
                style={{
                  width: '100%', height: 40, borderRadius: 10, border: `1px solid ${C.border}`,
                  padding: '0 12px', fontSize: 14, color: C.text, background: C.bg,
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {exSearch.trim().length === 0 ? (
                <p style={{ fontSize: 13, color: C.sub, textAlign: 'center', padding: '24px' }}>Type to search exercises</p>
              ) : pickerResults.length === 0 ? (
                <p style={{ fontSize: 13, color: C.sub, textAlign: 'center', padding: '24px' }}>No exercises found</p>
              ) : pickerResults.map((ex, i) => (
                <button key={i} onClick={() => addExerciseToPlan(ex)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'none', border: 'none',
                  borderBottom: `0.5px solid ${C.border}`, cursor: 'pointer', textAlign: 'left',
                  minHeight: 48,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{ex.primaryMuscle || ex.muscle}</div>
                  </div>
                  <span style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>Add</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   DIET TAB
──────────────────────────────────────────── */
const MEAL_LABELS = { breakfast: 'AM', lunch: 'PM', snack: 'SN', dinner: 'DIN', other: '—' };

function DietTab({ data, clientId }) {
  const navigate = useNavigate();
  const [dietPlan, setDietPlan] = useState(null);
  const [assignedDietPlan, setAssignedDietPlan] = useState(undefined); // new API plan
  const [removingPlan, setRemovingPlan] = useState(false);
  const [macros, setMacros] = useState(data?.macros || null);
  const [foodLogs, setFoodLogs] = useState(data?.foodLogs || []);
  const [openDay, setOpenDay] = useState('today');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      // Old diet plan (legacy)
      try {
        const plans = await apiFetch(`/api/trainer/assigned-plans/${clientId}`);
        setDietPlan((plans || []).find(p => p.status === 'active' && p.type === 'diet') || null);
      } catch {
        setDietPlan(data?.assignedPlans?.find(p => p.status === 'active' && p.type === 'diet') || null);
      }
      // New structured diet plan
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/diet-plans/assigned/${clientId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const plan = res.ok ? await res.json() : null;
        setAssignedDietPlan(plan || null);
      } catch {
        setAssignedDietPlan(null);
      }
      try {
        const logs = await apiFetch(`/api/food-logs/${clientId}`);
        if (logs?.length) setFoodLogs(logs);
      } catch {}
      try {
        const m = await apiFetch(`/api/macros/${clientId}`);
        if (m) setMacros(prev => ({ ...prev, ...m }));
      } catch {}
    })();
  }, [clientId]);

  const handleRemovePlan = async () => {
    if (!assignedDietPlan?.id) return;
    if (!confirm('Remove this diet plan? The client will no longer see it.')) return;
    setRemovingPlan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch(`${import.meta.env.VITE_API_URL}/api/diet-plans/assigned/${assignedDietPlan.id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      setAssignedDietPlan(null);
    } catch (err) {
      alert('Failed to remove plan');
    } finally {
      setRemovingPlan(false);
    }
  };

  // Build byDate map
  const byDate = foodLogs.reduce((acc, log) => {
    const d = log.log_date;
    if (!d) return acc;
    if (!acc[d]) acc[d] = { total: 0, items: [] };
    acc[d].total += (log.calories || 0);
    acc[d].items.push(log);
    return acc;
  }, {});

  // Last 7 days bar chart
  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const date = isoDate(d);
    const isFuture = date > isoDate(today);
    return {
      label: d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 3),
      date,
      calories: byDate[date]?.total || 0,
      isFuture,
    };
  });

  const calTarget = macros?.calories || macros?.calorie_target || 0;
  const proteinTarget = macros?.protein_g || macros?.protein_target || 0;
  const carbsTarget = macros?.carbs_g || macros?.carbs_target || 0;
  const fatTarget = macros?.fat_g || macros?.fat_target || 0;

  // Avg for ring
  const logsWithDates = last7.filter(d => d.calories > 0);
  const daysLogged = logsWithDates.length || 1;
  const avgCal = Math.round(logsWithDates.reduce((s, d) => s + d.calories, 0) / daysLogged);
  const allLogs7 = foodLogs.filter(l => {
    const d = new Date(l.log_date);
    return (today - d) / 86400000 <= 7;
  });
  const daysTracked = new Set(allLogs7.map(l => l.log_date)).size || 1;
  const avgProtein = allLogs7.reduce((s, l) => s + (l.protein_g || 0), 0) / daysTracked;
  const avgCarbs = allLogs7.reduce((s, l) => s + (l.carbs_g || 0), 0) / daysTracked;
  const avgFat = allLogs7.reduce((s, l) => s + (l.fat_g || 0), 0) / daysTracked;

  const ringData = proteinTarget > 0 ? [
    { name: 'Fat', value: fatTarget > 0 ? Math.min(100, Math.round((avgFat / fatTarget) * 100)) : 0, fill: C.coral },
    { name: 'Carbs', value: carbsTarget > 0 ? Math.min(100, Math.round((avgCarbs / carbsTarget) * 100)) : 0, fill: '#BA7517' },
    { name: 'Protein', value: proteinTarget > 0 ? Math.min(100, Math.round((avgProtein / proteinTarget) * 100)) : 0, fill: C.blue },
  ] : [];

  // On-target days (within ±100 kcal)
  const onTargetDays = calTarget > 0 ? last7.filter(d => d.calories > 0 && Math.abs(d.calories - calTarget) <= 100).length : 0;
  const loggedDays7 = last7.filter(d => d.calories > 0).length;

  // Last 3 days for food log section
  const last3 = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return isoDate(d);
  });

  const dayLabel = (dateStr) => {
    const td = isoDate(today);
    const yd = isoDate(new Date(today.getTime() - 86400000));
    if (dateStr === td) return 'Today';
    if (dateStr === yd) return 'Yesterday';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const dayStatus = (dateStr) => {
    const entry = byDate[dateStr];
    if (!entry) return 'none';
    if (calTarget > 0 && entry.total > calTarget + 100) return 'over';
    return 'ok';
  };

  return (
    <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── assigned diet plan (new API) ── */}
      {assignedDietPlan !== undefined && (
        <section style={CARD}>
          <p style={SL}>Diet plan</p>
          {assignedDietPlan ? (
            <>
              <AssignedDietPlanView plan={assignedDietPlan} />
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => navigate(`/trainer/client/${clientId}/diet-plan/new`)}
                  style={{ flex: 1, height: 36, border: '0.5px solid var(--border)', borderRadius: 8, background: 'transparent', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  Replace Plan
                </button>
                <button
                  onClick={handleRemovePlan}
                  disabled={removingPlan}
                  style={{ height: 36, padding: '0 14px', border: '0.5px solid var(--border)', borderRadius: 8, background: 'transparent', fontSize: 13, cursor: 'pointer', color: 'var(--error)', opacity: removingPlan ? 0.5 : 1 }}
                >
                  {removingPlan ? '…' : 'Remove'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 10px' }}>No diet plan assigned</p>
              <button
                onClick={() => navigate(`/trainer/client/${clientId}/diet-plan/new`)}
                style={{ padding: '10px 20px', background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Assign Diet Plan
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── macro ring card ── */}
      <section style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p style={SL}>Today's macros</p>

        {ringData.length > 0 ? (
          <>
            <div style={{ position: 'relative', width: 200, height: 200 }}>
              <RadialBarChart
                width={200} height={200}
                innerRadius={55} outerRadius={90}
                data={ringData} startAngle={90} endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'var(--bg-pill)' }} />
              </RadialBarChart>
              {/* center overlay */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none',
              }}>
                <div style={{ fontSize: 22, fontWeight: 500, color: C.text, lineHeight: 1 }}>{avgCal}</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>
                  {calTarget > 0 ? `of ${calTarget} target` : 'kcal'}
                </div>
              </div>
            </div>

            {/* pill labels */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-bg)', borderRadius: 20, padding: '3px 10px' }}>
                Protein {avgProtein.toFixed(0)}g
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', background: 'var(--warning-bg)', borderRadius: 20, padding: '3px 10px' }}>
                Carbs {avgCarbs.toFixed(0)}g
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--error)', background: 'var(--error-bg)', borderRadius: 20, padding: '3px 10px' }}>
                Fat {avgFat.toFixed(0)}g
              </span>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: C.sub, padding: '16px 0' }}>No macro targets set</p>
        )}
      </section>

      {/* ── 7-day calorie bar chart ── */}
      <section style={CARD}>
        <p style={SL}>7-day calories</p>
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={22}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: C.sub }} axisLine={false} tickLine={false}
                ticks={calTarget > 0 ? [Math.round(calTarget * 0.8), calTarget, Math.round(calTarget * 1.2)] : undefined}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, background: 'var(--chart-tooltip-bg)', border: `0.5px solid ${C.border}`, color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
                formatter={(v) => v > 0 ? [`${v} kcal`, 'Calories'] : ['No log', '']}
              />
              {calTarget > 0 && (
                <ReferenceLine y={calTarget} stroke={C.blue} strokeDasharray="3 3" strokeWidth={1.5}
                  label={{ value: 'target', position: 'insideTopRight', fontSize: 10, fill: C.blue }} />
              )}
              <Bar dataKey="calories" radius={[3, 3, 0, 0]}
                fill="var(--chart-line)" fillOpacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p style={{ fontSize: 12, color: C.sub, marginTop: 6 }}>
          Avg {avgCal} kcal
          {calTarget > 0 && loggedDays7 > 0 && ` · on target ${onTargetDays}/${loggedDays7} days`}
        </p>
      </section>

      {/* ── assigned diet plan card ── */}
      {dietPlan && (
        <section style={{ ...CARD, borderLeft: `3px solid ${C.teal}`, paddingLeft: 13 }}>
          <p style={{ ...SL, marginBottom: 6 }}>Current diet plan</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                {dietPlan.name || dietPlan.template_name || 'Diet Plan'}
              </div>
              {(proteinTarget > 0 || carbsTarget > 0 || fatTarget > 0) && (
                <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>
                  Protein {proteinTarget}g · Carbs {carbsTarget}g · Fat {fatTarget}g
                </div>
              )}
              {dietPlan.starts_at && (
                <div style={{ fontSize: 12, color: C.sub }}>
                  Assigned {new Date(dietPlan.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>
            <button
              onClick={() => dietPlan.template_id && navigate(`/trainer/diet-templates/${dietPlan.template_id}/edit`)}
              style={{ height: 32, paddingInline: 12, borderRadius: 8, border: `1.5px solid ${C.border}`, background: 'transparent', fontSize: 12, fontWeight: 600, color: C.text, cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>
              Edit plan
            </button>
          </div>
        </section>
      )}

      {/* ── recent food logs ── */}
      <section>
        <p style={SL}>Recent logs</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {last3.map(dateStr => {
            const entry = byDate[dateStr];
            const isOpen = openDay === dateStr;
            const status = dayStatus(dateStr);
            const isToday = dateStr === isoDate(today);

            return (
              <div key={dateStr} style={CARD}>
                <button
                  onClick={() => setOpenDay(isOpen && !isToday ? null : dateStr)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, minHeight: 44, textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.text, flex: 1 }}>
                    {dayLabel(dateStr)}
                  </span>
                  {entry && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                      {entry.total.toLocaleString()} kcal
                    </span>
                  )}
                  {/* status indicator */}
                  {status === 'ok' && (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                  {status === 'over' && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.amber, flexShrink: 0 }} />
                  )}
                  {status === 'none' && (
                    <span style={{ fontSize: 16, color: 'var(--text-disabled)', flexShrink: 0 }}>—</span>
                  )}
                  {entry && <IcoChevron open={isOpen} />}
                </button>

                {/* expanded meal rows */}
                {isOpen && entry && entry.items.length > 0 && (
                  <div style={{ borderTop: `0.5px solid rgba(0,0,0,0.06)`, marginTop: 8, paddingTop: 4 }}>
                    {entry.items.map((item, i) => {
                      const mType = (item.meal_type || '').toLowerCase();
                      const icon = MEAL_LABELS[mType] || MEAL_LABELS.other;
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          minHeight: 40, borderTop: i > 0 ? `0.5px solid rgba(0,0,0,0.06)` : 'none',
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', flexShrink: 0, minWidth: 24, textAlign: 'center' }}>{icon}</span>
                          <span style={{ flex: 1, fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.food_name || item.name || 'Food item'}
                          </span>
                          <span style={{ fontSize: 12, color: C.sub, fontWeight: 500, flexShrink: 0 }}>
                            {item.calories} kcal
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {last3.every(d => !byDate[d]) && (
            <EmptyState text="No food logs this week" />
          )}
        </div>
      </section>

      {/* ── quick actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => navigate(`/trainer/assign-plan?type=diet&clientId=${clientId}`)}
          style={{ width: '100%', height: 48, borderRadius: 10, border: 'none', background: C.text, color: "var(--bg-card)", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Update diet plan
        </button>
        <button
          onClick={() => navigate(`/trainer/chat?clientId=${clientId}&prefill=diet`)}
          style={{ width: '100%', height: 48, borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Message about diet
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   PROGRESS TAB
──────────────────────────────────────────── */
function ProgressTab({ data, clientId }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState('1M');
  const [entries, setEntries] = useState(data?.progressEntries || []);
  const [photos, setPhotos] = useState(data?.progressPhotos || []);
  const [prs, setPrs] = useState(data?.personalRecords || []);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [measureForm, setMeasureForm] = useState({
    weight_kg: '', chest_cm: '', waist_cm: '', hips_cm: '',
    thighs_cm: '', arms_cm: '', calves_cm: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        const prog = await apiFetch(`/api/progress/${clientId}`);
        if (prog?.entries?.length) setEntries(prog.entries);
        if (prog?.photos?.length) setPhotos(prog.photos);
        if (prog?.prs?.length) setPrs(prog.prs);
      } catch {}
    })();
  }, [clientId]);

  // Filter by period
  const now = Date.now();
  const periodMs = { '1M': 30, '3M': 90, '6M': 180 };
  const filtered = entries.filter(e => {
    if (period === 'All time') return true;
    return (now - new Date(e.created_at)) / 86400000 <= periodMs[period];
  });

  const weightData = [...filtered]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(e => ({
      date: new Date(e.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      weight: parseFloat(e.weight_kg || e.weight || e.current_weight) || null,
    }))
    .filter(e => e.weight);

  const startW = weightData[0]?.weight;
  const currW = weightData[weightData.length - 1]?.weight;
  const change = startW && currW ? (currW - startW).toFixed(1) : null;
  const goalW = data?.client?.target_weight;

  // Linear regression for estimate
  let estCompletion = null;
  if (weightData.length >= 3 && goalW && change !== null) {
    const n = weightData.length;
    const xs = Array.from({ length: n }, (_, i) => i);
    const ys = weightData.map(d => d.weight);
    const mx = xs.reduce((s, x) => s + x, 0) / n;
    const my = ys.reduce((s, y) => s + y, 0) / n;
    const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) /
      xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    if (slope < 0 && parseFloat(goalW) < currW) {
      const intercept = my - slope * mx;
      const stepsToGoal = (parseFloat(goalW) - intercept) / slope;
      const daysPerStep = 7; // assume weekly entries
      const daysLeft = Math.max(0, (stepsToGoal - (n - 1)) * daysPerStep);
      const est = new Date(Date.now() + daysLeft * 86400000);
      estCompletion = est.toLocaleDateString('en', { month: 'long', year: 'numeric' });
    }
  }

  // Latest entry for measurements
  const latest = [...entries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const measurements = [
    { label: 'Chest', value: latest?.chest_cm },
    { label: 'Waist', value: latest?.waist_cm },
    { label: 'Hips', value: latest?.hips_cm },
    { label: 'Thighs', value: latest?.thighs_cm },
    { label: 'Arms', value: latest?.arms_cm },
    { label: 'Calves', value: latest?.calves_cm },
  ];

  const saveMeasurements = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/progress/${clientId}`, {
        method: 'POST',
        body: JSON.stringify({ user_id: clientId, ...measureForm }),
      });
      setShowMeasurementModal(false);
    } catch (err) {
      console.error('Save measurements error:', err);
    } finally {
      setSaving(false);
    }
  };

  const PERIODS = ['1M', '3M', '6M', 'All time'];

  return (
    <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── time filter pills ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            height: 32, paddingInline: 16, borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            border: period === p ? 'none' : `0.5px solid var(--border-strong)`,
            background: period === p ? "var(--text-primary)" : 'transparent',
            color: period === p ? "var(--bg-card)" : "var(--text-tertiary)",
          }}>{p}</button>
        ))}
      </div>

      {/* ── weight trend chart ── */}
      <section style={CARD}>
        <p style={SL}>Weight trend</p>
        {weightData.length < 2 ? (
          <p style={{ fontSize: 13, color: C.sub, textAlign: 'center', padding: '20px 0' }}>
            {weightData.length === 0 ? 'No weight data yet' : 'Need more check-ins for a trend'}
          </p>
        ) : (
          <>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData} margin={{ top: 4, right: 4, left: -5, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} tickLine={false} axisLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} tickLine={false} axisLine={false} width={35} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, background: 'var(--chart-tooltip-bg)', border: `0.5px solid var(--border)`, borderRadius: 8, color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(v) => [`${v} kg`, 'Weight']}
                  />
                  <Line type="monotone" dataKey="weight" stroke={C.blue} strokeWidth={2}
                    dot={false} activeDot={{ r: 5, fill: C.blue }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {startW && <span style={{ fontSize: 12, color: C.sub }}>Started {startW}kg</span>}
              {goalW && <span style={{ fontSize: 12, color: C.sub }}>· Goal {goalW}kg</span>}
              {change !== null && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: parseFloat(change) < 0 ? C.green : C.amber,
                  background: parseFloat(change) < 0 ? C.greenBg : C.amberBg,
                  borderRadius: 20, padding: '2px 8px',
                }}>
                  {parseFloat(change) < 0 ? '↓' : '↑'} {Math.abs(parseFloat(change))} kg
                </span>
              )}
              {estCompletion && <span style={{ fontSize: 12, color: C.sub }}>· Est. {estCompletion}</span>}
            </div>
          </>
        )}
      </section>

      {/* ── body measurements ── */}
      <section style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ ...SL, marginBottom: 0 }}>Body measurements</p>
          {latest?.created_at && (
            <span style={{ fontSize: 11, color: C.sub }}>
              Last updated {new Date(latest.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {measurements.map((m, i) => (
            <div key={m.label} style={{
              padding: '12px 10px',
              borderRight: i % 3 < 2 ? `0.5px solid rgba(0,0,0,0.08)` : 'none',
              borderBottom: i < 3 ? `0.5px solid rgba(0,0,0,0.08)` : 'none',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: C.text, lineHeight: 1 }}>
                {m.value ?? '—'}{m.value ? ' cm' : ''}
              </div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── progress photos ── */}
      <section>
        <p style={SL}>Progress photos</p>
        {photos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {photos.slice(0, 6).map(photo => (
              <div key={photo.id} style={{ position: 'relative', paddingBottom: '125%', borderRadius: 8, overflow: 'hidden' }}>
                <img
                  src={photo.photo_url || photo.url}
                  alt="Progress"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.45)', padding: '4px 8px',
                  borderRadius: '0 0 8px 8px',
                }}>
                  <span style={{ color: "var(--bg-card)", fontSize: 11 }}>
                    {new Date(photo.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            border: '1.5px dashed var(--border-strong)', borderRadius: 8,
            padding: 32, textAlign: 'center',
          }}>
            <IcoCamera />
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 8 }}>No photos yet</p>
          </div>
        )}
      </section>

      {/* ── personal records ── */}
      {prs.length > 0 && (
        <section style={CARD}>
          <p style={SL}>Personal records</p>
          {prs.slice(0, 4).map((pr, i) => (
            <div key={pr.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              minHeight: 44,
              borderTop: i > 0 ? `0.5px solid rgba(0,0,0,0.06)` : 'none',
            }}>
              <IcoTrophy />
              <span style={{ flex: 1, fontSize: 13, color: C.text }}>
                {pr.exercise_name || pr.exercise}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                {pr.weight_kg}kg × {pr.reps}
              </span>
              <span style={{ fontSize: 11, color: C.sub, minWidth: 50, textAlign: 'right' }}>
                {pr.achieved_at ? new Date(pr.achieved_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ── update measurements button ── */}
      <button
        onClick={() => setShowMeasurementModal(true)}
        style={{
          width: '100%', height: 48, borderRadius: 10,
          border: `1.5px solid ${C.border}`, background: 'transparent',
          fontSize: 14, fontWeight: 600, color: C.text, cursor: 'pointer',
        }}>
        + Update measurements
      </button>

      {/* ── measurement modal ── */}
      {showMeasurementModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
        }} onClick={e => { if (e.target === e.currentTarget) setShowMeasurementModal(false); }}>
          <div style={{
            background: C.card, borderRadius: '20px 20px 0 0',
            padding: '20px 20px 40px', width: '100%', maxWidth: 520,
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Update measurements</span>
              <button onClick={() => setShowMeasurementModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.sub }}>×</button>
            </div>
            {[
              { key: 'weight_kg', label: 'Weight', unit: 'kg' },
              { key: 'chest_cm', label: 'Chest', unit: 'cm' },
              { key: 'waist_cm', label: 'Waist', unit: 'cm' },
              { key: 'hips_cm', label: 'Hips', unit: 'cm' },
              { key: 'thighs_cm', label: 'Thighs', unit: 'cm' },
              { key: 'arms_cm', label: 'Arms', unit: 'cm' },
              { key: 'calves_cm', label: 'Calves', unit: 'cm' },
            ].map(({ key, label, unit }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: C.sub, display: 'block', marginBottom: 4 }}>{label} ({unit})</label>
                <input
                  type="number"
                  value={measureForm[key]}
                  onChange={e => setMeasureForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`e.g. ${key === 'weight_kg' ? '65.5' : '80'}`}
                  style={{
                    width: '100%', height: 44, borderRadius: 10, border: `1px solid ${C.border}`,
                    padding: '0 12px', fontSize: 14, color: C.text, background: C.bg,
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowMeasurementModal(false)} style={{
                flex: 1, height: 48, borderRadius: 10, border: `1.5px solid ${C.border}`,
                background: 'transparent', fontSize: 14, fontWeight: 600, color: C.sub, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={saveMeasurements} disabled={saving} style={{
                flex: 1, height: 48, borderRadius: 10, border: 'none',
                background: C.text, color: "var(--bg-card)", fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
              }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   PLANS TAB
──────────────────────────────────────────── */
function PlansTab({ data, clientId }) {
  const navigate = useNavigate();
  const [planType, setPlanType] = useState('workout');
  const [plans, setPlans] = useState(data?.assignedPlans || []);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [expandedPast, setExpandedPast] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    apiFetch(`/api/trainer/assigned-plans/${clientId}`)
      .then(p => { if (p?.length) setPlans(p); })
      .catch(() => {});
  }, [clientId]);

  const displayed = plans.filter(p => p.type === planType);
  const activePlan = displayed.find(p => p.status === 'active');
  const pastPlans = displayed
    .filter(p => p.status !== 'active')
    .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));

  // Week calculation
  const weeksAssigned = activePlan?.starts_at
    ? Math.max(1, Math.ceil((Date.now() - new Date(activePlan.starts_at)) / (7 * 86400000)))
    : 0;
  const totalWeeks = activePlan?.ends_at
    ? Math.ceil((new Date(activePlan.ends_at) - new Date(activePlan.starts_at)) / (7 * 86400000))
    : 12;
  const progressPct = Math.min(Math.round((weeksAssigned / totalWeeks) * 100), 100);

  const barColor = planType === 'workout' ? '#B5D4F4' : '#9FE1CB';

  const planDateRange = (plan) => {
    const start = plan.starts_at
      ? new Date(plan.starts_at).toLocaleDateString('en', { month: 'short', year: '2-digit' })
      : '?';
    const end = plan.ends_at
      ? new Date(plan.ends_at).toLocaleDateString('en', { month: 'short', year: '2-digit' })
      : 'Present';
    return `${start}–${end}`;
  };

  const planDays = viewingPlan?.plan_data?.days || viewingPlan?.days || [];

  return (
    <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── type toggle ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {['workout', 'diet'].map(t => (
          <button key={t} onClick={() => setPlanType(t)} style={{
            height: 36, paddingInline: 16, borderRadius: 20, cursor: 'pointer',
            fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
            border: planType === t ? 'none' : `0.5px solid var(--border-strong)`,
            background: planType === t ? "var(--text-primary)" : 'transparent',
            color: planType === t ? "var(--bg-card)" : "var(--text-secondary)",
          }}>{t}</button>
        ))}
      </div>

      {/* ── active plan card ── */}
      {activePlan ? (
        <div style={{ ...CARD, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: C.text, marginBottom: 6 }}>
                {activePlan.name || activePlan.template_name || `${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: C.blueBg, borderRadius: 20, padding: '2px 9px' }}>
                {planType.charAt(0).toUpperCase() + planType.slice(1)}
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, borderRadius: 20, padding: '3px 9px', flexShrink: 0, marginLeft: 8 }}>
              Active
            </span>
          </div>

          <div style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>
            {activePlan.starts_at
              ? `Assigned ${new Date(activePlan.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : ''} · Week {weeksAssigned} of {totalWeeks}
          </div>

          {/* progress bar */}
          <div style={{ height: 6, background: 'var(--bg-pill)', borderRadius: 9999, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: barColor, borderRadius: 9999, transition: 'width 0.6s' }} />
          </div>

          {/* action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setViewingPlan(activePlan)}
              style={{ flex: 1, height: 36, borderRadius: 8, border: `1.5px solid ${C.border}`, background: 'transparent', fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer' }}>
              View
            </button>
            <button
              onClick={() => navigate(activePlan.template_id
                ? `/trainer/templates/${activePlan.template_id}/edit`
                : `/trainer/templates/new?fromPlan=${activePlan.id}`)}
              style={{ flex: 1, height: 36, borderRadius: 8, border: `1.5px solid ${C.border}`, background: 'transparent', fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer' }}>
              Edit
            </button>
            <button
              onClick={() => navigate(`/trainer/assign-plan?clientId=${clientId}&replace=${activePlan.id}`)}
              style={{ flex: 1, height: 36, borderRadius: 8, border: `1.5px solid ${C.border}`, background: 'transparent', fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer' }}>
              Replace
            </button>
          </div>
        </div>
      ) : (
        <div style={{ ...CARD, textAlign: 'center', padding: '24px' }}>
          <p style={{ fontSize: 14, color: C.sub }}>No active {planType} plan</p>
        </div>
      )}

      {/* ── past plans ── */}
      {pastPlans.length > 0 && (
        <section>
          <p style={SL}>Plan history</p>
          <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
            {pastPlans.map((plan, i) => {
              const isExpanded = expandedPast === plan.id;
              const days = plan.plan_data?.days || plan.days || [];
              const exCount = days.reduce((s, d) => s + (d.exercises?.length || 0), 0);

              return (
                <div key={plan.id}>
                  <button
                    onClick={() => setExpandedPast(isExpanded ? null : plan.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '0 14px', minHeight: 44, background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                      borderTop: i > 0 ? `0.5px solid rgba(0,0,0,0.06)` : 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
                        {plan.name || plan.template_name || 'Plan'}
                      </div>
                      <div style={{ fontSize: 12, color: C.sub, marginTop: 1 }}>
                        {planDateRange(plan)}
                      </div>
                    </div>
                    <PlanBadge status={plan.status || 'completed'} />
                    <IcoChevron open={isExpanded} />
                  </button>

                  {isExpanded && (
                    <div style={{
                      background: C.bg, padding: '10px 14px 12px',
                      borderTop: `0.5px solid rgba(0,0,0,0.06)`,
                      fontSize: 12, color: C.sub,
                      display: 'flex', gap: 16,
                    }}>
                      <span>{days.length} days</span>
                      <span>{exCount} exercises total</span>
                      {plan.ends_at && (
                        <span>Ended {new Date(plan.ends_at).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── assign new plan CTA ── */}
      <button
        onClick={() => navigate(`/trainer/assign-plan?clientId=${clientId}&type=${planType}`)}
        style={{
          width: '100%', border: '1.5px dashed var(--border-strong)', borderRadius: 12,
          padding: '24px 16px', background: 'transparent', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: C.grayBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IcoPlus />
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
          Assign new {planType} plan
        </span>
        <span style={{ fontSize: 12, color: C.sub }}>
          Choose from your templates or build new
        </span>
      </button>

      {/* ── plan detail modal ── */}
      {viewingPlan && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
        }} onClick={e => { if (e.target === e.currentTarget) setViewingPlan(null); }}>
          <div style={{
            background: C.card, borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 520, maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 16px 12px', borderBottom: `0.5px solid ${C.border}`,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                {viewingPlan.name || viewingPlan.template_name || 'Plan'}
              </span>
              <button onClick={() => setViewingPlan(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.sub }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
              {planDays.length === 0 ? (
                <p style={{ fontSize: 13, color: C.sub, textAlign: 'center', padding: '24px 0' }}>No plan days available</p>
              ) : planDays.map((day, i) => (
                <div key={i} style={{ ...CARD, marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                    {day.name || `Day ${i + 1}`}
                  </div>
                  {(day.exercises || []).map((ex, j) => (
                    <div key={j} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', borderTop: j > 0 ? `0.5px solid rgba(0,0,0,0.06)` : 'none',
                    }}>
                      <span style={{ fontSize: 13, color: C.text }}>{ex.name || ex.exercise_name}</span>
                      <span style={{ fontSize: 12, color: C.sub }}>{ex.sets}×{ex.reps}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px 32px', flexShrink: 0 }}>
              <button onClick={() => setViewingPlan(null)} style={{
                width: '100%', height: 48, borderRadius: 10, border: `1.5px solid ${C.border}`,
                background: 'transparent', fontSize: 14, fontWeight: 600, color: C.text, cursor: 'pointer',
              }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   NOTE MODAL
──────────────────────────────────────────── */
function NoteModal({ onClose, onSave }) {
  const [text, setText] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 100,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: C.card, borderRadius: '20px 20px 0 0',
        padding: '20px 20px 40px', width: '100%', maxWidth: 520,
        boxShadow: '0 -4px 30px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Add note</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.sub }}>×</button>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Write a note about this client…" rows={4} autoFocus
          style={{
            width: '100%', borderRadius: 12, padding: '12px 14px',
            border: `1px solid ${C.border}`, fontSize: 14, color: C.text,
            background: C.bg, resize: 'none', outline: 'none',
            fontFamily: 'inherit', lineHeight: 1.55,
          }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{
            flex: 1, height: 44, borderRadius: 8,
            border: `1.5px solid ${C.border}`, background: 'transparent',
            fontSize: 14, fontWeight: 600, color: C.sub, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => { if (text.trim()) { onSave(text.trim()); onClose(); } }}
            disabled={!text.trim()}
            style={{
              flex: 1, height: 44, borderRadius: 8, border: 'none',
              background: text.trim() ? C.text : C.grayBg,
              fontSize: 14, fontWeight: 600,
              color: text.trim() ? "var(--bg-card)" : C.sub,
              cursor: text.trim() ? 'pointer' : 'default',
            }}>Save note</button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   MAIN COMPONENT  (all original logic kept)
──────────────────────────────────────────── */
export default function TrainerClientDetail() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // new UI state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [localNotes, setLocalNotes] = useState([]);

  useEffect(() => {
    if (!user?.id || !clientId) return;
    loadClientData();
  }, [user?.id, clientId]);

  const loadClientData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiFetch(`/api/trainer/client-progress/${user.id}/${clientId}`);
      setData(res);
    } catch (err) {
      console.error('Load client data error:', err);
      setFetchError('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.grayBg}`, borderTopColor: C.text, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: 14, color: 'var(--error)', marginBottom: 16, fontWeight: 500 }}>{fetchError}</p>
          <button onClick={loadClientData} style={{ height: 40, padding: '0 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>Try again</button>
        </div>
      </div>
    );
  }

  if (!data?.client) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 14, color: C.sub }}>Client not found</p>
      </div>
    );
  }

  const { client, macros, workoutLogs, foodLogs, progressEntries, progressPhotos, personalRecords, assignedPlans } = data;

  // ── computed (original logic) ──
  const completedWorkouts = workoutLogs?.filter(w => w.completed_at) || [];
  const weeklyAvg = completedWorkouts.length > 0 ? (completedWorkouts.length / 4).toFixed(1) : '0';
  const activePlans = assignedPlans?.filter(p => p.status === 'active') || [];

  const today = new Date();
  const last7DaysLogs = (foodLogs || []).filter(f => {
    const logDate = new Date(f.log_date);
    return (today - logDate) / 86400000 <= 7;
  });
  const daysWithLogs = new Set(last7DaysLogs.map(f => f.log_date)).size;

  // ── client meta ──
  const av = nameColor(client.full_name || '');
  const ini = initials(client.full_name || '');

  const firstPlan = [...(assignedPlans || [])].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
  const weeksSince = firstPlan?.starts_at
    ? Math.max(1, Math.ceil((Date.now() - new Date(firstPlan.starts_at)) / (7 * 86400000)))
    : null;

  const planTypeLabel = activePlans.some(p => p.type === 'diet') && activePlans.some(p => p.type === 'workout')
    ? 'Workout + Diet'
    : activePlans.some(p => p.type === 'workout') ? 'Workout only'
    : activePlans.some(p => p.type === 'diet') ? 'Diet only'
    : null;

  const tabLabels = { overview: 'Overview', workouts: 'Workouts', diet: 'Diet', progress: 'Progress', plans: 'Plans' };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* ── sticky header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: C.card, borderBottom: `0.5px solid ${C.border}` }}>
        <button onClick={() => navigate(-1)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '10px 16px 6px', color: C.blue,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, minHeight: 44, fontFamily: 'inherit',
        }}>
          <IcoBack /> Back to clients
        </button>

        <div style={{ padding: '4px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: av.bg, color: av.text,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, flexShrink: 0, letterSpacing: '0.3px',
            }}>{ini}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-0.2px' }}>
                {client.full_name || 'Client'}
              </div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                {client.goal || '—'}
                {firstPlan?.starts_at ? ` · since ${new Date(firstPlan.starts_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, borderRadius: 20, padding: '3px 9px' }}>Active</span>
            {planTypeLabel && <span style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: C.blueBg, borderRadius: 20, padding: '3px 9px' }}>{planTypeLabel}</span>}
            {weeksSince && <span style={{ fontSize: 11, fontWeight: 600, color: C.amber, background: C.amberBg, borderRadius: 20, padding: '3px 9px' }}>Week {weeksSince}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', borderTop: `0.5px solid ${C.border}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {Object.entries(tabLabels).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              flex: '0 0 auto', width: '20%', padding: '10px 4px',
              background: 'none', border: 'none',
              borderBottom: activeTab === id ? `2px solid ${C.text}` : '2px solid transparent',
              fontSize: 12, fontWeight: activeTab === id ? 700 : 500,
              color: activeTab === id ? C.text : C.sub,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
              fontFamily: 'inherit', minHeight: 44,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── tab content ── */}
      {activeTab === 'overview' && (
        <OverviewTab data={data} clientId={clientId} onAddNote={() => setShowNoteModal(true)} localNotes={localNotes} />
      )}
      {activeTab === 'workouts' && <WorkoutsTab data={data} clientId={clientId} />}
      {activeTab === 'diet'     && <DietTab data={data} clientId={clientId} />}
      {activeTab === 'progress' && <ProgressTab data={data} clientId={clientId} />}
      {activeTab === 'plans'    && <PlansTab data={data} clientId={clientId} />}

      {showNoteModal && (
        <NoteModal
          onClose={() => setShowNoteModal(false)}
          onSave={(text) => setLocalNotes(n => [{ text, date: new Date().toISOString() }, ...n])}
        />
      )}
    </div>
  );
}
