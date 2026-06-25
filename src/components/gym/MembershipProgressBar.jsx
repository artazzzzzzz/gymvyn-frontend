import React from 'react'

export default function MembershipProgressBar({
  startDate,
  endDate,
  daysRemaining
}) {
  function daysBetween(a, b) {
    return Math.round(
      Math.abs(new Date(b) - new Date(a))
      / (1000 * 60 * 60 * 24)
    )
  }

  const total = daysBetween(startDate, endDate)
  const elapsed = total - (daysRemaining || 0)
  const pct = Math.min(
    Math.round((elapsed / total) * 100), 100
  )

  const barColor = daysRemaining < 7
    ? 'var(--error)'
    : daysRemaining < 14
    ? 'var(--warning)'
    : 'var(--success)'

  const textColor = daysRemaining < 7
    ? 'var(--error)'
    : daysRemaining < 14
    ? 'var(--warning)'
    : 'var(--text-secondary)'

  const startLabel = new Date(startDate)
    .toLocaleDateString('en-IN',
      { day:'numeric', month:'short' })
  const endLabel = new Date(endDate)
    .toLocaleDateString('en-IN',
      { day:'numeric', month:'short' })

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 6
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {startLabel}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {endLabel}
        </span>
      </div>
      <div style={{
        height: 6,
        background: 'var(--bg-pill)',
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: pct + '%',
          background: barColor,
          borderRadius: 3,
          transition: 'width 0.4s ease'
        }} />
      </div>
      <div style={{
        textAlign: 'center',
        fontSize: 12,
        color: textColor,
        marginTop: 6
      }}>
        {daysRemaining > 0
          ? `${daysRemaining} days remaining`
          : 'Expired'}
      </div>
    </div>
  )
}
