import { Component } from 'react'

// Top-level safety net so a render crash on any one screen shows a
// recoverable "Something went wrong" card instead of a blank/frozen
// WebView. Logs message/stack/componentStack as separate string
// arguments (not the raw Error/info objects) — Capacitor's Android
// console bridge stringifies object args as "[object Object]", which
// makes an Error object logged directly useless for diagnosis on-device.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] message:', error?.message)
    console.error('[ErrorBoundary] stack:', error?.stack)
    console.error('[ErrorBoundary] componentStack:', info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div
        role="alert"
        style={{
          minHeight: '100dvh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', maxWidth: 320 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            G
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Something went wrong</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>This screen hit an unexpected error. Reloading usually fixes it.</div>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              border: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload app
          </button>
        </div>
      </div>
    )
  }
}
