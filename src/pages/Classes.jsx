import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2, Dumbbell, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import {
  getClassesByDate,
  getMyClassBookings,
  bookClass,
  cancelClassBooking,
} from '../utils/api'

// ── Date / time helpers ─────────────────────────────────────────────────────

// Local YYYY-MM-DD (avoids the UTC day-shift that toISOString() can cause).
function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function next7Days() {
  const out = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    out.push(d)
  }
  return out
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  let h = d.getHours()
  const m = d.getMinutes()
  const period = h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${period}`
}

function formatRange(start, end) {
  if (!start) return '—'
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start)
}

// Group label for the My Bookings tab.
function dayLabel(iso) {
  if (!iso) return 'Scheduled'
  const d = new Date(iso)
  if (isNaN(d)) return 'Scheduled'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const that = new Date(d); that.setHours(0, 0, 0, 0)
  const diff = Math.round((that - today) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
}

// ── Booking normalisation ───────────────────────────────────────────────────
// The bookings API shape isn't locked yet, so read defensively across a few
// likely field names and produce a stable internal object.

function normStatus(s) {
  return (s === 'waitlist' || s === 'waitlisted' || s === 'waiting') ? 'waitlist' : 'booked'
}

function normalizeBooking(b) {
  const c = b.class || b.class_schedule || {}
  return {
    id: b.id ?? b.booking_id,
    classId: b.class_id ?? b.classId ?? c.id,
    status: normStatus(b.status),
    waitlistPosition: b.waitlist_position ?? b.position ?? null,
    className: b.class_name ?? c.class_name ?? b.className ?? 'Class',
    startTime: b.start_time ?? c.start_time ?? b.startTime ?? null,
    endTime: b.end_time ?? c.end_time ?? b.endTime ?? null,
    gymName: b.gym_name ?? b.gymName ?? c.gym_name ?? null,
    trainerName: b.trainer_name ?? c.trainer_name ?? null,
    classType: b.class_type ?? c.class_type ?? null,
    equipment: b.equipment ?? c.equipment ?? null,
    description: b.description ?? c.description ?? null,
    capacity: b.capacity ?? c.capacity ?? null,
    bookedCount: b.booked_count ?? c.booked_count ?? null,
  }
}

// Decide which action a class card / sheet should offer.
function classState(cls, booking) {
  const ref = cls.end_time || cls.start_time
  if (ref && new Date(ref).getTime() < Date.now()) return 'past'
  if (booking?.status === 'booked') return 'booked'
  if (booking?.status === 'waitlist') return 'waitlist'
  if (cls.is_full) return 'waitlist-join'
  return 'book'
}

// ── Small UI atoms ────────────────────────────────────────────────────────────

function Pill({ children, bg = 'var(--bg-pill)', color = 'var(--text-secondary)' }) {
  return (
    <span style={{
      background: bg, color, fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 999, textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function CapacityBar({ booked, capacity }) {
  const cap = capacity || 0
  const pct = cap > 0 ? Math.min(100, Math.round((booked / cap) * 100)) : 0
  const color = pct >= 100 ? 'var(--warning)' : pct >= 75 ? 'var(--warning)' : 'var(--success)'
  return (
    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-pill)' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// Action button shared by browse cards. `compact` for the card row.
function ActionButton({ state, waitlistPosition, busy, onBook, onCancel }) {
  if (state === 'past') return null

  if (state === 'booked') {
    return (
      <span style={{
        fontSize: 12, fontWeight: 600, color: 'var(--success)',
        background: 'var(--success-bg)', padding: '6px 12px', borderRadius: 999,
        whiteSpace: 'nowrap', opacity: 0.9,
      }}>
        Booked
      </span>
    )
  }

  if (state === 'waitlist') {
    return (
      <span style={{
        fontSize: 12, fontWeight: 600, color: 'var(--warning)',
        background: 'var(--warning-bg)', padding: '6px 12px', borderRadius: 999,
        whiteSpace: 'nowrap',
      }}>
        Waitlist{waitlistPosition ? ` #${waitlistPosition}` : ''}
      </span>
    )
  }

  if (state === 'waitlist-join') {
    return (
      <button
        onClick={onBook}
        disabled={busy}
        style={{
          fontSize: 12, fontWeight: 600, color: 'var(--warning)',
          background: 'transparent', border: '1px solid var(--warning)',
          padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? '…' : 'Join Waitlist'}
      </button>
    )
  }

  // book
  return (
    <button
      onClick={onBook}
      disabled={busy}
      className="rounded-full"
      style={{
        fontSize: 12, fontWeight: 600, color: 'var(--cta-text)',
        background: 'var(--cta-bg)', border: '1px solid var(--cta-border)',
        padding: '6px 16px', whiteSpace: 'nowrap', opacity: busy ? 0.5 : 1,
      }}
    >
      {busy ? '…' : 'Book'}
    </button>
  )
}

