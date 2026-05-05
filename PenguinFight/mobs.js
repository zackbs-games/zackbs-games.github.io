import { GROUND_Y, CANVAS_W } from './world.js';

// ── Snowball (shot by penguin) ────────────────────────────────────────────────
export class Snowball {
  constructor(x, y, dir) {
    this.x = x; this.y = y;
    this.vx = dir * 400; this.vy = -280;
    this.dead = false;
  }
  get left()   { return this.x - 6; }
  get right()  { return this.x + 6; }
  get top()    { return this.y - 6; }
  get bottom() { return this.y + 6; }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 900 * dt;
    if (this.x < -20 || this.x > 980 || this.y > GROUND_Y + 20) this.dead = true;
  }
  draw(ctx) {
    ctx.fillStyle = '#c8e8ff'; ctx.fillRect(this.x - 6, this.y - 6, 12, 12);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(this.x - 4, this.y - 4,  4,  4);
  }
}

// ── Blizzard Wave (penguin Q ability) ────────────────────────────────────────
export class BlizzardWave {
  constructor(x, dir) {
    this.x    = x;
    this.vx   = dir * 520;
    this.dead = false;
    this.w    = 48;
    this.damage = 999;
    this._t   = 0;
  }
  get left()   { return this.x - this.w / 2; }
  get right()  { return this.x + this.w / 2; }
  get top()    { return 0; }
  get bottom() { return 500; }
  update(dt) {
    this._t += dt;
    this.x  += this.vx * dt;
    if (this.x < -60 || this.x > CANVAS_W + 60) this.dead = true;
  }
  draw(ctx) {
    const x = this.x, t = this._t;
    // Outer glow
    ctx.fillStyle = 'rgba(160,220,255,0.18)';
    ctx.fillRect(x - 36, 0, 72, 400);
    // Main ice wall
    ctx.fillStyle = 'rgba(180,230,255,0.55)';
    ctx.fillRect(x - 20, 0, 40, 400);
    // Bright core
    ctx.fillStyle = 'rgba(220,245,255,0.85)';
    ctx.fillRect(x -  8, 0, 16, 400);
    // White hot centre
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(x -  3, 0,  6, 400);
    // Blocky ice shards (Minecraft pixel flavour)
    const shards = [[-26, 40], [18, 90], [-22, 160], [16, 220], [-28, 290], [20, 340]];
    for (const [ox, oy] of shards) {
      const flicker = Math.floor(t * 12 + oy) % 2 === 0;
      ctx.fillStyle = flicker ? 'rgba(200,240,255,0.9)' : 'rgba(140,210,255,0.7)';
      ctx.fillRect(x + ox, oy, 12, 12);
      ctx.fillRect(x + ox + 4, oy - 8, 8, 8);
    }
  }
}

// ── Arrow (shot by skeletons) ─────────────────────────────────────────────────
export class Arrow {
  constructor(x, y, dir) {
    this.x = x; this.y = y;
    this.vx = dir * 360;
    this.dead = false;
  }
  get left()   { return this.x - 8; }
  get right()  { return this.x + 8; }
  get top()    { return this.y - 2; }
  get bottom() { return this.y + 2; }
  update(dt) {
    this.x += this.vx * dt;
    if (this.x < -20 || this.x > 980) this.dead = true;
  }
  draw(ctx) {
    ctx.fillStyle = '#c8a878'; ctx.fillRect(this.x - 8, this.y - 1, 16, 2);
    const hx = this.vx < 0 ? this.x - 10 : this.x + 6;
    ctx.fillStyle = '#888888'; ctx.fillRect(hx, this.y - 2, 4, 4);
    const fx = this.vx < 0 ? this.x + 6  : this.x - 10;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(fx, this.y - 3, 3, 6);
  }
}

