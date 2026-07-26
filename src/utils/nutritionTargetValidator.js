const TARGET_FIELDS = ['calories', 'protein', 'carbs', 'fat'];

function parseOptionalPositive(value) {
  if (value === '' || value === null || value === undefined) return { empty: true, value: null };
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) && parsed > 0 ? { empty: false, value: parsed } : { empty: false, invalid: true };
}

const formatCalories = value => Number.isInteger(value)
  ? value.toLocaleString('en-IN')
  : (Math.round(value * 10) / 10).toLocaleString('en-IN');

export function validateNutritionTarget({ calories, protein, carbs, fat }) {
  const parsed = Object.fromEntries(TARGET_FIELDS.map(key => [key, parseOptionalPositive({ calories, protein, carbs, fat }[key])]));
  const entered = TARGET_FIELDS.filter(key => !parsed[key].empty);
  const invalidFields = TARGET_FIELDS.filter(key => parsed[key].invalid);
  if (invalidFields.length) {
    return { valid: false, complete: false, partial: false, invalidFields, error: 'Enter positive numbers or leave this optional target blank.' };
  }
  if (entered.length === 0) return { valid: true, complete: false, partial: false, invalidFields: [], macroCalories: null };
  if (entered.length < TARGET_FIELDS.length) return { valid: true, complete: false, partial: true, invalidFields: [], macroCalories: null };

  const macroCalories = parsed.protein.value * 4 + parsed.carbs.value * 4 + parsed.fat.value * 9;
  const declaredCalories = parsed.calories.value;
  const tolerance = Math.max(25, declaredCalories * 0.02);
  const difference = Math.abs(declaredCalories - macroCalories);
  if (difference > tolerance) {
    return {
      valid: false, complete: true, partial: false, invalidFields: TARGET_FIELDS,
      macroCalories, tolerance, difference,
      error: `These macros add up to ${formatCalories(macroCalories)} kcal, not ${formatCalories(declaredCalories)} kcal. Adjust calories or macros before continuing.`,
    };
  }
  return { valid: true, complete: true, partial: false, invalidFields: [], macroCalories, tolerance, difference };
}
