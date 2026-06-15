import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { calculateMacros } from '../utils/macroCalculator'

const DIET_GOALS = [
  { value: 'extreme_cut',  label: 'Extreme Cut' },
  { value: 'cut',          label: 'Cut' },
  { value: 'maintenance',  label: 'Maintenance' },
  { value: 'bulk',         label: 'Bulk' },
  { value: 'extreme_bulk', label: 'Extreme Bulk' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary',   label: 'Sedentary',   sub: 'Desk job, little/no exercise' },
  { value: 'light',       label: 'Light',       sub: 'Exercise 1–3 days/week' },
  { value: 'moderate',    label: 'Moderate',    sub: 'Exercise 3–5 days/week' },
  { value: 'active',      label: 'Active',      sub: 'Exercise 6–7 days/week' },
  { value: 'very_active', label: 'Very Active', sub: 'Athlete or physical job' },
]

const GOAL_LABELS = {
  extreme_cut:  'Extreme Cut',
  cut:          'Cut',
  maintenance:  'Maintenance',
  bulk:         'Bulk',
  extreme_bulk: 'Extreme Bulk',
}

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '7px 14px',
              borderRadius: 20,
              border: active ? '1.5px solid #111' : '1.5px solid #E5E5E3',
              background: active ? '#111' : 'white',
              color: active ? 'white' : '#555',
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function SectionHeader({ emoji, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
      <span style={{ fontSize: 15 }}>{emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#111', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {title}
      </span>
    </div>
  )
}

function StatInput({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 10, borderBottom: '1px solid #F1EFE8' }}>
      <span style={{ fontSize: 14, color: '#111' }}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: 80,
          textAlign: 'right',
          border: '1.5px solid #E5E5E3',
          borderRadius: 8,
          padding: '5px 10px',
          fontSize: 14,
          fontWeight: 600,
          color: '#111',
          background: '#FAFAF9',
          outline: 'none',
        }}
      />
    </div>
  )
}