// ── Sonic Boom (shot by Warden) ───────────────────────────────────────────────
export class SonicBoom {
  constructor(x, y, dir) {
    this.x = x; this.y = y;
    this.vx = dir * 460;
    this.dead = false;
    this.damage = 2;
  }
  get left()   { return this.x - 14; }
  get right()  { return this.x + 14; }
  get top()    { return this.y - 6; }
  get bottom() { return this.y + 6; }
  update(dt) {
    this.x += this.vx * dt;
    if (this.x < -30 || this.x > 990) this.dead = true;
  }
  draw(ctx) {
    ctx.fillStyle = '#00ffc8'; ctx.fillRect(this.x - 14, this.y - 6, 28, 12);
    ctx.fillStyle = '#00ffe8'; ctx.fillRect(this.x - 10, this.y - 3, 20,  6);
    ctx.fillStyle = 'rgba(0,255,180,0.35)'; ctx.fillRect(this.x - 20, this.y - 10, 40, 20);
  }
}

// ── Wither Skull (shot by Wither) ─────────────────────────────────────────────
export class WitherSkull {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.dead = false;
    this.damage = 1;
  }
  get left()   { return this.x - 7; }
  get right()  { return this.x + 7; }
  get top()    { return this.y - 7; }
  get bottom() { return this.y + 7; }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -30 || this.x > 990 || this.y > 450) this.dead = true;
  }
  draw(ctx) {
    ctx.fillStyle = '#2a0050'; ctx.fillRect(this.x - 7, this.y - 7, 14, 14);
    ctx.fillStyle = '#8800ff'; ctx.fillRect(this.x - 4, this.y - 4,  3,  3);
    ctx.fillStyle = '#8800ff'; ctx.fillRect(this.x + 1, this.y - 4,  3,  3);
    ctx.fillStyle = 'rgba(100,0,200,0.3)'; ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
  }
}

// ── Dragon Fireball (shot by Ender Dragon) ────────────────────────────────────
export class DragonFireball {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.dead = false;
    this.damage = 2;
  }
  get left()   { return this.x - 9; }
  get right()  { return this.x + 9; }
  get top()    { return this.y - 9; }
  get bottom() { return this.y + 9; }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 160 * dt;
    if (this.x < -30 || this.x > 990 || this.y > 450) this.dead = true;
  }
  draw(ctx) {
    ctx.fillStyle = 'rgba(150,0,200,0.35)'; ctx.fillRect(this.x - 14, this.y - 14, 28, 28);
    ctx.fillStyle = '#7700cc'; ctx.fillRect(this.x -  9, this.y -  9, 18, 18);
    ctx.fillStyle = '#cc44ff'; ctx.fillRect(this.x -  5, this.y -  5, 10, 10);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(this.x -  2, this.y -  2,  4,  4);
  }
}

// ── Base mob ──────────────────────────────────────────────────────────────────
class Mob {
  constructor(x, hp, speed, w, h) {
    this.x = x; this.y = GROUND_Y - h / 2;
    this.w = w; this.h = h;
    this.hp = hp; this.maxHp = hp;
    this.speed = speed;
    this.dead  = false;
    this._animTimer = 0;
    this._hurtTimer = 0;
  }
  get left()   { return this.x - this.w / 2; }
  get right()  { return this.x + this.w / 2; }
  get top()    { return this.y - this.h / 2; }
  get bottom() { return this.y + this.h / 2; }

  hurt(dmg) {
    this.hp -= dmg;
    this._hurtTimer = 0.15;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  _drawHpBar(ctx) {
    if (this.hp >= this.maxHp) return;
    const bw = this.w + 8, bx = this.x - bw / 2, by = this.top - 10;
    ctx.fillStyle = '#330000'; ctx.fillRect(bx, by, bw, 4);
    ctx.fillStyle = '#22cc22'; ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), 4);
  }

  _hurtFlash(ctx) {
    if (this._hurtTimer <= 0) return;
    ctx.fillStyle = `rgba(255,80,80,${(this._hurtTimer / 0.15) * 0.55})`;
    ctx.fillRect(this.left, this.top, this.w, this.h);
  }
}

// ── Zombie ────────────────────────────────────────────────────────────────────
export class Zombie extends Mob {
  constructor(x) { super(x, 4, 65, 24, 40); }

