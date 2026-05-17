import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Search, Dumbbell } from 'lucide-react'
import { useExercises } from '../hooks/useExercises'
import BottomNav from '../components/BottomNav'
import ExerciseImage from '../components/ExerciseImage'

// ── Category mapping ────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Push', 'Pull', 'Legs', 'Hinge', 'Core', 'Cardio', 'Other']

function getCategory(ex) {
  const mg = (ex.muscle_group ?? '').toLowerCase()
  const name = (ex.name ?? '').toLowerCase()
  if (mg === 'hamstrings' && (name.includes('deadlift') || name.includes('morning'))) return 'Hinge'
  if (['chest', 'triceps', 'shoulders'].includes(mg)) return 'Push'
  if (['back', 'biceps', 'forearms'].includes(mg)) return 'Pull'
  if (['legs', 'quads', 'glutes', 'calves', 'hamstrings'].includes(mg)) return 'Legs'
  if (mg === 'core') return 'Core'
  if (name.includes('rope') || name.includes('cardio')) return 'Cardio'
  return 'Other'
}


// ─── Page ───────────────────────────────────────────────────────────────────────

export default function ExerciseLibrary() {
  const navigate = useNavigate()
  const { allExercises, loading } = useExercises()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allExercises.filter(ex => {
      const matchSearch = !q || ex.name.toLowerCase().includes(q)
      const matchCategory = activeCategory === 'All' || getCategory(ex) === activeCategory
      return matchSearch && matchCategory
    })
  }, [allExercises, search, activeCategory])

  return (
    <div className="min-h-screen bg-gray-950 pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[480px] h-[220px] bg-emerald-500/[0.04] blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/workout')}
            className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-white">Exercise Library</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full bg-gray-900 border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
        </div>
      </header>

      {/* Category tabs */}
      <div className="relative z-10 px-5 mb-5">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors',
                activeCategory === cat
                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30'
                  : 'text-zinc-500 hover:text-zinc-300',
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="relative z-10 px-5">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Dumbbell size={28} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No exercises found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(ex => {
              const category = getCategory(ex)
              return (
                <button
                  key={ex.id ?? ex.name}
                  onClick={() => navigate(`/exercise/${encodeURIComponent(ex.name)}`)}
                  className="text-left bg-white/[0.03] hover:bg-white/[0.06] active:scale-[0.97] border border-white/[0.07] rounded-2xl overflow-hidden transition-all"
                >
                  <ExerciseImage
                    exerciseName={ex.name}
                    className="aspect-[3/2]"
                  />
                  <div className="p-3">
                    <p className="text-white font-semibold text-sm leading-snug truncate">{ex.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-emerald-400 text-[11px] font-medium truncate">
                        {ex.muscle_group}
                      </span>
                      <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-wider shrink-0 ml-1">
                        {category}
                      </span>
                    </div>
                  </div>
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
