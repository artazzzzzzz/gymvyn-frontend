import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

const MEAL_TYPES = ['Breakfast', 'Mid-Morning', 'Lunch', 'Snack', 'Dinner', 'Post-Workout'];
const DIET_TYPES = ['Balanced', 'High Protein', 'Low Carb', 'Vegetarian', 'Vegan', 'Keto', 'Bulking', 'Cutting'];

function newFood() {
  return { id: Date.now() + Math.random(), name: '', quantity: '', calories: '', protein: '', carbs: '', fat: '' };
}

function newMeal(type = 'Breakfast') {
  return { id: Date.now(), type, time: '', foods: [newFood()], notes: '' };
}

export default function TrainerDietBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { templateId } = useParams();
  const isEditing = !!templateId && templateId !== 'new';

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dietType, setDietType] = useState('Balanced');
  const [targetCalories, setTargetCalories] = useState('');
  const [meals, setMeals] = useState([newMeal('Breakfast')]);

  useEffect(() => {
    if (isEditing) loadTemplate();
  }, [isEditing]);

  const loadTemplate = async () => {
    try {
      const all = await apiFetch(`/api/trainer/templates/${user.id}?type=diet`);
      const t = all.find(x => x.id === templateId);
      if (!t) return;
      setName(t.name);
      setDescription(t.description || '');
      setDietType(t.template_data?.dietType || 'Balanced');
      setTargetCalories(t.template_data?.targetCalories?.toString() || '');
      setMeals(t.template_data?.meals?.length ? t.template_data.meals : [newMeal('Breakfast')]);
    } catch (err) {
      console.error('Load diet template error:', err);
    }
  };

  // ── Meal actions ──────────────────────────────
  const addMeal = () => {
    const usedTypes = meals.map(m => m.type);
    const nextType = MEAL_TYPES.find(t => !usedTypes.includes(t)) || 'Snack';
    setMeals(prev => [...prev, newMeal(nextType)]);
  };

  const removeMeal = (mealId) => {
    if (meals.length === 1) return;
    setMeals(prev => prev.filter(m => m.id !== mealId));
  };

  const updateMeal = (mealId, field, val) => {
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, [field]: val } : m));
  };

  // ── Food actions ──────────────────────────────
  const addFood = (mealId) => {
    setMeals(prev => prev.map(m =>
      m.id === mealId ? { ...m, foods: [...m.foods, newFood()] } : m
    ));
  };

  const removeFood = (mealId, foodId) => {
    setMeals(prev => prev.map(m =>
      m.id === mealId
        ? { ...m, foods: m.foods.length > 1 ? m.foods.filter(f => f.id !== foodId) : m.foods }
        : m
    ));
  };

  const updateFood = (mealId, foodId, field, val) => {
    setMeals(prev => prev.map(m =>
      m.id === mealId
        ? { ...m, foods: m.foods.map(f => f.id === foodId ? { ...f, [field]: val } : f) }
        : m
    ));
  };

  // ── Totals ────────────────────────────────────
  const calcMealTotals = (meal) => {
    return meal.foods.reduce((acc, f) => ({
      calories: acc.calories + (parseFloat(f.calories) || 0),
      protein: acc.protein + (parseFloat(f.protein) || 0),
      carbs: acc.carbs + (parseFloat(f.carbs) || 0),
      fat: acc.fat + (parseFloat(f.fat) || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const dayTotals = meals.reduce((acc, meal) => {
    const t = calcMealTotals(meal);
    return {
      calories: acc.calories + t.calories,
      protein: acc.protein + t.protein,
      carbs: acc.carbs + t.carbs,
      fat: acc.fat + t.fat
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // ── Save ──────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) return alert('Give your diet plan a name');
    setSaving(true);
    try {
      const payload = {
        trainerId: user.id,
        type: 'diet',
        name: name.trim(),
        description: description.trim(),
        templateData: {
          dietType,
          targetCalories: parseInt(targetCalories) || Math.round(dayTotals.calories),
          meals,
          totals: dayTotals
        },
        tags: [dietType]
      };

      if (isEditing) {
        await apiFetch(`/api/trainer/templates/${templateId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/api/trainer/templates', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      navigate('/trainer/templates');
    } catch (err) {
      alert('Failed to save');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-40">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/trainer/templates')} className="text-zinc-400 text-sm">
            ← Templates
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-5 py-2.5 bg-emerald-500 rounded-xl font-semibold text-sm disabled:opacity-40"
          >
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
          </button>
        </div>

        <input
          type="text"
          placeholder="Diet plan name e.g. 2000 kcal Cutting Plan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-xl font-bold bg-transparent placeholder:text-zinc-700 focus:outline-none border-b border-zinc-800 pb-3 mb-3"
        />

        <div className="flex gap-2 flex-wrap">
          <select
            value={dietType}
            onChange={(e) => setDietType(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-emerald-500"
          >
            {DIET_TYPES.map(d => <option key={d}>{d}</option>)}
          </select>
          <input
            type="number"
            placeholder="Target kcal"
            value={targetCalories}
            onChange={(e) => setTargetCalories(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 w-28 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Day totals bar */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-5 py-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-base font-bold text-emerald-400">{Math.round(dayTotals.calories)}</p>
            <p className="text-[10px] text-zinc-500">kcal</p>
          </div>
          <div>
            <p className="text-base font-bold text-blue-400">{Math.round(dayTotals.protein)}g</p>
            <p className="text-[10px] text-zinc-500">protein</p>
          </div>
          <div>
            <p className="text-base font-bold text-amber-400">{Math.round(dayTotals.carbs)}g</p>
            <p className="text-[10px] text-zinc-500">carbs</p>
          </div>
          <div>
            <p className="text-base font-bold text-pink-400">{Math.round(dayTotals.fat)}g</p>
            <p className="text-[10px] text-zinc-500">fat</p>
          </div>
        </div>
        {targetCalories && (
          <p className={`text-center text-[10px] mt-1 ${
            Math.abs(dayTotals.calories - parseInt(targetCalories)) <= 100
              ? 'text-emerald-400' : 'text-zinc-500'
          }`}>
            {dayTotals.calories > parseInt(targetCalories) ? '+' : ''}
            {Math.round(dayTotals.calories - parseInt(targetCalories))} kcal vs target
          </p>
        )}
      </div>

      {/* Meals */}
      <div className="px-5 pt-4 space-y-4">
        {meals.map((meal) => {
          const totals = calcMealTotals(meal);
          return (
            <div key={meal.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              {/* Meal header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <select
                    value={meal.type}
                    onChange={(e) => updateMeal(meal.id, 'type', e.target.value)}
                    className="bg-transparent font-semibold text-sm focus:outline-none cursor-pointer"
                  >
                    {MEAL_TYPES.map(t => <option key={t} className="bg-zinc-900">{t}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="time"
                    value={meal.time}
                    onChange={(e) => updateMeal(meal.id, 'time', e.target.value)}
                    className="w-16 bg-transparent text-xs text-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">{Math.round(totals.calories)} kcal</span>
                  {meals.length > 1 && (
                    <button
                      onClick={() => removeMeal(meal.id)}
                      className="text-zinc-600 hover:text-red-400 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Foods */}
              <div className="p-4 space-y-3">
                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 text-[9px] text-zinc-600 uppercase tracking-wider px-1">
                  <span className="col-span-4">Food</span>
                  <span className="col-span-2">Qty</span>
                  <span className="col-span-1">Cal</span>
                  <span className="col-span-1">P</span>
                  <span className="col-span-1">C</span>
                  <span className="col-span-1">F</span>
                  <span className="col-span-2"></span>
                </div>

                {meal.foods.map((food) => (
                  <div key={food.id} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Food name"
                      value={food.name}
                      onChange={(e) => updateFood(meal.id, food.id, 'name', e.target.value)}
                      className="col-span-4 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="100g"
                      value={food.quantity}
                      onChange={(e) => updateFood(meal.id, food.id, 'quantity', e.target.value)}
                      className="col-span-2 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-center focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={food.calories}
                      onChange={(e) => updateFood(meal.id, food.id, 'calories', e.target.value)}
                      className="col-span-1 px-1 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-center focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={food.protein}
                      onChange={(e) => updateFood(meal.id, food.id, 'protein', e.target.value)}
                      className="col-span-1 px-1 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-center focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={food.carbs}
                      onChange={(e) => updateFood(meal.id, food.id, 'carbs', e.target.value)}
                      className="col-span-1 px-1 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-center focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={food.fat}
                      onChange={(e) => updateFood(meal.id, food.id, 'fat', e.target.value)}
                      className="col-span-1 px-1 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-center focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => removeFood(meal.id, food.id)}
                      className="col-span-2 text-zinc-600 hover:text-red-400 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => addFood(meal.id)}
                  className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
                >
                  + Add food
                </button>

                <input
                  type="text"
                  placeholder="Meal notes (optional)..."
                  value={meal.notes}
                  onChange={(e) => updateMeal(meal.id, 'notes', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          );
        })}

        <button
          onClick={addMeal}
          className="w-full py-3.5 bg-zinc-900 border border-dashed border-zinc-700 rounded-xl text-zinc-400 text-sm font-medium hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
        >
          + Add Meal
        </button>
      </div>
    </div>
  );
}
