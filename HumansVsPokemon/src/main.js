import { Renderer } from './renderer.js';
import { Game } from './game.js';
import { buildSpriteAtlas } from './spriteAtlas.js';
import { setSpriteUVs } from './entities/Pokemon.js';
import shaderCode from './shaders/sprite.wgsl?raw';

async function main() {
  const canvas = document.getElementById('game-canvas');
  const noWebGPU = document.getElementById('no-webgpu');

  // WebGPU availability check
  if (!navigator.gpu) {
    noWebGPU.style.display = 'block';
    canvas.style.display = 'none';
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    noWebGPU.style.display = 'block';
    canvas.style.display = 'none';
    return;
  }

  const device = await adapter.requestDevice();

  const format = navigator.gpu.getPreferredCanvasFormat();
  const context = canvas.getContext('webgpu');
  context.configure({ device, format, alphaMode: 'premultiplied' });

  // Instantiate game first (sets canvas size)
  const game = new Game(canvas);

  const renderer = new Renderer(device, context, format, canvas.width, canvas.height);
  await renderer.init(shaderCode, format);

  // Load real Pokémon sprites — non-blocking, game falls back to coloured rects
  // until atlas arrives (typically < 1 s on a good connection).
  buildSpriteAtlas().then(({ imageBitmap, uvMap }) => {
    renderer.loadAtlas(imageBitmap);
    setSpriteUVs(uvMap);
  }).catch(err => console.warn('Sprite atlas failed to load:', err));

  // Canvas 2D overlay for text (WebGPU can't render text natively)
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width  = canvas.width;
  overlayCanvas.height = canvas.height;
  overlayCanvas.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: ${canvas.width}px;
    height: ${canvas.height}px;
    pointer-events: none;
  `;
  canvas.parentElement.appendChild(overlayCanvas);
  const ctx2d = overlayCanvas.getContext('2d');

  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = now;

    game.update(dt);
    game.draw(renderer);

    // Draw text overlay on canvas 2D
    ctx2d.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    for (const item of game.getTextItems()) {
      ctx2d.font = `bold ${item.size}px 'Courier New', monospace`;
      ctx2d.fillStyle = item.color;
      ctx2d.textAlign = 'center';
      ctx2d.textBaseline = 'middle';
      ctx2d.fillText(item.text, item.x, item.y);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main().catch(err => {
  console.error('Game init failed:', err);
  document.getElementById('no-webgpu').style.display = 'block';
  document.getElementById('no-webgpu').textContent = `Error: ${err.message}`;
});
