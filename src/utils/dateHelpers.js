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
