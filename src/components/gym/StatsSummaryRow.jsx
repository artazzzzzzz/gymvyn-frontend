import React from 'react'

export default function StatsSummaryRow({ stats }) {
  return (
    <div style={{
      display: 'flex',
      borderTop: '0.5px solid var(--border)',
      marginTop: 16,
      paddingTop: 16
    }}>
      {stats.map((stat, i) => (
        <div key={i} style={{
          flex: 1,
          textAlign: 'center',
          borderLeft: i > 0
            ? '0.5px solid var(--border)'
            : 'none',
          padding: '0 8px'
        }}>
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            color: stat.valueColor || 'var(--text-primary)',
            lineHeight: 1.2
          }}>
            {stat.value}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            marginTop: 3,
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
