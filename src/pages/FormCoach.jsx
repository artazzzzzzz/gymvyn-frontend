import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useExercises } from '../hooks/useExercises'
import { getFormRule } from '../utils/formRuleMapping'
import { EXERCISE_DATABASE, hasAIFormDetection } from '../data/exerciseDatabase'
import FormCoachModal from '../components/FormCoachModal'
import FormFeedbackOverlay from '../components/FormFeedbackOverlay'
import { FaultDetector, voiceCoach } from '../utils/formFeedback'

const BACKEND_URL = import.meta.env.VITE_API_URL

// ── Fallback list if EXERCISE_DATABASE unavailable ───────────────────────────

const FALLBACK_LIST = [
  { name: 'Squat',          muscleGroup: 'Quads · Glutes',   equipment: 'Bodyweight', bg: 'var(--bg-pill)', text: 'var(--muscle-legs)', abbr: 'SQ' },
  { name: 'Deadlift',       muscleGroup: 'Back · Hamstrings', equipment: 'Barbell',    bg: 'var(--bg-pill)', text: 'var(--muscle-back)', abbr: 'DL' },
  { name: 'Bench Press',    muscleGroup: 'Chest · Triceps',  equipment: 'Barbell',    bg: 'var(--bg-pill)', text: 'var(--muscle-chest)', abbr: 'BP' },
  { name: 'Push Up',        muscleGroup: 'Chest · Shoulders',equipment: 'Bodyweight', bg: 'var(--bg-pill)', text: 'var(--muscle-chest)', abbr: 'PU' },
  { name: 'Bicep Curl',     muscleGroup: 'Biceps',           equipment: 'Dumbbell',   bg: 'var(--bg-pill)', text: 'var(--muscle-arms)', abbr: 'BI' },
  { name: 'Overhead Press', muscleGroup: 'Shoulders',        equipment: 'Barbell',    bg: 'var(--bg-pill)', text: 'var(--muscle-shoulders)', abbr: 'OP' },
  { name: 'Pull Up',        muscleGroup: 'Back · Biceps',    equipment: 'Bodyweight', bg: 'var(--bg-pill)', text: 'var(--muscle-back)', abbr: 'PU' },
  { name: 'Lunge',          muscleGroup: 'Quads · Glutes',   equipment: 'Bodyweight', bg: 'var(--bg-pill)', text: 'var(--muscle-legs)', abbr: 'LN' },
]

// ── Muscle color helper ───────────────────────────────────────────────────────

const getMuscleColor = (ex) => {
  if (ex.bg) return { bg: ex.bg, text: ex.text, abbr: ex.abbr || ex.name.slice(0, 2).toUpperCase() }
  const map = {
    'Back':      'var(--bg-pill)/var(--muscle-back)/BK',
    'Chest':     'var(--bg-pill)/var(--muscle-chest)/CH',
    'Shoulders': 'var(--bg-pill)/var(--muscle-shoulders)/SH',
    'Quads':     'var(--bg-pill)/var(--muscle-legs)/QD',
    'Biceps':    'var(--bg-pill)/var(--muscle-arms)/BI',
    'Triceps':   'var(--bg-pill)/var(--muscle-arms)/TR',
    'Core':      'var(--bg-pill)/var(--muscle-core)/CR',
  }
  const primary = ex.muscleGroup?.split('·')[0]?.trim() || ex.muscle || 'Other'
  const val = map[primary] || 'var(--bg-pill)/var(--text-secondary)/??'
  const [bg, text, abbr] = val.split('/')
  return { bg, text, abbr }
}

// ── Score color helpers ───────────────────────────────────────────────────────

const scoreColor = (s) => s >= 85 ? 'var(--success)' : s >= 65 ? 'var(--warning)' : 'var(--error)'
const scoreBg    = (s) => s >= 85 ? 'var(--success-bg)'  : s >= 65 ? 'var(--warning-bg)'  : 'var(--error-bg)'

// ── Mock feedback (shown when camera is off) ──────────────────────────────────

