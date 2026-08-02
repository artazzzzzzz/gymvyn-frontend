import { useState, useEffect, useCallback } from 'react';
import { useOwnerGymId } from '../../hooks/useOwnerGymId';
import { useReportDateRange } from '../../hooks/useReportDateRange';
import {
  fetchSummary,
  fetchRevenueTrend,
  fetchTopMembers,
  fetchTrainerPerformance,
  fetchAttendance,
  fetchChurnRisk,
} from '../../hooks/useReportsData';
import GymBottomNav from '../../components/GymBottomNav';
import MoreSheet from '../../components/MoreSheet';
import SummaryTiles from '../../components/reports/SummaryTiles';
import RevenueTrendChart from '../../components/reports/RevenueTrendChart';
import TopMembersList from '../../components/reports/TopMembersList';
import TrainerPerformanceTable from '../../components/reports/TrainerPerformanceTable';
import DownloadReportsSection from '../../components/reports/DownloadReportsSection';

const PRESETS = [
  { key: 'this_month',    label: 'This Month' },
  { key: 'last_month',    label: 'Last Month' },
  { key: 'last_3_months', label: 'Last 3 Months' },
  { key: 'custom',        label: 'Custom' },
];

function SectionHeader({ title, sublabel }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      {sublabel && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{sublabel}</div>}
    </div>
  );
}

export default function GymReports({ embedded = false } = {}) {
  const gymId = useOwnerGymId();
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range } = useReportDateRange();
  const reportFrom = range?.from;
  const reportTo = range?.to;
  const [moreOpen, setMoreOpen] = useState(false);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  const [trend, setTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState(null);

  const [topMembers, setTopMembers] = useState([]);
  const [topLoading, setTopLoading] = useState(true);
  const [topError, setTopError] = useState(null);

  const [trainers, setTrainers] = useState([]);
  const [trainersLoading, setTrainersLoading] = useState(true);
  const [trainersError, setTrainersError] = useState(null);

  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [churn, setChurn] = useState([]);
  const [churnLoading, setChurnLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    if (!gymId || !reportFrom || !reportTo) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(await fetchSummary(gymId, reportFrom, reportTo));
    } catch (err) {
      console.error('summary:', err);
      setSummaryError(err);
    } finally {
      setSummaryLoading(false);
    }
  }, [gymId, reportFrom, reportTo]);

  const loadRevenueTrend = useCallback(async () => {
    if (!gymId || !reportFrom || !reportTo) return;
    setTrendLoading(true);
    setTrendError(null);
    try {
      setTrend(await fetchRevenueTrend(gymId, reportFrom, reportTo));
    } catch (err) {
      console.error('trend:', err);
      setTrendError(err);
    } finally {
      setTrendLoading(false);
    }
  }, [gymId, reportFrom, reportTo]);

  const loadTopMembers = useCallback(async () => {
    if (!gymId || !reportFrom || !reportTo) return;
    setTopLoading(true);
    setTopError(null);
    try {
      setTopMembers(await fetchTopMembers(gymId, reportFrom, reportTo));
    } catch (err) {
      console.error('topMembers:', err);
      setTopError(err);
    } finally {
      setTopLoading(false);
    }
  }, [gymId, reportFrom, reportTo]);

  const loadTrainerPerformance = useCallback(async () => {
    if (!gymId || !reportFrom || !reportTo) return;
    setTrainersLoading(true);
    setTrainersError(null);
    try {
      setTrainers(await fetchTrainerPerformance(gymId, reportFrom, reportTo));
    } catch (err) {
      console.error('trainers:', err);
      setTrainersError(err);
    } finally {
      setTrainersLoading(false);
    }
  }, [gymId, reportFrom, reportTo]);

  useEffect(() => {
    if (!gymId || !reportFrom || !reportTo) return;

    loadSummary();
    loadRevenueTrend();
    loadTopMembers();
    loadTrainerPerformance();

    setAttendanceLoading(true);
    fetchAttendance(gymId, reportFrom, reportTo)
      .then(setAttendance)
      .catch(err => console.error('attendance:', err))
      .finally(() => setAttendanceLoading(false));

    setChurnLoading(true);
    fetchChurnRisk(gymId)
      .then(setChurn)
      .catch(err => console.error('churn:', err))
      .finally(() => setChurnLoading(false));
  }, [gymId, reportFrom, reportTo, loadSummary, loadRevenueTrend, loadTopMembers, loadTrainerPerformance]);

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          Reports &amp; Analytics
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          {range?.label || ''}
        </div>
      </div>

      {/* Date range selector */}
      <div style={{ padding: '16px 16px 0', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
          {PRESETS.map(p => {
            const active = preset === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 99,
                  border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`,
                  background: active ? 'var(--bg-elevated)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <div style={{ padding: '12px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>From</div>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>To</div>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Content sections */}
      <div style={{ padding: '24px 16px 0', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Summary tiles */}
        <div>
          <SummaryTiles data={summary} loading={summaryLoading} error={summaryError} onRetry={loadSummary} />
        </div>

        {/* Revenue Trend */}
        <div>
          <SectionHeader title="Revenue Trend" sublabel={range?.label} />
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 8px 8px',
          }}>
            <RevenueTrendChart data={trend} loading={trendLoading} error={trendError} onRetry={loadRevenueTrend} />
          </div>
        </div>

        {/* Top Members */}
        <div>
          <SectionHeader title="Top Members" sublabel={range?.label} />
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
          }}>
            <TopMembersList data={topMembers} loading={topLoading} error={topError} onRetry={loadTopMembers} />
          </div>
        </div>

        {/* Trainer Performance */}
        <div>
          <SectionHeader title="Trainer Performance" sublabel={range?.label} />
          <TrainerPerformanceTable data={trainers} loading={trainersLoading} error={trainersError} onRetry={loadTrainerPerformance} />
        </div>

        {/* Download Reports */}
        <div>
          <SectionHeader title="Download Reports" sublabel="Export data for offline use" />
          <DownloadReportsSection
            gymId={gymId}
            range={range}
            attendanceData={attendance}
            churnData={churn}
            trainerData={trainers}
            attendanceLoading={attendanceLoading}
            churnLoading={churnLoading}
            trainerLoading={trainersLoading}
          />
        </div>
      </div>

      {!embedded && (
        <>
          <GymBottomNav onMorePress={() => setMoreOpen(true)} />
          <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
        </>
      )}
    </div>
  );
}
