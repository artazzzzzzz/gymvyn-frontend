const toCSV = (rows, headers) => {
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  const dataRows = rows.map(row =>
    headers.map(h => {
      const val = row[h.key] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
};

// ﻿ BOM makes Excel open UTF-8 CSVs correctly (important for Indian names)
const downloadBlob = (csvString, filename) => {
  const blob = new Blob(['﻿' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadAttendanceCSV = (data, period) => {
  if (!data?.length) return;
  const headers = [
    { key: 'name',           label: 'Member Name' },
    { key: 'check_in_count', label: 'Check-ins' },
    { key: 'last_check_in',  label: 'Last Check-in' },
  ];
  const filename = `attendance-${(period || 'report').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`;
  downloadBlob(toCSV(data, headers), filename);
};

export const downloadChurnCSV = (data, period) => {
  if (!data?.length) return;
  const headers = [
    { key: 'name',         label: 'Member Name' },
    { key: 'churn_score',  label: 'Churn Score' },
    { key: 'last_updated', label: 'Last Updated' },
  ];
  const filename = `churn-risk-${(period || 'report').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`;
  downloadBlob(toCSV(data, headers), filename);
};

export const downloadTrainerCSV = (data, period) => {
  if (!data?.length) return;
  const headers = [
    { key: 'name',               label: 'Trainer Name' },
    { key: 'client_count',       label: 'Clients' },
    { key: 'sessions_in_period', label: 'Sessions' },
    { key: 'revenue',            label: 'Revenue (Rs.)' },
  ];
  const filename = `trainer-performance-${(period || 'report').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`;
  downloadBlob(toCSV(data, headers), filename);
};
