export const GOAL_OPTIONS = [
  { emoji: '💪', label: 'Build muscle',      sub: 'Gain size and strength',        value: 'muscle' },
  { emoji: '🔥', label: 'Lose fat',          sub: 'Burn fat, lean out',            value: 'weight_loss' },
  { emoji: '🏃', label: 'Get fitter',        sub: 'Improve endurance & energy',    value: 'fitness' },
  { emoji: '⚡', label: 'Boost performance', sub: 'Athletic edge',                 value: 'performance' },
  { emoji: '🧘', label: 'Stay consistent',   sub: 'Habit & balance',               value: 'health' },
]

export const EXPERIENCE_OPTIONS = [
  { emoji: '🌱', label: 'Beginner',      sub: 'Less than 6 months training',  value: 'beginner' },
  { emoji: '🔄', label: 'Returning',     sub: 'Been away, getting back into it', value: 'returning' },
  { emoji: '💪', label: 'Intermediate',  sub: '6+ months consistent training', value: 'intermediate' },
  { emoji: '🏆', label: 'Advanced',      sub: 'Years of serious training',     value: 'advanced' },
]

export const PRIORITY_OPTIONS = [
  { emoji: '📝', label: 'Logging my workouts',       value: 'workout_logging' },
  { emoji: '📊', label: 'Seeing my progress',        value: 'progress_tracking' },
  { emoji: '🎯', label: 'Knowing what to do each day', value: 'exercise_guidance' },
  { emoji: '🏋️', label: 'Connecting to my gym',     value: 'gym_features' },
  { emoji: '🥗', label: 'Tracking my diet',          value: 'diet' },
  { emoji: '👥', label: 'Community & accountability', value: 'community' },
]

export const GOAL_LABELS = Object.fromEntries(GOAL_OPTIONS.map(o => [o.value, o.label]))
export const EXPERIENCE_LABELS = Object.fromEntries(EXPERIENCE_OPTIONS.map(o => [o.value, o.label]))

// Screens that show the progress bar (indices 0-6, i.e. steps 1-7 of 9)
export const PROGRESS_SCREENS = ['welcome', 'goal', 'experience', 'frequency', 'priorities', 'stats', 'preview']

export const STEPS = [
  'welcome',
  'goal',
  'experience',
  'frequency',
  'priorities',
  'stats',
  'preview',
  'processing',
  'welcomehome',
]
