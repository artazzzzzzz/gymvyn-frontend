import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../utils/supabase';

function recomputeCalories(protein_g, carbs_g, fat_g) {
  return Math.round(4 * protein_g + 4 * carbs_g + 9 * fat_g);
}

export default function EditFoodLogSheet({ logEntry, onSaved, onClose }) {
  const baseMacrosRef = useRef(() => {
    const qty = parseFloat(logEntry.quantity) || 1;
    const safeQty = qty > 0 && isFinite(qty) ? qty : 1;
    return {
      protein: (parseFloat(logEntry.protein_g) || 0) / safeQty,
      carbs:   (parseFloat(logEntry.carbs_g)   || 0) / safeQty,
      fat:     (parseFloat(logEntry.fat_g)     || 0) / safeQty,
    };
  });

  const [foodName, setFoodName]     = useState(() => {
    const n = logEntry.food_name || '';
    return n.length > 0 ? n.charAt(0).toUpperCase() + n.slice(1) : n;
  });
  const [quantity, setQuantity]     = useState(String(logEntry.quantity ?? 1));
  const [servingUnit, setServingUnit] = useState(logEntry.serving_unit || '');
  const [proteinG, setProteinG]     = useState(logEntry.protein_g    || 0);
  const [carbsG, setCarbsG]         = useState(logEntry.carbs_g      || 0);
  const [fatG, setFatG]             = useState(logEntry.fat_g        || 0);
  const [calories, setCalories]     = useState(logEntry.calories      || 0);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');

  function handleMacroChange(field, rawValue) {
    const num = Number(rawValue) || 0;
    let p = proteinG, c = carbsG, f = fatG;
    if (field === 'protein_g') { setProteinG(num); p = num; }
    else if (field === 'carbs_g') { setCarbsG(num); c = num; }
    else if (field === 'fat_g')   { setFatG(num);   f = num; }
    setCalories(recomputeCalories(p, c, f));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const { error } = await supabase
        .from('food_logs')
        .update({
          food_name:    foodName,
          quantity:     Number(quantity) || 1,
          serving_unit: servingUnit,
          protein_g:    proteinG,
          carbs_g:      carbsG,
          fat_g:        fatG,
          calories,
        })
        .eq('id', logEntry.id);
      if (error) throw new Error(error.message);
      onSaved();
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

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        backgroundColor: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 40px',
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'slideUpSheet 0.25s ease',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--border)', margin: '0 auto 16px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Food Entry</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Food name */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Food Name</label>
          <input value={foodName} onChange={e => {
            const v = e.target.value;
            setFoodName(v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1) : v);
          }} style={inputStyle} />
        </div>

        {/* Quantity + unit */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Quantity</label>
            <input type="number" min="0.1" step="0.1" value={quantity}
              onChange={e => {
                const raw = e.target.value;
                setQuantity(raw);
                const qty = parseFloat(raw) || 0;
                if (qty > 0 && isFinite(qty)) {
                  const bm = baseMacrosRef.current();
                  const p = Math.round((bm.protein * qty) * 10) / 10;
                  const c = Math.round((bm.carbs   * qty) * 10) / 10;
                  const f = Math.round((bm.fat     * qty) * 10) / 10;
                  setProteinG(p);
                  setCarbsG(c);
                  setFatG(f);
                  setCalories(recomputeCalories(p, c, f));
                }
              }} style={inputStyle} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>Serving Unit</label>
            <input value={servingUnit} onChange={e => setServingUnit(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Macros grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Protein (g)', field: 'protein_g', value: proteinG },
            { label: 'Carbs (g)',   field: 'carbs_g',   value: carbsG   },
            { label: 'Fat (g)',     field: 'fat_g',     value: fatG     },
          ].map(({ label, field, value }) => (
            <div key={field}>
              <label style={labelStyle}>{label}</label>
              <input type="number" min="0" step="0.1" value={Math.round(value * 10) / 10}
                onChange={e => handleMacroChange(field, e.target.value)} style={inputStyle} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>Calories</label>
            <input type="number" min="0" value={Math.round(calories)}
              onChange={e => setCalories(Number(e.target.value) || 0)} style={inputStyle} />
          </div>
        </div>

        {saveError && (
          <div style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12, textAlign: 'center' }}>{saveError}</div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 14,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{
              flex: 2, padding: '14px 0', borderRadius: 14,
              border: 'none', background: 'var(--text-primary)',
              color: 'var(--bg-card)', fontSize: 15, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </>
  );
}
