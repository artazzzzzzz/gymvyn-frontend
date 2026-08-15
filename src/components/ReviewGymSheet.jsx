import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import BottomSheet from './BottomSheet'
import PrimaryButton from './PrimaryButton'
import { getMyGymReview, submitGymReview } from '../utils/api'

const inputStyle = {
  width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '12px 14px', fontSize: 15, color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit',
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= (hover || value)
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}
          >
            <Star
              size={30}
              color={filled ? 'var(--xp-gold, #F5B800)' : 'var(--border)'}
              fill={filled ? 'var(--xp-gold, #F5B800)' : 'none'}
              strokeWidth={1.5}
            />
          </button>
        )
      })}
    </div>
  )
}

// "Leave a Review" (MyGym.jsx). Same BottomSheet + PrimaryButton shell as
// ReviewGymSheet's sibling forms (e.g. GymSupplements.jsx's Add Product
// sheet) — title in the header, fields in the body, submit in the footer.
// On open, pre-fetches the caller's own existing review (if any) for their
// current gym and pre-fills it — leaving a second review edits the first
// (see gym_reviews' UNIQUE(gym_id, user_id) + upsert on the backend), it's
// not a one-time-only action.
export default function ReviewGymSheet({ open, onClose, onSubmitted }) {
  const [rating,     setRating]     = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [isEdit,     setIsEdit]     = useState(false)
  const [success,    setSuccess]    = useState(false)

  useEffect(() => {
    if (!open) return
    setRating(0)
    setReviewText('')
    setError('')
    setSuccess(false)
    setIsEdit(false)
    setLoading(true)
    getMyGymReview()
      .then(existing => {
        setRating(existing.rating)
        setReviewText(existing.review_text)
        setIsEdit(true)
      })
      .catch(() => { /* no existing review — start blank */ })
      .finally(() => setLoading(false))
  }, [open])

  const canSubmit = rating >= 1 && reviewText.trim().length > 0 && !saving

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      const saved = await submitGymReview(rating, reviewText.trim())
      setSuccess(true)
      onSubmitted?.(saved)
      setTimeout(onClose, 900)
    } catch (err) {
      setError(err.message || 'Could not submit your review. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const footer = success ? null : (
    <PrimaryButton onClick={handleSubmit} disabled={!canSubmit}>
      {saving ? 'Submitting…' : isEdit ? 'Update Review' : 'Submit Review'}
    </PrimaryButton>
  )

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? 'Edit Your Review' : 'Leave a Review'} footer={footer}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div style={{ width: 24, height: 24, border: '2.5px solid var(--border)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'gv-spin 0.65s linear infinite' }} />
        </div>
      ) : success ? (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>
            {isEdit ? 'Review updated — thank you!' : 'Review submitted — thank you!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Your rating</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Your review</label>
            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value.slice(0, 2000))}
              placeholder="What's it like training at this gym?"
              rows={5}
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, textAlign: 'right' }}>{reviewText.length}/2000</p>
          </div>
          {error && (
            <p style={{ fontSize: 13, color: 'var(--error)', lineHeight: 1.5 }}>{error}</p>
          )}
        </div>
      )}
      <style>{`@keyframes gv-spin { to { transform: rotate(360deg); } }`}</style>
    </BottomSheet>
  )
}
