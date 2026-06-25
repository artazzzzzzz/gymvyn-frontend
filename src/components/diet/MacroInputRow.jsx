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

export default function MacroInputRow({ calories, protein, carbs, fat, onChange, label }) {
  const vals = { calories, protein, carbs, fat };

  const handleChange = (key, raw) => {
    const val = raw === '' ? '' : Number(raw);
    onChange({ calories, protein, carbs, fat, [key]: val });
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
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px 2px' }}>
              {fieldLabel} ({unit})
            </p>
            <input
              inputMode="numeric"
              type="number"
              value={vals[key] ?? ''}
              onChange={e => handleChange(key, e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
