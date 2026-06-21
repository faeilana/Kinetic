const FRUIT_TYPES = [
  { name: 'watermelon', color: '#2ecc71', radius: 35, points: 1, sliceColor: '#e74c3c' },
  { name: 'orange', color: '#f39c12', radius: 28, points: 1, sliceColor: '#f1c40f' },
  { name: 'apple', color: '#e74c3c', radius: 25, points: 1, sliceColor: '#ecf0f1' },
  { name: 'banana', color: '#f1c40f', radius: 22, points: 2, sliceColor: '#ffeaa7' },
  { name: 'grape', color: '#9b59b6', radius: 18, points: 3, sliceColor: '#dda0dd' },
];

const BOMB_TYPE = { name: 'bomb', color: '#2c3e50', radius: 30, points: -1, sliceColor: '#e74c3c' };

export class Fruit {
  constructor(canvasWidth, canvasHeight, type) {
    this.type = type;
    this.radius = type.radius;
    this.x = Math.random() * (canvasWidth - 100) + 50;
    this.y = canvasHeight + this.radius;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Launch upward with randomized trajectory
    const speed = 12 + Math.random() * 6;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.gravity = 0.25;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.15;
    this.sliced = false;
    this.sliceTime = 0;
    this.missed = false;
    this.missedCounted = false;
  }

  update() {
    if (this.sliced) {
      this.sliceTime++;
      return;
    }

    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    if (this.y > this.canvasHeight + this.radius * 2) {
      this.missed = true;
    }
  }

  isOffScreen() {
    return (this.missed && this.missedCounted) || (this.sliced && this.sliceTime > 30);
  }

  slice() {
    if (this.sliced) return false;
    this.sliced = true;
    this.sliceTime = 0;
    return true;
  }

  containsPoint(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  draw(ctx) {
    if (this.sliced) {
      this.drawSliced(ctx);
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.type.name === 'bomb') {
      this.drawBomb(ctx);
    } else {
      this.drawWhole(ctx);
    }

    ctx.restore();
  }

  drawWhole(ctx) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(3, 3, this.radius, this.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main fruit body
    ctx.fillStyle = this.type.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Leaf/stem
    if (this.type.name !== 'grape') {
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.ellipse(0, -this.radius - 3, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBomb(ctx) {
    // Bomb body
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Fuse
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.quadraticCurveTo(8, -this.radius - 12, 4, -this.radius - 18);
    ctx.stroke();

    // Spark
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(4, -this.radius - 18, 4, 0, Math.PI * 2);
    ctx.fill();

    // Skull icon
    ctx.fillStyle = '#ecf0f1';
    ctx.font = `${this.radius * 0.8}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', 0, 2);
  }

  drawSliced(ctx) {
    const fade = Math.max(0, 1 - this.sliceTime / 30);
    ctx.globalAlpha = fade;

    // Left half
    ctx.save();
    ctx.translate(this.x - this.sliceTime * 1.5, this.y + this.sliceTime * 2);
    ctx.rotate(-this.sliceTime * 0.05);
    ctx.fillStyle = this.type.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.fillStyle = this.type.sliceColor;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.8, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.restore();

    // Right half
    ctx.save();
    ctx.translate(this.x + this.sliceTime * 1.5, this.y + this.sliceTime * 2);
    ctx.rotate(this.sliceTime * 0.05);
    ctx.fillStyle = this.type.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.fill();
    ctx.fillStyle = this.type.sliceColor;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.8, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 1;
  }
}

export class FruitSpawner {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.fruits = [];
    this.spawnTimer = 0;
    this.spawnInterval = 60; // frames between spawns
    this.minInterval = 20;
    this.waveSize = 1;
    this.maxWaveSize = 5;
    this.bombChance = 0.15;
    this.difficulty = 0;
  }

  reset() {
    this.fruits = [];
    this.spawnTimer = 0;
    this.spawnInterval = 60;
    this.waveSize = 1;
    this.bombChance = 0.15;
    this.difficulty = 0;
  }

  update() {
    this.spawnTimer++;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnWave();
      this.spawnTimer = 0;
      this.increaseDifficulty();
    }

    for (const fruit of this.fruits) {
      fruit.update();
    }

    // Remove off-screen fruits (missed ones stay until game marks them counted)
    this.fruits = this.fruits.filter((f) => !f.isOffScreen());
  }

  spawnWave() {
    const count = Math.min(
      Math.floor(Math.random() * this.waveSize) + 1,
      this.maxWaveSize
    );

    for (let i = 0; i < count; i++) {
      const isBomb = Math.random() < this.bombChance;
      const type = isBomb
        ? BOMB_TYPE
        : FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
      this.fruits.push(new Fruit(this.canvasWidth, this.canvasHeight, type));
    }
  }

  increaseDifficulty() {
    this.difficulty++;
    if (this.difficulty % 5 === 0 && this.spawnInterval > this.minInterval) {
      this.spawnInterval = Math.max(this.minInterval, this.spawnInterval - 5);
    }
    if (this.difficulty % 8 === 0 && this.waveSize < this.maxWaveSize) {
      this.waveSize++;
    }
    if (this.difficulty % 10 === 0) {
      this.bombChance = Math.min(0.3, this.bombChance + 0.02);
    }
  }

  getMissedFruits() {
    return this.fruits.filter((f) => f.missed && !f.missedCounted && !f.sliced && f.type.name !== 'bomb');
  }

  getActiveFruits() {
    return this.fruits.filter((f) => !f.sliced && !f.missed);
  }

  draw(ctx) {
    for (const fruit of this.fruits) {
      fruit.draw(ctx);
    }
  }
}
