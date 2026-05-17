// Free CC-licensed exercise images from https://github.com/yuhonas/free-exercise-db
// Folder names verified against the actual repo (PascalCase with underscores).
// Each entry has image (position 0) and gif (position 1).
// getExerciseImages(name) returns { image, gif } or null (caller shows fallback).

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

function urls(folder) {
  return {
    image: `${BASE}/${folder}/0.jpg`,
    gif:   `${BASE}/${folder}/1.jpg`,
  }
}

export const EXERCISE_IMAGES = {
  'Bench Press':        urls('Barbell_Bench_Press_-_Medium_Grip'),
  'Squat':              urls('Barbell_Squat'),
  'Deadlift':           urls('Barbell_Deadlift'),
  'Overhead Press':     urls('Barbell_Shoulder_Press'),
  'Bent Over Row':      urls('Bent_Over_Barbell_Row'),
  'Pull Up':            urls('Band_Assisted_Pull-Up'),
  'Dip':                urls('Dips_-_Chest_Version'),
  'Lunge':              urls('Barbell_Lunge'),
  'Romanian Deadlift':  urls('Barbell_Romanian_Deadlift'),  // may 404 → fallback
  'Bicep Curl':         urls('Barbell_Curl'),
  'Tricep Extension':   urls('Cable_One_Arm_Tricep_Extension'),
  'Lateral Raise':      urls('Lateral_Raise_-_With_Bands'),
  'Leg Press':          urls('Leg_Press'),
  'Leg Curl':           urls('Lying_Leg_Curls'),
  'Calf Raise':         urls('Barbell_Seated_Calf_Raise'),
  'Face Pull':          urls('Face_Pull'),
  'Cable Row':          urls('Elevated_Cable_Rows'),
  'Chest Fly':          urls('Dumbbell_Flyes'),
  'Incline Bench Press':urls('Barbell_Incline_Bench_Press_-_Medium_Grip'),
  'Front Squat':        urls('Front_Barbell_Squat'),
  'Hip Thrust':         urls('Barbell_Hip_Thrust'),
  'Plank':              null,  // not in the db — will show fallback
  'Arnold Press':       urls('Arnold_Dumbbell_Press'),
  'Hammer Curl':        urls('Hammer_Curls'),
  'Skull Crusher':      urls('Band_Skull_Crusher'),
  'Good Morning':       urls('Good_Morning'),
  'Box Jump':           urls('Box_Jump_Multiple_Response'),
  'Battle Ropes':       urls('Battling_Ropes'),
  'Farmer Walk':        urls('Farmers_Walk'),
  'Goblet Squat':       urls('Goblet_Squat'),
}

/** Returns { image: string, gif: string } or null if no entry exists. */
export function getExerciseImages(name) {
  return EXERCISE_IMAGES[name] ?? null
}
