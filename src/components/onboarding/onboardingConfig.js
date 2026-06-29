export const GOAL_OPTIONS = [
  { label: 'Build Muscle',      sub: 'Gain size and strength',        value: 'muscle' },
  { label: 'Lose Fat',          sub: 'Burn fat, lean out',            value: 'weight_loss' },
  { label: 'Get Fitter',        sub: 'Improve endurance & energy',    value: 'fitness' },
  { label: 'Peak Performance',  sub: 'Athletic edge',                 value: 'performance' },
  { label: 'Stay Consistent',   sub: 'Habit & balance',               value: 'health' },
]

export const EXPERIENCE_OPTIONS = [
  { label: 'Just Starting',  sub: 'Less than 6 months training',     value: 'beginner' },
  { label: 'Getting Back',   sub: 'Been away, getting back into it', value: 'returning' },
  { label: 'Intermediate',   sub: '6+ months consistent training',   value: 'intermediate' },
  { label: 'Advanced',       sub: 'Years of serious training',       value: 'advanced' },
]

export const PRIORITY_OPTIONS = [
  { label: 'Logging my workouts',        value: 'workout_logging' },
  { label: 'Seeing my progress',         value: 'progress_tracking' },
  { label: 'Knowing what to do each day', value: 'exercise_guidance' },
  { label: 'Connecting to my gym',       value: 'gym_features' },
  { label: 'Tracking my diet',           value: 'diet' },
  { label: 'Community & accountability', value: 'community' },
]

export const GOAL_LABELS = Object.fromEntries(GOAL_OPTIONS.map(o => [o.value, o.label]))
export const EXPERIENCE_LABELS = Object.fromEntries(EXPERIENCE_OPTIONS.map(o => [o.value, o.label]))

// Screens that show the progress bar
export const PROGRESS_SCREENS = ['welcome', 'goal', 'experience', 'frequency', 'priorities', 'stats', 'diet_goal', 'preview']

export const STEPS = [
  'welcome',
  'goal',
  'experience',
  'frequency',
  'priorities',
  'stats',
  'diet_goal',
  'preview',
  'processing',
  'welcomehome',
]
