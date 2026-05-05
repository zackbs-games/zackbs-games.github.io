import { Entity } from './Entity.js';
import { makeRazorLeaf, makeWaterGun, makeThunder, makeRock, makeEmber, makeConfuse } from './Projectile.js';
import { Berry } from './Berry.js';

// Set by main.js after atlas is loaded
let _spriteUVs = null;
export function setSpriteUVs(uvMap) { _spriteUVs = uvMap; }

// ── Evolution names per base key ─────────────────────────────────────────────

export const EVOLUTION_NAMES = {
  oddish:     ['Oddish',     'Gloom',      'Vileplume'],
  bulbasaur:  ['Bulbasaur',  'Ivysaur',    'Venusaur'],
  squirtle:   ['Squirtle',   'Wartortle',  'Blastoise'],
  snorlax:    ['Snorlax',    'Snorlax+',   'Mega Snorlax'],
  jolteon:    ['Jolteon',    'Jolteon+',   'Jolteon++'],
  geodude:    ['Geodude',    'Graveler',   'Golem'],
  charmander: ['Charmander', 'Charmeleon', 'Charizard'],
  psyduck:    ['Psyduck',    'Golduck',    'Golduck+'],
};

// Stat multipliers applied at each tier relative to base
const TIER_HP          = [1,   2.0,  4.0];
const TIER_DMG         = [1,   1.8,  3.2];
const TIER_RATE_MULT   = [1,   0.72, 0.52]; // lower = faster attack
const TIER_GEN_MULT    = [1,   0.55, 0.32]; // lower = faster generation
const TIER_SIZE_BONUS  = [0,   7,    14];    // extra px per tier
const TIER_COLOR_BOOST = [0,   0.15, 0.28];  // color brightness boost

// ── Pokemon class ─────────────────────────────────────────────────────────────

export class Pokemon extends Entity {
  constructor(x, y, def, evolutionLevel = 0) {
    const tier = evolutionLevel;
    const sizeBonus = TIER_SIZE_BONUS[tier];
    super(x, y, (def.w || 52) + sizeBonus, (def.h || 52) + sizeBonus);

    this.baseKey       = def.baseKey;
    this.evolutionLevel = tier;
    this.name          = EVOLUTION_NAMES[def.baseKey]?.[tier] ?? def.name;
    this.baseCost      = def.cost;

    // Scale HP
    const hpScale = TIER_HP[tier];
    this.hp    = Math.round(def.hp * hpScale);
    this.maxHp = this.hp;

    // Brighten color per tier
    const boost = TIER_COLOR_BOOST[tier];
    this.color       = def.color.map(c => Math.min(1, c + boost));
    this.accentColor = (def.accent || def.color).map(c => Math.min(1, c + boost));

    // Attack / generation
    this.attackCooldown  = 0;
    this.attackRate      = (def.attackRate || 1.5) * TIER_RATE_MULT[tier];
    this.range           = def.range || 9999;
    this.isBlocker       = def.isBlocker || false;
    this.isGenerator     = def.isGenerator || false;
    this.generatorTimer  = 0;
    this.generatorRate   = (def.generatorRate || 8) * TIER_GEN_MULT[tier];
    this.slowFactor      = def.slowFactor || 1;

    // Scale damage via projectile factory wrapper
    const dmgScale = TIER_DMG[tier];
    if (def.makeProjectile) {
      this.makeProjectile = (x, y) => {
        const p = def.makeProjectile(x, y);
        p.damage = Math.round(p.damage * dmgScale);
        return p;
      };
    } else {
      this.makeProjectile = null;
    }

    this.pendingBerries = [];
    this._animTimer     = 0;
    this._def           = def; // keep for evolve()
  }

  // Returns a new Pokemon at the next evolution tier, or null if max tier
  evolve() {
    if (this.evolutionLevel >= 2) return null;
    return new Pokemon(this.x, this.y, this._def, this.evolutionLevel + 1);
  }

  // Berry sell value (60% of total berries invested)
  get sellValue() {
    const totalInvested = this.baseCost * Math.pow(2, this.evolutionLevel);
    return Math.round(totalInvested * 0.6 / 25) * 25;
  }

  update(dt, humans) {
    this._animTimer += dt;
    this.attackCooldown -= dt;

    if (this.isGenerator) {
      this.generatorTimer -= dt;
      if (this.generatorTimer <= 0) {
        this.generatorTimer = this.generatorRate;
        const bx = this.x + (Math.random() - 0.5) * 30;
        const by = this.y - 40 - Math.random() * 20;
        this.pendingBerries.push(new Berry(bx, by));
      }
    }

    if (!this.isBlocker && !this.isGenerator && this.makeProjectile) {
      const target = this._nearestHuman(humans);
      if (target && this.attackCooldown <= 0) {
        this.attackCooldown = this.attackRate;
        return this.makeProjectile(this.right, this.y);
      }
    }
    return null;
  }

  _nearestHuman(humans) {
    let nearest = null;
    let minDist = this.range;
    for (const h of humans) {
      if (h.dead || h.lane !== this.lane) continue;
      const dist = h.x - this.x;
      if (dist > 0 && dist < minDist) { minDist = dist; nearest = h; }
    }
    return nearest;
  }

