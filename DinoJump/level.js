export const CANVAS_W    = 1280;
export const CANVAS_H    = 480;
export const LEVEL_WIDTH = 9000;
export const GROUND_BASE = 310;

// ── Terrain ──────────────────────────────────────────────────────────────────

export function terrainHeightAt(worldX) {
  const h = GROUND_BASE
    + Math.sin(worldX * 0.004)  * 32
    + Math.sin(worldX * 0.016)  * 16
    + Math.sin(worldX * 0.045)  *  7;
  return Math.max(160, Math.min(CANVAS_H - 70, h));
}

// ── Obstacles ─────────────────────────────────────────────────────────────────

export const OBSTACLES = [
  { type: 'lava', xStart:  700, xEnd:  820 },
  { type: 'lava', xStart: 1900, xEnd: 2050 },
  { type: 'lava', xStart: 3200, xEnd: 3380 },
  { type: 'lava', xStart: 5000, xEnd: 5190 },
  { type: 'lava', xStart: 6700, xEnd: 6900 },
  { type: 'tar',  xStart: 1350, xEnd: 1520 },
  { type: 'tar',  xStart: 2900, xEnd: 3080 },
  { type: 'tar',  xStart: 5600, xEnd: 5820 },
];

// ── Food ──────────────────────────────────────────────────────────────────────

const FOOD_TYPES = ['berry', 'meat', 'fish', 'leaf', 'mushroom'];

export function makeFoodItems() {
  const items = [];
  for (let i = 0; i < 20; i++) {
    const x = 350 + i * 415;
    const y = terrainHeightAt(x) - (55 + Math.sin(x * 0.07) * 40);
    items.push({
      x,
      y,
      collected: false,
      type: FOOD_TYPES[i % FOOD_TYPES.length],
      bobOffset: Math.random() * Math.PI * 2,
    });
  }
  return items;
}

// ── Draw: Sky ─────────────────────────────────────────────────────────────────

