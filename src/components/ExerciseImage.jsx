import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { getExerciseImages } from '../data/exerciseImages'

function FallbackIcon() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
      <Dumbbell size={32} className="text-zinc-700" />
    </div>
  )
}

/**
 * ExerciseImage
 *
 * Props:
 *   exerciseName  string   — used to look up image URLs
 *   className     string   — applied to the wrapper div (should set height/aspect)
 *   showToggle    bool     — show Start / End pill buttons (default false)
 */
export default function ExerciseImage({ exerciseName, className = '', showToggle = false }) {
  const [position, setPosition] = useState(0)   // 0 = start/image, 1 = end/gif
  const [error,    setError]    = useState(false)
  const [loading,  setLoading]  = useState(true)

  const images = getExerciseImages(exerciseName)
  const src    = position === 0 ? images?.image : images?.gif

  const handleError = () => { setError(true); setLoading(false) }
  const handleLoad  = () => { setLoading(false) }

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {/* Fallback — shown when no URL or image 404d */}
      {(error || !src) && <FallbackIcon />}

      {/* Skeleton shimmer while loading */}
      {loading && !error && src && (
        <div className="absolute inset-0 animate-pulse bg-white/[0.04]" />
      )}

      {/* Actual image — hidden until loaded, hidden on error */}
      {src && (
        <img
          key={src}                         // remount when src changes
          src={src}
          alt={exerciseName}
          className={[
            'w-full h-full object-contain transition-opacity duration-300',
            loading || error ? 'opacity-0 absolute inset-0' : 'opacity-100',
          ].join(' ')}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Start / End toggle */}
      {showToggle && images && !error && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button
            onClick={() => { setPosition(0); setLoading(true); setError(false) }}
            className={[
              'text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors',
              position === 0
                ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-inset ring-emerald-500/40'
                : 'bg-black/50 text-zinc-400 hover:text-zinc-200',
            ].join(' ')}
          >
            Start
          </button>
          <button
            onClick={() => { setPosition(1); setLoading(true); setError(false) }}
            className={[
              'text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors',
              position === 1
                ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-inset ring-emerald-500/40'
                : 'bg-black/50 text-zinc-400 hover:text-zinc-200',
            ].join(' ')}
          >
            End
          </button>
        </div>
      )}
    </div>
  )
}