  draw(renderer, alpha = 1) {
    const bob = Math.sin(this._animTimer * 3) * 2;
    const uv  = _spriteUVs?.[this.baseKey]?.[this.evolutionLevel];

    if (uv) {
      // Real Pokémon sprite — size grows slightly with tier
      const sz = 80 + this.evolutionLevel * 8;
      renderer.drawSprite(
        this.x, this.y + bob,
        sz, sz,
        uv.uvX, uv.uvY, uv.uvW, uv.uvH,
        1, 1, 1, alpha, false,
      );
    } else {
      // Fallback: coloured rectangles
      const [r, g, b]     = this.color;
      const [ar, ag, ab]  = this.accentColor;
      renderer.drawRect(this.x, this.y + bob, this.w, this.h, r, g, b, alpha);
      renderer.drawRect(this.x - this.w * 0.18, this.y - this.h * 0.1 + bob, 8, 8, 1, 1, 1, alpha);
      renderer.drawRect(this.x + this.w * 0.18, this.y - this.h * 0.1 + bob, 8, 8, 1, 1, 1, alpha);
      renderer.drawRect(this.x - this.w * 0.18, this.y - this.h * 0.1 + bob, 4, 4, 0.05, 0.05, 0.05, alpha);
      renderer.drawRect(this.x + this.w * 0.18, this.y - this.h * 0.1 + bob, 4, 4, 0.05, 0.05, 0.05, alpha);
      renderer.drawRect(this.x, this.y + this.h * 0.15 + bob, this.w * 0.5, this.h * 0.3, ar, ag, ab, alpha);
    }

    // Tier stars above body
    if (this.evolutionLevel > 0) {
      for (let s = 0; s < this.evolutionLevel; s++) {
        const sx = this.x - (this.evolutionLevel - 1) * 7 + s * 14;
        renderer.drawRect(sx, this.y - this.h / 2 - 8 + bob, 9, 9, 1.0, 0.85, 0.1, alpha);
      }
    }

    this.drawHealthBar(renderer);
  }
}

// ── Pokemon base definitions ──────────────────────────────────────────────────

export const POKEMON_DEFS = {
  oddish: {
    baseKey: 'oddish',
    name: 'Oddish',
    cost: 50,
    hp: 60,
    color: [0.2, 0.2, 0.7],
    accent: [0.3, 0.8, 0.3],
    isGenerator: true,
    generatorRate: 7,
    tooltip: 'Generates Berries',
  },
  bulbasaur: {
    baseKey: 'bulbasaur',
    name: 'Bulbasaur',
    cost: 100,
    hp: 80,
    color: [0.3, 0.75, 0.35],
    accent: [0.15, 0.5, 0.2],
    attackRate: 0.9,
    makeProjectile: (x, y) => makeRazorLeaf(x, y),
    tooltip: 'Shoots Razor Leaf',
  },
  squirtle: {
    baseKey: 'squirtle',
    name: 'Squirtle',
    cost: 175,
    hp: 80,
    color: [0.3, 0.55, 0.9],
    accent: [0.6, 0.4, 0.2],
    attackRate: 1.1,
    makeProjectile: (x, y) => makeWaterGun(x, y),
    slowFactor: 0.5,
    tooltip: 'Water Gun — slows humans',
  },
  snorlax: {
    baseKey: 'snorlax',
    name: 'Snorlax',
    cost: 50,
    hp: 300,
    color: [0.45, 0.42, 0.6],
    accent: [0.8, 0.75, 0.85],
    isBlocker: true,
    w: 58, h: 62,
    tooltip: 'Blocks humans',
  },
  jolteon: {
    baseKey: 'jolteon',
    name: 'Jolteon',
    cost: 150,
    hp: 60,
    color: [0.95, 0.85, 0.15],
    accent: [0.6, 0.4, 0.05],
    attackRate: 0.5,
    makeProjectile: (x, y) => makeThunder(x, y),
    tooltip: 'Chain lightning',
  },
  geodude: {
    baseKey: 'geodude',
    name: 'Geodude',
    cost: 125,
    hp: 120,
    color: [0.58, 0.5, 0.42],
    accent: [0.4, 0.35, 0.28],
    attackRate: 1.4,
    makeProjectile: (x, y) => makeRock(x, y),
    w: 50, h: 50,
    tooltip: 'Rock throw — high damage',
  },
  charmander: {
    baseKey: 'charmander',
    name: 'Charmander',
    cost: 125,
    hp: 70,
    color: [0.95, 0.38, 0.08],
    accent: [1.0, 0.72, 0.05],
    attackRate: 1.0,
    makeProjectile: (x, y) => makeEmber(x, y),
    tooltip: 'Ember — burns humans over time',
  },
  psyduck: {
    baseKey: 'psyduck',
    name: 'Psyduck',
    cost: 150,
    hp: 65,
    color: [0.92, 0.78, 0.18],
    accent: [0.45, 0.65, 0.92],
    attackRate: 2.0,
    makeProjectile: (x, y) => makeConfuse(x, y),
    tooltip: 'Confusion — reverses human direction',
  },
};

export function createPokemon(key, x, y, tier = 0) {
  const def = POKEMON_DEFS[key];
  if (!def) throw new Error(`Unknown pokemon: ${key}`);
  return new Pokemon(x, y, def, tier);
}
