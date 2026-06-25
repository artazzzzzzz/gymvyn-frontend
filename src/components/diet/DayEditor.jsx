import { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import MacroInputRow from './MacroInputRow';
import MealRow from './MealRow';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function newMeal() {
  return {
    id: crypto.randomUUID(),
    meal_name: 'Breakfast',
    meal_order: 0,
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    notes: '',
    foods: [],
  };
}

export default function DayEditor({ day, dayNumber, detailLevel, onChange, defaultMacros }) {
  const [showMacroOverride, setShowMacroOverride] = useState(false);

  const updateMeal = (idx, updated) => {
    const meals = [...(day.meals || [])];
    meals[idx] = updated;
    onChange({ ...day, meals });
  };

  const deleteMeal = (idx) => {
    const meals = (day.meals || []).filter((_, i) => i !== idx);
    onChange({ ...day, meals });
  };

  const addMeal = () => {
    const meals = [...(day.meals || []), { ...newMeal(), meal_order: (day.meals || []).length }];
    onChange({ ...day, meals });
  };

  const hasMacroOverride = day.calories_target || day.protein_g || day.carbs_g || day.fat_g;

  return (
    <div>
      {/* Macro override toggle */}
      <button
        onClick={() => setShowMacroOverride(s => !s)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: hasMacroOverride ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontSize: 13, padding: '4px 0', marginBottom: 8,
        }}
      >
        <ChevronDown
          size={13}
          style={{ transform: showMacroOverride ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
        />
        Override daily macros {hasMacroOverride ? '(set)' : '(optional)'}
      </button>

      {showMacroOverride && (
        <div style={{ marginBottom: 12 }}>
          <MacroInputRow
            calories={day.calories_target ?? defaultMacros?.calories ?? ''}
            protein={day.protein_g ?? defaultMacros?.protein ?? ''}
            carbs={day.carbs_g ?? defaultMacros?.carbs ?? ''}
            fat={day.fat_g ?? defaultMacros?.fat ?? ''}
            onChange={v => onChange({
              ...day,
              calories_target: v.calories || null,
              protein_g: v.protein || null,
              carbs_g: v.carbs || null,
              fat_g: v.fat || null,
            })}
          />
        </div>
      )}

      {/* Notes */}
      <textarea
        placeholder="Notes for this day…"
        rows={2}
        value={day.notes || ''}
        onChange={e => onChange({ ...day, notes: e.target.value })}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border)',
          borderRadius: 8, padding: '10px 12px',
          fontSize: 13, color: 'var(--text-primary)',
          outline: 'none', resize: 'none', marginBottom: 12,
          fontFamily: 'inherit',
        }}
      />

      {/* Meals */}
      {detailLevel !== 'macros' && (
        <div>
          {(day.meals || []).map((meal, idx) => (
            <MealRow
              key={meal.id}
              meal={meal}
              onChange={updated => updateMeal(idx, updated)}
              onDelete={() => deleteMeal(idx)}
              showFoods={detailLevel === 'full'}
            />
          ))}
          <button
            onClick={addMeal}
            style={{
              width: '100%', padding: '10px', borderRadius: 10,
              border: '1px dashed var(--border)', background: 'none',
              color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontWeight: 500,
            }}
          >
            <Plus size={14} /> Add Meal
          </button>
        </div>
      )}
    </div>
  );
}
