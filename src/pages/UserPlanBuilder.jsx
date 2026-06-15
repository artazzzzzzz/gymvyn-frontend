import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import ExercisePicker from '../components/ExercisePicker';

function newSet(n) { return { set: n, reps: 10, weight: '', rest_seconds: 60 }; }
function newExercise(name = '') { return { id: Date.now() + Math.random(), name, sets: [newSet(1)], notes: '' }; }
function newDay(n) { return { day: n, name: `Day ${n}`, exercises: [] }; }

export default function UserPlanBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { planId } = useParams();
  const isEditing = !!planId && planId !== 'new';

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState([newDay(1)]);
  const [activeDay, setActiveDay] = useState(0);
  const [showExPicker, setShowExPicker] = useState(false);
  const [expandedEx, setExpandedEx] = useState(null);

  useEffect(() => { if (isEditing) loadPlan(); }, [isEditing]);

  const loadPlan = async () => {
    try {
      const all = await apiFetch(`/api/user-plans/${user.id}`);
      const p = all.find(x => x.id === planId);
      if (!p) return;
      setName(p.name);
      setDescription(p.description || '');
      setDays(p.plan_data?.days?.length ? p.plan_data.days : [newDay(1)]);
    } catch (err) { console.error(err); }
  };

  const addDay = () => { setDays(p => [...p, newDay(p.length + 1)]); setActiveDay(days.length); };
  const removeDay = (idx) => {
    if (days.length === 1) return;
    setDays(p => p.filter((_, i) => i !== idx).map((d, i) => ({ ...d, day: i + 1, name: d.name.startsWith('Day ') ? `Day ${i + 1}` : d.name })));
    setActiveDay(p => Math.min(p, days.length - 2));
  };
  const updateDayName = (idx, val) => setDays(p => p.map((d, i) => i === idx ? { ...d, name: val } : d));

  const addExercise = (exName) => {
    setDays(p => p.map((d, i) => i === activeDay ? { ...d, exercises: [...d.exercises, newExercise(exName)] } : d));
    setShowExPicker(false);
  };
  const removeExercise = (exIdx) => setDays(p => p.map((d, i) => i === activeDay ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIdx) } : d));
  const updateExercise = (exIdx, field, val) => setDays(p => p.map((d, i) => i === activeDay ? { ...d, exercises: d.exercises.map((ex, ei) => ei === exIdx ? { ...ex, [field]: val } : ex) } : d));

  const addSet = (exIdx) => setDays(p => p.map((d, i) => i === activeDay ? { ...d, exercises: d.exercises.map((ex, ei) => ei === exIdx ? { ...ex, sets: [...ex.sets, newSet(ex.sets.length + 1)] } : ex) } : d));
  const removeSet = (exIdx, setIdx) => setDays(p => p.map((d, i) => i === activeDay ? { ...d, exercises: d.exercises.map((ex, ei) => ei === exIdx && ex.sets.length > 1 ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx).map((s, si) => ({ ...s, set: si + 1 })) } : ex) } : d));
  const updateSet = (exIdx, setIdx, field, val) => setDays(p => p.map((d, i) => i === activeDay ? { ...d, exercises: d.exercises.map((ex, ei) => ei === exIdx ? { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: val } : s) } : ex) } : d));

  const handleSave = async () => {
    if (!name.trim()) return alert('Give your plan a name');
    setSaving(true);
    try {
      const payload = { userId: user.id, name: name.trim(), description: description.trim(), planData: { days } };
      if (isEditing) {
        await apiFetch(`/api/user-plans/${planId}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim(), description: description.trim(), plan_data: { days } }) });
      } else {
        await apiFetch('/api/user-plans', { method: 'POST', body: JSON.stringify(payload) });
      }
      navigate('/workout');
    } catch (err) { alert('Failed to save'); } finally { setSaving(false); }
  };

  const currentDay = days[activeDay];

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-32">
      <div className="px-5 pt-12 pb-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/workout')} className="text-zinc-400 text-sm">← Workout</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="px-5 py-2.5 bg-emerald-500 rounded-xl font-semibold text-sm disabled:opacity-40">
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Save Plan'}
          </button>
        </div>
        <input type="text" placeholder="Plan name e.g. Push Day, Full Body A" value={name} onChange={e => setName(e.target.value)}
          className="w-full text-xl font-bold bg-transparent placeholder:text-zinc-700 focus:outline-none border-b border-zinc-800 pb-3 mb-3" />
        <input type="text" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)}
          className="w-full text-sm bg-transparent placeholder:text-zinc-700 focus:outline-none text-zinc-400" />
      </div>

      <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide border-b border-zinc-800">
        {days.map((d, idx) => (
          <button key={idx} onClick={() => setActiveDay(idx)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeDay === idx ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
            {d.name}
          </button>
        ))}
        <button onClick={addDay} className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-zinc-500 border border-dashed border-zinc-700">+ Day</button>
      </div>

      <div className="px-5 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <input type="text" value={currentDay.name} onChange={e => updateDayName(activeDay, e.target.value)}
            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
          {days.length > 1 && <button onClick={() => removeDay(activeDay)} className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">Remove</button>}
        </div>

        <div className="space-y-3 mb-4">
          {currentDay.exercises.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-dashed border-zinc-800 text-center">
              <p className="text-zinc-500 text-sm">No exercises — tap "Add Exercise"</p>
            </div>
          ) : currentDay.exercises.map((ex, exIdx) => (
            <div key={ex.id || exIdx} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedEx(expandedEx === exIdx ? null : exIdx)}>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center">{exIdx + 1}</span>
                  <div>
                    <p className="font-medium text-sm">{ex.name}</p>
                    <p className="text-xs text-zinc-500">{ex.sets.length} sets{ex.sets[0]?.reps ? ` × ${ex.sets[0].reps} reps` : ''}{ex.sets[0]?.weight ? ` @ ${ex.sets[0].weight}kg` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); removeExercise(exIdx); }} className="text-zinc-600 hover:text-red-400 text-lg">×</button>
                  <span className="text-zinc-600 text-sm">{expandedEx === exIdx ? '▲' : '▼'}</span>
                </div>
              </div>
              {expandedEx === exIdx && (
                <div className="border-t border-zinc-800 p-4">
                  <div className="grid grid-cols-4 gap-2 mb-2 text-[10px] text-zinc-500 uppercase tracking-wider px-1">
                    <span>Set</span><span>Reps</span><span>Weight (kg)</span><span>Rest (s)</span>
                  </div>
                  {ex.sets.map((s, setIdx) => (
                    <div key={setIdx} className="grid grid-cols-4 gap-2 mb-2 items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500 text-sm w-4">{s.set}</span>
                        {ex.sets.length > 1 && <button onClick={() => removeSet(exIdx, setIdx)} className="text-zinc-700 hover:text-red-400 text-xs">×</button>}
                      </div>
                      <input type="number" value={s.reps} onChange={e => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                        className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-center focus:outline-none focus:border-emerald-500" />
                      <input type="number" value={s.weight} onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)} placeholder="—"
                        className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-center focus:outline-none focus:border-emerald-500" step="0.5" />
                      <select value={s.rest_seconds} onChange={e => updateSet(exIdx, setIdx, 'rest_seconds', parseInt(e.target.value))}
                        className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs focus:outline-none focus:border-emerald-500">
                        {[30,45,60,90,120,180].map(r => <option key={r} value={r}>{r}s</option>)}
                      </select>
                    </div>
                  ))}
                  <button onClick={() => addSet(exIdx)} className="w-full py-2 mt-1 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors">+ Add set</button>
                  <input type="text" placeholder="Notes (optional)..." value={ex.notes} onChange={e => updateExercise(exIdx, 'notes', e.target.value)}
                    className="w-full mt-3 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500" />
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setShowExPicker(true)}
          className="w-full py-3.5 bg-zinc-900 border border-dashed border-zinc-700 rounded-xl text-zinc-400 text-sm font-medium hover:border-emerald-500/50 hover:text-emerald-400 transition-colors">
          + Add Exercise
        </button>
      </div>

      {showExPicker && (
        <ExercisePicker
          onSelect={(ex) => addExercise(ex.name)}
          onClose={() => setShowExPicker(false)}
          preSelected={currentDay?.exercises?.map(e => e.name) || []}
        />
      )}
    </div>
  );
}
