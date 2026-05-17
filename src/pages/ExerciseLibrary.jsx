import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Search, X, ChevronRight, Dumbbell } from 'lucide-react'
import { useExercises } from '../hooks/useExercises'
import BottomNav from '../components/BottomNav'

// ── Category mapping ─────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Push', 'Pull', 'Legs', 'Hinge', 'Core']

function getCategory(ex) {
  const mg   = (ex.muscle_group ?? '').toLowerCase()
  const name = (ex.name ?? '').toLowerCase()
  if (mg === 'hamstrings' && (name.includes('deadlift') || name.includes('morning'))) return 'Hinge'
  if (['chest', 'triceps', 'shoulders'].includes(mg)) return 'Push'
  if (['back', 'biceps', 'forearms'].includes(mg))    return 'Pull'
  if (['legs', 'quads', 'glutes', 'calves', 'hamstrings'].includes(mg)) return 'Legs'
  if (mg === 'core') return 'Core'
  return 'Other'
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ExerciseLibrary() {
  const navigate = useNavigate()
  const { allExercises, loading } = useExercises()
  const [search,         setSearch]         = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allExercises.filter(ex => {
      const matchSearch   = !q || ex.name.toLowerCase().includes(q)
      const matchCategory = activeCategory === 'All' || getCategory(ex) === activeCategory
      return matchSearch && matchCategory
    })
  }, [allExercises, search, activeCategory])

  return (
    <div className="min-h-screen bg-gray-950 pb-28 overflow-x-hidden">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur-sm px-5 pt-12 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/workout')}
            className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold text-white">Exercises</h1>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                'shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors',
                activeCategory === cat
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/[0.06] text-zinc-400 hover:text-zinc-200',
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* ── List ── */}
      <div className="px-5 pt-4">

        {/* Count */}
        {!loading && (
          <p className="text-zinc-500 text-xs mb-3">
            {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3.5 border-b border-white/[0.04]">
                <div className="w-10 h-10 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 bg-white/[0.06] rounded-full animate-pulse" />
                  <div className="h-2.5 w-20 bg-white/[0.04] rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Dumbbell size={28} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No exercises found</p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
            {filtered.map((ex, idx) => {
              const initial = (ex.muscle_group ?? 'X')[0].toUpperCase()
              return (
                <button
                  key={ex.id ?? ex.name}
                  onClick={() => navigate(`/exercise/${encodeURIComponent(ex.name)}`)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors text-left',
                    idx < filtered.length - 1 ? 'border-b border-white/[0.04]' : '',
                  ].join(' ')}
                >
                  {/* Initial circle */}
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">{initial}</span>
                  </div>

                  {/* Name + muscle */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm leading-snug truncate">{ex.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5 truncate">{ex.muscle_group}</p>
                  </div>

                  {/* Chevron */}
                  <ChevronRight size={15} className="text-zinc-600 shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
