import React from 'react'

function seededRandom(seed) {
  let s = Math.abs(seed) || 1
  return function () {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function AttendanceCalendar({
  memberId = 'default',
  visitCount = 0,
  month,
  year,
}) {
  const now = new Date()
  const m = month ?? now.getMonth()
  const y = year ?? now.getFullYear()

  const firstDay = new Date(y, m, 1)
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const todayDate = now.getDate()

  // Monday-based offset (0=Mon … 6=Sun)
  const rawOffset = firstDay.getDay()
  const offset = rawOffset === 0 ? 6 : rawOffset - 1

  const totalCells = offset + daysInMonth
  const rows = Math.ceil(totalCells / 7)

  // Distribute visits using seeded random
  const rand = seededRandom(hashString(memberId + m + y))
  const pastDays = Array.from(
    { length: todayDate - 1 }, (_, i) => i + 1
  )
  const shuffled = [...pastDays].sort(() => rand() - 0.5)
  const attendedSet = new Set(
    shuffled.slice(0, Math.min(visitCount, pastDays.length))
  )

  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 7; c++) {
      const cellIndex = r * 7 + c
      const day = cellIndex - offset + 1
      cells.push({
        day,
        valid: day >= 1 && day <= daysInMonth,
        isToday: day === todayDate,
        isFuture: day > todayDate,
        attended: attendedSet.has(day),
      })
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        marginBottom: 6
      }}>
        {DAY_LABELS.map((d, i) => (
          <div key={i} style={{
            textAlign: 'center',
            fontSize: 10,
            color: '#999',
            fontWeight: 500
          }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4
      }}>
        {cells.map((cell, i) => {
          if (!cell.valid) {
            return <div key={i} style={{ height: 20 }} />
          }
          let bg = 'transparent'
          let color = '#ccc'
          if (cell.isFuture) {
            bg = 'transparent'
            color = 'transparent'
          } else if (cell.isToday) {
            bg = '#111111'
            color = '#fff'
          } else if (cell.attended) {
            bg = '#3B6D11'
            color = '#fff'
          } else {
            bg = '#F0F0EE'
            color = '#999'
          }
          return (
            <div key={i} style={{
              height: 20,
              width: 20,
              borderRadius: '50%',
              background: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color,
              margin: '0 auto'
            }}>
              {!cell.isFuture ? cell.day : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}
