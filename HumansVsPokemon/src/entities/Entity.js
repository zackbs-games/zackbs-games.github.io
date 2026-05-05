export class Entity {
  constructor(x, y, w, h) {
    this.x = x;       // world pixel center-x
    this.y = y;       // world pixel center-y
    this.w = w;
    this.h = h;
    this.hp = 1;
    this.maxHp = 1;
    this.dead = false;
    this.lane = 0;
    this.col = 0;
  }

  get left()   { return this.x - this.w / 2; }
  get right()  { return this.x + this.w / 2; }
  get top()    { return this.y - this.h / 2; }
  get bottom() { return this.y + this.h / 2; }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) this.dead = true;
  }

  overlaps(other) {
    return this.left < other.right &&
           this.right > other.left &&
           this.top < other.bottom &&
           this.bottom > other.top;
  }

  update(_dt) {}

  drawHealthBar(renderer) {
    if (this.hp >= this.maxHp) return;
    const barW = this.w * 0.8;
    const barH = 5;
    const bx = this.x;
    const by = this.y - this.h / 2 - 6;
    // background
    renderer.drawRect(bx, by, barW, barH, 0.3, 0.05, 0.05);
    // fill
    const pct = Math.max(0, this.hp / this.maxHp);
    renderer.drawRect(bx - barW / 2 * (1 - pct), by, barW * pct, barH, 0.15, 0.9, 0.15);
  }
}
