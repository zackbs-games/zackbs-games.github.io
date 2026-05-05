// Grid: LANES rows x COLS columns
// Humans enter from col COLS-1, walk left toward col 0

export const LANES = 5;
export const COLS  = 9;

export class Grid {
  constructor(x, y, cellW, cellH) {
    this.originX = x;
    this.originY = y;
    this.cellW = cellW;
    this.cellH = cellH;
    // cells[lane][col] = Pokemon | null
    this.cells = Array.from({ length: LANES }, () => new Array(COLS).fill(null));
  }

  get totalWidth()  { return this.cellW * COLS; }
  get totalHeight() { return this.cellH * LANES; }

  cellCenter(col, lane) {
    return {
      x: this.originX + col * this.cellW + this.cellW / 2,
      y: this.originY + lane * this.cellH + this.cellH / 2,
    };
  }

  // Returns { col, lane } or null if outside placeable area (cols 0..COLS-2)
  hitTest(wx, wy) {
    const col  = Math.floor((wx - this.originX) / this.cellW);
    const lane = Math.floor((wy - this.originY) / this.cellH);
    if (col < 0 || col >= COLS - 1 || lane < 0 || lane >= LANES) return null;
    return { col, lane };
  }

  place(pokemon, col, lane) {
    if (this.cells[lane][col]) return false;
    const { x, y } = this.cellCenter(col, lane);
    pokemon.x = x;
    pokemon.y = y;
    pokemon.col = col;
    pokemon.lane = lane;
    this.cells[lane][col] = pokemon;
    return true;
  }

  // Removes pokemon from grid and returns it (does not mark dead)
  pickup(col, lane) {
    const pk = this.cells[lane][col];
    if (!pk) return null;
    this.cells[lane][col] = null;
    return pk;
  }

  remove(pokemon) {
    this.cells[pokemon.lane][pokemon.col] = null;
  }

  isEmpty(col, lane) {
    return this.cells[lane][col] === null;
  }

  at(col, lane) {
    return this.cells[lane]?.[col] ?? null;
  }

  spawnX() {
    return this.originX + this.totalWidth + 40;
  }

  laneY(lane) {
    return this.originY + lane * this.cellH + this.cellH / 2;
  }

  // highlightMode: null | 'place' | 'shovel' | 'merge'
  // mergeKey: baseKey to match for merge highlights
  draw(renderer, highlightMode, mergeKey) {
    for (let lane = 0; lane < LANES; lane++) {
      for (let col = 0; col < COLS - 1; col++) {
        const { x, y } = this.cellCenter(col, lane);
        const occupant = this.cells[lane][col];
        const even = (lane + col) % 2 === 0;
        const base = even ? 0.14 : 0.12;
        const gBase = even ? 0.20 : 0.17;

        let r = base, g = gBase, b = base * 0.7;

        if (highlightMode === 'place' && !occupant) {
          r = 0.1; g = 0.3; b = 0.1;
        } else if (highlightMode === 'shovel' && occupant) {
          r = 0.35; g = 0.08; b = 0.08;
        } else if (highlightMode === 'merge' && occupant) {
          if (occupant.baseKey === mergeKey && occupant.evolutionLevel < 2) {
            // Valid merge target — gold highlight
            r = 0.35; g = 0.30; b = 0.05;
          }
        }

        renderer.drawRect(x, y, this.cellW - 2, this.cellH - 2, r, g, b);
      }
    }

    // Right column (human spawn lane) — always dark red
    for (let lane = 0; lane < LANES; lane++) {
      const { x, y } = this.cellCenter(COLS - 1, lane);
      renderer.drawRect(x, y, this.cellW - 2, this.cellH - 2, 0.18, 0.08, 0.08);
    }
  }
}