  update(dt, penguin) {
    this._animTimer += dt;
    this._hurtTimer = Math.max(0, this._hurtTimer - dt);
    if (this.dead) return null;
    this.x += (penguin.x < this.x ? -1 : 1) * this.speed * dt;
    return null;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const t = this._animTimer;
    const R = (c, sx, sy, sw, sh) => { ctx.fillStyle = c; ctx.fillRect(sx, sy, sw, sh); };
    ctx.translate(Math.sin(t * 8) * 1.5, 0);
    const lS = Math.sin(t * 8) * 4;
    R('#3a5a8a', -8,  0 + lS, 6, 14);
    R('#3a5a8a',  2,  0 - lS, 6, 14);
    R('#2a5a1a', -8, -16, 16, 16);
    R('#5a8c3d', -18, -16, 10, 6);
    R('#5a8c3d',   8, -16, 10, 6);
    R('#5a8c3d', -8, -32, 16, 16);
    R('#1a2a0a', -6, -28, 4, 4);
    R('#1a2a0a',  2, -28, 4, 4);
    R('#1a1a0a', -4, -21, 8, 2);
    this._hurtFlash(ctx);
    ctx.restore();
    this._drawHpBar(ctx);
  }
}

// ── Creeper ───────────────────────────────────────────────────────────────────
export class Creeper extends Mob {
  constructor(x) {
    super(x, 5, 72, 20, 42);
    this._fuseTimer  = 0;
    this._fuseActive = false;
    this.exploded    = false;
  }

  update(dt, penguin) {
    this._animTimer += dt;
    this._hurtTimer = Math.max(0, this._hurtTimer - dt);
    if (this.dead) return null;
    const dist = Math.abs(penguin.x - this.x);
    if (!this._fuseActive) {
      if (dist < 60) { this._fuseActive = true; this._fuseTimer = 1.8; }
      else this.x += (penguin.x < this.x ? -1 : 1) * this.speed * dt;
    } else {
      this._fuseTimer -= dt;
      if (this._fuseTimer <= 0) {
        this.dead = true; this.exploded = true;
        return { type: 'explode', x: this.x, y: this.y, radius: 80 };
      }
    }
    return null;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const R = (c, sx, sy, sw, sh) => { ctx.fillStyle = c; ctx.fillRect(sx, sy, sw, sh); };
    if (this._fuseActive) {
      const rate = this._fuseTimer < 0.6 ? 14 : 5;
      if (Math.floor(this._animTimer * rate) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(-10, -42, 20, 42);
      }
    }
    R('#3a7a1a', -8,  8, 6, 10);
    R('#3a7a1a',  2,  8, 6, 10);
    R('#4a8a2a', -8, -12, 16, 20);
    R('#4a8a2a', -10, -32, 20, 20);
    R('#1a1a1a',  -7, -29,  5,  5);
    R('#1a1a1a',   2, -29,  5,  5);
    R('#1a1a1a',  -4, -22,  3,  7);
    R('#1a1a1a',   1, -22,  3,  7);
    R('#1a1a1a',  -6, -17,  5,  3);
    R('#1a1a1a',   1, -17,  5,  3);
    this._hurtFlash(ctx);
    ctx.restore();
    this._drawHpBar(ctx);
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export class Skeleton extends Mob {
  constructor(x) {
    super(x, 3, 45, 20, 40);
    this._shootCooldown = 1.5;
    this._targetDist    = 330;
  }

  update(dt, penguin) {
    this._animTimer += dt;
    this._hurtTimer = Math.max(0, this._hurtTimer - dt);
    this._shootCooldown -= dt;
    if (this.dead) return null;
    const diff = penguin.x - this.x, dir = Math.sign(diff), abs = Math.abs(diff);
    if (abs > this._targetDist + 50)      this.x += dir  * this.speed * dt;
    else if (abs < this._targetDist - 50) this.x -= dir  * this.speed * dt;
    if (this._shootCooldown <= 0) {
      this._shootCooldown = 2.8;
      return { type: 'arrow', x: this.x + dir * 14, y: this.y - 8, dir };
    }
    return null;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const t = this._animTimer;
    const R = (c, sx, sy, sw, sh) => { ctx.fillStyle = c; ctx.fillRect(sx, sy, sw, sh); };
    const lS = Math.sin(t * 6) * 3;
    R('#c8c8b0', -6,  0 + lS, 5, 14);
    R('#c8c8b0',  1,  0 - lS, 5, 14);
    R('#d0d0b8', -6, -14, 12, 14);
    R('#a0a090', -5, -12, 10, 2);
    R('#a0a090', -5,  -8, 10, 2);
    R('#a0a090', -5,  -4, 10, 2);
    R('#c8c8b0', -12, -14, 6, 12);
    R('#c8c8b0',   6, -14, 6, 12);
    R('#d8d8c0', -8, -30, 16, 16);
    R('#1a1a1a', -6, -27, 4, 4);
    R('#1a1a1a',  2, -27, 4, 4);
    R('#1a1a1a', -1, -21, 2, 2);
    R('#d8d8c0', -5, -18, 10, 3);
    R('#1a1a1a', -4, -18, 2, 3);
    R('#1a1a1a',  0, -18, 2, 3);
    R('#1a1a1a',  2, -18, 2, 3);
    ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, -18); ctx.quadraticCurveTo(20, -8, 10, 2); ctx.stroke();
    ctx.strokeStyle = '#e0e0c8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(10, -18); ctx.lineTo(10, 2); ctx.stroke();
    this._hurtFlash(ctx);
    ctx.restore();
    this._drawHpBar(ctx);
  }
}

// ── Warden ────────────────────────────────────────────────────────────────────
export class Warden extends Mob {
  constructor(x) {
    super(x, 20, 38, 32, 54);
    this._sonicCooldown = 3.0;
  }

