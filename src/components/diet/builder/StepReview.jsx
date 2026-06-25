import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LEVEL_BADGE = {
  macros: { label: 'Macro Targets', bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
  meals:  { label: 'Meal Plan',     bg: '#FFF3E0',            color: '#BA7517' },
  full:   { label: 'Full Plan',     bg: '#E8F5E9',            color: '#1D9E75' },
};

function StatChip({ label, value }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{value || '—'}</p>
      <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
    </div>
  );
}

function DayAccordion({ day, dayLabel, detailLevel }) {
  const [open, setOpen] = useState(false);
  const meals = day.meals || [];
  if (meals.length === 0 && !day.notes) return null;

  return (
    <div style={{ borderBottom: '0.5px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 0', background: 'none', border: 'none',
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}
      >
        <ChevronDown
          size={13}
          color="var(--text-tertiary)"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        />
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>
          {dayLabel}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
        </span>
      </button>

      {open && (
        <div style={{ paddingBottom: 10 }}>
          {meals.map((meal, i) => (
            <div key={i} style={{ marginBottom: 8, paddingLeft: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {meal.meal_name || 'Meal'}
                </span>
                {meal.calories && (
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{meal.calories} kcal</span>
                )}
              </div>
              {meal.protein_g || meal.carbs_g || meal.fat_g ? (
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                  P:{meal.protein_g || 0}g · C:{meal.carbs_g || 0}g · F:{meal.fat_g || 0}g
                </p>
              ) : null}
              {detailLevel === 'full' && (meal.foods || []).length > 0 && (
                <div style={{ marginTop: 4, paddingLeft: 8 }}>
                  {meal.foods.map((f, fi) => (
                    <p key={fi} style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0' }}>
                      {f.food_name || 'Food'}{f.quantity_g ? ` — ${f.quantity_g}g` : ''}
                      {f.calories ? ` · ${f.calories} kcal` : ''}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StepReview({ data, onBack, onSave, saving, editingId }) {
  const badge = LEVEL_BADGE[data.detail_level] || LEVEL_BADGE.macros;
  const daysWithContent = data.days.filter(d => (d.meals || []).length > 0 || d.notes);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: 'var(--text-primary)' }}>
        Review & Save
      </h2>

      {/* Summary card */}
      <div style={{
        background: 'var(--bg-card)', border: '0.5px solid var(--border)',
        borderRadius: 16, padding: 16, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)', flex: 1, paddingRight: 8 }}>
            {data.name || 'Untitled Template'}
          </p>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: badge.bg, color: badge.color, flexShrink: 0,
          }}>
            {badge.label}
          </span>
        </div>

        {data.description ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px' }}>{data.description}</p>
        ) : null}

        <div style={{ display: 'flex', gap: 6 }}>
          <StatChip label="Calories" value={data.calories_target ? `${data.calories_target} kcal` : null} />
          <StatChip label="Protein"  value={data.protein_g ? `${data.protein_g}g` : null} />
          <StatChip label="Carbs"    value={data.carbs_g ? `${data.carbs_g}g` : null} />
          <StatChip label="Fat"      value={data.fat_g ? `${data.fat_g}g` : null} />
        </div>
      </div>

      {/* Day accordion */}
      {data.detail_level !== 'macros' && daysWithContent.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', border: '0.5px solid var(--border)',
          borderRadius: 16, padding: '4px 16px', marginBottom: 16,
        }}>
          {data.days.map((day, idx) => (
            <DayAccordion
              key={idx}
              day={day}
              dayLabel={`${DAY_LABELS[idx]} — Day ${idx + 1}`}
              detailLevel={data.detail_level}
            />
          ))}
        </div>
      )}

      {/* Nav */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          onClick={onBack}
          style={{
            padding: '13px 20px', borderRadius: 12,
            border: 'none', background: 'none',
            color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            flex: 1, padding: '13px',
            background: saving ? 'var(--bg-elevated)' : 'var(--text-primary)',
            color: saving ? 'var(--text-disabled)' : 'var(--bg-primary)',
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {saving ? (
            <>
              <span style={{
                width: 14, height: 14, border: '2px solid currentColor',
                borderTopColor: 'transparent', borderRadius: '50%',
                display: 'inline-block', animation: 'spin 0.7s linear infinite',
              }} />
              Saving…
            </>
          ) : (
            editingId ? 'Save Changes' : 'Create Template'
          )}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
