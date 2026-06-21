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
const LINE_COLOR = 'rgba(0, 204, 255, 0.7)';
const MIN_CONFIDENCE = 0.3;
const DOT_RADIUS = 5;

export function drawSkeleton(ctx, keypoints, width, height) {
  // Determine if coordinates are normalized (0-1) or pixel-space
  const needsScale = keypoints.some(
    (kp) => kp && kp.x <= 1 && kp.y <= 1 && kp.score > MIN_CONFIDENCE
  );

  const scaleX = needsScale ? width : 1;
  const scaleY = needsScale ? height : 1;

  // Draw connections
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  for (const [i, j] of CONNECTIONS) {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];

    if (kp1 && kp2 && kp1.score > MIN_CONFIDENCE && kp2.score > MIN_CONFIDENCE) {
      const x1 = kp1.x * scaleX;
      const y1 = kp1.y * scaleY;
      const x2 = kp2.x * scaleX;
      const y2 = kp2.y * scaleY;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  // Draw keypoints with outer ring for better visibility
  for (const kp of keypoints) {
    if (kp && kp.score > MIN_CONFIDENCE) {
      const x = kp.x * scaleX;
      const y = kp.y * scaleY;

      // Outer ring
      ctx.strokeStyle = KEYPOINT_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, 2 * Math.PI);
      ctx.stroke();

      // Inner fill
      ctx.fillStyle = KEYPOINT_COLOR;
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS - 1, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