export function drawSky(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.75);
  grad.addColorStop(0,    '#0c1445');
  grad.addColorStop(0.4,  '#1a2d6b');
  grad.addColorStop(0.75, '#2d5a8e');
  grad.addColorStop(1,    '#5b8fb9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// ── Draw: Parallax background hills ──────────────────────────────────────────

export function drawBackgroundHills(ctx, cameraX) {
  const offset = cameraX * 0.30;

  ctx.fillStyle = 'rgba(30, 75, 50, 0.45)';
  for (let i = -1; i < 5; i++) {
    const cx = (i * 420) - (offset % 420) + 210;
    const cy = 310 + Math.sin(i * 1.9 + 2) * 30;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 200, 80, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(20, 58, 38, 0.3)';
  for (let i = -1; i < 4; i++) {
    const cx = (i * 560) - ((offset * 0.6) % 560) + 280;
    const cy = 290 + Math.sin(i * 2.4) * 25;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 270, 95, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Draw: Terrain ─────────────────────────────────────────────────────────────
// Call inside ctx.save() / ctx.translate(-cameraX, 0) / ctx.restore() block.

export function drawTerrain(ctx, cameraX) {
  const x0 = cameraX - 8;
  const x1 = cameraX + CANVAS_W + 8;

  // Filled terrain body
  const grad = ctx.createLinearGradient(0, GROUND_BASE - 80, 0, CANVAS_H);
  grad.addColorStop(0,    '#22c55e');
  grad.addColorStop(0.06, '#15803d');
  grad.addColorStop(0.18, '#92400e');
  grad.addColorStop(0.5,  '#451a03');
  grad.addColorStop(1,    '#1c0a00');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x0, CANVAS_H + 10);
  for (let wx = x0; wx <= x1; wx += 3) {
    ctx.lineTo(wx, terrainHeightAt(wx));
  }
  ctx.lineTo(x1, CANVAS_H + 10);
  ctx.closePath();
  ctx.fill();

  // Grass top layer
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let wx = x0; wx <= x1; wx += 2) {
    const sy = terrainHeightAt(wx) - 1;
    if (wx === x0) ctx.moveTo(wx, sy);
    else ctx.lineTo(wx, sy);
  }
  ctx.stroke();

  // Dark edge outline
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let wx = x0; wx <= x1; wx += 3) {
    const sy = terrainHeightAt(wx);
    if (wx === x0) ctx.moveTo(wx, sy);
    else ctx.lineTo(wx, sy);
  }
  ctx.stroke();
}

// ── Draw: Obstacles ───────────────────────────────────────────────────────────
// Call inside world-translate block.

export function drawObstacles(ctx, cameraX) {
  const now = Date.now();

  for (const obs of OBSTACLES) {
    if (obs.xEnd < cameraX - 20 || obs.xStart > cameraX + CANVAS_W + 20) continue;

    const w    = obs.xEnd - obs.xStart;
    const midX = obs.xStart + w / 2;

    if (obs.type === 'lava') {
      const surfMid = terrainHeightAt(midX);

      // Glow aura
      const glow = ctx.createRadialGradient(midX, surfMid - 10, 0, midX, surfMid, w * 0.65);
      glow.addColorStop(0, 'rgba(255,120,0,0.35)');
      glow.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(obs.xStart - 20, surfMid - 40, w + 40, 60);

      // Lava fill follows terrain
      ctx.beginPath();
      ctx.moveTo(obs.xStart, CANVAS_H);
      for (let wx = obs.xStart; wx <= obs.xEnd; wx += 3) {
        ctx.lineTo(wx, terrainHeightAt(wx));
      }
      ctx.lineTo(obs.xEnd, CANVAS_H);
      ctx.closePath();
      const lavaGrad = ctx.createLinearGradient(obs.xStart, surfMid - 5, obs.xStart, surfMid + 25);
      lavaGrad.addColorStop(0,   '#ff6b00');
      lavaGrad.addColorStop(0.4, '#cc2200');
      lavaGrad.addColorStop(1,   '#770a00');
      ctx.fillStyle = lavaGrad;
      ctx.fill();

      // Animated bubbles
      const t = now * 0.003;
      for (let bx = obs.xStart + 14; bx < obs.xEnd - 10; bx += 22) {
        const surfY = terrainHeightAt(bx);
        const by    = surfY + 6 + Math.sin(t + bx * 0.18) * 4;
        const alpha = 0.55 + Math.sin(t * 1.8 + bx * 0.25) * 0.3;
        ctx.fillStyle = `rgba(255,160,20,${alpha})`;
        ctx.beginPath();
        ctx.arc(bx, by, 5 + Math.sin(t * 2 + bx) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label
      ctx.fillStyle = 'rgba(255,200,100,0.9)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LAVA', midX, surfMid - 10);

    } else if (obs.type === 'tar') {
      const surfMid = terrainHeightAt(midX);

      // Tar fill follows terrain
      ctx.beginPath();
      ctx.moveTo(obs.xStart, CANVAS_H);
      for (let wx = obs.xStart; wx <= obs.xEnd; wx += 3) {
        ctx.lineTo(wx, terrainHeightAt(wx));
      }
      ctx.lineTo(obs.xEnd, CANVAS_H);
      ctx.closePath();
      const tarGrad = ctx.createLinearGradient(0, surfMid, 0, surfMid + 30);
      tarGrad.addColorStop(0, '#2d1b00');
      tarGrad.addColorStop(1, '#0f0800');
      ctx.fillStyle = tarGrad;
      ctx.fill();

      // Tar sheen ripple
      const t2 = now * 0.001;
      ctx.strokeStyle = `rgba(80,50,10,${0.4 + Math.sin(t2) * 0.15})`;
      ctx.lineWidth = 2;
      for (let wx = obs.xStart + 20; wx < obs.xEnd - 10; wx += 35) {
        const sy = terrainHeightAt(wx) + 5;
        ctx.beginPath();
        ctx.ellipse(wx, sy, 14, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = 'rgba(160,100,20,0.85)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TAR', midX, surfMid - 8);
    }
  }
}

// ── Draw: Food ────────────────────────────────────────────────────────────────
// Call inside world-translate block.

export function drawFood(ctx, items) {
  const now = Date.now();

  for (const item of items) {
    if (item.collected) continue;

    const bob = Math.sin(now * 0.0022 + item.bobOffset) * 5;
    ctx.save();
    ctx.translate(item.x, item.y + bob);

    if (item.type === 'berry') {
      ctx.fillStyle = '#e63946';
      ctx.beginPath(); ctx.arc(-5, 2, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, 3, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(-7, -1, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a7c30'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-2, -10); ctx.bezierCurveTo(-4, -18, 2, -22, 4, -16); ctx.stroke();

    } else if (item.type === 'meat') {
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.ellipse(0, 2, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f39c12';
      ctx.beginPath(); ctx.ellipse(2, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f5f5f0'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, 22); ctx.stroke();
      ctx.fillStyle = '#f5f5f0';
      ctx.beginPath(); ctx.arc(-3, 23, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, 23, 4, 0, Math.PI * 2); ctx.fill();

    } else if (item.type === 'fish') {
      ctx.fillStyle = '#2980b9';
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-12, 0); ctx.lineTo(-20, -8); ctx.lineTo(-20, 8); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(100,200,255,0.5)';
      ctx.beginPath(); ctx.ellipse(3, -2, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(9, -1, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';  ctx.beginPath(); ctx.arc(10, -1, 1.5, 0, Math.PI * 2); ctx.fill();

    } else if (item.type === 'leaf') {
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.bezierCurveTo(14, -8, 16, 4, 8, 12);
      ctx.bezierCurveTo(4, 16, -4, 16, -8, 12);
      ctx.bezierCurveTo(-16, 4, -14, -8, 0, -12);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1a7a40'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(-2, 20); ctx.stroke();

    } else if (item.type === 'mushroom') {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(0, -4, 12, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(-5, -8, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -6, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f5cba7';
      ctx.beginPath(); ctx.roundRect(-6, -4, 12, 14, 3); ctx.fill();
    }

    // Glow ring
    ctx.strokeStyle = 'rgba(255,255,180,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();

    ctx.restore();
  }
}
