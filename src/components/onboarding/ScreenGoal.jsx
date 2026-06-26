import OptionCard from './OptionCard'
import { GOAL_OPTIONS } from './onboardingConfig'

export default function ScreenGoal({ answers, onNext, onBack, updateAnswer }) {
  const selected = answers.goals || []

  function handleToggle(value) {
    if (selected.includes(value)) {
      updateAnswer('goals', selected.filter(v => v !== value))
    } else {
      updateAnswer('goals', [...selected, value])
    }
  }

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

      <div style={{ paddingTop: 20, paddingBottom: 28 }}>
        <h1 style={{
          fontSize: 26, fontWeight: 800, lineHeight: 1.15,
          color: 'var(--text-primary)', margin: '0 0 8px',
          letterSpacing: '-0.3px',
        }}>
          What brings you to Gymvyn?
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
          Pick all that apply.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {GOAL_OPTIONS.map(opt => (
          <OptionCard
            key={opt.value}
            emoji={opt.emoji}
            label={opt.label}
            sub={opt.sub}
            selected={selected.includes(opt.value)}
            onSelect={() => handleToggle(opt.value)}
            multi
          />
        ))}
      </div>

      <div style={{ paddingTop: 20, paddingBottom: 48 }}>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          style={{
            width: '100%',
            padding: '17px 24px',
            backgroundColor: selected.length > 0 ? 'var(--text-cta)' : 'var(--bg-pill)',
            color: selected.length > 0 ? 'var(--bg-primary)' : 'var(--text-disabled)',
            border: 'none',
            borderRadius: 14,
            fontSize: 17,
            fontWeight: 700,
            cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