// ── Detail bottom sheet ─────────────────────────────────────────────────────

function DetailSheet({ open, data, busy, onClose, onBook, onCancel }) {
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => { if (!open) setConfirming(false) }, [open])

  const cls = data?.cls
  const booking = data?.booking
  const state = data?.state
  const capacity = cls?.capacity ?? booking?.capacity ?? null
  const booked = cls?.booked_count ?? booking?.bookedCount ?? 0
  const waitlistAhead = Math.max(0, (booked || 0) - (capacity || 0))
  const name = cls?.class_name ?? booking?.className ?? 'Class'
  const description = cls?.description ?? booking?.description ?? null
  const equipment = cls?.equipment ?? booking?.equipment ?? null
  const trainer = cls?.trainer_name ?? booking?.trainerName ?? null
  const classType = cls?.class_type ?? booking?.classType ?? null
  const start = cls?.start_time ?? booking?.startTime ?? null
  const end = cls?.end_time ?? booking?.endTime ?? null

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div className={`fixed bottom-0 left-0 right-0 z-[70] bg-[var(--bg-card)] rounded-t-[24px] transition-transform duration-300 ease-out ${
        open ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[var(--border)] rounded-full" />
        </div>

        {data && (
          <div className="px-5 pt-2 pb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[18px] font-bold text-[var(--text-primary)] leading-tight">{name}</p>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">{formatRange(start, end)}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--bg-pill)] flex items-center justify-center shrink-0">
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {classType && <Pill bg="var(--accent-bg)" color="var(--accent)">{classType}</Pill>}
              {trainer && <Pill>{trainer}</Pill>}
              {equipment && <Pill>{equipment}</Pill>}
            </div>

            {description && (
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mt-4">{description}</p>
            )}

            {capacity != null && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-[var(--text-tertiary)]">{booked} / {capacity} booked</span>
                  {waitlistAhead > 0 && (
                    <span className="text-[12px] text-[var(--warning)]">{waitlistAhead} on waitlist</span>
                  )}
                </div>
                <CapacityBar booked={booked} capacity={capacity} />
              </div>
            )}

            {/* Action */}
            <div className="mt-6">
              {state === 'past' ? (
                <p className="text-center text-[13px] text-[var(--text-tertiary)]">This class has ended</p>
              ) : (state === 'booked' || state === 'waitlist') ? (
                confirming ? (
                  <div>
                    <p className="text-center text-[13px] text-[var(--text-secondary)] mb-3">
                      Cancel this {state === 'waitlist' ? 'waitlist spot' : 'booking'}?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirming(false)}
                        className="flex-1 py-3 rounded-xl text-sm font-semibold border border-[var(--border)] text-[var(--text-primary)]"
                      >
                        Keep
                      </button>
                      <button
                        onClick={onCancel}
                        disabled={busy}
                        className="flex-1 py-3 rounded-xl text-sm font-semibold"
                        style={{ background: 'var(--error-bg)', color: 'var(--error)', opacity: busy ? 0.5 : 1 }}
                      >
                        {busy ? 'Cancelling…' : 'Cancel booking'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirming(true)}
                    className="w-full py-3.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--error-bg)', color: 'var(--error)' }}
                  >
                    {state === 'waitlist' ? 'Leave Waitlist' : 'Cancel Booking'}
                  </button>
                )
              ) : (
                <button
                  onClick={onBook}
                  disabled={busy}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: state === 'waitlist-join' ? 'transparent' : 'var(--black-cta)',
                    color: state === 'waitlist-join' ? 'var(--warning)' : 'var(--black-cta-text)',
                    border: state === 'waitlist-join' ? '1px solid var(--warning)' : 'none',
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  {busy ? 'Booking…' : state === 'waitlist-join' ? 'Join Waitlist' : 'Book Class'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message }) {
  if (!message) return null
  return (
    <div style={{
      position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: 'var(--black-cta)', color: 'var(--black-cta-text)',
      borderRadius: 24, padding: '10px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontSize: 14, fontWeight: 600, maxWidth: '90vw', textAlign: 'center',
    }}>
      {message}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function Classes() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [gymId, setGymId] = useState(null)
  const [gymLoaded, setGymLoaded] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  const [tab, setTab] = useState('browse') // 'browse' | 'bookings'
  const days = useMemo(() => next7Days(), [])
  const [selectedDate, setSelectedDate] = useState(localDateStr(days[0]))

  const [classes, setClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  const [sheet, setSheet] = useState(null)   // { cls, booking, state } | null
  const [sheetOpen, setSheetOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)  // class id currently mutating
  const [toast, setToast] = useState('')

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }, [])

  const retryLoad = useCallback(() => {
    setFetchError(null)
    setGymLoaded(false)
    setGymId(null)
    if (user) {
      supabase.from('users').select('gym_id').eq('id', user.id).maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error
          setGymId(data?.gym_id || null)
          setGymLoaded(true)
        })
        .catch(error => { console.error('Load class gym error:', error); setFetchError('Failed to load classes'); setGymLoaded(true) })
    }
  }, [user])

  // Map of class_id → normalized booking, for annotating browse cards.
  const bookingByClass = useMemo(() => {
    const m = {}
    for (const b of bookings) if (b.classId) m[b.classId] = b
    return m
  }, [bookings])

  // Resolve the member's gym.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase.from('users').select('gym_id').eq('id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error
        if (cancelled) return
        setGymId(data?.gym_id || null)
        setGymLoaded(true)
      })
      .catch(error => { if (!cancelled) { console.error('Load class gym error:', error); setFetchError('Failed to load classes'); setGymLoaded(true) } })
    return () => { cancelled = true }
  }, [user])

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      const data = await getMyClassBookings()
      const arr = Array.isArray(data) ? data : (data?.bookings ?? [])
      setBookings(arr.map(normalizeBooking))
    } catch {
      setFetchError('Failed to load classes')
    } finally {
      setLoadingBookings(false)
    }
  }, [])

  const loadClasses = useCallback(async (gId, date) => {
    setLoadingClasses(true)
    try {
      const data = await getClassesByDate(gId, date)
      setClasses(Array.isArray(data?.classes) ? data.classes : [])
    } catch {
      setFetchError('Failed to load classes')
    } finally {
      setLoadingClasses(false)
    }
  }, [])

  useEffect(() => {
    if (gymId) {
      loadClasses(gymId, selectedDate)
      loadBookings()
    }
  }, [gymId, selectedDate, loadClasses, loadBookings])

  // A booking-confirmed/promoted push (see NativePushBridge) means this
  // screen's state is stale — reload both bookings and the visible class
  // list (capacity/waitlist counts may have shifted) rather than waiting
  // for the user to navigate away and back.
  useEffect(() => {
    function onPushReceived(e) {
      const type = e.detail?.data?.type
      if (type !== 'class_booking_confirmed' && type !== 'class_booking_promoted') return
      loadBookings()
      if (gymId) loadClasses(gymId, selectedDate)
    }
    window.addEventListener('gv:push-received', onPushReceived)
    return () => window.removeEventListener('gv:push-received', onPushReceived)
  }, [gymId, selectedDate, loadClasses, loadBookings])

  function openClassSheet(cls) {
    const booking = bookingByClass[cls.id]
    setSheet({ cls, booking, state: classState(cls, booking) })
    setSheetOpen(true)
  }

  function openBookingSheet(b) {
    // Build a pseudo-class object from the booking for the sheet.
    const cls = {
      id: b.classId,
      class_name: b.className,
      start_time: b.startTime,
      end_time: b.endTime,
      capacity: b.capacity,
      booked_count: b.bookedCount,
      trainer_name: b.trainerName,
      class_type: b.classType,
      equipment: b.equipment,
      description: b.description,
      is_full: b.capacity != null && b.bookedCount != null ? b.bookedCount >= b.capacity : false,
    }
    setSheet({ cls, booking: b, state: classState(cls, b) })
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setTimeout(() => setSheet(null), 300)
  }

  async function handleBook(classId) {
    setBusyId(classId)
    try {
      const res = await bookClass(classId)
      const waitlisted = res?.status === 'waitlist' || res?.waitlisted === true
      const pos = res?.waitlist_position ?? res?.position
      showToast(waitlisted ? `Added to waitlist${pos ? ` (position ${pos})` : ''}` : 'Booked!')
      await loadBookings()
      if (gymId) await loadClasses(gymId, selectedDate)
      closeSheet()
    } catch (err) {
      showToast(err?.message || 'Could not book — try again')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(classId) {
    setBusyId(classId)
    try {
      await cancelClassBooking(classId)
      showToast('Booking cancelled')
      await loadBookings()
      if (gymId) await loadClasses(gymId, selectedDate)
      closeSheet()
    } catch (err) {
      showToast(err?.message || 'Could not cancel — try again')
    } finally {
      setBusyId(null)
    }
  }

  // Group bookings by day for the My Bookings tab (upcoming only, sorted).
  const groupedBookings = useMemo(() => {
    const upcoming = bookings
      .filter(b => !b.endTime || new Date(b.endTime).getTime() >= Date.now())
      .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0))
    const groups = []
    const idx = {}
    for (const b of upcoming) {
      const key = b.startTime ? localDateStr(new Date(b.startTime)) : 'tbd'
      if (idx[key] == null) { idx[key] = groups.length; groups.push({ key, label: dayLabel(b.startTime), items: [] }) }
      groups[idx[key]].items.push(b)
    }
    return groups
  }, [bookings])

  // ── Render ──────────────────────────────────────────────────────────────

  if (fetchError) return <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-center"><div><p className="text-sm font-medium text-[var(--error)] mb-4">{fetchError}</p><button onClick={retryLoad} className="h-10 px-5 rounded-full border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold">Try again</button></div></div>

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
      <Toast message={toast} />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)] h-14 flex items-center px-3 pt-safe">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center">
          <ChevronLeft size={22} color="var(--text-primary)" />
        </button>
        <span className="text-xl font-semibold text-[var(--text-primary)]">Classes</span>
      </div>

      {/* Segmented control */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-[var(--bg-card)] border-b border-[var(--border)] px-5 py-2.5">
        <div className="flex bg-[var(--bg-pill)] rounded-xl p-1">
          {[['browse', 'Browse'], ['bookings', 'My Bookings']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors"
              style={{
                background: tab === id ? 'var(--bg-card)' : 'transparent',
                color: tab === id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: tab === id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-[112px]">
        {/* No gym → empty state */}
        {gymLoaded && !gymId ? (
          <div className="flex flex-col items-center text-center px-8 pt-16">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-pill)] flex items-center justify-center mb-5">
              <Dumbbell size={26} color="var(--text-tertiary)" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Join a gym to book classes</h2>
            <p className="text-[13px] text-[var(--text-tertiary)] max-w-xs leading-relaxed mb-6">
              Classes and bookings show up here once you're linked to a gym.
            </p>
            <button
              onClick={() => navigate('/my-gym')}
              className="px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--black-cta)', color: 'var(--black-cta-text)' }}
            >
              Go to My Gym
            </button>
          </div>
        ) : !gymLoaded ? (
          <div className="flex items-center justify-center pt-24">
            <Loader2 size={24} className="text-[var(--text-tertiary)] animate-spin" />
          </div>
        ) : tab === 'browse' ? (
          <BrowseTab
            days={days}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            classes={classes}
            loading={loadingClasses}
            bookingByClass={bookingByClass}
            busyId={busyId}
            onOpen={openClassSheet}
            onBook={handleBook}
          />
        ) : (
          <BookingsTab
            groups={groupedBookings}
            loading={loadingBookings}
            onOpen={openBookingSheet}
            onBrowse={() => setTab('browse')}
          />
        )}
      </div>

      <DetailSheet
        open={sheetOpen}
        data={sheet}
        busy={busyId != null}
        onClose={closeSheet}
        onBook={() => sheet && handleBook(sheet.cls.id)}
        onCancel={() => sheet && handleCancel(sheet.cls.id)}
      />
    </div>
  )
}

// ── Browse tab ────────────────────────────────────────────────────────────────

function BrowseTab({ days, selectedDate, onSelectDate, classes, loading, bookingByClass, busyId, onOpen, onBook }) {
  return (
    <div>
      {/* Date strip */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-3 pt-1" style={{ scrollbarWidth: 'none' }}>
        {days.map(d => {
          const ds = localDateStr(d)
          const active = ds === selectedDate
          return (
            <button
              key={ds}
              onClick={() => onSelectDate(ds)}
              className="flex flex-col items-center justify-center rounded-2xl shrink-0 transition-colors"
              style={{
                width: 52, height: 64,
                background: active ? 'var(--text-primary)' : 'var(--bg-elevated)',
                border: active ? 'none' : '1px solid var(--border)',
              }}
            >
              <span className="text-[11px] font-medium" style={{ color: active ? 'var(--bg-primary)' : 'var(--text-tertiary)' }}>
                {WEEKDAYS[d.getDay()]}
              </span>
              <span className="text-[18px] font-bold mt-0.5" style={{ color: active ? 'var(--bg-primary)' : 'var(--text-primary)' }}>
                {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Class list */}
      <div className="px-5 space-y-2.5 pt-2">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 h-[92px] animate-pulse" />
          ))
        ) : classes.length === 0 ? (
          <p className="text-center text-[13px] text-[var(--text-tertiary)] pt-12">No classes scheduled for this day</p>
        ) : (
          classes.map(cls => {
            const booking = bookingByClass[cls.id]
            const state = classState(cls, booking)
            const cap = cls.capacity ?? 0
            const booked = cls.booked_count ?? 0
            return (
              <button
                key={cls.id}
                onClick={() => onOpen(cls)}
                className="w-full text-left bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{cls.class_name || 'Class'}</p>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{formatRange(cls.start_time, cls.end_time)}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {cls.trainer_name && <Pill>{cls.trainer_name}</Pill>}
                    {cls.class_type && <Pill bg="var(--accent-bg)" color="var(--accent)">{cls.class_type}</Pill>}
                  </div>
                  <p className="text-[12px] mt-2" style={{ color: cls.is_full ? 'var(--warning)' : 'var(--text-tertiary)' }}>
                    {cls.is_full ? 'Full · Waitlist available' : `${booked} / ${cap} booked`}
                  </p>
                </div>
                <div className="shrink-0">
                  <ActionButton
                    state={state}
                    waitlistPosition={booking?.waitlistPosition}
                    busy={busyId === cls.id}
                    onBook={(e) => { e.stopPropagation(); onBook(cls.id) }}
                  />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── My Bookings tab ─────────────────────────────────────────────────────────

function BookingsTab({ groups, loading, onOpen, onBrowse }) {
  if (loading) {
    return (
      <div className="px-5 space-y-2.5 pt-2">
        {[1, 2].map(i => (
          <div key={i} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 h-[72px] animate-pulse" />
        ))}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center text-center px-8 pt-16">
        <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-1.5">No upcoming classes booked</p>
        <p className="text-[13px] text-[var(--text-tertiary)] mb-5">Browse the schedule and reserve your spot.</p>
        <button
          onClick={onBrowse}
          className="px-6 py-3 rounded-xl text-sm font-semibold border border-[var(--cta-border)] text-[var(--cta-text)]"
        >
          Browse classes
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 pt-2 space-y-5">
      {groups.map(group => (
        <div key={group.key}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">{group.label}</p>
          <div className="space-y-2.5">
            {group.items.map(b => (
              <button
                key={b.id ?? `${b.classId}-${b.startTime}`}
                onClick={() => onOpen(b)}
                className="w-full text-left bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{b.className}</p>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{formatRange(b.startTime, b.endTime)}</p>
                  {b.gymName && <p className="text-[12px] text-[var(--text-tertiary)] mt-1">{b.gymName}</p>}
                </div>
                {b.status === 'waitlist' ? (
                  <Pill bg="var(--warning-bg)" color="var(--warning)">
                    Waitlist{b.waitlistPosition ? ` #${b.waitlistPosition}` : ''}
                  </Pill>
                ) : (
                  <Pill bg="var(--success-bg)" color="var(--success)">Booked</Pill>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
