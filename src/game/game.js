import { Player } from './player.js';
import { ObstacleManager } from './obstacles.js';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_Y = 340;
const INITIAL_SPEED = 4;
const SPEED_INCREMENT = 0.001;
const MAX_LIVES = 3;
const INVINCIBILITY_DURATION = 90; // frames

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.player = new Player(GROUND_Y);
    this.obstacles = new ObstacleManager(CANVAS_WIDTH, GROUND_Y);
    this.score = 0;
    this.speed = INITIAL_SPEED;
    this.lives = MAX_LIVES;
    this.invincibilityTimer = 0;
    this.running = false;
  }

  start() {
    this.score = 0;
    this.speed = INITIAL_SPEED;
    this.lives = MAX_LIVES;
    this.invincibilityTimer = 0;
    this.running = true;
    this.player.reset();
    this.obstacles.reset();
  }

  setAction(action) {
    this.player.setAction(action);
  }

  update() {
    if (!this.running) return;

    this.score += this.speed * 0.1;
    this.speed += SPEED_INCREMENT;

    this.player.update();
    this.obstacles.update(this.speed);

    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer--;
    }

    // Collision detection
    if (this.invincibilityTimer === 0) {
      const playerBox = this.player.getBoundingBox();
      const collision = this.obstacles.checkCollision(playerBox);

      if (collision) {
        this.lives--;
        this.invincibilityTimer = INVINCIBILITY_DURATION;

        if (this.lives <= 0) {
          this.running = false;
        }
      }
    }
  }

  draw() {
    const ctx = this.ctx;

    // Clear canvas
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw ground
    ctx.fillStyle = '#333';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    // Draw obstacles
    this.obstacles.draw(ctx);

    // Draw player (flash during invincibility)
    const visible = this.invincibilityTimer === 0 ||
      Math.floor(this.invincibilityTimer / 5) % 2 === 0;
    if (visible) {
      this.player.draw(ctx);
    }

    // Draw HUD - lives
    this.drawLives(ctx);

    // Draw HUD - score
    ctx.fillStyle = '#fff';
    ctx.font = '18px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(this.score)}m`, CANVAS_WIDTH - 20, 30);
    ctx.textAlign = 'left';
  }

  drawLives(ctx) {
    for (let i = 0; i < MAX_LIVES; i++) {
      const x = 20 + i * 30;
      const y = 20;
      ctx.fillStyle = i < this.lives ? '#ff4444' : '#333';
      ctx.font = '20px serif';
      ctx.fillText('\u2764', x, y + 15);
    }
  }

  isGameOver() {
    return !this.running && this.lives <= 0;
  }

  getScore() {
    return Math.floor(this.score);
  }
}
