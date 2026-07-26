import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { getFoodbaseFood, previewMealNutrition, searchFood } from '../../utils/api';

const fieldStyle = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box',
};

const metricWeight = (entry) => {
  const unit = String(entry.serving_unit || '').toLowerCase();
  if (unit === 'g' || unit === 'gram' || unit === 'grams') return Number(entry.serving_quantity) || 0;
  const portion = entry.portions?.find(p => p.serving_unit === entry.serving_unit);
  return (Number(portion?.grams_equivalent) || 0) * (Number(entry.serving_quantity) || 0) / (Number(portion?.serving_size) || 1);
};

function localEstimate(entry) {
  const food = entry.food;
  if (!food) return null;
  const quantity = Number(entry.serving_quantity) || 0;
  const portion = entry.portions?.find(p => p.serving_unit === entry.serving_unit);
  const base = portion || food;
  const factor = quantity / (Number(base.serving_size) || 1);
  return {
    calories: Math.round((Number(base.calories ?? base.calories_per_serving) || 0) * factor),
    protein_g: Math.round((Number(base.protein_g) || 0) * factor * 10) / 10,
    carbs_g: Math.round((Number(base.carbs_g) || 0) * factor * 10) / 10,
    fat_g: Math.round((Number(base.fat_g) || 0) * factor * 10) / 10,
    fiber_g: Math.round((Number(base.fiber_g) || 0) * factor * 10) / 10,
    weight_g: metricWeight(entry),
  };
}

export default function MealBuilder({ foods = [], onChange, disabled = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState('');
  const [serverTotals, setServerTotals] = useState(null);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) { setResults([]); return undefined; }
    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try { setResults(await searchFood(clean)); setError(''); }
      catch { setError('Foodbase search is unavailable. Please try again.'); }
      finally { setLoadingSearch(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const validFoods = useMemo(() => foods.filter(food => food.food_id && food.serving_quantity && food.serving_unit), [foods]);
  useEffect(() => {
    if (!validFoods.length) { setServerTotals(null); return undefined; }
    const timer = setTimeout(async () => {
      try {
        const preview = await previewMealNutrition(validFoods.map(({ food_id, serving_quantity, serving_unit }) => ({ food_id, serving_quantity: Number(serving_quantity), serving_unit })));
        setServerTotals(preview.totals);
        let resolvedIndex = 0;
        onChange(foods.map(food => {
          if (!food.food_id) return food; // legacy historical entry: preserve, never overwrite it.
          const item = preview.ingredients[resolvedIndex++];
          return item ? { ...food, ...item } : food;
        }));
      } catch (err) { setError(err.message || 'Unable to calculate this meal.'); }
    }, 350);
    return () => clearTimeout(timer);
  // food ids/quantities are the only server-input dependencies; avoid looping when snapshots update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validFoods.map(f => `${f.food_id}:${f.serving_quantity}:${f.serving_unit}`).join('|')]);

  const addFood = async (result) => {
    try {
      const detail = await getFoodbaseFood(result.id);
      const defaultPortion = detail.portions.find(p => p.is_default) || detail.portions[0];
      const unit = defaultPortion?.serving_unit || detail.food.serving_unit;
      const quantity = defaultPortion?.serving_size || detail.food.serving_size || 1;
      onChange([...foods, {
        id: crypto.randomUUID(), food_id: detail.food.id, food_name: detail.food.name,
        serving_quantity: quantity, serving_unit: unit, food: detail.food, portions: detail.portions,
      }]);
      setQuery(''); setResults([]); setError('');
    } catch (err) { setError(err.message || 'Unable to add this Foodbase food.'); }
  };
  const updateFood = (id, patch) => onChange(foods.map(food => food.id === id ? { ...food, ...patch } : food));
  const removeFood = (id) => onChange(foods.filter(food => food.id !== id));
  const localTotals = foods.reduce((total, food) => {
    const value = localEstimate(food); if (!value) return total;
    Object.keys(total).forEach(key => { total[key] += Number(value[key]) || 0; }); return total;
  }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, weight_g: 0 });
  const totals = serverTotals || localTotals;

  return <section aria-label="Meal ingredients">
    <label htmlFor="foodbase-search" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Add from Foodbase</label>
    <div style={{ position: 'relative', marginBottom: 10 }}>
      <Search size={15} aria-hidden="true" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-tertiary)' }} />
      <input id="foodbase-search" disabled={disabled} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search foods" style={{ ...fieldStyle, paddingLeft: 32 }} />
      {(loadingSearch || results.length > 0) && <div style={{ position: 'absolute', zIndex: 2, top: 42, width: '100%', maxHeight: 210, overflowY: 'auto', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}>
        {loadingSearch && <p style={{ margin: 10, fontSize: 12, color: 'var(--text-secondary)' }}>Searching Foodbase…</p>}
        {results.filter(result => result.id).map(result => <button key={result.id} type="button" onClick={() => addFood(result)} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', padding: '10px', cursor: 'pointer' }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{result.name}</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{result.category} · {result.calories_per_serving} kcal per serving</span>
        </button>)}
      </div>}
    </div>
    {foods.length === 0 ? <p style={{ color: 'var(--text-tertiary)', fontSize: 13, margin: '8px 0' }}>Search Foodbase to add ingredients. Meals are built from saved Foodbase foods only.</p> : foods.map(food => {
      const units = [...new Set([food.food?.serving_unit, ...(food.portions || []).map(portion => portion.serving_unit)].filter(Boolean))];
      const estimate = localEstimate(food);
      return <div key={food.id} style={{ padding: 10, marginBottom: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><strong style={{ flex: 1, color: 'var(--text-primary)', fontSize: 13 }}>{food.food_name}</strong><button type="button" disabled={disabled} onClick={() => removeFood(food.id)} aria-label={`Remove ${food.food_name}`} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}><Trash2 size={15} /></button></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Quantity<input disabled={disabled} min="0.1" step="0.1" type="number" value={food.serving_quantity} onChange={event => updateFood(food.id, { serving_quantity: event.target.value })} style={{ ...fieldStyle, marginTop: 3 }} /></label>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Supported unit<select disabled={disabled} value={food.serving_unit} onChange={event => updateFood(food.id, { serving_unit: event.target.value })} style={{ ...fieldStyle, marginTop: 3 }}>{units.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></label>
        </div>
        {estimate && <p style={{ margin: '7px 0 0', color: 'var(--text-tertiary)', fontSize: 11 }}>Estimate: {estimate.calories} kcal · P {estimate.protein_g}g · C {estimate.carbs_g}g · F {estimate.fat_g}g · Fibre {estimate.fiber_g}g</p>}
      </div>;
    })}
    {foods.length > 0 && <div style={{ padding: '9px 10px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>Nutrition summary: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(totals.calories)} kcal</strong> · P {Math.round(totals.protein_g * 10) / 10}g · C {Math.round(totals.carbs_g * 10) / 10}g · F {Math.round(totals.fat_g * 10) / 10}g · Fibre {Math.round(totals.fiber_g * 10) / 10}g · {Math.round(totals.weight_g)}g total</div>}
    {error && <p role="alert" style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0' }}>{error}</p>}
  </section>;
}
