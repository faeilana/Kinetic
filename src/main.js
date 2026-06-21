import { initSentry } from './sentry.js';
import { setupWebcam } from './pose/webcam.js';
import { createPoseDetector, detectPose } from './pose/detector.js';
import { PoseClassifier, calibrate } from './pose/classifier.js';
import { PoseHistory } from './pose/history.js';
import { drawSkeleton } from './pose/skeleton.js';
import { Game } from './game/game.js';
import { sendPrediction } from './api.js';

initSentry();

const States = {
  LOADING: 'loading',
  CALIBRATING: 'calibrating',
  WAITING: 'waiting',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  DEAD: 'dead',
};

let state = States.LOADING;
let detector = null;
let video = null;
let game = null;
let calibrationData = null;
let calibrationFrames = [];
let countdownValue = 3;
let countdownTimer = null;

const poseHistory = new PoseHistory();
const poseClassifier = new PoseClassifier();

// Shared pose state (updated by detection loop, read by game loop)
let latestKeypoints = null;
let poseReady = false;

const statusEl = document.getElementById('status-text');
const countdownEl = document.getElementById('countdown');
const skeletonCanvas = document.getElementById('skeleton-canvas');
const skeletonCtx = skeletonCanvas.getContext('2d');

async function init() {
  statusEl.textContent = 'Loading pose model...';

  try {
    [video, detector] = await Promise.all([
      setupWebcam(),
      createPoseDetector(),
    ]);

    skeletonCanvas.width = video.videoWidth;
    skeletonCanvas.height = video.videoHeight;

    game = new Game(document.getElementById('game-canvas'));

    setState(States.CALIBRATING);

    // Start decoupled loops
    poseDetectionLoop();
    requestAnimationFrame(gameLoop);
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    console.error(err);
  }
}

function setState(newState) {
  state = newState;
  countdownEl.textContent = '';

  switch (state) {
    case States.CALIBRATING:
      statusEl.textContent = 'Stand still to calibrate...';
      calibrationFrames = [];
      break;
    case States.WAITING:
      statusEl.textContent = 'Raise your hand above your shoulder to start!';
      break;
    case States.COUNTDOWN:
      statusEl.textContent = '';
      startCountdown();
      break;
    case States.PLAYING:
      statusEl.textContent = '';
      poseClassifier.reset();
      poseHistory.clear();
      game.start();
      break;
    case States.DEAD:
      statusEl.textContent = `Game Over! Score: ${game.getScore()}m — Raise hand to restart`;
      break;
  }
}

function startCountdown() {
  countdownValue = 3;
  countdownEl.textContent = countdownValue;
  countdownTimer = setInterval(() => {
    countdownValue--;
    if (countdownValue <= 0) {
      clearInterval(countdownTimer);
      countdownEl.textContent = 'GO!';
      setTimeout(() => setState(States.PLAYING), 500);
    } else {
      countdownEl.textContent = countdownValue;
    }
  }, 1000);
}

function isHandRaised(keypoints) {
  const leftWrist = keypoints[9];
  const rightWrist = keypoints[10];
  const leftShoulder = keypoints[5];
  const rightShoulder = keypoints[6];

  if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return false;

  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  return leftWrist.y < shoulderY || rightWrist.y < shoulderY;
}

// Pose detection runs in its own async loop, decoupled from rendering
async function poseDetectionLoop() {
  if (!video || !detector) return;

  const poses = await detectPose(detector, video);

  if (poses && poses.length > 0) {
    latestKeypoints = poses[0].keypoints;
    poseHistory.push(latestKeypoints);
    poseReady = true;
  }

  // Schedule next detection immediately (no waiting for rAF)
  setTimeout(poseDetectionLoop, 0);
}

// Game loop runs at display refresh rate, independent of pose detection speed
function gameLoop() {
  if (poseReady && latestKeypoints) {
    const smoothedKeypoints = poseHistory.getSmoothed() || latestKeypoints;

    // Draw skeleton with smoothed keypoints
    skeletonCtx.clearRect(0, 0, skeletonCanvas.width, skeletonCanvas.height);
    drawSkeleton(skeletonCtx, smoothedKeypoints, skeletonCanvas.width, skeletonCanvas.height);

    switch (state) {
      case States.CALIBRATING:
        handleCalibration(smoothedKeypoints);
        break;
      case States.WAITING:
        if (isHandRaised(smoothedKeypoints)) {
          setState(States.COUNTDOWN);
        }
        break;
      case States.PLAYING:
        handlePlaying(smoothedKeypoints);
        break;
      case States.DEAD:
        if (isHandRaised(smoothedKeypoints)) {
          setState(States.WAITING);
        }
        break;
    }
  }

  requestAnimationFrame(gameLoop);
}

function handleCalibration(keypoints) {
  calibrationFrames.push(keypoints);

  const progress = Math.min(calibrationFrames.length / 60, 1);
  statusEl.textContent = `Calibrating... ${Math.round(progress * 100)}%`;

  if (calibrationFrames.length >= 60) {
    calibrationData = calibrate(calibrationFrames);
    setState(States.WAITING);
  }
}

function handlePlaying(keypoints) {
  const { action, confidence } = poseClassifier.classify(
    keypoints,
    calibrationData,
    poseHistory
  );

  game.setAction(action);
  game.update();
  game.draw();

  sendPrediction(action, confidence, keypoints);

  if (game.isGameOver()) {
    setState(States.DEAD);
  }
}

init();
