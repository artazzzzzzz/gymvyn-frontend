import { useEffect, useState, useCallback } from 'react'
import {
  UserCheck, Plus, Trash2, Loader2, Phone, Users,
  IndianRupee, X, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { getGymTrainers, inviteTrainer, removeTrainer } from '../utils/api'
import GymOwnerNav from '../components/GymOwnerNav'

// ── Helpers ──────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const formatINR = (v) => `₹${inrFormatter.format(Math.round(v || 0))}`

const AVATAR_PALETTE = [
  { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  { bg: 'bg-sky-500/15',     text: 'text-sky-400'     },
  { bg: 'bg-violet-500/15',  text: 'text-violet-400'  },
  { bg: 'bg-amber-500/15',   text: 'text-amber-400'   },
  { bg: 'bg-rose-500/15',    text: 'text-rose-400'    },
  { bg: 'bg-cyan-500/15',    text: 'text-cyan-400'    },
  { bg: 'bg-orange-500/15',  text: 'text-orange-400'  },
  { bg: 'bg-indigo-500/15',  text: 'text-indigo-400'  },
]

function avatarColor(name) {
  const s = (name || '?').toString()
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
}

// ── Atoms ────────────────────────────────────────────────────────────────────

function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel, busy }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70" onClick={onCancel}>
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} disabled={busy}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-400 inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors">
            {busy && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Trainer Modal ────────────────────────────────────────────────────────

function AddTrainerModal({ gymId, onAdded, onClose }) {
  const [form, setForm] = useState({
    fullName: '', phone: '', bio: '', specialties: '', hourlyRate: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.fullName.trim()) { setError('Full name is required.'); return }
    setBusy(true)
    try {
      await inviteTrainer({
        gymId,
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        specialties: form.specialties.trim() || null,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
      })
      onAdded()
    } catch (err) {
      setError(err.message || 'Failed to add trainer.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70"
         onClick={onClose}>
      <div className="bg-[#141416] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Add Trainer</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Full name *</label>
            <input value={form.fullName} onChange={set('fullName')} placeholder="Rahul Sharma"
                   className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30" />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Phone</label>
            <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" type="tel"
                   className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30" />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Specialties</label>
            <input value={form.specialties} onChange={set('specialties')} placeholder="Strength, Cardio, Yoga"
                   className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30" />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Hourly rate (₹)</label>
            <input value={form.hourlyRate} onChange={set('hourlyRate')} placeholder="500" type="number" min="0"
                   className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30" />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Bio</label>
            <textarea value={form.bio} onChange={set('bio')} rows={3}
                      placeholder="A short bio about this trainer…"
                      className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 resize-none" />
          </div>

          {error && (
            <p className="text-xs text-red-400 px-1">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={busy || !form.fullName.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20">
              {busy && <Loader2 size={13} className="animate-spin" />}
              {busy ? 'Adding…' : 'Add Trainer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Trainer Card ─────────────────────────────────────────────────────────────

function TrainerCard({ trainer, onRemove }) {
  const av = avatarColor(trainer.full_name)

  return (
    <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-11 h-11 rounded-xl ${av.bg} flex items-center justify-center flex-shrink-0`}>
          <span className={`text-sm font-bold ${av.text}`}>{initials(trainer.full_name)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{trainer.full_name}</p>
          {trainer.phone && (
            <a href={`tel:${trainer.phone}`}
               className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mt-0.5 tabular-nums transition-colors">
              <Phone size={10} />
              {trainer.phone}
            </a>
          )}
        </div>
        <button
          onClick={() => onRemove(trainer)}
          className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
          title="Remove trainer"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {trainer.specialties && (
        <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">{trainer.specialties}</p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
          <Users size={11} />
          <span className="tabular-nums">{trainer.members_assigned} member{trainer.members_assigned !== 1 ? 's' : ''}</span>
        </div>
        {trainer.hourly_rate != null && (
          <div className="flex items-center gap-0.5 text-[11px] text-zinc-500">
            <IndianRupee size={10} />
            <span className="tabular-nums">{formatINR(trainer.hourly_rate)}/hr</span>
          </div>
        )}
      </div>

      {trainer.bio && (
        <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed line-clamp-2">{trainer.bio}</p>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GymTrainers() {
  const { user } = useAuth()
  const [gymId, setGymId]       = useState(null)
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [removing, setRemoving] = useState(null)  // trainer object
  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeError, setRemoveError] = useState('')

  const loadTrainers = useCallback(async (gId) => {
    try {
      const data = await getGymTrainers(gId)
      setTrainers(data)
    } catch (err) {
      setError(err.message || 'Failed to load trainers.')
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const { data: gym, error: gymErr } = await supabase
          .from('gyms')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (gymErr) throw gymErr
        if (!gym) throw new Error('No gym found for this account.')
        if (cancelled) return
        setGymId(gym.id)
        await loadTrainers(gym.id)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, loadTrainers])

  async function handleRemove() {
    if (!removing) return
    setRemoveBusy(true)
    setRemoveError('')
    try {
      await removeTrainer(removing.user_id)
      setTrainers(t => t.filter(x => x.user_id !== removing.user_id))
      setRemoving(null)
    } catch (err) {
      setRemoveError(err.message || 'Failed to remove trainer.')
    } finally {
      setRemoveBusy(false)
    }
  }

  function handleAdded() {
    setShowAdd(false)
    if (gymId) loadTrainers(gymId)
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-10 sm:py-12">
        <header className="mb-7 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Trainers</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {loading ? 'Loading…' : `${trainers.length} trainer${trainers.length !== 1 ? 's' : ''} on your team`}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex-shrink-0"
          >
            <Plus size={15} />
            Add Trainer
          </button>
        </header>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-10 flex items-center justify-center">
            <Loader2 size={20} className="text-zinc-500 animate-spin" />
          </div>
        ) : trainers.length === 0 ? (
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <UserCheck size={24} className="text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">No trainers yet</p>
            <p className="text-xs text-zinc-500">Add trainers to assign them to members.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainers.map(t => (
              <TrainerCard key={t.user_id} trainer={t} onRemove={setRemoving} />
            ))}
          </div>
        )}
      </div>

      {showAdd && gymId && (
        <AddTrainerModal gymId={gymId} onAdded={handleAdded} onClose={() => setShowAdd(false)} />
      )}

      <ConfirmDialog
        open={!!removing}
        title="Remove trainer"
        body={`Remove ${removing?.full_name} from your team? This won't affect existing members immediately.`}
        confirmLabel="Remove"
        busy={removeBusy}
        onConfirm={handleRemove}
        onCancel={() => { setRemoving(null); setRemoveError('') }}
      />
      {removeError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl shadow-xl">
          {removeError}
        </div>
      )}

      <GymOwnerNav />
    </div>
  )
}
