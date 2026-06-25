export const LEVEL_THRESHOLDS = {
  1: 0, 2: 100, 3: 250, 4: 501, 5: 900,
  6: 1300, 7: 2000, 8: 2800, 9: 3600, 10: 5000,
  11: 6500, 12: 8000, 13: 9500, 14: 10000, 15: 11500,
  16: 13000, 17: 14500, 18: 16000, 19: 18000, 20: 18001,
}

export const LEVEL_NAMES = {
  1: 'Rookie', 2: 'Rookie', 3: 'Rookie',
  4: 'Iron', 5: 'Iron', 6: 'Iron', 7: 'Iron',
  8: 'Steel', 9: 'Steel', 10: 'Steel', 11: 'Steel',
  12: 'Titan', 13: 'Titan', 14: 'Titan', 15: 'Titan',
  16: 'Forge', 17: 'Forge', 18: 'Forge', 19: 'Forge',
  20: 'Forgemaster',
}

export const MULTIPLIER_COLORS = {
  1: { bg: 'var(--bg-pill)', text: 'var(--text-secondary)' },
  1.5: { bg: '#EAF3DE', text: '#3B6D11' },
  2: { bg: '#FAEEDA', text: '#854F0B' },
  2.5: { bg: '#FCEBEB', text: '#A32D2D' },
  3: { bg: '#EEEDFE', text: '#534AB7' },
}

export const SOURCE_CONFIG = {
  train:   { icon: 'Dumbbell',   label: 'Train',    bg: 'var(--accent-bg)', color: 'var(--accent)' },
  fuel:    { icon: 'Utensils',   label: 'Fuel',     bg: '#EAF3DE',          color: '#3B6D11' },
  improve: { icon: 'TrendingUp', label: 'Improve',  bg: '#FAEEDA',          color: '#854F0B' },
  show_up: { icon: 'Flame',      label: 'Show up',  bg: '#FCEBEB',          color: '#A32D2D' },
  connect: { icon: 'Users',      label: 'Connect',  bg: '#EEEDFE',          color: '#534AB7' },
}

export const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'legs', 'arms', 'core']

export function getLevelName(level) {
  return LEVEL_NAMES[level] || 'Rookie'
}

export function getMultiplierColors(multiplier) {
  const key = MULTIPLIER_COLORS[multiplier] ? multiplier : 1
  return MULTIPLIER_COLORS[key]
}

export function getLevelThreshold(level) {
  return LEVEL_THRESHOLDS[level] ?? 0
}

export function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
