import React from 'react';
import { useNavigate } from 'react-router-dom';
import ReportSkeleton from './ReportSkeleton';

// Bug 15 (QA re-verification): Reports had an at-risk COUNT (SummaryTiles'
// "At Risk" tile) and a CSV export (DownloadReportsSection), but no in-app
// list — an owner who wanted to actually see who was at risk had to
// download a file. GET /api/reports/:gymId/churn-risk already returns the
// full per-member list (member_id, name, churn_score, last_updated); this
// just renders it instead of/alongside the CSV export.

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function riskLabel(score) {
  if (score >= 0.85) return { text: 'High', color: 'var(--error)', bg: 'var(--error-bg)' };
  return { text: 'Elevated', color: 'var(--warning)', bg: 'var(--warning-bg)' };
}

export default function AtRiskMembersList({ data, loading, error, onRetry }) {
  const navigate = useNavigate();

  if (error) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--error)', fontWeight: 500, margin: '0 0 16px' }}>{error.message || 'Unable to load at-risk members'}</p>
        <button onClick={onRetry} style={{ height: 40, padding: '0 20px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 600 }}>Try again</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 3 }).map((_, i) => <ReportSkeleton key={i} height={44} />)}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '16px 0' }}>
        No members currently at risk. 🎉
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((m) => {
        const risk = riskLabel(m.churn_score);
        return (
          <button
            key={m.member_id}
            onClick={() => navigate(`/gym/members/${m.member_id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', background: 'none', border: 'none', padding: '6px 0',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0,
            }}>
              {initials(m.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name}
              </div>
              {m.last_updated && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>Updated {m.last_updated}</div>
              )}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              color: risk.color, background: risk.bg, flexShrink: 0,
            }}>
              {risk.text} · {Math.round(m.churn_score * 100)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}
