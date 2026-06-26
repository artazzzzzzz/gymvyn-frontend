const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
]

function StatInput({ label, unit, value, onChange, placeholder, inputId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={inputId}
        style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="ob-stat-input"
          style={{
            width: '100%',
            padding: '13px 44px 13px 14px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            fontSize: 16,
            color: 'var(--text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--text-cta)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <span style={{
          position: 'absolute', right: 14, top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500,
          pointerEvents: 'none',
        }}>{unit}</span>
      </div>
    </div>
  )
}

export default function ScreenBodyStats({ answers, onNext, onBack, updateAnswer }) {
  const { height, currentWeight, targetWeight, age, gender } = answers

  const canContinue = height && currentWeight && age && gender

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: 24,
          padding: '20px 0 0', alignSelf: 'flex-start', lineHeight: 1,
        }}
        aria-label="Go back"
      >←</button>

      <div style={{ paddingTop: 20, paddingBottom: 24 }}>
        <h1 style={{
          fontSize: 26, fontWeight: 800, lineHeight: 1.15,
          color: 'var(--text-primary)', margin: '0 0 8px',
          letterSpacing: '-0.3px',
        }}>
          A few quick measurements
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
          Used to personalise your nutrition and track real progress.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {/* Height + Age row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatInput
            inputId="ob-height"
            label="Height"
            unit="cm"
            value={height}
            onChange={v => updateAnswer('height', v)}
            placeholder="175"
          />
          <StatInput
            inputId="ob-age"
            label="Age"
            unit="yrs"
            value={age}
            onChange={v => updateAnswer('age', v)}
            placeholder="25"
          />
        </div>

        {/* Current weight + Target weight row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatInput
            inputId="ob-weight"
            label="Current weight"
            unit="kg"
            value={currentWeight}
            onChange={v => updateAnswer('currentWeight', v)}
            placeholder="75"
          />
          <StatInput
            inputId="ob-target"
            label="Target weight"
            unit="kg"
            value={targetWeight}
            onChange={v => updateAnswer('targetWeight', v)}
            placeholder="70"
          />
        </div>

        {/* Gender */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Gender
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {GENDER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => updateAnswer('gender', opt.value)}
                style={{
                  flex: opt.value === 'prefer_not_to_say' ? 1.6 : 1,
                  padding: '11px 8px',
                  borderRadius: 12,
                  border: gender === opt.value
                    ? '2px solid var(--text-cta)'
                    : '1px solid var(--border)',
                  backgroundColor: gender === opt.value ? 'var(--bg-card)' : 'var(--bg-elevated)',
                  color: gender === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: gender === opt.value ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target weight note */}
        <p style={{
          fontSize: 12, color: 'var(--text-tertiary)',
          margin: 0, lineHeight: 1.5,
        }}>
          Target weight is optional. Height, current weight, age and gender are required for macro calculations.
        </p>
      </div>

      <div style={{ paddingTop: 16, paddingBottom: 48 }}>
        <button
          onClick={onNext}
          disabled={!canContinue}
          style={{
            width: '100%',
            padding: '17px 24px',
            backgroundColor: canContinue ? 'var(--text-cta)' : 'var(--bg-pill)',
            color: canContinue ? 'var(--bg-primary)' : 'var(--text-disabled)',
            border: 'none',
            borderRadius: 14,
            fontSize: 17,
            fontWeight: 700,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
