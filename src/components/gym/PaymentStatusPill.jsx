import React from 'react'

const STATUS_CONFIG = {
  paid: {
    label: 'Paid',
    bg: '#EAF3DE',
    color: '#3B6D11'
  },
  overdue: {
    label: 'Overdue',
    bg: '#FCEBEB',
    color: '#A32D2D'
  },
  refunded: {
    label: 'Refunded',
    bg: '#F1EFE8',
    color: '#5F5E5A'
  },
  pending: {
    label: 'Pending',
    bg: '#FAEEDA',
    color: '#854F0B'
  },
}

export default function PaymentStatusPill({ status }) {
  const cfg = STATUS_CONFIG[status]
    || STATUS_CONFIG.pending

  return (
    <span style={{
      fontSize: 11,
      fontWeight: 500,
      color: cfg.color,
      background: cfg.bg,
      borderRadius: 20,
      padding: '3px 8px',
      display: 'inline-block',
      lineHeight: 1.4
    }}>
      {cfg.label}
    </span>
  )
}
