import { useEffect, useState } from 'react'
import {
  Plus, Trash2, X, Loader2, Check, AlertTriangle, Megaphone,
  Bell, Info, Zap,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import {
  getGymAnnouncements, postAnnouncement, deleteAnnouncement,
} from '../utils/api'
import GymOwnerNav from '../components/GymOwnerNav'

// Values must match the live `announcements_priority_check` constraint —
// ['low', 'normal', 'high', 'urgent'], enforced backend-side in server.js
// (VALID_PRIORITIES). The picker never offered 'important' as anything but a
// UI label; it was sent to the API as the literal string 'important', which
// isn't one of the four accepted values at all (not just wrong casing) and
// always 400'd. 'high' is the accepted value that sits between normal and
// urgent, so it keeps the "Important" label but sends 'high' — 'urgent' stays
// its own distinct (and already-working) option rather than being collapsed
// into it.
const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal'    },
  { value: 'high',   label: 'Important' },
  { value: 'urgent', label: 'Urgent'    },
]

const PRIORITY_STYLES = {
  normal:    { bg: 'bg-[var(--bg-card)]/[0.06]',     border: 'border-white/[0.10]',   text: 'text-[var(--text-secondary)]', icon: Info,      iconColor: 'text-[var(--text-secondary)]'    },
  high:      { bg: 'bg-[var(--warning-bg)]',     border: 'border-[var(--warning)]',   text: 'text-[var(--warning)]', icon: Bell,      iconColor: 'text-[var(--warning)]'  },
  urgent:    { bg: 'bg-[var(--error-bg)]',       border: 'border-[var(--error)]',    text: 'text-[var(--error)]',   icon: Zap,       iconColor: 'text-[var(--error)]'    },
}

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)    return 'just now'
  if (min < 60)   return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)    return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7)    return `${day}d ago`
  if (day < 30)   {
    const w = Math.floor(day / 7)
    return `${w}w ago`
  }
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PriorityPill({ priority }) {
  const s = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.normal
  const Icon = s.icon
  const label = PRIORITY_OPTIONS.find(o => o.value === priority)?.label || priority || 'Normal'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <Icon size={10} className={s.iconColor} />
      {label}
    </span>
  )
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
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 min-w-[260px]">
        <div className="w-7 h-7 rounded-lg bg-[var(--success-bg)] flex items-center justify-center flex-shrink-0">
          <Check size={14} className="text-[var(--success)]" />
        </div>
        <p className="text-sm text-[var(--text-primary)] flex-1">{toast}</p>
        <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
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
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[var(--error-bg)]">
            <AlertTriangle size={18} className="text-[var(--error)]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/[0.04] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[var(--text-primary)] bg-[var(--error)] hover:bg-[var(--error)] inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post Announcement modal ──────────────────────────────────────────────────

function PostAnnouncementModal({ open, gymId, postedBy, onClose, onPosted }) {
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [priority, setPriority] = useState('normal')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (open) {
      setTitle('')
      setBody('')
      setPriority('normal')
      setError('')
    }
  }, [open])

  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Title is required.'); return }
    if (!body.trim())  { setError('Message is required.'); return }

    setBusy(true)
    try {
      await postAnnouncement({
        gymId,
        postedBy,
        title: title.trim(),
        body: body.trim(),
        priority,
      })
      onPosted()
    } catch (err) {
      setError(err.message || 'Failed to post announcement.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <form
        onSubmit={submit}
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Post announcement</h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Share an update with everyone in your gym.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Holiday timings"
              className="mt-1.5 w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--success)] focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest">
              Message
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="What do you want members to know?"
              className="mt-1.5 w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--success)] focus:ring-1 focus:ring-emerald-500/30 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest">
              Priority
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="mt-1.5 w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--success)] focus:ring-1 focus:ring-emerald-500/30"
            >
              {PRIORITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-[var(--error)]">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/[0.04] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[var(--text-primary)] bg-[var(--success)] hover:bg-[var(--success)] inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Post
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function GymAnnouncements() {
  const { user } = useAuth()

  const [gym, setGym] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [postOpen, setPostOpen] = useState(false)
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

      const list = await getGymAnnouncements(gymRow.id)
      setItems(list)
    } catch (err) {
      console.error('Load announcements error:', err)
      setError(err.message || 'Failed to load announcements.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [user])

  async function onPosted() {
    setPostOpen(false)
    setToast('Announcement posted')
    await loadAll()
  }

  async function onConfirmDelete() {
    if (!confirmDelete) return
    setDeleteBusy(true)
    try {
      await deleteAnnouncement(confirmDelete.id)
      setToast('Announcement deleted')
      setConfirmDelete(null)
      await loadAll()
    } catch (err) {
      console.error('Delete announcement error:', err)
      setToast(err.message || 'Failed to delete')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] halo-decoration bg-[rgba(212,181,117,0.08)] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-10 sm:py-12">
        <header className="flex items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">Announcements</h1>
            <p className="text-[var(--text-tertiary)] text-sm mt-0.5">
              {loading
                ? 'Loading…'
                : `${items.length} ${items.length === 1 ? 'post' : 'posts'} in ${gym?.name ?? 'your gym'}`}
            </p>
          </div>
          <button
            onClick={() => setPostOpen(true)}
            disabled={!gym?.id}
            className="inline-flex items-center gap-1.5 bg-[var(--success)] hover:bg-[var(--success)] text-[var(--text-primary)] font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-40"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Post Announcement</span>
            <span className="sm:hidden">Post</span>
          </button>
        </header>

        {error ? (
          <div className="bg-[var(--error-bg)] border border-[var(--error)] rounded-2xl p-8 text-center">
            <p className="text-sm text-[var(--error)] mb-4">{error}</p>
            <button onClick={loadAll} className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]">Try again</button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
                <div className="h-3 bg-[var(--bg-card)]/[0.05] rounded animate-pulse w-1/3" />
                <div className="h-2.5 bg-[var(--bg-card)]/[0.04] rounded animate-pulse w-2/3" />
                <div className="h-2.5 bg-[var(--bg-card)]/[0.04] rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 sm:p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-5">
              <Megaphone size={26} className="text-[var(--success)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-2">No announcements yet</h2>
            <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto mb-7">
              Post updates, holiday timings, or important notices for your members.
            </p>
            <button
              onClick={() => setPostOpen(true)}
              disabled={!gym?.id}
              className="inline-flex items-center gap-2 bg-[var(--success)] hover:bg-[var(--success)] text-[var(--text-primary)] font-semibold text-sm px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-40"
            >
              <Plus size={14} />
              Post first announcement
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map(a => (
              <li
                key={a.id}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 group hover:border-[var(--border-strong)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">{a.title}</h2>
                    <PriorityPill priority={a.priority} />
                  </div>
                  <button
                    onClick={() => setConfirmDelete(a)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg hover:bg-[var(--error-bg)] text-[var(--text-tertiary)] hover:text-[var(--error)] flex items-center justify-center flex-shrink-0"
                    aria-label="Delete announcement"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{a.body}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-3">{timeAgo(a.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast('')} />

      <PostAnnouncementModal
        open={postOpen}
        gymId={gym?.id}
        postedBy={user?.id}
        onClose={() => setPostOpen(false)}
        onPosted={onPosted}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this announcement?"
        body={confirmDelete ? `"${confirmDelete.title}" will be hidden from members.` : ''}
        onConfirm={onConfirmDelete}
        onCancel={() => !deleteBusy && setConfirmDelete(null)}
        busy={deleteBusy}
      />

      <GymOwnerNav />
    </div>
  )
}
