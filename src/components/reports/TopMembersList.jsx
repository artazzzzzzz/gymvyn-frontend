import React from 'react';
import ReportSkeleton from './ReportSkeleton';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function TopMembersList({ data, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => <ReportSkeleton key={i} height={40} />)}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '16px 0' }}>
        No payment data for this period.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((m) => (
        <div key={m.member_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 24,
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-tertiary)',
            flexShrink: 0,
            textAlign: 'right',
          }}>
            {m.rank}
          </span>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            flexShrink: 0,
          }}>
            {initials(m.name)}
          </div>
          <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.name}
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', flexShrink: 0 }}>
            ₹{m.total_paid.toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
}