  update(dt, penguin) {
    this._animTimer += dt;
    this._hurtTimer = Math.max(0, this._hurtTimer - dt);
    this._sonicCooldown -= dt;
    if (this.dead) return null;
    const dir = penguin.x < this.x ? -1 : 1;
    this.x += dir * this.speed * dt;
    if (this._sonicCooldown <= 0) {
      this._sonicCooldown = 5.0;
      return { type: 'sonicboom', x: this.x + dir * 16, y: this.y - 6, dir };
    }
    return null;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const t = this._animTimer;
    const R = (c, sx, sy, sw, sh) => { ctx.fillStyle = c; ctx.fillRect(sx, sy, sw, sh); };
    const pulse   = 0.65 + Math.sin(t * 3.0) * 0.35;
    const bodyBob = Math.abs(Math.sin(t * 5)) * 2;
    const armSwL  =  Math.sin(t * 5) * 0.22;  // arm swing angle (radians)
    const armSwR  = -Math.sin(t * 5) * 0.22;

    // Short wide legs (drawn behind body)
    R('#090614', -13, 22 + Math.sin(t * 5) * 3,  11, 14);
    R('#090614',   2, 22 - Math.sin(t * 5) * 3,  11, 14);
    R('#003028',  -9, 24 + Math.sin(t * 5) * 3,   3, 10); // leg vein L
    R('#003028',   6, 24 - Math.sin(t * 5) * 3,   3, 10); // leg vein R

    ctx.translate(0, -bodyBob);

    // === BODY ===
    R('#080614', -16, -22, 32, 44);
    // Sculk texture patches
    R('#0d1028', -14, -20, 10, 10);
    R('#0d1028',   6, -10, 8,  12);
    R('#0d1028', -10,   6, 12,  8);

    // === CHEST BIOLUMINESCENCE (ribcage) ===
    R(`#00${Math.round(160 * pulse).toString(16).padStart(2,'0')}90`,  -10, -18, 20, 8);  // top chest bar
    ctx.fillStyle = `rgba(0,${Math.round(220*pulse)},150,0.9)`; ctx.fillRect(-8, -8, 16, 3);
    ctx.fillStyle = `rgba(0,${Math.round(190*pulse)},130,0.9)`; ctx.fillRect(-8, -3, 16, 3);
    ctx.fillStyle = `rgba(0,${Math.round(160*pulse)},110,0.9)`; ctx.fillRect(-8,  2, 16, 3);
    // Spine glow line
    ctx.fillStyle = `rgba(0,255,190,${0.55 + pulse * 0.45})`; ctx.fillRect(-2, -20, 4, 42);
    // Ambient chest bloom
    ctx.fillStyle = `rgba(0,255,170,${0.06 * pulse})`; ctx.fillRect(-20, -24, 40, 46);

    // === SHOULDER PLATES ===
    R('#0b0920', -24, -22, 10, 10);
    R('#0b0920',  14, -22, 10, 10);
    R('#003830', -22, -20,  4,  6); // shoulder teal
    R('#003830',  18, -20,  4,  6);

    // === LONG ARMS (pivot from shoulder, swing) ===
    ctx.save();
    ctx.translate(-22, -16);
    ctx.rotate(armSwL);
    R('#07050e',  -4,  0, 10, 52);          // arm shaft
    R('#002a22',  -2,  4,  3, 44);           // teal vein
    R('#07050e',  -7, 48,  8,  6);           // hand pad
    R('#07050e',  -3, 54,  5,  6);           // claw
    R('#003828',  -6, 48,  2,  4);           // claw glow
    ctx.restore();

    ctx.save();
    ctx.translate(14, -16);
    ctx.rotate(armSwR);
    R('#07050e',  -4,  0, 10, 52);
    R('#002a22',   1,  4,  3, 44);
    R('#07050e',  -1, 48,  8,  6);
    R('#07050e',  -2, 54,  5,  6);
    R('#003828',   4, 48,  2,  4);
    ctx.restore();

    // === HEAD ===
    R('#090516', -14, -44, 28, 22);
    // Sculk on head
    R('#0e1028', -12, -42,  9,  8);
    R('#0e1028',   5, -42,  7,  6);
    R('#0d1025',  -5, -36, 10,  6);

    // === SCULK TENDRILS on top (blocky zig-zag) ===
    // Left tendril
    R('#00bb8a', -11, -44,  3,  6);
    R('#00cc96', -13, -50,  3,  5);
    R('#00bb8a', -11, -55,  3,  4);
    R('#00ffc8', -12, -59,  4,  4); // glowing tip
    // Right tendril
    R('#00bb8a',   8, -44,  3,  6);
    R('#00cc96',  10, -50,  3,  5);
    R('#00bb8a',   8, -55,  3,  4);
    R('#00ffc8',   8, -59,  4,  4);

    // === EYES (teal glow blocks) ===
    ctx.fillStyle = `rgba(0,255,180,${0.75 + pulse * 0.25})`; ctx.fillRect(-10, -38, 7, 6);
    ctx.fillStyle = `rgba(0,255,180,${0.75 + pulse * 0.25})`; ctx.fillRect(  3, -38, 7, 6);
    ctx.fillStyle = `rgba(0,255,240,1)`;                       ctx.fillRect( -9, -37, 5, 4);
    ctx.fillStyle = `rgba(0,255,240,1)`;                       ctx.fillRect(  4, -37, 5, 4);

    // Overall ambient glow
    ctx.fillStyle = `rgba(0,80,55,0.07)`; ctx.fillRect(-28, -62, 56, 100);

    this._hurtFlash(ctx);
    ctx.restore();
    this._drawHpBar(ctx);
  }
}

// ── Wither ────────────────────────────────────────────────────────────────────
export class Wither extends Mob {
  constructor(x) {
    super(x, 15, 30, 32, 30);
    this.y = GROUND_Y - 80;   // hovers above ground
    this._baseY = this.y;
    this._shootCooldown = 2.0;
  }

