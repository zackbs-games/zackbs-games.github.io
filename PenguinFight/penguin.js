import { GROUND_Y, PLATFORMS, CANVAS_W } from './world.js';

const GRAVITY    = 1200;
const JUMP_VY    = -540;
const MOVE_SPEED = 200;
const MAX_FALL   = 800;

export class Penguin {
  constructor() {
    this.x = 130;
    this.y = GROUND_Y - 20;
    this.vx = 0;
    this.vy = 0;
    this.w  = 24;
    this.h  = 40;
    this.onGround      = true;
    this.jumpsLeft     = 2;
    this.facing        = 1;
    this.hp            = 3;
    this.maxHp         = 3;
    this.dead          = false;
    this._animTimer    = 0;
    this._hurtTimer    = 0;
    this._punchTimer   = 0;
    this._punchCooldown    = 0;
    this._snowballCooldown = 0;
    this._iFrames      = 0;
  }

  get left()   { return this.x - this.w / 2; }
  get right()  { return this.x + this.w / 2; }
  get top()    { return this.y - this.h / 2; }
  get bottom() { return this.y + this.h / 2; }

  get punchHitbox() {
    if (this._punchTimer <= 0) return null;
    const px = this.facing > 0 ? this.right : this.left - 44;
    return { x: px, y: this.top + 4, w: 44, h: 24 };
  }

  jump() {
    if (this.jumpsLeft > 0) {
      this.vy = JUMP_VY;
      this.jumpsLeft--;
      this.onGround = false;
    }
  }

  punch() {
    if (this._punchCooldown <= 0) {
      this._punchTimer   = 0.22;
      this._punchCooldown = 0.48;
    }
  }

  canThrow() { return this._snowballCooldown <= 0; }
  usedThrow() { this._snowballCooldown = 0.9; }

  hurt(dmg = 1) {
    if (this._iFrames > 0 || this.dead) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this._hurtTimer = 0.3;
    this._iFrames   = 1.2;
    if (this.hp <= 0) this.dead = true;
    return true;
  }

  update(dt, keys) {
    if (this.dead) return;
    this._animTimer   += dt;
    this._hurtTimer    = Math.max(0, this._hurtTimer    - dt);
    this._punchTimer   = Math.max(0, this._punchTimer   - dt);
    this._punchCooldown = Math.max(0, this._punchCooldown - dt);
    this._snowballCooldown = Math.max(0, this._snowballCooldown - dt);
    this._iFrames      = Math.max(0, this._iFrames      - dt);

    this.vx = 0;
    if (keys.left)  { this.vx = -MOVE_SPEED; this.facing = -1; }
    if (keys.right) { this.vx =  MOVE_SPEED; this.facing =  1; }

    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
    this.x  = Math.max(this.w / 2, Math.min(CANVAS_W - this.w / 2, this.x + this.vx * dt));
    this.y += this.vy * dt;

    // Ground
    if (this.bottom >= GROUND_Y) {
      this.y = GROUND_Y - this.h / 2;
      this.vy = 0;
      this.onGround  = true;
      this.jumpsLeft = 2;
      return;
    }

    // Platforms (one-way: only land when falling onto top surface)
    let landed = false;
    if (this.vy >= 0) {
      for (const p of PLATFORMS) {
        if (this.x >= p.x && this.x <= p.x + p.w) {
          const wasAbove = (this.bottom - this.vy * dt) <= p.y + 2;
          if (wasAbove && this.bottom >= p.y) {
            this.y = p.y - this.h / 2;
            this.vy = 0;
            this.onGround  = true;
            this.jumpsLeft = 2;
            landed = true;
            break;
          }
        }
      }
    }
    if (!landed) this.onGround = false;
  }

  draw(ctx) {
    if (this._iFrames > 0 && Math.floor(this._iFrames * 10) % 2 === 0) return;

    const x = this.x, y = this.y, t = this._animTimer;
    ctx.save();
    ctx.translate(x, y);
    if (this.facing < 0) ctx.scale(-1, 1);

    // Slight wobble while walking, stretch/squish while airborne
    const wobble  = this.onGround ? Math.sin(t * 9) * 1.5 : 0;
    const scaleY  = this.onGround ? 1 : (this.vy < 0 ? 0.88 : 1.1);
    ctx.translate(wobble, 0);
    ctx.scale(1, scaleY);

    const R = (c, sx, sy, sw, sh) => { ctx.fillStyle = c; ctx.fillRect(sx, sy, sw, sh); };

    // Wings (black)
    R('#1a1a1a', -18, -12,  8, 20);
    R('#1a1a1a',  10, -12,  8, 20);

    // Body (white)
    R('#e0e0e0', -10, -12, 20, 24);

    // Belly (bright white)
    R('#ffffff',  -6,  -8, 12, 16);

    // Head (black)
    R('#1a1a1a', -10, -30, 20, 18);

    // Face patch
    R('#e0e0e0',  -7, -27, 14, 10);

    // Eyes
    if (!this.dead) {
      R('#1a1a1a',  -5, -25,  3,  3);
      R('#1a1a1a',   2, -25,  3,  3);
    } else {
      // X eyes
      ctx.strokeStyle = '#ff2222'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-5,-26); ctx.lineTo(-2,-23); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2,-26); ctx.lineTo(-5,-23); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( 2,-26); ctx.lineTo( 5,-23); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( 5,-26); ctx.lineTo( 2,-23); ctx.stroke();
    }

    // Beak (orange block)
    R('#ff8c00',  -5, -19, 10,  5);

    // Punch arm extended
    if (this._punchTimer > 0) {
      R('#e0e0e0',  10,  -9, 18,  8);
      R('#ffffaa',  26, -11,  8, 10); // glowing fist
    }

    // Feet (walk cycle)
    const fL = this.onGround ? Math.sin(t * 9) * 3 : 0;
    const fR = -fL;
    R('#ff8c00', -10, 12 + fL, 8, 4);
    R('#ff8c00',   2, 12 + fR, 8, 4);

    ctx.restore();
  }
}
