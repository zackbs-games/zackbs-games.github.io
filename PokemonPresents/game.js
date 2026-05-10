import { BY_RARITY } from './data.js';
import { loadSprite, getSprite } from './spriteCache.js';

export const CANVAS_W = 960;
export const CANVAS_H = 480;
const GROUND_Y = 390;

const CATCH_RATE = { common: 0.70, rare: 0.35, legendary: 0.10 };

// HUD ball-selector button regions (bottom-left of canvas)
const BTN_NORMAL = { x: 8,   y: CANVAS_H - 54, w: 210, h: 46 };
const BTN_MASTER = { x: 224, y: CANVAS_H - 54, w: 210, h: 46 };

function hitRect(mx, my, r) {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}

const STARS = Array.from({ length: 50 }, (_, i) => ({
  x: (i * 137 + 31) % CANVAS_W,
  y: (i * 89  + 17) % (GROUND_Y - 40),
}));

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pickPokemon(presentType) {
  if (presentType === 'legendary') return rnd(BY_RARITY.legendary);
  if (presentType === 'fancy')     return Math.random() < 0.8 ? rnd(BY_RARITY.rare) : rnd(BY_RARITY.common);
  return Math.random() < 0.1 ? rnd(BY_RARITY.rare) : rnd(BY_RARITY.common);
}

// ── Present ──────────────────────────────────────────────────────────────────
const PRESENT_DEFS = {
  normal:    { spawnInterval: 5,  w: 44, h: 40, body: '#d63031', lid: '#b71c1c', ribbon: '#f1c40f' },
  fancy:     { spawnInterval: 16, w: 44, h: 40, body: '#8e44ad', lid: '#6c3483', ribbon: '#f1c40f' },
  legendary: { spawnInterval: 60, w: 50, h: 46, body: '#e67e22', lid: '#d35400', ribbon: '#fff' },
};

class Present {
  constructor(type, x) {
    this.type  = type;
    this.def   = PRESENT_DEFS[type];
    this.x     = x;
    this.y     = -60;
    this.vy    = 0;
    this.w     = this.def.w;
    this.h     = this.def.h;
    this.state = 'falling';
    this._t    = 0;
    this._squish = 1;
    this._rot  = (Math.random() - 0.5) * 0.2;
    this.rotation = 0;
  }
  get left()   { return this.x - this.w / 2; }
  get right()  { return this.x + this.w / 2; }
  get top()    { return this.y - this.h / 2; }
  get bottom() { return this.y + this.h / 2; }
  hitTest(mx, my) {
    return this.state === 'landed' &&
      mx > this.left && mx < this.right && my > this.top && my < this.bottom;
  }
  open() {
    if (this.state !== 'landed') return false;
    this.state = 'opening'; this._t = 0; return true;
  }
  update(dt) {
    this._t += dt;
    if (this.state === 'falling') {
      this.rotation += this._rot * dt * 2;
      this.vy += 700 * dt; this.y += this.vy * dt;
      const ground = GROUND_Y - this.h / 2;
      if (this.y >= ground) {
        this.y = ground;
        if (Math.abs(this.vy) > 100) {
          this._squish = 1.35; this.vy = -this.vy * 0.3;
        } else { this.vy = 0; this.rotation = 0; this.state = 'landed'; }
      }
    }
    if (this.state === 'landed')   this._squish = 1 + (this._squish - 1) * Math.pow(0.12, dt);
    if (this.state === 'opening' && this._t > 0.55) this.state = 'done';
  }
  draw(ctx) {
    if (this.state === 'done') return;
    const { body, lid, ribbon } = this.def;
    const w = this.w, h = this.h, bh = h * 0.6, lh = h * 0.45;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(1, this.state === 'landed' ? this._squish : 1);
    if (this.state === 'opening') {
      const fly = this._t * 220;
      ctx.fillStyle = lid; ctx.fillRect(-w/2-4, -h/2-fly, w+8, lh);
      ctx.fillStyle = body; ctx.fillRect(-w/2, -h/2+lh*0.6, w, bh);
      ctx.fillStyle = ribbon;
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2 + this._t*5, r = 18 + this._t*50;
        ctx.fillRect(Math.cos(a)*r-3, Math.sin(a)*r-24-3, 6, 6);
      }
    } else {
      ctx.fillStyle = body; ctx.fillRect(-w/2, -h/2+lh*0.6, w, bh);
      ctx.fillStyle = lid;  ctx.fillRect(-w/2-4, -h/2, w+8, lh);
      ctx.fillStyle = ribbon;
      ctx.fillRect(-w/2, -h/2+h/2-4, w, 8);
      ctx.fillRect(-5, -h/2, 10, h);
      ctx.fillRect(-w/4-2, -h/2-9, w/4, 10);
      ctx.fillRect(2, -h/2-9, w/4, 10);
      ctx.fillStyle = '#fff8'; ctx.fillRect(-5, -h/2-5, 10, 8);
      if (this.type === 'legendary') {
        ctx.fillStyle = 'rgba(255,240,80,0.9)';
        for (let i = 0; i < 4; i++) {
          const a = (i/4)*Math.PI*2 + this._t*1.8;
          ctx.fillRect(Math.cos(a)*(w/2+10)-3, Math.sin(a)*12-3, 6, 6);
        }
      }
    }
    ctx.restore();
  }
}

