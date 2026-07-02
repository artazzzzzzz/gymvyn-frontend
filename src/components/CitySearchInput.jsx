import { useEffect, useRef, useState } from 'react';
import { CITIES } from '../utils/cities';

const IconSearch = ({ color = 'var(--text-tertiary)' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const MAX_RESULTS = 10;

function rankCities(query, list) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return list
    .filter(c => c.toLowerCase().includes(q))
    .sort((a, b) => {
      const aL = a.toLowerCase(), bL = b.toLowerCase();
      const aStarts = aL.startsWith(q) ? 0 : 1;
      const bStarts = bL.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      if (aL.length !== bL.length) return aL.length - bL.length;
      return aL.localeCompare(bL);
    })
    .slice(0, MAX_RESULTS);
}

// Reusable searchable-city input — search-as-you-type, results capped at 10,
// ranked by best match. Used by every screen in the app that collects a city
// (trainer onboarding, gym onboarding, gym settings, trainer settings) so the
// matching/ranking logic lives in exactly one place.
export function CitySearchInput({
  value,
  onChange,
  placeholder = 'Search city…',
  variant = 'bar', // 'bar' (bordered pill + icon, e.g. Clients search) | 'compact' (blends into a settings row)
  align = 'left',
  style,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const results = rankCities(value || '', CITIES);

  const isBar = variant === 'bar';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      <div style={
        isBar
          ? {
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-card)', borderRadius: 12, padding: '10px 12px',
              border: '1px solid var(--border)',
            }
          : { display: 'flex', alignItems: 'center', gap: 6 }
      }>
        {isBar && <IconSearch />}
        <input
          type="text"
          value={value || ''}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: isBar ? 14 : 15, color: 'var(--text-primary)', flex: 1,
            fontFamily: 'inherit', textAlign: align, width: '100%',
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
          maxHeight: 240, overflowY: 'auto', zIndex: 50,
        }}>
          {results.map(city => (
            <div
              key={city}
              onClick={() => { onChange(city); setOpen(false); }}
              style={{
                padding: '10px 14px', fontSize: 14, cursor: 'pointer',
                color: 'var(--text-primary)', textAlign: 'left',
              }}
            >
              {city}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
