import { useState, useRef } from 'react';
import { X, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch',     label: 'Lunch'     },
  { value: 'dinner',    label: 'Dinner'    },
  { value: 'snack',     label: 'Snack'     },
];

function recomputeCalories(item) {
  return Math.round(4 * (item.protein_g || 0) + 4 * (item.carbs_g || 0) + 9 * (item.fat_g || 0));
}

function guessMealTypeNow() {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 19) return 'snack';
  if (h >= 19 && h < 23) return 'dinner';
  return 'snack';
}

export default function VoiceDietConfirmSheet({ parseResult, logDate, onSaved, onClose }) {
  const { transcript, inferred_meal_type } = parseResult;

  const baseMacrosRef = useRef(null);

  const [mealType, setMealType] = useState(inferred_meal_type || guessMealTypeNow());
  const [items, setItems] = useState(() => {
    const initialItems = parseResult.items.map((item, i) => ({
      ...item,
      food_name: item.food_name
        ? item.food_name.charAt(0).toUpperCase() + item.food_name.slice(1)
        : item.food_name,
      _id: i,
    }));
    const bm = {};
    initialItems.forEach(item => {
      const qty = parseFloat(item.quantity) || 1;
      const safeQty = (qty > 0 && isFinite(qty)) ? qty : 1;
      bm[item._id] = {
        protein: (parseFloat(item.protein_g) || 0) / safeQty,
        carbs:   (parseFloat(item.carbs_g)   || 0) / safeQty,
        fat:     (parseFloat(item.fat_g)     || 0) / safeQty,
      };
    });
    baseMacrosRef.current = bm;
    return initialItems;
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  function updateItem(id, field, rawValue) {
    setItems(prev => prev.map(item => {
      if (item._id !== id) return item;
      const updated = { ...item };

      if (field === 'calories') {
        updated.calories = Number(rawValue) || 0;
        // Do NOT auto-adjust P/C/F when user edits calories directly
      } else if (field === 'protein_g' || field === 'carbs_g' || field === 'fat_g') {
        updated[field] = Number(rawValue) || 0;
        updated.calories = recomputeCalories(updated);
      } else if (field === 'quantity') {
        const qty = parseFloat(rawValue) || 0;
        updated.quantity = qty;
        if (qty > 0 && isFinite(qty)) {
          const bm = (baseMacrosRef.current || {})[id] || { protein: 0, carbs: 0, fat: 0 };
          updated.protein_g = Math.round((bm.protein * qty) * 10) / 10;
          updated.carbs_g   = Math.round((bm.carbs   * qty) * 10) / 10;
          updated.fat_g     = Math.round((bm.fat     * qty) * 10) / 10;
          updated.calories  = recomputeCalories(updated);
        }
      } else {
        if (field === 'food_name' && typeof rawValue === 'string' && rawValue.length > 0) {
          updated[field] = rawValue.charAt(0).toUpperCase() + rawValue.slice(1);
        } else {
          updated[field] = rawValue;
        }
      }
      return updated;
    }));
  }

  function removeItem(id) {
    setItems(prev => prev.filter(item => item._id !== id));
  }

  const totals = items.reduce((acc, item) => ({
    calories:  acc.calories  + (item.calories  || 0),
    protein_g: acc.protein_g + (item.protein_g || 0),
    carbs_g:   acc.carbs_g   + (item.carbs_g   || 0),
    fat_g:     acc.fat_g     + (item.fat_g     || 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  async function handleSave() {
    if (items.length === 0) return;
    setSaving(true);
    setSaveError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${BASE_URL}/api/ai/voice/diet/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ meal_type: mealType, items, log_date: logDate }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Save failed');
      onSaved(data.saved_count);
    } catch (err) {
      setSaveError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 13,
    padding: '4px 8px',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200 }} />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 201,
        backgroundColor: 'var(--bg-primary)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        animation: 'slideUpSheet 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)',
          padding: '16px 16px 0', zIndex: 1,
          borderBottom: '1px solid var(--border)', paddingBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Confirm your meal</div>
              {transcript && transcript.trim() && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3, fontStyle: 'italic' }}>
                  Heard: "{transcript.slice(0, 80)}{transcript.length > 80 ? '…' : ''}"
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
              <X size={20} />
            </button>
          </div>

          {/* Meal type selector */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
            {MEAL_TYPES.map(m => (
              <button key={m.value} onClick={() => setMealType(m.value)}
                style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 13, border: 'none', cursor: 'pointer',
                  backgroundColor: mealType === m.value ? 'var(--text-primary)' : 'var(--bg-pill)',
                  color: mealType === m.value ? 'var(--bg-card)' : 'var(--text-secondary)',
                  fontWeight: mealType === m.value ? 600 : 400,
                }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
              All items removed.
            </div>
          )}

          {items.map(item => (
            <div key={item._id} style={{
              backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 14,
              border: '1px solid var(--border)',
            }}>
              {/* Food name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {item.confidence < 0.6 && (
                  <div title="Low confidence — please double-check"
                    style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#F6C244', flexShrink: 0 }} />
                )}
                <input
                  value={item.food_name}
                  onChange={e => updateItem(item._id, 'food_name', e.target.value)}
                  style={{ ...inputStyle, fontWeight: 600, fontSize: 14, flex: 1 }}
                />
                <button onClick={() => removeItem(item._id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', flexShrink: 0 }}>
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Quantity + unit */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Qty</div>
                  <input type="number" value={item.quantity}
                    onChange={e => updateItem(item._id, 'quantity', e.target.value)}
                    style={inputStyle} />
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unit</div>
                  <input value={item.unit}
                    onChange={e => updateItem(item._id, 'unit', e.target.value)}
                    style={inputStyle} />
                </div>
              </div>

              {/* Macros row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                {[
                  { label: 'Protein g', field: 'protein_g', value: item.protein_g },
                  { label: 'Carbs g',   field: 'carbs_g',   value: item.carbs_g   },
                  { label: 'Fat g',     field: 'fat_g',     value: item.fat_g     },
                  { label: 'Calories',  field: 'calories',  value: item.calories  },
                ].map(({ label, field, value }) => (
                  <div key={field}>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <input type="number" value={Math.round(value * 10) / 10}
                      onChange={e => updateItem(item._id, field, e.target.value)}
                      style={inputStyle} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Totals */}
          {items.length > 0 && (
            <div style={{
              backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: 14,
              border: '1px solid var(--border)',
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8,
            }}>
              {[
                { label: 'Total kcal', value: Math.round(totals.calories)  },
                { label: 'Protein g',  value: Math.round(totals.protein_g) },
                { label: 'Carbs g',    value: Math.round(totals.carbs_g)   },
                { label: 'Fat g',      value: Math.round(totals.fat_g)     },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{
          position: 'sticky', bottom: 0, backgroundColor: 'var(--bg-primary)',
          padding: '12px 16px 32px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10,
        }}>
          <button onClick={onClose}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 14, border: '1px solid var(--border)',
              backgroundColor: 'transparent', color: 'var(--text-primary)',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || items.length === 0}
            style={{
              flex: 2, padding: '14px 0', borderRadius: 14, border: 'none',
              backgroundColor: items.length === 0 ? 'var(--bg-pill)' : 'var(--text-primary)',
              color: 'var(--bg-card)',
              fontSize: 15, fontWeight: 600, cursor: saving || items.length === 0 ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? 'Saving…' : `Save All (${items.length})`}
          </button>
        </div>

        {saveError && (
          <div style={{ padding: '0 16px 16px', textAlign: 'center', fontSize: 13, color: 'var(--error)' }}>{saveError}</div>
        )}
      </div>

      <style>{`@keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </>
  );
}
