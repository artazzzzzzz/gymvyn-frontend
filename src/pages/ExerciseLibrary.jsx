import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { EXERCISE_DATABASE, MUSCLE_GROUPS, searchExercises, hasAIFormDetection } from '../data/exerciseDatabase'
import { supabase } from '../utils/supabase'

const muscleColors = {
  'Back':        { bg: 'var(--bg-pill)', text: 'var(--muscle-back)', abbr: 'BK' },
  'Chest':       { bg: 'var(--bg-pill)', text: 'var(--muscle-chest)', abbr: 'CH' },
  'Shoulders':   { bg: 'var(--bg-pill)', text: 'var(--muscle-shoulders)', abbr: 'SH' },
  'Quads':       { bg: 'var(--bg-pill)', text: 'var(--muscle-legs)', abbr: 'QD' },
  'Hamstrings':  { bg: 'var(--bg-pill)', text: 'var(--muscle-legs)', abbr: 'HM' },
  'Glutes':      { bg: 'var(--bg-pill)', text: 'var(--muscle-legs)', abbr: 'GL' },
  'Calves':      { bg: 'var(--bg-pill)', text: 'var(--muscle-legs)', abbr: 'CV' },
  'Biceps':      { bg: 'var(--bg-pill)', text: 'var(--muscle-arms)', abbr: 'BI' },
  'Triceps':     { bg: 'var(--bg-pill)', text: 'var(--muscle-arms)', abbr: 'TR' },
  'Forearms':    { bg: 'var(--bg-pill)', text: 'var(--muscle-arms)', abbr: 'FA' },
  'Core':        { bg: 'var(--bg-pill)', text: 'var(--muscle-core)', abbr: 'CR' },
  'Cardio':      { bg: 'var(--bg-pill)', text: 'var(--muscle-cardio)', abbr: 'CD' },
}

const getMuscleColor = (muscle) => {
  const primary = muscle?.split('·')[0]?.trim()
  return muscleColors[primary] || { bg: 'var(--bg-pill)', text: "var(--text-secondary)", abbr: primary?.slice(0, 2)?.toUpperCase() || '??' }
}

