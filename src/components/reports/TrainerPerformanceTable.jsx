import React from 'react';
import ReportSkeleton from './ReportSkeleton';

const pill = {
  background: 'var(--bg-elevated)',
  color: 'var(--text-secondary)',
  borderRadius: 6,
  padding: '3px 8px',
  fontSize: 11,
  fontWeight: 500,
};

export default function TrainerPerformanceTable({ data, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 3 }).map((_, i) => <ReportSkeleton key={i} height={52} />)}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '16px 0' }}>
        No trainers affiliated with this gym.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((t) => (
        <div key={t.trainer_id} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 12,
          gap: 8,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.name}
          </span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <span style={pill}>{t.client_count} clients</span>
            <span style={pill}>{t.sessions_in_period} sessions</span>
          </div>
        </div>
      ))}
    </div>
  );
}
