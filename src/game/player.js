const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 60;
const DUCK_HEIGHT = 30;
const JUMP_VELOCITY = -12;
const GRAVITY = 0.6;
const LANE_OFFSET = 60;

export class Player {
  constructor(groundY) {
    this.groundY = groundY;
    this.baseX = 100;
    this.x = this.baseX;
    this.y = groundY - PLAYER_HEIGHT;
    this.vy = 0;
    this.width = PLAYER_WIDTH;
    this.height = PLAYER_HEIGHT;
    this.action = 'idle';
    this.isJumping = false;
    this.isDucking = false;
  }

  reset() {
    this.x = this.baseX;
    this.y = this.groundY - PLAYER_HEIGHT;
    this.vy = 0;
    this.action = 'idle';
    this.isJumping = false;
    this.isDucking = false;
  }

  setAction(action) {
    this.action = action;

    switch (action) {
      case 'jump':
        if (!this.isJumping) {
          this.vy = JUMP_VELOCITY;
          this.isJumping = true;
        }
        break;
      case 'duck':
        this.isDucking = true;
        break;
      case 'lean_left':
        this.x = this.baseX - LANE_OFFSET;
        this.isDucking = false;
        break;
      case 'lean_right':
        this.x = this.baseX + LANE_OFFSET;
        this.isDucking = false;
        break;
      default:
        this.x = this.baseX;
        this.isDucking = false;
        break;
    }
  }

  update() {
    // Apply gravity
    this.vy += GRAVITY;
    this.y += this.vy;

    // Ground collision
    const currentHeight = this.isDucking ? DUCK_HEIGHT : PLAYER_HEIGHT;
    const groundLevel = this.groundY - currentHeight;

    if (this.y >= groundLevel) {
      this.y = groundLevel;
      this.vy = 0;
      this.isJumping = false;
    }

    this.height = currentHeight;
  }

  getBoundingBox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  draw(ctx) {
    // Body
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Head
    if (!this.isDucking) {
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y - 8, 10, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
