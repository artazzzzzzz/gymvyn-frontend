import { useEffect, useRef, useState } from 'react'
import {
  X, Search, Mic, Camera, Pencil, BookOpen,
  ChevronLeft, Check, Trash2, RefreshCw, Plus, Scan,
} from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'
import PrimaryButton from './PrimaryButton'
import { supabase } from '../utils/supabase'
import {
  apiFetch,
  logFood, deleteFoodLog,
  searchFood, logFoodByVoice, logFoodByCamera,
  createCustomMeal, getCustomMeals, deleteCustomMeal,
} from '../utils/api'
import { useXPToast } from './XPToast'

const MEALS = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch',     label: 'Lunch'     },
  { type: 'snack',     label: 'Snack'     },
  { type: 'dinner',    label: 'Dinner'    },
]

function toYMD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const MANUAL_UNITS = ['g','kg','ml','l','piece','cup','katori','plate','bowl','scoop','slice','tbsp','tsp']

const WEIGHT_UNIT_SET = new Set(['g','gram','kg','ml','l','oz','lb'])
const WEIGHT_UNITS = [
  { unit: 'g',  grams_per_unit: 1       },
  { unit: 'kg', grams_per_unit: 1000    },
  { unit: 'oz', grams_per_unit: 28.35   },
  { unit: 'lb', grams_per_unit: 453.592 },
]

function getValidUnits(food) {
  if (WEIGHT_UNIT_SET.has((food.serving_unit || '').toLowerCase())) return WEIGHT_UNITS
  return [{ unit: food.serving_unit || 'serving', grams_per_unit: null }]
}

function computeMacros(picked, servingAmtStr, numServStr, unitDef) {
  const isWeight = unitDef?.grams_per_unit != null
  const servSize = Number(picked.serving_size) || 100
  if (isWeight) {
    const per1g = {
      cal:  (Number(picked.calories_per_serving) || 0) / servSize,
      prot: (Number(picked.protein_g)             || 0) / servSize,
      carb: (Number(picked.carbs_g)               || 0) / servSize,
      fat:  (Number(picked.fat_g)                 || 0) / servSize,
    }
    const totalG = Math.max(0.01, parseFloat(servingAmtStr) || 0)
                 * unitDef.grams_per_unit
                 * Math.max(0.01, parseFloat(numServStr) || 1)
    return { cal: per1g.cal * totalG, prot: per1g.prot * totalG, carb: per1g.carb * totalG, fat: per1g.fat * totalG }
  }
  const factor = Math.max(0.01, parseFloat(servingAmtStr) || 1) * Math.max(0.01, parseFloat(numServStr) || 1)
  return {
    cal:  (Number(picked.calories_per_serving) || 0) * factor,
    prot: (Number(picked.protein_g)             || 0) * factor,
    carb: (Number(picked.carbs_g)               || 0) * factor,
    fat:  (Number(picked.fat_g)                 || 0) * factor,
  }
}

// ─── MacroDonut ───────────────────────────────────────────────────────────────
function MacroDonut({ calories, carbG, fatG, protG }) {
  const SIZE = 124, STROKE = 16
  const R = (SIZE - STROKE) / 2
  const C = 2 * Math.PI * R
  const carbCal = carbG * 4, fatCal = fatG * 9, protCal = protG * 4
  const total = carbCal + fatCal + protCal
  const carbLen = total > 0 ? (carbCal / total) * C : 0
  const fatLen  = total > 0 ? (fatCal  / total) * C : 0
  const protLen = total > 0 ? (protCal / total) * C : 0
  const cx = SIZE / 2, cy = SIZE / 2
  const carbPct = total > 0 ? Math.round(carbCal / total * 100) : 0
  const fatPct  = total > 0 ? Math.round(fatCal  / total * 100) : 0
  const protPct = total > 0 ? 100 - carbPct - fatPct : 0
  const Seg = ({ len, offset, color }) => len < 0.5 ? null : (
    <circle cx={cx} cy={cy} r={R} stroke={color} strokeWidth={STROKE} fill="none"
      strokeDasharray={`${len} ${C - len}`} strokeDashoffset={C - offset} strokeLinecap="butt" />
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={R} stroke="var(--text-primary)" strokeWidth={STROKE} fill="none" />
          {total > 0 ? (
            <>
              <Seg len={carbLen} offset={0} color="#2dd4bf" />
              <Seg len={fatLen}  offset={carbLen} color="#a78bfa" />
              <Seg len={protLen} offset={carbLen + fatLen} color="#fbbf24" />
            </>
          ) : (
            <circle cx={cx} cy={cy} r={R} stroke="var(--text-secondary)" strokeWidth={STROKE} fill="none" />
          )}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--bg-card)', fontWeight: 700, fontSize: 22 }}>{Math.round(calories)}</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>cal</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        {[
          { label: 'Carbs',   g: carbG, pct: carbPct, color: '#2dd4bf' },
          { label: 'Fat',     g: fatG,  pct: fatPct,  color: '#a78bfa' },
          { label: 'Protein', g: protG, pct: protPct, color: '#fbbf24' },
        ].map(({ label, g, pct, color }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ color, fontWeight: 700, fontSize: 15 }}>{pct}%</span>
            <span style={{ color: 'var(--bg-card)', fontWeight: 600, fontSize: 13 }}>{g.toFixed(1)}g</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SearchTab ────────────────────────────────────────────────────────────────
