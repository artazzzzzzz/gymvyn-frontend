import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import ExercisePicker from '../components/ExercisePicker';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical,
  ChevronRight, Dumbbell, Pencil, Check
} from 'lucide-react';

function newSet(n) { return { set: n, reps: '', kg: '', rest_seconds: 60 }; }
function newExercise(name = '', muscleGroup = '') {
  return { id: Date.now() + Math.random(), name, muscleGroup, sets: [newSet(1)], notes: '' };
}
function newDay(n) { return { day: n, name: `Day ${n}`, exercises: [] }; }

export default function UserPlanBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { planId } = useParams();
  const location = useLocation();
  const isEditing = !!planId && planId !== 'new';
  const targetUserId = location.state?.targetUserId || user.id;
  const isForClient = targetUserId !== user.id;

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState([newDay(1)]);
  const [activeDay, setActiveDay] = useState(0);
  const [showExPicker, setShowExPicker] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null); // { exIdx, ...exercise }
  const [editingDayName, setEditingDayName] = useState(false);
  const dayNameRef = useRef(null);

  useEffect(() => { if (isEditing) loadPlan(); }, [isEditing]);

  useEffect(() => {
    if (location.state?.aiPlan && !isEditing) {
      const aiPlan = location.state.aiPlan;
      setName(aiPlan.name || '');
      setDescription(aiPlan.description || '');
      setDays(aiPlan.days?.length ? aiPlan.days : [newDay(1)]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editingDayName && dayNameRef.current) dayNameRef.current.focus();
  }, [editingDayName]);

  const loadPlan = async () => {
    try {
      const all = await apiFetch(`/api/user-plans/${targetUserId}`);
      const p = all.find(x => x.id === planId);
      if (!p) return;
      setName(p.name);
      setDescription(p.description || '');
      setDays(p.plan_data?.days?.length ? p.plan_data.days : [newDay(1)]);
    } catch (err) { console.error(err); }
  };

  const addDay = () => {
    setDays(p => [...p, newDay(p.length + 1)]);
    setActiveDay(days.length);
  };
  const removeDay = (idx) => {
    if (days.length === 1) return;
    setDays(p => p.filter((_, i) => i !== idx).map((d, i) => ({
      ...d, day: i + 1,
      name: d.name.startsWith('Day ') ? `Day ${i + 1}` : d.name
    })));
    setActiveDay(p => Math.min(p, days.length - 2));
  };
  const updateDayName = (idx, val) => setDays(p => p.map((d, i) => i === idx ? { ...d, name: val } : d));

  const addExercise = (ex) => {
    setDays(p => p.map((d, i) => i === activeDay
      ? { ...d, exercises: [...d.exercises, newExercise(ex.name, ex.muscle_group || ex.muscleGroup || '')] }
      : d
    ));
    setShowExPicker(false);
  };

  const removeExercise = (exIdx) => setDays(p => p.map((d, i) => i === activeDay
    ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIdx) }
    : d
  ));

  const addSet = () => {
    if (editingExercise === null) return;
    const newSets = [...editingExercise.sets, newSet(editingExercise.sets.length + 1)];
    setEditingExercise(prev => ({ ...prev, sets: newSets }));
  };

  const removeSet = (setIdx) => {
    if (editingExercise.sets.length <= 1) return;
    const newSets = editingExercise.sets
      .filter((_, si) => si !== setIdx)
      .map((s, si) => ({ ...s, set: si + 1 }));
    setEditingExercise(prev => ({ ...prev, sets: newSets }));
  };

  const updateSet = (setIdx, field, val) => {
    const newSets = editingExercise.sets.map((s, si) => si === setIdx ? { ...s, [field]: val } : s);
    setEditingExercise(prev => ({ ...prev, sets: newSets }));
  };

  const saveExerciseEdits = () => {
    if (editingExercise === null) return;
    const { exIdx, ...exerciseData } = editingExercise;
    setDays(p => p.map((d, i) => i === activeDay
      ? { ...d, exercises: d.exercises.map((ex, ei) => ei === exIdx ? { ...ex, ...exerciseData } : ex) }
      : d
    ));
    setEditingExercise(null);
  };

  const openExerciseDetail = (ex, exIdx) => {
    setEditingExercise({ ...ex, exIdx });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const hasEx = days.some(d => d.exercises?.length > 0);
    if (!hasEx) return;
    setSaving(true);
    try {
      const payload = { userId: targetUserId, name: name.trim(), description: description.trim(), planData: { days } };
      if (isEditing) {
        await apiFetch(`/api/user-plans/${planId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: name.trim(), description: description.trim(), plan_data: { days } })
        });
      } else {
        await apiFetch('/api/user-plans', { method: 'POST', body: JSON.stringify(payload) });
      }
      navigate(isForClient ? `/trainer/client/${targetUserId}` : '/workout');
    } catch (err) { alert('Failed to save'); } finally { setSaving(false); }
  };

  const currentDay = days[activeDay] || days[0];
  const hasExercises = days.some(d => d.exercises?.length > 0);
  const canSave = name.trim() && hasExercises;

  const setSummary = (sets) => {
    if (!sets?.length) return '0 sets';
    const reps = sets[0]?.reps;
    return `${sets.length} set${sets.length !== 1 ? 's' : ''}${reps ? ` · ${reps} reps` : ''}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Fixed Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 52,
        background: "var(--bg-card)", borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', zIndex: 50
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={20} color="var(--text-secondary)" />
          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Workout</span>
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            height: 34, padding: '0 16px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: canSave ? 'pointer' : 'default',
            background: canSave ? 'var(--bg-card)' : 'var(--bg-input)',
            color: canSave ? 'var(--text-primary)' : 'var(--text-muted)',
            border: canSave ? '1px solid var(--text-primary)' : '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            transition: 'background 0.2s, color 0.2s, border-color 0.2s'
          }}
        >
          {saving ? 'Saving…' : 'Save Plan'}
        </button>
      </div>

      {/* Plan Meta Card */}
      <div style={{
        background: "var(--bg-card)", borderRadius: 16, margin: '64px 16px 0',
        overflow: 'hidden'
      }}>
        <input
          type="text"
          placeholder="Plan name, e.g. Push Day"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            display: 'block', width: '100%', padding: '20px 20px 0',
            fontSize: 20, fontWeight: 700, color: "var(--text-primary)",
            border: 'none', outline: 'none', background: 'transparent',
            boxSizing: 'border-box'
          }}
        />
        <div style={{ height: 1, background: 'var(--bg-pill)', margin: '12px 20px' }} />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{
            display: 'block', width: '100%', padding: '0 20px 16px',
            fontSize: 14, color: "var(--text-secondary)",
            border: 'none', outline: 'none', background: 'transparent',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Days Strip */}
      <div style={{
        display: 'flex', gap: 8, padding: '16px 16px 0',
        overflowX: 'auto', scrollbarWidth: 'none'
      }}>
        {days.map((d, idx) => {
          const active = activeDay === idx;
          return (
            <button
              key={idx}
              onClick={() => { setActiveDay(idx); setEditingDayName(false); }}
              style={{
                flexShrink: 0, height: 36, padding: '0 16px', borderRadius: 10,
                fontSize: 14, fontWeight: active ? 600 : 500,
                background: active ? "var(--text-primary)" : "var(--bg-card)",
                color: active ? "var(--bg-card)" : "var(--text-primary)",
                border: active ? 'none' : '1px solid var(--border)',
                whiteSpace: 'nowrap', cursor: 'pointer'
              }}
            >
              {d.name}
            </button>
          );
        })}
        <button
          onClick={addDay}
          style={{
            flexShrink: 0, height: 36, padding: '0 16px', borderRadius: 10,
            fontSize: 14, fontWeight: 500,
            background: "var(--bg-card)", color: 'var(--text-cta)',
            border: '1px solid var(--text-cta)',
            display: 'flex', alignItems: 'center', gap: 4,
            whiteSpace: 'nowrap', cursor: 'pointer'
          }}
        >
          <Plus size={14} color="var(--text-cta)" />
          Day
        </button>
      </div>

      {/* Active Day Card */}
      <div style={{
        background: "var(--bg-card)", borderRadius: 16,
        margin: '12px 16px 0', overflow: 'hidden'
      }}>
        {/* Day name row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px 12px', borderBottom: '1px solid var(--bg-pill)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {editingDayName ? (
              <input
                ref={dayNameRef}
                type="text"
                value={currentDay.name}
                onChange={e => updateDayName(activeDay, e.target.value)}
                onBlur={() => setEditingDayName(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingDayName(false)}
                style={{
                  fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
                  border: 'none', borderBottom: '1px solid var(--text-cta)',
                  outline: 'none', background: 'transparent',
                  width: '100%', padding: '2px 0'
                }}
              />
            ) : (
              <button
                onClick={() => setEditingDayName(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{currentDay.name}</span>
                <Pencil size={14} color="var(--text-tertiary)" />
              </button>
            )}
          </div>
          {days.length > 1 && (
            <button
              onClick={() => {
                if (window.confirm(`Remove ${currentDay.name}?`)) removeDay(activeDay);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: 8 }}
            >
              <Trash2 size={18} color="var(--text-tertiary)" />
            </button>
          )}
        </div>

        {/* Exercise rows */}
        {currentDay.exercises.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <Dumbbell size={28} color="var(--text-tertiary)" style={{ margin: '0 auto', display: 'block' }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-tertiary)", marginTop: 8, marginBottom: 0 }}>No exercises yet</p>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4, marginBottom: 0 }}>Tap below to add</p>
          </div>
        ) : (
          currentDay.exercises.map((ex, exIdx) => (
            <div
              key={ex.id || exIdx}
              onClick={() => openExerciseDetail(ex, exIdx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              <GripVertical size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{ex.name}</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: '2px 0 0' }}>{setSummary(ex.sets)}</p>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
            </div>
          ))
        )}
      </div>

      {/* Add Exercise Button */}
      <button
        onClick={() => setShowExPicker(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: 'calc(100% - 32px)', margin: '10px 16px 32px',
          height: 52, borderRadius: 14,
          background: "var(--bg-card)", border: '1px solid var(--border)',
          cursor: 'pointer'
        }}
      >
        <Plus size={18} color="var(--text-primary)" />
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Add Exercise</span>
      </button>

      {/* Exercise Picker */}
      {showExPicker && (
        <ExercisePicker
          onSelect={(ex) => addExercise(ex)}
          onClose={() => setShowExPicker(false)}
          preSelected={currentDay?.exercises?.map(e => e.name) || []}
        />
      )}

      {/* Exercise Detail Bottom Sheet */}
      {editingExercise !== null && (
        <>
          {/* Overlay */}
          <div
            onClick={saveExerciseEdits}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.4)', zIndex: 40
            }}
          />
          {/* Sheet */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: "var(--bg-card)", borderRadius: '24px 24px 0 0',
            zIndex: 50, minHeight: '55vh',
            paddingBottom: 'env(safe-area-inset-bottom, 16px)',
            transform: 'translateY(0)',
            transition: 'transform 300ms ease',
            overflowY: 'auto'
          }}>
            {/* Drag handle */}
            <div style={{
              width: 36, height: 4, background: 'var(--border)',
              borderRadius: 2, margin: '12px auto 0'
            }} />

            {/* Header */}
            <div style={{ padding: '16px 20px 0' }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{editingExercise.name}</p>
              {editingExercise.muscleGroup && (
                <span style={{
                  display: 'inline-block', marginTop: 6,
                  background: 'var(--bg-primary)', padding: '4px 10px', borderRadius: 8,
                  fontSize: 12, color: "var(--text-secondary)"
                }}>
                  {editingExercise.muscleGroup}
                </span>
              )}
            </div>

            {/* SETS label */}
            <p style={{
              padding: '0 20px', marginTop: 16, marginBottom: 8,
              fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)",
              letterSpacing: '0.08em'
            }}>SETS</p>

            {/* Set rows */}
            {editingExercise.sets.map((s, setIdx) => (
              <div
                key={setIdx}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", minWidth: 48 }}>
                  Set {setIdx + 1}
                </span>
                <input
                  type="text"
                  inputMode="text"
                  placeholder="12"
                  value={s.reps}
                  onChange={e => updateSet(setIdx, 'reps', e.target.value)}
                  style={{
                    background: 'var(--bg-primary)', borderRadius: 8, height: 36, width: 72,
                    textAlign: 'center', fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
                    border: 'none', outline: 'none'
                  }}
                />
                <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>×</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="60"
                  value={s.kg}
                  onChange={e => updateSet(setIdx, 'kg', e.target.value)}
                  style={{
                    background: 'var(--bg-primary)', borderRadius: 8, height: 36, width: 72,
                    textAlign: 'center', fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
                    border: 'none', outline: 'none'
                  }}
                />
                <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>kg</span>
                {editingExercise.sets.length > 1 && (
                  <button
                    onClick={() => removeSet(setIdx)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <Trash2 size={16} color="var(--text-tertiary)" />
                  </button>
                )}
              </div>
            ))}

            {/* Add Set */}
            <button
              onClick={addSet}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer'
              }}
            >
              <Plus size={14} color="var(--text-cta)" />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-cta)' }}>Add Set</span>
            </button>

            {/* Done button */}
            <div style={{ padding: '8px 20px' }}>
              <button
                onClick={saveExerciseEdits}
                style={{
                  width: '100%', height: 52, borderRadius: 14,
                  background: "var(--text-primary)", color: "var(--bg-card)",
                  fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>

            {/* Remove exercise link */}
            <button
              onClick={() => {
                removeExercise(editingExercise.exIdx);
                setEditingExercise(null);
              }}
              style={{
                display: 'block', width: '100%', padding: '8px 20px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, color: '#FF3B30', textAlign: 'center'
              }}
            >
              Remove Exercise
            </button>
          </div>
        </>
      )}
    </div>
  );
}
