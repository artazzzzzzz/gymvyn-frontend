/**
 * formFeedback.js
 * Real-time form fault detection + voice/text coaching
 *
 * Each exercise has an array of CHECKS.
 * Each check runs every frame against the current joint angles.
 * If a fault is detected for SUSTAINED_FRAMES frames → trigger alert.
 *
 * angles object keys (from poseUtils.js):
 *   leftKnee, rightKnee, leftElbow, rightElbow,
 *   leftHip, rightHip, leftShoulder, rightShoulder
 *
 * landmarks object: raw MediaPipe pose landmarks (for position checks)
 */

// How many consecutive frames a fault must persist before alerting
export const SUSTAINED_FRAMES = 8;

// How many seconds between repeat alerts for the same fault
export const ALERT_COOLDOWN_MS = 4000;

// Severity levels
export const SEVERITY = {
  WARNING: 'warning',   // amber — form could be better
  ERROR: 'error',       // red — stop and fix this
};

/**
 * Each fault check:
 * {
 *   id: unique string
 *   phase: 'down' | 'up' | 'any'  — which phase of the rep to check
 *   check: (angles, landmarks, repPhase) => boolean  — true = fault detected
 *   message: string  — shown on screen
 *   voice: string    — spoken aloud (can differ from message — more natural)
 *   severity: SEVERITY.WARNING | SEVERITY.ERROR
 *   priority: number — higher = spoken first when multiple faults
 * }
 */

