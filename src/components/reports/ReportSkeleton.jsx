import React from 'react';

const shimmerStyle = `
  @keyframes report-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
`;

export default function ReportSkeleton({ height = 80, width = '100%', borderRadius = 10 }) {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div
        style={{
          height,
          width,
          borderRadius,
          background:
            'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-hover, var(--border)) 50%, var(--bg-elevated) 75%)',
          backgroundSize: '800px 100%',
          animation: 'report-shimmer 1.4s infinite linear',
        }}
      />
    </>
  );
}
