import { useState, useMemo, useEffect } from 'react'
import { EXERCISE_DATABASE, MUSCLE_GROUPS, searchExercises } from '../data/exerciseDatabase'
import ExerciseDetailSheet from './ExerciseDetailSheet'
import { supabase } from '../utils/supabase'

const C = {
  bg: 'var(--bg-pill)',
  card: 'var(--bg-card)',
  border: 'var(--border)',
  text: 'var(--text-primary)',
  sub: 'var(--text-secondary)',
  overlay: 'rgba(0,0,0,0.5)',
}

const muscleColors = {
  'Back':        { bg: 'var(--bg-pill)', text: 'var(--muscle-back)' },
  'Chest':       { bg: 'var(--bg-pill)', text: 'var(--muscle-chest)' },
  'Shoulders':   { bg: 'var(--bg-pill)', text: 'var(--muscle-shoulders)' },
  'Quads':       { bg: 'var(--bg-pill)', text: 'var(--muscle-legs)' },
  'Hamstrings':  { bg: 'var(--bg-pill)', text: 'var(--muscle-legs)' },
  'Glutes':      { bg: 'var(--bg-pill)', text: 'var(--muscle-legs)' },
  'Calves':      { bg: 'var(--bg-pill)', text: 'var(--muscle-legs)' },
  'Biceps':      { bg: 'var(--bg-pill)', text: 'var(--muscle-arms)' },
  'Triceps':     { bg: 'var(--bg-pill)', text: 'var(--muscle-arms)' },
  'Forearms':    { bg: 'var(--bg-pill)', text: 'var(--muscle-arms)' },
  'Core':        { bg: 'var(--bg-pill)', text: 'var(--muscle-core)' },
  'Cardio':      { bg: 'var(--bg-pill)', text: 'var(--muscle-cardio)' },
}

function getMuscleChip(muscle) {
  const primary = muscle?.split('·')[0]?.trim()
  return muscleColors[primary] || { bg: 'var(--bg-pill)', text: 'var(--text-secondary)' }
}

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

export default function ExercisePicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [activeMuscle, setActiveMuscle] = useState('All')
  const [detailName, setDetailName] = useState(null)
  const [thumbnailMap, setThumbnailMap] = useState({})

  useEffect(() => {
    supabase
      .from('exercise_metadata')
      .select('exercise_name, thumbnail_url')
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(row => {
            if (row.thumbnail_url) map[row.exercise_name.toLowerCase()] = row.thumbnail_url
          })
          setThumbnailMap(map)
        }
      })
  }, [])

  const filtered = useMemo(() => {
    return searchExercises(search, {
      muscle: activeMuscle === 'All' ? '' : activeMuscle,
    })
  }, [search, activeMuscle])

  const muscles = ['All', ...MUSCLE_GROUPS]

  const handleSelect = (ex) => {
    onSelect(ex)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: C.overlay,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: C.card,
        borderRadius: '20px 20px 0 0',
        maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
        </div>

        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 14px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-0.3px' }}>
            Add Exercise
          </span>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: C.bg, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconClose />
          </button>
        </div>

        {/* search */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.bg, borderRadius: 12,
            padding: '0 12px',
            border: `0.5px solid ${C.border}`,
            height: 44,
          }}>
            <IconSearch />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises…"
              autoFocus
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: 14, color: C.text, flex: 1,
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.sub, fontSize: 18, lineHeight: 1 }}
              >×</button>
            )}
          </div>
        </div>

        {/* muscle filter pills */}
        <div style={{
          display: 'flex', gap: 7, padding: '10px 16px',
          overflowX: 'auto', scrollbarWidth: 'none',
          flexShrink: 0,
        }}>
          {muscles.map(m => {
            const active = activeMuscle === m
            return (
              <button
                key={m}
                onClick={() => setActiveMuscle(m)}
                style={{
                  padding: '6px 13px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                  border: active ? 'none' : `0.5px solid ${C.border}`,
                  background: active ? C.text : C.card,
                  color: active ? 'var(--bg-card)' : C.sub,
                  transition: 'all 0.12s',
                }}
              >{m}</button>
            )
          })}
        </div>

        {/* count */}
        <div style={{ padding: '0 16px 8px', fontSize: 12, color: C.sub }}>
          {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
        </div>

        {/* exercise list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
              color: C.sub, fontSize: 14,
            }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              No exercises found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filtered.map((ex, i) => {
                const chip = getMuscleChip(ex.muscle)
                return (
                  <ExerciseRow
                    key={ex.id ?? i}
                    ex={ex}
                    chip={chip}
                    thumb={thumbnailMap[ex.name?.toLowerCase()]}
                    onSelect={() => handleSelect(ex)}
                    onInfo={() => setDetailName(ex.name)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ExerciseDetailSheet
        isOpen={!!detailName}
        exerciseName={detailName}
        onClose={() => setDetailName(null)}
      />
    </div>
  )
}

function ExerciseRow({ ex, chip, thumb, onSelect, onInfo }) {
  const [pressed, setPressed] = useState(false)
  const abbreviation = ex.muscle?.split('·')[0]?.trim()?.slice(0, 2)?.toUpperCase() || '??'
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '6px 4px', minHeight: 60,
        borderBottom: `0.5px solid ${C.border}`,
      }}
    >
      {/* Tappable main area → add exercise */}
      <div
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        onClick={onSelect}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0,
          cursor: 'pointer', padding: '6px 0',
          background: pressed ? C.bg : 'transparent',
          borderRadius: 8, transition: 'background 0.1s',
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={ex.name}
            onError={e => { e.currentTarget.style.display = 'none' }}
            style={{
              width: 44, height: 44, borderRadius: 10,
              objectFit: 'cover', flexShrink: 0,
              background: 'var(--bg-elevated)',
            }}
          />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: chip.bg, color: chip.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
          }}>
            {abbreviation}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 2 }}>
            {ex.name}
          </div>
          <div style={{ fontSize: 13, color: C.sub }}>
            {ex.muscle}{ex.equipment ? ` · ${ex.equipment}` : ''}
          </div>
        </div>

        <IconChevronRight />
      </div>

      {/* Info icon — opens detail sheet without adding */}
      <button
        onClick={e => { e.stopPropagation(); onInfo() }}
        style={{
          width: 32, height: 32, borderRadius: 8, border: 'none', flexShrink: 0,
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-cta)',
        }}
        title="Exercise info"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </button>
    </div>
  )
}
