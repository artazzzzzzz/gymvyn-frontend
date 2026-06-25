import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import ReportSkeleton from './ReportSkeleton';

export default function RevenueTrendChart({ data, loading }) {
  if (loading) return <ReportSkeleton height={220} />;

  if (!data || data.length === 0) {
    return (
      <div style={{
        height: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontSize: 14,
      }}>
        No revenue data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis
          dataKey="month"
          tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
          labelStyle={{ color: 'var(--text-primary)' }}
          formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
        />
        <Bar dataKey="revenue" fill="var(--chart-line)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
