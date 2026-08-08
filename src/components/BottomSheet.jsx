import { useEffect, useRef } from 'react'

/**
 * Shared bottom-sheet shell.
 *
 * Fixes the recurring mobile bug across ad-hoc sheets in this codebase:
 * anchoring the panel with `bottom: 0` + a `vh`-based `maxHeight` measures
 * against the layout viewport, which on iOS Safari can be taller than what's
 * actually visible (address bar). That let sheet content (and action
 * buttons) render below the real viewport with no way to reach them, and
 * `document.body.style.overflow = 'hidden'` alone doesn't stop iOS from
 * scrolling the page behind the sheet on touch.
 *
 * This component instead anchors a `position: fixed; inset: 0` wrapper
 * (always exactly the real visual viewport) and bottom-aligns the sheet
 * panel inside it with a *percentage* maxHeight, so the panel can never
 * exceed the visible screen. The panel is a flex column: fixed header,
 * a single scrollable body (flex: 1, its own overflow-y), and an optional
 * fixed footer for the primary action — so the action is always reachable
 * without depending on how much the body content scrolls.
 *
 * Background scroll is locked with the `position: fixed` body technique
 * (not just `overflow: hidden`), which is what actually stops iOS Safari
 * from scrolling the page behind the sheet.
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  maxHeight = '88%',
  zIndex = 200,
}) {
  const scrollYRef = useRef(0)

  useEffect(() => {
    if (!open) return
    const { body } = document
    scrollYRef.current = window.scrollY
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    }
    body.style.position = 'fixed'
    body.style.top = `-${scrollYRef.current}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      window.scrollTo(0, scrollYRef.current)
    }
  }, [open])

  return (
    <div
      aria-hidden={!open}
      style={{
        position: 'fixed', inset: 0, zIndex,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.25s',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        style={{
          position: 'relative', zIndex: 1,
          background: 'var(--bg-card)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          maxHeight,
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease-out',
          boxShadow: '0 -2px 20px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>

        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 8px', flexShrink: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <div
          style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
            padding: title ? '4px 20px 20px' : '20px 20px',
          }}
        >
          {children}
        </div>

        {footer && (
          <div style={{
            flexShrink: 0, padding: '12px 20px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-card)',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
