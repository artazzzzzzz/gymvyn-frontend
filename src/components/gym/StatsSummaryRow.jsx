import React from 'react'

export default function StatsSummaryRow({ stats }) {
  return (
    <div style={{
      display: 'flex',
      borderTop: '0.5px solid rgba(0,0,0,0.06)',
      marginTop: 16,
      paddingTop: 16
    }}>
      {stats.map((stat, i) => (
        <div key={i} style={{
          flex: 1,
          textAlign: 'center',
          borderLeft: i > 0
            ? '0.5px solid rgba(0,0,0,0.06)'
            : 'none',
          padding: '0 8px'
        }}>
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            color: stat.valueColor || '#111111',
            lineHeight: 1.2
          }}>
            {stat.value}
          </div>
          <div style={{
            fontSize: 11,
            color: '#999999',
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
