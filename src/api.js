const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

let predictionBuffer = [];
let flushTimer = null;

export function sendPrediction(action, confidence, keypoints) {
  const hipY = (keypoints[11].y + keypoints[12].y) / 2;
  const shoulderY = (keypoints[5].y + keypoints[6].y) / 2;
  const hipX = (keypoints[11].x + keypoints[12].x) / 2;

  predictionBuffer.push({
    action,
    confidence,
    hip_y: hipY,
    shoulder_y: shoulderY,
    hip_x: hipX,
    timestamp: Date.now(),
  });

  if (!flushTimer) {
    flushTimer = setTimeout(flushPredictions, 1000);
  }
}

async function flushPredictions() {
  flushTimer = null;
  if (predictionBuffer.length === 0) return;

  const batch = predictionBuffer.splice(0);

  try {
    await fetch(`${BACKEND_URL}/api/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictions: batch }),
    });
  } catch (err) {
    console.warn('Failed to send predictions:', err.message);
  }
}
