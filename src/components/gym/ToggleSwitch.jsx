import React from 'react'

export default function ToggleSwitch({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: value ? 'var(--text-primary)' : 'var(--bg-hover)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3,
        left: value ? 21 : 3,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: 'var(--bg-card)',
        transition: 'left 0.2s ease',
      }} />
    </div>
  )
}
