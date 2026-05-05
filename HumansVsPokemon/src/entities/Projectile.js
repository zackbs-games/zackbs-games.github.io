import { Entity } from './Entity.js';

export class Projectile extends Entity {
  constructor(x, y, vx, damage, color, size = 10) {
    super(x, y, size, size);
    this.vx = vx;
    this.damage = damage;
    this.color = color; // [r,g,b]
    this.fromHuman = vx < 0; // pokeballs go left, pokemon attacks go right
  }

  update(dt) {
    this.x += this.vx * dt;
    if (this._spin !== undefined) this._spin += dt * 8;
  }

  draw(renderer) {
    const [r, g, b] = this.color;
    if (this._spin !== undefined) {
      // Pokeball: red top half, white bottom half, black stripe
      renderer.drawRect(this.x, this.y - 3, this.w, this.h * 0.55, 0.95, 0.15, 0.15);
      renderer.drawRect(this.x, this.y + 4, this.w, this.h * 0.55, 0.95, 0.95, 0.95);
      renderer.drawRect(this.x, this.y,     this.w, 3,              0.05, 0.05, 0.05);
      renderer.drawRect(this.x, this.y,     5,      5,              0.9,  0.9,  0.9);
    } else {
      renderer.drawRect(this.x, this.y, this.w, this.h, r, g, b);
    }
  }
}

// Pokemon attacks
export function makeRazorLeaf(x, y) {
  const p = new Projectile(x, y, 300, 20, [0.2, 0.9, 0.2], 12);
  p.soundType = 'leaf'; return p;
}

export function makeWaterGun(x, y) {
  const p = new Projectile(x, y, 220, 15, [0.2, 0.5, 1.0], 14);
  p.soundType = 'water'; return p;
}

export function makeThunder(x, y) {
  const p = new Projectile(x, y, 400, 30, [1.0, 0.95, 0.2], 10);
  p.soundType = 'thunder'; return p;
}

export function makeRock(x, y) {
  const p = new Projectile(x, y, 200, 35, [0.6, 0.5, 0.4], 16);
  p.soundType = 'rock'; return p;
}

// Human attack (pokeball goes left — damage comes from the human's attackDamage)
export function makePokeball(x, y, damage = 25) {
  const p = new Projectile(x, y, -260, damage, [0.95, 0.2, 0.2], 13);
  p._spin = 0;
  p.soundType = 'pokeball';
  return p;
}

export function makeEmber(x, y) {
  const p = new Projectile(x, y, 280, 10, [1.0, 0.45, 0.05], 11);
  p.soundType  = 'ember';
  p.burnDps      = 8;
  p.burnDuration = 3.5;
  return p;
}

export function makeConfuse(x, y) {
  const p = new Projectile(x, y, 160, 5, [0.75, 0.2, 0.9], 18);
  p.soundType       = 'confuse';
  p.confuseDuration = 1.8;
  return p;
}
