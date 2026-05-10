import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Trash2, X, Loader2, Check, AlertTriangle, Clock, Users,
  CalendarDays,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import {
  getGymSchedule, addGymClass, deleteGymClass, getGymTrainers,
} from '../utils/api'
import GymOwnerNav from '../components/GymOwnerNav'

// 0 = Monday, 6 = Sunday
const DAYS = [
  { key: 0, short: 'Mon', long: 'Monday'    },
  { key: 1, short: 'Tue', long: 'Tuesday'   },
  { key: 2, short: 'Wed', long: 'Wednesday' },
  { key: 3, short: 'Thu', long: 'Thursday'  },
  { key: 4, short: 'Fri', long: 'Friday'    },
  { key: 5, short: 'Sat', long: 'Saturday'  },
  { key: 6, short: 'Sun', long: 'Sunday'    },
]

function formatTime(t) {
  if (!t) return ''
  // Accept "HH:MM" or "HH:MM:SS"
  const [h, m] = t.split(':')
  const hour = Number(h)
  const minute = m ?? '00'
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:${minute} ${ampm}`
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 2800)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
      <div className="bg-[#1a1a1d] border border-white/10 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 min-w-[260px]">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <Check size={14} className="text-emerald-400" />
        </div>
        <p className="text-sm text-white flex-1">{toast}</p>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function ConfirmDialog({ open, title, body, onConfirm, onCancel, busy }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70" onClick={onCancel}>
      <div
        className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-500/10">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-400 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Class modal ──────────────────────────────────────────────────────────

function AddClassModal({ open, onClose, gymId, trainers, defaultDay, onAdded }) {
  const [className, setClassName] = useState('')
  const [description, setDescription] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [day, setDay] = useState(defaultDay ?? 0)
  const [startTime, setStartTime] = useState('06:00')
  const [endTime, setEndTime] = useState('07:00')
  const [capacity, setCapacity] = useState('15')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setClassName('')
      setDescription('')
      setTrainerId('')
      setDay(defaultDay ?? 0)
      setStartTime('06:00')
      setEndTime('07:00')
      setCapacity('15')
      setError('')
    }
  }, [open, defaultDay])

  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!className.trim())                   { setError('Class name is required.'); return }
    if (!startTime || !endTime)              { setError('Start and end time are required.'); return }
    if (startTime >= endTime)                { setError('End time must be after start time.'); return }
    const cap = Number(capacity)
    if (!Number.isFinite(cap) || cap <= 0)   { setError('Capacity must be a positive number.'); return }

    setBusy(true)
    try {
      await addGymClass({
        gymId,
        className: className.trim(),
        description: description.trim() || null,
        trainerId: trainerId || null,
        dayOfWeek: Number(day),
        startTime,
        endTime,
        capacity: cap,
      })
      onAdded()
    } catch (err) {
      setError(err.message || 'Failed to add class.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <form
        onSubmit={submit}
        className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-white">Add a class</h3>
        <p className="text-sm text-zinc-400 mt-1">Schedule a recurring class for your gym.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Class name
            </label>
            <input
              type="text"
              value={className}
              onChange={e => setClassName(e.target.value)}
              placeholder="HIIT, Yoga, CrossFit…"
              className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="What members should expect"
              className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Trainer
            </label>
            <select
              value={trainerId}
              onChange={e => setTrainerId(e.target.value)}
              className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
            >
              <option value="">No trainer assigned</option>
              {trainers.map(t => (
                <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Day
            </label>
            <select
              value={day}
              onChange={e => setDay(e.target.value)}
              className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
            >
              {DAYS.map(d => (
                <option key={d.key} value={d.key}>{d.long}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                Start
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                End
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                Capacity
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                className="mt-1.5 w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Add Class
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Class card ───────────────────────────────────────────────────────────────

function ClassCard({ cls, onDelete }) {
  return (
    <div className="bg-[#1a1a1d] border border-white/[0.06] rounded-xl p-3 group hover:border-white/[0.14] transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold text-white truncate flex-1">{cls.class_name}</p>
        <button
          onClick={() => onDelete(cls)}
          className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg hover:bg-red-500/15 text-zinc-500 hover:text-red-400 flex items-center justify-center flex-shrink-0"
          aria-label="Delete class"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-zinc-400 tabular-nums mb-1">
        <Clock size={10} />
        {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
      </div>
      {cls.trainer_name && (
        <p className="text-[11px] text-zinc-500 truncate">with {cls.trainer_name}</p>
      )}
      <div className="flex items-center gap-1 text-[11px] text-zinc-500 tabular-nums mt-1">
        <Users size={10} />
        {cls.capacity} {cls.capacity === 1 ? 'spot' : 'spots'}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function GymSchedule() {
  const { user } = useAuth()

  const [gym, setGym] = useState(null)
  const [classes, setClasses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [addDefaultDay, setAddDefaultDay] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  async function loadAll() {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const { data: gymRow, error: gymErr } = await supabase
        .from('gyms')
        .select('id, name')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (gymErr) throw gymErr
      if (!gymRow) {
        setError('No gym found for this owner.')
        setLoading(false)
        return
      }
      setGym(gymRow)

      const [scheduleData, trainersData] = await Promise.all([
        getGymSchedule(gymRow.id),
        getGymTrainers(gymRow.id),
      ])
      setClasses(scheduleData)
      setTrainers(trainersData)
    } catch (err) {
      console.error('Load schedule error:', err)
      setError(err.message || 'Failed to load schedule.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [user])

  const byDay = useMemo(() => {
    const map = new Map(DAYS.map(d => [d.key, []]))
    for (const c of classes) {
      const k = Number(c.day_of_week)
      if (map.has(k)) map.get(k).push(c)
    }
    return map
  }, [classes])

  function openAddForDay(dayKey) {
    setAddDefaultDay(dayKey)
    setAddOpen(true)
  }

  async function onClassAdded() {
    setAddOpen(false)
    setToast('Class added')
    await loadAll()
  }

  async function onConfirmDelete() {
    if (!confirmDelete) return
    setDeleteBusy(true)
    try {
      await deleteGymClass(confirmDelete.id)
      setToast('Class deleted')
      setConfirmDelete(null)
      await loadAll()
    } catch (err) {
      console.error('Delete class error:', err)
      setToast(err.message || 'Failed to delete class')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 py-10 sm:py-12">
        <header className="flex items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Class Schedule</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {loading
                ? 'Loading…'
                : `${classes.length} ${classes.length === 1 ? 'class' : 'classes'} in ${gym?.name ?? 'your gym'}`}
            </p>
          </div>
          <button
            onClick={() => openAddForDay(0)}
            disabled={!gym?.id}
            className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-40"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add Class</span>
            <span className="sm:hidden">Add</span>
          </button>
        </header>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {DAYS.map(d => {
            const dayClasses = byDay.get(d.key) || []
            return (
              <div
                key={d.key}
                className="bg-[#141416] border border-white/[0.06] rounded-2xl p-3 min-h-[160px] flex flex-col"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                      {d.short}
                    </p>
                    <p className="text-xs text-zinc-300 tabular-nums">
                      {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                    </p>
                  </div>
                  <button
                    onClick={() => openAddForDay(d.key)}
                    disabled={!gym?.id}
                    className="w-7 h-7 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
                    aria-label={`Add class on ${d.long}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="space-y-2 flex-1">
                  {loading
                    ? <div className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
                    : dayClasses.length === 0
                      ? <div className="flex flex-col items-center justify-center text-center py-6 text-zinc-600">
                          <CalendarDays size={18} className="mb-1.5" />
                          <p className="text-[11px]">No classes scheduled</p>
                        </div>
                      : dayClasses.map(c => (
                          <ClassCard key={c.id} cls={c} onDelete={setConfirmDelete} />
                        ))}
                </div>
              </div>
            )
          })}
        </section>
      </div>

      <Toast toast={toast} onClose={() => setToast('')} />

      <AddClassModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        gymId={gym?.id}
        trainers={trainers}
        defaultDay={addDefaultDay}
        onAdded={onClassAdded}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this class?"
        body={confirmDelete ? `"${confirmDelete.class_name}" will be removed from the schedule.` : ''}
        onConfirm={onConfirmDelete}
        onCancel={() => !deleteBusy && setConfirmDelete(null)}
        busy={deleteBusy}
      />

      <GymOwnerNav />
    </div>
  )
}
