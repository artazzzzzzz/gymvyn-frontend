import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { EXERCISE_DATABASE, MUSCLE_GROUPS, searchExercises, hasAIFormDetection } from '../data/exerciseDatabase'

const muscleColors = {
  'Back':        { bg: '#EAF3DE', text: '#3B6D11', abbr: 'BK' },
  'Chest':       { bg: '#E6F1FB', text: '#0C447C', abbr: 'CH' },
  'Shoulders':   { bg: '#FAEEDA', text: '#854F0B', abbr: 'SH' },
  'Quads':       { bg: '#FAECE7', text: '#993C1D', abbr: 'QD' },
  'Hamstrings':  { bg: '#FAECE7', text: '#993C1D', abbr: 'HM' },
  'Glutes':      { bg: '#FAECE7', text: '#993C1D', abbr: 'GL' },
  'Calves':      { bg: '#FAECE7', text: '#993C1D', abbr: 'CV' },
  'Biceps':      { bg: '#F1EFE8', text: '#5F5E5A', abbr: 'BI' },
  'Triceps':     { bg: '#F1EFE8', text: '#5F5E5A', abbr: 'TR' },
  'Forearms':    { bg: '#F1EFE8', text: '#5F5E5A', abbr: 'FA' },
  'Core':        { bg: '#E1F5EE', text: '#0F6E56', abbr: 'CR' },
  'Cardio':      { bg: '#FCEBEB', text: '#A32D2D', abbr: 'CD' },
}

const getMuscleColor = (muscle) => {
  const primary = muscle?.split('·')[0]?.trim()
  return muscleColors[primary] || { bg: '#F1EFE8', text: '#666', abbr: primary?.slice(0, 2)?.toUpperCase() || '??' }
}

export default function ExerciseLibrary() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const detailBase = pathname.startsWith('/trainer') ? '/trainer/exercise' : '/exercise'
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [sortMode, setSortMode] = useState('alpha')

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
    <div className="flex items-center gap-2 py-2 mt-2 bg-[#F7F7F5] sticky top-[112px] z-10">
      <span className="text-[10px] font-medium uppercase tracking-widest text-[#999]">{muscle}</span>
      <span className="text-[10px] bg-[#F1EFE8] text-[#999] px-2 py-0.5 rounded-full">{count}</span>
    </div>
  )

  const ExerciseRow = ({ exercise }) => {
    const color = getMuscleColor(exercise.muscle)
    const hasAI = hasAIFormDetection(exercise.name)
    return (
      <div
        onClick={() => navigate(`${detailBase}/${encodeURIComponent(exercise.name)}`)}
        className="bg-white rounded-xl border border-black/[0.06] p-4 mb-2 flex items-center cursor-pointer active:bg-[#F7F7F5] transition-colors"
      >
        <div
          className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: color.bg }}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: color.text }}>
            {color.abbr}
          </span>
        </div>
        <div className="flex-1 ml-3 min-w-0">
          <p className="text-sm font-medium text-[#111] truncate">{exercise.name}</p>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {[exercise.muscle, exercise.equipment].filter(Boolean).map((tag, i) => (
              <span key={i} className="text-[11px] bg-[#F1EFE8] text-[#666] px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
          {hasAI && (
            <span className="text-[10px] font-medium uppercase bg-[#E1F5EE] text-[#0F6E56] px-1.5 py-0.5 rounded-md tracking-wider">AI</span>
          )}
          <span className="text-[#CCC] text-sm">›</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]">

      {/* Fixed Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/5 h-14 flex items-center px-5">
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-[#999]">← Back</button>
        <span className="absolute left-1/2 -translate-x-1/2 text-base font-medium text-[#111]">Exercise Library</span>
      </div>

      {/* Sticky Search + Filters */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-black/5">
        {/* Search */}
        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999] text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${EXERCISE_DATABASE.length} exercises…`}
              className="w-full h-10 bg-[#F1EFE8] rounded-xl pl-8 pr-8 text-sm text-[#111] placeholder-[#999] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] text-sm"
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
                  ? 'bg-[#111] text-white'
                  : 'bg-white border border-black/10 text-[#111]'
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
          <span className="text-[13px] text-[#999]">{filteredExercises.length} exercises</span>
          <button
            onClick={() => setSortMode(s => s === 'alpha' ? 'muscle' : 'alpha')}
            className="text-[13px] font-medium text-[#185FA5]"
          >
            Sort {sortMode === 'alpha' ? 'A–Z ↕' : 'Muscle ↕'}
          </button>
        </div>

        {/* Empty state */}
        {filteredExercises.length === 0 && (
          <div className="flex flex-col items-center mt-20">
            <div className="w-12 h-12 rounded-full bg-[#F1EFE8] flex items-center justify-center text-2xl">🔍</div>
            <p className="text-base font-medium text-[#111] mt-4">No exercises found</p>
            <p className="text-[13px] text-[#999] mt-1">Try a different search or filter</p>
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
