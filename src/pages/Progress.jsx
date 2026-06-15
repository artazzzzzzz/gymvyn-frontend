import { useState, useEffect, useRef } from 'react'
import {
  Camera, Weight, Ruler, Trophy, Upload, Trash2, Loader2,
  X, TrendingUp, TrendingDown, Minus, Plus,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { useStreak } from '../hooks/useStreak'


const API = import.meta.env.VITE_BACKEND_URL

const TABS = [
  { id: 'photos',       label: 'Photos',       icon: Camera  },
  { id: 'weight',       label: 'Weight',       icon: Weight  },
  { id: 'measurements', label: 'Measurements', icon: Ruler   },
  { id: 'prs',          label: 'PRs',          icon: Trophy  },
]

// ── Custom Recharts tooltip ───────────────────────────────────────────────────

function WeightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm">
      <p className="text-zinc-400 text-xs mb-0.5">{label}</p>
      <p className="text-emerald-400 font-semibold">{payload[0].value} kg</p>
    </div>
  )
}

// ── Photos Tab ────────────────────────────────────────────────────────────────

function PhotosTab({ userId }) {
  const [photos, setPhotos]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox]   = useState(null)
  const [comparing, setComparing] = useState(false)   // selection mode
  const [selected, setSelected]   = useState([])      // up to 2 photo ids
  const [compareView, setCompareView] = useState(false) // comparison view
  const fileRef = useRef(null)

  useEffect(() => { fetchPhotos() }, [userId])

  async function fetchPhotos() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/progress-photos/${userId}`)
      if (!res.ok) throw new Error()
      setPhotos(await res.json())
    } catch {
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('userId', userId)
      form.append('photo', file)
      form.append('date', new Date().toISOString().slice(0, 10))
      const res = await fetch(`${API}/upload-progress-photo`, { method: 'POST', body: form })
      if (!res.ok) throw new Error()
      await fetchPhotos()
    } catch {
      // silently fail — user sees no new photo
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function formatDate(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function exitCompare() {
    setComparing(false)
    setSelected([])
    setCompareView(false)
  }

  function handlePhotoTap(p) {
    if (compareView) return
    if (!comparing) {
      setLightbox(p)
      return
    }
    setSelected(prev => {
      if (prev.includes(p.id)) return prev.filter(id => id !== p.id)
      if (prev.length >= 2) return prev
      const next = [...prev, p.id]
      if (next.length === 2) setCompareView(true)
      return next
    })
  }

  const selectedPhotos = selected.map(id => photos.find(p => p.id === id)).filter(Boolean)

  // ── Comparison view ──────────────────────────────────────────────────────────
  if (compareView && selectedPhotos.length === 2) {
    const [a, b] = selectedPhotos
    return (
      <div className="px-5 pb-8">
        <button
          onClick={exitCompare}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-2xl mb-5 transition-colors"
        >
          <X size={16} />
          Exit Compare
        </button>

        {/* Side-by-side (row on wide, col on narrow) */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch">
          {[a, b].map((photo, i) => (
            <div key={photo.id} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full rounded-2xl overflow-hidden aspect-square bg-gray-900">
                <img src={photo.photo_url} alt="compare" className="w-full h-full object-cover" />
              </div>
              <p className="text-zinc-400 text-sm font-medium">{formatDate(photo.date)}</p>
            </div>
          )).reduce((acc, el, i) => {
            if (i === 0) return [el]
            return [
              ...acc,
              // vertical divider (hidden on small, shown on sm+)
              <div key="divider" className="hidden sm:flex items-stretch">
                <div className="w-px bg-white/10 self-stretch" />
              </div>,
              // horizontal divider (shown on small only)
              <div key="divider-h" className="sm:hidden w-full h-px bg-white/10" />,
              el,
            ]
          }, [])}
        </div>
      </div>
    )
  }

  // ── Normal / selection mode ──────────────────────────────────────────────────
  return (
    <div className="px-5 pb-8">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Action bar */}
      <div className={`flex gap-3 mb-6 ${comparing ? '' : ''}`}>
        {comparing ? (
          <>
            <button
              onClick={exitCompare}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-2xl transition-colors"
            >
              <X size={16} />
              Cancel
            </button>
            <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-2xl py-3.5">
              <p className="text-zinc-400 text-sm font-medium">
                {selected.length === 0 && 'Tap 2 photos'}
                {selected.length === 1 && 'Tap 1 more'}
                {selected.length === 2 && 'Comparing…'}
              </p>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold py-3.5 rounded-2xl transition-colors"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            {photos.length >= 2 && (
              <button
                onClick={() => setComparing(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-2xl transition-colors"
              >
                Compare
              </button>
            )}
          </>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="text-emerald-500 animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <Camera size={24} className="text-zinc-600" />
          </div>
          <p className="text-zinc-500 text-sm">No photos yet. Upload your first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photos.map(p => {
            const isSelected = selected.includes(p.id)
            const selectionFull = selected.length === 2 && !isSelected
            return (
              <button
                key={p.id}
                onClick={() => handlePhotoTap(p)}
                disabled={selectionFull}
                className={`relative rounded-2xl overflow-hidden aspect-square bg-gray-900 group transition-all duration-150 ${
                  isSelected
                    ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0c0c0e]'
                    : selectionFull
                    ? 'opacity-40'
                    : ''
                }`}
              >
                <img
                  src={p.photo_url}
                  alt="progress"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center">
                    <span className="text-black text-xs font-bold">
                      {selected.indexOf(p.id) + 1}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                  <p className="text-white text-[11px] font-medium">{formatDate(p.date)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-12 right-5 text-white bg-white/10 rounded-full p-2"
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </button>
          <div onClick={e => e.stopPropagation()} className="max-w-sm w-full">
            <img src={lightbox.photo_url} alt="progress" className="w-full rounded-2xl" />
            <p className="text-zinc-400 text-sm text-center mt-3">{formatDate(lightbox.date)}</p>
            {lightbox.notes && <p className="text-zinc-500 text-sm text-center mt-1">{lightbox.notes}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Weight Tab ────────────────────────────────────────────────────────────────

function WeightTab({ userId }) {
  const [entries, setEntries]   = useState([])
  const [weight, setWeight]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { fetchEntries() }, [userId])

  async function fetchEntries() {
    setLoading(true)
    const { data } = await supabase
      .from('progress_entries')
      .select('id, logged_at, weight_kg')
      .eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .order('logged_at', { ascending: true })
    setEntries(data ?? [])
    setLoading(false)
  }

  async function handleSave() {
    const val = parseFloat(weight)
    if (!val || val <= 0) return
    setSaving(true)
    const { error } = await supabase.from('progress_entries').insert({
      user_id: userId,
      logged_at: new Date().toISOString(),
      weight_kg: val,
    })
    if (!error) {
      setWeight('')
      await fetchEntries()
    }
    setSaving(false)
  }

  const chartData = entries.map(e => ({
    date: new Date(e.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: e.weight_kg,
  }))

  const first   = entries[0]?.weight_kg
  const current = entries[entries.length - 1]?.weight_kg
  const delta   = first && current ? +(current - first).toFixed(1) : null

  return (
    <div className="px-5 pb-8 space-y-5">
      {/* Log input */}
      <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
        <p className="text-white font-semibold text-sm">Log Today's Weight</p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="0.0"
              min="0"
              step="0.1"
              className="w-full bg-gray-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">kg</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !weight}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold px-5 rounded-xl transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Log
          </button>
        </div>
      </div>

      {/* Stats row */}
      {entries.length >= 1 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Start',   value: first   ? `${first} kg`   : '—' },
            { label: 'Current', value: current ? `${current} kg` : '—' },
            {
              label: 'Change',
              value: delta !== null ? `${delta > 0 ? '+' : ''}${delta} kg` : '—',
              color: delta === null ? '' : delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-red-400' : 'text-zinc-400',
            },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 rounded-2xl p-3 text-center">
              <p className="text-zinc-500 text-[11px] mb-1">{s.label}</p>
              <p className={`text-white font-bold text-sm ${s.color ?? ''}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="text-emerald-500 animate-spin" />
        </div>
      ) : chartData.length < 2 ? (
        <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center gap-2">
          <Weight size={24} className="text-zinc-600" />
          <p className="text-zinc-500 text-sm text-center">Log at least 2 entries to see the chart</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-white font-semibold text-sm mb-4">Weight Over Time</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<WeightTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── Measurements Tab ──────────────────────────────────────────────────────────

const MEASURE_FIELDS = [
  { key: 'chest',  label: 'Chest',  col: 'chest_cm'  },
  { key: 'waist',  label: 'Waist',  col: 'waist_cm'  },
  { key: 'hips',   label: 'Hips',   col: 'hips_cm'   },
  { key: 'bicep',  label: 'Bicep',  col: 'bicep_cm'  },
  { key: 'thigh',  label: 'Thigh',  col: 'thigh_cm'  },
]

function MeasurementsTab({ userId }) {
  const [values, setValues]   = useState({ chest: '', waist: '', hips: '', bicep: '', thigh: '' })
  const [saving, setSaving]   = useState(false)
  const [last, setLast]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchLast() }, [userId])

  async function fetchLast() {
    setLoading(true)
    const { data } = await supabase
      .from('progress_entries')
      .select('id, logged_at, chest_cm, waist_cm, hips_cm, bicep_cm, thigh_cm')
      .eq('user_id', userId)
      .or('chest_cm.not.is.null,waist_cm.not.is.null,hips_cm.not.is.null,bicep_cm.not.is.null,thigh_cm.not.is.null')
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLast(data ?? null)
    setLoading(false)
  }

  async function handleSave() {
    const cols = Object.fromEntries(
      MEASURE_FIELDS
        .filter(f => values[f.key] !== '')
        .map(f => [f.col, parseFloat(values[f.key])])
    )
    if (Object.keys(cols).length === 0) return
    setSaving(true)
    const { error } = await supabase.from('progress_entries').insert({
      user_id: userId,
      logged_at: new Date().toISOString(),
      ...cols,
    })
    if (!error) {
      setValues({ chest: '', waist: '', hips: '', bicep: '', thigh: '' })
      await fetchLast()
    }
    setSaving(false)
  }

  return (
    <div className="px-5 pb-8 space-y-5">
      {/* Input card */}
      <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
        <p className="text-white font-semibold text-sm">Log Measurements</p>
        <div className="grid grid-cols-2 gap-3">
          {MEASURE_FIELDS.map(f => (
            <div key={f.key} className="relative">
              <label className="block text-zinc-500 text-[11px] mb-1.5 font-medium">{f.label}</label>
              <div className="relative">
                <input
                  type="number"
                  value={values[f.key]}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder="0"
                  min="0"
                  step="0.1"
                  className="w-full bg-gray-800 text-white placeholder-zinc-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">cm</span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || Object.values(values).every(v => v === '')}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl mt-1 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          Save Measurements
        </button>
      </div>

      {/* Last logged */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="text-emerald-500 animate-spin" />
        </div>
      ) : last ? (
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-white font-semibold text-sm mb-3">
            Last Logged&nbsp;
            <span className="text-zinc-500 font-normal text-xs">
              {new Date(last.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-3">
            {MEASURE_FIELDS.map(f => (
              <div key={f.key} className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-zinc-500 text-[11px] mb-1">{f.label}</p>
                <p className="text-white font-bold text-sm">
                  {last[f.col] != null ? `${last[f.col]} cm` : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center gap-2">
          <Ruler size={24} className="text-zinc-600" />
          <p className="text-zinc-500 text-sm text-center">No measurements logged yet</p>
        </div>
      )}
    </div>
  )
}

// ── PRs Tab ───────────────────────────────────────────────────────────────────

function PRsTab({ userId }) {
  const [prs, setPrs]         = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ exercise: '', weight: '', reps: '' })

  useEffect(() => { fetchPRs() }, [userId])

  async function fetchPRs() {
    setLoading(true)
    const { data } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    setPrs(data ?? [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.exercise || !form.weight || !form.reps) return
    setSaving(true)
    const { error } = await supabase.from('personal_records').insert({
      user_id: userId,
      exercise: form.exercise.trim(),
      weight: parseFloat(form.weight),
      reps: parseInt(form.reps, 10),
      date: new Date().toISOString().slice(0, 10),
    })
    if (!error) {
      setForm({ exercise: '', weight: '', reps: '' })
      await fetchPRs()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('personal_records').delete().eq('id', id)
    setPrs(p => p.filter(r => r.id !== id))
  }

  return (
    <div className="px-5 pb-8 space-y-5">
      {/* Form card */}
      <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
        <p className="text-white font-semibold text-sm">Log Personal Record</p>
        <input
          type="text"
          value={form.exercise}
          onChange={e => setForm(f => ({ ...f, exercise: e.target.value }))}
          placeholder="Exercise name"
          className="w-full bg-gray-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="number"
              value={form.weight}
              onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
              placeholder="Weight"
              min="0"
              step="0.5"
              className="w-full bg-gray-800 text-white placeholder-zinc-600 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">kg</span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={form.reps}
              onChange={e => setForm(f => ({ ...f, reps: e.target.value }))}
              placeholder="Reps"
              min="1"
              className="w-full bg-gray-800 text-white placeholder-zinc-600 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">reps</span>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !form.exercise || !form.weight || !form.reps}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          Save PR
        </button>
      </div>

      {/* PR list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="text-emerald-500 animate-spin" />
        </div>
      ) : prs.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl p-6 flex flex-col items-center gap-2">
          <Trophy size={24} className="text-zinc-600" />
          <p className="text-zinc-500 text-sm text-center">No PRs logged yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prs.map(pr => (
            <div key={pr.id} className="bg-gray-900 rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Trophy size={16} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{pr.exercise}</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {pr.weight} kg × {pr.reps} reps &nbsp;·&nbsp;
                  {new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(pr.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months !== 1 ? 's' : ''} ago`
}

function prAbbr(name = '') {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words.slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

const PR_COLORS = [
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#FAECE7', text: '#993C1D' },
  { bg: '#EAF3DE', text: '#3B6D11' },
  { bg: '#F1EFE8', text: '#5F5E5A' },
  { bg: '#E1F5EE', text: '#0F6E56' },
]

function computeWeeklyVolume(logs) {
  const weeks = {}
  for (const log of logs) {
    if (!log.started_at) continue
    const d = new Date(log.started_at)
    const dow = d.getDay() // 0=Sun
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((dow + 6) % 7))
    const key = monday.toISOString().slice(0, 10)
    let vol = 0
    for (const ex of (log.exercises ?? [])) {
      for (const s of (ex.sets ?? [])) {
        vol += (s.weight_kg || 0) * (s.reps_completed || 0)
      }
    }
    weeks[key] = (weeks[key] || 0) + vol
  }

  const result = []
  for (let i = 3; i >= 0; i--) {
    const monday = new Date()
    const dow = monday.getDay()
    monday.setDate(monday.getDate() - ((dow + 6) % 7) - i * 7)
    const key = monday.toISOString().slice(0, 10)
    result.push({
      week: i === 0 ? 'This wk' : `${i}w ago`,
      kg: Math.round(weeks[key] || 0),
    })
  }
  return result
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Progress() {
  const { user } = useAuth()
  const userId = user?.id
  const { current: streakCurrent, best: streakBest } = useStreak(userId)

  const [timeRange, setTimeRange] = useState('3M')
  const [loading, setLoading]     = useState(true)

  // Real data
  const [entries,     setEntries]     = useState([])  // progress_entries with weight_kg
  const [userRow,     setUserRow]     = useState(null) // users row
  const [prs,         setPrs]         = useState([])  // personal_records
  const [volumeData,  setVolumeData]  = useState([])  // computed weekly volume
  const [workedDates, setWorkedDates] = useState(new Set()) // YYYY-MM-DD strings

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      setLoading(true)

      const cutoff = new Date()
      if (timeRange === '3M') cutoff.setMonth(cutoff.getMonth() - 3)
      else cutoff.setFullYear(2000)

      const fourWeeksAgo = new Date()
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

      const [
        { data: entriesData },
        { data: userData },
        { data: prsData },
        { data: wlogs },
      ] = await Promise.all([
        supabase
          .from('progress_entries')
          .select('logged_at, weight_kg')
          .eq('user_id', userId)
          .not('weight_kg', 'is', null)
          .gte('logged_at', cutoff.toISOString())
          .order('logged_at', { ascending: true }),
        supabase
          .from('users')
          .select('current_weight, target_weight')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('personal_records')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(3),
        supabase
          .from('workout_logs')
          .select('started_at, exercises')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .gte('started_at', fourWeeksAgo.toISOString()),
      ])

      if (cancelled) return

      setEntries(entriesData ?? [])
      setUserRow(userData)
      setPrs(prsData ?? [])
      setVolumeData(computeWeeklyVolume(wlogs ?? []))

      // All-time worked dates for calendar (re-query without cutoff)
      const today = new Date()
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
      const { data: calLogs } = await supabase
        .from('workout_logs')
        .select('started_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .gte('started_at', monthStart)
      if (!cancelled) {
        setWorkedDates(new Set((calLogs ?? []).map(l => l.started_at?.slice(0, 10)).filter(Boolean)))
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId, timeRange])

  // ── Derived values ────────────────────────────────────────────────────────
  const earliest = entries[0]
  const latest   = entries[entries.length - 1]

  const currentWeight  = latest?.weight_kg  ?? userRow?.current_weight  ?? null
  const startingWeight = earliest?.weight_kg ?? userRow?.current_weight  ?? null
  const goalWeight     = userRow?.target_weight ?? null
  const weightDelta    = currentWeight != null && startingWeight != null
    ? +(currentWeight - startingWeight).toFixed(1) : null

  const goalPct = currentWeight != null && startingWeight != null && goalWeight != null
    && startingWeight !== goalWeight
    ? Math.min(Math.max(
        ((startingWeight - currentWeight) / (startingWeight - goalWeight)) * 100, 0
      ), 100).toFixed(0)
    : null

  const chartData = entries.map(e => ({
    month: new Date(e.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: e.weight_kg,
  }))

  const bestVol = Math.max(...volumeData.map(v => v.kg), 0)

  // Calendar grid for current month (Mon–Sun)
  const today     = new Date()
  const yr        = today.getFullYear()
  const mo        = today.getMonth()
  const daysInMo  = new Date(yr, mo + 1, 0).getDate()
  const firstDow  = new Date(yr, mo, 1).getDay() // 0=Sun
  const leadEmpty = (firstDow + 6) % 7           // shift to Mon-start
  const calCells  = [
    ...Array(leadEmpty).fill(null),
    ...Array.from({ length: daysInMo }, (_, i) => i + 1),
  ]
  const todayNum = today.getDate()
  const moStr    = `${yr}-${String(mo + 1).padStart(2, '0')}`
  const daysThisMonth = [...workedDates].filter(d => d.startsWith(moStr)).length

  return (
    <div className="min-h-screen bg-[#F7F7F5] pb-24">

      {/* Fixed Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/[0.06] h-14 flex items-center justify-between px-5">
        <span className="text-xl font-semibold text-[#111]">Progress</span>
        <div className="flex gap-1.5">
          {['3M', 'All'].map(r => (
            <button key={r} onClick={() => setTimeRange(r)}
              className={`h-7 px-3 rounded-[10px] text-[13px] font-medium transition-colors ${
                timeRange === r ? 'bg-[#111] text-white' : 'border border-black/10 text-[#999]'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-[72px] px-5 space-y-4 pb-6">

        {/* BODY STATS CARD */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">Body Stats</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={22} className="text-zinc-300 animate-spin" /></div>
          ) : currentWeight == null ? (
            <div className="py-6 text-center">
              <p className="text-[#999] text-sm">No data yet.</p>
              <p className="text-[#CCC] text-xs mt-1">Log your first weigh-in in the Weight tab.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 divide-x divide-y divide-black/[0.05]">
                {[
                  {
                    label: 'current',
                    value: `${currentWeight} kg`,
                    delta: weightDelta != null
                      ? weightDelta < 0 ? `↓ ${Math.abs(weightDelta)} kg lost` : weightDelta > 0 ? `↑ ${weightDelta} kg gained` : 'No change'
                      : '—',
                    deltaColor: weightDelta != null && weightDelta < 0 ? '#3B6D11' : weightDelta != null && weightDelta > 0 ? '#A32D2D' : '#999',
                  },
                  {
                    label: 'starting',
                    value: `${startingWeight} kg`,
                    delta: earliest?.logged_at ? `since ${new Date(earliest.logged_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 'onboarding',
                    deltaColor: '#999',
                  },
                  { label: 'body fat',    value: '—', delta: 'not tracked', deltaColor: '#CCC' },
                  { label: 'muscle mass', value: '—', delta: 'not tracked', deltaColor: '#CCC' },
                ].map((s, i) => (
                  <div key={i} className="p-4 flex flex-col gap-0.5">
                    <span className="text-[11px] uppercase tracking-wider text-[#999]">{s.label}</span>
                    <span className="text-[22px] font-semibold text-[#111] tabular-nums leading-tight">{s.value}</span>
                    <span className="text-[12px] font-medium" style={{ color: s.deltaColor }}>{s.delta}</span>
                  </div>
                ))}
              </div>
              {goalWeight != null && goalPct != null && (
                <div className="mt-4">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-[#999]">{currentWeight} kg now</span>
                    <span className="text-[12px] font-medium text-[#111]">Goal: {goalWeight} kg</span>
                  </div>
                  <div className="h-2 bg-[#F1EFE8] rounded-full">
                    <div className="h-full bg-[#111] rounded-full transition-all duration-700" style={{ width: `${goalPct}%` }} />
                  </div>
                  <span className="text-[10px] text-[#999] mt-1 block">{goalPct}% to goal</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* WEIGHT CHART */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">Weight</span>
            {weightDelta != null && (
              <span className={`text-[13px] font-medium ${weightDelta < 0 ? 'text-[#3B6D11]' : 'text-[#A32D2D]'}`}>
                {weightDelta < 0 ? '↓' : '↑'} {Math.abs(weightDelta)} kg
              </span>
            )}
          </div>
          {startingWeight != null && currentWeight != null && (
            <div className="text-[13px] text-[#999] mb-4">
              {startingWeight} → {currentWeight} kg
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={22} className="text-zinc-300 animate-spin" /></div>
          ) : chartData.length < 2 ? (
            <div className="py-6 text-center">
              <p className="text-[#999] text-sm">Log at least 2 weigh-ins to see your chart.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#999' }} axisLine={false} tickLine={false} />
                <Tooltip content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="bg-white border border-black/10 rounded-lg px-2 py-1 text-xs font-medium text-[#111]">
                      {payload[0].value} kg
                    </div>
                  ) : null
                } />
                <Line
                  type="monotone" dataKey="weight"
                  stroke="#111111" strokeWidth={2}
                  dot={{ r: 4, fill: 'white', stroke: '#111', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#111' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* PERSONAL RECORDS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">Personal Records</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 size={22} className="text-zinc-300 animate-spin" /></div>
          ) : prs.length === 0 ? (
            <div className="bg-white rounded-xl border border-black/[0.06] p-5 text-center">
              <p className="text-[#999] text-sm">No personal records yet.</p>
              <p className="text-[#CCC] text-xs mt-1">Finish a workout to set your first PR.</p>
            </div>
          ) : (
            prs.map((pr, i) => {
              const c = PR_COLORS[i % PR_COLORS.length]
              return (
                <div key={pr.id} className="bg-white rounded-xl border border-black/[0.06] p-4 mb-2 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: c.bg, color: c.text }}>
                    {prAbbr(pr.exercise)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111] truncate">{pr.exercise}</p>
                    <p className="text-xs text-[#999] mt-0.5">Set {timeAgo(pr.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold text-[#111] tabular-nums">{pr.weight} kg</p>
                    <p className="text-xs text-[#999] mt-0.5">× {pr.reps} reps</p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* WEEKLY VOLUME */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">Weekly Volume</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 size={22} className="text-zinc-300 animate-spin" /></div>
          ) : bestVol === 0 ? (
            <p className="text-[#999] text-sm text-center py-4">No workouts logged in the last 4 weeks.</p>
          ) : (
            <div className="space-y-3">
              {volumeData.map((w, i) => {
                const pct = bestVol > 0 ? Math.round((w.kg / bestVol) * 100) : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[12px] text-[#999] w-14 shrink-0">{w.week}</span>
                    <div className="flex-1 h-7 bg-[#F1EFE8] rounded-xl overflow-hidden">
                      <div className="h-full bg-[#111] rounded-xl transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[12px] font-medium text-[#111] tabular-nums w-20 text-right">
                        {w.kg > 0 ? `${w.kg.toLocaleString()} kg` : '—'}
                      </span>
                      {w.kg === bestVol && w.kg > 0 && (
                        <span className="text-[9px] font-semibold uppercase bg-[#EAF3DE] text-[#3B6D11] px-1.5 py-0.5 rounded-full">
                          best
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* CONSISTENCY CALENDAR */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">Consistency</span>
            <span className="text-[12px] text-[#999]">{daysThisMonth}/{daysInMo} days</span>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-[10px] text-[#999] text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calCells.map((dayNum, i) => {
              if (dayNum == null) return <div key={i} />
              const dateStr = `${moStr}-${String(dayNum).padStart(2, '0')}`
              const isToday = dayNum === todayNum
              const worked  = workedDates.has(dateStr)
              return (
                <div key={i} className={`aspect-square rounded-lg ${
                  isToday
                    ? 'border-[1.5px] border-[#111] bg-white'
                    : worked
                    ? 'bg-[#111]'
                    : 'bg-[#F1EFE8]'
                }`} />
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/[0.04]">
            <span className="text-[14px] font-semibold text-[#111]">🔥 {streakCurrent ?? 0} day streak</span>
            <span className="text-[12px] text-[#999]">Best: {streakBest ?? 0} days</span>
          </div>
        </div>

      </div>
    </div>
  )
}