const mockFeedback = {
  score: 72,
  faults: [{
    title: 'Knees caving inward',
    desc: 'Push your knees out in line with your toes throughout the movement.',
  }],
  goods: [{
    title: 'Depth is good',
    desc: 'Hitting parallel consistently.',
  }],
}

// ── Angle calculation ─────────────────────────────────────────────────────────

function calcAngle(a, b, c) {
  const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let ang = Math.abs(rad * 180 / Math.PI)
  if (ang > 180) ang = 360 - ang
  return ang
}

function getLandmarkAngles(lm) {
  return {
    leftKnee:      calcAngle(lm[23], lm[25], lm[27]),
    rightKnee:     calcAngle(lm[24], lm[26], lm[28]),
    leftHip:       calcAngle(lm[11], lm[23], lm[25]),
    rightHip:      calcAngle(lm[12], lm[24], lm[26]),
    leftElbow:     calcAngle(lm[11], lm[13], lm[15]),
    rightElbow:    calcAngle(lm[12], lm[14], lm[16]),
    leftShoulder:  calcAngle(lm[23], lm[11], lm[13]),
    rightShoulder: calcAngle(lm[24], lm[12], lm[14]),
  }
}

// Maps getFormRule() output ('pushup') to FORM_FEEDBACK_RULES key ('push_up')
function getFeedbackKey(ruleKey) {
  return ruleKey === 'pushup' ? 'push_up' : ruleKey
}

// Rep counting config per exercise type
const REP_CONFIG = {
  squat:      { down: 100, up: 160, getPrimary: a => (a.leftKnee + a.rightKnee) / 2 },
  pushup:     { down: 90,  up: 150, getPrimary: a => (a.leftElbow + a.rightElbow) / 2 },
  bicep_curl: { down: 65,  up: 150, getPrimary: a => (a.leftElbow + a.rightElbow) / 2 },
}

// MediaPipe CDN scripts — pinned to exact matching versions (jsdelivr, not unpkg)
// Mismatched versions cause "Aborted(Module.arguments has been replaced)" WASM errors.
const MEDIAPIPE_SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js',
]

