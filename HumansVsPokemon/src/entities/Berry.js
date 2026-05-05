import { Entity } from './Entity.js';

export class Berry extends Entity {
  constructor(x, y) {
    super(x, y, 22, 22);
    this.value = 25;
    this.collected = false;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.bobSpeed = 2 + Math.random();
    this._baseY = y;
  }

  update(dt) {
    this.bobPhase += this.bobSpeed * dt;
    this.y = this._baseY + Math.sin(this.bobPhase) * 3;
  }

  draw(renderer) {
    // Berry: magenta circle-ish (quad with tint)
    renderer.drawRect(this.x, this.y, this.w, this.h, 0.95, 0.3, 0.6);
    // Shine dot
    renderer.drawRect(this.x - 4, this.y - 4, 5, 5, 1.0, 0.8, 0.9);
  }
}
