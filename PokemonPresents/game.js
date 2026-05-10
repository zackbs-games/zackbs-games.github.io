import { BY_RARITY, POKEMON } from './data.js';
import { loadSprite, getSprite } from './spriteCache.js';

export const CANVAS_W = 960;
export const CANVAS_H = 480;
const GROUND_Y = 390;

// ── Stars (deterministic, computed once) ────────────────────────────────────
const STARS = Array.from({ length: 50 }, (_, i) => ({
  x: (i * 137 + 31) % CANVAS_W,
  y: (i * 89  + 17) % (GROUND_Y - 40),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
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
    this.state = 'falling'; // falling | landed | opening | done
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
      mx > this.left && mx < this.right &&
      my > this.top  && my < this.bottom;
  }

  open() {
    if (this.state !== 'landed') return false;
    this.state = 'opening';
    this._t = 0;
    return true;
  }

  update(dt) {
    this._t += dt;
    if (this.state === 'falling') {
      this.rotation += this._rot * dt * 2;
      this.vy += 700 * dt;
      this.y  += this.vy * dt;
      const ground = GROUND_Y - this.h / 2;
      if (this.y >= ground) {
        this.y = ground;
        if (Math.abs(this.vy) > 100) {
          this._squish = 1.35;
          this.vy = -this.vy * 0.3;
        } else {
          this.vy = 0;
          this.rotation = 0;
          this.state = 'landed';
        }
      }
    }
    if (this.state === 'landed') {
      this._squish = 1 + (this._squish - 1) * Math.pow(0.12, dt);
    }
    if (this.state === 'opening' && this._t > 0.55) {
      this.state = 'done';
    }
  }

  draw(ctx) {
    if (this.state === 'done') return;
    const { body, lid, ribbon } = this.def;
    const w = this.w, h = this.h;
    const bh = h * 0.6, lh = h * 0.45;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(1, this.state === 'landed' ? this._squish : 1);

    if (this.state === 'opening') {
      const fly = this._t * 220;
      // lid flying up
      ctx.fillStyle = lid;
      ctx.fillRect(-w / 2 - 4, -h / 2 - fly, w + 8, lh);
      // body
      ctx.fillStyle = body;
      ctx.fillRect(-w / 2, -h / 2 + lh * 0.6, w, bh);
      // sparkles
      ctx.fillStyle = ribbon;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + this._t * 5;
        const r = 18 + this._t * 50;
        ctx.fillRect(Math.cos(a) * r - 3, Math.sin(a) * r - 24 - 3, 6, 6);
      }
    } else {
      // body
      ctx.fillStyle = body;
      ctx.fillRect(-w / 2, -h / 2 + lh * 0.6, w, bh);
      // lid
      ctx.fillStyle = lid;
      ctx.fillRect(-w / 2 - 4, -h / 2, w + 8, lh);
      // ribbon H
      ctx.fillStyle = ribbon;
      ctx.fillRect(-w / 2, -h / 2 + h / 2 - 4, w, 8);
      // ribbon V
      ctx.fillRect(-5, -h / 2, 10, h);
      // bow loops
      ctx.fillRect(-w / 4 - 2, -h / 2 - 9, w / 4, 10);
      ctx.fillRect(2, -h / 2 - 9, w / 4, 10);
      ctx.fillStyle = '#fff8';
      ctx.fillRect(-5, -h / 2 - 5, 10, 8);
      // legendary sparkles
      if (this.type === 'legendary') {
        ctx.fillStyle = 'rgba(255,240,80,0.9)';
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + this._t * 1.8;
          ctx.fillRect(Math.cos(a) * (w / 2 + 10) - 3, Math.sin(a) * 12 - 3, 6, 6);
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
    this.x     = x;
    this.y     = y;
    this.vx    = (Math.random() < 0.5 ? 1 : -1) * (35 + Math.random() * 45);
    this.vy    = (Math.random() - 0.5) * 30;
    this.maxTimer = WANDER_TIMER[data.rarity];
    this.timer = this.maxTimer;
    this.state = 'wandering'; // wandering | caught | escaped
    this._dir  = 0;
    this._anim = 0;
    this._catchT = 0;
    this._escapeT = 0;
    loadSprite(data.id);
  }

  hitTest(mx, my) {
    if (this.state !== 'wandering') return false;
    return Math.hypot(mx - this.x, my - this.y) < 34;
  }

  catch() { this.state = 'caught'; }

  update(dt) {
    this._anim += dt;
    if (this.state === 'wandering') {
      this.timer -= dt;
      this._dir   -= dt;
      if (this._dir <= 0) {
        this._dir = 1 + Math.random() * 2;
        this.vx = (Math.random() < 0.5 ? 1 : -1) * (35 + Math.random() * 55);
        this.vy = (Math.random() - 0.5) * 40;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < 60)           { this.x = 60;           this.vx =  Math.abs(this.vx); }
      if (this.x > CANVAS_W - 60){ this.x = CANVAS_W - 60; this.vx = -Math.abs(this.vx); }
      if (this.y < 60)           { this.y = 60;            this.vy =  Math.abs(this.vy); }
      if (this.y > GROUND_Y - 50){ this.y = GROUND_Y - 50; this.vy = -Math.abs(this.vy); }
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
    if (this.state === 'caught') {
      const t = this._catchT;
      ctx.globalAlpha = Math.max(0, 1 - t * 1.8);
      ctx.translate(this.x, this.y - t * 80);
      ctx.scale(1 + t * 0.6, 1 + t * 0.6);
    } else if (this.state === 'escaped') {
      ctx.globalAlpha = Math.max(0, 1 - this._escapeT * 2.5);
      ctx.translate(this.x, this.y);
      // puff of smoke particles drawn via opacity only
    } else {
      const bob = Math.sin(this._anim * 3.5) * 2.5;
      ctx.translate(this.x, this.y + bob);

      // Timer ring
      const frac = this.timer / this.maxTimer;
      const ringR = sz / 2 + 10;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.strokeStyle = frac > 0.5 ? '#2ecc71' : frac > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Sprite or colour-coded placeholder
    if (sprite) {
      ctx.drawImage(sprite, -sz / 2, -sz / 2, sz, sz);
    } else {
      const fill = this.data.rarity === 'legendary' ? '#f39c12'
                 : this.data.rarity === 'rare'      ? '#9b59b6' : '#3498db';
      ctx.beginPath(); ctx.arc(0, 0, sz / 2, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px "Courier New",monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`#${this.data.id}`, 0, 0);
    }

    // Name tag (only while wandering)
    if (this.state === 'wandering') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      const nw = this.data.name.length * 7 + 10;
      ctx.fillRect(-nw / 2, sz / 2 + 3, nw, 15);
      ctx.fillStyle = '#fff';
      ctx.font = '10px "Courier New",monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.data.name, 0, sz / 2 + 10);
    }

    ctx.restore();
  }
}

// ── MasterBall ───────────────────────────────────────────────────────────────
class MasterBall {
  constructor(target) {
    this.startX = CANVAS_W / 2;
    this.startY = CANVAS_H - 20;
    this.x      = this.startX;
    this.y      = this.startY;
    this.target = target;
    this.progress = 0;
    this.done  = false;
    this.dead  = false;
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

    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0);
    ctx.fillStyle = '#7d3c98'; ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ccc'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('M', 0, -4);

    ctx.restore();
  }
}

// ── Game ─────────────────────────────────────────────────────────────────────
export class Game {
  constructor(canvas, onCatch) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.onCatch  = onCatch; // callback(id) for Pokédex UI updates
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    this._init();

    canvas.addEventListener('click', e => {
      const rect   = canvas.getBoundingClientRect();
      const sx = CANVAS_W / rect.width;
      const sy = CANVAS_H / rect.height;
      this._click((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
    });
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const rect  = canvas.getBoundingClientRect();
      const sx = CANVAS_W / rect.width;
      const sy = CANVAS_H / rect.height;
      const t = e.touches[0];
      this._click((t.clientX - rect.left) * sx, (t.clientY - rect.top) * sy);
    }, { passive: false });
  }

  _init() {
    this.presents    = [];
    this.wildPokemon = [];
    this.masterBalls = [];
    this.particles   = [];
    this.ballCount   = 10;
    this.caught      = new Set();
    this.totalCatches = 0;
    this._nextBallBonus = 10;
    this._timers     = { normal: 0, fancy: 0, legendary: 0 };
    this._regenTimer = 0;
    this._animTimer  = 0;
    this._msg        = null;
    this._state      = 'playing';
    this._spawnPresent('normal');
  }

  _spawnPresent(type) {
    const m = 80;
    this.presents.push(new Present(type, m + Math.random() * (CANVAS_W - m * 2)));
  }

  _click(mx, my) {
    if (this._state === 'win') { this._init(); return; }

    // Wild Pokemon have priority (timer is running)
    for (const wp of this.wildPokemon) {
      if (wp.state === 'wandering' && wp.hitTest(mx, my)) {
        if (this.ballCount <= 0) {
          this._showMsg('No balls! Wait for one to regenerate.', '#e74c3c');
          return;
        }
        if (this.masterBalls.some(b => b.target === wp)) return; // already throwing
        this.ballCount--;
        this.masterBalls.push(new MasterBall(wp));
        this._updateHUD();
        return;
      }
    }

    // Presents
    for (const p of this.presents) {
      if (p.hitTest(mx, my)) {
        if (p.open()) {
          const data = pickPokemon(p.type);
          this.wildPokemon.push(new WildPokemon(data, p.x, GROUND_Y - 100));
        }
        return;
      }
    }
  }

  _showMsg(text, color = '#fff') {
    this._msg = { text, color, timer: 2.5 };
  }

  _updateHUD() {
    const b = document.getElementById('ball-count');
    if (b) b.textContent = this.ballCount;
    const c = document.getElementById('caught-count');
    if (c) c.textContent = `${this.caught.size} / 151`;
  }

  _catch(wp) {
    const { id, name, rarity } = wp.data;
    const alreadyHad = this.caught.has(id);
    this.caught.add(id);
    this.totalCatches++;

    if (alreadyHad) {
      this._showMsg(`${name} again! Ball saved.`, '#e67e22');
      this.ballCount++; // refund
    } else {
      const col = rarity === 'legendary' ? '#f39c12' : rarity === 'rare' ? '#c39bd3' : '#2ecc71';
      this._showMsg(`${name} caught!`, col);
      this._addSparkles(wp.x, wp.y, rarity);
      this.onCatch(id);
      if (this.totalCatches >= this._nextBallBonus) {
        this._nextBallBonus += 10;
        this.ballCount++;
        this._showMsg(`${name} caught! Bonus ball!`, '#f1c40f');
      }
      if (this.caught.size >= 151) this._state = 'win';
    }
    wp.catch();
    this._updateHUD();
  }

  _addSparkles(x, y, rarity) {
    const n     = rarity === 'legendary' ? 22 : rarity === 'rare' ? 14 : 8;
    const color = rarity === 'legendary' ? [1, 0.85, 0.1] : rarity === 'rare' ? [0.7, 0.3, 1] : [0.2, 0.9, 0.4];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 110;
      const life = 0.4 + Math.random() * 0.5;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life, maxLife: life, size: 3 + Math.random() * 4, color });
    }
  }

  update(dt) {
    this._animTimer += dt;
    if (this._state !== 'playing') return;
    if (this._msg) { this._msg.timer -= dt; if (this._msg.timer <= 0) this._msg = null; }

    // Ball regen (1 every 30s, max 20)
    this._regenTimer += dt;
    if (this._regenTimer >= 30 && this.ballCount < 20) {
      this._regenTimer = 0;
      this.ballCount++;
      this._updateHUD();
    }

    // Spawn presents
    for (const type of ['normal', 'fancy', 'legendary']) {
      this._timers[type] += dt;
      if (this._timers[type] >= PRESENT_DEFS[type].spawnInterval &&
          this.presents.filter(p => p.state !== 'done').length < 10) {
        this._timers[type] = 0;
        this._spawnPresent(type);
      }
    }

    for (const p of this.presents)    p.update(dt);
    for (const wp of this.wildPokemon) wp.update(dt);

    for (const b of this.masterBalls) {
      b.update(dt);
      if (b.done && !b.dead) { b.dead = true; this._catch(b.target); }
    }

    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= dt;
    }

    this.presents    = this.presents.filter(p => p.state !== 'done');
    this.wildPokemon = this.wildPokemon.filter(wp => !wp.dead);
    this.masterBalls = this.masterBalls.filter(b => !b.dead);
    this.particles   = this.particles.filter(p => p.life > 0);
  }

  draw() {
    const ctx = this.ctx;
    const t   = this._animTimer;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#0d1b3e');
    sky.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

    // Stars
    for (const s of STARS) {
      const blink = 0.25 + 0.25 * Math.sin(t * 1.8 + s.x);
      ctx.fillStyle = `rgba(255,255,255,${blink})`;
      ctx.fillRect(s.x, s.y, 2, 2);
    }

    // Ground
    ctx.fillStyle = '#1e3a1e';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
    ctx.fillStyle = '#2d5a1e';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 18);
    ctx.fillStyle = '#3d7a28';
    for (let gx = 8; gx < CANVAS_W; gx += 28) ctx.fillRect(gx, GROUND_Y - 3, 14, 7);

    // Presents
    for (const p of this.presents) p.draw(ctx);

    // Particles
    for (const p of this.particles) {
      const a = p.life / p.maxLife;
      const [r, g, b] = p.color;
      ctx.fillStyle = `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})`;
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }

    // Wild Pokemon
    for (const wp of this.wildPokemon) wp.draw(ctx);

    // Master balls
    for (const b of this.masterBalls) b.draw(ctx);

    // HUD
    this._drawHUD(ctx);

    // Win
    if (this._state === 'win') this._drawWin(ctx);
  }

  _drawHUD(ctx) {
    // Ball pill
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.roundRect(8, 8, 150, 40, 8); ctx.fill();
    // Mini ball icon
    ctx.save(); ctx.translate(28, 28);
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 11, Math.PI, 0);   ctx.fillStyle='#7d3c98'; ctx.fill();
    ctx.strokeStyle='#555'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-11,0); ctx.lineTo(11,0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fillStyle='#bbb'; ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px "Courier New",monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`× ${this.ballCount}`, 46, 28);

    // Caught pill
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.roundRect(CANVAS_W/2 - 72, 8, 144, 40, 8); ctx.fill();
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 15px "Courier New",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${this.caught.size} / 151`, CANVAS_W/2, 28);

    // Message
    if (this._msg) {
      const a = Math.min(1, this._msg.timer);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath(); ctx.roundRect(CANVAS_W/2 - 170, GROUND_Y - 65, 340, 38, 8); ctx.fill();
      ctx.fillStyle = this._msg.color;
      ctx.font = 'bold 15px "Courier New",monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this._msg.text, CANVAS_W/2, GROUND_Y - 46);
      ctx.restore();
    }

    // Hint
    const hasLanded = this.presents.some(p => p.state === 'landed');
    const hasWild   = this.wildPokemon.some(w => w.state === 'wandering');
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '12px "Courier New",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (hasLanded && !hasWild)
      ctx.fillText('Click a present to open it!', CANVAS_W/2, CANVAS_H - 8);
    else if (hasWild)
      ctx.fillText('Click a Pokémon to throw a ball!', CANVAS_W/2, CANVAS_H - 8);
  }

  _drawWin(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 50px "Courier New",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GOTTA CATCH EM ALL!', CANVAS_W/2, CANVAS_H/2 - 44);
    ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 22px "Courier New",monospace';
    ctx.fillText('All 151 Pokémon caught!', CANVAS_W/2, CANVAS_H/2 + 10);
    ctx.fillStyle = '#fff'; ctx.font = '17px "Courier New",monospace';
    ctx.fillText('Tap to play again', CANVAS_W/2, CANVAS_H/2 + 52);
  }
}
