const FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein',  label: 'Protein',  unit: 'g' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g' },
  { key: 'fat',      label: 'Fat',      unit: 'g' },
];

const inputStyle = {
  width: '100%',
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 15,
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function MacroInputRow({ calories, protein, carbs, fat, onChange, label, deriveCalories }) {
  const vals = { calories, protein, carbs, fat };
  const validation = validateNutritionTarget(vals);
  const derivedCal = validation.macroCalories;
  const hasCompleteMacros = validation.complete;

  const handleChange = (key, raw) => {
    onChange({ calories, protein, carbs, fat, [key]: raw });
  };

  return (
    <div>
      {label && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 0 }}>
          {label}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {FIELDS.map(({ key, label: fieldLabel, unit }) => (
          <div key={key}>
            <label htmlFor={`nutrition-target-${key}`} style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px 2px' }}>
              {fieldLabel} ({unit})
            </label>
            <input
              id={`nutrition-target-${key}`}
              className="nutrition-target-input"
              inputMode="numeric"
              type="number"
              value={vals[key] ?? ''}
              onChange={e => handleChange(key, e.target.value)}
              placeholder="0"
              aria-invalid={validation.invalidFields?.includes(key) || undefined}
              aria-describedby={!validation.valid ? 'nutrition-target-error' : undefined}
              style={{ ...inputStyle, border: validation.invalidFields?.includes(key) ? '1.5px solid var(--error)' : inputStyle.border }}
            />
          </div>
        ))}
      </div>
      {deriveCalories && hasCompleteMacros && (
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '8px 0 0', letterSpacing: 0.1 }}>
          P×4 + C×4 + F×9 = <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{derivedCal} kcal</span>
        </p>
      )}
      {validation.partial && (
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '8px 0 0' }}>Partial target: add all four values to check calories against macros.</p>
      )}
      {!validation.valid && (
        <div id="nutrition-target-error" role="alert" style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--error-bg)', color: 'var(--error)', fontSize: 12 }}>
          <p style={{ margin: 0 }}>{validation.error}</p>
          {validation.macroCalories && (
            <button type="button" onClick={() => onChange({ calories: validation.macroCalories, protein, carbs, fat })} style={{ marginTop: 7, padding: 0, background: 'none', border: 'none', color: 'var(--text-primary)', font: 'inherit', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
              Update calories to {validation.macroCalories} kcal
            </button>
          )}
        </div>
      )}
      <style>{`.nutrition-target-input:focus-visible { outline: 2px solid var(--border-strong); outline-offset: 2px; }`}</style>
    </div>
  );
}
import { validateNutritionTarget } from '../../utils/nutritionTargetValidator';
