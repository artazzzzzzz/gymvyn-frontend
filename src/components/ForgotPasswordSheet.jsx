import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import PrimaryButton from './PrimaryButton'
import { requestPasswordReset } from '../utils/authFlow'

function friendlyError(msg) {
  if (/unable to validate email/i.test(msg)) return 'Please enter a valid email address.'
  if (/too many requests/i.test(msg))         return 'Too many attempts. Please wait a moment and try again.'
  return msg || 'Could not send the reset link. Please try again.'
}

const inputStyle = {
  width: '100%', height: 48, background: 'var(--bg-primary)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '0 14px', fontSize: 15, color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box',
}

// Reset-request sheet reachable from Login.jsx's "Forgot password?" link.
// Uses the shared BottomSheet shell (see src/components/BottomSheet.jsx) —
// same shape as the other single-field-form sheets in this codebase (e.g.
// the Add/Edit Product sheet in GymSupplements.jsx): title via the sheet
// header, body is the field, footer is the primary action.
export default function ForgotPasswordSheet({ open, onClose, initialEmail = '' }) {
  const [email,   setEmail]   = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sent,    setSent]    = useState(false)

  useEffect(() => {
    if (open) { setEmail(initialEmail); setError(''); setSent(false); setLoading(false) }
  }, [open, initialEmail])

  const canSubmit = email.trim().length > 0 && !loading

  async function handleSend() {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(friendlyError(err?.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Reset Password"
      footer={
        sent ? null : (
          <PrimaryButton onClick={handleSend} disabled={!canSubmit}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </PrimaryButton>
        )
      }
    >
      {sent ? (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>Check your email</p>
          <p style={{ fontSize: 13, color: 'var(--success)', opacity: 0.85, lineHeight: 1.5 }}>
            If an account exists for <span style={{ fontWeight: 600 }}>{email.trim()}</span>, we sent a link to reset your password. Open it on this device to continue.
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
            Enter the email address on your account and we'll send you a link to reset your password.
          </p>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="you@example.com"
            autoFocus
            style={{ ...inputStyle, borderColor: error ? 'var(--error)' : 'var(--border)' }}
          />
          {error && (
            <p style={{ fontSize: 13, color: 'var(--error)', marginTop: 10, lineHeight: 1.5 }}>{error}</p>
          )}
        </>
      )}
    </BottomSheet>
  )
}
