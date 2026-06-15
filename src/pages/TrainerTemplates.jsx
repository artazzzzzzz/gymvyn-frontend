import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

const accentColors = {
  0: '#185FA5', 1: '#1D9E75',
  2: '#BA7517', 3: '#D85A30',
  4: '#534AB7', 5: '#0F6E56'
};

export default function TrainerTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [tab, setTab] = useState('workout');
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    if (!user?.id) return;
    loadTemplates();
  }, [user?.id]);

  const loadTemplates = async () => {
    try {
      const data = await apiFetch(`/api/trainer/templates/${user.id}`);
      setTemplates(data || []);
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

  const workoutTemplates = templates.filter(t => t.type === 'workout');
  const dietTemplates = templates.filter(t => t.type === 'diet');
  const displayed = tab === 'workout' ? workoutTemplates : dietTemplates;

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
      <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '52px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Templates</h1>
        <button
          onClick={handleCreate}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#111', color: 'white', border: 'none',
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
              background: tab === t ? '#111' : 'white',
              color: tab === t ? 'white' : '#555',
              boxShadow: tab === t ? 'none' : '0 0 0 0.5px rgba(0,0,0,0.12)'
            }}
          >
            {t === 'workout' ? 'Workout' : 'Diet'} ({t === 'workout' ? workoutTemplates.length : dietTemplates.length})
          </button>
        ))}
      </div>

      {/* Sort row */}
      <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 13, color: '#999' }}>Sort:</span>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{ fontSize: 13, border: 'none', background: 'transparent', color: '#666', cursor: 'pointer' }}
        >
          <option value="recent">Recent</option>
          <option value="most-used">Most used</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px' }}>
        {sorted.map((template, index) => {
          const accent = accentColors[index % 6];
          const days = template.template_data?.days?.length || 0;
          const exercises = template.template_data?.days
            ?.reduce((sum, d) => sum + (d.exercises?.length || 0), 0) || 0;
          const lastUsed = template.updated_at
            ? new Date(template.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '—';

          return (
            <div
              key={template.id}
              style={{
                background: 'white',
                border: '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 10
              }}
            >
              <div style={{ height: 3, background: accent }} />
              <div style={{ padding: 16 }}>
                {/* Row 1: name + type badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 500 }}>{template.name}</span>
                  <span style={{
                    fontSize: 11,
                    background: tab === 'workout' ? '#E6F1FB' : '#E1F5EE',
                    color: tab === 'workout' ? '#185FA5' : '#0F6E56',
                    padding: '2px 8px',
                    borderRadius: 20
                  }}>
                    {tab === 'workout' ? 'Workout' : 'Diet'}
                  </span>
                </div>

                {/* Row 2: metadata */}
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                  {tab === 'workout'
                    ? `${days} days · ${exercises} exercises`
                    : `${template.template_data?.calories || 0} kcal · P:${template.template_data?.protein || 0}g C:${template.template_data?.carbs || 0}g F:${template.template_data?.fat || 0}g`
                  }
                </div>

                {/* Row 3: usage stats */}
                <div style={{ fontSize: 12, color: '#999', marginBottom: 0 }}>
                  Assigned {template.times_assigned || 0}× · Last used {lastUsed}
                </div>

                {/* Row 4: action buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => navigate(
                      tab === 'workout'
                        ? `/trainer/templates/${template.id}/edit`
                        : `/trainer/diet-templates/${template.id}/edit`
                    )}
                    style={{
                      flex: 1, height: 36,
                      border: '0.5px solid rgba(0,0,0,0.15)',
                      borderRadius: 8, background: 'transparent',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => navigate(`/trainer/assign-plan?templateId=${template.id}&type=${tab}`)}
                    style={{
                      flex: 1, height: 36,
                      background: '#111', color: 'white',
                      border: 'none', borderRadius: 8,
                      fontSize: 13, fontWeight: 500, cursor: 'pointer'
                    }}
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    disabled={deleting === template.id}
                    style={{
                      width: 36, height: 36,
                      border: '0.5px solid rgba(0,0,0,0.1)',
                      borderRadius: 8, background: 'transparent',
                      fontSize: 15, cursor: 'pointer',
                      color: '#D85A30', opacity: deleting === template.id ? 0.4 : 1
                    }}
                  >
                    {deleting === template.id ? '…' : '🗑'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Dashed create card */}
        <div
          onClick={handleCreate}
          style={{
            border: '1.5px dashed #D0D0D0',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: 10
          }}
        >
          <div style={{ fontSize: 20, color: '#C0C0C0', marginBottom: 6 }}>+</div>
          <div style={{ fontSize: 13, color: '#999' }}>
            New {tab === 'workout' ? 'Workout' : 'Diet'} Template
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '0.5px solid rgba(0,0,0,0.08)',
        display: 'flex', justifyContent: 'space-around', padding: '10px 0 24px'
      }}>
        {[
          { label: 'Clients', icon: '👥', path: '/trainer/dashboard' },
          { label: 'Templates', icon: '📋', path: '/trainer/templates', active: true },
          { label: 'Chat', icon: '💬', path: '/trainer/chat' },
          { label: 'Profile', icon: '👤', path: '/trainer/settings' }
        ].map(t => (
          <button
            key={t.label}
            onClick={() => navigate(t.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, background: 'none', border: 'none', cursor: 'pointer',
              color: t.active ? '#111' : '#999', padding: '0 12px'
            }}
          >
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: t.active ? 600 : 400 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
