import { useState } from 'react';
import DayEditor from '../DayEditor';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StepDays({ data, onChange, onNext, onBack }) {
  const [activeDay, setActiveDay] = useState(0);
  const [error, setError] = useState('');

  const updateDay = (idx, updated) => {
    const days = data.days.map((d, i) => i === idx ? updated : d);
    onChange({ ...data, days });
  };

  const handleNext = () => {
    if (data.detail_level !== 'macros') {
      const hasMeal = data.days.some(d => (d.meals || []).length > 0);
      if (!hasMeal) {
        setError('Add at least one meal to continue.');
        return;
      }
    }
    setError('');
    onNext();
  };

  const defaultMacros = {
    calories: data.calories_target,
    protein: data.protein_g,
    carbs: data.carbs_g,
    fat: data.fat_g,
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: 'var(--text-primary)' }}>
        Days & Meals
      </h2>

      {/* Day tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none', marginBottom: 4 }}>
        {DAY_LABELS.map((label, idx) => {
          const hasMeals = (data.days[idx]?.meals || []).length > 0;
          const isActive = activeDay === idx;
          return (
            <button
              key={idx}
              onClick={() => { setActiveDay(idx); setError(''); }}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
                border: isActive ? '1.5px solid var(--border-strong)' : '0.5px solid var(--border)',
                background: isActive ? 'var(--bg-elevated)' : 'var(--bg-card)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                position: 'relative',
              }}
            >
              {label}
              {hasMeals && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--text-cta)',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Active day editor */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 12px', fontWeight: 500 }}>
          {DAY_LABELS[activeDay]} — Day {activeDay + 1}
        </p>
        <DayEditor
          key={activeDay}
          day={data.days[activeDay]}
          dayNumber={activeDay + 1}
          detailLevel={data.detail_level}
          onChange={updated => updateDay(activeDay, updated)}
          defaultMacros={defaultMacros}
        />
      </div>

      {error && (
        <p style={{ fontSize: 13, color: '#D85A30', marginBottom: 12 }}>{error}</p>
      )}

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            padding: '13px 20px', borderRadius: 12,
            border: 'none', background: 'none',
            color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          style={{
            flex: 1, padding: '13px',
            background: 'var(--text-primary)', color: 'var(--bg-primary)',
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
