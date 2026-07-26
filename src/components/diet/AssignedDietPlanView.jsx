import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LEVEL_BADGE = {
  macros: { label: 'Macro Targets', bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
  meals:  { label: 'Planned meals', bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
  full:   { label: 'Recipe details', bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
};

const CARD = {
  background: 'var(--bg-card)',
  border: '0.5px solid var(--border)',
  borderRadius: 12,
};

function MacroChip({ label, value, color }) {
  if (!value) return null;
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: color || 'var(--text-primary)' }}>{value}</p>
      <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
    </div>
  );
}

function MealCard({ meal, expandable, defaultExpanded }) {
  const [open, setOpen] = useState(defaultExpanded ?? false);
  const hasFoods = (meal.foods || []).length > 0;

  return (
    <div style={{ ...CARD, marginBottom: 8, overflow: 'hidden' }}>
      <div
        style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: expandable && hasFoods ? 'pointer' : 'default' }}
        onClick={() => expandable && hasFoods && setOpen(o => !o)}
      >
        {expandable && hasFoods && (
          <ChevronDown size={13} color="var(--text-tertiary)"
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
        )}
        <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: 'var(--text-primary)' }}>
          {meal.meal_name || 'Meal'}
        </span>
        {meal.calories ? (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>{meal.calories} kcal</span>
        ) : null}
      </div>

      {(meal.protein_g || meal.carbs_g || meal.fat_g) && (
        <div style={{ padding: '0 14px 8px', display: 'flex', gap: 10 }}>
          {meal.protein_g ? <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>P: {meal.protein_g}g</span> : null}
          {meal.carbs_g  ? <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>C: {meal.carbs_g}g</span>  : null}
          {meal.fat_g    ? <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>F: {meal.fat_g}g</span>    : null}
        </div>
      )}

      {meal.notes && (
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 14px 8px' }}>{meal.notes}</p>
      )}

      {expandable && open && hasFoods && (
        <div style={{ borderTop: '0.5px solid var(--border)', padding: '8px 14px' }}>
          {meal.foods.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < meal.foods.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 13, flex: 1, color: 'var(--text-primary)' }}>{f.food_name || 'Food'}</span>
              {(f.serving_quantity && f.serving_unit) ? <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{f.serving_quantity} {f.serving_unit}</span> : f.quantity_g ? <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{f.quantity_g}g</span> : null}
              {f.calories   ? <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{f.calories} kcal</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssignedDietPlanView({ plan }) {
  const [activeDay, setActiveDay] = useState(0);

  if (!plan) return null;

  const badge = LEVEL_BADGE[plan.detail_level] || LEVEL_BADGE.macros;
  const assignedDate = plan.assigned_at
    ? new Date(plan.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const activeDayData = plan.days?.[activeDay];
  const activeMeals = activeDayData?.meals || [];

  /* ── macros only ── */
  if (plan.detail_level === 'macros') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: plan.trainer_name ? 2 : 14 }}>
          <span style={{ fontSize: 15, fontWeight: 600, flex: 1, color: 'var(--text-primary)' }}>{plan.name}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        </div>
        {plan.trainer_name && (
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 12px' }}>by {plan.trainer_name}</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {[
            { label: 'Calories', value: plan.calories_target, unit: 'kcal', color: 'var(--text-primary)' },
            { label: 'Protein',  value: plan.protein_g,       unit: 'g',    color: 'var(--text-primary)' },
            { label: 'Carbs',    value: plan.carbs_g,         unit: 'g',    color: 'var(--text-primary)' },
            { label: 'Fat',      value: plan.fat_g,           unit: 'g',    color: 'var(--text-primary)' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} style={{
              ...CARD, padding: '14px 12px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 26, fontWeight: 800, margin: 0, color }}>
                {value ?? '—'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {label}{value ? ` ${unit}` : ''}
              </p>
            </div>
          ))}
        </div>

        {assignedDate && (
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>Assigned {assignedDate}</p>
        )}
        {plan.notes && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 0', fontStyle: 'italic' }}>{plan.notes}</p>
        )}
      </div>
    );
  }

  /* ── meals or full ── */
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: plan.trainer_name ? 2 : 6 }}>
        <span style={{ fontSize: 15, fontWeight: 600, flex: 1, color: 'var(--text-primary)' }}>{plan.name}</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color }}>
          {badge.label}
        </span>
      </div>
      {plan.trainer_name && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 8px' }}>by {plan.trainer_name}</p>
      )}

      {/* Plan-level macro summary */}
      {(plan.calories_target || plan.protein_g || plan.carbs_g || plan.fat_g) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <MacroChip label="Cal" value={plan.calories_target} />
          <MacroChip label="P" value={plan.protein_g ? `${plan.protein_g}g` : null} />
          <MacroChip label="C" value={plan.carbs_g ? `${plan.carbs_g}g` : null} />
          <MacroChip label="F" value={plan.fat_g ? `${plan.fat_g}g` : null} />
        </div>
      )}

      {/* Day tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none', marginBottom: 4 }}>
        {DAY_LABELS.map((label, idx) => {
          const hasMeals = (plan.days?.[idx]?.meals || []).length > 0;
          const isActive = activeDay === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveDay(idx)}
              style={{
                flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                cursor: 'pointer',
                border: isActive ? '1.5px solid var(--border-strong)' : '0.5px solid var(--border)',
                background: isActive ? 'var(--bg-elevated)' : 'var(--bg-card)',
                color: isActive ? 'var(--text-primary)' : hasMeals ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                position: 'relative',
              }}
            >
              {label}
              {hasMeals && (
                <span style={{ position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderRadius: '50%', background: 'var(--text-cta)' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Day macro override */}
      {activeDayData && (activeDayData.calories_target || activeDayData.protein_g) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {activeDayData.calories_target ? (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              Today: {activeDayData.calories_target} kcal
            </span>
          ) : null}
        </div>
      )}

      {/* Meals */}
      {activeMeals.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>
          No planned meals for this day
        </p>
      ) : (
        activeMeals.map((meal, idx) => (
          <MealCard
            key={meal.id || idx}
            meal={meal}
            expandable={plan.detail_level === 'full'}
            defaultExpanded={plan.detail_level === 'full' && idx === 0}
          />
        ))
      )}

      {plan.notes && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0', fontStyle: 'italic' }}>{plan.notes}</p>
      )}
    </div>
  );
}
