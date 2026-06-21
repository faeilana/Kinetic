import { FruitSpawner } from './fruits.js';
import { SlashDetector } from './slash-detector.js';
import { FruitNinjaRenderer } from './renderer.js';

const MAX_LIVES = 3;
const MAX_MISSED = 3;
const COMBO_TIMEOUT = 1000; // ms

export class FruitNinjaGame {
  constructor(canvas, videoWidth, videoHeight) {
    this.canvas = canvas;
    this.spawner = new FruitSpawner(canvas.width, canvas.height);
    this.slashDetector = new SlashDetector(
      canvas.width, canvas.height,
      videoWidth, videoHeight
    );
    this.renderer = new FruitNinjaRenderer(canvas);

    this.score = 0;
    this.bestScore = 0;
    this.lives = MAX_LIVES;
    this.combo = 0;
    this.lastSliceTime = 0;
    this.missedCount = 0;
    this.running = false;
  }

  start() {
    this.score = 0;
    this.lives = MAX_LIVES;
    this.combo = 0;
    this.lastSliceTime = 0;
    this.missedCount = 0;
    this.running = true;
    this.spawner.reset();
    this.slashDetector.reset();
    this.renderer.particles = [];
    this.renderer.scorePopups = [];
  }

  update(keypoints) {
    if (!this.running) return;

    this.slashDetector.update(keypoints);
    this.spawner.update();

    // Check for slashes hitting fruits
    const slashPoints = this.slashDetector.getSlashPoints();
    for (const slash of slashPoints) {
      this.checkSlashCollisions(slash);
    }

    // Check for missed fruits
    const missed = this.spawner.getMissedFruits();
    for (const fruit of missed) {
      this.missedCount++;
      if (this.missedCount >= MAX_MISSED) {
        this.lives--;
        this.missedCount = 0;
        if (this.lives <= 0) {
          this.endGame();
        }
      }
    }

    // Decay combo
    if (Date.now() - this.lastSliceTime > COMBO_TIMEOUT) {
      this.combo = 0;
    }

    this.renderer.updateParticles();
  }

  checkSlashCollisions(slash) {
    const activeFruits = this.spawner.getActiveFruits();

    for (const fruit of activeFruits) {
      // Check if slash line segment intersects with fruit
      if (this.lineIntersectsCircle(slash.prevX, slash.prevY, slash.x, slash.y, fruit)) {
        if (fruit.slice()) {
          if (fruit.type.name === 'bomb') {
            this.lives--;
            this.combo = 0;
            this.renderer.addSliceParticles(fruit.x, fruit.y, '#e74c3c');
            this.renderer.addScorePopup(fruit.x, fruit.y, 0, true);
            if (this.lives <= 0) {
              this.endGame();
            }
          } else {
            this.combo++;
            this.lastSliceTime = Date.now();
            const points = fruit.type.points * this.combo;
            this.score += points;
            this.renderer.addSliceParticles(fruit.x, fruit.y, fruit.type.sliceColor);
            this.renderer.addScorePopup(fruit.x, fruit.y - 20, points, false);
          }
        }
      }
    }
  }

  lineIntersectsCircle(x1, y1, x2, y2, fruit) {
    // Point-to-line-segment distance
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - fruit.x;
    const fy = y1 - fruit.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - fruit.radius * fruit.radius;

    if (a === 0) {
      // Degenerate case: slash has no length, check point
      return c <= 0;
    }

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;

    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);

    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
  }

  endGame() {
    this.running = false;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }
  }

  draw() {
    this.renderer.clear();
    this.spawner.draw(this.renderer.ctx);
    this.renderer.drawParticles();
    this.renderer.drawScorePopups();

    const trails = this.slashDetector.getTrails();
    this.renderer.drawTrails(trails);

    const cursors = this.slashDetector.getCurrentPositions();
    this.renderer.drawCursors(cursors);

    this.renderer.drawHUD(this.score, this.lives, MAX_LIVES, this.combo);
  }

  drawWaiting() {
    this.renderer.clear();
    const cursors = this.slashDetector.getCurrentPositions();
    this.renderer.drawCursors(cursors);
    this.renderer.drawWaiting();
  }

  drawCountdown(value) {
    this.renderer.clear();
    const cursors = this.slashDetector.getCurrentPositions();
    this.renderer.drawCursors(cursors);
    this.renderer.drawCountdown(value);
  }

  drawGameOver() {
    this.renderer.clear();
    this.spawner.draw(this.renderer.ctx);
    this.renderer.drawParticles();
    this.renderer.updateParticles();
    const cursors = this.slashDetector.getCurrentPositions();
    this.renderer.drawCursors(cursors);
    this.renderer.drawGameOver(this.score, this.bestScore);
  }

  isGameOver() {
    return !this.running && this.lives <= 0;
  }

  getScore() {
    return this.score;
  }

  updateCursors(keypoints) {
    this.slashDetector.update(keypoints);
  }
}