export default function ExerciseLibrary() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const detailBase = pathname.startsWith('/trainer') ? '/trainer/exercise' : '/exercise'
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [sortMode, setSortMode] = useState('alpha')
  const [thumbnailMap, setThumbnailMap] = useState({})

  useEffect(() => {
    supabase
      .from('exercise_metadata')
      .select('exercise_name, thumbnail_url')
      .then(({ data }) => {
        if (!data) return
        const map = {}
        data.forEach(row => { if (row.thumbnail_url) map[row.exercise_name] = row.thumbnail_url })
        setThumbnailMap(map)
      })
  }, [])

  const filters = ['All', ...MUSCLE_GROUPS]

  const filteredExercises = useMemo(() => {
    let list = searchQuery.trim()
      ? searchExercises(searchQuery)
      : [...EXERCISE_DATABASE]

    if (activeFilter !== 'All') {
      list = list.filter(ex => ex.muscle?.toLowerCase().includes(activeFilter.toLowerCase()))
    }

    if (sortMode === 'alpha') list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [searchQuery, activeFilter, sortMode])

  const groupedExercises = useMemo(() => {
    if (activeFilter !== 'All' || searchQuery) return null
    const groups = {}
    MUSCLE_GROUPS.forEach(m => { groups[m] = [] })
    filteredExercises.forEach(ex => {
      const primary = ex.muscle?.split('·')[0]?.trim() || 'Other'
      if (groups[primary]) groups[primary].push(ex)
      else groups['Other'] = [...(groups['Other'] || []), ex]
    })
    return Object.entries(groups).filter(([, v]) => v.length > 0)
  }, [filteredExercises, activeFilter, searchQuery])

  const SectionHeader = ({ muscle, count }) => (
    <div className="flex items-center gap-2 py-2 mt-2 bg-[var(--bg-primary)] sticky top-[112px] z-10">
      <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-tertiary)]">{muscle}</span>
      <span className="text-[10px] bg-[var(--bg-pill)] text-[var(--text-tertiary)] px-2 py-0.5 rounded-full">{count}</span>
    </div>
  )

  const ExerciseRow = ({ exercise }) => {
    const color = getMuscleColor(exercise.muscle)
    const hasAI = hasAIFormDetection(exercise.name)
    const thumbUrl = thumbnailMap[exercise.name]
    return (
      <div
        onClick={() => navigate(`${detailBase}/${encodeURIComponent(exercise.name)}`)}
        className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-2 flex items-center cursor-pointer active:bg-[var(--bg-primary)] transition-colors"
      >
        <div className="w-12 h-12 rounded-[10px] shrink-0 relative overflow-hidden" style={{ backgroundColor: color.bg }}>
          {thumbUrl && (
            <img
              src={thumbUrl}
              alt={exercise.name}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
          <div
            className="w-full h-full absolute inset-0 items-center justify-center"
            style={{ display: thumbUrl ? 'none' : 'flex', backgroundColor: color.bg }}
          >
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: color.text }}>
              {color.abbr}
            </span>
          </div>
        </div>
        <div className="flex-1 ml-3 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{exercise.name}</p>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {[exercise.muscle, exercise.equipment].filter(Boolean).map((tag, i) => (
              <span key={i} className="text-[11px] bg-[var(--bg-pill)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
          {hasAI && (
            <span className="text-[10px] font-medium uppercase bg-[var(--success-bg)] text-[var(--success)] px-1.5 py-0.5 rounded-md tracking-wider">AI</span>
          )}
          <span className="text-[var(--text-tertiary)] text-sm">›</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* Fixed Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)] h-14 flex items-center px-5 pt-safe">
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-[var(--text-tertiary)]">← Back</button>
        <span className="absolute left-1/2 -translate-x-1/2 text-base font-medium text-[var(--text-primary)]">Exercise Library</span>
      </div>

      {/* Sticky Search + Filters */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-[var(--bg-card)] border-b border-[var(--border)]">
        {/* Search */}
        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${EXERCISE_DATABASE.length} exercises…`}
              className="w-full h-10 bg-[var(--bg-pill)] rounded-xl pl-8 pr-8 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-sm"
              >×</button>
            )}
          </div>
        </div>
        {/* Filter chips */}
        <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto scrollbar-hide">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 h-8 px-3 rounded-xl text-[13px] font-medium transition-colors ${
                activeFilter === f
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="pt-[124px] px-5 pb-10">

        {/* Results count + sort */}
        <div className="flex items-center justify-between py-2 mb-1">
          <span className="text-[13px] text-[var(--text-tertiary)]">{filteredExercises.length} exercises</span>
          <button
            onClick={() => setSortMode(s => s === 'alpha' ? 'muscle' : 'alpha')}
            className="text-[13px] font-medium text-[var(--text-cta)]"
          >
            Sort {sortMode === 'alpha' ? 'A–Z ↕' : 'Muscle ↕'}
          </button>
        </div>

        {/* Empty state */}
        {filteredExercises.length === 0 && (
          <div className="flex flex-col items-center mt-20">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-pill)] flex items-center justify-center text-[var(--text-tertiary)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p className="text-base font-medium text-[var(--text-primary)] mt-4">No exercises found</p>
            <p className="text-[13px] text-[var(--text-tertiary)] mt-1">Try a different search or filter</p>
          </div>
        )}

        {/* Grouped list (All filter, no search) */}
        {groupedExercises && groupedExercises.map(([muscle, exs]) => (
          <div key={muscle}>
            <SectionHeader muscle={muscle} count={exs.length} />
            {exs.map(ex => <ExerciseRow key={ex.id || ex.name} exercise={ex} />)}
          </div>
        ))}

        {/* Flat list (filtered or searched) */}
        {!groupedExercises && filteredExercises.map(ex => (
          <ExerciseRow key={ex.id || ex.name} exercise={ex} />
        ))}

      </div>
    </div>
  )
}
