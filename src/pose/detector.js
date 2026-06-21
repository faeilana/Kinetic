import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

export async function createPoseDetector() {
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
  );
  return detector;
}

export async function detectPose(detector, video) {
  try {
    const poses = await detector.estimatePoses(video);
    return poses;
  } catch (err) {
    console.warn('Pose detection error:', err.message);
    return [];
  }
}
