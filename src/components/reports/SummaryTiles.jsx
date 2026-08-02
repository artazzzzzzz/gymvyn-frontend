import React from 'react';
import { IndianRupee, Clock, UserPlus, Users, AlertTriangle, PieChart } from 'lucide-react';
import ReportSkeleton from './ReportSkeleton';

const tile = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 16,
};

function DeltaBadge({ pct }) {
  if (pct === 0 || pct === null || pct === undefined) {
    return (
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 99 }}>
        —
      </span>
    );
  }
  const up = pct > 0;
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      color: up ? 'var(--success)' : 'var(--error)',
      background: up ? 'var(--success-bg)' : 'var(--error-bg)',
      padding: '2px 8px',
      borderRadius: 99,
    }}>
      {up ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
}

function Tile({ icon, iconColor, title, children }) {
  return (
    <div style={tile}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{title}</span>
        <span style={{ color: iconColor || 'var(--text-tertiary)' }}>{icon}</span>
      </div>
      {children}
    </div>
  );
}

export default function SummaryTiles({ data, loading, error, onRetry }) {
  if (error) {
    return (
      <div style={{ ...tile, textAlign: 'center', padding: 24 }}>
        <p style={{ color: 'var(--error)', fontWeight: 500, margin: '0 0 16px' }}>{error.message || 'Unable to load summary'}</p>
        <button onClick={onRetry} style={{ height: 40, padding: '0 20px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 600 }}>Try again</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={tile}>
            <ReportSkeleton height={80} />
          </div>
        ))}
      </div>
    );
  }

  const d = data || {};

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* Tile 1 — Total Revenue */}
      <Tile title="Total Revenue" icon={<IndianRupee size={16} />} iconColor="var(--text-primary)">
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          ₹{(d.current_revenue || 0).toLocaleString('en-IN')}
        </div>
        <DeltaBadge pct={d.revenue_delta_pct} />
      </Tile>

      {/* Tile 2 — Outstanding */}
      <Tile title="Outstanding" icon={<Clock size={16} />} iconColor="var(--warning)">
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          ₹{(d.outstanding_amount || 0).toLocaleString('en-IN')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {d.outstanding_count || 0} payment{d.outstanding_count !== 1 ? 's' : ''}
        </div>
      </Tile>

      {/* Tile 3 — New Members */}
      <Tile title="New Members" icon={<UserPlus size={16} />} iconColor="var(--success)">
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
          {d.new_members || 0}
        </div>
      </Tile>

      {/* Tile 4 — Active Members */}
      <Tile title="Active Members" icon={<Users size={16} />} iconColor="var(--text-secondary)">
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
          {d.active_members || 0}
        </div>
      </Tile>

      {/* Tile 5 — At Risk */}
      <Tile title="At Risk" icon={<AlertTriangle size={16} />} iconColor="var(--error)">
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {d.at_risk_members || 0}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Churn score &gt; 60%</div>
      </Tile>

      {/* Tile 6 — Revenue By Source */}
      <Tile title="By Source" icon={<PieChart size={16} />} iconColor="var(--text-tertiary)">
        {[
          { label: 'Memberships', val: d.membership_revenue },
          { label: 'Supplements', val: d.supplement_revenue },
          { label: 'Lockers',     val: d.locker_revenue },
        ].map(({ label, val }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
              ₹{(val || 0).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </Tile>
    </div>
  );
}