export const FORM_FEEDBACK_RULES = {

  // ─── SQUAT ───────────────────────────────────────────────────────────
  squat: [
    {
      id: 'squat_depth',
      phase: 'down',
      check: (a) => a.leftKnee > 100 && a.rightKnee > 100, // not reaching parallel
      message: 'Go deeper — reach parallel',
      voice: 'Squat deeper, reach parallel',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'squat_knee_cave',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const leftKneeX = lm[25]?.x;
        const leftAnkleX = lm[27]?.x;
        const rightKneeX = lm[26]?.x;
        const rightAnkleX = lm[28]?.x;
        if (!leftKneeX || !leftAnkleX) return false;
        const leftCave = leftKneeX > leftAnkleX + 0.04;
        const rightCave = rightKneeX < rightAnkleX - 0.04;
        return leftCave || rightCave;
      },
      message: 'Knees caving in — push them out',
      voice: 'Push your knees out, they are caving in',
      severity: SEVERITY.ERROR,
      priority: 10,
    },
    {
      id: 'squat_forward_lean',
      phase: 'down',
      check: (a) => a.leftHip < 55 || a.rightHip < 55,
      message: 'Too much forward lean — chest up',
      voice: 'Keep your chest up, you are leaning too far forward',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
    {
      id: 'squat_uneven',
      phase: 'any',
      check: (a) => Math.abs(a.leftKnee - a.rightKnee) > 15,
      message: 'Uneven squat — balance both sides',
      voice: 'Your squat is uneven, balance both sides equally',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'squat_lockout',
      phase: 'up',
      check: (a) => a.leftKnee < 160 || a.rightKnee < 160,
      message: 'Fully extend at the top',
      voice: 'Stand up fully, extend your knees at the top',
      severity: SEVERITY.WARNING,
      priority: 2,
    },
  ],

  // ─── DEADLIFT ─────────────────────────────────────────────────────────
  deadlift: [
    {
      id: 'deadlift_rounded_back',
      phase: 'any',
      check: (a) => a.leftHip < 50 || a.rightHip < 50,
      message: 'Back rounding — hinge at hips',
      voice: 'Your back is rounding. Hinge at the hips and keep a neutral spine',
      severity: SEVERITY.ERROR,
      priority: 10,
    },
    {
      id: 'deadlift_knee_position',
      phase: 'down',
      check: (a) => a.leftKnee < 70 || a.rightKnee < 70,
      message: 'Too much knee bend — this is a hinge not a squat',
      voice: 'Too much knee bend. Push your hips back more, this is a hip hinge',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
    {
      id: 'deadlift_bar_path',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const hipX = lm[23]?.x;
        const shoulderX = lm[11]?.x;
        if (!hipX || !shoulderX) return false;
        return Math.abs(hipX - shoulderX) > 0.12;
      },
      message: 'Keep bar close to your body',
      voice: 'Keep the bar close to your body throughout the lift',
      severity: SEVERITY.WARNING,
      priority: 7,
    },
    {
      id: 'deadlift_lockout',
      phase: 'up',
      check: (a) => a.leftHip < 160 || a.rightHip < 160,
      message: 'Drive hips forward to lockout',
      voice: 'Drive your hips forward and stand tall at the top',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'deadlift_shoulder_position',
      phase: 'down',
      check: (a, lm) => {
        if (!lm) return false;
        const shoulderY = lm[11]?.y;
        const hipY = lm[23]?.y;
        if (!shoulderY || !hipY) return false;
        return shoulderY > hipY + 0.05; // hips above shoulders
      },
      message: 'Hips too high — lower them slightly',
      voice: 'Your hips are too high at the start. Lower them slightly',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
  ],

  // ─── BENCH PRESS ─────────────────────────────────────────────────────
  bench_press: [
    {
      id: 'bench_elbow_flare',
      phase: 'down',
      check: (a) => a.leftElbow > 100 || a.rightElbow > 100,
      message: 'Elbows flaring — tuck them in slightly',
      voice: 'Tuck your elbows in slightly, they are flaring out too much',
      severity: SEVERITY.ERROR,
      priority: 8,
    },
    {
      id: 'bench_uneven_press',
      phase: 'any',
      check: (a) => Math.abs(a.leftElbow - a.rightElbow) > 20,
      message: 'Uneven press — one side is lagging',
      voice: 'Your press is uneven. Focus on pushing evenly with both arms',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
    {
      id: 'bench_lockout',
      phase: 'up',
      check: (a) => a.leftElbow < 155 || a.rightElbow < 155,
      message: 'Press to full extension',
      voice: 'Press all the way up to full extension',
      severity: SEVERITY.WARNING,
      priority: 2,
    },
    {
      id: 'bench_range',
      phase: 'down',
      check: (a) => a.leftElbow < 75 || a.rightElbow < 75,
      message: 'Good depth — bar to chest',
      voice: 'Lower the bar all the way to your chest for full range',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'bench_shoulder_retraction',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const lShoulder = lm[11];
        const rShoulder = lm[12];
        if (!lShoulder || !rShoulder) return false;
        return Math.abs(lShoulder.z - rShoulder.z) > 0.1;
      },
      message: 'Retract shoulder blades into bench',
      voice: 'Squeeze your shoulder blades together and press them into the bench',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
  ],

  // ─── PUSH UP ─────────────────────────────────────────────────────────
  push_up: [
    {
      id: 'pushup_sagging_hips',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const shoulderY = lm[11]?.y;
        const hipY = lm[23]?.y;
        const ankleY = lm[27]?.y;
        if (!shoulderY || !hipY || !ankleY) return false;
        const midpoint = (shoulderY + ankleY) / 2;
        return hipY > midpoint + 0.05;
      },
      message: 'Hips sagging — brace your core',
      voice: 'Your hips are sagging. Brace your core and keep your body in a straight line',
      severity: SEVERITY.ERROR,
      priority: 10,
    },
    {
      id: 'pushup_piked_hips',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const shoulderY = lm[11]?.y;
        const hipY = lm[23]?.y;
        const ankleY = lm[27]?.y;
        if (!shoulderY || !hipY || !ankleY) return false;
        const midpoint = (shoulderY + ankleY) / 2;
        return hipY < midpoint - 0.07;
      },
      message: 'Hips too high — lower them',
      voice: 'Your hips are too high. Lower them to form a straight line',
      severity: SEVERITY.WARNING,
      priority: 7,
    },
    {
      id: 'pushup_elbow_flare',
      phase: 'down',
      check: (a) => a.leftElbow > 90 || a.rightElbow > 90,
      message: 'Elbows flaring — tuck them at 45°',
      voice: 'Tuck your elbows in at 45 degrees, do not let them flare out',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
    {
      id: 'pushup_depth',
      phase: 'down',
      check: (a) => a.leftElbow < 75 && a.rightElbow < 75,
      message: 'Lower your chest to the floor',
      voice: 'Go lower, your chest should nearly touch the floor',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
  ],

  // ─── PULL UP ─────────────────────────────────────────────────────────
  pull_up: [
    {
      id: 'pullup_dead_hang',
      phase: 'down',
      check: (a) => a.leftElbow < 165 || a.rightElbow < 165,
      message: 'Full dead hang at the bottom',
      voice: 'Lower all the way down to a full dead hang between reps',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'pullup_chin_height',
      phase: 'up',
      check: (a, lm) => {
        if (!lm) return false;
        const chinY = lm[0]?.y;
        const wristY = lm[15]?.y;
        if (!chinY || !wristY) return false;
        return chinY > wristY + 0.02;
      },
      message: 'Get chin over the bar',
      voice: 'Pull higher, your chin needs to clear the bar',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
    {
      id: 'pullup_kipping',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const hipY = lm[23]?.y;
        const shoulderY = lm[11]?.y;
        if (!hipY || !shoulderY) return false;
        return Math.abs(hipY - shoulderY) < 0.05;
      },
      message: 'Avoid kipping — use strict form',
      voice: 'Avoid swinging. Use strict form and engage your lats',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'pullup_shoulder_engagement',
      phase: 'up',
      check: (a) => a.leftShoulder > 70 || a.rightShoulder > 70,
      message: 'Pull shoulder blades down and back',
      voice: 'Pull your shoulder blades down and back as you rise',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
  ],

  // ─── OVERHEAD PRESS ──────────────────────────────────────────────────
  overhead_press: [
    {
      id: 'ohp_lockout',
      phase: 'up',
      check: (a) => a.leftElbow < 160 || a.rightElbow < 160,
      message: 'Press to full lockout overhead',
      voice: 'Press all the way up to full lockout overhead',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'ohp_elbow_position',
      phase: 'down',
      check: (a, lm) => {
        if (!lm) return false;
        const elbowY = lm[13]?.y;
        const shoulderY = lm[11]?.y;
        if (!elbowY || !shoulderY) return false;
        return elbowY < shoulderY - 0.05;
      },
      message: 'Elbows slightly in front — rack position',
      voice: 'Keep your elbows slightly in front of the bar in the rack position',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'ohp_lean_back',
      phase: 'up',
      check: (a) => a.leftHip < 155 || a.rightHip < 155,
      message: 'Stop leaning back — stay vertical',
      voice: 'You are leaning back too much. Keep your torso vertical and squeeze your glutes',
      severity: SEVERITY.ERROR,
      priority: 8,
    },
    {
      id: 'ohp_uneven',
      phase: 'any',
      check: (a) => Math.abs(a.leftElbow - a.rightElbow) > 20,
      message: 'Uneven press — both arms together',
      voice: 'Your arms are pressing unevenly. Focus on pressing both sides together',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
    {
      id: 'ohp_bar_path',
      phase: 'up',
      check: (a, lm) => {
        if (!lm) return false;
        const leftWristX = lm[15]?.x;
        const rightWristX = lm[16]?.x;
        const leftShoulderX = lm[11]?.x;
        const rightShoulderX = lm[12]?.x;
        if (!leftWristX || !rightWristX) return false;
        const leftOffset = Math.abs(leftWristX - leftShoulderX);
        const rightOffset = Math.abs(rightWristX - rightShoulderX);
        return leftOffset > 0.08 || rightOffset > 0.08;
      },
      message: 'Bar drifting — press straight up',
      voice: 'The bar is drifting forward. Press it straight up over your head',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
  ],

  // ─── BICEP CURL ───────────────────────────────────────────────────────
  bicep_curl: [
    {
      id: 'curl_swinging',
      phase: 'up',
      check: (a) => a.leftShoulder < 150 || a.rightShoulder < 150,
      message: 'Swinging body — keep elbows pinned',
      voice: 'Stop swinging your body. Keep your elbows pinned to your sides',
      severity: SEVERITY.ERROR,
      priority: 9,
    },
    {
      id: 'curl_full_range',
      phase: 'down',
      check: (a) => a.leftElbow < 155 || a.rightElbow < 155,
      message: 'Lower all the way down — full ROM',
      voice: 'Lower all the way down for a full range of motion',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'curl_peak_contraction',
      phase: 'up',
      check: (a) => a.leftElbow > 60 || a.rightElbow > 60,
      message: 'Curl higher — squeeze at top',
      voice: 'Curl the weight higher and squeeze your bicep at the top',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'curl_wrist',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const wristY = lm[15]?.y;
        const elbowY = lm[13]?.y;
        if (!wristY || !elbowY) return false;
        return Math.abs(wristY - elbowY) > 0.1 && wristY > elbowY;
      },
      message: 'Keep wrists straight — not bent',
      voice: 'Keep your wrists straight, do not bend them during the curl',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
  ],

  // ─── TRICEP EXTENSION ─────────────────────────────────────────────────
  tricep_extension: [
    {
      id: 'tricep_elbow_flare',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const leftElbowX = lm[13]?.x;
        const leftShoulderX = lm[11]?.x;
        const rightElbowX = lm[14]?.x;
        const rightShoulderX = lm[12]?.x;
        if (!leftElbowX) return false;
        return Math.abs(leftElbowX - leftShoulderX) > 0.1 ||
               Math.abs(rightElbowX - rightShoulderX) > 0.1;
      },
      message: 'Keep elbows tucked in',
      voice: 'Keep your elbows tucked in close to your head',
      severity: SEVERITY.WARNING,
      priority: 7,
    },
    {
      id: 'tricep_full_extension',
      phase: 'down',
      check: (a) => a.leftElbow > 40 || a.rightElbow > 40,
      message: 'Lower fully — stretch the tricep',
      voice: 'Lower all the way down to fully stretch the tricep',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'tricep_lockout',
      phase: 'up',
      check: (a) => a.leftElbow < 165 || a.rightElbow < 165,
      message: 'Extend to full lockout',
      voice: 'Extend your arms to full lockout at the top',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
  ],

  // ─── LATERAL RAISE ────────────────────────────────────────────────────
  lateral_raise: [
    {
      id: 'lateral_too_high',
      phase: 'up',
      check: (a) => a.leftShoulder < 60 || a.rightShoulder < 60,
      message: 'Only raise to shoulder height',
      voice: 'Only raise to shoulder height, going higher stresses the AC joint',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'lateral_too_low',
      phase: 'up',
      check: (a) => a.leftShoulder > 100 || a.rightShoulder > 100,
      message: 'Raise higher — arms parallel to floor',
      voice: 'Raise higher until your arms are parallel to the floor',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'lateral_shrugging',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const earY = lm[7]?.y;
        const shoulderY = lm[11]?.y;
        if (!earY || !shoulderY) return false;
        return (shoulderY - earY) < 0.04;
      },
      message: 'Stop shrugging — relax your traps',
      voice: 'Stop shrugging your shoulders up. Relax your traps and focus on the side delt',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
    {
      id: 'lateral_momentum',
      phase: 'up',
      check: (a) => Math.abs(a.leftShoulder - a.rightShoulder) > 25,
      message: 'Uneven raise — both arms together',
      voice: 'Raise both arms evenly, one side is lagging',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
  ],

  // ─── ROW ─────────────────────────────────────────────────────────────
  row: [
    {
      id: 'row_rounded_back',
      phase: 'any',
      check: (a) => a.leftHip < 60 || a.rightHip < 60,
      message: 'Straighten your back — neutral spine',
      voice: 'Straighten your back. Keep a neutral spine throughout the row',
      severity: SEVERITY.ERROR,
      priority: 10,
    },
    {
      id: 'row_elbow_path',
      phase: 'up',
      check: (a) => a.leftElbow > 120 || a.rightElbow > 120,
      message: 'Drive elbows back — not up',
      voice: 'Drive your elbows straight back, not upward',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
    {
      id: 'row_full_extension',
      phase: 'down',
      check: (a) => a.leftElbow < 155 || a.rightElbow < 155,
      message: 'Extend arms fully at the bottom',
      voice: 'Extend your arms fully at the bottom for full range of motion',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'row_torso_swing',
      phase: 'any',
      check: (a) => Math.abs(a.leftHip - a.rightHip) > 15,
      message: 'Stop torso swinging — control the movement',
      voice: 'Stop swinging your torso. Control the movement with your back muscles',
      severity: SEVERITY.WARNING,
      priority: 7,
    },
  ],

  // ─── LAT PULLDOWN ─────────────────────────────────────────────────────
  lat_pulldown: [
    {
      id: 'pulldown_lean_back',
      phase: 'down',
      check: (a) => a.leftHip < 100 || a.rightHip < 100,
      message: 'Too much lean — slight lean is fine',
      voice: 'You are leaning back too much. Only a slight lean is needed',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
    {
      id: 'pulldown_full_stretch',
      phase: 'up',
      check: (a) => a.leftElbow < 155 || a.rightElbow < 155,
      message: 'Let arms fully extend at top',
      voice: 'Let your arms fully extend at the top to stretch the lats',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'pulldown_elbow_drive',
      phase: 'down',
      check: (a) => a.leftShoulder > 80 || a.rightShoulder > 80,
      message: 'Drive elbows down to hips',
      voice: 'Drive your elbows straight down toward your hips',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
  ],

  // ─── LUNGE ────────────────────────────────────────────────────────────
  lunge: [
    {
      id: 'lunge_knee_cave',
      phase: 'down',
      check: (a, lm) => {
        if (!lm) return false;
        const kneeX = lm[25]?.x;
        const ankleX = lm[27]?.x;
        if (!kneeX || !ankleX) return false;
        return kneeX > ankleX + 0.05;
      },
      message: 'Front knee caving — push it out',
      voice: 'Your front knee is caving in. Push it out over your toes',
      severity: SEVERITY.ERROR,
      priority: 9,
    },
    {
      id: 'lunge_knee_over_toe',
      phase: 'down',
      check: (a, lm) => {
        if (!lm) return false;
        const kneeX = lm[25]?.x;
        const ankleX = lm[27]?.x;
        if (!kneeX || !ankleX) return false;
        return kneeX > ankleX + 0.12;
      },
      message: 'Front knee too far forward',
      voice: 'Your front knee is going too far forward past your toes',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
    {
      id: 'lunge_depth',
      phase: 'down',
      check: (a) => a.leftKnee > 110 || a.rightKnee > 110,
      message: 'Go deeper — back knee near floor',
      voice: 'Lower deeper until your back knee is close to the floor',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'lunge_torso',
      phase: 'any',
      check: (a) => a.leftHip < 160 || a.rightHip < 160,
      message: 'Keep torso upright',
      voice: 'Keep your torso upright and vertical throughout the lunge',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
  ],

  // ─── LEG PRESS ────────────────────────────────────────────────────────
  leg_press: [
    {
      id: 'legpress_knee_lockout',
      phase: 'up',
      check: (a) => a.leftKnee < 170 || a.rightKnee < 170,
      message: 'Do not lock knees at top',
      voice: 'Do not fully lock your knees at the top. Keep a slight bend',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'legpress_depth',
      phase: 'down',
      check: (a) => a.leftKnee > 100 || a.rightKnee > 100,
      message: 'Go deeper — 90° knee angle',
      voice: 'Lower until your knees reach 90 degrees for full range',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'legpress_knee_cave',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const leftKneeX = lm[25]?.x;
        const leftAnkleX = lm[27]?.x;
        if (!leftKneeX || !leftAnkleX) return false;
        return Math.abs(leftKneeX - leftAnkleX) > 0.06;
      },
      message: 'Knees collapsing inward',
      voice: 'Your knees are collapsing inward. Push them out in line with your feet',
      severity: SEVERITY.ERROR,
      priority: 8,
    },
    {
      id: 'legpress_lower_back',
      phase: 'down',
      check: (a, lm) => {
        if (!lm) return false;
        const hipY = lm[23]?.y;
        const shoulderY = lm[11]?.y;
        if (!hipY || !shoulderY) return false;
        return (hipY - shoulderY) < 0.05;
      },
      message: 'Lower back lifting off pad',
      voice: 'Keep your lower back pressed into the seat pad throughout the movement',
      severity: SEVERITY.ERROR,
      priority: 9,
    },
  ],

  // ─── CALF RAISE ───────────────────────────────────────────────────────
  calf_raise: [
    {
      id: 'calf_full_range',
      phase: 'down',
      check: (a, lm) => {
        if (!lm) return false;
        const ankleY = lm[27]?.y;
        const heelY = lm[29]?.y;
        if (!ankleY || !heelY) return false;
        return heelY < ankleY;
      },
      message: 'Drop heels below platform for stretch',
      voice: 'Drop your heels below the platform to get a full stretch at the bottom',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
    {
      id: 'calf_peak_contraction',
      phase: 'up',
      check: (a, lm) => {
        if (!lm) return false;
        const ankleY = lm[27]?.y;
        const heelY = lm[29]?.y;
        if (!ankleY || !heelY) return false;
        return heelY > ankleY - 0.03;
      },
      message: 'Rise higher — squeeze calves at top',
      voice: 'Rise up onto the ball of your foot and squeeze your calves at the top',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'calf_stability',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const leftAnkleX = lm[27]?.x;
        const rightAnkleX = lm[28]?.x;
        if (!leftAnkleX || !rightAnkleX) return false;
        return Math.abs(leftAnkleX - rightAnkleX) > 0.2;
      },
      message: 'Feet rolling — keep weight centered',
      voice: 'Keep your weight centered on the ball of your foot, do not roll inward or outward',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
  ],

  // ─── HIP THRUST ───────────────────────────────────────────────────────
  hip_thrust: [
    {
      id: 'hipthrust_full_extension',
      phase: 'up',
      check: (a) => a.leftHip > 30 || a.rightHip > 30,
      message: 'Drive hips up to full extension',
      voice: 'Drive your hips up to full extension. Squeeze your glutes hard at the top',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
    {
      id: 'hipthrust_knee_angle',
      phase: 'up',
      check: (a) => a.leftKnee > 110 || a.rightKnee > 110,
      message: 'Feet too far — move them closer',
      voice: 'Your feet are too far from your body. Move them closer to keep knees at 90 degrees',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
    {
      id: 'hipthrust_knee_cave',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const leftKneeX = lm[25]?.x;
        const leftAnkleX = lm[27]?.x;
        if (!leftKneeX || !leftAnkleX) return false;
        return leftKneeX > leftAnkleX + 0.04;
      },
      message: 'Push knees out — they are caving',
      voice: 'Your knees are caving in. Push them out in line with your feet',
      severity: SEVERITY.ERROR,
      priority: 9,
    },
    {
      id: 'hipthrust_squeeze',
      phase: 'up',
      check: (a) => Math.abs(a.leftHip - a.rightHip) > 15,
      message: 'Uneven thrust — balance both glutes',
      voice: 'Your thrust is uneven. Engage both glutes equally',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
  ],

  // ─── GLUTE BRIDGE ────────────────────────────────────────────────────
  glute_bridge: [
    {
      id: 'bridge_extension',
      phase: 'up',
      check: (a) => a.leftHip > 35 || a.rightHip > 35,
      message: 'Squeeze and drive higher',
      voice: 'Drive your hips higher and squeeze your glutes at the top',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'bridge_knee_cave',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const kneeX = lm[25]?.x;
        const ankleX = lm[27]?.x;
        if (!kneeX || !ankleX) return false;
        return Math.abs(kneeX - ankleX) > 0.06;
      },
      message: 'Knees falling in — push them out',
      voice: 'Push your knees outward, they are falling inward',
      severity: SEVERITY.WARNING,
      priority: 7,
    },
  ],

  // ─── PLANK ────────────────────────────────────────────────────────────
  plank: [
    {
      id: 'plank_hip_sag',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const shoulderY = lm[11]?.y;
        const hipY = lm[23]?.y;
        const ankleY = lm[27]?.y;
        if (!shoulderY || !hipY || !ankleY) return false;
        const line = shoulderY + (ankleY - shoulderY) * 0.5;
        return hipY > line + 0.05;
      },
      message: 'Hips sagging — brace your core',
      voice: 'Your hips are dropping. Squeeze your core and glutes to lift them',
      severity: SEVERITY.ERROR,
      priority: 10,
    },
    {
      id: 'plank_hip_pike',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const shoulderY = lm[11]?.y;
        const hipY = lm[23]?.y;
        const ankleY = lm[27]?.y;
        if (!shoulderY || !hipY || !ankleY) return false;
        const line = shoulderY + (ankleY - shoulderY) * 0.5;
        return hipY < line - 0.06;
      },
      message: 'Hips too high — lower them',
      voice: 'Your hips are too high. Lower them to form a straight line from head to heels',
      severity: SEVERITY.WARNING,
      priority: 7,
    },
    {
      id: 'plank_head_drop',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const noseY = lm[0]?.y;
        const shoulderY = lm[11]?.y;
        if (!noseY || !shoulderY) return false;
        return noseY > shoulderY + 0.08;
      },
      message: 'Neutral neck — look at the floor',
      voice: 'Keep your neck neutral. Look at the floor slightly in front of your hands',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
  ],

  // ─── CRUNCH ───────────────────────────────────────────────────────────
  crunch: [
    {
      id: 'crunch_neck_pull',
      phase: 'up',
      check: (a, lm) => {
        if (!lm) return false;
        const noseY = lm[0]?.y;
        const shoulderY = lm[11]?.y;
        if (!noseY || !shoulderY) return false;
        return noseY < shoulderY - 0.1;
      },
      message: 'Stop pulling your neck — use your abs',
      voice: 'Stop pulling on your neck. Drive the movement with your abdominals',
      severity: SEVERITY.ERROR,
      priority: 9,
    },
    {
      id: 'crunch_range',
      phase: 'up',
      check: (a) => a.leftHip > 100 || a.rightHip > 100,
      message: 'Curl shoulders up — don\'t sit up fully',
      voice: 'Only curl your shoulders off the floor. This is a crunch, not a sit up',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
  ],

  // ─── SHOULDER PRESS (same rules as overhead_press) ────────────────────
  shoulder_press: [
    {
      id: 'sp_lockout',
      phase: 'up',
      check: (a) => a.leftElbow < 160 || a.rightElbow < 160,
      message: 'Press to full lockout',
      voice: 'Press all the way up to full lockout overhead',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'sp_lean_back',
      phase: 'up',
      check: (a) => a.leftHip < 155 || a.rightHip < 155,
      message: 'Leaning back — stay vertical',
      voice: 'You are leaning back too much. Keep your core tight and torso vertical',
      severity: SEVERITY.ERROR,
      priority: 8,
    },
    {
      id: 'sp_uneven',
      phase: 'any',
      check: (a) => Math.abs(a.leftElbow - a.rightElbow) > 20,
      message: 'Uneven press — both arms together',
      voice: 'Your arms are pressing unevenly. Focus on both sides equally',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
  ],

  // ─── DIP ──────────────────────────────────────────────────────────────
  dip: [
    {
      id: 'dip_depth',
      phase: 'down',
      check: (a) => a.leftElbow > 90 && a.rightElbow > 90,
      message: 'Go deeper — elbows to 90°',
      voice: 'Go deeper until your elbows reach 90 degrees',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'dip_lockout',
      phase: 'up',
      check: (a) => a.leftElbow < 155 || a.rightElbow < 155,
      message: 'Press to full extension at top',
      voice: 'Press all the way up to full extension at the top',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'dip_forward_lean',
      phase: 'any',
      check: (a) => a.leftHip < 120 || a.rightHip < 120,
      message: 'Leaning forward — targets chest more',
      voice: 'You are leaning forward which shifts focus to the chest. Stay more upright for triceps',
      severity: SEVERITY.WARNING,
      priority: 2,
    },
  ],

  // ─── HAMMER CURL ─────────────────────────────────────────────────────
  hammer_curl: [
    {
      id: 'hammer_elbow_pin',
      phase: 'up',
      check: (a) => a.leftShoulder < 150 || a.rightShoulder < 150,
      message: 'Elbows drifting — keep them pinned',
      voice: 'Keep your elbows pinned to your sides. Do not let them drift forward',
      severity: SEVERITY.ERROR,
      priority: 8,
    },
    {
      id: 'hammer_neutral_wrist',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const wristZ = lm[15]?.z;
        const elbowZ = lm[13]?.z;
        if (wristZ === undefined || elbowZ === undefined) return false;
        return Math.abs(wristZ - elbowZ) > 0.08;
      },
      message: 'Keep wrists neutral — thumbs up',
      voice: 'Maintain a neutral wrist position with thumbs pointing up throughout',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
  ],

  // ─── SKULL CRUSHER ───────────────────────────────────────────────────
  skull_crusher: [
    {
      id: 'skull_elbow_flare',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const leftElbowX = lm[13]?.x;
        const leftShoulderX = lm[11]?.x;
        if (!leftElbowX) return false;
        return Math.abs(leftElbowX - leftShoulderX) > 0.12;
      },
      message: 'Keep elbows pointing up — not flaring',
      voice: 'Keep your elbows pointed straight up toward the ceiling. Do not let them flare out',
      severity: SEVERITY.WARNING,
      priority: 7,
    },
    {
      id: 'skull_full_extension',
      phase: 'up',
      check: (a) => a.leftElbow < 160 || a.rightElbow < 160,
      message: 'Extend fully at the top',
      voice: 'Extend your arms fully at the top to fully contract the tricep',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'skull_depth',
      phase: 'down',
      check: (a) => a.leftElbow > 50 || a.rightElbow > 50,
      message: 'Lower further — bar near forehead',
      voice: 'Lower the bar until it is close to your forehead for full range',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
  ],

  // ─── PREACHER CURL ───────────────────────────────────────────────────
  preacher_curl: [
    {
      id: 'preacher_full_range',
      phase: 'down',
      check: (a) => a.leftElbow < 155 || a.rightElbow < 155,
      message: 'Lower all the way down',
      voice: 'Lower all the way down until your arms are almost straight for full range',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'preacher_peak',
      phase: 'up',
      check: (a) => a.leftElbow > 55 || a.rightElbow > 55,
      message: 'Curl higher — squeeze at top',
      voice: 'Curl the weight higher and squeeze your bicep at the peak',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
  ],

  // ─── ROMANIAN DEADLIFT ───────────────────────────────────────────────
  romanian_deadlift: [
    {
      id: 'rdl_back_round',
      phase: 'any',
      check: (a) => a.leftHip < 70 || a.rightHip < 70,
      message: 'Back rounding — maintain neutral spine',
      voice: 'Your back is rounding. Keep a neutral spine and push your chest forward',
      severity: SEVERITY.ERROR,
      priority: 10,
    },
    {
      id: 'rdl_knee_bend',
      phase: 'any',
      check: (a) => a.leftKnee < 150 || a.rightKnee < 150,
      message: 'Legs too bent — soften knees only slightly',
      voice: 'Your knees are bending too much. Keep them soft but not bent like a squat',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
    {
      id: 'rdl_hip_drive',
      phase: 'up',
      check: (a) => a.leftHip < 160 || a.rightHip < 160,
      message: 'Drive hips forward to stand tall',
      voice: 'Drive your hips forward and squeeze your glutes to stand up fully',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'rdl_bar_distance',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const hipX = lm[23]?.x;
        const wristX = lm[15]?.x;
        if (!hipX || !wristX) return false;
        return Math.abs(hipX - wristX) > 0.15;
      },
      message: 'Keep bar close to your legs',
      voice: 'Keep the bar close to your legs. Do not let it drift away from your body',
      severity: SEVERITY.WARNING,
      priority: 7,
    },
  ],

  // ─── LEG EXTENSION ───────────────────────────────────────────────────
  leg_extension: [
    {
      id: 'legext_full_lockout',
      phase: 'up',
      check: (a) => a.leftKnee > 20 || a.rightKnee > 20,
      message: 'Extend fully — squeeze quads',
      voice: 'Extend your legs fully and squeeze your quads hard at the top',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'legext_control',
      phase: 'down',
      check: (a) => a.leftKnee < 80 || a.rightKnee < 80,
      message: 'Control the lowering phase',
      voice: 'Lower the weight slowly under control for a 2 to 3 second count',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
  ],

  // ─── LEG CURL ────────────────────────────────────────────────────────
  leg_curl: [
    {
      id: 'legcurl_full_curl',
      phase: 'up',
      check: (a) => a.leftKnee > 60 || a.rightKnee > 60,
      message: 'Curl heels fully to glutes',
      voice: 'Curl your heels fully toward your glutes for maximum hamstring contraction',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'legcurl_hip_lift',
      phase: 'up',
      check: (a, lm) => {
        if (!lm) return false;
        const hipY = lm[23]?.y;
        const kneeY = lm[25]?.y;
        if (!hipY || !kneeY) return false;
        return (hipY - kneeY) > 0.15;
      },
      message: 'Hips lifting — keep them down',
      voice: 'Keep your hips pressed down on the pad. Do not let them lift up',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
  ],

  // ─── FACE PULL ───────────────────────────────────────────────────────
  face_pull: [
    {
      id: 'facepull_elbow_height',
      phase: 'up',
      check: (a, lm) => {
        if (!lm) return false;
        const elbowY = lm[13]?.y;
        const shoulderY = lm[11]?.y;
        if (!elbowY || !shoulderY) return false;
        return elbowY > shoulderY + 0.05;
      },
      message: 'Keep elbows at shoulder height',
      voice: 'Keep your elbows at shoulder height or slightly above',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
    {
      id: 'facepull_external_rotation',
      phase: 'up',
      check: (a) => a.leftElbow > 100 || a.rightElbow > 100,
      message: 'Rotate wrists outward — thumbs back',
      voice: 'Rotate your wrists outward as you pull so your thumbs point behind you',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
  ],

  // ─── SHRUG ───────────────────────────────────────────────────────────
  shrug: [
    {
      id: 'shrug_rolling',
      phase: 'any',
      check: (a, lm) => {
        if (!lm) return false;
        const lShoulder = lm[11];
        const rShoulder = lm[12];
        if (!lShoulder || !rShoulder) return false;
        return Math.abs(lShoulder.z - rShoulder.z) > 0.08;
      },
      message: 'No rolling — straight up and down',
      voice: 'Do not roll your shoulders. Move straight up and down only',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
    {
      id: 'shrug_range',
      phase: 'up',
      check: (a, lm) => {
        if (!lm) return false;
        const earY = lm[7]?.y;
        const shoulderY = lm[11]?.y;
        if (!earY || !shoulderY) return false;
        return (shoulderY - earY) > 0.08;
      },
      message: 'Shrug higher — toward your ears',
      voice: 'Shrug your shoulders higher toward your ears for full contraction',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'shrug_pause',
      phase: 'up',
      check: (a) => Math.abs(a.leftShoulder - a.rightShoulder) > 20,
      message: 'Uneven shrug — balance both sides',
      voice: 'Your shrug is uneven. Lift both shoulders to the same height',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
  ],

  // ─── CHEST FLY ───────────────────────────────────────────────────────
  chest_fly: [
    {
      id: 'fly_elbow_bend',
      phase: 'any',
      check: (a) => a.leftElbow < 140 || a.rightElbow < 140,
      message: 'Too much elbow bend — slight bend only',
      voice: 'You have too much elbow bend. Keep just a slight fixed bend throughout',
      severity: SEVERITY.WARNING,
      priority: 5,
    },
    {
      id: 'fly_range',
      phase: 'down',
      check: (a) => a.leftShoulder < 150 || a.rightShoulder < 150,
      message: 'Open wider — feel the stretch',
      voice: 'Open your arms wider to feel a full stretch in the chest at the bottom',
      severity: SEVERITY.WARNING,
      priority: 3,
    },
    {
      id: 'fly_squeeze',
      phase: 'up',
      check: (a) => a.leftShoulder > 30 || a.rightShoulder > 30,
      message: 'Squeeze chest fully at the top',
      voice: 'Bring your hands closer together and squeeze your chest fully at the top',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
  ],

  // ─── FRONT RAISE ─────────────────────────────────────────────────────
  front_raise: [
    {
      id: 'frontraise_height',
      phase: 'up',
      check: (a) => a.leftShoulder < 70 || a.rightShoulder < 70,
      message: 'Raise to shoulder height only',
      voice: 'Raise the weight to shoulder height. Going higher puts stress on the shoulder joint',
      severity: SEVERITY.WARNING,
      priority: 4,
    },
    {
      id: 'frontraise_momentum',
      phase: 'up',
      check: (a) => a.leftHip < 160 || a.rightHip < 160,
      message: 'Stop swinging — control the raise',
      voice: 'Stop using momentum. Control the raise with your front delt',
      severity: SEVERITY.WARNING,
      priority: 6,
    },
  ],

};

// ─── VOICE ENGINE ────────────────────────────────────────────────────────────

class VoiceCoach {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.lastSpoken = {};
    this.enabled = true;
    this.volume = 1;
    this.rate = 0.95;
    this.pitch = 1;
    this.preferredVoice = null;
    this._initVoice();
  }

  _initVoice() {
    if (!this.synth) return;
    const setVoice = () => {
      const voices = this.synth.getVoices();
      // Prefer natural-sounding English voices
      const preferred = voices.find(v =>
        v.lang.startsWith('en') && (
          v.name.includes('Google') ||
          v.name.includes('Alex') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel')
        )
      ) || voices.find(v => v.lang.startsWith('en'));
      this.preferredVoice = preferred || null;
    };
    if (this.synth.getVoices().length > 0) setVoice();
    else this.synth.addEventListener('voiceschanged', setVoice);
  }

  speak(text) {
    if (!this.synth || !this.enabled) return;
    // Don't interrupt if currently speaking
    if (this.synth.speaking) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = this.rate;
    utter.pitch = this.pitch;
    utter.volume = this.volume;
    if (this.preferredVoice) utter.voice = this.preferredVoice;
    this.synth.speak(utter);
  }

  cancel() {
    this.synth?.cancel();
  }

  canSpeak(faultId) {
    const last = this.lastSpoken[faultId] || 0;
    return Date.now() - last > ALERT_COOLDOWN_MS;
  }

  markSpoken(faultId) {
    this.lastSpoken[faultId] = Date.now();
  }
}

export const voiceCoach = typeof window !== 'undefined' ? new VoiceCoach() : null;

// ─── FAULT DETECTOR ──────────────────────────────────────────────────────────

export class FaultDetector {
  constructor(exerciseKey) {
    this.rules = FORM_FEEDBACK_RULES[exerciseKey] || [];
    this.faultCounts = {}; // faultId -> consecutive frame count
    this.activeFaults = new Set();
    this.onFault = null; // callback(fault) when new fault detected
    this.onClear = null; // callback(faultId) when fault clears
    this._alertCooldowns = {};
  }

  /**
   * Process a single frame
   * @param {object} angles - joint angles from poseUtils
   * @param {array} landmarks - raw MediaPipe landmarks
   * @param {string} repPhase - 'up' | 'down'
   */
  processFrame(angles, landmarks, repPhase = 'any') {
    const newFaults = [];
    const clearedFaults = [];

    for (const rule of this.rules) {
      // Check phase match
      if (rule.phase !== 'any' && rule.phase !== repPhase) {
        // Still clear the count if wrong phase
        if (this.faultCounts[rule.id] > 0) {
          this.faultCounts[rule.id] = 0;
        }
        continue;
      }

      let isFault = false;
      try {
        isFault = rule.check(angles, landmarks, repPhase);
      } catch (e) {
        // Landmark might not exist — skip
      }

      if (isFault) {
        this.faultCounts[rule.id] = (this.faultCounts[rule.id] || 0) + 1;

        // Trigger after sustained frames
        if (this.faultCounts[rule.id] === SUSTAINED_FRAMES) {
          if (!this.activeFaults.has(rule.id)) {
            this.activeFaults.add(rule.id);
            newFaults.push(rule);

            // Voice feedback
            const canSpeak = !this._alertCooldowns[rule.id] ||
              Date.now() - this._alertCooldowns[rule.id] > ALERT_COOLDOWN_MS;

            if (voiceCoach && canSpeak) {
              voiceCoach.speak(rule.voice);
              this._alertCooldowns[rule.id] = Date.now();
            }

            if (this.onFault) this.onFault(rule);
          }
        }
      } else {
        // Fault cleared
        this.faultCounts[rule.id] = 0;
        if (this.activeFaults.has(rule.id)) {
          this.activeFaults.delete(rule.id);
          clearedFaults.push(rule.id);
          if (this.onClear) this.onClear(rule.id);
        }
      }
    }

    return { newFaults, clearedFaults, activeFaults: [...this.activeFaults] };
  }

  /**
   * Get highest priority active fault (for display)
   */
  getPrimaryFault() {
    if (this.activeFaults.size === 0) return null;
    const active = this.rules.filter(r => this.activeFaults.has(r.id));
    return active.sort((a, b) => b.priority - a.priority)[0] || null;
  }

  reset() {
    this.faultCounts = {};
    this.activeFaults.clear();
    this._alertCooldowns = {};
  }
}
