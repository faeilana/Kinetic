import { initSentry } from '../sentry.js';
import { setupWebcam } from '../pose/webcam.js';
import { createPoseDetector, detectPose } from '../pose/detector.js';
import { drawSkeleton } from '../pose/skeleton.js';
import { FruitNinjaGame } from './game.js';

initSentry();

const States = {
  LOADING: 'loading',
  WAITING: 'waiting',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  DEAD: 'dead',
};

let state = States.LOADING;
let detector = null;
let video = null;
let game = null;
let countdownValue = 3;
let countdownTimer = null;

const statusEl = document.getElementById('status-text');
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

    const gameCanvas = document.getElementById('game-canvas');
    game = new FruitNinjaGame(gameCanvas, video.videoWidth, video.videoHeight);

    setState(States.WAITING);
    requestAnimationFrame(loop);
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    console.error(err);
  }
}

function setState(newState) {
  state = newState;

  switch (state) {
    case States.WAITING:
      statusEl.textContent = '';
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
      statusEl.textContent = '';
      break;
  }
}

function startCountdown() {
  countdownValue = 3;
  countdownTimer = setInterval(() => {
    countdownValue--;
    if (countdownValue <= 0) {
      clearInterval(countdownTimer);
      setState(States.PLAYING);
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
      case States.WAITING:
        game.updateCursors(keypoints);
        game.drawWaiting();
        if (isHandRaised(keypoints)) {
          setState(States.COUNTDOWN);
        }
        break;
      case States.COUNTDOWN:
        game.updateCursors(keypoints);
        game.drawCountdown(countdownValue > 0 ? countdownValue : 'GO!');
        break;
      case States.PLAYING:
        game.update(keypoints);
        game.draw();
        if (game.isGameOver()) {
          setState(States.DEAD);
        }
        break;
      case States.DEAD:
        game.updateCursors(keypoints);
        game.drawGameOver();
        if (isHandRaised(keypoints)) {
          setState(States.WAITING);
        }
        break;
    }
  }

  requestAnimationFrame(loop);
}

init();
