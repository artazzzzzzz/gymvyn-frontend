import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

export default function TrainerClientDetail() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user?.id || !clientId) return;
    loadClientData();
  }, [user?.id, clientId]);

  const loadClientData = async () => {
    try {
      const res = await apiFetch(`/api/trainer/client-progress/${user.id}/${clientId}`);
      setData(res);
    } catch (err) {
      console.error('Load client data error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.client) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">Client not found</p>
      </div>
    );
  }

  const { client, macros, workoutLogs, foodLogs, progressEntries, progressPhotos, personalRecords, assignedPlans } = data;

  // Compute stats
  const completedWorkouts = workoutLogs?.filter(w => w.completed_at) || [];
  const weeklyAvg = completedWorkouts.length > 0
    ? (completedWorkouts.length / 4).toFixed(1)
    : '0';
  const activePlans = assignedPlans?.filter(p => p.status === 'active') || [];

  // Diet compliance (last 7 days)
  const today = new Date();
  const last7DaysLogs = (foodLogs || []).filter(f => {
    const logDate = new Date(f.log_date);
    return (today - logDate) / 86400000 <= 7;
  });
  const daysWithLogs = new Set(last7DaysLogs.map(f => f.log_date)).size;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'workouts', label: 'Workouts' },
    { id: 'diet', label: 'Diet' },
    { id: 'progress', label: 'Progress' },
    { id: 'plans', label: 'Plans' }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-32">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="text-zinc-400 text-sm mb-3 flex items-center gap-1">
          ← Back
        </button>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <span className="text-emerald-400 font-bold text-xl">
              {(client.full_name || '?')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{client.full_name || 'Client'}</h1>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>{client.goal || '—'}</span>
              <span>·</span>
              <span>{client.experience || '—'}</span>
              {client.age && <><span>·</span><span>{client.age}y</span></>}
            </div>
          </div>
          <button
            onClick={() => navigate('/trainer/chat')}
            className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center"
          >
            <span>💬</span>
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-5 mb-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Workouts (30d)" value={completedWorkouts.length} color="emerald" />
              <StatCard label="Avg/week" value={weeklyAvg} color="blue" />
              <StatCard label="Diet tracking" value={`${daysWithLogs}/7 days`} color="amber" />
              <StatCard label="Active plans" value={activePlans.length} color="purple" />
            </div>

            {/* Body stats */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <h3 className="text-sm text-zinc-400 mb-3">Body stats</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold">{client.current_weight || '—'}</p>
                  <p className="text-xs text-zinc-500">Current kg</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{client.target_weight || '—'}</p>
                  <p className="text-xs text-zinc-500">Target kg</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{client.height || '—'}</p>
                  <p className="text-xs text-zinc-500">Height cm</p>
                </div>
              </div>
            </div>

            {/* Macros */}
            {macros && (
              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                <h3 className="text-sm text-zinc-400 mb-3">Daily targets</h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-emerald-400">{macros.calories}</p>
                    <p className="text-xs text-zinc-500">Cal</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-400">{macros.protein_g}g</p>
                    <p className="text-xs text-zinc-500">Protein</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-400">{macros.carbs_g}g</p>
                    <p className="text-xs text-zinc-500">Carbs</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-pink-400">{macros.fat_g}g</p>
                    <p className="text-xs text-zinc-500">Fat</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/trainer/assign-plan/${clientId}?type=workout`)}
                className="flex-1 py-3 bg-blue-500/15 border border-blue-500/20 rounded-xl text-blue-400 text-sm font-medium"
              >
                Assign Workout
              </button>
              <button
                onClick={() => navigate(`/trainer/assign-plan/${clientId}?type=diet`)}
                className="flex-1 py-3 bg-green-500/15 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium"
              >
                Assign Diet
              </button>
            </div>
          </div>
        )}

        {/* Workouts Tab */}
        {activeTab === 'workouts' && (
          <div className="space-y-3">
            {completedWorkouts.length === 0 ? (
              <EmptyState emoji="🏋️" text="No workouts logged yet" />
            ) : (
              completedWorkouts.slice(0, 15).map(log => (
                <div key={log.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {new Date(log.completed_at).toLocaleDateString('en-IN', {
                          weekday: 'short', day: 'numeric', month: 'short'
                        })}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {log.duration_minutes ? `${log.duration_minutes} min` : '—'}
                        {log.exercises?.length ? ` · ${log.exercises.length} exercises` : ''}
                      </p>
                    </div>
                    {log.exercises && (
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                        Completed
                      </span>
                    )}
                  </div>
                  {log.exercises && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {log.exercises.slice(0, 4).map((ex, i) => (
                        <span key={i} className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                          {ex.name || ex.exercise_name || 'Exercise'}
                        </span>
                      ))}
                      {log.exercises.length > 4 && (
                        <span className="text-xs text-zinc-500">+{log.exercises.length - 4} more</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Diet Tab */}
        {activeTab === 'diet' && (
          <div className="space-y-3">
            {macros && (
              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-4">
                <h3 className="text-sm text-zinc-400 mb-2">Last 7 days tracking</h3>
                <p className="text-lg font-bold text-emerald-400">{daysWithLogs}/7 days logged</p>
              </div>
            )}
            {last7DaysLogs.length === 0 ? (
              <EmptyState emoji="🍽️" text="No food logs this week" />
            ) : (
              Object.entries(
                last7DaysLogs.reduce((acc, log) => {
                  (acc[log.log_date] = acc[log.log_date] || []).push(log);
                  return acc;
                }, {})
              ).map(([date, logs]) => (
                <div key={date} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <p className="font-medium mb-2">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-emerald-400">
                      {logs.reduce((s, l) => s + (l.calories || 0), 0)} cal
                    </span>
                    <span className="text-blue-400">
                      {logs.reduce((s, l) => s + (l.protein_g || 0), 0).toFixed(0)}g P
                    </span>
                    <span className="text-zinc-400">
                      {logs.length} items
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            {/* PRs */}
            {personalRecords?.length > 0 && (
              <div>
                <h3 className="text-sm text-zinc-400 mb-2">Personal records</h3>
                <div className="space-y-2">
                  {personalRecords.slice(0, 5).map(pr => (
                    <div key={pr.id} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 flex justify-between">
                      <span className="text-sm">{pr.exercise_name || pr.exercise}</span>
                      <span className="text-sm text-emerald-400 font-medium">{pr.weight_kg}kg × {pr.reps}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress photos */}
            {progressPhotos?.length > 0 ? (
              <div>
                <h3 className="text-sm text-zinc-400 mb-2">Progress photos</h3>
                <div className="grid grid-cols-3 gap-2">
                  {progressPhotos.map(photo => (
                    <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                      <img
                        src={photo.photo_url || photo.url}
                        alt="Progress"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState emoji="📸" text="No progress photos yet" />
            )}

            {/* Weight trend */}
            {progressEntries?.length > 0 && (
              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                <h3 className="text-sm text-zinc-400 mb-2">Recent check-ins</h3>
                {progressEntries.slice(0, 5).map(entry => (
                  <div key={entry.id} className="flex justify-between py-2 border-b border-zinc-800 last:border-0">
                    <span className="text-sm text-zinc-400">
                      {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-sm font-medium">
                      {entry.weight || entry.current_weight || '—'} kg
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-3">
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => navigate(`/trainer/assign-plan/${clientId}?type=workout`)}
                className="flex-1 py-3 bg-emerald-500 rounded-xl font-semibold text-sm"
              >
                + Assign Workout
              </button>
              <button
                onClick={() => navigate(`/trainer/assign-plan/${clientId}?type=diet`)}
                className="flex-1 py-3 bg-zinc-900 border border-zinc-800 rounded-xl font-medium text-sm"
              >
                + Assign Diet
              </button>
            </div>

            {assignedPlans?.length === 0 ? (
              <EmptyState emoji="📋" text="No plans assigned yet" />
            ) : (
              assignedPlans.map(plan => (
                <div key={plan.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {plan.type === 'workout' ? '🏋️' : '🍽️'} {plan.type}
                        {plan.starts_at && ` · Started ${new Date(plan.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      plan.status === 'active'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-zinc-500 bg-zinc-800'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400'
  };
  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <p className={`text-xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

function EmptyState({ emoji, text }) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
      <p className="text-3xl mb-2">{emoji}</p>
      <p className="text-zinc-400 text-sm">{text}</p>
    </div>
  );
}
