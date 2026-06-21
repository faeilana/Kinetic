const JUMP_THRESHOLD = 0.06;
const DUCK_THRESHOLD = 0.06;
const LEAN_THRESHOLD = 0.05;
const JUMP_VELOCITY_THRESHOLD = -80;
const JUMP_COOLDOWN_MS = 400;
const ACTION_HOLD_FRAMES = 3;

export function calibrate(frames) {
  let hipYSum = 0;
  let hipXSum = 0;
  let kneeYSum = 0;
  let shoulderYSum = 0;
  let count = 0;

  for (const keypoints of frames) {
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];

    if (leftHip && rightHip && leftKnee && rightKnee && leftShoulder && rightShoulder) {
      hipYSum += (leftHip.y + rightHip.y) / 2;
      hipXSum += (leftHip.x + rightHip.x) / 2;
      kneeYSum += (leftKnee.y + rightKnee.y) / 2;
      shoulderYSum += (leftShoulder.y + rightShoulder.y) / 2;
      count++;
    }
  }

  if (count === 0) {
    return { hipY: 0.5, hipX: 0.5, kneeY: 0.7, shoulderY: 0.3 };
  }

  return {
    hipY: hipYSum / count,
    hipX: hipXSum / count,
    kneeY: kneeYSum / count,
    shoulderY: shoulderYSum / count,
  };
}

export class PoseClassifier {
  constructor() {
    this.lastJumpTime = 0;
    this.currentAction = 'idle';
    this.actionHoldCount = 0;
    this.pendingAction = 'idle';
    this.jumpTriggered = false;
  }

  classify(keypoints, baseline, history) {
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];

    if (!leftHip || !rightHip) {
      return { action: this.currentAction, confidence: 0 };
    }

    const hipY = (leftHip.y + rightHip.y) / 2;
    const hipX = (leftHip.x + rightHip.x) / 2;
    const kneeY = leftKnee && rightKnee ? (leftKnee.y + rightKnee.y) / 2 : null;
    const shoulderY = leftShoulder && rightShoulder
      ? (leftShoulder.y + rightShoulder.y) / 2
      : null;

    const now = performance.now();
    let detectedAction = 'idle';
    let confidence = 1;

    // Jump detection: use both position delta AND velocity
    const jumpDelta = baseline.hipY - hipY;
    const shoulderDelta = shoulderY !== null ? baseline.shoulderY - shoulderY : 0;
    const combinedDelta = (jumpDelta + shoulderDelta) / 2;

    // Get hip velocity from history (negative vy = moving up)
    let hipVelocity = 0;
    if (history && history.length >= 2) {
      const vel = history.getVelocity(11);
      hipVelocity = vel.vy;
    }

    const timeSinceLastJump = now - this.lastJumpTime;

    if (combinedDelta > JUMP_THRESHOLD && timeSinceLastJump > JUMP_COOLDOWN_MS) {
      detectedAction = 'jump';
      confidence = Math.min(combinedDelta / (JUMP_THRESHOLD * 3), 1);
    } else if (hipVelocity < JUMP_VELOCITY_THRESHOLD && timeSinceLastJump > JUMP_COOLDOWN_MS) {
      // Velocity-based: player moving upward fast (even before position threshold hit)
      detectedAction = 'jump';
      confidence = Math.min(Math.abs(hipVelocity) / (Math.abs(JUMP_VELOCITY_THRESHOLD) * 2), 1);
    }

    // Duck detection
    if (detectedAction === 'idle') {
      const duckDelta = hipY - baseline.hipY;
      const kneeRise = kneeY !== null ? baseline.kneeY - kneeY : 0;
      if (duckDelta > DUCK_THRESHOLD || kneeRise > DUCK_THRESHOLD * 0.5) {
        detectedAction = 'duck';
        confidence = Math.min(Math.max(duckDelta, kneeRise) / (DUCK_THRESHOLD * 3), 1);
      }
    }

    // Lean detection
    if (detectedAction === 'idle') {
      const leanLeftDelta = baseline.hipX - hipX;
      if (leanLeftDelta > LEAN_THRESHOLD) {
        detectedAction = 'lean_left';
        confidence = Math.min(leanLeftDelta / (LEAN_THRESHOLD * 3), 1);
      }

      const leanRightDelta = hipX - baseline.hipX;
      if (leanRightDelta > LEAN_THRESHOLD) {
        detectedAction = 'lean_right';
        confidence = Math.min(leanRightDelta / (LEAN_THRESHOLD * 3), 1);
      }
    }

    // Action hold / debounce: require action to persist for ACTION_HOLD_FRAMES
    // Exception: jump triggers immediately (latency-sensitive)
    if (detectedAction === 'jump') {
      if (!this.jumpTriggered) {
        this.jumpTriggered = true;
        this.lastJumpTime = now;
        this.currentAction = 'jump';
        this.actionHoldCount = 0;
        this.pendingAction = 'jump';
      }
      return { action: 'jump', confidence };
    }

    // Reset jump trigger when player returns to idle/other
    if (detectedAction !== 'jump') {
      this.jumpTriggered = false;
    }

    // For non-jump actions, apply debouncing
    if (detectedAction === this.pendingAction) {
      this.actionHoldCount++;
    } else {
      this.pendingAction = detectedAction;
      this.actionHoldCount = 1;
    }

    if (this.actionHoldCount >= ACTION_HOLD_FRAMES) {
      this.currentAction = this.pendingAction;
    }

    return { action: this.currentAction, confidence };
  }

  reset() {
    this.lastJumpTime = 0;
    this.currentAction = 'idle';
    this.actionHoldCount = 0;
    this.pendingAction = 'idle';
    this.jumpTriggered = false;
  }
}

// Legacy function for backward compatibility
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

  const jumpDelta = baseline.hipY - hipY;
  if (jumpDelta > JUMP_THRESHOLD) {
    const confidence = Math.min(jumpDelta / (JUMP_THRESHOLD * 3), 1);
    return { action: 'jump', confidence };
  }

  const duckDelta = hipY - baseline.hipY;
  const kneeRise = kneeY !== null ? baseline.kneeY - kneeY : 0;
  if (duckDelta > DUCK_THRESHOLD || kneeRise > DUCK_THRESHOLD * 0.5) {
    const confidence = Math.min(Math.max(duckDelta, kneeRise) / (DUCK_THRESHOLD * 3), 1);
    return { action: 'duck', confidence };
  }

  const leanLeftDelta = baseline.hipX - hipX;
  if (leanLeftDelta > LEAN_THRESHOLD) {
    const confidence = Math.min(leanLeftDelta / (LEAN_THRESHOLD * 3), 1);
    return { action: 'lean_left', confidence };
  }

  const leanRightDelta = hipX - baseline.hipX;
  if (leanRightDelta > LEAN_THRESHOLD) {
    const confidence = Math.min(leanRightDelta / (LEAN_THRESHOLD * 3), 1);
    return { action: 'lean_right', confidence };
  }

  return { action: 'idle', confidence: 1 };
}
