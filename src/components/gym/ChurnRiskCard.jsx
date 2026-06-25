import React from 'react'

const RISK_CONFIG = {
  high: {
    label: 'High Risk',
    borderColor: 'var(--error)',
    bgColor: '#FCEBEB',
    textColor: 'var(--error)',
    barColor: 'var(--error)',
  },
  medium: {
    label: 'Medium Risk',
    borderColor: 'var(--warning)',
    bgColor: '#FAEEDA',
    textColor: 'var(--warning)',
    barColor: 'var(--warning)',
  },
}

export default function ChurnRiskCard({
  riskLevel,
  riskScore,
  riskFactors = [],
  lastVisitedDaysAgo
}) {
  if (riskLevel === 'low' || !riskLevel) return null

  const cfg = RISK_CONFIG[riskLevel] || RISK_CONFIG.medium
  const scoreInt = Math.round((riskScore || 0) * 100)

  return (
    <div style={{
      background: cfg.bgColor,
      borderRadius: 12,
      borderLeft: `3px solid ${cfg.borderColor}`,
      borderTop: `0.5px solid var(--border)`,
      borderRight: `0.5px solid var(--border)`,
      borderBottom: `0.5px solid var(--border)`,
      padding: 16,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
      }}>
        <span style={{
          fontSize: 15,
          fontWeight: 500,
          color: cfg.textColor
        }}>
          {cfg.label}
        </span>
        <span style={{
          fontSize: 12,
          color: cfg.textColor,
          background: 'var(--bg-card)',
          border: `0.5px solid ${cfg.borderColor}`,
          borderRadius: 20,
          padding: '3px 10px'
        }}>
          {scoreInt} / 100
        </span>
      </div>

      <div style={{
        height: 6,
        background: 'var(--border)',
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: scoreInt + '%',
          background: cfg.barColor,
          borderRadius: 3
        }} />
      </div>

      {lastVisitedDaysAgo !== null &&
        lastVisitedDaysAgo !== undefined && (
        <p style={{
          fontSize: 12,
          color: cfg.textColor,
          margin: '0 0 8px'
        }}>
          Last visited {lastVisitedDaysAgo} days ago
        </p>
      )}

      {riskFactors.length > 0 && (
        <div>
          <p style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-tertiary)',
            margin: '0 0 6px'
          }}>
            Key factors
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {riskFactors.map((factor, i) => (
              <span key={i} style={{
                fontSize: 12,
                color: cfg.textColor,
                background: cfg.bgColor,
                border: `0.5px solid ${cfg.borderColor}`,
                borderRadius: 20,
                padding: '3px 10px'
              }}>
                {factor}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
