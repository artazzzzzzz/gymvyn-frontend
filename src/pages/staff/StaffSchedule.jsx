import { useState, useEffect, useCallback } from 'react'
import { useStaffPermissions } from '../../hooks/useStaffPermissions'
import NoAccessState from '../../components/staff/NoAccessState'
import { supabase } from '../../utils/supabase'

const API = import.meta.env.VITE_API_URL || ''

function LoadingSpinner() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2px solid var(--border-strong)', borderTopColor: 'var(--text-primary)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

function getMondayOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const INTENSITY_COLORS = {
  low: 'var(--success)',
  moderate: 'var(--warning)',
  high: 'var(--error)',
}
const INTENSITY_BG = {
  low: 'var(--success-bg)',
  moderate: 'var(--warning-bg)',
  high: 'var(--error-bg)',
}

export default function StaffSchedule() {
  const { permissions, gymId, loading: permsLoading } = useStaffPermissions()
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()))
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSchedule = useCallback(async () => {
    if (!gymId) return
    setLoading(true)
    try {
      const ws = weekStart.toISOString().split('T')[0]
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/gym-schedule/${gymId}?week_start=${ws}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setSchedule(Array.isArray(data) ? data : [])
    } catch {
      setSchedule([])
    } finally {
      setLoading(false)
    }
  }, [gymId, weekStart])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  const weekDays = getWeekDays(weekStart)

  const dayClasses = schedule.filter(cls => {
    if (!cls.scheduled_date) return false
    const clsDay = new Date(cls.scheduled_date).getDay()
    return clsDay === selectedDay
  })

  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }
  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  const formatTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    return `${hour % 12 || 12}:${m} ${ampm}`
  }

  if (permsLoading) return <LoadingSpinner />
  if (!permissions.view_schedule) return (
    <NoAccessState
      message="Schedule Access Required"
      subtitle="Ask your gym owner to grant you schedule view permission."
    />
  )

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: 'var(--bg-card)', borderBottom: '0.5px solid var(--border)',
        padding: '16px 20px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Schedule</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={prevWeek} style={{
              width: 32, height: 32, borderRadius: '50%', border: '0.5px solid var(--border-strong)',
              backgroundColor: 'var(--bg-elevated)', fontSize: 16, cursor: 'pointer', color: 'var(--text-primary)',
            }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
            <button onClick={nextWeek} style={{
              width: 32, height: 32, borderRadius: '50%', border: '0.5px solid var(--border-strong)',
              backgroundColor: 'var(--bg-elevated)', fontSize: 16, cursor: 'pointer', color: 'var(--text-primary)',
            }}>›</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {weekDays.map((d, i) => {
            const dayIdx = d.getDay()
            const isToday = d.toDateString() === new Date().toDateString()
            const isSelected = dayIdx === selectedDay
            const hasClasses = schedule.some(cls => cls.scheduled_date && new Date(cls.scheduled_date).getDay() === dayIdx)
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(dayIdx)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, padding: '6px 2px', borderRadius: 10,
                  backgroundColor: isSelected ? 'var(--text-primary)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? 'var(--bg-card)' : 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  {DAY_LABELS[dayIdx]}
                </span>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : isToday ? 'var(--accent-bg)' : 'transparent',
                  color: isSelected ? 'var(--bg-card)' : isToday ? 'var(--accent)' : 'var(--text-primary)',
                }}>{d.getDate()}</span>
                {hasClasses && (
                  <div style={{
                    width: 4, height: 4, borderRadius: '50%',
                    backgroundColor: isSelected ? 'var(--bg-card)' : 'var(--accent)',
                  }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>Loading...</div>
        ) : dayClasses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No classes today</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No classes scheduled for this day</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dayClasses.map(cls => (
              <div key={cls.id} style={{
                backgroundColor: 'var(--bg-card)', borderRadius: 16,
                border: '0.5px solid var(--border)', padding: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {cls.class_name || cls.name || 'Class'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {cls.trainer_name || cls.instructor || 'Instructor'}
                    </div>
                  </div>
                  {cls.intensity && (
                    <span style={{
                      backgroundColor: INTENSITY_BG[cls.intensity] || 'var(--bg-pill)',
                      color: INTENSITY_COLORS[cls.intensity] || 'var(--text-secondary)',
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                      textTransform: 'capitalize',
                    }}>{cls.intensity}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {cls.start_time && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {formatTime(cls.start_time)}{cls.end_time ? ` – ${formatTime(cls.end_time)}` : ''}
                    </div>
                  )}
                  {cls.capacity && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {cls.enrolled || 0}/{cls.capacity} enrolled
                    </div>
                  )}
                  {cls.location && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {cls.location}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
