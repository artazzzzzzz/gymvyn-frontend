import React from 'react'

const DAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
]

export default function DaySelector({
  selected = [],
  onChange
}) {
  function toggle(key) {
    if (selected.includes(key)) {
      onChange(selected.filter(d => d !== key))
    } else {
      onChange([...selected, key])
    }
  }

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }}>
      {DAYS.map(day => {
        const isSelected = selected.includes(day.key)
        return (
          <button
            key={day.key}
            onClick={() => toggle(day.key)}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: isSelected
                ? 'var(--text-primary)' : 'var(--bg-pill)',
              color: isSelected
                ? 'var(--bg-card)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {day.label}
          </button>
        )
      })}
    </div>
  )
}
