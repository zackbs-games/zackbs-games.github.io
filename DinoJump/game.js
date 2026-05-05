import { Dino } from './dino.js';
import {
  CANVAS_W, CANVAS_H, LEVEL_WIDTH,
  terrainHeightAt, OBSTACLES, makeFoodItems,
  drawSky, drawBackgroundHills, drawTerrain, drawObstacles, drawFood,
} from './level.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    this.ctx = canvas.getContext('2d');

    this._state       = 'playing';
    this.score        = 0;
    this.totalFood    = 0;
    this._lives       = 3;
    this._cameraX     = 0;
    this._restartDelay = 0;
    this._winTimer    = 0;
    this._dino        = null;
    this._food        = null;
    this._deathFlash  = 0;

    this._keys = {};
    this._init();

    window.addEventListener('keydown', e => {
      this._keys[e.code] = true;
      if (
        (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') &&
        this._state === 'playing'
      ) {
        this._dino.jump();
      }
      if (
        e.code === 'Space' &&
        this._state !== 'playing' &&
        this._restartDelay <= 0
      ) {
        this._init();
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => { this._keys[e.code] = false; });
  }

  _init() {
    this._dino        = new Dino();
    this._food        = makeFoodItems();
    this.totalFood    = this._food.length;
    this.score        = 0;
    this._cameraX     = 0;
    this._state       = 'playing';
    this._restartDelay = 0;
    this._winTimer    = 0;
    this._deathFlash  = 0;
  }

  update(dt) {
    if (this._state !== 'playing') {
      this._restartDelay = Math.max(0, this._restartDelay - dt);
      if (this._state === 'win') this._winTimer += dt;
      return;
    }

    if (this._deathFlash > 0) this._deathFlash -= dt;

    const right = this._keys['ArrowRight'] || this._keys['KeyD'] ? 1 : 0;
    const left  = this._keys['ArrowLeft']  || this._keys['KeyA'] ? 1 : 0;
    const dir   = right - left;

    const event = this._dino.update(dt, OBSTACLES, this._food, dir);

    if (this._dino.dead && this._state === 'playing') {
      this._lives--;
      this._state       = 'dead';
      this._restartDelay = 1.4;
      this._deathFlash  = 0.6;
    } else if (this._dino.won && this._state === 'playing') {
      this._state       = 'win';
      this._restartDelay = 2.0;
    } else if (event && event.type === 'food') {
      this.score++;
    }

    // Camera: keep dino ~300px from left, clamped to level bounds
    const target  = this._dino.x - 300;
    this._cameraX = Math.max(0, Math.min(target, LEVEL_WIDTH - CANVAS_W));
  }

  draw() {
    const ctx = this.ctx;
    const cam = this._cameraX;

    // Sky + parallax — screen coords, no camera offset
    drawSky(ctx);
    drawBackgroundHills(ctx, cam);

    // World-space drawing
    ctx.save();
    ctx.translate(-cam, 0);

    drawTerrain(ctx, cam);
    drawObstacles(ctx, cam);
    drawFood(ctx, this._food);
    this._dino.draw(ctx);

    // End-of-level flag pole
    const flagX    = LEVEL_WIDTH - 200;
    const flagBase = terrainHeightAt(flagX);
    ctx.strokeStyle = '#aaaaaa'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(flagX, flagBase); ctx.lineTo(flagX, flagBase - 90); ctx.stroke();
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(flagX,      flagBase - 90);
    ctx.lineTo(flagX + 32, flagBase - 75);
    ctx.lineTo(flagX,      flagBase - 60);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Death flash overlay
    if (this._deathFlash > 0) {
      ctx.fillStyle = `rgba(200,0,0,${Math.min(0.45, this._deathFlash * 0.7)})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Win overlay
    if (this._state === 'win') {
      ctx.fillStyle = 'rgba(0,40,0,0.52)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    this._drawHUD(ctx);
  }

  _drawHUD(ctx) {
    ctx.save();
    ctx.textBaseline = 'middle';

    // Score pill — top left
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(14, 14, 220, 38, 10); ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Food: ${this.score} / ${this.totalFood}`, 26, 33);

    // Lives — top right
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(CANVAS_W - 140, 14, 126, 38, 10); ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('♥'.repeat(Math.max(0, this._lives)), CANVAS_W - 20, 33);

    // Controls hint near start
    if (this._dino && this._dino.x < 600) {
      ctx.fillStyle = 'rgba(200,225,255,0.65)';
      ctx.font = '13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('← → / A D = move     SPACE / ↑ = jump (double-jump!)', CANVAS_W / 2, 24);
    }

    // Tar slow indicator
    if (this._dino && this._dino.slowTimer > 0) {
      ctx.fillStyle = 'rgba(120,70,10,0.75)';
      ctx.beginPath(); ctx.roundRect(CANVAS_W / 2 - 70, CANVAS_H - 44, 140, 30, 8); ctx.fill();
      ctx.fillStyle = '#d4a017';
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STUCK IN TAR!', CANVAS_W / 2, CANVAS_H - 29);
    }

    // Dead screen
    if (this._state === 'dead') {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff4455';
      ctx.font = 'bold 56px "Courier New", monospace';
      ctx.fillText('OUCH!', CANVAS_W / 2, CANVAS_H / 2 - 40);
      if (this._lives > 0) {
        ctx.fillStyle = '#ffcc44';
        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.fillText(
          `${this._lives} ${this._lives === 1 ? 'life' : 'lives'} left`,
          CANVAS_W / 2, CANVAS_H / 2 + 14
        );
        if (this._restartDelay <= 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = '18px "Courier New", monospace';
          ctx.fillText('Press SPACE to try again', CANVAS_W / 2, CANVAS_H / 2 + 52);
        }
      } else {
        ctx.fillStyle = '#ffcc44';
        ctx.font = 'bold 30px "Courier New", monospace';
        ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 + 14);
        if (this._restartDelay <= 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = '18px "Courier New", monospace';
          ctx.fillText('Press SPACE to restart', CANVAS_W / 2, CANVAS_H / 2 + 52);
        }
      }
    }

    // Win screen
    if (this._state === 'win') {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 60px "Courier New", monospace';
      ctx.fillText('YOU WIN!', CANVAS_W / 2, CANVAS_H / 2 - 50);
      ctx.fillStyle = '#a8f0a0';
      ctx.font = 'bold 22px "Courier New", monospace';
      ctx.fillText(`Food: ${this.score} / ${this.totalFood}`, CANVAS_W / 2, CANVAS_H / 2 + 12);
      if (this._restartDelay <= 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '18px "Courier New", monospace';
        ctx.fillText('Press SPACE to play again', CANVAS_W / 2, CANVAS_H / 2 + 52);
      }
    }

    ctx.restore();
  }
}