function SearchTab({ userId, mealType, onLogged, logDate }) {
  const { showXPToast } = useXPToast()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState(null)
  const [logging, setLogging] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [servingAmtStr, setServingAmtStr] = useState('1')
  const [numServStr, setNumServStr] = useState('1')
  const [detailMeal, setDetailMeal] = useState(mealType)
  const [recentFoods, setRecentFoods] = useState([])
  const [addedIds, setAddedIds] = useState(new Set())
  const [validUnits, setValidUnits] = useState([])
  const [selectedUnit, setSelectedUnit] = useState('')

  useEffect(() => {
    if (!userId) return
    const since = toYMD(new Date(Date.now() - 7 * 86400000))
    supabase.from('food_logs').select('food_name, calories')
      .eq('user_id', userId).gte('log_date', since)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => {
        if (!data) return
        const seen = new Set(); const unique = []
        for (const row of data) {
          if (!seen.has(row.food_name)) {
            seen.add(row.food_name); unique.push(row)
            if (unique.length >= 8) break
          }
        }
        setRecentFoods(unique)
      })
  }, [userId])

  function handlePickFood(food) {
    const vunits = getValidUnits(food)
    setValidUnits(vunits)
    setSelectedUnit(vunits[0]?.unit || '')
    const isWeight = vunits[0]?.grams_per_unit != null
    setServingAmtStr(isWeight ? String(Number(food.serving_size) || 100) : '1')
    setPicked(food)
  }

  const handleBarcodeResult = async (barcode) => {
    setShowScanner(false); setLoading(true)
    try {
      const result = await apiFetch(`/api/food-barcode/${barcode}`)
      if (result) handlePickFood(result)
      else alert('Product not found. Try searching by name.')
    } catch { alert('Barcode not found in database') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    let cancelled = false; setLoading(true)
    const t = setTimeout(async () => {
      try {
        const data = await searchFood(q.trim())
        if (!cancelled) setResults(Array.isArray(data) ? data : [])
      } catch { if (!cancelled) setResults([]) }
      finally { if (!cancelled) setLoading(false) }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q])

  async function handleLog() {
    if (!picked) return; setLogging(true)
    try {
      const unitDef = validUnits.find(u => u.unit === selectedUnit) ?? validUnits[0]
      const macros = computeMacros(picked, servingAmtStr, numServStr, unitDef)
      const isWeight = unitDef?.grams_per_unit != null
      const quantityFinal = isWeight
        ? Math.max(0.01, parseFloat(servingAmtStr) || 0) * unitDef.grams_per_unit * Math.max(0.01, parseFloat(numServStr) || 1)
        : Math.max(0.01, parseFloat(servingAmtStr) || 1) * Math.max(0.01, parseFloat(numServStr) || 1)
      const logRes = await logFood({
        userId, log_date: toYMD(new Date()), mealType: detailMeal,
        foodName: picked.name, quantity: quantityFinal,
        servingUnit: isWeight ? 'g' : (selectedUnit || picked.serving_unit),
        calories: macros.cal, proteinG: macros.prot, carbsG: macros.carb, fatG: macros.fat,
        loggedVia: 'manual', foodId: picked.id,
      })
      if (logRes?.xpResult) showXPToast(logRes.xpResult)
      onLogged(picked.name, Math.round(macros.cal))
      setPicked(null); setQ(''); setServingAmtStr('1'); setNumServStr('1')
      setDetailMeal(mealType); setValidUnits([]); setSelectedUnit('')
    } catch (e) { alert(e.message || 'Failed to log food') }
    finally { setLogging(false) }
  }

  async function quickAdd(r) {
    const id = r.id || r.name
    try {
      await logFood({
        userId, log_date: toYMD(new Date()), mealType,
        foodName: r.name, quantity: 1, servingUnit: r.serving_unit,
        calories: Number(r.calories_per_serving) || Number(r.calories) || 0,
        proteinG: Number(r.protein_g) || 0,
        carbsG:   Number(r.carbs_g)   || 0,
        fatG:     Number(r.fat_g)     || 0,
        loggedVia: 'manual', foodId: r.id,
      })
      onLogged(r.name, Math.round(Number(r.calories_per_serving) || Number(r.calories) || 0))
      setAddedIds(prev => new Set([...prev, id]))
      setTimeout(() => setAddedIds(prev => { const n = new Set(prev); n.delete(id); return n }), 1500)
    } catch (e) { alert(e.message || 'Failed to log food') }
  }

  if (picked) {
    const unitDef = validUnits.find(u => u.unit === selectedUnit) ?? validUnits[0]
    const isWeightBased = unitDef?.grams_per_unit != null
    const macros = computeMacros(picked, servingAmtStr, numServStr, unitDef)

    function handleUnitChange(newUnit) {
      const newDef = validUnits.find(u => u.unit === newUnit)
      const oldDef = validUnits.find(u => u.unit === selectedUnit)
      if (newDef?.grams_per_unit && oldDef?.grams_per_unit) {
        const cur = parseFloat(servingAmtStr) || 0
        const converted = cur * oldDef.grams_per_unit / newDef.grams_per_unit
        setServingAmtStr(String(+converted.toFixed(3)))
      }
      setSelectedUnit(newUnit)
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
        <button onClick={() => { setPicked(null); setServingAmtStr('1'); setNumServStr('1'); setValidUnits([]); setSelectedUnit('') }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ChevronLeft size={15} /> Back to results
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{picked.name}</h2>
            {picked.is_combo && (
              <span style={{ fontSize: 10, padding: '2px 8px', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success)', borderRadius: 999, marginTop: 4, display: 'inline-block', fontWeight: 600, textTransform: 'uppercase' }}>Combo</span>
            )}
          </div>
          <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={13} color="var(--success)" strokeWidth={3} />
          </div>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Serving Size</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="number" min="0.01" step="0.5" value={servingAmtStr}
                onChange={e => setServingAmtStr(e.target.value)}
                onBlur={e => { const n = parseFloat(e.target.value); setServingAmtStr(isNaN(n)||n<=0?'1':String(n)) }}
                style={{ width: 70, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', fontSize: 14, fontWeight: 600, outline: 'none' }} />
              {isWeightBased ? (
                <select value={selectedUnit} onChange={e => handleUnitChange(e.target.value)}
                  style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 13, outline: 'none', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  {validUnits.map(u => <option key={u.unit} value={u.unit}>{u.unit}</option>)}
                </select>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedUnit || picked.serving_unit || 'serving'}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Number of Servings</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setNumServStr(s => String(Math.max(0.5, +(parseFloat(s)-0.5).toFixed(1))))}
                style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <input type="number" min="0.5" step="0.5" value={numServStr}
                onChange={e => setNumServStr(e.target.value)}
                onBlur={e => { const n = parseFloat(e.target.value); setNumServStr(isNaN(n)||n<=0?'1':String(+n.toFixed(2))) }}
                style={{ width: 56, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', fontSize: 14, fontWeight: 600, outline: 'none' }} />
              <button onClick={() => setNumServStr(s => String(+(parseFloat(s)+0.5).toFixed(1)))}
                style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
            <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Meal</span>
            <select value={detailMeal} onChange={e => setDetailMeal(e.target.value)}
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '4px 12px', fontSize: 13, outline: 'none' }}>
              {MEALS.map(m => <option key={m.type} value={m.type}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--text-primary)', borderRadius: 12, padding: 16 }}>
          <MacroDonut calories={macros.cal} carbG={macros.carb} fatG={macros.fat} protG={macros.prot} />
        </div>
        <PrimaryButton onClick={handleLog} disabled={logging} style={{ height: 'auto', padding: '14px 0', fontWeight: 700 }}>
          {logging ? 'Logging…' : 'Log Food'}
        </PrimaryButton>
      </div>
    )
  }

  return (
    <div>
      {/* Search row */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-primary)', borderRadius: 12, height: 46, paddingLeft: 14, paddingRight: 14 }}>
          <Search size={16} color="var(--text-tertiary)" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search dal, roti, paneer..."
            style={{ flex: 1, backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)' }} />
          {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}><X size={14} /></button>}
        </div>
        <button onClick={() => setShowScanner(true)}
          style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)', height: 46, paddingLeft: 16, paddingRight: 16, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
          <Scan size={16} /> Scan
        </button>
      </div>

      {/* Recents strip */}
      {!q && recentFoods.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.08em', paddingTop: 12, paddingBottom: 8 }}>RECENT</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {recentFoods.map((r, i) => (
              <button key={i}
                onClick={() => quickAdd({ name: r.food_name, calories_per_serving: r.calories })}
                style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 10, paddingLeft: 14, paddingRight: 14, paddingTop: 8, paddingBottom: 8, border: 'none', cursor: 'pointer', textAlign: 'left', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{r.food_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{Math.round(r.calories || 0)} kcal</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!q && recentFoods.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 48, color: 'var(--text-tertiary)', fontSize: 14 }}>
          Search for dal, roti, paneer, biryani…
        </div>
      )}

      {loading && (
        <div style={{ paddingTop: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 64, borderRadius: 12, backgroundColor: 'var(--bg-primary)', marginBottom: 8 }} />
          ))}
        </div>
      )}

      {!loading && q && results.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 48, color: 'var(--text-tertiary)', fontSize: 14 }}>No results for "{q}"</div>
      )}

      {q && results.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.08em', paddingTop: 12, paddingBottom: 8 }}>RESULTS</div>
          {results.map(r => {
            const id = r.id || r.off_id || r.name
            const added = addedIds.has(id)
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {(r.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => handlePickFood(r)}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    P {Math.round(r.protein_g||0)}g · C {Math.round(r.carbs_g||0)}g · F {Math.round(r.fat_g||0)}g
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{Math.round(r.calories_per_serving||0)}</span>
                  <button onClick={() => quickAdd(r)}
                    style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: added ? 'var(--success)' : 'var(--text-primary)', color: 'var(--bg-card)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, transition: 'background-color 0.2s' }}>
                    {added ? <Check size={14} /> : '+'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showScanner && <BarcodeScanner onDetected={handleBarcodeResult} onClose={() => setShowScanner(false)} />}
    </div>
  )
}

// ─── ManualTab ────────────────────────────────────────────────────────────────
const FIELD_BASE = {
  width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box',
}

function ManualTab({ userId, mealType, logDate, onLogged }) {
  const EMPTY = { name: '', serving: '', unit: 'g', calories: '', protein: '', carbs: '', fat: '' }
  const [form, setForm] = useState(EMPTY)
  const [logging, setLogging] = useState(false)
  const [error, setError] = useState('')
  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleLog() {
    if (!form.name.trim()) { setError('Food name is required'); return }
    const serving = parseFloat(form.serving)
    if (!form.serving || isNaN(serving) || serving <= 0) { setError('Enter a valid serving size'); return }
    const cal = parseFloat(form.calories)
    if (!form.calories || isNaN(cal) || cal < 0) { setError('Enter valid calories'); return }
    setError(''); setLogging(true)
    try {
      await logFood({
        userId, log_date: logDate, mealType,
        foodName: form.name.trim(), quantity: serving, servingUnit: form.unit,
        calories: cal, proteinG: parseFloat(form.protein)||0,
        carbsG: parseFloat(form.carbs)||0, fatG: parseFloat(form.fat)||0, loggedVia: 'manual',
      })
      onLogged(form.name.trim(), Math.round(cal))
      setForm(EMPTY)
    } catch (e) { setError(e.message || 'Failed to log food') }
    finally { setLogging(false) }
  }

  const isReady = form.name.trim() && form.serving && form.calories
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
          Food Name <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g., Chicken Breast" autoComplete="off" style={FIELD_BASE} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
          Serving Size <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" min="0.1" step="0.1" value={form.serving} onChange={e => set('serving', e.target.value)}
            placeholder="150" style={{ ...FIELD_BASE, flex: 1 }} />
          <select value={form.unit} onChange={e => set('unit', e.target.value)}
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none' }}>
            {MANUAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
          Calories (kcal) <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <input type="number" min="0" step="0.1" value={form.calories} onChange={e => set('calories', e.target.value)}
          placeholder="165" style={FIELD_BASE} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
          Macros <span style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { key: 'protein', label: 'Protein (g)', placeholder: '31' },
            { key: 'carbs',   label: 'Carbs (g)',   placeholder: '0' },
            { key: 'fat',     label: 'Fat (g)',      placeholder: '3.6' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4, textAlign: 'center' }}>{label}</div>
              <input type="number" min="0" step="0.1" value={form[key]} onChange={e => set(key, e.target.value)}
                placeholder={placeholder} style={{ ...FIELD_BASE, textAlign: 'center', padding: '8px 4px' }} />
            </div>
          ))}
        </div>
      </div>
      {error && <div style={{ fontSize: 13, color: 'var(--error)', backgroundColor: 'var(--accent-bg)', borderRadius: 10, padding: '10px 14px' }}>{error}</div>}
      <PrimaryButton onClick={handleLog} disabled={logging || !isReady} style={{ height: 'auto', padding: '14px 0', fontWeight: 700 }}>
        {logging ? 'Logging…' : 'Log Food'}
      </PrimaryButton>
    </div>
  )
}

