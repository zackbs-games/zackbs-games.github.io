import { Penguin } from './penguin.js';
import {
  Zombie, Creeper, Skeleton, Warden, Wither, EnderDragon,
  Arrow, Snowball, SonicBoom, WitherSkull, DragonFireball, BlizzardWave,
} from './mobs.js';
import {
  CANVAS_W, CANVAS_H, GROUND_Y,
  drawSky, drawClouds, drawGround, drawPlatforms,
} from './world.js';

const WAVES = [
  // 1 — zombies only
  [{ type:'zombie',  count:3, gap:2.5 }],
  // 2 — zombies + creepers
  [{ type:'zombie',  count:3, gap:2.0 }, { type:'creeper',  count:2, gap:3.0 }],
  // 3 — zombies + skeletons
  [{ type:'zombie',  count:4, gap:1.8 }, { type:'skeleton', count:2, gap:3.5 }],
  // 4 — all three basic types
  [{ type:'zombie',  count:3, gap:1.5 }, { type:'creeper',  count:2, gap:2.5 }, { type:'skeleton', count:2, gap:4.0 }],
  // 5 — big basic wave
  [{ type:'zombie',  count:5, gap:1.3 }, { type:'creeper',  count:3, gap:2.0 }, { type:'skeleton', count:3, gap:3.0 }],
  // 6 — WARDEN introduction
  [{ type:'zombie',  count:3, gap:2.0 }, { type:'skeleton', count:2, gap:3.0 }, { type:'warden',   count:1, gap:6.0 }],
  // 7 — double Warden
  [{ type:'creeper', count:3, gap:2.0 }, { type:'skeleton', count:3, gap:2.5 }, { type:'warden',   count:2, gap:5.0 }],
  // 8 — WITHER introduction
  [{ type:'zombie',  count:4, gap:1.5 }, { type:'creeper',  count:2, gap:2.5 }, { type:'wither',   count:1, gap:7.0 }],
  // 9 — Warden + Wither chaos
  [{ type:'zombie',  count:3, gap:1.5 }, { type:'skeleton', count:2, gap:3.0 }, { type:'warden',   count:1, gap:4.0 }, { type:'wither', count:1, gap:6.0 }],
  // 10 — ENDER DRAGON boss wave
  [{ type:'zombie',  count:2, gap:2.0 }, { type:'skeleton', count:2, gap:3.5 }, { type:'warden',   count:1, gap:5.0 }, { type:'enderdragon', count:1, gap:10.0 }],
];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    this.ctx = canvas.getContext('2d');

    this.keys = { left: false, right: false };
    this._jumpHeld   = false;
    this._punchHeld  = false;
    this._throwHeld  = false;
    this._waveHeld   = false;

    window.addEventListener('keydown', e => {
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') this.keys.left  = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !this._jumpHeld) {
        this._jumpHeld = true;
        if (this._state === 'playing') this.penguin.jump();
        else if (this._restartDelay <= 0) this._init();
        e.preventDefault();
      }
      if ((e.code === 'KeyZ' || e.code === 'ControlLeft') && !this._punchHeld) {
        this._punchHeld = true;
        if (this._state === 'playing') this.penguin.punch();
      }
      if ((e.code === 'KeyX' || e.code === 'ShiftLeft') && !this._throwHeld) {
        this._throwHeld = true;
        if (this._state === 'playing') this._spawnSnowball();
      }
      if (e.code === 'KeyQ' && !this._waveHeld) {
        this._waveHeld = true;
        if (this._state === 'playing') this._spawnBlizzardWave();
      }
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA')                       this.keys.left  = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD')                       this.keys.right = false;
      if (e.code === 'Space' || e.code === 'ArrowUp'  || e.code === 'KeyW')  this._jumpHeld  = false;
      if (e.code === 'KeyZ'  || e.code === 'ControlLeft')                     this._punchHeld = false;
      if (e.code === 'KeyX'  || e.code === 'ShiftLeft')                       this._throwHeld = false;
      if (e.code === 'KeyQ')                                                   this._waveHeld  = false;
    });

    this._init();
  }

  _init() {
    this.penguin      = new Penguin();
    this.mobs         = [];
    this.projectiles  = [];
    this._state           = 'playing';
    this._blizzardCharges = 10;
    this._blizzardCooldown = 0;
    this._waveIdx     = 0;
    this._waveTimer   = 0;
    this._spawnQueue  = [];
    this._wavePause   = -1;
    this._kills       = 0;
    this._cloudTimer  = 0;
    this._restartDelay = 0;
    this._startWave(0);
  }

  _startWave(idx) {
    this._waveIdx   = idx;
    this._waveTimer = 0;
    this._spawnQueue = [];
    if (idx >= WAVES.length) { this._state = 'win'; this._restartDelay = 2.0; return; }
    let t = 1.0;
    for (const group of WAVES[idx]) {
      for (let i = 0; i < group.count; i++) {
        this._spawnQueue.push({ type: group.type, time: t });
        t += group.gap;
      }
    }
  }

  _spawnBlizzardWave() {
    if (this._blizzardCharges <= 0 || this._blizzardCooldown > 0) return;
    this._blizzardCharges--;
    this._blizzardCooldown = 15;
    this.projectiles.push(new BlizzardWave(this.penguin.x, this.penguin.facing));
  }

  _spawnSnowball() {
    if (!this.penguin.canThrow()) return;
    this.penguin.usedThrow();
    const dir = this.penguin.facing;
    this.projectiles.push(new Snowball(this.penguin.x + dir * 14, this.penguin.y - 8, dir));
  }

  _makeMob(type) {
    const x = 910 + Math.random() * 60;
    switch (type) {
      case 'zombie':      return new Zombie(x);
      case 'creeper':     return new Creeper(x);
      case 'skeleton':    return new Skeleton(x);
      case 'warden':      return new Warden(x);
      case 'wither':      return new Wither(x);
      case 'enderdragon': return new EnderDragon(); // has its own start position
    }
  }

  update(dt) {
    this._cloudTimer += dt;
    if (this._state !== 'playing') {
      this._restartDelay = Math.max(0, this._restartDelay - dt);
      return;
    }

    this._blizzardCooldown = Math.max(0, this._blizzardCooldown - dt);

    // Penguin
    this.penguin.update(dt, this.keys);
    if (this.penguin.dead) { this._state = 'dead'; this._restartDelay = 1.5; return; }

    // Spawn queue
    this._waveTimer += dt;
    this._spawnQueue = this._spawnQueue.filter(s => {
      if (this._waveTimer >= s.time) { this.mobs.push(this._makeMob(s.type)); return false; }
      return true;
    });

    // Update mobs + collect events
    for (const mob of this.mobs) {
      const evt = mob.update(dt, this.penguin);
      if (!evt) continue;
      if (evt.type === 'arrow')      this.projectiles.push(new Arrow(evt.x, evt.y, evt.dir));
      if (evt.type === 'sonicboom')  this.projectiles.push(new SonicBoom(evt.x, evt.y, evt.dir));
      if (evt.type === 'witherskull') this.projectiles.push(new WitherSkull(evt.x, evt.y, evt.vx, evt.vy));
      if (evt.type === 'dragonfire') this.projectiles.push(new DragonFireball(evt.x, evt.y, evt.vx, evt.vy));
      if (evt.type === 'explode') {
        const dx = this.penguin.x - evt.x, dy = this.penguin.y - evt.y;
        if (Math.sqrt(dx * dx + dy * dy) < evt.radius) this.penguin.hurt(2);
      }
    }

    const before = this.mobs.length;
    this.mobs = this.mobs.filter(m => !m.dead);
    this._kills += before - this.mobs.length;

    // Penguin punch vs mobs
    const ph = this.penguin.punchHitbox;
    if (ph) {
      for (const mob of this.mobs) {
        if (mob.right > ph.x && mob.left  < ph.x + ph.w &&
            mob.bottom > ph.y && mob.top   < ph.y + ph.h) {
          mob.hurt(2);
        }
      }
    }

    // Mob contact damage
    for (const mob of this.mobs) {
      if (mob instanceof Creeper && mob._fuseActive) continue;
      if (mob.right > this.penguin.left && mob.left  < this.penguin.right &&
          mob.bottom > this.penguin.top  && mob.top   < this.penguin.bottom) {
        this.penguin.hurt(mob instanceof Warden || mob instanceof EnderDragon ? 2 : 1);
      }
    }

    // Projectile collision
    for (const p of this.projectiles) {
      p.update(dt);
      if (p.dead) continue;
      const hitsPlayer = p instanceof Arrow || p instanceof SonicBoom
                      || p instanceof WitherSkull || p instanceof DragonFireball;
      if (hitsPlayer) {
        if (p.right > this.penguin.left && p.left  < this.penguin.right &&
            p.bottom > this.penguin.top  && p.top   < this.penguin.bottom) {
          this.penguin.hurt(p.damage ?? 1); p.dead = true;
        }
      } else if (p instanceof Snowball) {
        for (const mob of this.mobs) {
          if (!mob.dead &&
              p.right > mob.left && p.left  < mob.right &&
              p.bottom > mob.top  && p.top   < mob.bottom) {
            mob.hurt(1); p.dead = true; break;
          }
        }
      } else if (p instanceof BlizzardWave) {
        for (const mob of this.mobs) {
          if (!mob.dead &&
              p.right > mob.left && p.left  < mob.right &&
              p.bottom > mob.top  && p.top   < mob.bottom) {
            mob.hurt(p.damage);
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);

    // Wave clear check
    if (this._spawnQueue.length === 0 && this.mobs.length === 0 && this._wavePause < 0) {
      this._wavePause = 2.5;
    }
    if (this._wavePause >= 0) {
      this._wavePause -= dt;
      if (this._wavePause <= 0) {
        this._wavePause = -1;
        this._startWave(this._waveIdx + 1);
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    drawSky(ctx);
    drawClouds(ctx, this._cloudTimer);
    drawPlatforms(ctx);
    drawGround(ctx);
    for (const p of this.projectiles) p.draw(ctx);
    for (const m of this.mobs)        m.draw(ctx);
    this.penguin.draw(ctx);
    this._drawHUD(ctx);
  }

  _drawHeart(ctx, x, y, full) {
    ctx.fillStyle = full ? '#ff2222' : '#441111';
    const P = 2;
    for (const [px, py] of [
      [1,0],[2,0],[4,0],[5,0],
      [0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
      [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
      [1,3],[2,3],[3,3],[4,3],[5,3],
      [2,4],[3,4],[4,4],
      [3,5],
    ]) ctx.fillRect(x + px * P, y + py * P, P, P);
  }

  _drawBossBar(ctx, mob) {
    let name, color;
    if (mob instanceof Warden)      { name = '⚔  WARDEN  ⚔';       color = '#00ffc8'; }
    else if (mob instanceof Wither) { name = '☠  WITHER  ☠';        color = '#9933ff'; }
    else                            { name = '◈  ENDER DRAGON  ◈';  color = '#cc44ff'; }

    const bw = 420, bh = 18;
    const bx = CANVAS_W / 2 - bw / 2, by = 44;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    ctx.fillStyle = '#220000';          ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = color;              ctx.fillRect(bx, by, bw * (mob.hp / mob.maxHp), bh);
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, CANVAS_W / 2, by + bh / 2);
  }

  _drawHUD(ctx) {
    ctx.save();

    // Hearts
    for (let i = 0; i < this.penguin.maxHp; i++) {
      this._drawHeart(ctx, 14 + i * 22, 12, i < this.penguin.hp);
    }

    // Wave pill
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(CANVAS_W / 2 - 78, 10, 156, 30, 8); ctx.fill();
    ctx.fillStyle = '#fde68a'; ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`Wave ${Math.min(this._waveIdx + 1, WAVES.length)} / ${WAVES.length}`, CANVAS_W / 2, 25);

    // Kill count
    ctx.fillStyle = '#a0f0a0'; ctx.font = '13px "Courier New", monospace';
    ctx.textAlign = 'right'; ctx.fillText(`${this._kills} mobs`, CANVAS_W - 12, 25);

    // Boss health bar (first boss mob found)
    const boss = this.mobs.find(m => m instanceof Warden || m instanceof Wither || m instanceof EnderDragon);
    if (boss) this._drawBossBar(ctx, boss);

    // Blizzard charges
    {
      const cx = CANVAS_W - 12;
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 13px "Courier New", monospace';
      const ready = this._blizzardCooldown <= 0 && this._blizzardCharges > 0;
      ctx.fillStyle = ready ? '#88eeff' : '#336677';
      let label = `Q ❄ ×${this._blizzardCharges}`;
      if (this._blizzardCooldown > 0) label += `  ${this._blizzardCooldown.toFixed(1)}s`;
      ctx.fillText(label, cx, CANVAS_H - 10);
    }

    // Controls hint
    if (this._kills === 0 && this._state === 'playing') {
      ctx.fillStyle = 'rgba(200,230,255,0.75)'; ctx.font = '12px "Courier New", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('← → move   SPACE jump (×2)   Z punch   X snowball   Q blizzard', CANVAS_W / 2, CANVAS_H - 10);
    }

    // Wave-clear banner
    if (this._wavePause > 0 && this._state === 'playing') {
      ctx.fillStyle = 'rgba(0,60,0,0.7)';
      ctx.beginPath(); ctx.roundRect(CANVAS_W / 2 - 130, CANVAS_H / 2 - 26, 260, 52, 12); ctx.fill();
      ctx.fillStyle = '#88ff88'; ctx.font = 'bold 20px "Courier New", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const next = this._waveIdx + 1;
      ctx.fillText(next < WAVES.length ? `Wave ${this._waveIdx + 1} clear! Next wave…` : 'All waves cleared!', CANVAS_W / 2, CANVAS_H / 2);
    }

    // Dead screen
    if (this._state === 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#ff4444'; ctx.font = 'bold 60px "Courier New", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('YOU DIED', CANVAS_W / 2, CANVAS_H / 2 - 28);
      if (this._restartDelay <= 0) {
        ctx.fillStyle = '#ffffff'; ctx.font = '18px "Courier New", monospace';
        ctx.fillText('Press SPACE to try again', CANVAS_W / 2, CANVAS_H / 2 + 24);
      }
    }

    // Win screen
    if (this._state === 'win') {
      ctx.fillStyle = 'rgba(0,30,0,0.55)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 58px "Courier New", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('YOU WIN!', CANVAS_W / 2, CANVAS_H / 2 - 36);
      ctx.fillStyle = '#88ff88'; ctx.font = 'bold 20px "Courier New", monospace';
      ctx.fillText(`${this._kills} mobs defeated!`, CANVAS_W / 2, CANVAS_H / 2 + 12);
      if (this._restartDelay <= 0) {
        ctx.fillStyle = '#ffffff'; ctx.font = '18px "Courier New", monospace';
        ctx.fillText('Press SPACE to play again', CANVAS_W / 2, CANVAS_H / 2 + 50);
      }
    }

    ctx.restore();
  }
}
