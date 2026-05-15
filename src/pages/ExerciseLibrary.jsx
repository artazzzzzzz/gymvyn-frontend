import { useState } from 'react'
import { Search, Dumbbell, ScanLine, ChevronDown, AlertCircle } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { useExercises } from '../hooks/useExercises'
import { exercises as FORM_RULES } from '../utils/formRules'

// ─── Style helpers ───────────────────────────────────────────────────────────

const ARMS_COLOUR = { bg: 'bg-orange-500/15', text: 'text-orange-300', ring: 'ring-orange-500/30' }

const MUSCLE_COLOURS = {
  chest:     { bg: 'bg-red-500/15',     text: 'text-red-300',     ring: 'ring-red-500/30'     },
  back:      { bg: 'bg-blue-500/15',    text: 'text-blue-300',    ring: 'ring-blue-500/30'    },
  legs:      { bg: 'bg-green-500/15',   text: 'text-green-300',   ring: 'ring-green-500/30'   },
  shoulders: { bg: 'bg-purple-500/15',  text: 'text-purple-300',  ring: 'ring-purple-500/30'  },
  arms:      ARMS_COLOUR,
  biceps:    ARMS_COLOUR,
  triceps:   ARMS_COLOUR,
  core:      { bg: 'bg-yellow-500/15',  text: 'text-yellow-300',  ring: 'ring-yellow-500/30'  },
  cardio:    { bg: 'bg-teal-500/15',    text: 'text-teal-300',    ring: 'ring-teal-500/30'    },
}

const DEFAULT_COLOUR = { bg: 'bg-gray-500/15', text: 'text-gray-300', ring: 'ring-gray-500/30' }

function muscleColour(group) {
  if (!group) return DEFAULT_COLOUR
  return MUSCLE_COLOURS[group.toLowerCase()] ?? DEFAULT_COLOUR
}

const DIFFICULTY_STYLES = {
  beginner:     'bg-green-500/15 text-green-300 ring-green-500/30',
  intermediate: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  advanced:     'bg-red-500/15 text-red-300 ring-red-500/30',
}

function difficultyClass(d) {
  return DIFFICULTY_STYLES[(d ?? '').toLowerCase()] ?? 'bg-gray-500/15 text-gray-300 ring-gray-500/30'
}

const FORM_RULE_KEYS = new Set(Object.keys(FORM_RULES))

function hasFormCoach(name) {
  if (!name) return false
  const key = name.toLowerCase().replace(/\s+/g, '_')
  return FORM_RULE_KEYS.has(key)
}

// ─── Pieces ─────────────────────────────────────────────────────────────────

function Badge({ className = '', children }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset ${className}`}>
      {children}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-2/3 rounded bg-white/[0.06]" />
        <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />
      </div>
      <div className="flex gap-2">
        <div className="h-3 w-16 rounded-full bg-white/[0.06]" />
        <div className="h-3 w-20 rounded-full bg-white/[0.06]" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 w-full rounded bg-white/[0.04]" />
        <div className="h-2.5 w-4/5 rounded bg-white/[0.04]" />
      </div>
    </div>
  )
}

function ExerciseCard({ ex }) {
  const [expanded, setExpanded] = useState(false)
  const colour = muscleColour(ex.muscle_group)
  const formCoach = hasFormCoach(ex.name)

  return (
    <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-3 hover:border-white/[0.15] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-white font-semibold text-sm leading-snug">{ex.name}</h3>
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${colour.bg} ring-1 ring-inset ${colour.ring}`}>
          <Dumbbell size={16} className={colour.text} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ex.muscle_group && (
          <Badge className={`${colour.bg} ${colour.text} ${colour.ring}`}>
            {ex.muscle_group}
          </Badge>
        )}
        {ex.equipment && (
          <Badge className="bg-white/[0.05] text-gray-300 ring-white/10">
            {ex.equipment}
          </Badge>
        )}
        {ex.difficulty && (
          <Badge className={difficultyClass(ex.difficulty)}>
            {ex.difficulty}
          </Badge>
        )}
        {formCoach && (
          <Badge className="bg-emerald-500/15 text-emerald-300 ring-emerald-500/30">
            <ScanLine size={9} className="mr-1" />
            Form Coach
          </Badge>
        )}
      </div>

      {ex.instructions && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className={`text-left text-xs text-gray-400 leading-relaxed transition-colors hover:text-gray-200 ${expanded ? '' : 'line-clamp-2'}`}
        >
          {ex.instructions}
        </button>
      )}
    </div>
  )
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <div className="relative flex-1">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-gray-900 border border-white/[0.07] rounded-xl pl-3.5 pr-9 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/20 transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
      />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ExerciseLibrary() {
  const {
    filteredExercises,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    muscleGroup,
    setMuscleGroup,
    equipment,
    setEquipment,
    muscleGroups,
    equipmentList,
  } = useExercises()

  return (
    <div className="min-h-screen bg-gray-950 pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[480px] h-[220px] bg-orange-500/[0.05] blur-[90px] rounded-full pointer-events-none" />

      <header className="relative z-10 px-5 pt-12 pb-5">
        <h1 className="text-2xl font-bold text-white">Exercise Library</h1>
        <p className="text-gray-500 text-sm mt-0.5">Browse the full catalog</p>
      </header>

      <div className="relative z-10 px-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search exercises…"
            className="w-full bg-gray-900 border border-white/[0.07] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/20 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <FilterSelect
            value={muscleGroup}
            onChange={setMuscleGroup}
            placeholder="All muscles"
            options={muscleGroups}
          />
          <FilterSelect
            value={equipment}
            onChange={setEquipment}
            placeholder="All equipment"
            options={equipmentList}
          />
        </div>

        {/* Count */}
        {!loading && !error && (
          <p className="text-xs text-gray-500 font-medium">
            {filteredExercises.length} {filteredExercises.length === 1 ? 'exercise' : 'exercises'}
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs leading-relaxed">{error}</p>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
              <Search size={22} className="text-gray-500" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">No exercises found</p>
              <p className="text-gray-500 text-xs mt-1">Try adjusting your filters or search</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredExercises.map(ex => (
              <ExerciseCard key={ex.id ?? ex.name} ex={ex} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
