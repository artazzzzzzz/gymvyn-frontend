const FEATURES = [
  {
    emoji: '💪',
    title: 'Log every workout',
    sub: 'Sets, reps, weight — every session, perfectly tracked.',
    accent: 'var(--muscle-chest)',
  },
  {
    emoji: '📈',
    title: 'Watch yourself improve',
    sub: 'Body stats, PRs and progress charts in one place.',
    accent: 'var(--muscle-back)',
  },
  {
    emoji: '🏋️',
    title: 'Your gym, in your pocket',
    sub: 'Classes, trainers and gym features built in.',
    accent: 'var(--muscle-legs)',
  },
]

export default function ScreenWelcome({ onNext }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/* Logo */}
      <div className="ob-stagger" style={{ paddingTop: 60, animationDelay: '0ms' }}>
        <div style={{
          width: 44, height: 44,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 16, fontWeight: 900,
            color: 'var(--text-primary)', letterSpacing: '-0.5px',
          }}>GV</span>
        </div>
      </div>

      {/* Headline */}
      <div className="ob-stagger" style={{ paddingTop: 28, animationDelay: '80ms' }}>
        <h1 style={{
          fontSize: 36, fontWeight: 800, lineHeight: 1.08,
          color: 'var(--text-primary)', margin: 0,
          letterSpacing: '-0.8px', textWrap: 'balance',
        }}>
          Your fitness,<br />finally in one place.
        </h1>
        <p style={{
          fontSize: 16, color: 'var(--text-secondary)',
          margin: '12px 0 0', lineHeight: 1.55,
        }}>
          Everything you need to train, track and improve.
        </p>
      </div>

      {/* Feature list */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', paddingTop: 36, paddingBottom: 12,
        gap: 12,
      }}>
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="ob-stagger"
            style={{ animationDelay: `${180 + i * 90}ms` }}
          >
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              padding: '18px 18px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              borderLeft: `3px solid ${f.accent}`,
            }}>
              <span style={{
                fontSize: 26, lineHeight: 1, flexShrink: 0,
                marginTop: 1,
              }}>{f.emoji}</span>
              <div>
                <div style={{
                  fontSize: 16, fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 4, letterSpacing: '-0.2px',
                }}>{f.title}</div>
                <div style={{
                  fontSize: 13, color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                }}>{f.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="ob-stagger" style={{ paddingBottom: 48, animationDelay: '460ms' }}>
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '17px 24px',
            backgroundColor: 'var(--text-cta)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: 14,
            fontSize: 17, fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '-0.2px',
            transitionProperty: 'scale',
            transitionDuration: '150ms',
            transitionTimingFunction: 'ease-out',
          }}
          onMouseDown={e => e.currentTarget.style.scale = '0.96'}
          onMouseUp={e => e.currentTarget.style.scale = '1'}
          onMouseLeave={e => e.currentTarget.style.scale = '1'}
          onTouchStart={e => e.currentTarget.style.scale = '0.96'}
          onTouchEnd={e => e.currentTarget.style.scale = '1'}
        >
          Get Started
        </button>
      </div>
    </div>
  )
}
