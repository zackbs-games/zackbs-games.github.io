import { POKEMON_DEFS } from '../entities/Pokemon.js';

const CARD_KEYS = ['oddish', 'bulbasaur', 'squirtle', 'snorlax', 'jolteon', 'geodude', 'charmander', 'psyduck'];
const CARD_W = 62;
const CARD_H = 80;
const CARD_PAD = 5;

export class UI {
  constructor(canvasWidth, canvasHeight) {
    this.cw = canvasWidth;
    this.ch = canvasHeight;

    this.cards = CARD_KEYS.map((key, i) => ({
      key,
      def: POKEMON_DEFS[key],
      x: 10 + i * (CARD_W + CARD_PAD) + CARD_W / 2,
      y: canvasHeight - CARD_H / 2 - 8,
      w: CARD_W,
      h: CARD_H,
    }));

    // Shovel button — placed after the last card
    const lastCard = this.cards[this.cards.length - 1];
    this.shovelBtn = {
      x: lastCard.x + CARD_W / 2 + CARD_PAD + 36,
      y: canvasHeight - CARD_H / 2 - 8,
      w: 56,
      h: CARD_H,
    };

    this.selectedCard = null;
    this.shoveling    = false;
  }

  hitTestCards(wx, wy) {
    for (const card of this.cards) {
      if (Math.abs(wx - card.x) < card.w / 2 && Math.abs(wy - card.y) < card.h / 2) {
        return card;
      }
    }
    return null;
  }

  hitTestShovel(wx, wy) {
    const b = this.shovelBtn;
    return Math.abs(wx - b.x) < b.w / 2 && Math.abs(wy - b.y) < b.h / 2;
  }

  draw(renderer, berries, waveManager) {
    // HUD bar background
    renderer.drawRect(this.cw / 2, this.ch - CARD_H / 2 - 8, this.cw, CARD_H + 16, 0.08, 0.08, 0.14);

    // Berry counter background
    renderer.drawRect(this.cw - 80, this.ch - CARD_H / 2 - 8, 120, CARD_H - 10, 0.12, 0.12, 0.2);

    // Pokemon cards
    for (const card of this.cards) {
      const def = card.def;
      const canAfford = berries >= def.cost;
      const selected  = this.selectedCard?.key === card.key;
      const [r, g, b] = def.color;

      const bg = selected ? 0.35 : canAfford ? 0.18 : 0.1;
      renderer.drawRect(card.x, card.y, card.w, card.h, bg, bg * 1.1, bg * 1.3);

      if (selected) {
        renderer.drawRect(card.x, card.y, card.w + 4, card.h + 4, 1.0, 0.9, 0.1, 0.6);
      } else if (canAfford) {
        renderer.drawRect(card.x, card.y, card.w + 2, card.h + 2, r * 0.7, g * 0.7, b * 0.7, 0.5);
      }

      const dim = canAfford ? 1 : 0.4;
      renderer.drawRect(card.x, card.y - 10, 32, 32, r * dim, g * dim, b * dim);
      renderer.drawRect(card.x - 6, card.y - 14, 6, 6, dim, dim, dim);
      renderer.drawRect(card.x + 6, card.y - 14, 6, 6, dim, dim, dim);
    }

    // Shovel button
    this._drawShovel(renderer);

    // Wave info
    this._drawWaveInfo(renderer, waveManager);
  }

  _drawShovel(renderer) {
    const b = this.shovelBtn;
    const bg = this.shoveling ? 0.5 : 0.18;
    renderer.drawRect(b.x, b.y, b.w, b.h, bg * 1.2, bg * 0.6, bg * 0.3);
    if (this.shoveling) {
      // Active border — orange
      renderer.drawRect(b.x, b.y, b.w + 4, b.h + 4, 1.0, 0.6, 0.1, 0.8);
    }
    // Shovel icon — handle
    renderer.drawRect(b.x + 4, b.y - 5, 6, 28, 0.6, 0.4, 0.2);
    // Shovel blade
    renderer.drawRect(b.x + 4, b.y + 12, 18, 12, 0.75, 0.75, 0.8);
  }

  _drawWaveInfo(renderer, wm) {
    renderer.drawRect(this.cw - 70, 24, 120, 36, 0.08, 0.08, 0.18, 0.8);

    if (wm.bannerTimer > 0) {
      const alpha = Math.min(1, wm.bannerTimer);
      renderer.drawRect(this.cw / 2, this.ch / 2 - 60, 420, 60, 0.05, 0.05, 0.15, alpha * 0.85);
    }
  }

  get hudTop() { return this.ch - CARD_H - 16; }
}
