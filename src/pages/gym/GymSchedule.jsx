import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAvatarColor, getInitials } from '../../utils/avatarColor'
import { formatShortDate } from '../../utils/dateHelpers'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import { supabase } from '../../utils/supabase'
import { useActiveGym } from '../../contexts/ActiveGymContext'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const TYPE_CONFIG = {
  yoga:     { accent: 'var(--success)', bg: 'var(--success-bg)' },
  strength: { accent: 'var(--text-cta)', bg: 'var(--accent-bg)' },
  zumba:    { accent: 'var(--warning)', bg: 'var(--warning-bg)' },
  hiit:     { accent: 'var(--error)', bg: 'var(--error-bg)' },
  cardio:   { accent: 'var(--success)', bg: 'var(--success-bg)' },
  pilates:  { accent: '#3C3489', bg: '#EEEDFE' },
  other:    { accent: 'var(--text-secondary)', bg: 'var(--bg-pill)' },
}

function getMondayOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getDayName(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long' })
}

function formatTime(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function combineDateAndTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

// ─── WeekStrip ──────────────────────────────────────────────────────────────
function WeekStrip({ weekData, selectedDate, onDateSelect }) {
  const todayStr = new Date().toISOString().split('T')[0]
  return (
    <div style={{
      display: 'flex',
      background: 'var(--bg-card)',
      borderBottom: '0.5px solid rgba(0,0,0,0.08)',
    }}>
      {weekData?.days?.map(day => {
        const isToday = day.date === todayStr
        const isSelected = day.date === selectedDate
        return (
          <div
            key={day.date}
            onClick={() => onDateSelect(day.date)}
            style={{
              flex: 1,
              textAlign: 'center',
              cursor: 'pointer',
              padding: '8px 0',
              borderBottom: isSelected
                ? '2px solid var(--text-primary)'
                : '2px solid transparent',
            }}
          >
            <div style={{
              fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 4,
            }}>
              {day.day_label}
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: isToday ? 'var(--text-primary)' : 'transparent',
              color: isToday ? 'var(--bg-card)' : 'var(--text-primary)',
              fontSize: 15,
              fontWeight: isToday ? 600 : 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
            }}>
              {new Date(day.date).getDate()}
            </div>
            {day.has_classes && (
              <div style={{
                width: 4, height: 4, borderRadius: '50%',
                background: 'var(--success)',
                margin: '4px auto 0',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Pill ────────────────────────────────────────────────────────────────────
function Pill({ text, bg, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500,
      background: bg, color,
      borderRadius: 20, padding: '3px 8px',
      whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  )
}

// ─── ClassCard ───────────────────────────────────────────────────────────────
function ClassCard({ cls }) {
  const cfg = TYPE_CONFIG[cls.class_type] || TYPE_CONFIG.other
  const avatarStyle = getAvatarColor(cls.trainer_name || 'T')
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 12,
      border: '0.5px solid rgba(0,0,0,0.08)',
      borderLeft: `3px solid ${cfg.accent}`,
      padding: 16,
      marginBottom: 10,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 12, fontWeight: 500,
          background: 'var(--bg-pill)', color: 'var(--text-secondary)',
          borderRadius: 20, padding: '3px 8px',
        }}>
          {formatTime(cls.start_time)}
        </span>
        {cls.is_full
          ? <Pill text="Full" bg="var(--error-bg)" color="var(--error)" />
          : <Pill text={`${cls.booked_count} / ${cls.capacity}`} bg="var(--success-bg)" color="var(--success)" />
        }
      </div>

      {/* Class name */}
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>
        {cls.class_name}
      </div>

      {/* Trainer row */}
      {cls.trainer_name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            ...avatarStyle,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 600,
          }}>
            {getInitials(cls.trainer_name)}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cls.trainer_name}</span>
        </div>
      )}

      {/* Pills row */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <Pill text={`${cls.duration_minutes} min`} bg="var(--bg-pill)" color="var(--text-secondary)" />
        <Pill text={cls.equipment || 'No equipment'} bg="var(--bg-pill)" color="var(--text-secondary)" />
        {cls.is_full
          ? <Pill text={`${cls.booked_count} booked`} bg="var(--error-bg)" color="var(--error)" />
          : <Pill text={`${cls.booked_count} booked`} bg="var(--success-bg)" color="var(--success)" />
        }
      </div>
    </div>
  )
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 12,
      border: '0.5px solid rgba(0,0,0,0.08)',
      padding: 16, marginBottom: 10,
    }}>
      <style>{`@keyframes skel{from{opacity:0.4}to{opacity:1}}`}</style>
      {[60, 120, 80].map((w, i) => (
        <div key={i} style={{
          height: i === 1 ? 16 : 12, width: w, borderRadius: 6,
          background: 'var(--bg-pill)', marginBottom: 10,
          animation: 'skel 1.2s ease-in-out infinite alternate',
        }} />
      ))}
    </div>
  )
}