  update(dt, penguin) {
    this._animTimer += dt;
    this._hurtTimer = Math.max(0, this._hurtTimer - dt);
    this._shootCooldown -= dt;
    if (this.dead) return null;
    this.x += (penguin.x < this.x ? -1 : 1) * this.speed * dt;
    this.y = this._baseY + Math.sin(this._animTimer * 1.5) * 12;
    if (this._shootCooldown <= 0) {
      this._shootCooldown = 3.0;
      const dx = penguin.x - this.x, dy = penguin.y - this.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const spd = 230;
      return { type: 'witherskull', x: this.x + Math.sign(dx) * 16, y: this.y, vx: dx / len * spd, vy: dy / len * spd };
    }
    return null;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const t = this._animTimer;
    const bob   = Math.sin(t * 1.5) * 5;
    const pulse = 0.55 + Math.sin(t * 4) * 0.45;
    ctx.translate(0, bob);
    const R = (c, sx, sy, sw, sh) => { ctx.fillStyle = c; ctx.fillRect(sx, sy, sw, sh); };

    // === TORSO / SPINE ===
    R('#141414',  -5,  -2, 10, 20); // spine
    R('#1c1c1c', -18,  -2, 36,  8); // shoulder bones

    // === BONE ARMS ===
    R('#181818', -30,  -2,  12, 16); // L upper
    R('#141414', -28,  14,  10, 10); // L forearm
    R('#181818',  18,  -2,  12, 16); // R upper
    R('#141414',  18,  14,  10, 10); // R forearm
    // Arm joint knobs
    R('#202020', -29,  12,   5,  4);
    R('#202020',  24,  12,   5,  4);

    // === CENTER SKULL (large, raised) ===
    // Skull dome
    R('#222222', -12, -38, 24, 22);
    // Prominent brow ridge
    R('#0c0c0c', -12, -38, 24,  5);
    // Left eye socket (hollow)
    R('#000000',  -9, -33,  7,  8);
    // Right eye socket
    R('#000000',   2, -33,  7,  8);
    // Eye glow — purple
    ctx.fillStyle = `rgba(170,0,255,${pulse})`;       ctx.fillRect(-8, -32, 5, 6);
    ctx.fillStyle = `rgba(170,0,255,${pulse})`;       ctx.fillRect( 3, -32, 5, 6);
    ctx.fillStyle = `rgba(210,120,255,1)`;            ctx.fillRect(-7, -31, 3, 4);
    ctx.fillStyle = `rgba(210,120,255,1)`;            ctx.fillRect( 4, -31, 3, 4);
    // Nose cavity
    R('#000000',  -1, -24,  2,  3);
    // Teeth row (jaw)
    R('#1e1e1e', -10, -18, 20,  5);
    R('#000000',  -8, -17,  4,  4); // tooth gap
    R('#000000',  -2, -17,  4,  4);
    R('#000000',   4, -17,  4,  4);
    // Skull side ridges
    R('#101010', -14, -36,  2, 18);
    R('#101010',  12, -36,  2, 18);

    // === LEFT SIDE SKULL ===
    R('#1e1e1e', -32, -30, 18, 15);
    R('#0a0a0a', -32, -30, 18,  5); // brow
    R('#000000', -30, -25,  5,  6); // L socket
    R('#000000', -23, -25,  5,  6); // R socket
    ctx.fillStyle = `rgba(130,0,200,${pulse * 0.85})`; ctx.fillRect(-29,-24, 3, 4);
    ctx.fillStyle = `rgba(130,0,200,${pulse * 0.85})`; ctx.fillRect(-22,-24, 3, 4);
    R('#1a1a1a', -31, -17, 17,  4); // jaw
    R('#000000', -30, -16,  3,  3);
    R('#000000', -24, -16,  3,  3);

    // === RIGHT SIDE SKULL ===
    R('#1e1e1e',  14, -30, 18, 15);
    R('#0a0a0a',  14, -30, 18,  5);
    R('#000000',  16, -25,  5,  6);
    R('#000000',  23, -25,  5,  6);
    ctx.fillStyle = `rgba(130,0,200,${pulse * 0.85})`; ctx.fillRect(17,-24, 3, 4);
    ctx.fillStyle = `rgba(130,0,200,${pulse * 0.85})`; ctx.fillRect(24,-24, 3, 4);
    R('#1a1a1a',  14, -17, 17,  4);
    R('#000000',  15, -16,  3,  3);
    R('#000000',  22, -16,  3,  3);

    // Wither dark aura
    ctx.fillStyle = `rgba(50,0,90,${0.1 + pulse * 0.08})`; ctx.fillRect(-36, -42, 72, 54);

    this._hurtFlash(ctx);
    ctx.restore();
    this._drawHpBar(ctx);
  }
}

// ── Ender Dragon ──────────────────────────────────────────────────────────────
export class EnderDragon {
  constructor() {
    this.x = 950; this.y = 200;
    this.w = 60;  this.h = 36;
    this.hp = 15; this.maxHp = 15;
    this.dead = false;
    this._animTimer    = 0;
    this._hurtTimer    = 0;
    this._fireCooldown = 2.5;
    this._dir          = -1;
  }

