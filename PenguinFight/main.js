import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');
const game   = new Game(canvas);
let lastTime = performance.now();

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  game.update(dt);
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
