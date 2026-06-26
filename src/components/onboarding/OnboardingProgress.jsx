import { useEffect, useRef } from 'react'

export default function OnboardingProgress({ current, total }) {
  const fillRef = useRef(null)
  const pct = Math.round((current / total) * 100)

  useEffect(() => {
    if (fillRef.current) {
      fillRef.current.style.width = `${pct}%`
    }
  }, [pct])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: 'var(--border)',
      zIndex: 100,
    }}>
      <div
        ref={fillRef}
        style={{
          height: '100%',
          backgroundColor: 'var(--text-cta)',
          width: `${pct}%`,
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  )
}
