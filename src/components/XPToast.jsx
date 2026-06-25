import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Dumbbell, Utensils, TrendingUp, Flame, Users, Trophy } from 'lucide-react'
import { getLevelName } from '../utils/xpConstants'

const XPToastContext = createContext(null)

export function useXPToast() {
  const ctx = useContext(XPToastContext)
  if (!ctx) return { showXPToast: () => {} }
  return ctx
}

const SOURCE_ICONS = {
  train:   Dumbbell,
  fuel:    Utensils,
  improve: TrendingUp,
  show_up: Flame,
  connect: Users,
}

export function XPToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [visible, setVisible] = useState(false)

  const showXPToast = useCallback((xpResult) => {
    if (!xpResult || !xpResult.awarded) return
    const finalXP = xpResult.totalXPEarned ?? xpResult.finalXP ?? xpResult.dietXP ?? xpResult.xp ?? 0
    if (!finalXP || finalXP <= 0) return

    const isLevelUp = xpResult.newLevel != null && xpResult.previousLevel != null && xpResult.newLevel > xpResult.previousLevel
    const next = {
      finalXP,
      multiplier: xpResult.multiplier ?? 1,
      source: xpResult.source ?? 'train',
      isLevelUp,
      newLevel: xpResult.newLevel,
    }
    setToast(next)
    setVisible(true)
  }, [])

  useEffect(() => {
    if (!toast) return
    const duration = toast.isLevelUp ? 5000 : 3000
    const t = setTimeout(() => setVisible(false), duration)
    const clear = setTimeout(() => setToast(null), duration + 300)
    return () => { clearTimeout(t); clearTimeout(clear) }
  }, [toast])

  const Icon = toast ? (SOURCE_ICONS[toast.source] || Trophy) : null

  return (
    <XPToastContext.Provider value={{ showXPToast }}>
      {children}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 60,
            left: '50%',
            transform: `translateX(-50%) translateY(${visible ? '0' : '-120%'})`,
            transition: 'transform 0.3s ease-out',
            zIndex: 9999,
            background: 'var(--black-cta)',
            color: 'var(--black-cta-text)',
            borderRadius: 24,
            padding: toast.isLevelUp ? '12px 22px' : '10px 20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: '90vw',
          }}
        >
          {toast.isLevelUp ? (
            <>
              <Trophy size={18} color="var(--black-cta-text)" />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', opacity: 0.7 }}>
                  LEVEL UP
                </span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>
                  Level {toast.newLevel} · {getLevelName(toast.newLevel)}
                </span>
              </div>
            </>
          ) : (
            <>
              {Icon && <Icon size={16} color="var(--black-cta-text)" />}
              <span style={{ fontSize: 15, fontWeight: 600 }}>+{toast.finalXP} XP</span>
              {toast.multiplier > 1 && (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    fontSize: 11,
                    fontWeight: 500,
                    borderRadius: 6,
                    padding: '2px 6px',
                  }}
                >
                  {toast.multiplier}x
                </span>
              )}
            </>
          )}
        </div>
      )}
    </XPToastContext.Provider>
  )
}
