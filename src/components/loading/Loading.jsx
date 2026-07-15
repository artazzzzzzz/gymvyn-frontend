export function ButtonSpinner({ size = 14 }) {
  return (
    <span
      aria-hidden="true"
      className="gv-button-spinner"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  )
}

export function InlineLoader({ label = 'Loading', visible = true, style }) {
  if (!visible) return null
  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        color: 'var(--text-tertiary)',
        fontSize: 13,
        ...style,
      }}
    >
      <ButtonSpinner size={13} />
      {label}
    </span>
  )
}

export function RefreshIndicator({ refreshing, label = 'Refreshing' }) {
  if (!refreshing) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="gv-delayed-loader"
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '8px 0',
      }}
    >
      <InlineLoader label={label} />
    </div>
  )
}

export function AppLoader({ label = 'Loading Gymvyn' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 0,
          }}
        >
          G
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ButtonSpinner size={15} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
        </div>
      </div>
    </div>
  )
}

export function SkeletonBlock({ width = '100%', height = 16, radius = 8, style }) {
  return (
    <div
      aria-hidden="true"
      className="gv-skeleton"
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'var(--bg-pill)',
        ...style,
      }}
    />
  )
}

export function CardSkeleton({ lines = 3, style }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        ...style,
      }}
    >
      <SkeletonBlock height={18} width="52%" style={{ marginBottom: 12 }} />
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={index}
          height={12}
          width={index === lines - 1 ? '42%' : '100%'}
          style={{ marginTop: index === 0 ? 0 : 8 }}
        />
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 4, avatar = true }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          style={{
            height: 68,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 16px',
            borderBottom: index < rows - 1 ? '1px solid var(--divider)' : 'none',
          }}
        >
          {avatar && <SkeletonBlock width={40} height={40} radius="50%" />}
          <div style={{ flex: 1 }}>
            <SkeletonBlock width="58%" height={13} />
            <SkeletonBlock width="36%" height={11} style={{ marginTop: 8 }} />
          </div>
          <SkeletonBlock width={54} height={24} radius={20} />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div style={{ overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 10 }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(96px, 1fr))`,
            gap: 12,
            padding: '12px',
            background: rowIndex === 0 ? 'var(--bg-elevated)' : 'var(--bg-card)',
            borderTop: rowIndex === 0 ? 'none' : '1px solid var(--border)',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonBlock key={colIndex} height={12} width={colIndex === columns - 1 ? '62%' : '86%'} />
          ))}
        </div>
      ))}
    </div>
  )
}
