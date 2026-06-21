const MIN_SPAWN_DISTANCE = 300;
const LOW_OBSTACLE_HEIGHT = 30;
const LOW_OBSTACLE_WIDTH = 30;
const HIGH_OBSTACLE_HEIGHT = 40;
const HIGH_OBSTACLE_WIDTH = 50;
const HIGH_OBSTACLE_Y_OFFSET = 60; // from ground, how high the bottom edge is

export class ObstacleManager {
  constructor(canvasWidth, groundY) {
    this.canvasWidth = canvasWidth;
    this.groundY = groundY;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 90;
  }

  reset() {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 90;
  }

  update(speed) {
    this.spawnTimer++;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawn();
      this.spawnTimer = 0;
      // Randomize next spawn interval
      this.spawnInterval = 60 + Math.random() * 60;
    }

    // Move obstacles
    for (const obs of this.obstacles) {
      obs.x -= speed;
    }

    // Remove off-screen obstacles
    this.obstacles = this.obstacles.filter((obs) => obs.x + obs.width > -50);
  }

  spawn() {
    const type = Math.random() < 0.5 ? 'low' : 'high';

    if (type === 'low') {
      this.obstacles.push({
        type: 'low',
        x: this.canvasWidth + 50,
        y: this.groundY - LOW_OBSTACLE_HEIGHT,
        width: LOW_OBSTACLE_WIDTH,
        height: LOW_OBSTACLE_HEIGHT,
      });
    } else {
      this.obstacles.push({
        type: 'high',
        x: this.canvasWidth + 50,
        y: this.groundY - HIGH_OBSTACLE_HEIGHT - HIGH_OBSTACLE_Y_OFFSET,
        width: HIGH_OBSTACLE_WIDTH,
        height: HIGH_OBSTACLE_HEIGHT,
      });
    }
  }

  checkCollision(playerBox) {
    for (const obs of this.obstacles) {
      if (aabbCollision(playerBox, obs)) {
        return obs;
      }
    }
    return null;
  }

  draw(ctx) {
    for (const obs of this.obstacles) {
      if (obs.type === 'low') {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        // Spikes
        ctx.fillStyle = '#ff4444';
        for (let i = 0; i < 3; i++) {
          const sx = obs.x + 5 + i * 10;
          ctx.beginPath();
          ctx.moveTo(sx, obs.y);
          ctx.lineTo(sx + 5, obs.y - 10);
          ctx.lineTo(sx + 10, obs.y);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#ffa500';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        // Warning stripes
        ctx.fillStyle = '#cc8400';
        for (let i = 0; i < obs.width; i += 10) {
          ctx.fillRect(obs.x + i, obs.y, 5, obs.height);
        }
      }
    }
  }
}

function aabbCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
