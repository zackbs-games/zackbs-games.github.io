import { Entity } from './Entity.js';
import { makePokeball } from './Projectile.js';

export class Human extends Entity {
  constructor(x, y, def) {
    super(x, y, def.w || 40, def.h || 54);
    this.name         = def.name;
    this.hp           = def.hp;
    this.maxHp        = def.hp;
    this.speed        = def.speed;
    this.color        = def.color;
    this.accentColor  = def.accent || def.color;
    this.attackRate   = def.attackRate || 1.5;
    this.attackDamage = def.attackDamage || 25;
    this.attackCooldown = 0;
    this.blocked      = false;
    // Status effects
    this.slowMultiplier = 1;
    this.slowTimer      = 0;
    this.burnTimer          = 0;
    this.burnDps            = 0;
    this.confuseTimer       = 0;
    this.confuseImmunity    = 0;  // immune to re-confusion for this many seconds
    // Animation
    this._animTimer = Math.random() * Math.PI * 2;
    this._walkPhase = 0;
    this._throwAnim = 0;
  }

  update(dt, pokemonInLane) {
    this._animTimer += dt;
    this._throwAnim = Math.max(0, this._throwAnim - dt * 3);

    // Burn DoT
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.takeDamage(this.burnDps * dt);
      if (this.burnTimer <= 0) { this.burnTimer = 0; this.burnDps = 0; }
    }

    // Confusion immunity cooldown
    if (this.confuseImmunity > 0) this.confuseImmunity -= dt;

    // Confusion — walk backwards, no attacking
    if (this.confuseTimer > 0) {
      this.confuseTimer -= dt;
      this.blocked = false;
      this.x += this.speed * 0.5 * dt;
      this._walkPhase += dt * 4;
      if (this.confuseTimer <= 0) {
        this.confuseImmunity = 4;  // 4s immunity after confusion ends
      }
      return null;
    }

