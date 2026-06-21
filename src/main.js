import { initSentry } from './sentry.js';
import { setupWebcam } from './pose/webcam.js';
import { createPoseDetector, detectPose } from './pose/detector.js';
import { classifyPose, calibrate } from './pose/classifier.js';
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
    requestAnimationFrame(loop);
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

async function loop() {
  if (!video || !detector) return;

  const poses = await detectPose(detector, video);

  if (poses && poses.length > 0) {
    const keypoints = poses[0].keypoints;

    skeletonCtx.clearRect(0, 0, skeletonCanvas.width, skeletonCanvas.height);
    drawSkeleton(skeletonCtx, keypoints, skeletonCanvas.width, skeletonCanvas.height);

    switch (state) {
      case States.CALIBRATING:
        handleCalibration(keypoints);
        break;
      case States.WAITING:
        if (isHandRaised(keypoints)) {
          setState(States.COUNTDOWN);
        }
        break;
      case States.PLAYING:
        handlePlaying(keypoints);
        break;
      case States.DEAD:
        if (isHandRaised(keypoints)) {
          setState(States.WAITING);
        }
        break;
    }
  }

  requestAnimationFrame(loop);
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
  const { action, confidence } = classifyPose(keypoints, calibrationData);

  game.setAction(action);
  game.update();
  game.draw();

  sendPrediction(action, confidence, keypoints);

  if (game.isGameOver()) {
    setState(States.DEAD);
  }
}

init();