  get left()   { return this.x - this.w / 2; }
  get right()  { return this.x + this.w / 2; }
  get top()    { return this.y - this.h / 2; }
  get bottom() { return this.y + this.h / 2; }

  hurt(dmg) {
    this.hp -= dmg;
    this._hurtTimer = 0.15;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  update(dt, penguin) {
    this._animTimer    += dt;
    this._hurtTimer     = Math.max(0, this._hurtTimer    - dt);
    this._fireCooldown -= dt;
    if (this.dead) return null;

    this.x += this._dir * 110 * dt;
    if (this.x < 80)  { this._dir =  1; this.x = 80; }
    if (this.x > 880) { this._dir = -1; this.x = 880; }
    this.y = 200 + Math.sin(this._animTimer * 1.2) * 60;

    if (this._fireCooldown <= 0) {
      this._fireCooldown = 3.5;
      const dx = penguin.x - this.x, dy = penguin.y - this.y;
      const len = Math.sqrt(dx * dx + dy * dy), spd = 270;
      return { type: 'dragonfire', x: this.x + this._dir * 30, y: this.y + 12, vx: dx / len * spd, vy: dy / len * spd };
    }
    return null;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this._dir > 0) ctx.scale(-1, 1);
    const t = this._animTimer;
    const flap = Math.sin(t * 5) * 10;
    const R = (c, sx, sy, sw, sh) => { ctx.fillStyle = c; ctx.fillRect(sx, sy, sw, sh); };

    // Wings
    ctx.fillStyle = '#2a0048';
    ctx.beginPath();
    ctx.moveTo(-20, -8); ctx.lineTo(-95, -22 + flap); ctx.lineTo(-82, 12 + flap); ctx.lineTo(-20, 8);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo( 20, -8); ctx.lineTo( 95, -22 + flap); ctx.lineTo( 82, 12 + flap); ctx.lineTo( 20, 8);
    ctx.closePath(); ctx.fill();
    // Wing veins
    ctx.strokeStyle = '#4a0070'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, -4); ctx.lineTo(-90, -16 + flap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-20,  2); ctx.lineTo(-72,  8 + flap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 20, -4); ctx.lineTo( 90, -16 + flap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 20,  2); ctx.lineTo( 72,  8 + flap); ctx.stroke();