export default function DietSettingsSheet({ onClose, onSave, userId }) {
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const [dietGoal,       setDietGoal]       = useState('maintenance')
  const [activityLevel,  setActivityLevel]  = useState('moderate')
  const [weight,         setWeight]         = useState('')
  const [height,         setHeight]         = useState('')
  const [age,            setAge]            = useState('')
  const [gender,         setGender]         = useState('male')
  const [macroMode,      setMacroMode]      = useState('auto')
  const [waterGoal,      setWaterGoal]      = useState(2500)
  const [customCalories, setCustomCalories] = useState('')
  const [customProtein,  setCustomProtein]  = useState('')
  const [customCarbs,    setCustomCarbs]    = useState('')
  const [customFat,      setCustomFat]      = useState('')

  useEffect(() => {
    if (!userId) return
    Promise.all([
      supabase.from('users').select('current_weight,height,age,gender').eq('id', userId).single(),
      supabase.from('user_macros').select('calories,protein_g,carbs_g,fat_g,diet_goal,activity_level,macro_mode,water_goal_ml').eq('user_id', userId).maybeSingle(),
    ]).then(([{ data: u }, { data: m }]) => {
      if (u) {
        setWeight(u.current_weight != null ? String(u.current_weight) : '')
        setHeight(u.height         != null ? String(u.height)         : '')
        setAge(u.age          != null ? String(u.age)       : '')
        setGender(u.gender || 'male')
      }
      if (m) {
        setDietGoal(m.diet_goal       || 'maintenance')
        setActivityLevel(m.activity_level || 'moderate')
        setWaterGoal(m.water_goal_ml  || 2500)
        setMacroMode(m.macro_mode     || 'auto')
        if (m.calories)  setCustomCalories(String(m.calories))
        if (m.protein_g) setCustomProtein(String(m.protein_g))
        if (m.carbs_g)   setCustomCarbs(String(m.carbs_g))
        if (m.fat_g)     setCustomFat(String(m.fat_g))
      }
      setLoading(false)
    })
  }, [userId])

  const calculated = useMemo(() => {
    const w = parseFloat(weight)
    const h = parseFloat(height)
    const a = parseInt(age, 10)
    if (!w || !h || !a) return null
    return calculateMacros({ weight: w, height: h, age: a, gender, activityLevel, dietGoal })
  }, [weight, height, age, gender, activityLevel, dietGoal])

  // Sync custom fields when auto recalculates and we're in auto mode
  useEffect(() => {
    if (macroMode === 'auto' && calculated) {
      setCustomCalories(String(calculated.calories))
      setCustomProtein(String(calculated.protein))
      setCustomCarbs(String(calculated.carbs))
      setCustomFat(String(calculated.fat))
    }
  }, [calculated, macroMode])

  const customCalMath =
    (parseInt(customProtein) || 0) * 4 +
    (parseInt(customCarbs)   || 0) * 4 +
    (parseInt(customFat)     || 0) * 9

  async function handleSave() {
    setSaving(true)
    let calGoal, protGoal, carbGoal, fatGoal
    if (macroMode === 'auto' && calculated) {
      calGoal  = calculated.calories
      protGoal = calculated.protein
      carbGoal = calculated.carbs
      fatGoal  = calculated.fat
    } else {
      calGoal  = parseInt(customCalories) || calculated?.calories || null
      protGoal = parseInt(customProtein)  || calculated?.protein  || null
      carbGoal = parseInt(customCarbs)    || calculated?.carbs    || null
      fatGoal  = parseInt(customFat)      || calculated?.fat      || null
    }

    await Promise.all([
      // Profile stats stay in users table
      supabase.from('users').update({
        current_weight: parseFloat(weight) || null,
        height:         parseFloat(height) || null,
        age:       parseInt(age, 10)  || null,
        gender,
      }).eq('id', userId),
      // All macro/goal settings go into user_macros (single source of truth)
      supabase.from('user_macros').upsert({
        user_id:        userId,
        calories:       calGoal,
        protein_g:      protGoal,
        carbs_g:        carbGoal,
        fat_g:          fatGoal,
        water_goal_ml:  waterGoal,
        diet_goal:      dietGoal,
        activity_level: activityLevel,
        macro_mode:     macroMode,
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'user_id' }),
    ])

    setSaving(false)
    onSave({ calories: calGoal, protein_g: protGoal, carbs_g: carbGoal, fat_g: fatGoal, water_goal_ml: waterGoal })
  }

  const activitySub = ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.sub

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: '95vh',
        background: '#F7F7F5',
        borderRadius: '20px 20px 0 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #F1EFE8',
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Diet Settings</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#999" />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 120px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <span style={{ fontSize: 13, color: '#999' }}>Loading…</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Section 1: Diet Goal */}
              <div style={{ background: 'white', borderRadius: 16, padding: 16 }}>
                <SectionHeader emoji="🎯" title="Diet Goal" />
                <PillGroup options={DIET_GOALS} value={dietGoal} onChange={setDietGoal} />
              </div>

              {/* Section 2: Activity Level */}
              <div style={{ background: 'white', borderRadius: 16, padding: 16 }}>
                <SectionHeader emoji="⚡" title="Activity Level" />
                <PillGroup options={ACTIVITY_LEVELS} value={activityLevel} onChange={setActivityLevel} />
                {activitySub && (
                  <p style={{ fontSize: 12, color: '#999', marginTop: 10, marginLeft: 2 }}>{activitySub}</p>
                )}
              </div>

              {/* Section 3: Your Stats */}
              <div style={{ background: 'white', borderRadius: 16, padding: 16 }}>
                <SectionHeader emoji="📊" title="Your Stats" />
                <StatInput label="Weight" value={weight} onChange={setWeight} placeholder="72" />
                <StatInput label="Height (cm)" value={height} onChange={setHeight} placeholder="175" />
                <StatInput label="Age" value={age} onChange={setAge} placeholder="25" />
                {/* Gender */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 }}>
                  <span style={{ fontSize: 14, color: '#111' }}>Gender</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['male', 'female'].map(g => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        style={{
                          padding: '5px 16px',
                          borderRadius: 20,
                          border: gender === g ? '1.5px solid #111' : '1.5px solid #E5E5E3',
                          background: gender === g ? '#111' : 'white',
                          color: gender === g ? 'white' : '#555',
                          fontSize: 13,
                          fontWeight: gender === g ? 600 : 500,
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 4: Calculated Macros */}
              {calculated ? (
                <div style={{ background: 'white', borderRadius: 16, padding: 16 }}>
                  <SectionHeader emoji="✨" title="Recommended for you" />
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 14 }}>
                    {calculated.calories.toLocaleString()}
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#999', marginLeft: 6 }}>kcal/day</span>
                  </div>
                  {[
                    { label: 'Protein', g: calculated.protein, color: '#185FA5', calPct: (calculated.protein * 4) / calculated.calories },
                    { label: 'Carbs',   g: calculated.carbs,   color: '#854F0B', calPct: (calculated.carbs * 4)   / calculated.calories },
                    { label: 'Fat',     g: calculated.fat,     color: '#993C1D', calPct: (calculated.fat * 9)     / calculated.calories },
                  ].map(m => (
                    <div key={m.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: '#555' }}>{m.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{m.g}g</span>
                      </div>
                      <div style={{ height: 5, background: '#F1EFE8', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(m.calPct * 100)}%`, background: m.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize: 11, color: '#BBB', marginTop: 10 }}>
                    Based on {GOAL_LABELS[dietGoal]} + {ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.label} activity
                  </p>
                </div>
              ) : (
                <div style={{ background: 'white', borderRadius: 16, padding: 16 }}>
                  <SectionHeader emoji="✨" title="Recommended for you" />
                  <p style={{ fontSize: 13, color: '#999' }}>Fill in your stats above to see your personalised targets.</p>
                </div>
              )}

              {/* Section 5: Override */}
              <div style={{ background: 'white', borderRadius: 16, padding: 16 }}>
                <SectionHeader emoji="⚙️" title="Override" />
                {/* Auto / Custom toggle */}
                <div style={{ display: 'flex', background: '#F1EFE8', borderRadius: 12, padding: 3, marginBottom: 16 }}>
                  {['auto', 'custom'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMacroMode(m)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 10,
                        border: 'none',
                        background: macroMode === m ? 'white' : 'transparent',
                        color: macroMode === m ? '#111' : '#999',
                        fontSize: 13,
                        fontWeight: macroMode === m ? 600 : 500,
                        cursor: 'pointer',
                        boxShadow: macroMode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                        textTransform: 'capitalize',
                        transition: 'all 0.15s',
                      }}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>

                {macroMode === 'custom' && (
                  <div>
                    {[
                      { label: 'Calories',    value: customCalories, set: setCustomCalories, unit: 'kcal' },
                      { label: 'Protein',     value: customProtein,  set: setCustomProtein,  unit: 'g'    },
                      { label: 'Carbs',       value: customCarbs,    set: setCustomCarbs,    unit: 'g'    },
                      { label: 'Fat',         value: customFat,      set: setCustomFat,      unit: 'g'    },
                    ].map(({ label, value, set, unit }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 10, borderBottom: '1px solid #F1EFE8' }}>
                        <span style={{ fontSize: 14, color: '#111' }}>{label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number"
                            value={value}
                            onChange={e => set(e.target.value)}
                            style={{
                              width: 70,
                              textAlign: 'right',
                              border: '1.5px solid #E5E5E3',
                              borderRadius: 8,
                              padding: '5px 8px',
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#111',
                              background: '#FAFAF9',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontSize: 12, color: '#999', width: 28 }}>{unit}</span>
                        </div>
                      </div>
                    ))}
                    {(customProtein || customCarbs || customFat) && (
                      <p style={{ fontSize: 11, color: '#999', marginTop: 10 }}>
                        P×4 + C×4 + F×9 = <span style={{ fontWeight: 600, color: customCalMath === parseInt(customCalories) ? '#3B6D11' : '#111' }}>{customCalMath} kcal</span>
                      </p>
                    )}
                  </div>
                )}

                {macroMode === 'auto' && (
                  <p style={{ fontSize: 12, color: '#999' }}>
                    Macros are calculated automatically from your goal, activity level, and stats.
                  </p>
                )}
              </div>

              {/* Section 6: Water Goal */}
              <div style={{ background: 'white', borderRadius: 16, padding: 16 }}>
                <SectionHeader emoji="💧" title="Daily Water Goal" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setWaterGoal(g => Math.max(500, g - 250))}
                    style={{
                      width: 40, height: 40, borderRadius: 20,
                      border: '1.5px solid #E5E5E3', background: 'white',
                      fontSize: 20, color: '#111', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >−</button>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#111', tabularNums: true }}>
                      {waterGoal.toLocaleString()} ml
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>({(waterGoal / 1000).toFixed(2)} L)</div>
                  </div>
                  <button
                    onClick={() => setWaterGoal(g => g + 250)}
                    style={{
                      width: 40, height: 40, borderRadius: 20,
                      border: '1.5px solid #E5E5E3', background: 'white',
                      fontSize: 20, color: '#111', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >+</button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Sticky Save button */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          padding: '16px 20px',
          background: 'linear-gradient(to top, #F7F7F5 70%, transparent)',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: 14,
              background: saving ? '#555' : '#111',
              color: 'white',
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: saving ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
