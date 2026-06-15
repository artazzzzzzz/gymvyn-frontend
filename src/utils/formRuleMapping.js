import { getFormRule as dbGetFormRule } from '../data/exerciseDatabase';

// Maps exercise names → the FORM_RULES key they should use, or 'guided'.
//
// 'guided' = skeleton overlay + manual rep counter; no angle-based scoring.
// All other values must be actual keys present in formRules.js:
//   'squat'  | 'pushup'  | 'bicep_curl'
//
// Covers every name in the Supabase exercises table (37 rows) AND every name
// in the LOCAL_EXERCISES fallback array inside useExercises.js.

const RAW_MAP = {
  // ── Squat family (knee-bend pattern) ─────────────────────────────────────
  'Squat':                   'squat',
  'Barbell Squat':           'squat',
  'Front Squat':             'squat',
  'Hack Squat':              'squat',
  'Goblet Squat':            'squat',
  'Sumo Squat':              'squat',
  'Jump Squat':              'squat',
  'Wall Sit':                'squat',
  'Smith Machine Squat':     'squat',

  // Lunge variants use the same knee-bend detection
  'Lunge':                   'squat',
  'Walking Lunges':          'squat',
  'Reverse Lunge':           'squat',
  'Step Up':                 'squat',
  'Bulgarian Split Squat':   'squat',

  // ── Push / press family (elbow + shoulder angles) ─────────────────────────
  'Push Up':                 'pushup',
  'Push Ups':                'pushup',
  'Wide Push Up':            'pushup',
  'Incline Push Up':         'pushup',
  'Decline Push Up':         'pushup',
  'Diamond Push Up':         'pushup',
  'Pike Push Up':            'pushup',

  'Bench Press':             'pushup',
  'Barbell Bench Press':     'pushup',
  'Incline Bench Press':     'pushup',
  'Decline Bench Press':     'pushup',
  'Dumbbell Bench Press':    'pushup',
  'Incline Dumbbell Press':  'pushup',
  'Close Grip Bench Press':  'pushup',

  'Overhead Press':          'pushup',
  'Military Press':          'pushup',
  'Dumbbell Shoulder Press': 'pushup',
  'Arnold Press':            'pushup',
  'Push Press':              'pushup',

  // ── Curl family (elbow flexion) ───────────────────────────────────────────
  'Bicep Curl':              'bicep_curl',
  'Barbell Curl':            'bicep_curl',
  'Dumbbell Curl':           'bicep_curl',
  'Cable Curl':              'bicep_curl',
  'EZ Bar Curl':             'bicep_curl',
  'Preacher Curl':           'bicep_curl',
  'Spider Curl':             'bicep_curl',
  'Incline Dumbbell Curl':   'bicep_curl',
  'Hammer Curl':             'bicep_curl',
  'Concentration Curl':      'bicep_curl',

  // ── Guided — machine exercises ────────────────────────────────────────────
  'Lat Pulldown':            'guided',
  'Leg Press':               'guided',
  'Leg Extension':           'guided',
  'Leg Curl':                'guided',
  'Seated Cable Row':        'guided',
  'Cable Row':               'guided',
  'Cable Flyes':             'guided',
  'Chest Fly':               'guided',
  'Pec Deck':                'guided',
  'Cable Crossover':         'guided',
  'Cable Woodchop':          'guided',
  'Hack Squat Machine':      'guided',

  // ── Guided — compound / hinge ─────────────────────────────────────────────
  'Deadlift':                'guided',
  'Romanian Deadlift':       'guided',
  'Sumo Deadlift':           'guided',
  'Trap Bar Deadlift':       'guided',
  'Stiff Leg Deadlift':      'guided',
  'Good Morning':            'guided',

  // ── Guided — row / pull ───────────────────────────────────────────────────
  'Bent Over Row':           'guided',
  'Bent Over Barbell Row':   'guided',
  'Barbell Row':             'guided',
  'Single Arm Dumbbell Row': 'guided',
  'T-Bar Row':               'guided',
  'Pendlay Row':             'guided',
  'Pull Up':                 'guided',
  'Pull Ups':                'guided',
  'Chin Up':                 'guided',
  'Muscle Up':               'guided',

  // ── Guided — shoulder / raise ─────────────────────────────────────────────
  'Lateral Raise':           'guided',
  'Dumbbell Lateral Raise':  'guided',
  'Front Raise':             'guided',
  'Reverse Fly':             'guided',
  'Face Pull':               'guided',
  'Face Pulls':              'guided',
  'Upright Row':             'guided',
  'Shrugs':                  'guided',

  // ── Guided — tricep ───────────────────────────────────────────────────────
  'Tricep Extension':        'guided',
  'Overhead Tricep Extension': 'guided',
  'Tricep Pushdown':         'guided',
  'Skull Crushers':          'guided',
  'Skull Crusher':           'guided',
  'Tricep Kickback':         'guided',

  // ── Guided — dip / bodyweight push ───────────────────────────────────────
  'Dip':                     'guided',
  'Dips':                    'guided',
  'Tricep Dips':             'guided',

  // ── Guided — glute / hip ─────────────────────────────────────────────────
  'Glute Bridge':            'guided',
  'Hip Thrust':              'guided',
  'Barbell Hip Thrust':      'guided',
  'Calf Raise':              'guided',
  'Calf Raises':             'guided',

  // ── Guided — core ─────────────────────────────────────────────────────────
  'Plank':                   'guided',
  'Side Plank':              'guided',
  'Crunch':                  'guided',
  'Crunches':                'guided',
  'Sit Up':                  'guided',
  'Leg Raise':               'guided',
  'Hanging Leg Raises':      'guided',
  'Hanging Leg Raise':       'guided',
  'Ab Wheel':                'guided',
  'Russian Twist':           'guided',
  'Dead Bug':                'guided',
  'Bird Dog':                'guided',
  'Cable Crunch':            'guided',

  // ── Guided — cardio / athletic ────────────────────────────────────────────
  'Box Jump':                'guided',
  'Burpee':                  'guided',
  'Mountain Climber':        'guided',
  'Jumping Jack':            'guided',
  'Battle Ropes':            'guided',
  'Farmer Walk':             'guided',
}