    // Body
    R('#4a0080', -22, -12, 44, 26);
    R('#3a0060', -20, -10, 40, 22);
    // Spine spikes
    R('#6600aa', -14, -20, 6, 10);
    R('#6600aa',  -4, -22, 8, 12);
    R('#6600aa',   6, -20, 6, 10);
    // Neck
    R('#3a0060',  16, -20, 12, 16);
    // Head
    R('#5a0090',  22, -34, 24, 18);
    R('#4a0070',  24, -32, 22, 14);
    // Eyes
    R('#ff00ff',  25, -29, 5, 5);
    R('#ff00ff',  36, -29, 5, 5);
    R('#ff88ff',  26, -28, 3, 3);
    R('#ff88ff',  37, -28, 3, 3);
    // Jaw / fire
    R('#3a0060',  28, -20, 18,  8);
    R('#ff4400',  30, -18, 14,  4);
    R('#ffaa00',  32, -17, 10,  2);
    // Tail
    R('#3a0060', -22,  8, 12, 10);
    R('#2a0050', -30, 14, 10,  8);
    R('#1a0040', -36, 20,  8,  6);
    R('#140030', -42, 24,  6,  4);
    // Purple glow aura
    ctx.fillStyle = 'rgba(120,0,200,0.12)'; ctx.fillRect(-50, -22, 100, 44);

    if (this._hurtTimer > 0) {
      ctx.fillStyle = `rgba(255,80,80,${(this._hurtTimer / 0.15) * 0.55})`;
      ctx.fillRect(-30, -22, 60, 44);
    }
    ctx.restore();
  }

  // Boss HP bar drawn from game.js via drawBossBar
}
