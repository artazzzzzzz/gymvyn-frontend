import { useState } from 'react';
import { Trash2, Plus, ChevronDown } from 'lucide-react';
import MacroInputRow from './MacroInputRow';

const MEAL_PRESETS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout', 'Custom'];

function newFood() {
  return { id: crypto.randomUUID(), food_name: '', quantity_g: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' };
}

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

  const addFood = () => {
    onChange({ ...meal, foods: [...(meal.foods || []), newFood()] });
  };

  const updateFood = (foodId, field, val) => {
    onChange({
      ...meal,
      foods: meal.foods.map(f => f.id === foodId ? { ...f, [field]: val } : f),
    });
  };

  const deleteFood = (foodId) => {
    onChange({ ...meal, foods: meal.foods.filter(f => f.id !== foodId) });
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#D85A30' }}
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

          {/* Meal macros */}
          <div style={{ marginBottom: 8 }}>
            <MacroInputRow
              calories={meal.calories}
              protein={meal.protein_g}
              carbs={meal.carbs_g}
              fat={meal.fat_g}
              onChange={v => onChange({ ...meal, calories: v.calories, protein_g: v.protein, carbs_g: v.carbs, fat_g: v.fat })}
            />
          </div>

          {/* Notes */}
          <input
            placeholder="Notes…"
            value={meal.notes || ''}
            onChange={e => update('notes', e.target.value)}
            style={{ ...inputStyle, marginBottom: showFoods ? 10 : 0 }}
          />

          {/* Foods (full detail level only) */}
          {showFoods && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Foods
              </p>
              {(meal.foods || []).map(food => (
                <div key={food.id} style={{ marginBottom: 8, background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input
                      placeholder="Food name"
                      value={food.food_name}
                      onChange={e => updateFood(food.id, 'food_name', e.target.value)}
                      style={{ ...inputStyle, flex: 2 }}
                    />
                    <div style={{ flex: 1 }}>
                      <input
                        inputMode="numeric"
                        type="number"
                        placeholder="g"
                        value={food.quantity_g || ''}
                        onChange={e => updateFood(food.id, 'quantity_g', e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <button
                      onClick={() => deleteFood(food.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D85A30', padding: '0 4px', flexShrink: 0 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
                    {[
                      { key: 'calories',  label: 'Cal' },
                      { key: 'protein_g', label: 'P (g)' },
                      { key: 'carbs_g',   label: 'C (g)' },
                      { key: 'fat_g',     label: 'F (g)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <p style={{ fontSize: 9, color: 'var(--text-tertiary)', margin: '0 0 2px 2px' }}>{label}</p>
                        <input
                          inputMode="numeric"
                          type="number"
                          placeholder="0"
                          value={food[key] || ''}
                          onChange={e => updateFood(food.id, key, e.target.value)}
                          style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, textAlign: 'center' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={addFood}
                style={{
                  width: '100%', padding: '8px', borderRadius: 8,
                  border: '1px dashed var(--border)', background: 'none',
                  color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                <Plus size={13} /> Add Food
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