// ── WildPokemon ──────────────────────────────────────────────────────────────
const WANDER_TIMER = { common: 10, rare: 10, legendary: 8 };

class WildPokemon {
  constructor(data, x, y) {
    this.data  = data;
    this.x     = x; this.y = y;
    this.vx    = (Math.random() < 0.5 ? 1 : -1) * (35 + Math.random() * 45);
    this.vy    = (Math.random() - 0.5) * 30;
    this.maxTimer = WANDER_TIMER[data.rarity];
    this.timer    = this.maxTimer;
    this.state    = 'wandering';
    this._dir     = 0; this._anim = 0;
    this._catchT  = 0; this._escapeT = 0;
    this._failedAttempts = 0;
    this._shakeTimer     = 0;
    loadSprite(data.id);
  }
  hitTest(mx, my) {
    return this.state === 'wandering' && Math.hypot(mx - this.x, my - this.y) < 34;
  }
  catch() { this.state = 'caught'; }
  onBallFailed() {
    this._failedAttempts++;
    this._shakeTimer = 0.5;
    // Speed up after each failed attempt
    const boost = 1 + this._failedAttempts * 0.4;
    this.vx = (Math.random() < 0.5 ? 1 : -1) * (60 + Math.random() * 60) * boost;
    this.vy = (Math.random() - 0.5) * 60 * boost;
    this._dir = 0;
    if (this._failedAttempts >= 3) this.timer = 0; // flee immediately
  }
  update(dt) {
    this._anim += dt;
    if (this._shakeTimer > 0) this._shakeTimer -= dt;
    if (this.state === 'wandering') {
      this.timer -= dt; this._dir -= dt;
      if (this._dir <= 0) {
        this._dir = 1 + Math.random() * 2;
        this.vx = (Math.random() < 0.5 ? 1 : -1) * (35 + Math.random() * 55);
        this.vy = (Math.random() - 0.5) * 40;
      }
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.x < 60)            { this.x = 60;            this.vx =  Math.abs(this.vx); }
      if (this.x > CANVAS_W - 60) { this.x = CANVAS_W - 60; this.vx = -Math.abs(this.vx); }
      if (this.y < 60)            { this.y = 60;             this.vy =  Math.abs(this.vy); }
      if (this.y > GROUND_Y - 50) { this.y = GROUND_Y - 50; this.vy = -Math.abs(this.vy); }
      if (this.timer <= 0) this.state = 'escaped';
    }
    if (this.state === 'caught')  this._catchT  += dt;
    if (this.state === 'escaped') this._escapeT += dt;
  }
  get dead() {
    return (this.state === 'caught'  && this._catchT  > 0.9) ||
           (this.state === 'escaped' && this._escapeT > 0.7);
  }
  draw(ctx) {
    if (this.dead) return;
    const sprite = getSprite(this.data.id);
    const sz = 56;
    ctx.save();
    // Shake effect on failed catch
    const shake = this._shakeTimer > 0 ? Math.sin(this._shakeTimer * 60) * 6 : 0;
    if (this.state === 'caught') {
      const t = this._catchT;
      ctx.globalAlpha = Math.max(0, 1 - t * 1.8);
      ctx.translate(this.x, this.y - t * 80);
      ctx.scale(1 + t * 0.6, 1 + t * 0.6);
    } else if (this.state === 'escaped') {
      ctx.globalAlpha = Math.max(0, 1 - this._escapeT * 2.5);
      ctx.translate(this.x, this.y);
    } else {
      const bob = Math.sin(this._anim * 3.5) * 2.5;
      ctx.translate(this.x + shake, this.y + bob);
      // Timer ring
      const frac = this.timer / this.maxTimer;
      ctx.beginPath();
      ctx.arc(0, 0, sz/2+10, -Math.PI/2, -Math.PI/2 + frac * Math.PI*2);
      ctx.strokeStyle = frac > 0.5 ? '#2ecc71' : frac > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.lineWidth = 3; ctx.stroke();
      // Failed attempts dots
      for (let i = 0; i < this._failedAttempts; i++) {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.arc(-8 + i * 8, -sz/2 - 18, 4, 0, Math.PI*2); ctx.fill();
      }
    }
    if (sprite) {
      ctx.drawImage(sprite, -sz/2, -sz/2, sz, sz);
    } else {
      const fill = this.data.rarity === 'legendary' ? '#f39c12'
                 : this.data.rarity === 'rare'      ? '#9b59b6' : '#3498db';
      ctx.beginPath(); ctx.arc(0, 0, sz/2, 0, Math.PI*2);
      ctx.fillStyle = fill; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px "Courier New",monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`#${this.data.id}`, 0, 0);
    }
    if (this.state === 'wandering') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      const nw = this.data.name.length * 7 + 10;
      ctx.fillRect(-nw/2, sz/2+3, nw, 15);
      ctx.fillStyle = '#fff'; ctx.font = '10px "Courier New",monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.data.name, 0, sz/2+10);
    }
    ctx.restore();
  }
}

