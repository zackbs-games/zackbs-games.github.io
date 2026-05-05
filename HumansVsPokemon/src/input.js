export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this._clicks = [];
    this.mouseX = 0;
    this.mouseY = 0;

    canvas.addEventListener('click', e => {
      const { x, y } = this._toCanvas(e);
      this._clicks.push({ x, y });
    });

    canvas.addEventListener('mousemove', e => {
      const { x, y } = this._toCanvas(e);
      this.mouseX = x;
      this.mouseY = y;
    });
  }

  _toCanvas(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width  / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  drainClicks() {
    const c = this._clicks.slice();
    this._clicks.length = 0;
    return c;
  }
}
