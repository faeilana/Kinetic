// MoveNet skeleton connections
const CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 4],       // face
  [5, 6],                                  // shoulders
  [5, 7], [7, 9],                          // left arm
  [6, 8], [8, 10],                         // right arm
  [5, 11], [6, 12],                        // torso
  [11, 12],                                // hips
  [11, 13], [13, 15],                      // left leg
  [12, 14], [14, 16],                      // right leg
];

const KEYPOINT_COLOR = '#00ff88';
const LINE_COLOR = '#00ccff';
const MIN_CONFIDENCE = 0.3;

export function drawSkeleton(ctx, keypoints, width, height) {
  // Draw connections
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 2;

  for (const [i, j] of CONNECTIONS) {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];

    if (kp1 && kp2 && kp1.score > MIN_CONFIDENCE && kp2.score > MIN_CONFIDENCE) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  }

  // Draw keypoints
  ctx.fillStyle = KEYPOINT_COLOR;

  for (const kp of keypoints) {
    if (kp && kp.score > MIN_CONFIDENCE) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
