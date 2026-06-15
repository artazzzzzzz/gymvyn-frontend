// Mifflin-St Jeor BMR formula
export function calculateMacros({ weight, height, age, gender, activityLevel, dietGoal }) {
  const bmr = gender === 'female'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5

  const activityMultipliers = {
    sedentary:   1.2,
    light:       1.375,
    moderate:    1.55,
    active:      1.725,
    very_active: 1.9,
  }

  const tdee = bmr * (activityMultipliers[activityLevel] || 1.55)

  const calorieAdjustments = {
    maintenance:  tdee,
    bulk:         tdee + 300,
    extreme_bulk: tdee + 600,
    cut:          tdee - 400,
    extreme_cut:  tdee - 700,
  }

  const calories = Math.round(calorieAdjustments[dietGoal] || tdee)

  const macroSplits = {
    maintenance:  { p: 0.30, c: 0.45, f: 0.25 },
    bulk:         { p: 0.25, c: 0.50, f: 0.25 },
    extreme_bulk: { p: 0.25, c: 0.55, f: 0.20 },
    cut:          { p: 0.40, c: 0.35, f: 0.25 },
    extreme_cut:  { p: 0.45, c: 0.30, f: 0.25 },
  }

  const split = macroSplits[dietGoal] || macroSplits.maintenance

  return {
    calories,
    protein: Math.round((calories * split.p) / 4),
    carbs:   Math.round((calories * split.c) / 4),
    fat:     Math.round((calories * split.f) / 9),
  }
}
