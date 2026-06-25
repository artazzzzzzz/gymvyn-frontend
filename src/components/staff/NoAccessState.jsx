import { Lock } from 'lucide-react'

export default function NoAccessState({ message = 'Access Restricted', subtitle = 'You don\'t have permission to view this page.' }) {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 32px', textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        backgroundColor: 'var(--bg-pill)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Lock size={28} color="var(--text-tertiary)" />
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
        {message}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5, maxWidth: 260 }}>
        {subtitle}
      </div>
    </div>
  )
}
