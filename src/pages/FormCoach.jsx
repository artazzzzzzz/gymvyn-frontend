import { useRef, useState, useEffect, useCallback } from 'react'
import BottomNav from '../components/BottomNav'
import { getKeyAngles } from '../utils/poseUtils'
import { getExerciseRules } from '../utils/formRules'

// MediaPipe loaded via CDN script tags in index.html
const { Pose, POSE_CONNECTIONS } = window
const { Camera } = window
const { drawConnectors, drawLandmarks } = window

const EXERCISES = ['Squat', 'Push Up', 'Deadlift', 'Bicep Curl', 'Shoulder Press']
const INITIAL_SESSION = { totalReps: 0, repsHistory: [] }

function scoreColor(s) {
  if (s == null) return 'text-zinc-500'
  if (s >= 80) return 'text-[#00FF88]'
  if (s >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreDot(s) {
  if (s == null) return 'bg-zinc-600'
  if (s >= 80) return 'bg-[#00FF88]'
  if (s >= 50) return 'bg-yellow-400'
  return 'bg-red-400'
}

export default function FormCoach() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const poseRef = useRef(null)
  const cameraRef = useRef(null)

  // Refs consumed inside onResults — avoids stale closure without re-creating the callback
  const selectedRef = useRef(null)
  const phaseRef = useRef('up')
  const sessionRef = useRef({ ...INITIAL_SESSION })

  const [selected, setSelected] = useState(null)
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [repCount, setRepCount] = useState(0)
  const [formScore, setFormScore] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [sessionStats, setSessionStats] = useState(null)

  // Keep selectedRef in sync with state
  useEffect(() => { selectedRef.current = selected }, [selected])

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!results.poseLandmarks) return

    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF88', lineWidth: 2 })
    drawLandmarks(ctx, results.poseLandmarks, { color: '#FF4444', lineWidth: 1, radius: 4 })

    const rules = getExerciseRules(selectedRef.current)
    if (!rules) return

    const angles = getKeyAngles(results.poseLandmarks)

    const { score, feedback: fb } = rules.checkForm(angles)
    setFormScore(score)
    setFeedback(fb)

    const { newPhase, repCounted } = rules.countRep(angles, phaseRef.current)
    phaseRef.current = newPhase

    if (repCounted) {
      sessionRef.current.repsHistory.push(score)
      sessionRef.current.totalReps += 1
      setRepCount(sessionRef.current.totalReps)
    }
  }, [])

  const start = useCallback(async () => {
    phaseRef.current = 'up'
    sessionRef.current = { ...INITIAL_SESSION }
    setRepCount(0)
    setFormScore(null)
    setFeedback('')
    setSessionStats(null)
    setCameraError(null)
    setLoading(true)

    try {
      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      })
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      pose.onResults(onResults)
      await pose.initialize()
      poseRef.current = pose

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            await poseRef.current.send({ image: videoRef.current })
          }
        },
        width: 640,
        height: 480,
      })
      await camera.start()
      cameraRef.current = camera
      setActive(true)
    } catch (err) {
      const name = err?.name ?? ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('camera_denied')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('camera_missing')
      } else {
        setCameraError('generic')
      }
      console.error('Failed to start FormCoach:', err)
    } finally {
      setLoading(false)
    }
  }, [onResults])

  const stop = useCallback(() => {
    cameraRef.current?.stop()
    poseRef.current?.close()
    cameraRef.current = null
    poseRef.current = null

    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

    const { totalReps, repsHistory } = sessionRef.current
    if (totalReps > 0) {
      const avg = Math.round(repsHistory.reduce((a, b) => a + b, 0) / repsHistory.length)
      const best = Math.max(...repsHistory)
      setSessionStats({ totalReps, avgFormScore: avg, bestRepScore: best })
    }

    setActive(false)
  }, [])

  useEffect(() => () => stop(), [stop])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Form Coach</h1>
        <p className="text-zinc-400 text-sm mt-1">AI-powered real-time form analysis</p>
      </div>

      {/* Exercise selector */}
      <div className="px-5 mb-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3 font-medium">Select Exercise</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {EXERCISES.map((ex) => (
            <button
              key={ex}
              onClick={() => !active && setSelected(ex)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 border ${
                selected === ex
                  ? 'bg-[#00FF88] text-gray-950 border-[#00FF88]'
                  : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:border-white/20 hover:text-white'
              } ${active ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Camera area */}
      <div className="px-5 flex-1">
        <div
          className="relative w-full rounded-2xl overflow-hidden bg-gray-900 border border-white/[0.06]"
          style={{ aspectRatio: '4/3' }}
        >
          {/* Hidden video input for MediaPipe */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
            playsInline
            muted
          />

          {/* Skeleton canvas */}
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Inactive placeholder / camera error */}
          {!active && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              {cameraError ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5">
                      <path d="M23 7l-7 5 7 5V7z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      <line x1="2" y1="2" x2="22" y2="22" stroke="#f87171" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <p className="text-red-400 text-sm font-semibold">
                    {cameraError === 'camera_denied' && 'Camera access denied'}
                    {cameraError === 'camera_missing' && 'No camera found'}
                    {cameraError === 'generic' && 'Could not start camera'}
                  </p>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {cameraError === 'camera_denied' &&
                      'Open your browser settings, find this site under Camera permissions, set it to Allow, then reload the page.'}
                    {cameraError === 'camera_missing' &&
                      'No camera detected on this device.'}
                    {cameraError === 'generic' &&
                      'Something went wrong starting the camera. Try reloading the page.'}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="1.5">
                      <path d="M23 7l-7 5 7 5V7z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </div>
                  <p className="text-zinc-500 text-sm">
                    {selected ? 'Press Start to begin' : 'Select an exercise above'}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950/80">
              <div className="w-10 h-10 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-400 text-sm">Loading pose model…</p>
            </div>
          )}

          {/* ── Active overlays ── */}
          {active && (
            <>
              {/* LIVE badge — top left */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-xs font-semibold text-white tracking-wide">LIVE</span>
              </div>

              {/* Form score — top center */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2">
                <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${scoreDot(formScore)}`} />
                  <span className={`text-xl font-black tabular-nums leading-none ${scoreColor(formScore)}`}>
                    {formScore != null ? formScore : '--'}
                  </span>
                  <span className="text-zinc-500 text-[11px] leading-none">/ 100</span>
                </div>
              </div>

              {/* Exercise pill — top right */}
              {selected && (
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-xs font-medium text-[#00FF88]">{selected}</span>
                </div>
              )}

              {/* Rep counter — bottom left */}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-2.5 min-w-[64px]">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest leading-none mb-1">Reps</p>
                <p className="text-5xl font-black tabular-nums text-white leading-none">{repCount}</p>
              </div>

              {/* Feedback cue — bottom right */}
              {feedback && (
                <div className="absolute bottom-3 right-3 left-24 bg-black/60 backdrop-blur-sm rounded-2xl px-3 py-2.5 flex items-center">
                  <p className={`text-xs font-semibold leading-snug ${scoreColor(formScore)}`}>{feedback}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Start / Stop */}
        <button
          onClick={active ? stop : start}
          disabled={!selected || loading}
          className={`mt-5 w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200 ${
            active
              ? 'bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20'
              : 'bg-[#00FF88] text-gray-950 hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed'
          }`}
        >
          {loading ? 'Initializing…' : active ? 'Stop Session' : 'Start Session'}
        </button>

        {/* Session summary card */}
        {sessionStats && (
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Session Summary</h2>
              <button
                onClick={() => setSessionStats(null)}
                className="text-zinc-500 hover:text-white text-xs transition-colors"
              >
                dismiss
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Reps', value: sessionStats.totalReps, score: null },
                { label: 'Avg Score',  value: sessionStats.avgFormScore,  score: sessionStats.avgFormScore },
                { label: 'Best Rep',   value: sessionStats.bestRepScore,  score: sessionStats.bestRepScore },
              ].map(({ label, value, score }) => (
                <div key={label} className="flex flex-col items-center bg-white/[0.04] rounded-xl py-3 px-2">
                  <span className={`text-3xl font-black tabular-nums ${score != null ? scoreColor(score) : 'text-white'}`}>
                    {value}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wide text-center">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
