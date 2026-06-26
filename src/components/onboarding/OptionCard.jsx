export default function OptionCard({ emoji, label, sub, selected, onSelect, multi = false }) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        padding: '15px 16px',
        backgroundColor: selected ? 'var(--bg-card)' : 'var(--bg-card)',
        border: selected
          ? '2px solid var(--text-cta)'
          : '1px solid var(--border)',
        borderRadius: 16,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border 0.15s, background 0.15s, transform 0.1s',
        transform: selected ? 'scale(1.005)' : 'scale(1)',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Selection indicator */}
      <div style={{
        width: 20, height: 20, flexShrink: 0,
        borderRadius: multi ? 6 : '50%',
        border: selected ? '2px solid var(--text-cta)' : '1.5px solid var(--border-strong)',
        backgroundColor: selected ? 'var(--text-cta)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="var(--bg-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Emoji */}
      <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{emoji}</span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}>{label}</div>
        {sub && (
          <div style={{
            fontSize: 13, color: 'var(--text-tertiary)',
            marginTop: 2, lineHeight: 1.3,
          }}>{sub}</div>
        )}
      </div>
    </button>
  )
}
