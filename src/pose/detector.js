import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

export async function createPoseDetector() {
  // Try webgl first, fall back to cpu
  try {
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('Using WebGL backend');
  } catch (e) {
    console.warn('WebGL backend failed, falling back to CPU:', e.message);
    await tf.setBackend('cpu');
    await tf.ready();
    console.log('Using CPU backend');
  }

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
