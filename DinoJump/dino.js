import { terrainHeightAt, LEVEL_WIDTH } from './level.js';

const GRAVITY    = 1380;
const JUMP_VY    = -640;
const MAX_FALL   = 900;
const MOVE_SPEED = 240;

export class Dino {
  constructor() {
    this.x           = 240;
    this.y           = 200;
    this.vy          = 0;
    this.w           = 40;
    this.h           = 52;
    this.onGround    = false;
    this.jumpsLeft   = 2;
    this.dead        = false;
    this.won         = false;
    this.slowMult    = 1;
    this.slowTimer   = 0;
    this.facing      = 1;   // 1 = right, -1 = left
    this._animTimer  = 0;
    this._deathTimer = 0;
    this._squish     = 1;
    this._squishTimer = 0;
  }

  update(dt, obstacles, foodItems, dir = 0) {
    if (this.dead) {
      this._deathTimer += dt;
      return { type: 'dead' };
    }

    this._animTimer += dt;

    // Squish decay — ratio goes 1→0, squish goes 0.72→1.0 (no discontinuity)
    if (this._squishTimer > 0) {
      this._squishTimer = Math.max(0, this._squishTimer - dt);
      const ratio = this._squishTimer / 0.18;
      this._squish = 1 - 0.28 * ratio;
    } else {
      this._squish = 1;
    }

    // Slow decay
    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - dt);
      if (this.slowTimer === 0) this.slowMult = 1;
    }

    // Gravity + movement
    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
    if (dir !== 0) this.facing = dir;
    this.x += MOVE_SPEED * this.slowMult * dir * dt;
    this.y += this.vy * dt;

    // Terrain collision
    const surfaceY   = terrainHeightAt(this.x) - this.h / 2;
    const wasInAir   = !this.onGround;
    if (this.y >= surfaceY) {
      if (wasInAir && this.vy > 220) {
        this._squishTimer = 0.18;  // formula starts at 0.72, no direct _squish assignment
      }
      this.y         = surfaceY;
      this.vy        = 0;
      this.onGround  = true;
      this.jumpsLeft = 2;
    } else {
      this.onGround = false;
    }

    // Obstacle collision
    const dinoLeft  = this.x - this.w / 2;
    const dinoRight = this.x + this.w / 2;
    const dinoFoot  = this.y + this.h / 2;
    const groundY   = terrainHeightAt(this.x);

    for (const obs of obstacles) {
      if (dinoRight > obs.xStart && dinoLeft < obs.xEnd && dinoFoot >= groundY - 26) {
        if (obs.type === 'lava') {
          this.dead = true;
          this._deathTimer = 0;
          return { type: 'dead' };
        }
        if (obs.type === 'tar') {
          this.slowMult  = 0.35;
          this.slowTimer = 0.12;
        }
      }
    }

    // Food collection
    for (const item of foodItems) {
      if (!item.collected) {
        const dx = this.x - item.x;
        const dy = this.y - item.y;
        if (dx * dx + dy * dy < 44 * 44) {
          item.collected = true;
          return { type: 'food', item };
        }
      }
    }

    // Win check
    if (this.x >= LEVEL_WIDTH - 300 && !this.won) {
      this.won = true;
      return { type: 'win' };
    }

    return null;
  }

  jump() {
    if (this.jumpsLeft > 0) {
      this.vy        = JUMP_VY;
      this.jumpsLeft--;
      this.onGround  = false;
    }
  }

  // Draw in world coordinates (camera translate already applied by game.js)
  draw(ctx) {
    const sx = this.x;
    const sy = this.y;
    const t  = this._animTimer;
    const sq = this._squish;

    ctx.save();
    ctx.translate(sx, sy);
    // squish + facing flip (all local drawing assumes facing right)
    ctx.scale(this.facing / sq, sq);

    const legSwing   = this.onGround ? Math.sin(t * 9) * 11 : 0;
    const bodyGreen  = this.dead ? '#8b0000' : '#3da528';
    const darkGreen  = this.dead ? '#5a0000' : '#2a7a1c';
    const lightGreen = this.dead ? '#7a1010' : '#72d44a';

    // ── TAIL ──
    ctx.fillStyle = bodyGreen;
    ctx.beginPath();
    ctx.moveTo(-12, 10);
    ctx.bezierCurveTo(-32, 2, -50, 12, -46, 24);
    ctx.bezierCurveTo(-42, 34, -22, 26, -12, 16);
    ctx.closePath();
    ctx.fill();

    // ── BACK LEG ──
    ctx.save();
    ctx.translate(-7, 18);
    ctx.rotate(legSwing * 0.065);
    ctx.fillStyle = darkGreen;
    ctx.beginPath();
    ctx.roundRect(-5, 0, 11, 22, [4, 4, 2, 2]);
    ctx.fill();
    // foot
    ctx.beginPath();
    ctx.ellipse(2, 25, 9, 5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // claws
    ctx.fillStyle = '#1a5212';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(2 + i * 5, 28);
      ctx.lineTo(2 + i * 5, 34);
      ctx.lineTo(2 + i * 5 + 2, 28);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ── BODY ──
    ctx.fillStyle = bodyGreen;
    ctx.beginPath();
    ctx.ellipse(0, 0, 21, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── BELLY PATCH ──
    ctx.fillStyle = lightGreen;
    ctx.beginPath();
    ctx.ellipse(5, 6, 11, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── FRONT LEG ──
    ctx.save();
    ctx.translate(7, 18);
    ctx.rotate(-legSwing * 0.065);
    ctx.fillStyle = darkGreen;
    ctx.beginPath();
    ctx.roundRect(-5, 0, 11, 22, [4, 4, 2, 2]);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2, 25, 9, 5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a5212';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(2 + i * 5, 28);
      ctx.lineTo(2 + i * 5, 34);
      ctx.lineTo(2 + i * 5 + 2, 28);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ── NECK ──
    ctx.fillStyle = bodyGreen;
    ctx.beginPath();
    ctx.moveTo(10, -16);
    ctx.bezierCurveTo(16, -10, 20, -6, 18, 4);
    ctx.bezierCurveTo(12, 5, 6, 1, 8, -14);
    ctx.closePath();
    ctx.fill();

    // ── HEAD ──
    ctx.beginPath();
    ctx.ellipse(22, -26, 17, 13, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // ── SNOUT / LOWER JAW ──
    ctx.beginPath();
    ctx.moveTo(14, -22);
    ctx.bezierCurveTo(24, -20, 40, -21, 38, -14);
    ctx.bezierCurveTo(36, -10, 18, -12, 14, -17);
    ctx.closePath();
    ctx.fill();

    // ── NOSTRIL ──
    ctx.fillStyle = darkGreen;
    ctx.beginPath();
    ctx.ellipse(33, -20, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── EYE ──
    if (!this.dead) {
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(26, -31, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111828';
      ctx.beginPath(); ctx.arc(27, -30, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(29, -33, 2, 0, Math.PI * 2); ctx.fill();
      // eyebrow ridge
      ctx.strokeStyle = darkGreen; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(20, -36); ctx.lineTo(32, -37); ctx.stroke();
    } else {
      ctx.strokeStyle = '#ff2222'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(20, -36); ctx.lineTo(30, -26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(30, -36); ctx.lineTo(20, -26); ctx.stroke();
    }

    // ── SPINE SPIKES ──
    ctx.fillStyle = darkGreen;
    const spikes = [[-12, -22], [-2, -26], [8, -26], [16, -22]];
    for (const [spx, spy] of spikes) {
      ctx.beginPath();
      ctx.moveTo(spx - 4, spy + 2);
      ctx.lineTo(spx,     spy - 12);
      ctx.lineTo(spx + 4, spy + 2);
      ctx.closePath();
      ctx.fill();
    }

    // ── TINY T-REX ARMS ──
    ctx.fillStyle = bodyGreen;
    ctx.beginPath(); ctx.roundRect(10, -10, 10, 7, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(18,  -6,  8, 5, 2); ctx.fill();

    // ── DEATH FLASH OVERLAY ──
    if (this.dead) {
      const flash = 0.3 + Math.abs(Math.sin(this._deathTimer * 7)) * 0.4;
      ctx.fillStyle = `rgba(180, 0, 0, ${flash})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 28, 34, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
