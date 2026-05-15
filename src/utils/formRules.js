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

// ── Lunge ──────────────────────────────────────────────────────────────────

const lunge = {
  checkForm(angles) {
    const { leftKnee, rightKnee } = angles
    const knee = avg(leftKnee, rightKnee)

    if (knee == null) return { score: 60, feedback: 'Position legs in frame', isGoodForm: false }

    const atBottom = knee < 130

    if (!atBottom) {
      return { score: 70, feedback: 'Drop into the lunge — front knee toward 90°', isGoodForm: false }
    }

    if (leftKnee != null && rightKnee != null && Math.abs(leftKnee - rightKnee) > 20) {
      return { score: 55, feedback: 'Even out your stance — knees are uneven', isGoodForm: false }
    }

    if (knee < 70) {
      return { score: 65, feedback: 'Too deep — knee should bend to about 90°', isGoodForm: false }
    }

    if (knee > 110) {
      return { score: 70, feedback: 'Bend deeper — front knee should reach 90°', isGoodForm: false }
    }

    if (knee >= 85 && knee <= 95) {
      return { score: 100, feedback: 'Perfect lunge depth!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good lunge — aim for 90° at the front knee', isGoodForm: true }
  },

  countRep(angles, phase) {
    const { leftKnee, rightKnee } = angles
    const knee = avg(leftKnee, rightKnee)
    if (knee == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && knee < 100)  return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && knee > 150) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Bulgarian Split Squat ──────────────────────────────────────────────────

const bulgarianSplitSquat = {
  checkForm(angles) {
    const { leftKnee, rightKnee } = angles
    const knee = rightKnee ?? leftKnee

    if (knee == null) return { score: 60, feedback: 'Position front leg in frame', isGoodForm: false }

    const atBottom = knee < 130

    if (!atBottom) {
      return { score: 70, feedback: 'Drop down — front knee toward 90°', isGoodForm: false }
    }

    if (knee < 70) {
      return { score: 65, feedback: 'Too deep — back off slightly to protect the knee', isGoodForm: false }
    }

    if (knee > 110) {
      return { score: 70, feedback: 'Bend deeper — front knee should reach 90°', isGoodForm: false }
    }

    if (knee >= 85 && knee <= 95) {
      return { score: 100, feedback: 'Great split squat depth!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Solid rep — keep front knee near 90°', isGoodForm: true }
  },

  countRep(angles, phase) {
    const { leftKnee, rightKnee } = angles
    const knee = rightKnee ?? leftKnee
    if (knee == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && knee < 100)  return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && knee > 150) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Goblet Squat ───────────────────────────────────────────────────────────

const gobletSquat = {
  checkForm(angles) {
    const { leftKnee, rightKnee, leftHip, rightHip } = angles
    const knee = avg(leftKnee, rightKnee)
    const hip  = avg(leftHip, rightHip)

    if (knee == null) return { score: 60, feedback: 'Position legs in frame', isGoodForm: false }

    const atBottom = knee < 120

    if (!atBottom) {
      return { score: 70, feedback: 'Descend until knees reach 90°', isGoodForm: false }
    }

    if (leftKnee != null && rightKnee != null && Math.abs(leftKnee - rightKnee) > 15) {
      return { score: 50, feedback: 'Keep knees even — one is collapsing inward', isGoodForm: false }
    }

    if (knee >= 80 && knee <= 100 && hip != null && hip >= 90 && hip <= 110) {
      return { score: 100, feedback: 'Beautiful goblet squat!', isGoodForm: true }
    }

    if (knee < 80) {
      return { score: 75, feedback: 'Depth is great — keep chest tall', isGoodForm: false }
    }

    if (hip != null && hip > 110) {
      return { score: 70, feedback: 'Sit hips a bit deeper', isGoodForm: false }
    }

    return { score: 85, feedback: 'Good goblet squat — keep that upright torso', isGoodForm: true }
  },

  countRep(angles, phase) {
    const { leftKnee, rightKnee } = angles
    const knee = avg(leftKnee, rightKnee)
    if (knee == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && knee < 100) return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && knee > 150) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Overhead Press ─────────────────────────────────────────────────────────

const overheadPress = {
  checkForm(angles) {
    const { leftElbow, rightElbow, leftShoulder, rightShoulder } = angles
    const elbow    = avg(leftElbow, rightElbow)
    const shoulder = avg(leftShoulder, rightShoulder)

    if (elbow == null) return { score: 60, feedback: 'Position arms in frame', isGoodForm: false }

    const atTop = elbow > 150

    if (!atTop) {
      return { score: 70, feedback: 'Press the weight overhead — extend the elbows', isGoodForm: false }
    }

    if (leftElbow != null && rightElbow != null && Math.abs(leftElbow - rightElbow) > 15) {
      return { score: 55, feedback: 'Press evenly — arms are out of sync', isGoodForm: false }
    }

    if (shoulder != null && shoulder < 140) {
      return { score: 65, feedback: 'Stack elbows over shoulders at lockout', isGoodForm: false }
    }

    if (elbow >= 165 && elbow <= 180) {
      return { score: 100, feedback: 'Strong lockout overhead!', isGoodForm: true }
    }

    return { score: 80, feedback: 'Good press — finish with arms fully extended', isGoodForm: true }
  },

  countRep(angles, phase) {
    const elbow = avg(angles.leftElbow, angles.rightElbow)
    if (elbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && elbow < 100)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && elbow > 160) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Bench Press ────────────────────────────────────────────────────────────

const benchPress = {
  checkForm(angles) {
    const { leftElbow, rightElbow } = angles
    const elbow = avg(leftElbow, rightElbow)

    if (elbow == null) return { score: 60, feedback: 'Position arms in frame', isGoodForm: false }

    const atBottom = elbow < 120

    if (!atBottom) {
      return { score: 70, feedback: 'Lower the bar toward your chest', isGoodForm: false }
    }

    if (leftElbow != null && rightElbow != null && Math.abs(leftElbow - rightElbow) > 15) {
      return { score: 55, feedback: 'Press evenly — one arm is lagging', isGoodForm: false }
    }

    if (elbow < 70) {
      return { score: 65, feedback: 'Too deep — bar is bottoming on your chest', isGoodForm: false }
    }

    if (elbow > 110) {
      return { score: 70, feedback: 'Go a touch deeper — aim for 90° at the elbow', isGoodForm: false }
    }

    if (elbow >= 80 && elbow <= 95) {
      return { score: 100, feedback: 'Perfect bench press depth!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good rep — keep that elbow near 90° at the bottom', isGoodForm: true }
  },

  countRep(angles, phase) {
    const elbow = avg(angles.leftElbow, angles.rightElbow)
    if (elbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && elbow < 95)    return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && elbow > 150) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Tricep Extension ───────────────────────────────────────────────────────

const tricepExtension = {
  checkForm(angles) {
    const { rightElbow } = angles

    if (rightElbow == null) return { score: 60, feedback: 'Keep right arm in frame', isGoodForm: false }

    const atTop = rightElbow > 150

    if (!atTop) {
      if (rightElbow < 80) {
        return { score: 70, feedback: 'Extend the elbow — drive the weight up', isGoodForm: false }
      }
      return { score: 75, feedback: 'Keep extending — lock out the elbow', isGoodForm: false }
    }

    if (rightElbow > 165) {
      return { score: 100, feedback: 'Full extension — strong lockout!', isGoodForm: true }
    }

    if (rightElbow > 160) {
      return { score: 90, feedback: 'Almost full extension — squeeze the tricep', isGoodForm: true }
    }

    return { score: 80, feedback: 'Good extension — push for a full lockout', isGoodForm: true }
  },

  countRep(angles, phase) {
    const { rightElbow } = angles
    if (rightElbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && rightElbow < 70)    return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && rightElbow > 150) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Bent Over Row ──────────────────────────────────────────────────────────

const bentOverRow = {
  checkForm(angles) {
    const { leftElbow, rightElbow, leftHip, rightHip } = angles
    const elbow = avg(leftElbow, rightElbow)
    const hip   = avg(leftHip, rightHip)

    if (elbow == null) return { score: 60, feedback: 'Position arms in frame', isGoodForm: false }

    if (hip != null && hip > 130) {
      return { score: 55, feedback: 'Hinge forward — torso is too upright', isGoodForm: false }
    }

    const atTop = elbow < 100

    if (!atTop) {
      return { score: 70, feedback: 'Pull the weight to your hip — drive elbows back', isGoodForm: false }
    }

    if (leftElbow != null && rightElbow != null && Math.abs(leftElbow - rightElbow) > 15) {
      return { score: 60, feedback: 'Pull evenly — arms are out of sync', isGoodForm: false }
    }

    if (hip != null && (hip < 80 || hip > 110)) {
      return { score: 75, feedback: 'Hold a 90° torso hinge throughout the row', isGoodForm: false }
    }

    if (elbow >= 60 && elbow <= 80) {
      return { score: 100, feedback: 'Strong row — great elbow drive!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good row — squeeze the shoulder blades', isGoodForm: true }
  },

  countRep(angles, phase) {
    const elbow = avg(angles.leftElbow, angles.rightElbow)
    if (elbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'down' && elbow < 80)  return { newPhase: 'up', repCounted: true  }
    if (phase === 'up'   && elbow > 150) return { newPhase: 'down', repCounted: false }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Hammer Curl ────────────────────────────────────────────────────────────

const hammerCurl = {
  checkForm(angles) {
    const { leftElbow, rightElbow } = angles
    const elbow = avg(leftElbow, rightElbow)

    if (elbow == null) return { score: 60, feedback: 'Keep arms in frame', isGoodForm: false }

    const atTop = elbow < 80

    if (!atTop) {
      if (elbow > 140) {
        return { score: 70, feedback: 'Curl the weight up — aim for 50° at the elbow', isGoodForm: false }
      }
      return { score: 75, feedback: 'Keep curling — squeeze at the top', isGoodForm: false }
    }

    if (leftElbow != null && rightElbow != null && Math.abs(leftElbow - rightElbow) > 15) {
      return { score: 65, feedback: 'Curl evenly — one arm is lagging', isGoodForm: false }
    }

    if (elbow <= 70) {
      return { score: 100, feedback: 'Full range of motion — nice hammer curl!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good curl — squeeze a touch more at the top', isGoodForm: true }
  },

  countRep(angles, phase) {
    const elbow = avg(angles.leftElbow, angles.rightElbow)
    if (elbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'down' && elbow < 70)  return { newPhase: 'up', repCounted: false }
    if (phase === 'up'   && elbow > 140) return { newPhase: 'down', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Lateral Raise ──────────────────────────────────────────────────────────

const lateralRaise = {
  checkForm(angles) {
    const { leftShoulder, rightShoulder } = angles
    const shoulder = avg(leftShoulder, rightShoulder)

    if (shoulder == null) return { score: 60, feedback: 'Keep shoulders in frame', isGoodForm: false }

    const atTop = shoulder > 70

    if (!atTop) {
      return { score: 70, feedback: 'Raise the arms — aim for parallel to the floor', isGoodForm: false }
    }

    if (leftShoulder != null && rightShoulder != null && Math.abs(leftShoulder - rightShoulder) > 15) {
      return { score: 60, feedback: 'Raise evenly — arms are uneven', isGoodForm: false }
    }

    if (shoulder > 110) {
      return { score: 65, feedback: 'Too high — stop at shoulder height', isGoodForm: false }
    }

    if (shoulder >= 85 && shoulder <= 95) {
      return { score: 100, feedback: 'Perfect — arms parallel to the floor!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good raise — finish at exactly shoulder height', isGoodForm: true }
  },

  countRep(angles, phase) {
    const shoulder = avg(angles.leftShoulder, angles.rightShoulder)
    if (shoulder == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && shoulder < 30)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && shoulder > 80) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Deadlift ───────────────────────────────────────────────────────────────

const deadlift = {
  checkForm(angles) {
    const { leftKnee, rightKnee, leftHip, rightHip } = angles
    const knee = avg(leftKnee, rightKnee)
    const hip  = avg(leftHip, rightHip)

    if (hip == null) return { score: 60, feedback: 'Position torso in frame', isGoodForm: false }

    const atTop = hip > 150

    if (!atTop) {
      return { score: 70, feedback: 'Drive hips through — stand tall to lock out', isGoodForm: false }
    }

    if (hip > 185) {
      return { score: 60, feedback: 'Don\'t hyperextend at the top — stand neutral', isGoodForm: false }
    }

    if (leftKnee != null && rightKnee != null && Math.abs(leftKnee - rightKnee) > 15) {
      return { score: 65, feedback: 'Lock out evenly — knees are uneven', isGoodForm: false }
    }

    if (knee != null && knee < 160) {
      return { score: 75, feedback: 'Extend the knees fully at lockout', isGoodForm: false }
    }

    if (hip > 170 && knee != null && knee > 160) {
      return { score: 100, feedback: 'Strong lockout — hips and knees fully extended!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good pull — drive hips fully through at the top', isGoodForm: true }
  },

  countRep(angles, phase) {
    const hip = avg(angles.leftHip, angles.rightHip)
    if (hip == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && hip < 110)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && hip > 160) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Romanian Deadlift ──────────────────────────────────────────────────────

const romanianDeadlift = {
  checkForm(angles) {
    const { leftKnee, rightKnee, leftHip, rightHip } = angles
    const knee = avg(leftKnee, rightKnee)
    const hip  = avg(leftHip, rightHip)

    if (hip == null) return { score: 60, feedback: 'Position torso in frame', isGoodForm: false }

    if (knee != null && knee < 140) {
      return { score: 55, feedback: 'Too much knee bend — keep legs nearly straight', isGoodForm: false }
    }

    if (knee != null && knee < 150) {
      return { score: 75, feedback: 'Soften knees just slightly — this is a hip hinge', isGoodForm: false }
    }

    const atBottom = hip < 130

    if (!atBottom) {
      return { score: 80, feedback: 'Hinge deeper at the hips — keep the bar close', isGoodForm: false }
    }

    if (hip >= 90 && hip <= 120) {
      return { score: 100, feedback: 'Beautiful hip hinge!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good hinge — drive hips back, chest stays proud', isGoodForm: true }
  },

  countRep(angles, phase) {
    const hip = avg(angles.leftHip, angles.rightHip)
    if (hip == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && hip < 110)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && hip > 160) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Plank ──────────────────────────────────────────────────────────────────

const plank = {
  checkForm(angles) {
    const { leftHip, rightHip } = angles
    const hip = avg(leftHip, rightHip)

    if (hip == null) return { score: 60, feedback: 'Position body in frame', isGoodForm: false }

    if (hip < 160) {
      return { score: 70, feedback: 'Hips are sagging — squeeze glutes and core', isGoodForm: false }
    }

    if (hip > 195) {
      return { score: 70, feedback: 'Hips are piking up — flatten your back', isGoodForm: false }
    }

    if (hip >= 170 && hip <= 185) {
      return { score: 100, feedback: 'Perfect plank — straight line head to heels!', isGoodForm: true }
    }

    return { score: 70, feedback: 'Hold a straight line — engage the core', isGoodForm: false }
  },

  countRep(angles, phase) {
    return { newPhase: phase, repCounted: false }
  },
}

// ── Sumo Squat ─────────────────────────────────────────────────────────────

const sumoSquat = {
  checkForm(angles) {
    const { leftKnee, rightKnee, leftHip, rightHip } = angles
    const knee = avg(leftKnee, rightKnee)
    const hip  = avg(leftHip, rightHip)

    if (knee == null) return { score: 60, feedback: 'Position legs in frame', isGoodForm: false }

    const atBottom = knee < 130

    if (!atBottom) {
      return { score: 70, feedback: 'Sink lower into the sumo stance', isGoodForm: false }
    }

    if (leftKnee != null && rightKnee != null && Math.abs(leftKnee - rightKnee) > 15) {
      return { score: 55, feedback: 'Keep knees tracking out evenly', isGoodForm: false }
    }

    if (knee >= 100 && knee <= 115 && hip != null && hip >= 85 && hip <= 105) {
      return { score: 100, feedback: 'Strong sumo squat — knees tracking out!', isGoodForm: true }
    }

    if (knee < 100) {
      return { score: 80, feedback: 'Plenty deep — keep chest tall', isGoodForm: true }
    }

    return { score: 80, feedback: 'Good sumo squat — sink hips between knees', isGoodForm: true }
  },

  countRep(angles, phase) {
    const knee = avg(angles.leftKnee, angles.rightKnee)
    if (knee == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && knee < 110)  return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && knee > 150) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Jump Squat ─────────────────────────────────────────────────────────────

const jumpSquat = {
  checkForm(angles) {
    const { leftKnee, rightKnee, leftHip, rightHip } = angles
    const knee = avg(leftKnee, rightKnee)
    const hip  = avg(leftHip, rightHip)

    if (knee == null) return { score: 60, feedback: 'Position legs in frame', isGoodForm: false }

    if (knee > 170) {
      return { score: 100, feedback: 'Full extension — explode up!', isGoodForm: true }
    }

    const atBottom = knee < 120

    if (!atBottom) {
      return { score: 70, feedback: 'Drop into the squat then drive up', isGoodForm: false }
    }

    if (leftKnee != null && rightKnee != null && Math.abs(leftKnee - rightKnee) > 15) {
      return { score: 55, feedback: 'Land evenly — knees are uneven', isGoodForm: false }
    }

    if (knee >= 80 && knee <= 100 && hip != null && hip < 100) {
      return { score: 90, feedback: 'Great depth — now drive up explosively!', isGoodForm: true }
    }

    return { score: 80, feedback: 'Good jump squat — fully extend on the jump', isGoodForm: true }
  },

  countRep(angles, phase) {
    const knee = avg(angles.leftKnee, angles.rightKnee)
    if (knee == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && knee < 110)  return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && knee > 160) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Wall Sit ───────────────────────────────────────────────────────────────

const wallSit = {
  checkForm(angles) {
    const { leftKnee, rightKnee, leftHip, rightHip } = angles
    const knee = avg(leftKnee, rightKnee)
    const hip  = avg(leftHip, rightHip)

    if (knee == null || hip == null) {
      return { score: 60, feedback: 'Position body in frame', isGoodForm: false }
    }

    if (knee > 110) {
      return { score: 70, feedback: 'Sit lower — aim for 90° at the knee', isGoodForm: false }
    }

    if (hip < 80) {
      return { score: 70, feedback: 'Hips are too low — raise to 90°', isGoodForm: false }
    }

    if (knee >= 85 && knee <= 95 && hip >= 85 && hip <= 95) {
      return { score: 100, feedback: 'Perfect wall sit position — hold strong!', isGoodForm: true }
    }

    return { score: 70, feedback: 'Adjust to 90° at hips and knees', isGoodForm: false }
  },

  countRep(angles, phase) {
    return { newPhase: phase, repCounted: false }
  },
}

// ── Step Up ────────────────────────────────────────────────────────────────

const stepUp = {
  checkForm(angles) {
    const { leftKnee, rightKnee } = angles

    if (rightKnee == null) return { score: 60, feedback: 'Keep right leg in frame', isGoodForm: false }

    const atTop = rightKnee < 110

    if (!atTop) {
      return { score: 70, feedback: 'Drive up onto the step', isGoodForm: false }
    }

    if (leftKnee != null && Math.abs(leftKnee - rightKnee) > 25) {
      return { score: 60, feedback: 'Plant both feet evenly on the step', isGoodForm: false }
    }

    if (rightKnee >= 85 && rightKnee <= 95) {
      return { score: 100, feedback: 'Strong step up — drive through the heel!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good step up — keep that working knee near 90°', isGoodForm: true }
  },

  countRep(angles, phase) {
    const { rightKnee } = angles
    if (rightKnee == null) return { newPhase: phase, repCounted: false }

    if (phase === 'down' && rightKnee < 100) return { newPhase: 'up', repCounted: true  }
    if (phase === 'up'   && rightKnee > 150) return { newPhase: 'down', repCounted: false }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Calf Raise ─────────────────────────────────────────────────────────────

const calfRaise = {
  checkForm(angles) {
    const { leftHip, rightHip } = angles
    const hip = avg(leftHip, rightHip)

    if (hip == null) return { score: 60, feedback: 'Position torso in frame', isGoodForm: false }

    if (hip < 170) {
      return { score: 70, feedback: 'Stand tall — keep hips fully extended', isGoodForm: false }
    }

    return { score: 90, feedback: 'Drive up onto the toes — squeeze the calves', isGoodForm: true }
  },

  countRep(angles, phase) {
    const hip = avg(angles.leftHip, angles.rightHip)
    if (hip == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && hip < 175)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && hip > 178) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Glute Bridge ───────────────────────────────────────────────────────────

const gluteBridge = {
  checkForm(angles) {
    const { leftKnee, rightKnee, leftHip, rightHip } = angles
    const knee = avg(leftKnee, rightKnee)
    const hip  = avg(leftHip, rightHip)

    if (hip == null) return { score: 60, feedback: 'Position hips in frame', isGoodForm: false }

    const atTop = hip > 150

    if (!atTop) {
      return { score: 70, feedback: 'Drive hips up — squeeze glutes at the top', isGoodForm: false }
    }

    if (hip < 160) {
      return { score: 75, feedback: 'Push higher — finish with full hip extension', isGoodForm: false }
    }

    if (knee != null && (knee < 70 || knee > 110)) {
      return { score: 80, feedback: 'Keep knees bent around 90°', isGoodForm: false }
    }

    if (hip >= 170 && hip <= 180) {
      return { score: 100, feedback: 'Strong bridge — full glute lockout!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good bridge — squeeze glutes a touch harder', isGoodForm: true }
  },

  countRep(angles, phase) {
    const hip = avg(angles.leftHip, angles.rightHip)
    if (hip == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && hip < 130)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && hip > 165) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Hip Thrust ─────────────────────────────────────────────────────────────

const hipThrust = {
  checkForm(angles) {
    const { leftKnee, rightKnee, leftHip, rightHip } = angles
    const knee = avg(leftKnee, rightKnee)
    const hip  = avg(leftHip, rightHip)

    if (hip == null) return { score: 60, feedback: 'Position hips in frame', isGoodForm: false }

    const atTop = hip > 155

    if (!atTop) {
      return { score: 70, feedback: 'Drive hips up — finish with full extension', isGoodForm: false }
    }

    if (hip < 165) {
      return { score: 75, feedback: 'Push higher — squeeze hard at the top', isGoodForm: false }
    }

    if (knee != null && (knee < 70 || knee > 110)) {
      return { score: 80, feedback: 'Keep shins vertical — knees near 90°', isGoodForm: false }
    }

    if (hip >= 175 && hip <= 185) {
      return { score: 100, feedback: 'Strong hip thrust — full lockout!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good thrust — drive hips a bit higher', isGoodForm: true }
  },

  countRep(angles, phase) {
    const hip = avg(angles.leftHip, angles.rightHip)
    if (hip == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && hip < 130)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && hip > 170) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Incline Push Up ────────────────────────────────────────────────────────

const inclinePushUp = {
  checkForm(angles) {
    const { leftElbow, rightElbow, leftShoulder, rightShoulder } = angles
    const elbow    = avg(leftElbow, rightElbow)
    const shoulder = avg(leftShoulder, rightShoulder)

    if (elbow == null) return { score: 60, feedback: 'Position arms in frame', isGoodForm: false }

    const atBottom = elbow < 130

    if (!atBottom) {
      return { score: 70, feedback: 'Lower chest toward the surface', isGoodForm: false }
    }

    if (leftElbow != null && rightElbow != null && Math.abs(leftElbow - rightElbow) > 15) {
      return { score: 60, feedback: 'Press evenly — one arm is lagging', isGoodForm: false }
    }

    if (shoulder != null && shoulder < 55) {
      return { score: 65, feedback: 'Tuck elbows — shoulders flaring out', isGoodForm: false }
    }

    if (elbow >= 90 && elbow <= 110) {
      return { score: 100, feedback: 'Great incline push-up depth!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good rep — keep core braced', isGoodForm: true }
  },

  countRep(angles, phase) {
    const elbow = avg(angles.leftElbow, angles.rightElbow)
    if (elbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && elbow < 110)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && elbow > 150) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Decline Push Up ────────────────────────────────────────────────────────

const declinePushUp = {
  checkForm(angles) {
    const { leftElbow, rightElbow, leftShoulder, rightShoulder } = angles
    const elbow    = avg(leftElbow, rightElbow)
    const shoulder = avg(leftShoulder, rightShoulder)

    if (elbow == null) return { score: 60, feedback: 'Position arms in frame', isGoodForm: false }

    const atBottom = elbow < 110

    if (!atBottom) {
      return { score: 70, feedback: 'Lower chest closer to the ground', isGoodForm: false }
    }

    if (leftElbow != null && rightElbow != null && Math.abs(leftElbow - rightElbow) > 10) {
      return { score: 55, feedback: 'Press dead even — small drift is amplified on decline', isGoodForm: false }
    }

    if (shoulder != null && Math.abs((angles.leftShoulder ?? 0) - (angles.rightShoulder ?? 0)) > 15) {
      return { score: 60, feedback: 'Shoulders are uneven — set scapulae symmetrically', isGoodForm: false }
    }

    if (elbow >= 80 && elbow <= 95) {
      return { score: 100, feedback: 'Perfect decline push-up depth!', isGoodForm: true }
    }

    if (elbow < 80) {
      return { score: 80, feedback: 'Deep — keep core locked to protect the lower back', isGoodForm: true }
    }

    return { score: 80, feedback: 'Good rep — aim for 90° at the elbow', isGoodForm: true }
  },

  countRep(angles, phase) {
    const elbow = avg(angles.leftElbow, angles.rightElbow)
    if (elbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && elbow < 95)    return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && elbow > 150) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Diamond Push Up ────────────────────────────────────────────────────────

const diamondPushUp = {
  checkForm(angles) {
    const { leftElbow, rightElbow, leftShoulder, rightShoulder } = angles
    const elbow    = avg(leftElbow, rightElbow)
    const shoulder = avg(leftShoulder, rightShoulder)

    if (elbow == null) return { score: 60, feedback: 'Position arms in frame', isGoodForm: false }

    const atBottom = elbow < 110

    if (!atBottom) {
      return { score: 70, feedback: 'Lower chest to your hands', isGoodForm: false }
    }

    if (shoulder != null && shoulder < 50) {
      return { score: 55, feedback: 'Keep elbows close to the ribs', isGoodForm: false }
    }

    if (elbow >= 70 && elbow <= 85) {
      return { score: 100, feedback: 'Killer diamond push-up depth!', isGoodForm: true }
    }

    if (elbow < 70) {
      return { score: 80, feedback: 'Deep — keep core tight to protect the shoulders', isGoodForm: true }
    }

    return { score: 80, feedback: 'Good rep — aim a bit deeper for full tricep stretch', isGoodForm: true }
  },

  countRep(angles, phase) {
    const elbow = avg(angles.leftElbow, angles.rightElbow)
    if (elbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && elbow < 100)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && elbow > 150) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Pike Push Up ───────────────────────────────────────────────────────────

const pikePushUp = {
  checkForm(angles) {
    const { leftElbow, rightElbow, leftShoulder, rightShoulder } = angles
    const elbow    = avg(leftElbow, rightElbow)
    const shoulder = avg(leftShoulder, rightShoulder)

    if (elbow == null) return { score: 60, feedback: 'Position arms in frame', isGoodForm: false }

    if (shoulder != null && shoulder < 130) {
      return { score: 60, feedback: 'Get into a pike — hips up, head toward the ground', isGoodForm: false }
    }

    const atBottom = elbow < 120

    if (!atBottom) {
      return { score: 70, feedback: 'Lower the head toward the floor', isGoodForm: false }
    }

    if (shoulder != null && (shoulder < 140 || shoulder > 170)) {
      return { score: 75, feedback: 'Hold a sharper pike — shoulders directly under hands', isGoodForm: false }
    }

    if (elbow >= 85 && elbow <= 100) {
      return { score: 100, feedback: 'Strong pike push-up!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good rep — aim for 90° at the elbow', isGoodForm: true }
  },

  countRep(angles, phase) {
    const elbow = avg(angles.leftElbow, angles.rightElbow)
    if (elbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && elbow < 100)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && elbow > 150) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Arnold Press ───────────────────────────────────────────────────────────

const arnoldPress = {
  checkForm(angles) {
    const { leftElbow, rightElbow, leftShoulder, rightShoulder } = angles
    const elbow    = avg(leftElbow, rightElbow)
    const shoulder = avg(leftShoulder, rightShoulder)

    if (elbow == null) return { score: 60, feedback: 'Position arms in frame', isGoodForm: false }

    const atTop = elbow > 150

    if (!atTop) {
      return { score: 70, feedback: 'Rotate and press — extend the elbows overhead', isGoodForm: false }
    }

    if (leftElbow != null && rightElbow != null && Math.abs(leftElbow - rightElbow) > 18) {
      return { score: 60, feedback: 'Press evenly — arms are out of sync', isGoodForm: false }
    }

    if (shoulder != null && shoulder < 140) {
      return { score: 70, feedback: 'Drive arms overhead — stack elbows over shoulders', isGoodForm: false }
    }

    if (elbow >= 165 && elbow <= 180) {
      return { score: 100, feedback: 'Smooth Arnold press — full lockout!', isGoodForm: true }
    }

    return { score: 80, feedback: 'Good press — finish with arms fully extended', isGoodForm: true }
  },

  countRep(angles, phase) {
    const elbow = avg(angles.leftElbow, angles.rightElbow)
    if (elbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && elbow < 90)    return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && elbow > 160) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Front Raise ────────────────────────────────────────────────────────────

const frontRaise = {
  checkForm(angles) {
    const { leftShoulder, rightShoulder } = angles
    const shoulder = avg(leftShoulder, rightShoulder)

    if (shoulder == null) return { score: 60, feedback: 'Keep shoulders in frame', isGoodForm: false }

    const atTop = shoulder > 70

    if (!atTop) {
      return { score: 70, feedback: 'Raise arms in front — aim for shoulder height', isGoodForm: false }
    }

    if (leftShoulder != null && rightShoulder != null && Math.abs(leftShoulder - rightShoulder) > 15) {
      return { score: 60, feedback: 'Raise evenly — one arm is lagging', isGoodForm: false }
    }

    if (shoulder > 110) {
      return { score: 65, feedback: 'Stop at shoulder height — too high engages traps', isGoodForm: false }
    }

    if (shoulder >= 85 && shoulder <= 100) {
      return { score: 100, feedback: 'Perfect height — arms parallel to the floor!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good raise — finish at exactly shoulder height', isGoodForm: true }
  },

  countRep(angles, phase) {
    const shoulder = avg(angles.leftShoulder, angles.rightShoulder)
    if (shoulder == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && shoulder < 30)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && shoulder > 80) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Reverse Fly ────────────────────────────────────────────────────────────

const reverseFly = {
  checkForm(angles) {
    const { leftShoulder, rightShoulder, leftHip, rightHip } = angles
    const shoulder = avg(leftShoulder, rightShoulder)
    const hip      = avg(leftHip, rightHip)

    if (shoulder == null) return { score: 60, feedback: 'Keep shoulders in frame', isGoodForm: false }

    if (hip != null && hip > 130) {
      return { score: 55, feedback: 'Hinge forward — torso is too upright', isGoodForm: false }
    }

    const atTop = shoulder > 70

    if (!atTop) {
      return { score: 70, feedback: 'Squeeze shoulder blades — raise arms to the sides', isGoodForm: false }
    }

    if (leftShoulder != null && rightShoulder != null && Math.abs(leftShoulder - rightShoulder) > 15) {
      return { score: 60, feedback: 'Raise evenly — arms are uneven', isGoodForm: false }
    }

    if (hip != null && (hip < 70 || hip > 110)) {
      return { score: 75, feedback: 'Hold the bent-over position throughout', isGoodForm: false }
    }

    if (shoulder >= 80 && shoulder <= 95) {
      return { score: 100, feedback: 'Strong reverse fly — squeeze those rear delts!', isGoodForm: true }
    }

    return { score: 85, feedback: 'Good rep — drive elbows back and up', isGoodForm: true }
  },

  countRep(angles, phase) {
    const shoulder = avg(angles.leftShoulder, angles.rightShoulder)
    if (shoulder == null) return { newPhase: phase, repCounted: false }

    if (phase === 'up' && shoulder < 40)   return { newPhase: 'down', repCounted: false }
    if (phase === 'down' && shoulder > 75) return { newPhase: 'up', repCounted: true  }
    return { newPhase: phase, repCounted: false }
  },
}

// ── Concentration Curl ─────────────────────────────────────────────────────

const concentrationCurl = {
  checkForm(angles) {
    const { rightElbow, leftHip, rightHip } = angles
    const hip = avg(leftHip, rightHip)

    if (rightElbow == null) return { score: 60, feedback: 'Keep right arm in frame', isGoodForm: false }

    if (hip != null && hip > 100) {
      return { score: 60, feedback: 'Lean over — concentration curl is a seated/hinged lift', isGoodForm: false }
    }

    const atTop = rightElbow < 80

    if (!atTop) {
      if (rightElbow > 140) {
        return { score: 70, feedback: 'Curl the weight up to the shoulder', isGoodForm: false }
      }
      return { score: 75, feedback: 'Keep curling — squeeze at the top', isGoodForm: false }
    }

    if (rightElbow >= 50 && rightElbow <= 65) {
      return { score: 100, feedback: 'Tight squeeze — feel that bicep peak!', isGoodForm: true }
    }

    if (rightElbow <= 70) {
      return { score: 90, feedback: 'Strong curl — hold the squeeze a beat longer', isGoodForm: true }
    }

    return { score: 80, feedback: 'Good curl — drive the elbow into your thigh', isGoodForm: true }
  },

  countRep(angles, phase) {
    const { rightElbow } = angles
    if (rightElbow == null) return { newPhase: phase, repCounted: false }

    if (phase === 'down' && rightElbow < 70)  return { newPhase: 'up', repCounted: true  }
    if (phase === 'up'   && rightElbow > 140) return { newPhase: 'down', repCounted: false }
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
  lunge,
  bulgarian_split_squat: bulgarianSplitSquat,
  goblet_squat: gobletSquat,
  overhead_press: overheadPress,
  bench_press: benchPress,
  tricep_extension: tricepExtension,
  bent_over_row: bentOverRow,
  hammer_curl: hammerCurl,
  lateral_raise: lateralRaise,
  deadlift,
  romanian_deadlift: romanianDeadlift,
  plank,
  sumo_squat: sumoSquat,
  jump_squat: jumpSquat,
  wall_sit: wallSit,
  step_up: stepUp,
  calf_raise: calfRaise,
  glute_bridge: gluteBridge,
  hip_thrust: hipThrust,
  incline_push_up: inclinePushUp,
  decline_push_up: declinePushUp,
  diamond_push_up: diamondPushUp,
  pike_push_up: pikePushUp,
  arnold_press: arnoldPress,
  front_raise: frontRaise,
  reverse_fly: reverseFly,
  concentration_curl: concentrationCurl,
}

export function getExerciseRules(exerciseName) {
  const key = exerciseName.toLowerCase().replace(/\s+/g, '_')
  return exercises[key] ?? null
}
