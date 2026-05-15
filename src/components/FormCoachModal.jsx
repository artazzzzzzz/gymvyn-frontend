import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Camera as CameraIcon, AlertCircle, Loader2 } from 'lucide-react'
import { getKeyAngles } from '../utils/poseUtils'
import { exercises as FORM_RULES } from '../utils/formRules'

const INITIAL_SESSION = { totalReps: 0, repsHistory: [] }

const PICKER_LABELS = {
  squat: 'Squat',
  pushup: 'Push Up',
  bicep_curl: 'Bicep Curl',
}

function humaniseKey(k) {
  return PICKER_LABELS[k] ?? k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function normalise(s) {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function resolveRuleKey(name) {
  const n = normalise(name)
  if (!n) return null
  for (const key of Object.keys(FORM_RULES)) {
    const k = normalise(key)
    if (n === k || n.includes(k) || k.includes(n)) return key
  }
  return null
}

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

export default function FormCoachModal({ isOpen, onClose, exerciseName, onFormScore }) {
  const propKey = useMemo(() => resolveRuleKey(exerciseName), [exerciseName])
  const isPickerMode = !exerciseName
  const [pickedKey, setPickedKey] = useState(null)
  const activeKey = isPickerMode ? pickedKey : propKey

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const poseRef = useRef(null)
  const cameraRef = useRef(null)
  const activeKeyRef = useRef(activeKey)
  const phaseRef = useRef('up')
  const sessionRef = useRef({ ...INITIAL_SESSION })

  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [repCount, setRepCount] = useState(0)
  const [formScore, setFormScore] = useState(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => { activeKeyRef.current = activeKey }, [activeKey])

  // Reset picker selection whenever the modal reopens with a new prop
  useEffect(() => {
    if (isOpen && isPickerMode) setPickedKey(null)
  }, [isOpen, isPickerMode])

  const stop = useCallback(({ silent = false } = {}) => {
    try { cameraRef.current?.stop() } catch {}
    try { poseRef.current?.close() } catch {}
    cameraRef.current = null
    poseRef.current = null

    const canvas = canvasRef.current
    if (canvas) {
      try { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height) } catch {}
    }

    if (!silent) {
      const { totalReps, repsHistory } = sessionRef.current
      if (totalReps > 0) {
        const avg = Math.round(repsHistory.reduce((a, b) => a + b, 0) / repsHistory.length)
        onFormScore?.(avg)
      }
    }

    setRunning(false)
    setRepCount(0)
    setFormScore(null)
    setFeedback('')
    sessionRef.current = { ...INITIAL_SESSION }
    phaseRef.current = 'up'
  }, [onFormScore])

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!results.poseLandmarks) return

    const { drawConnectors, drawLandmarks, POSE_CONNECTIONS } = window
    if (drawConnectors && POSE_CONNECTIONS) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF88', lineWidth: 2 })
    }
    if (drawLandmarks) {
      drawLandmarks(ctx, results.poseLandmarks, { color: '#FF4444', lineWidth: 1, radius: 4 })
    }

    const key = activeKeyRef.current
    const rules = key ? FORM_RULES[key] : null
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
    if (running || !activeKeyRef.current) return
    setCameraError(null)
    setLoading(true)
    phaseRef.current = 'up'
    sessionRef.current = { ...INITIAL_SESSION }

    const { Pose, Camera } = window
    if (!Pose || !Camera) {
      setCameraError('mediapipe_missing')
      setLoading(false)
      return
    }

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
      setRunning(true)
    } catch (err) {
      const name = err?.name ?? ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('camera_denied')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('camera_missing')
      } else {
        setCameraError('generic')
      }
      console.error('[FormCoachModal] start failed:', err)
    } finally {
      setLoading(false)
    }
  }, [onResults, running])

  // Auto-start when opened with a resolved key; stop when closed
  useEffect(() => {
    if (isOpen && activeKey && !running && !loading) {
      start()
    }
    if (!isOpen && (running || loading || poseRef.current || cameraRef.current)) {
      stop({ silent: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeKey])

  // Stop on unmount
  useEffect(() => () => stop({ silent: true }), [stop])

  function handleDone() {
    stop()
    onClose?.()
  }

  if (!isOpen) return null

  const showUnavailable = !isPickerMode && !propKey
  const showPicker = isPickerMode && !pickedKey
  const ruleKeys = Object.keys(FORM_RULES)

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <header className="relative z-10 px-5 pt-12 pb-3 flex items-center justify-between gap-3 border-b border-white/[0.06]">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Form Coach</p>
          <h2 className="text-white font-semibold text-base truncate">
            {activeKey ? humaniseKey(activeKey) : (exerciseName || 'Select exercise')}
          </h2>
        </div>
        {running && (
          <div className="shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 leading-none">Reps</p>
            <p className="text-white font-mono font-bold text-lg leading-tight tabular-nums">{repCount}</p>
          </div>
        )}
        <button
          onClick={handleDone}
          className="shrink-0 w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          title="Done"
        >
          <X size={18} />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {showUnavailable ? (
          <div className="m-auto bg-gray-900 border border-white/[0.08] rounded-2xl p-7 flex flex-col items-center gap-4 max-w-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 ring-1 ring-inset ring-yellow-500/30 flex items-center justify-center">
              <AlertCircle size={22} className="text-yellow-300" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Form tracking not available</p>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                We don't have a form-coaching model for "{exerciseName}" yet. Try Squat, Push Up, or Bicep Curl.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-semibold text-sm transition-colors"
            >
              Close
            </button>
          </div>
        ) : showPicker ? (
          <div className="m-auto w-full max-w-sm space-y-4">
            <p className="text-zinc-400 text-sm text-center">Choose an exercise to begin coaching</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {ruleKeys.map(k => (
                <button
                  key={k}
                  onClick={() => setPickedKey(k)}
                  className="px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-white text-sm font-medium hover:bg-[#00FF88]/15 hover:border-[#00FF88]/30 hover:text-[#00FF88] transition-colors"
                >
                  {humaniseKey(k)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div
              className="relative w-full rounded-2xl overflow-hidden bg-gray-900 border border-white/[0.06]"
              style={{ aspectRatio: '4/3' }}
            >
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full"
                style={{ transform: 'scaleX(-1)' }}
              />

              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
                  <Loader2 size={28} className="text-[#00FF88] animate-spin" />
                  <p className="text-zinc-300 text-sm">Loading pose model…</p>
                </div>
              )}

              {cameraError && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <CameraIcon size={22} className="text-red-400" />
                  </div>
                  <p className="text-red-400 text-sm font-semibold">
                    {cameraError === 'camera_denied' && 'Camera access denied'}
                    {cameraError === 'camera_missing' && 'No camera found'}
                    {cameraError === 'mediapipe_missing' && 'Pose model not loaded'}
                    {cameraError === 'generic' && 'Could not start camera'}
                  </p>
                  <p className="text-zinc-500 text-xs leading-relaxed max-w-xs">
                    {cameraError === 'camera_denied' && 'Allow camera access in your browser settings, then close and reopen Form Coach.'}
                    {cameraError === 'camera_missing' && 'No camera detected on this device.'}
                    {cameraError === 'mediapipe_missing' && 'Reload the page and try again — MediaPipe is still initialising.'}
                    {cameraError === 'generic' && 'Something went wrong starting the camera. Try reloading the page.'}
                  </p>
                </div>
              )}

              {running && (
                <>
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <span className="text-xs font-semibold text-white tracking-wide">LIVE</span>
                  </div>

                  <div className="absolute top-3 left-1/2 -translate-x-1/2">
                    <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${scoreDot(formScore)}`} />
                      <span className={`text-xl font-black tabular-nums leading-none ${scoreColor(formScore)}`}>
                        {formScore != null ? formScore : '--'}
                      </span>
                      <span className="text-zinc-500 text-[11px] leading-none">/ 100</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cues */}
            {running && feedback && (
              <div className="bg-gray-900 border border-white/[0.06] rounded-2xl px-4 py-3 flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${scoreDot(formScore)}`} />
                <p className={`text-sm font-medium leading-snug ${scoreColor(formScore)}`}>{feedback}</p>
              </div>
            )}

            {!running && !loading && !cameraError && (
              <p className="text-center text-zinc-500 text-xs">Initialising camera…</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
