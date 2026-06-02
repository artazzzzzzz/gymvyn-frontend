import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

export default function TrainerTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    loadTemplates();
  }, [user?.id]);

  const loadTemplates = async () => {
    try {
      const data = await apiFetch(`/api/trainer/templates/${user.id}?type=workout`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-32">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <button onClick={() => navigate('/trainer/dashboard')} className="text-zinc-400 text-sm mb-3 flex items-center gap-1">
          ← Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Templates</h1>
            <p className="text-zinc-400 text-sm mt-0.5">{templates.length} workout plan{templates.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => navigate('/trainer/templates/new')}
            className="px-4 py-2.5 bg-emerald-500 rounded-xl font-semibold text-sm"
          >
            + New
          </button>
        </div>
      </div>

      <div className="px-5 space-y-3">
        {templates.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl p-10 border border-zinc-800 text-center">
            <p className="text-4xl mb-3">📋</p>
            <h2 className="font-semibold mb-2">No templates yet</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Build reusable workout plans to assign to any client
            </p>
            <button
              onClick={() => navigate('/trainer/templates/new')}
              className="px-6 py-3 bg-emerald-500 rounded-xl font-semibold text-sm"
            >
              Create your first template
            </button>
          </div>
        ) : (
          templates.map(template => {
            const days = template.template_data?.days || [];
            const totalExercises = days.reduce((sum, d) => sum + (d.exercises?.length || 0), 0);

            return (
              <div key={template.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{template.name}</h3>
                      {template.description && (
                        <p className="text-zinc-400 text-sm mt-0.5 line-clamp-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                        <span>{days.length} day{days.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{totalExercises} exercises</span>
                        {template.template_data?.difficulty && (
                          <>
                            <span>·</span>
                            <span>{template.template_data.difficulty}</span>
                          </>
                        )}
                        {template.times_assigned > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400">Assigned {template.times_assigned}×</span>
                          </>
                        )}
                      </div>
                      {template.tags?.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {template.tags.map(tag => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action row */}
                <div className="flex border-t border-zinc-800">
                  <button
                    onClick={() => navigate(`/trainer/assign-plan?templateId=${template.id}`)}
                    className="flex-1 py-3 text-emerald-400 text-sm font-medium hover:bg-emerald-500/5 transition-colors"
                  >
                    Assign
                  </button>
                  <div className="w-px bg-zinc-800" />
                  <button
                    onClick={() => navigate(`/trainer/templates/${template.id}/edit`)}
                    className="flex-1 py-3 text-zinc-400 text-sm font-medium hover:bg-zinc-800/50 transition-colors"
                  >
                    Edit
                  </button>
                  <div className="w-px bg-zinc-800" />
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    disabled={deleting === template.id}
                    className="flex-1 py-3 text-red-400 text-sm font-medium hover:bg-red-500/5 transition-colors disabled:opacity-40"
                  >
                    {deleting === template.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800">
        <div className="flex justify-around py-3">
          {[
            { label: 'Clients', icon: '👥', path: '/trainer/dashboard' },
            { label: 'Templates', icon: '📋', path: '/trainer/templates', active: true },
            { label: 'Chat', icon: '💬', path: '/trainer/chat' },
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
  );
}