// ─── MealBuilder ──────────────────────────────────────────────────────────────
function MealBuilder({ userId, onSaved, onCancel }) {
  const [name, setName] = useState('')
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    let cancelled = false; setSearching(true)
    const t = setTimeout(async () => {
      try {
        const data = await searchFood(q.trim())
        if (!cancelled) setResults(Array.isArray(data) ? data : [])
      } catch { if (!cancelled) setResults([]) }
      finally { if (!cancelled) setSearching(false) }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q])

  function addFood(r) {
    setItems(prev => [...prev, { food_name: r.name, quantity: 1, serving_unit: r.serving_unit||'serving', calories: Number(r.calories_per_serving)||0, protein_g: Number(r.protein_g)||0, carbs_g: Number(r.carbs_g)||0, fat_g: Number(r.fat_g)||0 }])
    setQ(''); setResults([])
  }

  const totals = items.reduce((a,it) => ({ cal: a.cal+it.calories, prot: a.prot+it.protein_g, carb: a.carb+it.carbs_g, fat: a.fat+it.fat_g }), { cal:0, prot:0, carb:0, fat:0 })

  async function handleSave() {
    if (!name.trim()) { setError('Give your meal a name'); return }
    if (items.length === 0) { setError('Add at least one food'); return }
    setError(''); setSaving(true)
    try { await createCustomMeal({ userId, name: name.trim(), items }); onSaved() }
    catch (e) { setError(e.message || 'Failed to save meal') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
      <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <ChevronLeft size={15} /> Back to My Meals
      </button>
      <div>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase', fontWeight: 500 }}>Meal Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g., My Breakfast Combo" autoComplete="off" style={FIELD_BASE} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase', fontWeight: 500 }}>Add Foods</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-primary)', borderRadius: 10, padding: '10px 12px' }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search and tap to add…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)' }} />
          {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}><X size={13} /></button>}
        </div>
        {searching && <div style={{ height: 2, backgroundColor: 'var(--text-cta)', borderRadius: 1, marginTop: 4 }} />}
        {results.length > 0 && (
          <div style={{ marginTop: 8, maxHeight: 192, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {results.map(r => (
              <button key={r.id} onClick={() => addFood(r)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)', borderRadius: 10, padding: '10px 12px', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{r.serving_description}</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{Math.round(r.calories_per_serving)} kcal</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>Foods in this meal</div>
          {items.map((it, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-primary)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.food_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{it.quantity} {it.serving_unit} · {Math.round(it.calories)} kcal</div>
              </div>
              <button onClick={() => setItems(prev => prev.filter((_,i) => i !== idx))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, padding: '8px 12px', backgroundColor: 'var(--accent-bg)', borderRadius: 10, fontSize: 12 }}>
            <span style={{ color: 'var(--text-cta)', fontWeight: 700 }}>{Math.round(totals.cal)} kcal</span>
            <span style={{ color: '#5B8FF9' }}>P {totals.prot.toFixed(1)}g</span>
            <span style={{ color: '#F6C244' }}>C {totals.carb.toFixed(1)}g</span>
            <span style={{ color: 'var(--error)' }}>F {totals.fat.toFixed(1)}g</span>
          </div>
        </div>
      )}
      {error && <div style={{ fontSize: 13, color: 'var(--error)', backgroundColor: 'var(--accent-bg)', borderRadius: 10, padding: '10px 14px' }}>{error}</div>}
      <PrimaryButton onClick={handleSave} disabled={saving || !name.trim() || items.length === 0} style={{ height: 'auto', padding: '14px 0', fontWeight: 700 }}>
        {saving ? 'Saving…' : 'Save Meal'}
      </PrimaryButton>
    </div>
  )
}

// ─── MyMealsTab ───────────────────────────────────────────────────────────────
function MyMealsTab({ userId, mealType, logDate, onLogged }) {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)
  const [loggingId, setLoggingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  async function loadMeals() {
    setLoading(true)
    try { const data = await getCustomMeals(userId); setMeals(Array.isArray(data) ? data : []) }
    catch { setMeals([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (userId) loadMeals() }, [userId])

  async function handleLog(meal) {
    setLoggingId(meal.id)
    try {
      for (const it of (meal.items || [])) {
        await logFood({ userId, log_date: logDate, mealType, foodName: it.food_name, quantity: it.quantity||1, servingUnit: it.serving_unit, calories: it.calories||0, proteinG: it.protein_g||0, carbsG: it.carbs_g||0, fatG: it.fat_g||0, loggedVia: 'custom_meal' })
      }
      onLogged(meal.name, Math.round(meal.total_calories || 0))
    } catch (e) { alert(e.message || 'Failed to log meal') }
    finally { setLoggingId(null) }
  }

  async function handleDelete(meal) {
    setDeletingId(meal.id)
    try { await deleteCustomMeal(meal.id); setMeals(prev => prev.filter(m => m.id !== meal.id)) }
    catch (e) { alert(e.message || 'Failed to delete meal') }
    finally { setDeletingId(null) }
  }

  if (building) return <MealBuilder userId={userId} onSaved={() => { setBuilding(false); loadMeals() }} onCancel={() => setBuilding(false)} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
      <button onClick={() => setBuilding(true)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 16, border: '1.5px dashed var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        <Plus size={16} /> Create New Meal
      </button>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(3)].map((_, i) => <div key={i} style={{ height: 80, borderRadius: 12, backgroundColor: 'var(--bg-primary)' }} />)}
        </div>
      ) : meals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>No saved meals yet.<br /><span style={{ fontSize: 12 }}>Build a meal and save it for quick logging.</span></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meals.map(meal => (
            <div key={meal.id} style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{meal.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{(meal.items||[]).length} item{(meal.items||[]).length!==1?'s':''}</div>
                </div>
                <button onClick={() => handleDelete(meal)} disabled={deletingId === meal.id}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', opacity: deletingId===meal.id?0.4:1 }}>
                  {deletingId === meal.id ? <RefreshCw size={14} /> : <Trash2 size={14} />}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 12, marginBottom: 12 }}>
                <span style={{ color: 'var(--text-cta)', fontWeight: 700 }}>{Math.round(meal.total_calories||0)} kcal</span>
                <span style={{ color: '#5B8FF9' }}>P {Math.round(meal.total_protein_g||0)}g</span>
                <span style={{ color: '#F6C244' }}>C {Math.round(meal.total_carbs_g||0)}g</span>
                <span style={{ color: 'var(--error)' }}>F {Math.round(meal.total_fat_g||0)}g</span>
              </div>
              <PrimaryButton onClick={() => handleLog(meal)} disabled={loggingId === meal.id} style={{ height: 'auto', padding: '10px 0', fontSize: 14, fontWeight: 700, borderRadius: 12 }}>
                {loggingId === meal.id ? <><RefreshCw size={13} /> Logging…</> : <><Check size={13} /> Log Meal</>}
              </PrimaryButton>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── VoiceTab ─────────────────────────────────────────────────────────────────
function VoiceTab({ userId, mealType, onLogged, onClose }) {
  const [supported] = useState(() => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition))
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const recRef = useRef(null)

  function startListening() {
    if (!supported) return
    setError(''); setTranscript('')
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'hi-IN'; rec.continuous = false; rec.interimResults = true
    rec.onresult = (e) => { let txt = ''; for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript; setTranscript(txt) }
    rec.onerror = (e) => { setError(e.error || 'voice error'); setListening(false) }
    rec.onend = () => setListening(false)
    recRef.current = rec; rec.start(); setListening(true)
  }

  function stopListening() { try { recRef.current?.stop() } catch { /* noop */ } setListening(false) }

  async function submit() {
    if (!transcript.trim()) return
    setSubmitting(true); setError('')
    try { const items = await logFoodByVoice({ userId, transcript: transcript.trim(), mealType }); setParsed(Array.isArray(items) ? items : []) }
    catch (e) { setError(e.message || 'Failed to parse voice input') }
    finally { setSubmitting(false) }
  }

  async function removeParsed(id) {
    try { await deleteFoodLog(id); setParsed(p => p.filter(x => x.id !== id)) }
    catch (e) { alert(e.message || 'Failed to remove item') }
  }

  if (!supported) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>
      <div style={{ fontSize: 14 }}>Voice input is not supported in this browser.</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>Try Chrome or Safari on mobile.</div>
    </div>
  )

  if (parsed) {
    const total = parsed.reduce((s, it) => s + (Number(it.calories)||0), 0)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>We heard: <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>"{transcript}"</span></div>
        {parsed.length === 0 ? <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>Nothing was parsed. Try again.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {parsed.map(it => (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-primary)', borderRadius: 12, padding: '12px 16px' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{it.food_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{Number(it.quantity)||1} {it.serving_unit||''} · {Math.round(Number(it.calories)||0)} kcal</div>
                </div>
                <button onClick={() => removeParsed(it.id)} style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--accent-bg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {parsed.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--accent-bg)', borderRadius: 12, padding: '12px 16px' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-cta)' }}>{Math.round(total)} kcal</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setParsed(null); setTranscript('') }}
            style={{ flex: 1, padding: '14px 0', borderRadius: 16, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Try Again
          </button>
          <button onClick={() => { onLogged(); onClose() }}
            style={{ flex: 1, padding: '14px 0', borderRadius: 16, backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={14} /> Log All
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24, paddingBottom: 16 }}>
      <div style={{ position: 'relative' }}>
        {listening && (
          <>
            <div style={{ position: 'absolute', inset: -16, borderRadius: '50%', backgroundColor: 'var(--accent-bg)', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
            <div style={{ position: 'absolute', inset: -28, borderRadius: '50%', backgroundColor: 'var(--accent-bg)', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '0.4s' }} />
          </>
        )}
        <button onClick={listening ? stopListening : startListening}
          style={{ position: 'relative', width: 96, height: 96, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: listening ? 'var(--text-cta)' : 'var(--bg-primary)', color: listening ? 'var(--bg-card)' : 'var(--text-primary)', transition: 'all 0.3s' }}>
          <Mic size={36} strokeWidth={listening ? 2.5 : 2} />
        </button>
      </div>
      <div style={{ marginTop: 24, fontSize: 14, textAlign: 'center', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {listening ? <span style={{ color: 'var(--text-cta)', fontWeight: 600 }}>Listening… speak in English or Hinglish</span>
          : <span>Tap to start.<br />Try: "lunch mein dal chawal aur 2 roti khaya"</span>}
      </div>
      {transcript && (
        <div style={{ marginTop: 20, width: '100%', backgroundColor: 'var(--bg-primary)', borderRadius: 12, padding: 16, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{transcript}</div>
      )}
      {error && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--error)', textAlign: 'center' }}>{error}</div>}
      {transcript && !listening && (
        <button disabled={submitting} onClick={submit}
          style={{ marginTop: 20, width: '100%', padding: '14px 0', borderRadius: 16, backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)', fontSize: 16, fontWeight: 700, border: 'none', cursor: submitting?'not-allowed':'pointer', opacity: submitting?0.5:1 }}>
          {submitting ? 'Parsing…' : 'Parse & Log'}
        </button>
      )}
    </div>
  )
}

// ─── CameraTab ────────────────────────────────────────────────────────────────
function CameraTab({ userId, mealType, onLogged, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [imageB64, setImageB64] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}) }
        setReady(true)
      } catch (e) { setError(e.message || 'Camera permission denied') }
    }
    if (!imageB64 && !parsed) start()
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }, [imageB64, parsed])

  function capture() {
    const v = videoRef.current; if (!v) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth || 720; canvas.height = v.videoHeight || 1280
    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height)
    setImageB64(canvas.toDataURL('image/jpeg', 0.82))
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  async function submit() {
    setSubmitting(true); setError('')
    try { const items = await logFoodByCamera({ userId, imageBase64: imageB64, mealType }); setParsed(Array.isArray(items) ? items : []) }
    catch (e) { setError(e.message || 'Failed to analyze photo') }
    finally { setSubmitting(false) }
  }

  async function removeParsed(id) {
    try { await deleteFoodLog(id); setParsed(p => p.filter(x => x.id !== id)) }
    catch (e) { alert(e.message || 'Failed to remove item') }
  }

  if (parsed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Detected items:</div>
        {parsed.length === 0 ? <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)' }}>No food detected. Try again.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {parsed.map(it => (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-primary)', borderRadius: 12, padding: '12px 16px' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{it.food_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{Number(it.quantity)||1} {it.serving_unit||''} · {Math.round(Number(it.calories)||0)} kcal</div>
                </div>
                <button onClick={() => removeParsed(it.id)} style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--accent-bg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setParsed(null); setImageB64(null) }}
            style={{ flex: 1, padding: '14px 0', borderRadius: 16, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Retry</button>
          <button onClick={() => { onLogged(); onClose() }}
            style={{ flex: 1, padding: '14px 0', borderRadius: 16, backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={14} /> Log All
          </button>
        </div>
      </div>
    )
  }

  if (imageB64) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <img src={imageB64} alt="captured" style={{ width: '100%', borderRadius: 16, objectFit: 'cover', maxHeight: 288, border: '1px solid var(--border)' }} />
        {error && <div style={{ fontSize: 12, color: 'var(--error)', textAlign: 'center' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setImageB64(null)} style={{ flex: 1, padding: '14px 0', borderRadius: 16, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Retake</button>
          <button onClick={submit} disabled={submitting}
            style={{ flex: 1, padding: '14px 0', borderRadius: 16, backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)', fontSize: 14, fontWeight: 700, border: 'none', cursor: submitting?'not-allowed':'pointer', opacity: submitting?0.6:1 }}>
            {submitting ? 'Analyzing…' : 'Analyze Photo'}
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <div style={{ fontSize: 14 }}>{error}</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Grant camera access or use Search instead</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ position: 'relative', aspectRatio: '3/4', backgroundColor: "var(--text-primary)", borderRadius: 16, overflow: 'hidden' }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {!ready && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: 8 }}>
            <Camera size={32} /><span style={{ fontSize: 14 }}>Starting camera…</span>
          </div>
        )}
        {ready && (
          <>
            <div style={{ position: 'absolute', top: 20, left: 20, width: 28, height: 28, borderTop: '2px solid var(--text-cta)', borderLeft: '2px solid var(--text-cta)', borderRadius: '4px 0 0 0' }} />
            <div style={{ position: 'absolute', top: 20, right: 20, width: 28, height: 28, borderTop: '2px solid var(--text-cta)', borderRight: '2px solid var(--text-cta)', borderRadius: '0 4px 0 0' }} />
            <div style={{ position: 'absolute', bottom: 20, left: 20, width: 28, height: 28, borderBottom: '2px solid var(--text-cta)', borderLeft: '2px solid var(--text-cta)', borderRadius: '0 0 0 4px' }} />
            <div style={{ position: 'absolute', bottom: 20, right: 20, width: 28, height: 28, borderBottom: '2px solid var(--text-cta)', borderRight: '2px solid var(--text-cta)', borderRadius: '0 0 4px 0' }} />
          </>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={capture} disabled={!ready}
          style={{ width: 72, height: 72, borderRadius: '50%', border: '4px solid var(--text-primary)', padding: 6, cursor: ready ? 'pointer' : 'not-allowed', opacity: ready ? 1 : 0.4, backgroundColor: 'transparent' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--text-primary)' }} />
        </button>
      </div>
    </div>
  )
}

// ─── FoodLoggerSheet (main export) ───────────────────────────────────────────
export default function FoodLoggerSheet({ open, onClose, mealType, defaultMode = 'search', userId, logDate, onLogged }) {
  const [mode, setMode] = useState(defaultMode)
  useEffect(() => { if (open) setMode(defaultMode) }, [open, defaultMode])

  if (!open) return null

  const mealLabel = MEALS.find(m => m.type === mealType)?.label || mealType

  const TABS = [
    { id: 'search',  label: 'Search', Icon: Search   },
    { id: 'voice',   label: 'Voice',  Icon: Mic      },
    { id: 'camera',  label: 'Camera', Icon: Camera   },
    { id: 'manual',  label: 'Manual', Icon: Pencil   },
    { id: 'mymeals', label: 'Saved',  Icon: BookOpen },
  ]

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40 }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px 24px 0 0',
        zIndex: 50,
        minHeight: '70vh',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUpSheet 0.3s ease',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Add to</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{mealLabel}</div>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--bg-primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Mode pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 20px 0', scrollbarWidth: 'none', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setMode(t.id)}
              style={{
                height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 999,
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                whiteSpace: 'nowrap', flexShrink: 0,
                backgroundColor: mode === t.id ? 'var(--text-primary)' : 'var(--bg-primary)',
                color: mode === t.id ? 'var(--bg-card)' : 'var(--text-secondary)',
                transition: 'background-color 0.15s, color 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 40px', WebkitOverflowScrolling: 'touch' }}>
          {mode === 'search'  && <SearchTab  userId={userId} mealType={mealType} onLogged={onLogged} logDate={logDate} />}
          {mode === 'voice'   && <VoiceTab   userId={userId} mealType={mealType} onLogged={onLogged} onClose={onClose} />}
          {mode === 'camera'  && <CameraTab  userId={userId} mealType={mealType} onLogged={onLogged} onClose={onClose} />}
          {mode === 'manual'  && <ManualTab  userId={userId} mealType={mealType} logDate={logDate || toYMD(new Date())} onLogged={onLogged} />}
          {mode === 'mymeals' && <MyMealsTab userId={userId} mealType={mealType} logDate={logDate || toYMD(new Date())} onLogged={onLogged} />}
        </div>
      </div>

      <style>{`
        @keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  )
}
