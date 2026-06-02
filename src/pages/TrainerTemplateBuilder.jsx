import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

// Common exercises grouped by muscle
const EXERCISE_LIBRARY = {
  'Chest': ['Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Dumbbell Flyes', 'Push Up', 'Cable Crossover', 'Chest Dip'],
  'Back': ['Pull Up', 'Lat Pulldown', 'Barbell Row', 'Dumbbell Row', 'Seated Cable Row', 'Deadlift', 'Face Pull', 'Chin Up'],
  'Shoulders': ['Overhead Press', 'Dumbbell Shoulder Press', 'Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Arnold Press', 'Upright Row'],
  'Arms': ['Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension', 'Preacher Curl', 'Dips'],
  'Legs': ['Squat', 'Romanian Deadlift', 'Leg Press', 'Lunges', 'Leg Extension', 'Leg Curl', 'Calf Raise', 'Bulgarian Split Squat', 'Hip Thrust', 'Goblet Squat'],
  'Core': ['Plank', 'Crunches', 'Leg Raise', 'Russian Twist', 'Ab Wheel Rollout', 'Cable Crunch', 'Hanging Knee Raise', 'Mountain Climber'],
  'Cardio': ['Treadmill', 'Cycling', 'Jump Rope', 'Burpees', 'Box Jump', 'Rowing Machine', 'Stair Climber']
};

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const GOALS = ['Muscle Building', 'Weight Loss', 'Strength', 'Endurance', 'Athletic Performance', 'Toning', 'Rehabilitation'];

function newSet(setNum) {
  return { set: setNum, reps: 10, weight: '', rest_seconds: 60 };
}

function newExercise(name = '') {
  return { id: Date.now(), name, sets: [newSet(1)], notes: '' };
}

function newDay(dayNum) {
  return { day: dayNum, name: `Day ${dayNum}`, exercises: [] };
}