    // Slow
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowMultiplier = 1;
    }

    // Find nearest pokemon within one-cell attack range ahead (to the left)
    const ATTACK_RANGE = 90;
    const target = pokemonInLane
      .filter(p => !p.dead && p.right > this.left - ATTACK_RANGE && p.x < this.x)
      .sort((a, b) => b.x - a.x)[0];

    if (target) {
      this.blocked = true;
      this.attackCooldown -= dt;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.attackRate;
        this._throwAnim = 1;
        return makePokeball(this.x - this.w * 0.5, this.y, this.attackDamage);
      }
    } else {
      this.blocked = false;
      this.x -= this.speed * this.slowMultiplier * dt;
      this._walkPhase += dt * 6 * this.slowMultiplier;
    }
    return null;
  }

  applySlow(factor, duration) {
    this.slowMultiplier = factor;
    this.slowTimer = duration;
  }

  applyBurn(dps, duration) {
    this.burnDps   = dps;
    this.burnTimer = duration;
  }

  applyConfuse(duration) {
    if (this.confuseImmunity > 0) return;   // immune — ignore
    this.confuseTimer = duration;
    this.blocked = false;
  }

  draw(renderer) {
    const [r, g, b] = this.color;
    const [ar, ag, ab] = this.accentColor;
    const confused   = this.confuseTimer > 0;
    const walkBob    = this.blocked ? 0 : Math.sin(this._walkPhase) * 3;
    const legSwing   = this.blocked ? 0 : Math.sin(this._walkPhase) * 6;
    const throwRaise  = this._throwAnim * -14;
    const throwExtend = this._throwAnim * -10;

    // Confusion wobble — sway side-to-side on head
    const confuseWobble = confused ? Math.sin(this._animTimer * 9) * 5 : 0;

    // legs
    renderer.drawRect(this.x - 7, this.y + this.h * 0.35 + legSwing,  8, 18, r * 0.8, g * 0.8, b * 0.8);
    renderer.drawRect(this.x + 7, this.y + this.h * 0.35 - legSwing,  8, 18, r * 0.8, g * 0.8, b * 0.8);
    // body
    renderer.drawRect(this.x, this.y + walkBob, this.w, this.h * 0.55, r, g, b);
    // shirt stripe
    renderer.drawRect(this.x, this.y + this.h * 0.05 + walkBob, this.w * 0.7, this.h * 0.2, ar, ag, ab);
    // throw arm
    const armX = this.x - this.w * 0.5 + throwExtend;
    const armY = this.y + walkBob + throwRaise;
    renderer.drawRect(armX, armY, 9, 16, r * 0.85, g * 0.85, b * 0.85);
    // idle right arm
    renderer.drawRect(this.x + this.w * 0.5, this.y + walkBob, 9, 16, r * 0.85, g * 0.85, b * 0.85);
    // head (wobbles if confused)
    renderer.drawRect(this.x + confuseWobble, this.y - this.h * 0.3 + walkBob, this.w * 0.7, this.w * 0.65, 0.9, 0.72, 0.58);
    // hat
    renderer.drawRect(this.x + confuseWobble, this.y - this.h * 0.52 + walkBob, this.w * 0.75, 10, ar, ag, ab);
    // eyes
    renderer.drawRect(this.x - 6 + confuseWobble, this.y - this.h * 0.33 + walkBob, 5, 5, 0.1, 0.1, 0.5);
    renderer.drawRect(this.x + 6 + confuseWobble, this.y - this.h * 0.33 + walkBob, 5, 5, 0.1, 0.1, 0.5);
    // pokeball in hand
    if (this._throwAnim < 0.6) {
      renderer.drawRect(armX - 2, armY + 10, 12, 12, 0.9, 0.15, 0.15);
      renderer.drawRect(armX - 2, armY +  9, 12,  3, 0.9, 0.90, 0.90);
    }

    // Burn overlay — flickering orange glow
    if (this.burnTimer > 0) {
      const flicker = 0.3 + Math.abs(Math.sin(this._animTimer * 18)) * 0.45;
      renderer.drawRect(this.x, this.y + walkBob, this.w + 4, this.h * 0.7, 1.0, 0.35, 0.0, flicker);
      // flame tips above head
      renderer.drawRect(this.x - 6 + confuseWobble, this.y - this.h * 0.62 + walkBob, 8, 10, 1.0, 0.6, 0.0, flicker * 0.8);
      renderer.drawRect(this.x + 5 + confuseWobble, this.y - this.h * 0.58 + walkBob, 7,  8, 1.0, 0.8, 0.1, flicker * 0.7);
    }

    // Confuse swirls — purple stars orbiting head
    if (confused) {
      const t  = this._animTimer * 4;
      const or = 14;
      for (let i = 0; i < 3; i++) {
        const angle = t + (i / 3) * Math.PI * 2;
        const sx = this.x + Math.cos(angle) * or;
        const sy = this.y - this.h * 0.55 + Math.sin(angle) * 6;
        renderer.drawRect(sx, sy, 7, 7, 0.8, 0.2, 1.0, 0.9);
      }
    }

    this.drawHealthBar(renderer);
  }
}

// ── Human type definitions ────────────────────────────────────────────────────

const HUMAN_DEFS = {
  youngster: {
    name: 'Youngster',
    hp: 95, speed: 42,
    color: [0.85, 0.6, 0.2], accent: [0.3, 0.5, 0.9],
    attackRate: 1.8, attackDamage: 20,
  },
  bugCatcher: {
    name: 'Bug Catcher',
    hp: 140, speed: 32,
    color: [0.4, 0.7, 0.3], accent: [0.6, 0.4, 0.1],
    attackRate: 1.5, attackDamage: 25,
  },
  hiker: {
    name: 'Hiker',
    hp: 330, speed: 20,
    color: [0.5, 0.38, 0.3], accent: [0.8, 0.6, 0.3],
    attackRate: 2.0, attackDamage: 40,
    w: 48, h: 60,
  },
  swimmer: {
    name: 'Swimmer',
    hp: 82, speed: 70,
    color: [0.2, 0.55, 0.9], accent: [1.0, 0.8, 0.1],
    attackRate: 1.2, attackDamage: 17,
  },
  gymLeader: {
    name: 'Gym Leader',
    hp: 720, speed: 18,
    color: [0.6, 0.1, 0.7], accent: [1.0, 0.8, 0.0],
    attackRate: 1.0, attackDamage: 57,
    w: 52, h: 64,
  },
};

export function createHuman(key, x, y) {
  const def = HUMAN_DEFS[key];
  if (!def) throw new Error(`Unknown human type: ${key}`);
  return new Human(x, y, def);
}
