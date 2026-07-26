import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import ExercisePicker from '../components/ExercisePicker';

export default function TrainerTemplateBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { templateId } = useParams();
  const isEditing = !!templateId && templateId !== 'new';

  const [saving, setSaving] = useState(false);
  const [showExPicker, setShowExPicker] = useState(false);
  const [pickingForDay, setPickingForDay] = useState(null);
  const [editingSets, setEditingSets] = useState(null); // { dayIdx, exIdx, sets, reps, rest }

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [days, setDays] = useState([{ id: crypto.randomUUID(), name: 'Day 1', exercises: [] }]);
  const [openDays, setOpenDays] = useState([0]);

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
      setDifficulty(t.template_data?.difficulty || 'intermediate');
      setTags(t.tags || []);
      setDays(t.template_data?.days?.length
        ? t.template_data.days.map(d => ({ ...d, id: d.id || crypto.randomUUID() }))
        : [{ id: crypto.randomUUID(), name: 'Day 1', exercises: [] }]);
      setOpenDays([0]);
    } catch (err) {
      console.error('Load template error:', err);
    }
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  const removeTag = (i) => setTags(tags.filter((_, idx) => idx !== i));

  const addDay = () => {
    const n = days.length + 1;
    setDays([...days, { id: crypto.randomUUID(), name: `Day ${n}`, exercises: [] }]);
    setOpenDays([...openDays, days.length]);
  };

  const deleteDay = (dayIdx) => {
    if (days.length === 1) return;
    setDays(days.filter((_, i) => i !== dayIdx));
    setOpenDays(openDays.filter(i => i !== dayIdx).map(i => i > dayIdx ? i - 1 : i));
  };

  const updateDayName = (dayIdx, value) =>
    setDays(days.map((d, i) => i === dayIdx ? { ...d, name: value } : d));

  const toggleDay = (dayIdx) => {
    if (openDays.includes(dayIdx)) {
      setOpenDays(openDays.filter(i => i !== dayIdx));
    } else {
      setOpenDays([...openDays, dayIdx]);
    }
  };

  const addExercise = (dayIdx, exercise) => {
    setDays(days.map((d, i) => i === dayIdx ? {
      ...d,
      exercises: [...d.exercises, {
        id: crypto.randomUUID(),
        name: exercise.name,
        sets: 3,
        reps: '10–12',
        rest: 60,
        muscleGroup: exercise.muscle || exercise.muscleGroup || ''
      }]
    } : d));
    setShowExPicker(false);
  };

  const updateExerciseSets = (dayIdx, exIdx, sets, reps, rest) =>
    setDays(days.map((d, i) => i !== dayIdx ? d : {
      ...d,
      exercises: d.exercises.map((e, j) => j !== exIdx ? e : { ...e, sets, reps, rest })
    }));

  const deleteExercise = (dayIdx, exIdx) =>
    setDays(days.map((d, i) => i !== dayIdx ? d : {
      ...d,
      exercises: d.exercises.filter((_, j) => j !== exIdx)
    }));

  const moveExercise = (dayIdx, exIdx, direction) => {
    const exercises = [...days[dayIdx].exercises];
    const target = exIdx + direction;
    if (target < 0 || target >= exercises.length) return;
    [exercises[exIdx], exercises[target]] = [exercises[target], exercises[exIdx]];
    setDays(days.map((d, i) => i === dayIdx ? { ...d, exercises } : d));
  };

  const getMuscles = (exercises) => {
    const muscles = new Set();
    exercises.forEach(ex => { if (ex.muscleGroup) muscles.add(ex.muscleGroup); });
    return [...muscles].slice(0, 3);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert('Give your template a name');
    setSaving(true);
    try {
      const templateData = {
        difficulty,
        days: days.map(d => ({
          name: d.name,
          exercises: d.exercises.map(e => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            rest: e.rest,
            muscleGroup: e.muscleGroup
          }))
        }))
      };
      if (isEditing) {
        await apiFetch(`/api/trainer/templates/${templateId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: name.trim(), description: description.trim(), tags, template_data: templateData })
        });
      } else {
        await apiFetch('/api/trainer/templates', {
          method: 'POST',
          body: JSON.stringify({ trainerId: user.id, type: 'workout', name: name.trim(), description: description.trim(), tags, templateData })
        });
      }
      navigate('/trainer/templates');
    } catch (err) {
      const msg = err?.message || String(err) || 'Unknown error';
      alert('Failed to save: ' + msg);
      console.error('[handleSave] caught:', err);
    } finally {
      setSaving(false);
    }
  };

  const REST_LABELS = { 30: '30s', 60: '60s', 90: '90s', 120: '2min' };
  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);

  const Spinner = ({ value, onChange, min = 1, max = 20 }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 32, height: 32, borderRadius: 8, border: '0.5px solid var(--border)', background: 'transparent', fontSize: 18, cursor: 'pointer' }}
      >−</button>
      <span style={{ fontSize: 20, fontWeight: 500, minWidth: 32, textAlign: 'center' }}>{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width: 32, height: 32, borderRadius: 8, border: '0.5px solid var(--border)', background: 'transparent', fontSize: 18, cursor: 'pointer' }}
      >+</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '52px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => navigate('/trainer/templates')}
          style={{ fontSize: 14, color: "var(--text-secondary)", background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Templates
        </button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>
          {isEditing ? 'Edit Template' : 'New Template'}
        </span>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Meta card */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, marginBottom: 12, border: '0.5px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Template name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              fontSize: 18, fontWeight: 500, border: 'none',
              borderBottom: '0.5px solid var(--border)',
              outline: 'none', width: '100%', padding: '8px 0',
              marginBottom: 12, background: 'transparent', display: 'block'
            }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{
              fontSize: 13, border: 'none',
              borderBottom: '0.5px solid var(--border)',
              outline: 'none', width: '100%', padding: '6px 0',
              marginBottom: 14, background: 'transparent', color: "var(--text-secondary)", display: 'block'
            }}
          />

          {/* Difficulty pills */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Difficulty</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['beginner', 'intermediate', 'advanced'].map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 13,
                    border: difficulty === d ? 'none' : '0.5px solid var(--border)',
                    background: difficulty === d ? "var(--text-primary)" : 'transparent',
                    color: difficulty === d ? 'white' : "var(--text-secondary)",
                    cursor: 'pointer', textTransform: 'capitalize'
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {tags.map((t, i) => (
                <span
                  key={i}
                  style={{
                    background: 'var(--bg-pill)', color: "var(--text-secondary)",
                    borderRadius: 20, padding: '3px 10px', fontSize: 11,
                    display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  {t}
                  <button
                    onClick={() => removeTag(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: "var(--text-tertiary)", fontSize: 12, padding: 0, lineHeight: 1 }}
                  >×</button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add tag…"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={addTag}
                style={{ fontSize: 12, border: 'none', outline: 'none', background: 'transparent', color: "var(--text-secondary)", minWidth: 70 }}
              />
            </div>
          </div>
        </div>

        {/* Day cards */}
        {days.map((day, dayIdx) => {
          const isOpen = openDays.includes(dayIdx);
          const muscles = getMuscles(day.exercises);
          return (
            <div
              key={day.id || dayIdx}
              style={{ background: 'var(--bg-card)', borderRadius: 12, border: '0.5px solid var(--border)', marginBottom: 10 }}
            >
              {/* Day header */}
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-disabled)', fontSize: 16, cursor: 'grab', userSelect: 'none' }}>⠿</span>
                <input
                  type="text"
                  value={day.name}
                  onChange={e => updateDayName(dayIdx, e.target.value)}
                  style={{ flex: 1, fontSize: 14, fontWeight: 500, border: 'none', outline: 'none', background: 'transparent' }}
                />
                {muscles.length > 0 && (
                  <span style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>{muscles.join(', ')}</span>
                )}
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: 'nowrap' }}>{day.exercises.length} ex</span>
                <button
                  onClick={() => toggleDay(dayIdx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: "var(--text-tertiary)", fontSize: 11, padding: 0 }}
                >
                  {isOpen ? '▲' : '▼'}
                </button>
                {days.length > 1 && (
                  <button
                    onClick={() => deleteDay(dayIdx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D85A30', fontSize: 16, padding: '0 0 0 4px', lineHeight: 1 }}
                  >×</button>
                )}
              </div>

              {isOpen && (
                <>
                  {day.exercises.map((ex, exIdx) => (
                    <div
                      key={ex.id || exIdx}
                      style={{
                        borderTop: '0.5px solid var(--border)',
                        height: 44, display: 'flex', alignItems: 'center',
                        padding: '0 16px', gap: 8
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)", minWidth: 16, textAlign: 'center' }}>{exIdx + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{ex.name}</span>
                      <button
                        onClick={() => setEditingSets({ dayIdx, exIdx, sets: ex.sets, reps: ex.reps, rest: ex.rest })}
                        style={{
                          background: 'var(--bg-pill)', borderRadius: 6,
                          padding: '2px 8px', fontSize: 12, color: "var(--text-secondary)",
                          border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                      >
                        {ex.sets}×{ex.reps} · {ex.rest >= 60 ? (ex.rest / 60) + 'min' : ex.rest + 's'}
                      </button>
                      <button
                        onClick={() => moveExercise(dayIdx, exIdx, -1)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 13, padding: '0 1px' }}
                      >↑</button>
                      <button
                        onClick={() => moveExercise(dayIdx, exIdx, 1)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 13, padding: '0 1px' }}
                      >↓</button>
                      <button
                        onClick={() => deleteExercise(dayIdx, exIdx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D85A30', fontSize: 16, padding: '0 0 0 2px', lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}

                  {/* Add exercise row */}
                  <div
                    onClick={() => { setPickingForDay(dayIdx); setShowExPicker(true); }}
                    style={{
                      borderTop: '0.5px dashed var(--border)',
                      height: 40, display: 'flex', alignItems: 'center',
                      padding: '0 16px', cursor: 'pointer',
                      color: 'var(--text-cta)', fontSize: 13
                    }}
                  >
                    + Add Exercise
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Add day */}
        <button
          onClick={addDay}
          style={{
            width: '100%', padding: 14,
            border: '1.5px dashed var(--border-strong)',
            borderRadius: 12, background: 'transparent',
            fontSize: 13, color: "var(--text-tertiary)", cursor: 'pointer', marginBottom: 12
          }}
        >
          + Add Day
        </button>

        {/* Sets/reps bottom sheet — normal flow, not fixed */}
        {editingSets && (() => {
          const s = editingSets;
          const ex = days[s.dayIdx]?.exercises[s.exIdx];
          if (!ex) return null;
          return (
            <div style={{
              marginTop: 32, background: 'var(--bg-card)',
              border: '0.5px solid var(--border)',
              borderRadius: '16px 16px 0 0', padding: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{ex.name}</span>
                <button
                  onClick={() => setEditingSets(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: "var(--text-tertiary)", lineHeight: 1 }}
                >×</button>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10 }}>Sets</div>
                <Spinner value={s.sets} onChange={v => setEditingSets({ ...s, sets: v })} min={1} max={10} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>Reps</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['6–8', '8–10', '10–12', '12–15', '15–20', 'AMRAP'].map(r => (
                    <button
                      key={r}
                      onClick={() => setEditingSets({ ...s, reps: r })}
                      style={{
                        padding: '6px 12px', borderRadius: 20, fontSize: 12,
                        border: s.reps === r ? 'none' : '0.5px solid var(--border)',
                        background: s.reps === r ? "var(--text-primary)" : 'transparent',
                        color: s.reps === r ? 'white' : "var(--text-secondary)", cursor: 'pointer'
                      }}
                    >{r}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>Rest</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[30, 60, 90, 120].map(r => (
                    <button
                      key={r}
                      onClick={() => setEditingSets({ ...s, rest: r })}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12,
                        border: s.rest === r ? 'none' : '0.5px solid var(--border)',
                        background: s.rest === r ? "var(--text-primary)" : 'transparent',
                        color: s.rest === r ? 'white' : "var(--text-secondary)", cursor: 'pointer'
                      }}
                    >{REST_LABELS[r]}</button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  updateExerciseSets(s.dayIdx, s.exIdx, s.sets, s.reps, s.rest);
                  setEditingSets(null);
                }}
                style={{
                  width: '100%', padding: 14, background: "var(--text-primary)",
                  color: 'var(--bg-primary)', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 500, cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          );
        })()}
      </div>

      {/* Bottom save bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-card)', borderTop: '0.5px solid var(--border)',
        padding: '12px 20px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        zIndex: 10
      }}>
        <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          {days.length} day{days.length !== 1 ? 's' : ''} · {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
        </span>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          style={{
            padding: '10px 24px',
            background: saving || !name.trim() ? 'var(--text-tertiary)' : "var(--text-primary)",
            color: 'white', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 500,
            cursor: saving || !name.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Saving…' : isEditing ? 'Update' : 'Save Template'}
        </button>
      </div>

      {showExPicker && (
        <ExercisePicker
          onSelect={(ex) => addExercise(pickingForDay, ex)}
          onClose={() => setShowExPicker(false)}
        />
      )}
    </div>
  );
}
