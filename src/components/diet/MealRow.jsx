import { useState } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import MealBuilder from './MealBuilder';

const MEAL_PRESETS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout', 'Custom'];

const inputStyle = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

export default function MealRow({ meal, onChange, onDelete, showFoods }) {
  const [expanded, setExpanded] = useState(true);
  const isCustom = !MEAL_PRESETS.slice(0, -1).includes(meal.meal_name);
  const selectedPreset = isCustom ? 'Custom' : meal.meal_name;

  const update = (field, val) => onChange({ ...meal, [field]: val });

  const handlePreset = (preset) => {
    if (preset === 'Custom') {
      onChange({ ...meal, meal_name: '' });
    } else {
      onChange({ ...meal, meal_name: preset });
    }
  };

  const updateFoods = (foods) => {
    const totals = foods.reduce((sum, food) => ({
      calories: sum.calories + (Number(food.calories) || 0),
      protein_g: sum.protein_g + (Number(food.protein_g) || 0),
      carbs_g: sum.carbs_g + (Number(food.carbs_g) || 0),
      fat_g: sum.fat_g + (Number(food.fat_g) || 0),
      fiber_g: sum.fiber_g + (Number(food.fiber_g) || 0),
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });
    onChange({ ...meal, foods, ...totals });
  };

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '0.5px solid var(--border)',
      borderLeft: '3px solid var(--border-strong)',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 10,
    }}>
      {/* Meal header */}
      <div
        style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <ChevronDown
          size={14}
          color="var(--text-tertiary)"
          style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        />
        <span style={{ fontSize: 14, fontWeight: 500, flex: 1, color: 'var(--text-primary)' }}>
          {meal.meal_name || 'New Meal'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 12px' }}>
          {/* Meal type pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
            {MEAL_PRESETS.map(preset => (
              <button
                key={preset}
                onClick={() => handlePreset(preset)}
                style={{
                  flexShrink: 0,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedPreset === preset ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: selectedPreset === preset ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  boxShadow: selectedPreset === preset ? 'none' : '0 0 0 0.5px var(--border)',
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Custom name input */}
          {(selectedPreset === 'Custom' || isCustom) && (
            <input
              placeholder="Meal name"
              value={meal.meal_name}
              onChange={e => update('meal_name', e.target.value)}
              style={{ ...inputStyle, marginBottom: 8 }}
            />
          )}

          <p style={{ margin: '2px 0 10px', fontSize: 12, color: 'var(--text-secondary)' }}>Nutrition is calculated from the Foodbase ingredients below.</p>

          {/* Notes */}
          <input
            placeholder="Notes for this planned meal…"
            value={meal.notes || ''}
            onChange={e => update('notes', e.target.value)}
            style={{ ...inputStyle, marginBottom: showFoods ? 10 : 0 }}
          />

          {/* Foods (full detail level only) */}
          {showFoods && (
            <div>
              <MealBuilder foods={meal.foods || []} onChange={updateFoods} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
