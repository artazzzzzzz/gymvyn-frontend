// ── Squat ──────────────────────────────────────────────────────────────────

const squat = {
  checkForm(angles) {
    const { leftKnee, rightKnee, leftHip, rightHip } = angles
    const knee = (leftKnee ?? 180 + (rightKnee ?? 180)) / 2
    const hip  = (leftHip  ?? 180 + (rightHip  ?? 180)) / 2

    const atBottom = knee < 120

    if (!atBottom) {
      return { score: 70, feedback: 'Descend until knees reach 90°', isGoodForm: false }
    }

    if (leftKnee != null && rightKnee != null && Math.abs(leftKnee - rightKnee) > 15) {
      return { score: 50, feedback: 'Keep knees even — one is collapsing inward', isGoodForm: false }
    }

    if (knee >= 80 && knee <= 100 && hip < 100) {
      return { score: 100, feedback: 'Great depth and alignment!', isGoodForm: true }
    }

    if (knee < 80) {
      return { score: 75, feedback: 'Depth is solid — watch knee travel over toes', isGoodForm: false }
    }

    if (hip >= 100) {
      return { score: 65, feedback: 'Drive hips lower to hit parallel', isGoodForm: false }
    }

    return { score: 80, feedback: 'Good squat — aim for 90° at the knee', isGoodForm: true }
  },

  countRep(angles, phase) {
    const { leftKnee, rightKnee } = angles
    if (leftKnee == null && rightKnee == null) return { newPhase: phase, repCounted: false }
    const knee = ((leftKnee ?? 0) + (rightKnee ?? 0)) / (leftKnee != null && rightKnee != null ? 2 : 1)

    if (phase === 'up' && knee < 100) return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && knee > 150) return { newPhase: 'up',  repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Push Up ────────────────────────────────────────────────────────────────

const pushup = {
  checkForm(angles) {
    const { leftElbow, rightElbow, leftShoulder, rightShoulder } = angles
    const elbow    = avg(leftElbow, rightElbow)
    const shoulder = avg(leftShoulder, rightShoulder)

    if (elbow == null) return { score: 60, feedback: 'Position arms in frame', isGoodForm: false }

    const atBottom = elbow < 120

    if (!atBottom) {
      return { score: 70, feedback: 'Lower chest closer to the ground', isGoodForm: false }
    }

    if (shoulder != null && shoulder < 60) {
      return { score: 55, feedback: 'Tuck elbows — shoulders are flaring out', isGoodForm: false }
    }

    if (elbow >= 85 && elbow <= 95) {
      return { score: 100, feedback: 'Perfect push-up depth!', isGoodForm: true }
    }

    if (elbow < 85) {
      return { score: 80, feedback: 'Solid depth — keep core tight', isGoodForm: true }
    }

    return { score: 70, feedback: 'Go a little lower — aim for 90° at the elbow', isGoodForm: false }
  },

  countRep(angles, phase) {
    const elbow = avg(angles.leftElbow, angles.rightElbow)
    if (elbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && elbow < 100) return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && elbow > 150) return { newPhase: 'up',  repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Bicep Curl ─────────────────────────────────────────────────────────────

const bicepCurl = {
  checkForm(angles) {
    const { rightElbow } = angles

    if (rightElbow == null) return { score: 60, feedback: 'Keep right arm in frame', isGoodForm: false }

    const atTop = rightElbow < 80

    if (!atTop) {
      if (rightElbow > 140) {
        return { score: 70, feedback: 'Curl the weight up — aim for 50° at the elbow', isGoodForm: false }
      }
      return { score: 75, feedback: 'Keep curling — squeeze at the top', isGoodForm: false }
    }

    if (rightElbow <= 70) {
      return { score: 100, feedback: 'Full range of motion — nice curl!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good curl — squeeze the bicep a touch more at the top', isGoodForm: true }
  },

  countRep(angles, phase) {
    const { rightElbow } = angles
    if (rightElbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'down' && rightElbow < 70)  return { newPhase: 'up',   repCounted: false }
    if (phase === 'up'   && rightElbow > 140) return { newPhase: 'down', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function avg(a, b) {
  if (a != null && b != null) return (a + b) / 2
  return a ?? b ?? null
}

// ── Registry ───────────────────────────────────────────────────────────────

export const exercises = {
  squat,
  pushup,
  bicep_curl: bicepCurl,
}

export function getExerciseRules(exerciseName) {
  const key = exerciseName.toLowerCase().replace(/\s+/g, '_')
  return exercises[key] ?? null
}