export default function TrainerTemplateBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { templateId } = useParams(); // if editing
  const isEditing = !!templateId && templateId !== 'new';

  const [saving, setSaving] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [showExPicker, setShowExPicker] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [expandedEx, setExpandedEx] = useState(null);

  // Template metadata
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [goal, setGoal] = useState('Muscle Building');
  const [tags, setTags] = useState([]);
  const [days, setDays] = useState([newDay(1)]);

  useEffect(() => {
    if (isEditing) loadTemplate();
  }, [isEditing]);

  const loadTemplate = async () => {
    try {
      const all = await apiFetch(`/api/trainer/templates/${user.id}?type=workout`);
      const t = all.find(x => x.id === templateId);
      if (!t) return;
      setName(t.name);
      setDescription(t.description || '');
      setDifficulty(t.template_data?.difficulty || 'Intermediate');
      setGoal(t.template_data?.goal || 'Muscle Building');
      setTags(t.tags || []);
      setDays(t.template_data?.days?.length ? t.template_data.days : [newDay(1)]);
    } catch (err) {
      console.error('Load template error:', err);
    }
  };

  // ── Day actions ─────────────────────────────
  const addDay = () => {
    const d = newDay(days.length + 1);
    setDays(prev => [...prev, d]);
    setActiveDay(days.length);
  };

  const removeDay = (idx) => {
    if (days.length === 1) return;
    setDays(prev => prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, day: i + 1, name: d.name.startsWith('Day ') ? `Day ${i + 1}` : d.name })));
    setActiveDay(prev => Math.min(prev, days.length - 2));
  };

  const updateDayName = (idx, val) => {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, name: val } : d));
  };

  // ── Exercise actions ──────────────────────────
  const addExercise = (exName) => {
    setDays(prev => prev.map((d, i) =>
      i === activeDay
        ? { ...d, exercises: [...d.exercises, newExercise(exName)] }
        : d
    ));
    setShowExPicker(false);
    setExSearch('');
  };

  const removeExercise = (exIdx) => {
    setDays(prev => prev.map((d, i) =>
      i === activeDay
        ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIdx) }
        : d
    ));
  };

  const updateExercise = (exIdx, field, val) => {
    setDays(prev => prev.map((d, i) =>
      i === activeDay
        ? {
            ...d,
            exercises: d.exercises.map((ex, ei) =>
              ei === exIdx ? { ...ex, [field]: val } : ex
            )
          }
        : d
    ));
  };

  // ── Set actions ───────────────────────────────
  const addSet = (exIdx) => {
    setDays(prev => prev.map((d, i) =>
      i === activeDay
        ? {
            ...d,
            exercises: d.exercises.map((ex, ei) =>
              ei === exIdx
                ? { ...ex, sets: [...ex.sets, newSet(ex.sets.length + 1)] }
                : ex
            )
          }
        : d
    ));
  };

  const removeSet = (exIdx, setIdx) => {
    setDays(prev => prev.map((d, i) =>
      i === activeDay
        ? {
            ...d,
            exercises: d.exercises.map((ex, ei) =>
              ei === exIdx && ex.sets.length > 1
                ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx).map((s, si) => ({ ...s, set: si + 1 })) }
                : ex
            )
          }
        : d
    ));
  };

  const updateSet = (exIdx, setIdx, field, val) => {
    setDays(prev => prev.map((d, i) =>
      i === activeDay
        ? {
            ...d,
            exercises: d.exercises.map((ex, ei) =>
              ei === exIdx
                ? { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: val } : s) }
                : ex
            )
          }
        : d
    ));
  };

  // ── Save ──────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) return alert('Give your template a name');
    setSaving(true);
    try {
      const payload = {
        trainerId: user.id,
        type: 'workout',
        name: name.trim(),
        description: description.trim(),
        templateData: { days, difficulty, goal, frequency: days.length },
        tags
      };

      if (isEditing) {
        await apiFetch(`/api/trainer/templates/${templateId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/api/trainer/templates', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      navigate('/trainer/templates');
    } catch (err) {
      alert('Failed to save template');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const currentDay = days[activeDay];
  const filteredExercises = Object.entries(EXERCISE_LIBRARY).reduce((acc, [group, exs]) => {
    const filtered = exs.filter(e => e.toLowerCase().includes(exSearch.toLowerCase()));
    if (filtered.length) acc[group] = filtered;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-32">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/trainer/templates')} className="text-zinc-400 text-sm">
            ← Templates
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-5 py-2.5 bg-emerald-500 rounded-xl font-semibold text-sm disabled:opacity-40"
          >
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
          </button>
        </div>

        {/* Template name */}
        <input
          type="text"
          placeholder="Template name e.g. Push Pull Legs 6-Day"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-xl font-bold bg-transparent placeholder:text-zinc-700 focus:outline-none border-b border-zinc-800 pb-3 mb-3"
        />

        {/* Meta row */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-emerald-500"
          >
            {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
          </select>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-emerald-500"
          >
            {GOALS.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide border-b border-zinc-800">
        {days.map((d, idx) => (
          <button
            key={idx}
            onClick={() => setActiveDay(idx)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeDay === idx
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            {d.name}
          </button>
        ))}
        <button
          onClick={addDay}
          className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-zinc-500 border border-dashed border-zinc-700"
        >
          + Day
        </button>
      </div>

      {/* Day content */}
      <div className="px-5 pt-4">
        {/* Day name + remove */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={currentDay.name}
            onChange={(e) => updateDayName(activeDay, e.target.value)}
            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="Day name e.g. Push / Chest & Triceps"
          />
          {days.length > 1 && (
            <button
              onClick={() => removeDay(activeDay)}
              className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
            >
              Remove
            </button>
          )}
        </div>

        {/* Exercise list */}
        <div className="space-y-3 mb-4">
          {currentDay.exercises.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-dashed border-zinc-800 text-center">
              <p className="text-zinc-500 text-sm">No exercises yet</p>
              <p className="text-zinc-600 text-xs mt-1">Tap "Add Exercise" below</p>
            </div>
          ) : (
            currentDay.exercises.map((ex, exIdx) => (
              <div key={ex.id || exIdx} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                {/* Exercise header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedEx(expandedEx === exIdx ? null : exIdx)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center">
                      {exIdx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{ex.name}</p>
                      <p className="text-xs text-zinc-500">
                        {ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}
                        {ex.sets[0]?.reps ? ` × ${ex.sets[0].reps} reps` : ''}
                        {ex.sets[0]?.weight ? ` @ ${ex.sets[0].weight}kg` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeExercise(exIdx); }}
                      className="text-zinc-600 hover:text-red-400 text-lg leading-none"
                    >
                      ×
                    </button>
                    <span className="text-zinc-600 text-sm">{expandedEx === exIdx ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded set editor */}
                {expandedEx === exIdx && (
                  <div className="border-t border-zinc-800 p-4">
                    {/* Set headers */}
                    <div className="grid grid-cols-4 gap-2 mb-2 text-[10px] text-zinc-500 uppercase tracking-wider px-1">
                      <span>Set</span>
                      <span>Reps</span>
                      <span>Weight (kg)</span>
                      <span>Rest (s)</span>
                    </div>

                    {ex.sets.map((s, setIdx) => (
                      <div key={setIdx} className="grid grid-cols-4 gap-2 mb-2 items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500 text-sm w-4">{s.set}</span>
                          {ex.sets.length > 1 && (
                            <button
                              onClick={() => removeSet(exIdx, setIdx)}
                              className="text-zinc-700 hover:text-red-400 text-xs"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          value={s.reps}
                          onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                          className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-center focus:outline-none focus:border-emerald-500"
                          min="1"
                        />
                        <input
                          type="number"
                          value={s.weight}
                          onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                          placeholder="—"
                          className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-center focus:outline-none focus:border-emerald-500"
                          min="0"
                          step="0.5"
                        />
                        <select
                          value={s.rest_seconds}
                          onChange={(e) => updateSet(exIdx, setIdx, 'rest_seconds', parseInt(e.target.value))}
                          className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                        >
                          {[30, 45, 60, 90, 120, 180].map(r => (
                            <option key={r} value={r}>{r}s</option>
                          ))}
                        </select>
                      </div>
                    ))}

                    <button
                      onClick={() => addSet(exIdx)}
                      className="w-full py-2 mt-1 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
                    >
                      + Add set
                    </button>

                    {/* Notes */}
                    <input
                      type="text"
                      placeholder="Trainer notes (optional)..."
                      value={ex.notes}
                      onChange={(e) => updateExercise(exIdx, 'notes', e.target.value)}
                      className="w-full mt-3 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add exercise button */}
        <button
          onClick={() => setShowExPicker(true)}
          className="w-full py-3.5 bg-zinc-900 border border-dashed border-zinc-700 rounded-xl text-zinc-400 text-sm font-medium hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
        >
          + Add Exercise
        </button>
      </div>

      {/* Exercise picker modal */}
      {showExPicker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-zinc-900 w-full rounded-t-2xl border-t border-zinc-800 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="font-semibold">Add Exercise</h3>
              <button onClick={() => { setShowExPicker(false); setExSearch(''); }} className="text-zinc-400 text-xl">×</button>
            </div>
            <div className="px-5 pb-3">
              <input
                type="text"
                placeholder="Search exercises..."
                value={exSearch}
                onChange={(e) => setExSearch(e.target.value)}
                autoFocus
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 px-5 pb-8">
              {Object.entries(filteredExercises).map(([group, exs]) => (
                <div key={group} className="mb-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{group}</p>
                  <div className="space-y-1">
                    {exs.map(ex => (
                      <button
                        key={ex}
                        onClick={() => addExercise(ex)}
                        className="w-full text-left px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(filteredExercises).length === 0 && exSearch && (
                <div className="text-center py-6">
                  <p className="text-zinc-500 text-sm mb-3">No match found</p>
                  <button
                    onClick={() => addExercise(exSearch)}
                    className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm"
                  >
                    Add "{exSearch}" as custom
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
