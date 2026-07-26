import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import StepBasics from '../components/diet/builder/StepBasics';
import StepDays   from '../components/diet/builder/StepDays';
import StepReview from '../components/diet/builder/StepReview';
import { validateNutritionTarget } from '../utils/nutritionTargetValidator';

const BASE_URL = import.meta.env.VITE_API_URL;

async function dietFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}

function makeEmptyDays() {
  return Array.from({ length: 7 }, (_, i) => ({
    day_number: i + 1,
    calories_target: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    notes: '',
    meals: [],
  }));
}

const STEP_LABELS = ['Basics', 'Days', 'Review'];

export default function TrainerDietBuilder({ directClientId } = {}) {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const editingId = directClientId ? null : (templateId || null);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    detail_level: '',
    calories_target: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    days: makeEmptyDays(),
  });

  useEffect(() => {
    if (editingId) loadTemplate();
  }, [editingId]);

  const loadTemplate = async () => {
    try {
      const t = await dietFetch(`/api/diet-plans/templates/${editingId}`);
      setFormData({
        name: t.name || '',
        description: t.description || '',
        detail_level: t.detail_level || '',
        calories_target: t.calories_target ?? '',
        protein_g: t.protein_g ?? '',
        carbs_g: t.carbs_g ?? '',
        fat_g: t.fat_g ?? '',
        days: t.days?.length
          ? t.days.map((d, i) => ({
              day_number: d.day_number ?? i + 1,
              calories_target: d.calories_target ?? null,
              protein_g: d.protein_g ?? null,
              carbs_g: d.carbs_g ?? null,
              fat_g: d.fat_g ?? null,
              notes: d.notes || '',
              meals: (d.meals || []).map(m => ({
                ...m,
                id: m.id || crypto.randomUUID(),
                foods: (m.foods || []).map(f => ({ ...f, id: f.id || crypto.randomUUID() })),
              })),
            }))
          : makeEmptyDays(),
      });
    } catch (err) {
      console.error('Load diet template error:', err);
    }
  };

  const handleNext = () => {
    const targetValidation = validateNutritionTarget({
      calories: formData.calories_target, protein: formData.protein_g, carbs: formData.carbs_g, fat: formData.fat_g,
    });
    if (!targetValidation.valid) {
      setError(targetValidation.error);
      return;
    }
    if (step === 1 && formData.detail_level === 'macros') {
      setStep(3);
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step === 3 && formData.detail_level === 'macros') {
      setStep(1);
    } else {
      setStep(s => s - 1);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const targetValidation = validateNutritionTarget({
        calories: formData.calories_target, protein: formData.protein_g, carbs: formData.carbs_g, fat: formData.fat_g,
      });
      if (!targetValidation.valid) {
        setError(targetValidation.error);
        return;
      }
      const invalidDay = formData.days.find(day => !validateNutritionTarget({
        calories: day.calories_target, protein: day.protein_g, carbs: day.carbs_g, fat: day.fat_g,
      }).valid);
      if (invalidDay) {
        setError(`Day ${invalidDay.day_number} has an inconsistent nutrition target. Adjust calories or macros before saving.`);
        return;
      }
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        detail_level: formData.detail_level,
        calories_target: formData.calories_target ? Number(formData.calories_target) : null,
        protein_g: formData.protein_g ? Number(formData.protein_g) : null,
        carbs_g: formData.carbs_g ? Number(formData.carbs_g) : null,
        fat_g: formData.fat_g ? Number(formData.fat_g) : null,
        days: formData.detail_level === 'macros' ? [] : formData.days,
      };

      if (directClientId) {
        // Direct assign to client — no template saved
        await dietFetch('/api/diet-plans/assign', {
          method: 'POST',
          body: JSON.stringify({ ...payload, client_id: directClientId }),
        });
        navigate(`/trainer/client/${directClientId}`);
      } else if (editingId) {
        await dietFetch(`/api/diet-plans/templates/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        navigate('/trainer/templates');
      } else {
        await dietFetch('/api/diet-plans/templates', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        navigate('/trainer/templates');
      }
    } catch (err) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Visual step index for indicator (maps step 3 when skipping step 2)
  const visualStep = step === 3 ? 3 : step;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ padding: '52px 16px 0', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => step === 1
            ? (directClientId ? navigate(`/trainer/client/${directClientId}`) : navigate('/trainer/templates'))
            : handleBack()
          }
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 22, lineHeight: 1, padding: '4px 4px 4px 0' }}
        >
          ←
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)', flex: 1 }}>
          {directClientId ? 'Assign Diet Plan' : editingId ? 'Edit Diet Template' : 'New Diet Template'}
        </h1>
      </div>

      {/* Step indicator */}
      <div style={{ padding: '0 16px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = visualStep === stepNum;
          const isDone = visualStep > stepNum;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                background: isActive || isDone ? 'var(--text-primary)' : 'var(--bg-elevated)',
                color: isActive || isDone ? 'var(--bg-primary)' : 'var(--text-tertiary)',
              }}>
                {isDone ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : stepNum}
              </div>
              <span style={{ fontSize: 12, color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: isActive ? 600 : 400 }}>
                {label}
              </span>
              {idx < STEP_LABELS.length - 1 && (
                <div style={{ width: 20, height: 1, background: isDone ? 'var(--border-strong)' : 'var(--border)', marginRight: 2 }} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: 'var(--error-bg)', borderRadius: 10, fontSize: 13, color: 'var(--error)' }}>
          {error}
        </div>
      )}

      {/* Step content */}
      <div style={{ padding: '0 16px' }}>
        {step === 1 && (
          <StepBasics data={formData} onChange={setFormData} onNext={handleNext} />
        )}
        {step === 2 && (
          <StepDays data={formData} onChange={setFormData} onNext={handleNext} onBack={handleBack} />
        )}
        {step === 3 && (
          <StepReview data={formData} onBack={handleBack} onSave={handleSave} saving={saving} editingId={editingId} />
        )}
      </div>
    </div>
  );
}
