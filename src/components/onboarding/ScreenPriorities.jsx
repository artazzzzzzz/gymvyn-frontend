import OptionCard from './OptionCard'
import { PRIORITY_OPTIONS } from './onboardingConfig'

const MAX = 3

export default function ScreenPriorities({ answers, onNext, onBack, updateAnswer }) {
  const selected = answers.priorities || []

  function handleToggle(value) {
    if (selected.includes(value)) {
      updateAnswer('priorities', selected.filter(v => v !== value))
    } else if (selected.length < MAX) {
      updateAnswer('priorities', [...selected, value])
    }
    // silently block 4th selection — visual feedback via disabled style below
  }

  const atMax = selected.length >= MAX

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

      <div style={{ paddingTop: 20, paddingBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 24 }}>
          STEP 5 OF 8
        </div>
        <h1 style={{
          fontSize: 26, fontWeight: 800, lineHeight: 1.15,
          color: 'var(--text-primary)', margin: '0 0 8px',
          letterSpacing: '-0.3px',
        }}>
          What matters most to you?
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
            Pick up to 3.
          </p>
          {selected.length > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: atMax ? 'var(--text-cta)' : 'var(--text-tertiary)',
              backgroundColor: 'var(--bg-pill)',
              borderRadius: 20, padding: '2px 8px',
              transition: 'color 0.2s',
            }}>
              {selected.length}/{MAX}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {PRIORITY_OPTIONS.map(opt => {
          const isSelected = selected.includes(opt.value)
          const isDisabled = atMax && !isSelected
          return (
            <div
              key={opt.value}
              style={{ opacity: isDisabled ? 0.45 : 1, transition: 'opacity 0.2s' }}
            >
              <OptionCard
                emoji={opt.emoji}
                label={opt.label}
                selected={isSelected}
                onSelect={() => handleToggle(opt.value)}
                multi
              />
            </div>
          )
        })}
      </div>

      <div style={{ paddingTop: 16, paddingBottom: 48 }}>
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
