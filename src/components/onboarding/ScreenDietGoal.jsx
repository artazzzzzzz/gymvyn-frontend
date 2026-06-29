const DIET_GOALS = [
  { value: 'extreme_cut',  label: 'Extreme Cut',  desc: 'Aggressive deficit · ~500 kcal below TDEE' },
  { value: 'cut',          label: 'Cut',           desc: 'Moderate deficit · ~250 kcal below TDEE' },
  { value: 'maintenance',  label: 'Maintenance',   desc: 'Eat at maintenance · sustain current weight' },
  { value: 'bulk',         label: 'Bulk',          desc: 'Moderate surplus · ~250 kcal above TDEE' },
  { value: 'extreme_bulk', label: 'Extreme Bulk',  desc: 'Aggressive surplus · ~500 kcal above TDEE' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary',   label: 'Sedentary',   desc: 'Little or no exercise' },
  { value: 'light',       label: 'Light',        desc: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderate',     desc: '3–5 days/week' },
  { value: 'active',      label: 'Active',       desc: '6–7 days/week' },
  { value: 'very_active', label: 'Very Active',  desc: 'Twice daily or physical job' },
]

function SectionLabel({ text }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--text-tertiary)',
      margin: '0 0 12px',
    }}>
      {text}
    </p>
  )
}

function PillRow({ options, selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const active = selected === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: active ? '1.5px solid var(--text-primary)' : '1.5px solid transparent',
              background: active ? 'var(--text-primary)' : 'var(--bg-pill)',
              color: active ? 'var(--bg-card)' : 'var(--text-secondary)',
              fontSize: 14,
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function ScreenDietGoal({ answers, updateAnswer, onNext, onBack }) {
  const dietGoal     = answers.dietGoal     || 'maintenance'
  const activityLevel = answers.activityLevel || 'moderate'

  const dietDesc     = DIET_GOALS.find(o => o.value === dietGoal)?.desc
  const activityDesc = ACTIVITY_LEVELS.find(o => o.value === activityLevel)?.desc

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: 24,
          padding: '20px 0 0', alignSelf: 'flex-start', lineHeight: 1,
        }}
        aria-label="Go back"
      >←</button>

      {/* Heading */}
      <div style={{ paddingTop: 20, paddingBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 24 }}>
          STEP 7 OF 8
        </div>
        <h1 style={{
          fontSize: 26, fontWeight: 800, lineHeight: 1.15,
          color: 'var(--text-primary)', margin: '0 0 8px',
          letterSpacing: '-0.3px',
        }}>
          Set your diet goal
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
          We'll use this to calculate your daily targets.
        </p>
      </div>

      {/* Section 1 — Diet Goal */}
      <div style={{ flex: 1 }}>
        <SectionLabel text="Diet Goal" />
        <PillRow
          options={DIET_GOALS}
          selected={dietGoal}
          onSelect={v => updateAnswer('dietGoal', v)}
        />
        {dietDesc && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10, marginBottom: 0 }}>
            {dietDesc}
          </p>
        )}

        {/* Section 2 — Activity Level */}
        <div style={{ marginTop: 28 }}>
          <SectionLabel text="Activity Level" />
          <PillRow
            options={ACTIVITY_LEVELS}
            selected={activityLevel}
            onSelect={v => updateAnswer('activityLevel', v)}
          />
          {activityDesc && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10, marginBottom: 0 }}>
              {activityDesc}
            </p>
          )}
        </div>
      </div>

      {/* Next */}
      <div style={{ paddingTop: 20, paddingBottom: 48 }}>
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '17px 24px',
            backgroundColor: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: 14,
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
