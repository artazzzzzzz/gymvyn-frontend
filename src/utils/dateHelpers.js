const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

// IST calendar date (YYYY-MM-DD) for a given instant, independent of the
// device's own timezone. Gym check-in history is bucketed by IST calendar
// day server-side, so any "which day is this" comparison against that data
// must use this instead of toISOString().split('T')[0] (which yields the
// UTC calendar day and drifts by up to 5.5h — wrong near local midnight).
export function istDateStr(date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function formatMonthYear(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric'
  })
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short'
  })
}

export function daysBetween(dateA, dateB) {
  const a = new Date(dateA)
  const b = new Date(dateB)
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24))
}

export function daysAgo(dateStr) {
  if (!dateStr) return null
  return daysBetween(dateStr, new Date())
}

export function daysFromNow(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

export function formatRelative(dateStr) {
  const days = daysAgo(dateStr)
  if (days === null) return '—'
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.round(days/7)} weeks ago`
  return formatShortDate(dateStr)
}