// ─── AddClassModal ────────────────────────────────────────────────────────────
function AddClassModal({ show, onClose, gymId, selectedDate, onSuccess }) {
  const [className, setClassName] = useState('')
  const [classType, setClassType] = useState('yoga')
  const [date, setDate] = useState(selectedDate)
  const [startTime, setStartTime] = useState('07:00')
  const [duration, setDuration] = useState(60)
  const [capacity, setCapacity] = useState('')
  const [equipment, setEquipment] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [recurringDays, setRecurringDays] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setDate(selectedDate) }, [selectedDate])

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const DAY_VALUES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

  function toggleDay(v) {
    setRecurringDays(prev =>
      prev.includes(v) ? prev.filter(d => d !== v) : [...prev, v]
    )
  }

  async function handleSubmit() {
    if (!className.trim()) { setError('Class name is required'); return }
    if (!startTime) { setError('Start time is required'); return }
    setError('')
    setSubmitting(true)
    try {
      const body = {
        gym_id: gymId,
        class_name: className.trim(),
        class_type: classType,
        start_time: combineDateAndTime(date, startTime),
        duration_minutes: duration,
        capacity: Number(capacity) || 20,
        equipment: equipment.trim() || 'No equipment',
        trainer_id: null,
        recurring,
        recurring_days: recurring ? recurringDays : [],
      }
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE_URL}/api/gym-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || errData.error || `Server error ${res.status}`)
      }
      onSuccess()
      onClose()
      // reset
      setClassName(''); setClassType('yoga'); setStartTime('07:00')
      setDuration(60); setCapacity(''); setEquipment('')
      setRecurring(false); setRecurringDays([])
    } catch (e) {
      setError(e.message || 'Failed to add class')
    } finally {
      setSubmitting(false)
    }
  }

  if (!show) return null

  const inputStyle = {
    width: '100%', height: 44, borderRadius: 8, boxSizing: 'border-box',
    border: '0.5px solid rgba(0,0,0,0.15)', background: 'var(--bg-card)',
    fontSize: 14, color: 'var(--text-primary)', padding: '0 12px',
    outline: 'none',
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 50,
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-primary)', borderRadius: '16px 16px 0 0',
        zIndex: 51, padding: '20px 20px 40px',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(0,0,0,0.15)', margin: '0 auto 16px',
        }} />

        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
          Add Class
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Class name */}
          <input
            style={inputStyle}
            placeholder="e.g. Morning Yoga"
            value={className}
            onChange={e => setClassName(e.target.value)}
          />

          {/* Class type chips */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {Object.keys(TYPE_CONFIG).map(t => (
              <button
                key={t}
                onClick={() => setClassType(t)}
                style={{
                  flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 20,
                  border: '0.5px solid rgba(0,0,0,0.15)',
                  background: classType === t ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: classType === t ? 'var(--bg-card)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Date */}
          <input
            type="date"
            style={inputStyle}
            value={date}
            onChange={e => setDate(e.target.value)}
          />

          {/* Start time */}
          <input
            type="time"
            style={inputStyle}
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
          />

          {/* Duration */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[30, 45, 60, 75].map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                style={{
                  flex: 1, height: 40, borderRadius: 8,
                  border: '0.5px solid rgba(0,0,0,0.15)',
                  background: duration === d ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: duration === d ? 'var(--bg-card)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                {d} min
              </button>
            ))}
          </div>

          {/* Capacity */}
          <input
            type="number"
            style={inputStyle}
            placeholder="Max members (e.g. 25)"
            value={capacity}
            onChange={e => setCapacity(e.target.value)}
          />

          {/* Equipment */}
          <input
            style={inputStyle}
            placeholder="e.g. Yoga mat, Weights"
            value={equipment}
            onChange={e => setEquipment(e.target.value)}
          />

          {/* Recurring toggle */}
          <div style={{
            height: 52, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '0.5px solid rgba(0,0,0,0.08)',
            borderBottom: recurring ? 'none' : '0.5px solid rgba(0,0,0,0.08)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              Recurring class
            </span>
            <div
              onClick={() => setRecurring(p => !p)}
              style={{
                width: 44, height: 26, borderRadius: 13,
                background: recurring ? 'var(--text-primary)' : 'var(--text-tertiary)',
                position: 'relative', cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3,
                left: recurring ? 21 : 3,
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--bg-card)',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>

          {/* Day selector */}
          {recurring && (
            <div style={{
              display: 'flex', gap: 8, justifyContent: 'center',
              paddingBottom: 4,
              borderBottom: '0.5px solid rgba(0,0,0,0.08)',
            }}>
              {DAY_LABELS.map((label, i) => {
                const v = DAY_VALUES[i]
                const active = recurringDays.includes(v)
                return (
                  <div
                    key={i}
                    onClick={() => toggleDay(v)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: active ? 'var(--text-primary)' : 'var(--bg-pill)',
                      color: active ? 'var(--bg-card)' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {label}
                  </div>
                )
              })}
            </div>
          )}

          {error && (
            <div style={{ fontSize: 13, color: 'var(--error)', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%', height: 52, borderRadius: 12,
              background: submitting ? 'var(--text-secondary)' : 'var(--text-primary)',
              color: 'var(--bg-card)', fontSize: 16, fontWeight: 600,
              border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {submitting ? 'Adding…' : 'Add Class'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GymSchedule() {
  const navigate = useNavigate()
  const { activeGymId: gymId } = useActiveGym()
  const [weekData, setWeekData] = useState(null)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const fetchWeek = useCallback(async (gId, date) => {
    if (!gId) return
    setLoading(true)
    setLoadError('')
    try {
      const monday = getMondayOfWeek(date)
      const mondayISO = monday.toISOString().split('T')[0]
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${BASE_URL}/api/gym-schedule/${gId}?week_start=${mondayISO}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to load schedule')
      setWeekData(data)
    } catch (err) {
      setWeekData(null)
      setLoadError(err.message || 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (gymId) fetchWeek(gymId, selectedDate)
  }, [gymId, fetchWeek]) // eslint-disable-line

  const selectedDayData = weekData?.days?.find(d => d.date === selectedDate) || { classes: [] }

  const upcomingClasses = (weekData?.days
    ?.flatMap(d => d.classes.map(c => ({ ...c, date: d.date, day_label: d.day_label })))
    .filter(c => new Date(c.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 3)) || []

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--error)', margin: 0 }}>{loadError}</p>
        <button onClick={() => fetchWeek(gymId, selectedDate)} style={{ fontSize: 13, color: 'var(--text-cta)', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button>
        <button onClick={() => navigate(-1)} style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Back</button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      paddingBottom: 80,
    }}>
      {/* Top Bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg-primary)',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          height: 56, padding: '0 16px', gap: 8,
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
            Schedule
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              height: 32, padding: '0 14px', borderRadius: 20,
              background: 'var(--text-primary)', color: 'var(--bg-card)',
              fontSize: 13, fontWeight: 600, border: 'none',
              cursor: 'pointer',
            }}
          >
            + Add Class
          </button>
        </div>

        {/* Week Strip */}
        {loading && !weekData
          ? (
            <div style={{
              display: 'flex', background: 'var(--bg-card)',
              borderBottom: '0.5px solid rgba(0,0,0,0.08)',
            }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, padding: '10px 0', textAlign: 'center',
                }}>
                  <div style={{
                    height: 10, width: 20, borderRadius: 4,
                    background: 'var(--bg-pill)', margin: '0 auto 6px',
                  }} />
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--bg-pill)', margin: '0 auto',
                  }} />
                </div>
              ))}
            </div>
          ) : (
            <WeekStrip
              weekData={weekData}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          )
        }
      </div>

      {/* Scrollable content */}
      <div style={{ padding: '16px 16px 0' }}>
        {/* Day label row */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
            {getDayName(selectedDate)}, {formatShortDate(selectedDate)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {selectedDayData.classes.length} classes scheduled
          </div>
        </div>

        {/* Class cards */}
        {loading && !weekData
          ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
          : selectedDayData.classes.length === 0
            ? (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                height: 100, gap: 6,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                  No classes scheduled
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  Tap + Add Class to create one
                </div>
              </div>
            )
            : selectedDayData.classes.map(cls => (
              <ClassCard key={cls.id} cls={cls} />
            ))
        }

        {/* Upcoming this week */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            letterSpacing: '0.06em', marginBottom: 10,
          }}>
            UPCOMING THIS WEEK
          </div>

          <div style={{
            background: 'var(--bg-card)', borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}>
            {upcomingClasses.length === 0
              ? (
                <div style={{
                  height: 44, display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13, color: 'var(--text-tertiary)',
                }}>
                  No upcoming classes this week
                </div>
              )
              : upcomingClasses.map((cls, i) => {
                const avatarStyle = getAvatarColor(cls.trainer_name || 'T')
                return (
                  <div key={cls.id} style={{
                    height: 52, display: 'flex', alignItems: 'center',
                    padding: '0 16px', gap: 12,
                    borderTop: i > 0 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: TYPE_CONFIG[cls.class_type]?.accent || 'var(--text-secondary)',
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {cls.day_label} · {formatTime(cls.start_time)}
                      </div>
                      <div style={{
                        fontSize: 13, color: 'var(--text-tertiary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {cls.class_name}
                      </div>
                    </div>
                    {cls.trainer_name && (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        ...avatarStyle,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 600, flexShrink: 0,
                      }}>
                        {getInitials(cls.trainer_name)}
                      </div>
                    )}
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        style={{
          position: 'fixed', bottom: 84, right: 20,
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--text-primary)', color: 'var(--bg-card)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <GymBottomNav active="schedule" onMorePress={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      <AddClassModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        gymId={gymId}
        selectedDate={selectedDate}
        onSuccess={() => fetchWeek(gymId, selectedDate)}
      />
    </div>
  )
}