// ── Ball (Poké Ball or Master Ball) ─────────────────────────────────────────
class Ball {
  constructor(target, type, success) {
    this.target   = target;
    this.type     = type;    // 'normal' | 'master'
    this.success  = success; // always true for master
    this.startX   = CANVAS_W / 2;
    this.startY   = CANVAS_H - 20;
    this.x        = this.startX;
    this.y        = this.startY;
    this.progress = 0;
    this.done     = false;
    this.dead     = false;
  }
  update(dt) {
    this.progress = Math.min(1, this.progress + 1.8 * dt);
    const t = this.progress;
    this.x = this.startX + (this.target.x - this.startX) * t;
    this.y = this.startY + (this.target.y - this.startY) * t
           + Math.sin(t * Math.PI) * -160;
    if (this.progress >= 1) this.done = true;
  }
  draw(ctx) {
    if (this.dead) return;
    const r = 11;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.progress * Math.PI * 5);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
    // Top half colour: red for normal, purple for master
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0);
    ctx.fillStyle = this.type === 'master' ? '#7d3c98' : '#c0392b'; ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI*2); ctx.fillStyle = '#ccc'; ctx.fill();
    if (this.type === 'master') {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('M', 0, -4);
    }
    ctx.restore();
  }
}

// ── Game ─────────────────────────────────────────────────────────────────────
export class Game {
  constructor(canvas, onCatch) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.onCatch = onCatch;
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    this._init();
    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      this._click((e.clientX - rect.left) * CANVAS_W / rect.width,
                  (e.clientY - rect.top)  * CANVAS_H / rect.height);
    });
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      this._click((t.clientX - rect.left) * CANVAS_W / rect.width,
                  (t.clientY - rect.top)  * CANVAS_H / rect.height);
    }, { passive: false });
  }

  _init() {
    this.presents      = [];
    this.wildPokemon   = [];
    this.balls         = [];
    this.particles     = [];
    this.normalBalls   = 30;
    this.masterBalls   = 5;
    this.activeBall    = 'normal'; // 'normal' | 'master'
    this.caught        = new Set();
    this.totalCatches  = 0;
    this._nextBallBonus = 10;
    this._timers       = { normal: 0, fancy: 0, legendary: 0 };
    this._regenTimer   = 0;
    this._animTimer    = 0;
    this._msg          = null;
    this._state        = 'playing';
    this._spawnPresent('normal');
    this._updateHUD();
  }

  _spawnPresent(type) {
    const m = 80;
    this.presents.push(new Present(type, m + Math.random() * (CANVAS_W - m * 2)));
  }

  _click(mx, my) {
    if (this._state === 'win') { this._init(); return; }

    // Ball selector buttons
    if (hitRect(mx, my, BTN_NORMAL)) { this.activeBall = 'normal';  return; }
    if (hitRect(mx, my, BTN_MASTER)) { this.activeBall = 'master';  return; }

    // Wild Pokémon (timer is running — priority)
    for (const wp of this.wildPokemon) {
      if (wp.state !== 'wandering' || !wp.hitTest(mx, my)) continue;
      if (this.balls.some(b => b.target === wp)) return; // already in flight

      if (this.activeBall === 'master') {
        if (this.masterBalls <= 0) { this._showMsg('No Master Balls left!', '#e74c3c'); return; }
        this.masterBalls--;
        this.balls.push(new Ball(wp, 'master', true));
      } else {
        if (this.normalBalls <= 0) {
          if (this.masterBalls > 0) { this._showMsg('No Poké Balls! Switch to Master Ball.', '#f39c12'); }
          else                      { this._showMsg('No balls left!', '#e74c3c'); }
          return;
        }
        this.normalBalls--;
        const rate    = CATCH_RATE[wp.data.rarity];
        const success = Math.random() < rate;
        this.balls.push(new Ball(wp, 'normal', success));
      }
      this._updateHUD();
      return;
    }

    // Presents
    for (const p of this.presents) {
      if (p.hitTest(mx, my)) {
        if (p.open()) this.wildPokemon.push(new WildPokemon(pickPokemon(p.type), p.x, GROUND_Y - 100));
        return;
      }
    }
  }

  _showMsg(text, color = '#fff') { this._msg = { text, color, timer: 2.5 }; }

  _updateHUD() {
    const nb = document.getElementById('normal-ball-count');
    if (nb) nb.textContent = this.normalBalls;
    const mb = document.getElementById('master-ball-count');
    if (mb) mb.textContent = this.masterBalls;
    const c = document.getElementById('caught-count');
    if (c) c.textContent = `${this.caught.size} / 151`;
  }

  _catch(wp) {
    const { id, name, rarity } = wp.data;
    const alreadyHad = this.caught.has(id);
    this.caught.add(id);
    this.totalCatches++;
    if (alreadyHad) {
      this._showMsg(`${name} already caught!`, '#e67e22');
    } else {
      const col = rarity === 'legendary' ? '#f39c12' : rarity === 'rare' ? '#c39bd3' : '#2ecc71';
      this._showMsg(`${name} caught!`, col);
      this._addSparkles(wp.x, wp.y, rarity);
      this.onCatch(id);
      if (this.totalCatches >= this._nextBallBonus) {
        this._nextBallBonus += 10;
        this.normalBalls += 3;
        this._showMsg(`${name} caught! +3 Poké Balls!`, '#f1c40f');
      }
      if (this.caught.size >= 151) this._state = 'win';
    }
    wp.catch();
    this._updateHUD();
  }

  _failedCatch(wp) {
    const { name, rarity } = wp.data;
    const rate = Math.round(CATCH_RATE[rarity] * 100);
    this._showMsg(`${name} broke free! (${rate}% chance)`, '#e74c3c');
    wp.onBallFailed();
  }

  _addSparkles(x, y, rarity) {
    const n     = rarity === 'legendary' ? 22 : rarity === 'rare' ? 14 : 8;
    const color = rarity === 'legendary' ? [1,0.85,0.1] : rarity === 'rare' ? [0.7,0.3,1] : [0.2,0.9,0.4];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 110;
      const life = 0.4 + Math.random() * 0.5;
      this.particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s-60, life, maxLife: life, size: 3+Math.random()*4, color });
    }
  }

  update(dt) {
    this._animTimer += dt;
    if (this._state !== 'playing') return;
    if (this._msg) { this._msg.timer -= dt; if (this._msg.timer <= 0) this._msg = null; }

    // Normal ball regen (1 every 20s, max 99)
    this._regenTimer += dt;
    if (this._regenTimer >= 20 && this.normalBalls < 99) {
      this._regenTimer = 0; this.normalBalls++; this._updateHUD();
    }

    for (const type of ['normal', 'fancy', 'legendary']) {
      this._timers[type] += dt;
      if (this._timers[type] >= PRESENT_DEFS[type].spawnInterval &&
          this.presents.filter(p => p.state !== 'done').length < 10) {
        this._timers[type] = 0; this._spawnPresent(type);
      }
    }

    for (const p of this.presents)     p.update(dt);
    for (const wp of this.wildPokemon) wp.update(dt);

    for (const b of this.balls) {
      b.update(dt);
      if (b.done && !b.dead) {
        b.dead = true;
        if (b.success) this._catch(b.target);
        else           this._failedCatch(b.target);
      }
    }

    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt;
    }

    this.presents    = this.presents.filter(p => p.state !== 'done');
    this.wildPokemon = this.wildPokemon.filter(wp => !wp.dead);
    this.balls       = this.balls.filter(b => !b.dead);
    this.particles   = this.particles.filter(p => p.life > 0);
  }

  draw() {
    const ctx = this.ctx, t = this._animTimer;
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#0d1b3e'); sky.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);
    for (const s of STARS) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.25 * Math.sin(t*1.8+s.x)})`;
      ctx.fillRect(s.x, s.y, 2, 2);
    }
    ctx.fillStyle = '#1e3a1e'; ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
    ctx.fillStyle = '#2d5a1e'; ctx.fillRect(0, GROUND_Y, CANVAS_W, 18);
    ctx.fillStyle = '#3d7a28';
    for (let gx = 8; gx < CANVAS_W; gx += 28) ctx.fillRect(gx, GROUND_Y-3, 14, 7);

    for (const p of this.presents) p.draw(ctx);

    for (const p of this.particles) {
      const a = p.life / p.maxLife, [r,g,b] = p.color;
      ctx.fillStyle = `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})`;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }

    for (const wp of this.wildPokemon) wp.draw(ctx);
    for (const b  of this.balls)       b.draw(ctx);

    this._drawHUD(ctx);
    if (this._state === 'win') this._drawWin(ctx);
  }

  _drawBallBtn(ctx, r, label, count, active) {
    ctx.fillStyle = active ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 8); ctx.fill();
    if (active) {
      ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 8); ctx.stroke();
    }
    // Ball icon
    const bx = r.x + 22, by = r.y + r.h / 2;
    const br = 10;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, br, Math.PI, 0);
    ctx.fillStyle = label === 'Master' ? '#7d3c98' : '#c0392b'; ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx-br, by); ctx.lineTo(bx+br, by); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI*2); ctx.fillStyle = '#bbb'; ctx.fill();
    if (label === 'Master') {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 6px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('M', bx, by-3);
    }
    ctx.fillStyle = active ? '#f1c40f' : '#ddd';
    ctx.font = `bold 13px "Courier New",monospace`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${label}  ×${count}`, r.x + 38, r.y + r.h/2);
  }

  _drawHUD(ctx) {
    // Ball selector buttons
    this._drawBallBtn(ctx, BTN_NORMAL, 'Poké',   this.normalBalls, this.activeBall === 'normal');
    this._drawBallBtn(ctx, BTN_MASTER, 'Master', this.masterBalls, this.activeBall === 'master');

    // Caught count
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.roundRect(CANVAS_W/2-72, 8, 144, 40, 8); ctx.fill();
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 15px "Courier New",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${this.caught.size} / 151`, CANVAS_W/2, 28);

    // Message
    if (this._msg) {
      ctx.save(); ctx.globalAlpha = Math.min(1, this._msg.timer);
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath(); ctx.roundRect(CANVAS_W/2-180, GROUND_Y-65, 360, 38, 8); ctx.fill();
      ctx.fillStyle = this._msg.color; ctx.font = 'bold 15px "Courier New",monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this._msg.text, CANVAS_W/2, GROUND_Y-46);
      ctx.restore();
    }

    // Hint
    const hasLanded = this.presents.some(p => p.state === 'landed');
    const hasWild   = this.wildPokemon.some(w => w.state === 'wandering');
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '11px "Courier New",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (!hasLanded && !hasWild)   ctx.fillText('Presents are coming!', CANVAS_W/2, CANVAS_H-60);
    else if (hasLanded && !hasWild) ctx.fillText('Click a present to open it!', CANVAS_W/2, CANVAS_H-60);
    else if (hasWild) ctx.fillText('Click a Pokémon to throw your selected ball!', CANVAS_W/2, CANVAS_H-60);
  }

  _drawWin(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 50px "Courier New",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GOTTA CATCH EM ALL!', CANVAS_W/2, CANVAS_H/2-44);
    ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 22px "Courier New",monospace';
    ctx.fillText('All 151 Pokémon caught!', CANVAS_W/2, CANVAS_H/2+10);
    ctx.fillStyle = '#fff'; ctx.font = '17px "Courier New",monospace';
    ctx.fillText('Tap to play again', CANVAS_W/2, CANVAS_H/2+52);
  }
}
