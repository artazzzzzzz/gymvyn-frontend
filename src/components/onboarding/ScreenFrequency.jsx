const DAY_OPTIONS = [2, 3, 4, 5, 6]

export default function ScreenFrequency({ answers, onNext, onBack, updateAnswer }) {
  const selected = answers.trainingDays

  const DAY_LABELS = {
    2: 'Just getting started',
    3: 'Building a habit',
    4: 'Committed',
    5: 'Serious',
    6: 'All in',
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

      <div style={{ paddingTop: 20, paddingBottom: 16 }}>
        <h1 style={{
          fontSize: 26, fontWeight: 800, lineHeight: 1.15,
          color: 'var(--text-primary)', margin: '0 0 8px',
          letterSpacing: '-0.3px',
        }}>
          How many days a week can you train?
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
          Be honest — consistency beats intensity.
        </p>
      </div>

      {/* Big display number */}
      <div style={{
        textAlign: 'center',
        paddingTop: 24, paddingBottom: 8,
      }}>
        <span style={{
          fontSize: 52,
          fontWeight: 800,
          color: selected ? 'var(--text-primary)' : 'var(--text-disabled)',
          letterSpacing: '-2px',
          lineHeight: 1,
          transition: 'color 0.2s',
        }}>
          {selected || '–'}
        </span>
        {selected > 0 && (
          <div style={{
            fontSize: 14, color: 'var(--text-secondary)',
            marginTop: 4, fontWeight: 500,
          }}>
            {DAY_LABELS[selected]}
          </div>
        )}
      </div>

      {/* Day pill selectors */}
      <div style={{
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        paddingTop: 24, paddingBottom: 8,
        flex: 1,
        alignItems: 'flex-start',
      }}>
        {DAY_OPTIONS.map(day => (
          <button
            key={day}
            onClick={() => updateAnswer('trainingDays', day)}
            style={{
              width: 54, height: 54,
              borderRadius: 14,
              border: selected === day
                ? '2px solid var(--text-cta)'
                : '1px solid var(--border)',
              backgroundColor: selected === day ? 'var(--text-cta)' : 'var(--bg-card)',
              color: selected === day ? 'var(--bg-primary)' : 'var(--text-primary)',
              fontSize: 20,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            {day}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 20, paddingBottom: 48 }}>
        <button
          onClick={onNext}
          disabled={!selected}
          style={{
            width: '100%',
            padding: '17px 24px',
            backgroundColor: selected ? 'var(--text-cta)' : 'var(--bg-pill)',
            color: selected ? 'var(--bg-primary)' : 'var(--text-disabled)',
            border: 'none',
            borderRadius: 14,
            fontSize: 17,
            fontWeight: 700,
            cursor: selected ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
