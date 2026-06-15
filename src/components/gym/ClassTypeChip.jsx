import React from 'react'

const TYPE_CONFIG = {
  yoga:     { label: 'Yoga',     bg:'#E1F5EE', color:'#0F6E56' },
  strength: { label: 'Strength', bg:'#E6F1FB', color:'#185FA5' },
  zumba:    { label: 'Zumba',    bg:'#FAEEDA', color:'#854F0B' },
  hiit:     { label: 'HIIT',     bg:'#FCEBEB', color:'#A32D2D' },
  cardio:   { label: 'Cardio',   bg:'#EAF3DE', color:'#3B6D11' },
  pilates:  { label: 'Pilates',  bg:'#EEEDFE', color:'#3C3489' },
  other:    { label: 'Other',    bg:'#F1EFE8', color:'#5F5E5A' },
}

export default function ClassTypeChip({
  type,
  selected = false,
  onClick
}) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.other

  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        fontWeight: 500,
        padding: '6px 14px',
        borderRadius: 20,
        border: selected
          ? 'none'
          : '0.5px solid rgba(0,0,0,0.1)',
        background: selected ? '#111111' : cfg.bg,
        color: selected ? '#ffffff' : cfg.color,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        minHeight: 32,
      }}
    >
      {cfg.label}
    </button>
  )
}

export { TYPE_CONFIG }
