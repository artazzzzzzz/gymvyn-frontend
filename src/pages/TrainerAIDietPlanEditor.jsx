import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '../utils/supabase';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const inputStyle = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 14,
  padding: '8px 10px',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 11,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 4,
  display: 'block',
};

function recomputeCalories(protein_g, carbs_g, fat_g) {
  return Math.round(4 * (protein_g || 0) + 4 * (carbs_g || 0) + 9 * (fat_g || 0));
}

export default function TrainerAIDietPlanEditor() {
  const { clientId, planId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialPlan = location.state?.plan;
  const [name, setName] = useState(initialPlan?.name || '');
  const [description, setDescription] = useState(initialPlan?.description || '');
  const [days, setDays] = useState(initialPlan?.plan_data?.days || []);
  const [activeDay, setActiveDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  // No location.state (e.g. page refresh) — fetch is out of scope for this MVP view.

  function updateMeal(dayIdx, mealIdx, field, value) {
    setDays(prev => prev.map((day, di) => {
      if (di !== dayIdx) return day;
      const meals = (day.meals || []).map((meal, mi) => {
        if (mi !== mealIdx) return meal;
        const updated = { ...meal, [field]: value };
        if (['protein_g', 'carbs_g', 'fat_g'].includes(field)) {
          updated.calories = recomputeCalories(
            field === 'protein_g' ? value : meal.protein_g,
            field === 'carbs_g' ? value : meal.carbs_g,
            field === 'fat_g' ? value : meal.fat_g,
          );
        }
        return updated;
      });
      return { ...day, meals };
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${BASE_URL}/api/client-diet-plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name,
          description,
          plan_data: { name, description, days },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || `API error ${res.status}`);
      setSaved(true);
      setTimeout(() => navigate(`/trainer/client/${clientId}`), 700);
    } catch (err) {
      setSaveError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const day = days[activeDay];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 100 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 12px',
        position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex' }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Diet Plan</div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Plan Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} />
        </div>

        {days.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
              {days.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setActiveDay(i)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, fontSize: 13, flexShrink: 0,
                    fontWeight: activeDay === i ? 600 : 400, border: 'none', cursor: 'pointer',
                    background: activeDay === i ? 'var(--text-primary)' : 'var(--bg-pill)',
                    color: activeDay === i ? 'var(--bg-card)' : 'var(--text-secondary)',
                  }}
                >
                  Day {d.day ?? i + 1}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(day?.meals || []).map((meal, mi) => (
                <div key={mi} style={{
                  background: 'var(--bg-card)', border: '0.5px solid var(--border)',
                  borderRadius: 12, padding: 14,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    {meal.meal_type || 'Meal'}
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Food Name</label>
                    <input
                      value={meal.food_name || ''}
                      onChange={e => updateMeal(activeDay, mi, 'food_name', e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Quantity</label>
                      <input
                        type="number" min="0" step="0.1"
                        value={meal.quantity ?? ''}
                        onChange={e => updateMeal(activeDay, mi, 'quantity', Number(e.target.value) || 0)}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={labelStyle}>Unit</label>
                      <input
                        value={meal.unit || ''}
                        onChange={e => updateMeal(activeDay, mi, 'unit', e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Protein (g)', field: 'protein_g' },
                      { label: 'Carbs (g)', field: 'carbs_g' },
                      { label: 'Fat (g)', field: 'fat_g' },
                    ].map(({ label, field }) => (
                      <div key={field}>
                        <label style={labelStyle}>{label}</label>
                        <input
                          type="number" min="0" step="0.1"
                          value={meal[field] ?? 0}
                          onChange={e => updateMeal(activeDay, mi, field, Number(e.target.value) || 0)}
                          style={inputStyle}
                        />
                      </div>
                    ))}
                    <div>
                      <label style={labelStyle}>Calories</label>
                      <input
                        type="number" min="0"
                        value={Math.round(meal.calories || 0)}
                        onChange={e => updateMeal(activeDay, mi, 'calories', Number(e.target.value) || 0)}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {saveError && (
          <div style={{ fontSize: 13, color: 'var(--error)', marginTop: 16, textAlign: 'center' }}>{saveError}</div>
        )}
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px 24px',
        background: 'var(--bg-primary)', borderTop: '0.5px solid var(--border)',
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14,
            border: 'none', background: saved ? 'var(--success)' : 'var(--text-primary)',
            color: 'var(--bg-card)', fontSize: 15, fontWeight: 600,
            cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Plan'}
        </button>
      </div>
    </div>
  );
}
