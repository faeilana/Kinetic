const JUMP_THRESHOLD = 0.08;
const DUCK_THRESHOLD = 0.08;
const LEAN_THRESHOLD = 0.06;

export function calibrate(frames) {
  let hipYSum = 0;
  let hipXSum = 0;
  let kneeYSum = 0;
  let count = 0;

  for (const keypoints of frames) {
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];

    if (leftHip && rightHip && leftKnee && rightKnee) {
      const videoWidth = leftHip.x !== undefined ? 1 : 1;
      hipYSum += (leftHip.y + rightHip.y) / 2;
      hipXSum += (leftHip.x + rightHip.x) / 2;
      kneeYSum += (leftKnee.y + rightKnee.y) / 2;
      count++;
    }
  }

  if (count === 0) {
    return { hipY: 0.5, hipX: 0.5, kneeY: 0.7 };
  }

  return {
    hipY: hipYSum / count,
    hipX: hipXSum / count,
    kneeY: kneeYSum / count,
  };
}

export function classifyPose(keypoints, baseline) {
  const leftHip = keypoints[11];
  const rightHip = keypoints[12];
  const leftKnee = keypoints[13];
  const rightKnee = keypoints[14];

  if (!leftHip || !rightHip) {
    return { action: 'idle', confidence: 0 };
  }

  const hipY = (leftHip.y + rightHip.y) / 2;
  const hipX = (leftHip.x + rightHip.x) / 2;
  const kneeY = leftKnee && rightKnee ? (leftKnee.y + rightKnee.y) / 2 : null;

  // Jump: hips significantly higher than baseline
  const jumpDelta = baseline.hipY - hipY;
  if (jumpDelta > JUMP_THRESHOLD) {
    const confidence = Math.min(jumpDelta / (JUMP_THRESHOLD * 3), 1);
    return { action: 'jump', confidence };
  }

  // Duck: hips lower than baseline OR knees higher than baseline (squat)
  const duckDelta = hipY - baseline.hipY;
  const kneeRise = kneeY !== null ? baseline.kneeY - kneeY : 0;
  if (duckDelta > DUCK_THRESHOLD || kneeRise > 0) {
    const confidence = Math.min(Math.max(duckDelta, kneeRise) / (DUCK_THRESHOLD * 3), 1);
    return { action: 'duck', confidence };
  }

  // Lean left: hips shifted left
  const leanLeftDelta = baseline.hipX - hipX;
  if (leanLeftDelta > LEAN_THRESHOLD) {
    const confidence = Math.min(leanLeftDelta / (LEAN_THRESHOLD * 3), 1);
    return { action: 'lean_left', confidence };
  }

  // Lean right: hips shifted right
  const leanRightDelta = hipX - baseline.hipX;
  if (leanRightDelta > LEAN_THRESHOLD) {
    const confidence = Math.min(leanRightDelta / (LEAN_THRESHOLD * 3), 1);
    return { action: 'lean_right', confidence };
  }

  return { action: 'idle', confidence: 1 };
}