// Normalise a name for case-insensitive lookup
function norm(s) {
  return (s ?? '').trim().toLowerCase()
}

// Pre-build a lowercased lookup table for fast case-insensitive hits
const LOWER_MAP = Object.fromEntries(
  Object.entries(RAW_MAP).map(([k, v]) => [norm(k), v])
)

/**
 * Returns the FORM_RULES key for this exercise, or 'guided' if no
 * angle-based detection is available.
 *
 * Resolution order:
 *   1. Exact match (case-sensitive)
 *   2. Case-insensitive match
 *   3. Keyword fuzzy fallback
 *   4. 'guided'
 */
export function getFormRule(exerciseName) {
  if (!exerciseName) return 'guided'

  // 1. Exact
  if (RAW_MAP[exerciseName] != null) return RAW_MAP[exerciseName]

  // 2. Case-insensitive
  const lower = norm(exerciseName)
  if (LOWER_MAP[lower] != null) return LOWER_MAP[lower]

  // 3. Keyword fuzzy
  if (/squat|lunge|split squat|step.?up/i.test(lower)) return 'squat'
  if (/\bcurl\b/i.test(lower) && !/row|pull|crunch/i.test(lower)) return 'bicep_curl'
  if (
    /push.?up|pushup/i.test(lower) ||
    (/\bpress\b/i.test(lower) && !/leg press|hack press/i.test(lower))
  ) return 'pushup'

  // 4. DB fallback
  const dbRule = dbGetFormRule(exerciseName);
  if (dbRule !== 'guided') return dbRule;

  // 5. Default
  return 'guided'
}

/**
 * Returns true when the exercise has real angle-based form detection
 * (score + automatic rep counting).  Returns false for guided mode.
 */
export function hasFormDetection(exerciseName) {
  return getFormRule(exerciseName) !== 'guided'
}
