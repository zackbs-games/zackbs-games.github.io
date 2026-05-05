import { Grid, LANES } from './grid.js';
import { createPokemon, POKEMON_DEFS, EVOLUTION_NAMES } from './entities/Pokemon.js';
import { Berry } from './entities/Berry.js';
import { WaveManager } from './systems/WaveManager.js';
import { UI } from './systems/UI.js';
import { Input } from './input.js';
import { AudioManager } from './audio.js';

const CANVAS_W = 900;
const CANVAS_H = 600;
const CELL_W   = 80;
const CELL_H   = 88;
const GRID_X   = 90;
const GRID_Y   = 20;
const BERRY_INTERVAL = 9;

export const GameState = { MENU: 0, PLAYING: 1, WIN: 2, LOSE: 3 };

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;

    this.state = GameState.MENU;
    this.berries = 125;
    this._berryDropTimer = BERRY_INTERVAL;

    this.grid  = new Grid(GRID_X, GRID_Y, CELL_W, CELL_H);
    this.ui    = new UI(CANVAS_W, CANVAS_H);
    this.input = new Input(canvas);

    this.pokemon      = [];
    this.humans       = [];
    this.projectiles  = [];
    this.berryPickups = [];
    this.particles    = [];

    // Pick-up state: { pokemon } when a grid pokemon is being held
    this.pickedUp = null;

    this.waves = new WaveManager(this.grid);
    this.waves.onSpawn = h => this.humans.push(h);
    this.waves.startCountdown(8);

    this.denMaxHp    = 5;
    this.denHp       = 5;
    this._denFlash   = 0;
    this.time = 0;

    this.audio = new AudioManager();

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') this._cancelPickup();
      if (e.key === 'm' || e.key === 'M') this.audio.toggleMute();
    });
  }

  update(dt) {
    this.time += dt;

    if (this.state === GameState.MENU) { this.state = GameState.PLAYING; return; }

    // Process clicks in all non-menu states (handles win/lose restart)
    for (const click of this.input.drainClicks()) {
      this._handleClick(click.x, click.y);
    }

    if (this.state !== GameState.PLAYING) return;

    // Sky berry drip
    this._berryDropTimer -= dt;
    if (this._berryDropTimer <= 0) {
      this._berryDropTimer = BERRY_INTERVAL;
      const col  = Math.floor(Math.random() * 8);
      const lane = Math.floor(Math.random() * LANES);
      const { x, y } = this.grid.cellCenter(col, lane);
      this.berryPickups.push(new Berry(x, y - 30));
    }

    const livingHumans = this.humans.filter(h => !h.dead).length;
    this.waves.update(dt, livingHumans);

    for (const b of this.berryPickups) b.update(dt);

    // Update pokemon (skip the one being held)
    const newProjectiles = [];
    for (const p of this.pokemon) {
      if (p.dead || p === this.pickedUp?.pokemon) continue;
      const humansInLane = this.humans.filter(h => !h.dead && h.lane === p.lane);
      const proj = p.update(dt, humansInLane);
      if (proj) { proj.lane = p.lane; newProjectiles.push(proj); this.audio.shoot(proj.soundType); }
      if (p.pendingBerries.length) {
        this.berryPickups.push(...p.pendingBerries);
        p.pendingBerries.length = 0;
      }
    }

    for (const h of this.humans) {
      if (h.dead) continue;
      const pokemonInLane = this.pokemon.filter(p => !p.dead && p.lane === h.lane && p !== this.pickedUp?.pokemon);
      const proj = h.update(dt, pokemonInLane);
      if (proj) { proj.lane = h.lane; newProjectiles.push(proj); this.audio.pokeball(); }
    }

    this.projectiles.push(...newProjectiles);

    for (const p of this.projectiles) {
      if (p.dead) continue;
      p.update(dt);
      if (p.x < 0 || p.x > CANVAS_W) { p.dead = true; continue; }

      if (p.fromHuman) {
        for (const pk of this.pokemon) {
          if (!pk.dead && pk.lane === p.lane && pk !== this.pickedUp?.pokemon && p.overlaps(pk)) {
            pk.takeDamage(p.damage);
            p.dead = true;
            this._spawnHitParticle(p.x, p.y, [0.9, 0.2, 0.2]);
            this.audio.hitPokemon();
            break;
          }
        }
      } else {
        for (const h of this.humans) {
          if (!h.dead && h.lane === p.lane && p.overlaps(h)) {
            if (h.slowMultiplier > 0.6 && p.color[2] > 0.8) h.applySlow(0.4, 3);
            if (p.burnDps)        h.applyBurn(p.burnDps, p.burnDuration);
            if (p.confuseDuration) h.applyConfuse(p.confuseDuration);
            h.takeDamage(p.damage);
            p.dead = true;
            const hitColor = p.burnDps ? [1.0, 0.4, 0.0] : p.confuseDuration ? [0.7, 0.2, 0.9] : [0.2, 0.9, 0.3];
            this._spawnHitParticle(p.x, p.y, hitColor);
            this.audio.hitHuman();
            break;
          }
        }
      }
    }

    // Humans reaching den
    this._denFlash = Math.max(0, this._denFlash - dt);
    const denX = GRID_X - 10;
    for (const h of this.humans) {
      if (!h.dead && h.x < denX) {
        h.dead = true;
        this.denHp -= 1;
        this._denFlash = 0.4;
        this._spawnHitParticle(50, this.grid.laneY(h.lane), [1, 0.2, 0.2]);
        this.audio.denHit();
        if (this.denHp <= 0) {
          this.denHp = 0;
          this.state = GameState.LOSE;
        }
      }
    }

    if (this.waves.allWavesDone && livingHumans === 0) this.state = GameState.WIN;

    // Cull dead
    this.pokemon      = this.pokemon.filter(p => !p.dead);
    this.humans       = this.humans.filter(h => !h.dead);
    this.projectiles  = this.projectiles.filter(p => !p.dead);
    this.berryPickups = this.berryPickups.filter(b => !b.collected);

    for (let lane = 0; lane < LANES; lane++) {
      for (let col = 0; col < this.grid.cells[lane].length; col++) {
        const p = this.grid.cells[lane][col];
        if (p && p.dead) this.grid.cells[lane][col] = null;
      }
    }

    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  // ── Click handling ───────────────────────────────────────────────────────────

  _handleClick(wx, wy) {
    if (this.state !== GameState.PLAYING) {
      if (this.state === GameState.WIN || this.state === GameState.LOSE) this._reset();
      return;
    }

    this.audio.resume();   // unlock AudioContext on first gesture

    // Berry pickup first (works in all non-menu modes)
    for (const b of this.berryPickups) {
      if (!b.collected && Math.abs(wx - b.x) < b.w && Math.abs(wy - b.y) < b.h) {
        b.collected = true;
        this.berries += b.value;
        this.audio.berry();
        return;
      }
    }

    // Shovel button toggle
    if (this.ui.hitTestShovel(wx, wy)) {
      this._cancelPickup();           // drop held pokemon back
      this.ui.selectedCard = null;
      this.ui.shoveling = !this.ui.shoveling;
      return;
    }

    // Shovel mode: click occupied cell → sell
    if (this.ui.shoveling) {
      const cell = this.grid.hitTest(wx, wy);
      if (cell) {
        const pk = this.grid.at(cell.col, cell.lane);
        if (pk) {
          this._sellPokemon(pk, cell.col, cell.lane);
          return;
        }
      }
      // Click outside grid — exit shovel mode
      this.ui.shoveling = false;
      return;
    }

    // ── Pickup mode (holding a grid pokemon) ────────────────────────────────
    if (this.pickedUp) {
      const cell = this.grid.hitTest(wx, wy);

      if (cell) {
        const occupant = this.grid.at(cell.col, cell.lane);
        const held = this.pickedUp.pokemon;

        if (occupant && occupant !== held) {
          // Same type + same tier + tier < 2 → merge
          if (occupant.baseKey === held.baseKey && occupant.evolutionLevel === held.evolutionLevel && held.evolutionLevel < 2) {
            this._mergePokemon(held, occupant, cell.col, cell.lane);
            return;
          }
          // Different type or max tier — can't place; put it back
          this._putPickedUpBack();
          return;
        }

        if (!occupant) {
          // Move to empty cell
          this.grid.place(held, cell.col, cell.lane);
          this.pickedUp = null;
          return;
        }
      }

      // Clicked outside grid — put back
      this._putPickedUpBack();
      return;
    }

    // ── Card selection ───────────────────────────────────────────────────────
    const card = this.ui.hitTestCards(wx, wy);
    if (card) {
      this.ui.selectedCard = this.ui.selectedCard?.key === card.key ? null : card;
      return;
    }

    // ── Place from card ──────────────────────────────────────────────────────
    if (this.ui.selectedCard) {
      const cell = this.grid.hitTest(wx, wy);
      if (cell && this.grid.isEmpty(cell.col, cell.lane)) {
        const def = POKEMON_DEFS[this.ui.selectedCard.key];
        if (this.berries >= def.cost) {
          const pk = createPokemon(this.ui.selectedCard.key, 0, 0);
          if (this.grid.place(pk, cell.col, cell.lane)) {
            this.pokemon.push(pk);
            this.berries -= def.cost;
            this.ui.selectedCard = null;
            this.audio.place();
          }
        }
      }
      return;
    }

    // ── Pick up existing grid pokemon ────────────────────────────────────────
    const cell = this.grid.hitTest(wx, wy);
    if (cell) {
      const pk = this.grid.pickup(cell.col, cell.lane);
      if (pk) {
        this.pickedUp = { pokemon: pk, fromCol: cell.col, fromLane: cell.lane };
      }
    }
  }

  // ── Merge ────────────────────────────────────────────────────────────────────

  _mergePokemon(held, target, col, lane) {
    // Remove both from game lists and grid
    target.dead = true;
    this.grid.cells[lane][col] = null;

    held.dead = true;
    this.pickedUp = null;

    // Create evolved pokemon at target cell
    const evolved = held.evolve();
    if (evolved) {
      this.pokemon.push(evolved);
      this.grid.place(evolved, col, lane);

      // Flash particle burst — gold
      this._spawnMergeParticle(evolved.x, evolved.y);
      this.audio.evolve();
      const names = EVOLUTION_NAMES[held.baseKey];
      this._spawnBanner(`${names[held.evolutionLevel]} evolved into ${names[evolved.evolutionLevel]}!`);
    }
  }

  // ── Sell ─────────────────────────────────────────────────────────────────────

  _sellPokemon(pk, col, lane) {
    const refund = pk.sellValue;
    this.grid.pickup(col, lane);
    pk.dead = true;
    this.berries += refund;
    this.audio.sell();
    this._spawnHitParticle(pk.x, pk.y, [0.5, 0.9, 0.5]);
    this._spawnBanner(`Sold ${pk.name} for ${refund} 🍓`);
  }

  // ── Pick-up helpers ──────────────────────────────────────────────────────────

  _putPickedUpBack() {
    if (!this.pickedUp) return;
    const { pokemon, fromCol, fromLane } = this.pickedUp;
    // Only put back if cell is still empty (could have been filled by another action)
    if (this.grid.isEmpty(fromCol, fromLane)) {
      this.grid.place(pokemon, fromCol, fromLane);
    } else {
      pokemon.dead = true; // drop it (shouldn't happen normally)
    }
    this.pickedUp = null;
  }

  _cancelPickup() {
    this._putPickedUpBack();
    this.ui.shoveling = false;
  }

  // ── Misc helpers ─────────────────────────────────────────────────────────────

  _spawnBanner(text) {
    this.waves.bannerText = text;
    this.waves.bannerTimer = 3;
  }

  _spawnHitParticle(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color,
        size: 4 + Math.random() * 6,
      });
    }
  }

  _spawnMergeParticle(x, y) {
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        color: [1.0, 0.85, 0.1],
        size: 6 + Math.random() * 8,
      });
    }
  }

  _reset() {
    this.berries = 125;
    this._berryDropTimer = BERRY_INTERVAL;
    this.pokemon.length = 0;
    this.humans.length = 0;
    this.projectiles.length = 0;
    this.berryPickups.length = 0;
    this.particles.length = 0;
    this.pickedUp  = null;
    this.denHp     = this.denMaxHp;  // denMaxHp stays at 5
    this._denFlash = 0;
    this.grid = new Grid(GRID_X, GRID_Y, CELL_W, CELL_H);
    this.ui.selectedCard = null;
    this.ui.shoveling = false;
    this.waves = new WaveManager(this.grid);
    this.waves.onSpawn = h => this.humans.push(h);
    this.waves.startCountdown(8);
    this.state = GameState.PLAYING;
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  draw(renderer) {
    renderer.beginFrame(this.time);
    if (this.state !== GameState.MENU) this._drawWorld(renderer);
    renderer.endFrame();
  }

  _drawWorld(renderer) {
    // Den strip background
    const flashAmt = this._denFlash > 0 ? Math.min(1, this._denFlash * 3) : 0;
    renderer.drawRect(45, CANVAS_H / 2, 90, CANVAS_H,
      0.1 + flashAmt * 0.5, 0.12 * (1 - flashAmt), 0.22 * (1 - flashAmt));
    // Den sign
    renderer.drawRect(45, CANVAS_H / 2 - 60, 70, 30, 0.15, 0.18, 0.35);

    // Den health bar — vertical bar on the right edge of the den strip
    const barH    = CANVAS_H - 20;
    const barW    = 14;
    const barX    = 84;          // right edge of den strip
    const barTopY = 10;
    // Background track
    renderer.drawRect(barX, barTopY + barH / 2, barW, barH, 0.25, 0.05, 0.05);
    // Filled portion (shrinks from top as HP is lost)
    const pct = this.denHp / this.denMaxHp;
    const fillH = barH * pct;
    const fillY = barTopY + barH - fillH / 2;  // anchored to bottom
    // Colour: green → yellow → red
    const gr = pct < 0.5 ? 1.0 : 2 * (1 - pct);
    const gg = pct > 0.5 ? 1.0 : 2 * pct;
    renderer.drawRect(barX, fillY, barW - 2, fillH, gr, gg, 0.05);

    // Determine grid highlight mode
    let highlightMode = null;
    let mergeKey = null;
    if (this.ui.shoveling) {
      highlightMode = 'shovel';
    } else if (this.pickedUp) {
      highlightMode = 'merge';
      mergeKey = this.pickedUp.pokemon.baseKey;
    } else if (this.ui.selectedCard) {
      highlightMode = 'place';
    }

    this.grid.draw(renderer, highlightMode, mergeKey);

    for (const p of this.pokemon) {
      if (p === this.pickedUp?.pokemon) continue;
      p.draw(renderer);
    }

    for (const h of this.humans) h.draw(renderer);
    for (const p of this.projectiles) p.draw(renderer);

    for (const b of this.berryPickups) b.draw(renderer);

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const [r, g, b] = p.color;
      renderer.drawRect(p.x, p.y, p.size, p.size, r, g, b, alpha);
    }

    // Ghost of held pokemon follows cursor
    if (this.pickedUp) {
      const pk = this.pickedUp.pokemon;
      const mx = this.input.mouseX;
      const my = this.input.mouseY;
      pk.x = mx;
      pk.y = my;
      pk.draw(renderer, 0.65);
    }

    this.ui.draw(renderer, this.berries, this.waves);
    this._drawOverlayData(renderer);
  }

  _drawOverlayData(renderer) {
    if (this.waves.countingDown) {
      renderer.drawRect(CANVAS_W - 120, 24, 200, 32, 0.1, 0.1, 0.2, 0.85);
    }
    if (this.state === GameState.WIN || this.state === GameState.LOSE) {
      renderer.drawRect(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0, 0, 0, 0.55);
      const bc = this.state === GameState.WIN ? [0.1, 0.4, 0.1] : [0.4, 0.05, 0.05];
      renderer.drawRect(CANVAS_W / 2, CANVAS_H / 2, 340, 120, ...bc, 0.9);
    }
  }

  // ── Text overlay items ───────────────────────────────────────────────────────

  getTextItems() {
    const items = [];

    items.push({ x: CANVAS_W - 80, y: CANVAS_H - 50, text: `🍓 ${this.berries}`, size: 18, color: '#f8c8e8', center: true });

    for (const card of this.ui.cards) {
      const canAfford = this.berries >= card.def.cost;
      items.push({ x: card.x, y: card.y + 32, text: `${card.def.cost}`, size: 12, color: canAfford ? '#ffd700' : '#888', center: true });
      items.push({ x: card.x, y: card.y + 44, text: card.def.name, size: 10, color: '#ccc', center: true });
    }

    // Shovel label
    items.push({ x: this.ui.shovelBtn.x, y: this.ui.shovelBtn.y + 32, text: 'SELL', size: 11, color: this.ui.shoveling ? '#ff9944' : '#aa6633', center: true });

    if (this.waves.countingDown) {
      const secs = Math.ceil(this.waves.waveCountdown);
      items.push({ x: CANVAS_W - 120, y: 28, text: `Next wave: ${secs}s`, size: 14, color: '#aacfff', center: true });
    } else if (this.waves.waveActive) {
      items.push({ x: CANVAS_W - 120, y: 28, text: `Wave ${this.waves.waveIndex + 1} / ${this.waves.totalWaves}`, size: 14, color: '#ffcc44', center: true });
    }

    if (this.waves.bannerTimer > 0) {
      items.push({ x: CANVAS_W / 2, y: CANVAS_H / 2 - 58, text: this.waves.bannerText, size: 20, color: '#ffe066', center: true });
    }

    if (this.state === GameState.WIN) {
      items.push({ x: CANVAS_W / 2, y: CANVAS_H / 2 - 20, text: 'YOU WIN!',           size: 36, color: '#66ff88', center: true });
      items.push({ x: CANVAS_W / 2, y: CANVAS_H / 2 + 24, text: 'Click to play again', size: 18, color: '#aaffcc', center: true });
    } else if (this.state === GameState.LOSE) {
      items.push({ x: CANVAS_W / 2, y: CANVAS_H / 2 - 20, text: 'CAPTURED!',           size: 36, color: '#ff5555', center: true });
      items.push({ x: CANVAS_W / 2, y: CANVAS_H / 2 + 24, text: 'Click to try again',   size: 18, color: '#ffaaaa', center: true });
    }

    items.push({ x: 45, y: CANVAS_H / 2 - 56, text: 'DEN', size: 12, color: '#8899cc', center: true });
    items.push({ x: 84, y: 12, text: `${this.denHp}`, size: 11, color: '#ffffff', center: true });
    items.push({ x: 16, y: 16, text: this.audio.muted ? '🔇' : '🔊', size: 14, color: '#aaa', center: true });

    // Context tip at top
    if (this.pickedUp) {
      const pk = this.pickedUp.pokemon;
      items.push({ x: CANVAS_W / 2, y: 16, text: `Holding ${pk.name} — drop on same type to evolve, empty cell to move, Esc to cancel`, size: 12, color: '#ffe', center: true });
    } else if (this.ui.shoveling) {
      items.push({ x: CANVAS_W / 2, y: 16, text: 'SELL MODE — click a Pokemon to sell it for berries', size: 13, color: '#ff9944', center: true });
    } else if (this.ui.selectedCard) {
      items.push({ x: CANVAS_W / 2, y: 16, text: `Place ${this.ui.selectedCard.def.name} — ${this.ui.selectedCard.def.tooltip}`, size: 13, color: '#ffe', center: true });
    }

    return items;
  }
}
