import { useActiveGym } from '../contexts/ActiveGymContext'

// Functional-first pass — visual polish is a later prompt. Renders nothing
// for the vast majority of owners (exactly one gym). Once an owner has more
// than one, this is the only surface that lets them switch which gym every
// other owner screen operates on.
export default function GymSwitcher() {
  const { gyms, activeGymId, needsGymSelection, setActiveGym } = useActiveGym()

  if (gyms.length <= 1) return null

  if (needsGymSelection) {
    return (
      <div style={{ padding: 12, background: 'var(--warning-bg, #fff3cd)', color: 'var(--warning, #856404)', fontSize: 14 }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Select a gym to continue</div>
        <select
          value=""
          onChange={(e) => setActiveGym(e.target.value)}
          style={{ width: '100%', padding: 8, fontSize: 14 }}
        >
          <option value="" disabled>Choose a gym…</option>
          {gyms.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 12px', fontSize: 14 }}>
      <select
        value={activeGymId || ''}
        onChange={(e) => setActiveGym(e.target.value)}
        style={{ padding: 6, fontSize: 14 }}
      >
        {gyms.map(g => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
    </div>
  )
}
