import React from 'react'

export default function RevenueBarChart({
  data = [],
  height = 52,
  currentMonthIndex = 5
}) {
  if (!data.length) return null

  const maxVal = Math.max(...data.map(d => d.total), 1)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 6,
      height: height + 20,
      paddingTop: 4
    }}>
      {data.map((item, i) => {
        const barH = Math.max(
          Math.round((item.total / maxVal) * height), 4
        )
        const isCurrent = i === currentMonthIndex
        return (
          <div key={i} style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4
          }}>
            <div style={{
              width: '100%',
              height: barH,
              background: isCurrent ? 'var(--chart-line)' : 'var(--success)',
              borderRadius: '3px 3px 0 0'
            }} />
            <span style={{
              fontSize: 10,
              color: 'var(--chart-axis)',
              textAlign: 'center',
              lineHeight: 1
            }}>
              {item.month_label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
