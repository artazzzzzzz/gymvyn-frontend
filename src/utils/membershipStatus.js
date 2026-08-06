// Centralized effective-membership-status logic, shared by GymMembers.jsx
// (list) and GymMemberDetail.jsx (detail) so the two screens can never
// silently disagree about whether a member is "Active".
//
// The bug this fixes: both screens used to trust the raw `status` column
// alone ('active' vs 'inactive'), so a membership whose end_date had
// already passed — but whose status was never flipped (no cron does that;
// see gymvyn-backend POST /api/checkin) — displayed as "Active" with a
// negative "days remaining" count.
//
// Prefers canonical fields the backend now computes (`effective_status`,
// `days_remaining`) when present, and falls back to local date math
// otherwise (e.g. stale cached data, or a caller that hasn't been updated
// yet) so this stays correct even if the two drift.

const STATUS_META = {
  active:    { label: 'Active',    bg: 'var(--success-bg)', color: 'var(--success)' },
  expired:   { label: 'Expired',   bg: 'var(--error-bg)',   color: 'var(--error)' },
  inactive:  { label: 'Inactive',  bg: 'var(--bg-pill)',    color: 'var(--text-secondary)' },
  pending:   { label: 'Pending',   bg: 'var(--warning-bg)', color: 'var(--warning)' },
  suspended: { label: 'Suspended', bg: 'var(--error-bg)',   color: 'var(--error)' },
  past_due:  { label: 'Past Due',  bg: 'var(--warning-bg)', color: 'var(--warning)' },
  cancelled: { label: 'Cancelled', bg: 'var(--bg-pill)',    color: 'var(--text-secondary)' },
}

function localTodayYMD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// endDate is a YYYY-MM-DD date string (as stored/returned by the backend).
function computeEffectiveStatus(status, endDate) {
  if (status && status !== 'active') return status
  const isPastEnd = !!endDate && endDate < localTodayYMD()
  return isPastEnd ? 'expired' : 'active'
}

function computeDaysRemaining(endDate) {
  if (!endDate) return null
  const endMs = new Date(`${endDate}T00:00:00`).getTime()
  const todayMs = new Date(`${localTodayYMD()}T00:00:00`).getTime()
  return Math.max(0, Math.ceil((endMs - todayMs) / 86400000))
}

/**
 * getEffectiveMembership(member) -> { effectiveStatus, daysRemaining, isExpired }
 *
 * `member` may be a list row or a detail response — both shapes are
 * supported via the field aliases below (status/membership_status,
 * membership_end/end_date, effective_status, days_remaining).
 */
export function getEffectiveMembership(member = {}) {
  const status  = member.status ?? member.membership_status ?? 'active'
  const endDate = member.membership_end ?? member.end_date ?? null

  const effectiveStatus = member.effective_status ?? computeEffectiveStatus(status, endDate)
  const daysRemaining = member.days_remaining != null
    ? member.days_remaining
    : computeDaysRemaining(endDate)

  return {
    effectiveStatus,
    daysRemaining,
    isExpired: effectiveStatus === 'expired',
  }
}

/**
 * getStatusPillProps(member) -> { label, bg, color }
 * Priority: high churn risk > expiring-soon (active, <=7 days) > effective status.
 */
export function getStatusPillProps(member = {}) {
  const { effectiveStatus, daysRemaining } = getEffectiveMembership(member)

  if (member.churn_risk === 'high') {
    return { label: 'At Risk', bg: 'var(--error-bg)', color: 'var(--error)' }
  }
  if (effectiveStatus === 'active' && daysRemaining != null && daysRemaining <= 7 && daysRemaining > 0) {
    return { label: 'Expiring', bg: 'var(--warning-bg)', color: 'var(--warning)' }
  }
  return STATUS_META[effectiveStatus] || STATUS_META.inactive
}

/**
 * getDaysRemainingLabel(member) -> "X days remaining" | "Expired X days ago" | "—"
 */
export function getDaysRemainingLabel(member = {}) {
  const { effectiveStatus, daysRemaining } = getEffectiveMembership(member)
  const endDate = member.membership_end ?? member.end_date ?? null
  if (!endDate) return '—'

  if (effectiveStatus === 'expired') {
    const endMs = new Date(`${endDate}T00:00:00`).getTime()
    const todayMs = new Date(`${localTodayYMD()}T00:00:00`).getTime()
    const daysAgo = Math.max(0, Math.round((todayMs - endMs) / 86400000))
    return daysAgo === 0 ? 'Expired today' : `Expired ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`
  }

  if (daysRemaining == null) return '—'
  return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
}
