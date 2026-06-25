import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Camera as CameraIcon, AlertCircle, Loader2, Plus, Zap } from 'lucide-react'
import { getKeyAngles } from '../utils/poseUtils'
import { exercises as FORM_RULES } from '../utils/formRules'
import { getFormRule, hasFormDetection } from '../utils/formRuleMapping'
import { FaultDetector, voiceCoach } from '../utils/formFeedback'
import FormFeedbackOverlay from './FormFeedbackOverlay'

// ── Helpers ───────────────────────────────────────────────────────────────────

const INITIAL_SESSION = { totalReps: 0, repsHistory: [] }

function scoreColor(s) {
  if (s == null) return 'text-zinc-500'
  if (s >= 80)   return 'text-[#00FF88]'
  if (s >= 50)   return 'text-yellow-400'
  return 'text-red-400'
}

function scoreDot(s) {
  if (s == null) return 'bg-zinc-600'
  if (s >= 80)   return 'bg-[#00FF88]'
  if (s >= 50)   return 'bg-yellow-400'
  return 'bg-red-400'
}

function fmtTime(totalSecs) {
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FormCoachModal({ isOpen, onClose, exerciseName, onFormScore }) {
  // Resolve the rule key once per exerciseName.
  // getFormRule returns 'squat' | 'pushup' | 'bicep_curl' | 'guided'
  const ruleKey  = useMemo(() => getFormRule(exerciseName), [exerciseName])
  const isGuided = ruleKey === 'guided'

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const poseRef     = useRef(null)
  const cameraRef   = useRef(null)
  const ruleKeyRef  = useRef(ruleKey)
  const phaseRef    = useRef('up')
  const sessionRef  = useRef({ ...INITIAL_SESSION })
  const onFormScoreRef = useRef(onFormScore)
  const elapsedTimerRef = useRef(null)

  useEffect(() => { ruleKeyRef.current  = ruleKey },    [ruleKey])
  useEffect(() => { onFormScoreRef.current = onFormScore }, [onFormScore])

  // ── Fault detector — reinitialize whenever ruleKey changes ───────────────
  useEffect(() => {
    if (ruleKey && ruleKey !== 'guided') {
      faultDetectorRef.current = new FaultDetector(ruleKey)
    }
    return () => {
      faultDetectorRef.current = null
      if (voiceCoach) voiceCoach.cancel()
    }
  }, [ruleKey])

  // ── State ─────────────────────────────────────────────────────────────────
  const [running,     setRunning]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [repCount,    setRepCount]    = useState(0)    // auto-counted (AI mode)
  const [manualReps,  setManualReps]  = useState(0)    // tap-counted (guided mode)
  const [formScore,   setFormScore]   = useState(null)
  const [feedback,    setFeedback]    = useState('')
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [activeFaults,  setActiveFaults]  = useState([])
  const [primaryFault,  setPrimaryFault]  = useState(null)
  const [voiceEnabled,  setVoiceEnabled]  = useState(true)
  const [repPhase,      setRepPhase]      = useState('rest')
  const faultDetectorRef = useRef(null)

  // ── Elapsed timer (runs when session is active) ───────────────────────────
  useEffect(() => {
    if (running) {
      elapsedTimerRef.current = setInterval(() => setElapsedSecs(s => s + 1), 1000)
    } else {
      clearInterval(elapsedTimerRef.current)
    }
    return () => clearInterval(elapsedTimerRef.current)
  }, [running])

  // ── Stop / teardown ───────────────────────────────────────────────────────
  const stop = useCallback(({ silent = false } = {}) => {
    try { cameraRef.current?.stop() }  catch {}
    try { poseRef.current?.close() }   catch {}
    cameraRef.current = null
    poseRef.current   = null
    clearInterval(elapsedTimerRef.current)

    // Release camera light
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }

    const canvas = canvasRef.current
    if (canvas) {
      try { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height) } catch {}
    }

    if (!silent) {
      const { totalReps, repsHistory } = sessionRef.current
      if (totalReps > 0 && repsHistory.length > 0) {
        const avg = Math.round(repsHistory.reduce((a, b) => a + b, 0) / repsHistory.length)
        onFormScoreRef.current?.(avg)
      }
    }

    setRunning(false)
    setRepCount(0)
    setManualReps(0)
    setFormScore(null)
    setFeedback('')
    setElapsedSecs(0)
    sessionRef.current = { ...INITIAL_SESSION }
    phaseRef.current   = 'up'
  }, [])

  // ── Pose results callback ─────────────────────────────────────────────────
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!results.poseLandmarks) return

    // Always draw the skeleton — even in guided mode
    const { drawConnectors, drawLandmarks, POSE_CONNECTIONS } = window
    if (drawConnectors && POSE_CONNECTIONS) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF88', lineWidth: 2 })
    }
    if (drawLandmarks) {
      drawLandmarks(ctx, results.poseLandmarks, { color: 'var(--error)', lineWidth: 1, radius: 4 })
    }

    // In guided mode we only show the skeleton — no angle-based scoring
    const key = ruleKeyRef.current
    if (!key || key === 'guided') return

    const rules = FORM_RULES[key]
    if (!rules) return

    const angles = getKeyAngles(results.poseLandmarks)
    const { score, feedback: fb } = rules.checkForm(angles)
    setFormScore(score)
    setFeedback(fb)

    const prevPhase = phaseRef.current
    const { newPhase, repCounted } = rules.countRep(angles, phaseRef.current)
    phaseRef.current = newPhase
    if (newPhase !== prevPhase) setRepPhase(newPhase)

    if (repCounted) {
      sessionRef.current.repsHistory.push(score)
      sessionRef.current.totalReps += 1
      setRepCount(sessionRef.current.totalReps)
    }

    // ── Form fault detection ──────────────────────────────────────────────
    if (faultDetectorRef.current && angles) {
      const result = faultDetectorRef.current.processFrame(
        angles,
        results.poseLandmarks || null,
        newPhase
      )
      setActiveFaults(
        result.activeFaults
          .map(id => faultDetectorRef.current.rules.find(r => r.id === id))
          .filter(Boolean)
          .sort((a, b) => b.priority - a.priority)
      )
      setPrimaryFault(faultDetectorRef.current.getPrimaryFault())
    }
  }, [])

  // ── Start camera ─────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    // Allow start for both AI mode (rule key) and guided mode ('guided')
    if (running || ruleKeyRef.current == null) return
    setCameraError(null)
    setLoading(true)
    phaseRef.current   = 'up'
    sessionRef.current = { ...INITIAL_SESSION }

    const { Pose, Camera } = window
    if (!Pose || !Camera) {
      setCameraError('mediapipe_missing')
      setLoading(false)
      return
    }

    // Pre-check camera permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(t => t.stop())
    } catch (err) {
      setCameraError(
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
          ? 'camera_denied'
          : 'camera_missing'
      )
      setLoading(false)
      return
    }

    // 10-second timeout for WASM + camera init
    let timedOut = false
    const cameraTimeout = setTimeout(() => {
      timedOut = true
      setCameraError('generic')
      setLoading(false)
      try { poseRef.current?.close() } catch {}
      poseRef.current = null
    }, 10000)

    try {
      const pose = new Pose({
        locateFile: (file) => `https://unpkg.com/@mediapipe/pose@0.5.1675469404/${file}`,
      })
      pose.setOptions({
        modelComplexity:        1,
        smoothLandmarks:        true,
        enableSegmentation:     false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence:  0.5,
      })
      pose.onResults(onResults)
      await pose.initialize()
      if (timedOut) return
      poseRef.current = pose

      if (!videoRef.current) {
        clearTimeout(cameraTimeout)
        try { pose.close() } catch {}
        poseRef.current = null
        setCameraError('generic')
        setLoading(false)
        return
      }

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            await poseRef.current.send({ image: videoRef.current })
          }
        },
        width: 640, height: 480,
      })
      await camera.start()
      if (timedOut) { camera.stop(); return }
      clearTimeout(cameraTimeout)
      cameraRef.current = camera
      setRunning(true)
    } catch (err) {
      if (timedOut) return
      clearTimeout(cameraTimeout)
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
      if (!timedOut) {
        clearTimeout(cameraTimeout)
        setLoading(false)
      }
    }
  }, [onResults, running])

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen && (running || loading || poseRef.current || cameraRef.current)) {
      stop({ silent: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => () => stop({ silent: true }), [stop])

  function handleDone() {
    stop()
    onClose?.()
  }

  if (!isOpen) return null

  // Display rep count depending on mode
  const displayReps = isGuided ? manualReps : repCount

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-camera)] flex flex-col">

      {/* ── Top bar ── */}
      <header className="relative z-10 px-5 pt-12 pb-3 flex items-center justify-between gap-3 border-b border-white/[0.06]">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-1.5">
            Form Coach
            {exerciseName && (
              hasFormDetection(exerciseName) ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-semibold normal-case tracking-normal">
                  <Zap size={8} />AI
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[9px] font-semibold normal-case tracking-normal">
                  Guided
                </span>
              )
            )}
          </p>
          <h2 className="text-white font-semibold text-base truncate">
            {exerciseName || 'Form Coach'}
          </h2>
        </div>

        {/* Rep count chip (shown while running) */}
        {running && (
          <div className="shrink-0 px-3 py-1.5 rounded-xl bg-[var(--bg-card)]/[0.04] border border-white/[0.08] text-center">
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 leading-none">Reps</p>
            <p className="text-white font-mono font-bold text-lg leading-tight tabular-nums">{displayReps}</p>
          </div>
        )}

        {/* Elapsed timer chip (shown while running) */}
        {running && (
          <div className="shrink-0 px-3 py-1.5 rounded-xl bg-[var(--bg-card)]/[0.04] border border-white/[0.08] text-center">
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 leading-none">Time</p>
            <p className="text-white font-mono font-bold text-lg leading-tight tabular-nums">{fmtTime(elapsedSecs)}</p>
          </div>
        )}

        <button
          onClick={handleDone}
          className="shrink-0 w-9 h-9 rounded-xl bg-[var(--bg-card)]/[0.05] hover:bg-[var(--bg-card)]/[0.1] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          title="Done"
        >
          <X size={18} />
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">

        {/* No exercise provided — shouldn't happen from FormCoach.jsx but safe fallback */}
        {!exerciseName ? (
          <div className="m-auto bg-gray-900 border border-white/[0.08] rounded-2xl p-7 flex flex-col items-center gap-4 max-w-sm text-center">
            <AlertCircle size={22} className="text-zinc-500" />
            <p className="text-zinc-400 text-sm">No exercise selected.</p>
            <button onClick={onClose} className="px-5 py-2 rounded-xl bg-[var(--bg-card)]/[0.06] text-white text-sm font-medium">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* ── Camera / skeleton viewport ── */}
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

              {/* Form feedback overlay — fault alerts + rep counter */}
              {running && (
                <FormFeedbackOverlay
                  activeFaults={activeFaults}
                  primaryFault={primaryFault}
                  repCount={isGuided ? manualReps : repCount}
                  phase={repPhase}
                  exerciseName={exerciseName}
                  voiceEnabled={voiceEnabled}
                  onToggleVoice={() => {
                    const next = !voiceEnabled
                    setVoiceEnabled(next)
                    if (voiceCoach) voiceCoach.enabled = next
                    if (!next && voiceCoach) voiceCoach.cancel()
                  }}
                />
              )}

              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
                  <Loader2 size={28} className="text-[#00FF88] animate-spin" />
                  <p className="text-zinc-300 text-sm">Loading pose model…</p>
                </div>
              )}

              {/* Error overlay */}
              {cameraError && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <CameraIcon size={22} className="text-red-400" />
                  </div>
                  <p className="text-red-400 text-sm font-semibold">
                    {cameraError === 'camera_denied'     && 'Camera access denied'}
                    {cameraError === 'camera_missing'    && 'No camera found'}
                    {cameraError === 'mediapipe_missing' && 'Pose model not loaded'}
                    {cameraError === 'generic'           && 'Could not start camera'}
                  </p>
                  <p className="text-zinc-500 text-xs leading-relaxed max-w-xs">
                    {cameraError === 'camera_denied'     && 'Allow camera access in your browser settings, then close and reopen Form Coach.'}
                    {cameraError === 'camera_missing'    && 'No camera detected on this device.'}
                    {cameraError === 'mediapipe_missing' && 'Reload the page and try again — MediaPipe is still initialising.'}
                    {cameraError === 'generic'           && 'Something went wrong starting the camera. Try reloading the page.'}
                  </p>
                </div>
              )}

              {running && (
                <>
                  {/* LIVE badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <span className="text-xs font-semibold text-white tracking-wide">LIVE</span>
                  </div>

                  {/* AI mode: form score overlay */}
                  {!isGuided && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2">
                      <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${scoreDot(formScore)}`} />
                        <span className={`text-xl font-black tabular-nums leading-none ${scoreColor(formScore)}`}>
                          {formScore != null ? formScore : '--'}
                        </span>
                        <span className="text-zinc-500 text-[11px] leading-none">/ 100</span>
                      </div>
                    </div>
                  )}

                  {/* Guided mode: skeleton hint */}
                  {isGuided && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-max max-w-[90%]">
                      <div className="bg-black/70 backdrop-blur-sm rounded-xl px-3 py-1.5 text-center">
                        <p className="text-blue-300 text-xs font-medium">
                          Guided mode — use the skeleton overlay to check your form
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── AI mode: form feedback cue ── */}
            {!isGuided && running && feedback && (
              <div className="bg-gray-900 border border-white/[0.06] rounded-2xl px-4 py-3 flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${scoreDot(formScore)}`} />
                <p className={`text-sm font-medium leading-snug ${scoreColor(formScore)}`}>{feedback}</p>
              </div>
            )}

            {/* ── Guided mode: manual rep counter ── */}
            {isGuided && running && (
              <div className="bg-gray-900 border border-white/[0.06] rounded-2xl px-4 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-zinc-400 text-xs font-medium">Manual rep count</p>
                  <p className="text-white font-mono font-bold text-3xl leading-tight tabular-nums mt-0.5">
                    {manualReps}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setManualReps(n => Math.max(0, n - 1))}
                    className="w-11 h-11 rounded-full bg-[var(--bg-card)]/[0.06] border border-white/[0.1] text-zinc-300 hover:bg-[var(--bg-card)]/[0.12] active:scale-95 transition-all text-xl font-bold flex items-center justify-center"
                    aria-label="Remove rep"
                  >
                    −
                  </button>
                  <button
                    onClick={() => setManualReps(n => n + 1)}
                    className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 active:scale-95 transition-all flex items-center justify-center shadow-[0_0_18px_rgba(59,130,246,0.25)]"
                    aria-label="Add rep"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Start button ── */}
            {!running && !loading && !cameraError && (
              <button
                onClick={start}
                className="w-full py-3 rounded-xl bg-[#00FF88]/15 border border-[#00FF88]/30 text-[#00FF88] font-semibold text-sm hover:bg-[#00FF88]/25 transition-colors flex items-center justify-center gap-2"
              >
                <CameraIcon size={16} />
                Start Camera
              </button>
            )}

            {/* ── Stop button (only visible while running) ── */}
            {running && (
              <button
                onClick={() => stop()}
                className="w-full py-3 rounded-xl bg-[var(--bg-card)]/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white font-semibold text-sm hover:bg-[var(--bg-card)]/[0.08] transition-colors"
              >
                Stop Session
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
