# Kinetic Runner

A body-pose-controlled side-scrolling runner game. Stand in front of your webcam and use your body to control the character — no keyboard or mouse needed.

## Controls

| Body Pose | Game Action |
|-----------|-------------|
| Stand tall | Run (idle) |
| Jump / raise body | Jump over short obstacles |
| Duck / lower body | Slide under tall obstacles |
| Lean left/right | Dodge left/right |

## Tech Stack

- **Frontend**: Vite + vanilla JS (ES modules)
- **Pose Detection**: TensorFlow.js MoveNet Lightning
- **Game Canvas**: HTML5 Canvas 2D (800×400px)
- **Backend**: FastAPI + SQLite
- **Error Tracking**: Sentry
- **ML Observability**: Arize

## Setup

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Environment Variables

Copy the example env files and fill in your values:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

## How It Works

1. **Webcam starts** — you see a PiP video in the corner with skeleton overlay
2. **Calibration** — stand still for ~2 seconds to record your baseline pose
3. **Waiting** — raise either wrist above your shoulder to trigger countdown
4. **Countdown** — 3...2...1...GO!
5. **Playing** — your pose controls the runner at ~30 fps
6. **Game Over** — raise hand again to restart

## Pose Classifier

Uses normalized MoveNet keypoint coordinates with calibration baseline:

- **Jump**: avg hip Y < baseline - 0.08
- **Duck**: avg hip Y > baseline + 0.08 OR knees higher than baseline
- **Lean left**: avg hip X < baseline - 0.06
- **Lean right**: avg hip X > baseline + 0.06
- **Idle**: none of the above
