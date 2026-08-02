import React, { useState } from 'react';
import { FileText, CalendarCheck, AlertTriangle, Dumbbell } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { downloadAttendanceCSV, downloadChurnCSV, downloadTrainerCSV } from '../../utils/reportExports';

const BASE = import.meta.env.VITE_API_URL;

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const btnBase = {
  marginTop: 4,
  width: '100%',
  padding: '8px 0',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
};

const btnDisabled = { ...btnBase, opacity: 0.5, cursor: 'not-allowed' };

function DownloadCard({ icon, iconColor, label, sublabel, children }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: iconColor }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{sublabel}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function DownloadReportsSection({
  gymId,
  range,
  attendanceData,
  attendanceError,
  churnData,
  churnError,
  trainerData,
  attendanceLoading,
  churnLoading,
  trainerLoading,
  trainerError,
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const attendanceUnavailable = attendanceLoading || attendanceError;
  const churnUnavailable = churnLoading || churnError;
  const trainerUnavailable = trainerLoading || trainerError;

  const handlePDF = async () => {
    if (!gymId || pdfLoading) return;
    try {
      setPdfLoading(true);
      const token = await getToken();
      const params = new URLSearchParams();
      if (range?.from) params.set('from', range.from);
      if (range?.to) params.set('to', range.to);
      const res = await fetch(
        `${BASE}/api/reports/${gymId}/pdf/monthly-revenue?${params}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-report-${range?.from?.slice(0, 7) || 'current'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* Revenue PDF */}
      <DownloadCard
        icon={<FileText size={18} />}
        iconColor="var(--xp-gold)"
        label="Revenue Report"
        sublabel={range?.label || ''}
      >
        <button style={pdfLoading ? btnDisabled : btnBase} onClick={handlePDF} disabled={pdfLoading}>
          {pdfLoading ? 'Generating…' : 'Download PDF'}
        </button>
      </DownloadCard>

      {/* Attendance CSV */}
      <DownloadCard
        icon={<CalendarCheck size={18} />}
        iconColor="var(--success)"
        label="Attendance Report"
        sublabel={range?.label || ''}
      >
        <button
          style={attendanceUnavailable ? btnDisabled : btnBase}
          disabled={attendanceUnavailable}
          title={attendanceError ? 'Attendance data is unavailable for this report range.' : undefined}
          onClick={() => downloadAttendanceCSV(attendanceData, range?.label)}
        >
          {attendanceLoading ? 'Loading…' : attendanceError ? 'Unavailable' : 'Download CSV'}
        </button>
        {attendanceError && <div role="alert" style={{ color: 'var(--error)', fontSize: 11 }}>Attendance data could not be loaded for this report range.</div>}
      </DownloadCard>

      {/* Churn Risk CSV */}
      <DownloadCard
        icon={<AlertTriangle size={18} />}
        iconColor="var(--error)"
        label="Churn Risk Report"
        sublabel="Members at risk"
      >
        <button
          style={churnUnavailable ? btnDisabled : btnBase}
          disabled={churnUnavailable}
          title={churnError ? 'Churn-risk data is unavailable for this report range.' : undefined}
          onClick={() => downloadChurnCSV(churnData, range?.label)}
        >
          {churnLoading ? 'Loading…' : churnError ? 'Unavailable' : 'Download CSV'}
        </button>
        {churnError && <div role="alert" style={{ color: 'var(--error)', fontSize: 11 }}>Churn-risk data could not be loaded for this report range.</div>}
      </DownloadCard>

      {/* Trainer Performance CSV */}
      <DownloadCard
        icon={<Dumbbell size={18} />}
        iconColor="var(--text-secondary)"
        label="Trainer Performance"
        sublabel={range?.label || ''}
      >
        <button
          style={trainerUnavailable ? btnDisabled : btnBase}
          disabled={trainerUnavailable}
          title={trainerError ? 'Trainer-performance data is unavailable for this report range.' : undefined}
          onClick={() => downloadTrainerCSV(trainerData, range?.label)}
        >
          {trainerLoading ? 'Loading…' : trainerError ? 'Unavailable' : 'Download CSV'}
        </button>
        {trainerError && <div role="alert" style={{ color: 'var(--error)', fontSize: 11 }}>Trainer-performance data could not be loaded. Retry the Trainer Performance section above.</div>}
      </DownloadCard>
    </div>
  );
}