// Pinned version base URL used for locateFile (WASM assets must match pose.js version)
const MEDIAPIPE_POSE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FormCoach() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const location  = useLocation()
  const preSelected = location.state?.exercise ?? null

  const { allExercises, loading } = useExercises()

  // Refs
  const videoRef            = useRef(null)
  const canvasRef           = useRef(null)
  const poseRef             = useRef(null)
  const cameraRef           = useRef(null)
  const detectorRef         = useRef(null)
  const repCountRef         = useRef(0)
  const setCountRef         = useRef(0)
  const phaseRef            = useRef('rest')
  const selectedExerciseRef = useRef('squat')
  const onResultsRef        = useRef(null)

  // State
  const [modalExercise,    setModalExercise]     = useState(null)
  const [selectedExercise, setSelectedExercise] = useState('squat')
  const [isCameraActive,   setIsCameraActive]   = useState(false)
  const [exerciseSearch,   setExerciseSearch]   = useState('')
  const [repCount,         setRepCount]         = useState(0)
  const [setCount,         setSetCount]         = useState(0)
  const [formScore,        setFormScore]        = useState(0)
  const [feedback,         setFeedback]         = useState({ faults: [], goods: [] })
  const [facingMode,       setFacingMode]       = useState('user')
  const [phase,            setPhase]            = useState('rest')
  const [activeFaults,     setActiveFaults]     = useState([])
  const [primaryFault,     setPrimaryFault]     = useState(null)
  const [voiceEnabled,     setVoiceEnabled]     = useState(true)
  const [mediaPipeReady,   setMediaPipeReady]   = useState(false)

  // Keep refs in sync with state
  useEffect(() => { selectedExerciseRef.current = selectedExercise }, [selectedExercise])
  useEffect(() => { if (voiceCoach) voiceCoach.enabled = voiceEnabled }, [voiceEnabled])

  // AI exercises
  const aiExercises = EXERCISE_DATABASE
    ? EXERCISE_DATABASE.filter(ex => hasAIFormDetection(ex.name))
    : FALLBACK_LIST

  const filteredAI = exerciseSearch
    ? aiExercises.filter(e => e.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
    : aiExercises

  // Auto-open modal when navigated from LiveSession
  useEffect(() => {
    if (!preSelected || !allExercises.length) return
    const found = allExercises.find(e => e.name === preSelected)
    if (found) setModalExercise(found)
  }, [preSelected, allExercises])

  // Load MediaPipe scripts once on mount
  useEffect(() => {
    let loaded = 0
    const check = () => { if (++loaded === MEDIAPIPE_SCRIPTS.length) setMediaPipeReady(true) }
    MEDIAPIPE_SCRIPTS.forEach(src => {
      if (document.querySelector(`script[src="${src}"]`)) { check(); return }
      const s = document.createElement('script')
      s.src = src
      s.crossOrigin = 'anonymous'
      s.onload = check
      s.onerror = check
      document.head.appendChild(s)
    })
  }, [])

  // Reinitialize FaultDetector when exercise changes while camera is running
  useEffect(() => {
    if (isCameraActive && detectorRef.current) {
      const key = getFeedbackKey(getFormRule(selectedExercise))
      detectorRef.current = new FaultDetector(key)
    }
  }, [selectedExercise, isCameraActive])

  // onResults: draw skeleton, count reps, run fault detection
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Sync canvas buffer size to CSS-rendered size every frame
    const w = canvas.offsetWidth || 640
    const h = canvas.offsetHeight || 480
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!results.poseLandmarks) return
    const lm = results.poseLandmarks

    // Draw skeleton
    if (window.drawConnectors && window.POSE_CONNECTIONS) {
      window.drawConnectors(ctx, lm, window.POSE_CONNECTIONS, {
        color: 'rgba(255,255,255,0.55)',
        lineWidth: 2,
      })
    }
    if (window.drawLandmarks) {
      window.drawLandmarks(ctx, lm, {
        color: '#00FF9F',
        lineWidth: 1,
        radius: 4,
      })
    }

    // Compute joint angles
    let angles
    try { angles = getLandmarkAngles(lm) } catch { return }

    // Rep phase detection and counting
    const ruleKey = getFormRule(selectedExerciseRef.current)
    const repCfg  = REP_CONFIG[ruleKey]
    if (repCfg) {
      const primary  = repCfg.getPrimary(angles)
      const prevPhase = phaseRef.current
      let newPhase = prevPhase

      if (primary < repCfg.down) {
        newPhase = 'down'
      } else if (primary > repCfg.up) {
        if (prevPhase === 'down') {
          // Completed one rep
          repCountRef.current += 1
          setRepCount(repCountRef.current)
          if (repCountRef.current % 10 === 0) {
            setCountRef.current += 1
            setSetCount(setCountRef.current)
          }
        }
        newPhase = 'up'
      }

      if (newPhase !== prevPhase) {
        phaseRef.current = newPhase
        setPhase(newPhase)
      }
    }

    // Fault detection
    if (detectorRef.current) {
      const currentPhase = phaseRef.current === 'rest' ? 'any' : phaseRef.current
      const { activeFaults: faultIds } = detectorRef.current.processFrame(angles, lm, currentPhase)
      const faultObjects = detectorRef.current.rules.filter(r => faultIds.includes(r.id))
      const primary = detectorRef.current.getPrimaryFault()

      setActiveFaults(faultObjects)
      setPrimaryFault(primary)

      const score = Math.max(0, 100 - faultIds.length * 20)
      setFormScore(score)

      setFeedback({
        score,
        faults: faultObjects.slice(0, 2).map(f => ({ title: f.message, desc: f.voice || '' })),
        goods: faultIds.length === 0 && repCountRef.current > 0
          ? [{ title: 'Form looking good!', desc: 'Keep it up.' }]
          : [],
      })
    }
  }, []) // all mutable state accessed via refs; state setters are stable

  // Keep onResultsRef current so the MediaPipe callback never goes stale
  useEffect(() => { onResultsRef.current = onResults }, [onResults])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: 640, height: 480 },
      })

      const video = videoRef.current
      if (!video) return
      video.srcObject = stream

      // Reset counters
      repCountRef.current = 0
      setCountRef.current = 0
      phaseRef.current = 'rest'
      setRepCount(0)
      setSetCount(0)
      setPhase('rest')
      setActiveFaults([])
      setPrimaryFault(null)
      setFormScore(0)
      setFeedback({ faults: [], goods: [] })
      setIsCameraActive(true)

      // Initialize FaultDetector
      const feedbackKey = getFeedbackKey(getFormRule(selectedExerciseRef.current))
      detectorRef.current = new FaultDetector(feedbackKey)

      const initPose = () => {
        if (!window.Pose || !window.Camera) {
          // Scripts haven't finished loading — retry shortly
          setTimeout(initPose, 500)
          return
        }

        // Guard against double-init (e.g. HMR re-mount)
        if (poseRef.current) return

        const pose = new window.Pose({
          // locateFile MUST point to the same pinned version so the WASM
          // binary and packed assets don't mismatch pose.js (causes the
          // "Aborted(Module.arguments has been replaced)" runtime error).
          locateFile: f => `${MEDIAPIPE_POSE_CDN}/${f}`,
        })
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        pose.onResults(r => onResultsRef.current(r))
        poseRef.current = pose

        // Camera must be initialized AFTER pose is assigned to poseRef
        const camera = new window.Camera(video, {
          onFrame: async () => {
            if (videoRef.current && poseRef.current) {
              await poseRef.current.send({ image: videoRef.current })
            }
          },
          width: 640,
          height: 480,
        })
        cameraRef.current = camera
        camera.start()
      }

      if (video.readyState >= 2) {
        initPose()
      } else {
        video.addEventListener('loadeddata', initPose, { once: true })
      }
    } catch (err) {
      console.error('[FormCoach] Camera error:', err)
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    cameraRef.current?.stop()
    cameraRef.current = null

    if (poseRef.current) {
      poseRef.current.close()
      poseRef.current = null
    }

    const stream = videoRef.current?.srcObject
    stream?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }

    setIsCameraActive(false)
    repCountRef.current = 0
    setCountRef.current = 0
    phaseRef.current = 'rest'
    setRepCount(0)
    setSetCount(0)
    setFormScore(0)
    setPhase('rest')
    setActiveFaults([])
    setPrimaryFault(null)
    detectorRef.current?.reset()
  }, [])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera])

  const displayFeedback = formScore > 0
    ? { ...feedback, score: formScore }
    : mockFeedback

  return (
    <>
      <div className="min-h-screen bg-[var(--bg-primary)] pb-32">

        {/* TOP BAR */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)] h-14 flex items-center justify-between px-5 pt-safe">
          <button onClick={() => navigate(-1)} className="text-sm font-medium text-[var(--text-tertiary)]">
            ← Back
          </button>
          <span className="text-base font-semibold text-[var(--text-primary)]">Form Coach</span>
          <button className="text-[13px] font-medium text-[var(--text-cta)]">How it works</button>
        </div>

        <div className="pt-[72px] px-5 space-y-3">

          {/* CAMERA VIEWPORT — position:relative + overflow:hidden required for overlays */}
          <div
            className="relative w-full bg-[var(--text-primary)] rounded-[20px] overflow-hidden"
            style={{ height: 260 }}
          >
            {/* Video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: isCameraActive ? 'block' : 'none' }}
            />

            {/* Skeleton canvas — child of viewport, above video, below HUD */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                display: isCameraActive ? 'block' : 'none',
                zIndex: 5,
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            />

            {/* FormFeedbackOverlay — child of viewport, above canvas */}
            {isCameraActive && (
              <FormFeedbackOverlay
                activeFaults={activeFaults}
                primaryFault={primaryFault}
                repCount={repCount}
                phase={phase}
                exerciseName={selectedExercise}
                voiceEnabled={voiceEnabled}
                onToggleVoice={() => setVoiceEnabled(v => !v)}
              />
            )}

            {/* Idle skeleton (camera off) */}
            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="90" height="170" viewBox="0 0 90 170" opacity="0.15">
                  <circle cx="45" cy="15" r="10" fill="none" stroke="white" strokeWidth="1.5"/>
                  <line x1="45" y1="25" x2="45" y2="40" stroke="white" strokeWidth="1.5"/>
                  <line x1="15" y1="45" x2="75" y2="45" stroke="white" strokeWidth="1.5"/>
                  <line x1="15" y1="45" x2="5"  y2="85" stroke="white" strokeWidth="1.5"/>
                  <line x1="75" y1="45" x2="85" y2="85" stroke="white" strokeWidth="1.5"/>
                  <line x1="45" y1="40" x2="45" y2="95" stroke="white" strokeWidth="1.5"/>
                  <line x1="25" y1="95" x2="65" y2="95" stroke="white" strokeWidth="1.5"/>
                  <line x1="25" y1="95" x2="20" y2="140" stroke="white" strokeWidth="1.5"/>
                  <line x1="20" y1="140" x2="18" y2="165" stroke="white" strokeWidth="1.5"/>
                  <line x1="65" y1="95" x2="70" y2="140" stroke="white" strokeWidth="1.5"/>
                  <line x1="70" y1="140" x2="72" y2="165" stroke="white" strokeWidth="1.5"/>
                  {[[45,40],[15,45],[75,45],[5,85],[85,85],[25,95],[65,95],[20,140],[70,140]].map(([x,y],i) => (
                    <circle key={i} cx={x} cy={y} r="3" fill="white" opacity="0.4"/>
                  ))}
                </svg>
                <p className="absolute bottom-14 text-white/40 text-xs font-medium">
                  Position yourself in frame
                </p>
              </div>
            )}

            {/* Corner brackets */}
            {[
              'top-3 left-3 border-t-2 border-l-2 rounded-tl-sm',
              'top-3 right-3 border-t-2 border-r-2 rounded-tr-sm',
              'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-sm',
              'bottom-3 right-3 border-b-2 border-r-2 rounded-br-sm',
            ].map((cls, i) => (
              <div key={i} className={`absolute w-5 h-5 border-white/60 ${cls}`} style={{ zIndex: 15 }} />
            ))}

            {/* LIVE indicator */}
            {isCameraActive && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 rounded-full px-2 py-1" style={{ zIndex: 20 }}>
                <span className="w-2 h-2 rounded-full bg-[var(--error)]" />
                <span className="text-[10px] font-semibold uppercase text-white/80 tracking-wider">Live</span>
              </div>
            )}

            {/* Bottom label bar */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/50 flex items-center justify-between px-4" style={{ zIndex: 15 }}>
              <span className="text-sm font-semibold text-white capitalize">{selectedExercise}</span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                isCameraActive ? 'bg-[var(--success)]/80 text-white' : 'bg-[var(--bg-card)]/20 text-white/60'
              }`}>
                {isCameraActive ? 'AI Active' : 'AI Ready'}
              </span>
            </div>

            {/* Flip camera button */}
            <button
              onClick={() => {
                stopCamera()
                setFacingMode(f => f === 'user' ? 'environment' : 'user')
                setTimeout(startCamera, 300)
              }}
              className="absolute bottom-12 right-3 w-9 h-9 bg-[var(--bg-card)]/15 rounded-[10px] flex items-center justify-center"
              style={{ zIndex: 20 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </button>
          </div>

          {/* FEEDBACK CARD */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                Form Feedback
              </span>
              <div
                className="px-2 py-1 rounded-xl flex items-baseline gap-0.5"
                style={{ backgroundColor: scoreBg(displayFeedback.score) }}
              >
                <span className="text-base font-bold" style={{ color: scoreColor(displayFeedback.score) }}>
                  {displayFeedback.score}
                </span>
                <span className="text-[11px]" style={{ color: scoreColor(displayFeedback.score) }}>
                  /100
                </span>
              </div>
            </div>

            {displayFeedback.faults.map((f, i) => (
              <div key={i} className="mt-3 flex gap-3 items-start">
                <div className="w-9 h-9 bg-[var(--warning-bg)] rounded-xl flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{f.title}</p>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}

            {displayFeedback.goods.map((g, i) => (
              <div key={i} className="mt-3 flex gap-3 items-start">
                <div className="w-9 h-9 bg-[var(--success-bg)] rounded-xl flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{g.title}</p>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 leading-snug">{g.desc}</p>
                </div>
              </div>
            ))}

            {/* Rep / set / score counters */}
            <div className="mt-4 pt-3 border-t border-[var(--border)] flex justify-around">
              {[
                { v: repCount,              l: 'reps' },
                { v: setCount,              l: 'sets' },
                { v: `${formScore || 72}%`, l: 'avg score' },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{s.v}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mt-0.5">{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* EXERCISE SELECTOR */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                Select Exercise
              </span>
              <button className="text-[13px] font-medium text-[var(--text-cta)]">All muscles ▾</button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="text"
                value={exerciseSearch}
                onChange={e => setExerciseSearch(e.target.value)}
                placeholder="Search exercises with AI form..."
                className="w-full h-10 bg-[var(--bg-pill)] rounded-xl pl-8 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none"
              />
            </div>

            {/* Exercise list — fixed max height, internally scrollable */}
            <div
              className="space-y-2"
              style={{
                maxHeight: 200,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {filteredAI.map((ex, i) => {
                const color = getMuscleColor(ex)
                const active =
                  selectedExercise === ex.name.toLowerCase().replace(/ /g, '_') ||
                  selectedExercise === ex.name.toLowerCase()
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedExercise(ex.name.toLowerCase())}
                    className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      active
                        ? 'bg-[var(--bg-card)] border-[1.5px] border-[var(--text-primary)]'
                        : 'bg-[var(--bg-card)] border border-[var(--border)]'
                    }`}
                  >
                    {active && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--text-primary)] rounded-l-xl" />
                    )}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: color.bg, color: color.text }}
                    >
                      {color.abbr}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-[var(--text-primary)] truncate ${active ? 'font-semibold' : 'font-medium'}`}>
                        {ex.name}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">
                        {ex.muscleGroup || ex.muscle}{ex.equipment ? ` · ${ex.equipment}` : ''}
                      </p>
                    </div>
                    {active ? (
                      <div className="w-6 h-6 bg-[var(--text-primary)] rounded-full flex items-center justify-center shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase bg-[var(--success-bg)] text-[var(--success)] px-1.5 py-0.5 rounded-md tracking-wider shrink-0">
                        AI
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>{/* end content */}

        {/* FIXED BOTTOM CTA */}
        <div className="fixed bottom-16 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border)] px-5 pt-3 pb-4" style={{ zIndex: 30 }}>
          {isCameraActive ? (
            <button
              onClick={stopCamera}
              className="w-full bg-[var(--error-bg)] text-[var(--error)] border border-[var(--error)]/20 text-base font-semibold rounded-xl flex items-center justify-center gap-2 py-3.5"
            >
              <span className="text-lg leading-none">■</span>
              Stop Camera
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] text-base font-semibold rounded-xl flex items-center justify-center gap-2 py-3.5 border border-[var(--text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            >
              <span>▶</span> Start Form Analysis
            </button>
          )}
        </div>

      </div>

      {/* FormCoachModal overlay — navigated from LiveSession */}
      {modalExercise && (
        <FormCoachModal
          isOpen
          exerciseName={modalExercise.name}
          onClose={() => setModalExercise(null)}
          onFormScore={(score) => {
            setFormScore(score)
          }}
        />
      )}
    </>
  )
}
