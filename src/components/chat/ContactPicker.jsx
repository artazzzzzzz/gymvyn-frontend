// Shared "New Conversation" contact picker, backed by GET /api/chat/contacts.
// Reused by GymChatPage.jsx and StaffChatPage.jsx so the picker UI/logic is
// written once instead of copied per role page.

function initials(name = '') {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function ContactPicker({ contacts, loading, selecting, onSelect, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 420, maxHeight: '70vh', background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>New Conversation</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 20, lineHeight: 1, padding: 0 }}
          >×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ width: 24, height: 24, border: '2px solid var(--success)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'gv-contact-picker-spin 0.7s linear infinite' }} />
            </div>
          ) : contacts.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, padding: '32px 0' }}>No contacts available</p>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                disabled={selecting}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'inherit', opacity: selecting ? 0.6 : 1,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                  background: 'var(--success-bg)', color: 'var(--success)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                }}>{initials(c.full_name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{c.role}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      <style>{`@keyframes gv-contact-picker-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
