import { Game } from './game.js';

async function main() {
  const canvas   = document.getElementById('game-canvas');
  const noCanvas = document.getElementById('no-webgpu');

  if (!canvas || !canvas.getContext) {
    if (noCanvas) noCanvas.style.display = 'block';
    return;
  }

  const game = new Game(canvas);
  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    game.update(dt);
    game.draw();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main().catch(err => {
  const noCanvas = document.getElementById('no-webgpu');
  if (noCanvas) {
    noCanvas.style.display = 'block';
    noCanvas.textContent = `Error: ${err.message}`;
  }
  console.error(err);
});
