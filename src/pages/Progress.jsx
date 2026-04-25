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
import BottomNav from '../components/BottomNav'

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
      .select('id, date, weight')
      .eq('user_id', userId)
      .not('weight', 'is', null)
      .order('date', { ascending: true })
    setEntries(data ?? [])
    setLoading(false)
  }

  async function handleSave() {
    const val = parseFloat(weight)
    if (!val || val <= 0) return
    setSaving(true)
    const { error } = await supabase.from('progress_entries').insert({
      user_id: userId,
      date: new Date().toISOString().slice(0, 10),
      weight: val,
    })
    if (!error) {
      setWeight('')
      await fetchEntries()
    }
    setSaving(false)
  }

  const chartData = entries.map(e => ({
    date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: e.weight,
  }))

  const first   = entries[0]?.weight
  const current = entries[entries.length - 1]?.weight
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
  { key: 'chest',  label: 'Chest'  },
  { key: 'waist',  label: 'Waist'  },
  { key: 'hips',   label: 'Hips'   },
  { key: 'bicep',  label: 'Bicep'  },
  { key: 'thigh',  label: 'Thigh'  },
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
      .select('id, date, measurements')
      .eq('user_id', userId)
      .not('measurements', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLast(data ?? null)
    setLoading(false)
  }

  async function handleSave() {
    const m = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '').map(([k, v]) => [k, parseFloat(v)])
    )
    if (Object.keys(m).length === 0) return
    setSaving(true)
    const { error } = await supabase.from('progress_entries').insert({
      user_id: userId,
      date: new Date().toISOString().slice(0, 10),
      measurements: m,
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
              {new Date(last.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-3">
            {MEASURE_FIELDS.map(f => (
              <div key={f.key} className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-zinc-500 text-[11px] mb-1">{f.label}</p>
                <p className="text-white font-bold text-sm">
                  {last.measurements?.[f.key] != null ? `${last.measurements[f.key]} cm` : '—'}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Progress() {
  const { user } = useAuth()
  const [tab, setTab] = useState('photos')
  const { current, best, loading: streakLoading } = useStreak(user?.id)

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24">
      {/* Header */}
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <p className="text-zinc-500 text-sm mt-1">Track your results over time</p>
      </header>

      {/* Streak banner */}
      <div className="px-5 mb-5">
        <div className="bg-gray-900 rounded-2xl px-5 py-4 flex items-center gap-4">
          <span className="text-4xl leading-none">🔥</span>
          <div className="flex-1">
            {streakLoading ? (
              <div className="h-7 w-24 bg-white/[0.06] rounded-lg animate-pulse mb-1" />
            ) : (
              <p className="text-3xl font-bold text-white leading-none">
                {current}
                <span className="text-base font-semibold text-zinc-400 ml-2">day streak</span>
              </p>
            )}
            <p className="text-zinc-500 text-xs mt-1">
              {streakLoading ? '' : `Best: ${best} day${best !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tab pills */}
      <div className="px-5 mb-5">
        <div className="flex bg-gray-900 rounded-2xl p-1 gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                tab === t.id
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <t.icon size={13} strokeWidth={2} />
              <span className="hidden xs:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {user && (
        <>
          {tab === 'photos'       && <PhotosTab       userId={user.id} />}
          {tab === 'weight'       && <WeightTab        userId={user.id} />}
          {tab === 'measurements' && <MeasurementsTab  userId={user.id} />}
          {tab === 'prs'          && <PRsTab           userId={user.id} />}
        </>
      )}

      <BottomNav />
    </div>
  )
}
