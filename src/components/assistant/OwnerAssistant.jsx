import { useState, useEffect, useRef } from 'react'
import { useOwnerGymId } from '../../hooks/useOwnerGymId'
import { assistantGetBadge } from '../../utils/api'
import AssistantPanel from './AssistantPanel'

const POLL_INTERVAL = 5 * 60 * 1000 // 5 minutes

export default function OwnerAssistant() {
  const gymId = useOwnerGymId()
  const [isOpen, setIsOpen] = useState(false)
  const [badgeCount, setBadgeCount] = useState(0)
  const pollRef = useRef(null)

  useEffect(() => {
    if (!gymId) return

    const fetchBadge = async () => {
      try {
        const { count } = await assistantGetBadge()
        setBadgeCount(count || 0)
      } catch {}
    }

    fetchBadge()
    pollRef.current = setInterval(fetchBadge, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [gymId])

  if (!gymId) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
        style={{
          position: 'fixed',
          bottom: 82,
          right: 18,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(79,70,229,0.45)',
          zIndex: 40,
          flexShrink: 0,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          <circle cx="9" cy="14" r="1" fill="white" stroke="none"/>
          <circle cx="15" cy="14" r="1" fill="white" stroke="none"/>
        </svg>

        {badgeCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 17,
            height: 17,
            borderRadius: 999,
            background: '#ef4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-primary)',
            padding: '0 3px',
            lineHeight: 1,
          }}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      <AssistantPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        gymId={gymId}
        onBadgeClear={() => setBadgeCount(0)}
      />
    </>
  )
}
