export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
  style = {},
  type = 'button',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        height: 52,
        borderRadius: 16,
        fontSize: 16,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'opacity 0.15s',
        background: disabled ? 'var(--bg-input)' : 'var(--bg-card)',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        border: disabled ? '1px solid var(--border)' : '1px solid var(--text-primary)',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
