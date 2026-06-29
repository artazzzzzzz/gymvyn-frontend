import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import { supabase } from '../utils/supabase';
import AssignDietPlanSheet from '../components/diet/AssignDietPlanSheet';

const BASE_URL = import.meta.env.VITE_API_URL;

async function dietFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}

const accentColors = {
  0: 'var(--text-cta)', 1: '#1D9E75',
  2: '#BA7517', 3: '#D85A30',
  4: '#534AB7', 5: 'var(--success)'
};

const LEVEL_BADGE = {
  macros: { label: 'Macros',    bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
  meals:  { label: 'Meal Plan', bg: '#FFF3E0',            color: '#BA7517' },
  full:   { label: 'Full Plan', bg: '#E8F5E9',            color: '#1D9E75' },
};

export default function TrainerTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [dietTemplatesNew, setDietTemplatesNew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [tab, setTab] = useState('workout');
  const [sort, setSort] = useState('recent');
  const [assignSheet, setAssignSheet] = useState(null); // template to assign

  useEffect(() => {
    if (!user?.id) return;
    loadAll();
  }, [user?.id]);

  const loadAll = async () => {
    try {
      const [workout, diet] = await Promise.all([
        apiFetch(`/api/trainer/templates/${user.id}`).catch(() => []),
        dietFetch('/api/diet-plans/templates').catch(() => []),
      ]);
      setTemplates(workout || []);
      setDietTemplatesNew(diet || []);
    } catch (err) {
      console.error('Load templates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/trainer/templates/${id}`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const deleteDietTemplate = async (id) => {
    if (!confirm('Delete this diet template?')) return;
    setDeleting(id);
    try {
      await dietFetch(`/api/diet-plans/templates/${id}`, { method: 'DELETE' });
      setDietTemplatesNew(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const workoutTemplates = templates.filter(t => t.type === 'workout');
  const displayed = tab === 'workout' ? workoutTemplates : dietTemplatesNew;

  const sorted = [...displayed].sort((a, b) => {
    if (sort === 'recent') return new Date(b.updated_at) - new Date(a.updated_at);
    if (sort === 'most-used') return b.times_assigned - a.times_assigned;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const handleCreate = () => navigate(
    tab === 'workout' ? '/trainer/templates/new' : '/trainer/diet-templates/new'
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '52px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Templates</h1>
        <button
          onClick={handleCreate}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: "var(--text-primary)", color: 'var(--bg-primary)', border: 'none',
            fontSize: 20, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', lineHeight: 1
          }}
        >
          +
        </button>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
        {['workout', 'diet'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 18px',
              borderRadius: 20,
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              background: tab === t ? "var(--text-primary)" : 'var(--bg-card)',
              color: tab === t ? 'var(--bg-primary)' : "var(--text-secondary)",
              boxShadow: tab === t ? 'none' : '0 0 0 0.5px var(--border)'
            }}
          >
            {t === 'workout' ? 'Workout' : 'Diet'} ({t === 'workout' ? workoutTemplates.length : dietTemplatesNew.length})
          </button>
        ))}
      </div>

      {/* Sort row */}
      <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Sort:</span>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{ fontSize: 13, border: 'none', background: 'transparent', color: "var(--text-secondary)", cursor: 'pointer' }}
        >
          <option value="recent">Recent</option>
          <option value="most-used">Most used</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px' }}>
        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
            No {tab === 'workout' ? 'workout' : 'diet'} plan templates yet.
            <br />
            <button
              onClick={handleCreate}
              style={{ marginTop: 12, fontSize: 13, color: 'var(--text-cta)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              Create your first one
            </button>
          </div>
        )}

        {sorted.map((template, index) => {
          const accent = accentColors[index % 6];
          const isDiet = tab === 'diet';

          if (isDiet) {
            const badge = LEVEL_BADGE[template.detail_level] || LEVEL_BADGE.macros;
            const created = template.created_at
              ? new Date(template.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '—';
            return (
              <div key={template.id} style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: 3, background: accent }} />
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, flex: 1, paddingRight: 8 }}>{template.name}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color, flexShrink: 0 }}>
                      {badge.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                    {template.calories_target ? `${template.calories_target} kcal` : '— kcal'}
                    {template.protein_g ? ` · P:${template.protein_g}g` : ''}
                    {template.carbs_g ? ` · C:${template.carbs_g}g` : ''}
                    {template.fat_g ? ` · F:${template.fat_g}g` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>Created {created}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => navigate(`/trainer/diet-templates/${template.id}/edit`)}
                      style={{ flex: 1, height: 34, border: '0.5px solid var(--border)', borderRadius: 8, background: 'transparent', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setAssignSheet(template)}
                      style={{ flex: 1, height: 34, background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => deleteDietTemplate(template.id)}
                      disabled={deleting === template.id}
                      style={{ width: 34, height: 34, border: '0.5px solid var(--border)', borderRadius: 8, background: 'transparent', fontSize: 14, cursor: 'pointer', color: '#D85A30', opacity: deleting === template.id ? 0.4 : 1 }}
                    >
                      {deleting === template.id ? '…' : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          const days = template.template_data?.days?.length || 0;
          const exercises = template.template_data?.days
            ?.reduce((sum, d) => sum + (d.exercises?.length || 0), 0) || 0;
          const lastUsed = template.updated_at
            ? new Date(template.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '—';

          return (
            <div key={template.id} style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ height: 3, background: accent }} />
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 500 }}>{template.name}</span>
                  <span style={{ fontSize: 11, background: 'var(--accent-bg)', color: 'var(--text-cta)', padding: '2px 8px', borderRadius: 20 }}>Workout</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  {days} days · {exercises} exercises
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 0 }}>
                  Assigned {template.times_assigned || 0}× · Last used {lastUsed}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => navigate(`/trainer/templates/${template.id}/edit`)}
                    style={{ flex: 1, height: 36, border: '0.5px solid var(--border)', borderRadius: 8, background: 'transparent', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--text-primary)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => navigate(`/trainer/assign-plan?templateId=${template.id}&type=workout`)}
                    style={{ flex: 1, height: 36, background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    disabled={deleting === template.id}
                    style={{ width: 36, height: 36, border: '0.5px solid var(--border)', borderRadius: 8, background: 'transparent', fontSize: 15, cursor: 'pointer', color: '#D85A30', opacity: deleting === template.id ? 0.4 : 1 }}
                  >
                    {deleting === template.id ? '…' : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Dashed create card */}
        <div
          onClick={handleCreate}
          style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer', marginBottom: 10 }}
        >
          <div style={{ fontSize: 20, color: 'var(--text-disabled)', marginBottom: 6 }}>+</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            New {tab === 'workout' ? 'Workout' : 'Diet'} Template
          </div>
        </div>
      </div>

      <AssignDietPlanSheet
        isOpen={!!assignSheet}
        onClose={() => setAssignSheet(null)}
        template={assignSheet}
        onAssigned={() => setAssignSheet(null)}
      />

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-card)', borderTop: '0.5px solid var(--border)',
        display: 'flex', justifyContent: 'space-around', padding: '10px 0 24px'
      }}>
        {[
          { label: 'Clients',   path: '/trainer/dashboard',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          { label: 'Templates', path: '/trainer/templates', active: true, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
          { label: 'Chat',      path: '/trainer/chat',       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
          { label: 'Profile',   path: '/trainer/settings',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map(t => (
          <button
            key={t.label}
            onClick={() => navigate(t.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, background: 'none', border: 'none', cursor: 'pointer',
              color: t.active ? "var(--text-primary)" : "var(--text-tertiary)", padding: '0 12px'
            }}
          >
            <span>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: t.active ? 600 : 400 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
