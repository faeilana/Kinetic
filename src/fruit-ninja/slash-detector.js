const SLASH_SPEED_THRESHOLD = 8;
const TRAIL_LENGTH = 15;
const MIN_CONFIDENCE = 0.3;

export class SlashDetector {
  constructor(canvasWidth, canvasHeight, videoWidth, videoHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.videoWidth = videoWidth;
    this.videoHeight = videoHeight;

    // Track both wrists
    this.leftWristTrail = [];
    this.rightWristTrail = [];
    this.leftSlashing = false;
    this.rightSlashing = false;
  }

  update(keypoints) {
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];

    if (leftWrist && leftWrist.score > MIN_CONFIDENCE) {
      const pos = this.mapToCanvas(leftWrist);
      this.leftWristTrail.push({ ...pos, time: Date.now() });
      if (this.leftWristTrail.length > TRAIL_LENGTH) {
        this.leftWristTrail.shift();
      }
      this.leftSlashing = this.detectSlashMotion(this.leftWristTrail);
    }

    if (rightWrist && rightWrist.score > MIN_CONFIDENCE) {
      const pos = this.mapToCanvas(rightWrist);
      this.rightWristTrail.push({ ...pos, time: Date.now() });
      if (this.rightWristTrail.length > TRAIL_LENGTH) {
        this.rightWristTrail.shift();
      }
      this.rightSlashing = this.detectSlashMotion(this.rightWristTrail);
    }
  }

  mapToCanvas(keypoint) {
    // Mirror X (webcam is mirrored) and scale to canvas
    const x = (1 - keypoint.x / this.videoWidth) * this.canvasWidth;
    const y = (keypoint.y / this.videoHeight) * this.canvasHeight;
    return { x, y };
  }

  detectSlashMotion(trail) {
    if (trail.length < 3) return false;

    const recent = trail.slice(-3);
    let totalSpeed = 0;

    for (let i = 1; i < recent.length; i++) {
      const dx = recent[i].x - recent[i - 1].x;
      const dy = recent[i].y - recent[i - 1].y;
      totalSpeed += Math.sqrt(dx * dx + dy * dy);
    }

    const avgSpeed = totalSpeed / (recent.length - 1);
    return avgSpeed > SLASH_SPEED_THRESHOLD;
  }

  getSlashPoints() {
    const points = [];

    if (this.leftSlashing && this.leftWristTrail.length >= 2) {
      const last = this.leftWristTrail[this.leftWristTrail.length - 1];
      const prev = this.leftWristTrail[this.leftWristTrail.length - 2];
      points.push({ x: last.x, y: last.y, prevX: prev.x, prevY: prev.y, hand: 'left' });
    }

    if (this.rightSlashing && this.rightWristTrail.length >= 2) {
      const last = this.rightWristTrail[this.rightWristTrail.length - 1];
      const prev = this.rightWristTrail[this.rightWristTrail.length - 2];
      points.push({ x: last.x, y: last.y, prevX: prev.x, prevY: prev.y, hand: 'right' });
    }

    return points;
  }

  getTrails() {
    return {
      left: this.leftSlashing ? [...this.leftWristTrail] : [],
      right: this.rightSlashing ? [...this.rightWristTrail] : [],
    };
  }

  getCurrentPositions() {
    const positions = [];
    if (this.leftWristTrail.length > 0) {
      positions.push({ ...this.leftWristTrail[this.leftWristTrail.length - 1], hand: 'left' });
    }
    if (this.rightWristTrail.length > 0) {
      positions.push({ ...this.rightWristTrail[this.rightWristTrail.length - 1], hand: 'right' });
    }
    return positions;
  }

  reset() {
    this.leftWristTrail = [];
    this.rightWristTrail = [];
    this.leftSlashing = false;
    this.rightSlashing = false;
  }
}
