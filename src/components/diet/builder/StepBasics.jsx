import { Target, Utensils, List } from 'lucide-react';
import MacroInputRow from '../MacroInputRow';

const DETAIL_LEVELS = [
  {
    value: 'macros',
    icon: Target,
    title: 'Macro Targets',
    sub: 'Daily protein, carbs, and fat targets only',
    best: 'Flexible eating — client hits numbers their way',
  },
  {
    value: 'meals',
    icon: Utensils,
    title: 'Meal Plan',
    sub: 'Meal-by-meal breakdown with macros per meal',
    best: 'Structured eating — client knows what to eat when',
  },
  {
    value: 'full',
    icon: List,
    title: 'Full Plan',
    sub: 'Specific foods with exact quantities per meal',
    best: 'Precise dieting — every gram accounted for',
  },
];

export default function StepBasics({ data, onChange, onNext }) {
  const canNext = data.name.trim() && data.detail_level;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 20px', color: 'var(--text-primary)' }}>
        Template basics
      </h2>

      {/* Name */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Template name *</p>
        <input
          placeholder="e.g. Cut Phase Week 1"
          value={data.name}
          onChange={e => onChange({ ...data, name: e.target.value })}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border)',
            borderRadius: 8, padding: '12px',
            fontSize: 15, color: 'var(--text-primary)', outline: 'none',
          }}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Description (optional)</p>
        <textarea
          placeholder="Describe this plan…"
          rows={3}
          value={data.description}
          onChange={e => onChange({ ...data, description: e.target.value })}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border)',
            borderRadius: 8, padding: '12px',
            fontSize: 14, color: 'var(--text-primary)',
            outline: 'none', resize: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Detail level */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>Detail level *</p>
        {DETAIL_LEVELS.map(({ value, icon: Icon, title, sub, best }) => {
          const selected = data.detail_level === value;
          return (
            <div
              key={value}
              onClick={() => onChange({ ...data, detail_level: value })}
              style={{
                background: selected ? 'var(--bg-elevated)' : 'var(--bg-card)',
                border: `1.5px solid ${selected ? 'var(--border-strong)' : 'var(--border)'}`,
                borderRadius: 12, padding: '14px 16px',
                marginBottom: 8, cursor: 'pointer',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: selected ? 'var(--text-primary)' : 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} color={selected ? 'var(--bg-primary)' : 'var(--text-secondary)'} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px', color: 'var(--text-primary)' }}>{title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{sub}</p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>Best for: {best}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Macro targets */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>Daily macro targets</p>
        <MacroInputRow
          calories={data.calories_target}
          protein={data.protein_g}
          carbs={data.carbs_g}
          fat={data.fat_g}
          deriveCalories
          onChange={v => onChange({
            ...data,
            calories_target: v.calories,
            protein_g: v.protein,
            carbs_g: v.carbs,
            fat_g: v.fat,
          })}
        />
      </div>

      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          width: '100%', padding: '14px',
          background: canNext ? 'var(--text-primary)' : 'var(--bg-elevated)',
          color: canNext ? 'var(--bg-primary)' : 'var(--text-disabled)',
          border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 600, cursor: canNext ? 'pointer' : 'not-allowed',
        }}
      >
        Next →
      </button>
    </div>
  );
}
