const HISTORY_LENGTH = 10;
const SMOOTHING_WINDOW = 3;

export class PoseHistory {
  constructor() {
    this.frames = [];
    this.timestamps = [];
  }

  push(keypoints) {
    const now = performance.now();
    this.frames.push(keypoints);
    this.timestamps.push(now);

    if (this.frames.length > HISTORY_LENGTH) {
      this.frames.shift();
      this.timestamps.shift();
    }
  }

  get length() {
    return this.frames.length;
  }

  getSmoothed() {
    if (this.frames.length === 0) return null;
    if (this.frames.length === 1) return this.frames[0];

    const window = this.frames.slice(-SMOOTHING_WINDOW);
    const numKeypoints = window[0].length;
    const smoothed = [];

    for (let k = 0; k < numKeypoints; k++) {
      let xSum = 0;
      let ySum = 0;
      let scoreSum = 0;
      let validCount = 0;

      for (const frame of window) {
        if (frame[k] && frame[k].score > 0.2) {
          xSum += frame[k].x;
          ySum += frame[k].y;
          scoreSum += frame[k].score;
          validCount++;
        }
      }

      if (validCount > 0) {
        smoothed.push({
          x: xSum / validCount,
          y: ySum / validCount,
          score: scoreSum / validCount,
          name: window[0][k] ? window[0][k].name : undefined,
        });
      } else {
        smoothed.push(this.frames[this.frames.length - 1][k]);
      }
    }

    return smoothed;
  }

  getVelocity(keypointIndex) {
    if (this.frames.length < 2) return { vx: 0, vy: 0 };

    const recent = this.frames.slice(-3);
    const times = this.timestamps.slice(-3);
    let vxSum = 0;
    let vySum = 0;
    let count = 0;

    for (let i = 1; i < recent.length; i++) {
      const curr = recent[i][keypointIndex];
      const prev = recent[i - 1][keypointIndex];
      const dt = (times[i] - times[i - 1]) / 1000;

      if (curr && prev && curr.score > 0.3 && prev.score > 0.3 && dt > 0) {
        vxSum += (curr.x - prev.x) / dt;
        vySum += (curr.y - prev.y) / dt;
        count++;
      }
    }

    if (count === 0) return { vx: 0, vy: 0 };
    return { vx: vxSum / count, vy: vySum / count };
  }

  getAveragePosition(keypointIndex, numFrames) {
    const window = this.frames.slice(-numFrames);
    let xSum = 0;
    let ySum = 0;
    let count = 0;

    for (const frame of window) {
      const kp = frame[keypointIndex];
      if (kp && kp.score > 0.3) {
        xSum += kp.x;
        ySum += kp.y;
        count++;
      }
    }

    if (count === 0) return null;
    return { x: xSum / count, y: ySum / count };
  }

  clear() {
    this.frames = [];
    this.timestamps = [];
  }
}
