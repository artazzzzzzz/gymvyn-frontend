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

const readonlyStyle = {
  ...inputStyle,
  background: 'var(--bg-secondary)',
  color: 'var(--text-secondary)',
  cursor: 'default',
};

export default function MacroInputRow({ calories, protein, carbs, fat, onChange, label, deriveCalories }) {
  const p = Number(protein) || 0;
  const c = Number(carbs) || 0;
  const f = Number(fat) || 0;
  const derivedCal = p * 4 + c * 4 + f * 9;

  const vals = {
    calories: deriveCalories ? derivedCal : calories,
    protein,
    carbs,
    fat,
  };

  const handleChange = (key, raw) => {
    const val = raw === '' ? '' : Number(raw);
    const next = { calories, protein, carbs, fat, [key]: val };
    if (deriveCalories) {
      const np = Number(key === 'protein' ? val : protein) || 0;
      const nc = Number(key === 'carbs'   ? val : carbs)   || 0;
      const nf = Number(key === 'fat'     ? val : fat)     || 0;
      next.calories = np * 4 + nc * 4 + nf * 9;
    }
    onChange(next);
  };

  return (
    <div>
      {label && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 0 }}>
          {label}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {FIELDS.map(({ key, label: fieldLabel, unit }) => {
          const isCalories = key === 'calories';
          const readonly = isCalories && deriveCalories;
          return (
            <div key={key}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px 2px' }}>
                {fieldLabel} ({unit}){readonly ? ' — auto' : ''}
              </p>
              <input
                inputMode="numeric"
                type="number"
                value={vals[key] ?? ''}
                onChange={readonly ? undefined : e => handleChange(key, e.target.value)}
                readOnly={readonly}
                placeholder="0"
                style={readonly ? readonlyStyle : inputStyle}
              />
            </div>
          );
        })}
      </div>
      {deriveCalories && (
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '8px 0 0', letterSpacing: 0.1 }}>
          P×4 + C×4 + F×9 = <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{derivedCal} kcal</span>
        </p>
      )}
    </div>
  );
}
