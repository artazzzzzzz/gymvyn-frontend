import { useState } from 'react';

const getRange = (preset) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (preset === 'this_month') {
    return {
      from: new Date(y, m, 1).toISOString().split('T')[0],
      to: new Date(y, m + 1, 0).toISOString().split('T')[0],
      label: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    };
  }
  if (preset === 'last_month') {
    return {
      from: new Date(y, m - 1, 1).toISOString().split('T')[0],
      to: new Date(y, m, 0).toISOString().split('T')[0],
      label: new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    };
  }
  if (preset === 'last_3_months') {
    return {
      from: new Date(y, m - 2, 1).toISOString().split('T')[0],
      to: new Date(y, m + 1, 0).toISOString().split('T')[0],
      label: 'Last 3 Months',
    };
  }
  return null;
};

export const useReportDateRange = () => {
  const [preset, setPreset] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range =
    preset === 'custom'
      ? { from: customFrom, to: customTo, label: `${customFrom} to ${customTo}` }
      : getRange(preset);

  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range };
};
