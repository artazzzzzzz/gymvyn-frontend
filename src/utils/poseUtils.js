export function calculateAngle(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const magAB = Math.hypot(ab.x, ab.y)
  const magCB = Math.hypot(cb.x, cb.y)
  if (magAB === 0 || magCB === 0) return 0
  return Math.round(Math.acos(Math.max(-1, Math.min(1, dot / (magAB * magCB)))) * (180 / Math.PI))
}

export const getLandmarkName = {
  11: 'LEFT_SHOULDER',
  12: 'RIGHT_SHOULDER',
  13: 'LEFT_ELBOW',
  14: 'RIGHT_ELBOW',
  15: 'LEFT_WRIST',
  16: 'RIGHT_WRIST',
  23: 'LEFT_HIP',
  24: 'RIGHT_HIP',
  25: 'LEFT_KNEE',
  26: 'RIGHT_KNEE',
  27: 'LEFT_ANKLE',
  28: 'RIGHT_ANKLE',
}

function vis(lm) {
  return lm && (lm.visibility ?? 1) > 0.5
}

export function getKeyAngles(landmarks) {
  const lm = landmarks
  const angles = {}

  const compute = (key, ai, bi, ci) => {
    const a = lm[ai], b = lm[bi], c = lm[ci]
    if (vis(a) && vis(b) && vis(c)) angles[key] = calculateAngle(a, b, c)
  }

  compute('leftKnee',      23, 25, 27)
  compute('rightKnee',     24, 26, 28)
  compute('leftElbow',     11, 13, 15)
  compute('rightElbow',    12, 14, 16)
  compute('leftHip',       11, 23, 25)
  compute('rightHip',      12, 24, 26)
  compute('leftShoulder',  13, 11, 23)
  compute('rightShoulder', 14, 12, 24)

  return angles
}
