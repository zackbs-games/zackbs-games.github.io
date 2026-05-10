import { Game } from './game.js';
import { loadSprite } from './spriteCache.js';
import { POKEMON } from './data.js';

const canvas = document.getElementById('game-canvas');

// Build Pokédex HTML panel
function buildPokedex() {
  const grid = document.getElementById('pdx-grid');
  for (const p of POKEMON) {
    const slot = document.createElement('div');
    slot.className = 'pdx-slot';
    slot.id = `pdx-${p.id}`;
    slot.title = `#${p.id} ${p.name}`;

    const num  = document.createElement('span');
    num.className = 'pdx-num';
    num.textContent = p.id;

    const img = document.createElement('img');
    img.alt = p.name;
    img.className = 'pdx-img';

    slot.appendChild(img);
    slot.appendChild(num);
    grid.appendChild(slot);
  }
}

function onCatch(id) {
  const slot = document.getElementById(`pdx-${id}`);
  if (!slot) return;
  slot.classList.add('caught');
  loadSprite(id).then(img => {
    if (img) {
      const el = slot.querySelector('.pdx-img');
      if (el) el.src = img.src;
    }
  });
  // Update counts
  document.getElementById('caught-count').textContent =
    `${document.querySelectorAll('.pdx-slot.caught').length} / 151`;
}

buildPokedex();

const game = new Game(canvas, onCatch);
game._updateHUD();

// Pokédex toggle
const pdxOverlay = document.getElementById('pdx-overlay');
document.getElementById('pdx-btn').addEventListener('click', () => {
  pdxOverlay.classList.toggle('open');
});
document.getElementById('pdx-close').addEventListener('click', () => {
  pdxOverlay.classList.remove('open');
});

// Scale canvas to fit screen
const NW = 960, NH = 480;
function scaleGame() {
  const s = Math.min(innerWidth / NW, innerHeight / NH);
  canvas.style.transform = `scale(${s})`;
  canvas.style.left = Math.round((innerWidth  - NW * s) / 2) + 'px';
  canvas.style.top  = Math.round((innerHeight - NH * s) / 2) + 'px';
}
window.addEventListener('resize', scaleGame);
window.addEventListener('load',   scaleGame);
scaleGame();

// Game loop
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt);
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
