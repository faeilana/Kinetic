const TRAIL_COLORS = {
  left: { r: 78, g: 205, b: 196 },   // teal
  right: { r: 255, g: 107, b: 107 },  // coral
};

export class FruitNinjaRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.scorePopups = [];
  }

  clear() {
    const ctx = this.ctx;
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0f0f23');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawTrails(trails) {
    const ctx = this.ctx;

    for (const [hand, trail] of Object.entries(trails)) {
      if (trail.length < 2) continue;

      const color = TRAIL_COLORS[hand];

      for (let i = 1; i < trail.length; i++) {
        const alpha = i / trail.length;
        const width = (i / trail.length) * 6;

        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }

      // Glow at tip
      if (trail.length > 0) {
        const tip = trail[trail.length - 1];
        ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
        ctx.shadowBlur = 15;
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  drawCursors(positions) {
    const ctx = this.ctx;

    for (const pos of positions) {
      const color = TRAIL_COLORS[pos.hand];

      // Outer ring
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  addSliceParticles(x, y, color) {
    const count = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  addScorePopup(x, y, points, isBomb) {
    this.scorePopups.push({
      x,
      y,
      text: isBomb ? 'BOMB!' : `+${points}`,
      color: isBomb ? '#e74c3c' : '#f1c40f',
      life: 1,
      vy: -2,
    });
  }

  updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.life -= p.decay;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const s of this.scorePopups) {
      s.y += s.vy;
      s.life -= 0.02;
    }
    this.scorePopups = this.scorePopups.filter((s) => s.life > 0);
  }

  drawParticles() {
    const ctx = this.ctx;

    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawScorePopups() {
    const ctx = this.ctx;

    for (const s of this.scorePopups) {
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.color;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.text, s.x, s.y);
    }
    ctx.globalAlpha = 1;
  }

  drawHUD(score, lives, maxLives, combo) {
    const ctx = this.ctx;

    // Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${score}`, 20, 20);

    // Combo
    if (combo > 1) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`${combo}x Combo!`, 20, 50);
    }

    // Lives (crosses for lost lives)
    ctx.textAlign = 'right';
    for (let i = 0; i < maxLives; i++) {
      const x = this.canvas.width - 20 - i * 35;
      ctx.fillStyle = i < lives ? '#e74c3c' : '#333';
      ctx.font = '24px serif';
      ctx.fillText('\u2764', x, 20);
    }
  }

  drawGameOver(score, bestScore) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);

    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Score: ${score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);

    if (bestScore > 0) {
      ctx.font = '20px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`Best: ${bestScore}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
    }

    ctx.font = '18px monospace';
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('Raise your hand to play again!', this.canvas.width / 2, this.canvas.height / 2 + 100);
  }

  drawWaiting() {
    const ctx = this.ctx;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FRUIT NINJA', this.canvas.width / 2, this.canvas.height / 2 - 40);

    ctx.font = '18px monospace';
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('Raise your hand above your shoulder to start!', this.canvas.width / 2, this.canvas.height / 2 + 20);
    ctx.fillStyle = '#aaa';
    ctx.fillText('Slash fruits with your wrists \u2014 avoid bombs!', this.canvas.width / 2, this.canvas.height / 2 + 55);
  }

  drawCountdown(value) {
    const ctx = this.ctx;
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 96px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, this.canvas.width / 2, this.canvas.height / 2);
  }
}
