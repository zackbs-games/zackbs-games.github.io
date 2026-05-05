# DinoJump — Prompt Pack (Canvas 2D)

A 2D side-scrolling dinosaur platformer using **plain Canvas 2D** (no WebGPU, no build tool).
Use each prompt below in a **fresh Claude Code conversation** with working directory `c:\MyGames\DinoJump`.
Complete them in order — each builds on the last.

---

## ARCHITECTURE OVERVIEW

```
c:\MyGames\DinoJump\
  index.html   — game canvas, HUD div, back button
  style.css    — minimal styles
  level.js     — terrain math, obstacles, food, all Canvas 2D draw helpers
  dino.js      — Dino class: physics + Canvas 2D drawing
  game.js      — camera, input, collision, score, state machine
  main.js      — entry point, canvas, game loop
```

**Key design decisions:**
- One `<canvas>` for everything (terrain, dino, HUD text all drawn with `ctx.fillText` etc.)
- Camera = `cameraX` offset; use `ctx.save(); ctx.translate(-cameraX, 0); ... ctx.restore()` around world-space drawing
- Terrain is a smooth mathematical curve (layered sines) drawn with hundreds of `ctx.lineTo` points forming a filled path — looks like rolling hills, not boxes
- Dino uses `ctx.ellipse`, `ctx.bezierCurveTo`, `ctx.arc`, `ctx.roundRect` — no rectangles
- Canvas size: **1280 × 480** (set in JS, not HTML)

---

## PROMPT 1 — index.html + style.css

```
Create two files in c:\MyGames\DinoJump\:

────────────────────────────────────────
FILE 1: index.html
────────────────────────────────────────
A minimal game shell. Requirements:

- <head>: charset UTF-8, viewport, title "Dino Jump", link to style.css
- Fixed "← Back to Games" link button top-left corner, same visual style as the one
  already in c:\MyGames\HumansVsPokemon\index.html (read that file to copy the exact
  inline styles — dark semi-transparent background, white text, border-radius, hover effect
  via onmouseover/onmouseout).
  The href should be "/"
- One <canvas id="game-canvas"> — no width/height attributes (JS sets them)
- A <div id="no-webgpu" style="display:none; color:white; font-family:monospace;
  font-size:1.2rem; text-align:center; padding:4rem;">
  Canvas 2D not supported in this browser.</div>
- At the bottom: <script type="module" src="main.js"></script>

────────────────────────────────────────
FILE 2: style.css
────────────────────────────────────────
body {
  margin: 0;
  background: #0a0e1a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
#game-canvas {
  display: block;
  image-rendering: pixelated;
}

That's it — keep it minimal.
```

---

## PROMPT 2 — level.js: terrain, obstacles, food, draw helpers

```
I'm building DinoJump in c:\MyGames\DinoJump\ using plain Canvas 2D (no WebGPU).
Create c:\MyGames\DinoJump\level.js.

All drawing functions receive a Canvas 2D context `ctx` and a `cameraX` number.
Drawing is done in WORLD coordinates inside a ctx.save()/ctx.translate(-cameraX, 0)/ctx.restore()
block in game.js — so draw functions use raw world X values, and the camera translate handles offset.

────────────────────────────────────────
CONSTANTS  (all exported)
────────────────────────────────────────
export const CANVAS_W    = 1280;
export const CANVAS_H    = 480;
export const LEVEL_WIDTH = 9000;
export const GROUND_BASE = 310;   // approximate baseline terrain Y

────────────────────────────────────────
TERRAIN MATH
────────────────────────────────────────
export function terrainHeightAt(worldX) {
  // Layered sine waves — smooth rolling hills, not blocks
  const h = GROUND_BASE
    + Math.sin(worldX * 0.0032) * 72    // slow big hills
    + Math.sin(worldX * 0.012)  * 36    // medium rolls
    + Math.sin(worldX * 0.037)  * 14;   // small ripples
  return Math.max(130, Math.min(CANVAS_H - 70, h));
}

────────────────────────────────────────
OBSTACLES  (exported as const OBSTACLES)
────────────────────────────────────────
Array of 8 objects. Each: { type, xStart, xEnd }

Lava (instant death, 5 of them): xStart/xEnd pairs roughly:
  [700,820], [1900,2050], [3200,3380], [5000,5190], [6700,6900]

Tar pit (slows to 35%, 3 of them): xStart/xEnd pairs roughly:
  [1350,1520], [2900,3080], [5600,5820]

────────────────────────────────────────
FOOD ITEMS  (exported as makeFoodItems() function)
────────────────────────────────────────
Returns a fresh array of 20 food objects each time called:
  { x, y, collected: false, type, bobOffset }

type cycles through: 'berry', 'meat', 'fish', 'leaf', 'mushroom'
x: spread from 350 to 8600, roughly every 415px
y: terrainHeightAt(x) - (55 + Math.sin(x * 0.07) * 40)   // varies 15–95px above terrain
bobOffset: Math.random() * Math.PI * 2   // phase offset for bobbing animation

────────────────────────────────────────
DRAW: Sky
────────────────────────────────────────
export function drawSky(ctx) {
  // Linear gradient from dark blue-purple at top to warm horizon
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.7);
  grad.addColorStop(0,   '#0c1445');
  grad.addColorStop(0.4, '#1a2d6b');
  grad.addColorStop(0.75,'#2d5a8e');
  grad.addColorStop(1,   '#5b8fb9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // A few static clouds (world-space, camera-independent — drawn before translate)
  // Actually draw as part of parallax in game.js
}

────────────────────────────────────────
DRAW: Parallax background hills
────────────────────────────────────────
export function drawBackgroundHills(ctx, cameraX) {
  // Hills scroll at 30% camera speed — drawn in screen coords (no world translate applied)
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

────────────────────────────────────────
DRAW: Terrain  (call INSIDE world-translate block)
────────────────────────────────────────
export function drawTerrain(ctx, cameraX) {
  // Compute visible x range with slight overdraw
  const x0 = cameraX - 8;
  const x1 = cameraX + CANVAS_W + 8;

  // Top grass layer (slightly above terrain surface)
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let wx = x0; wx <= x1; wx += 2) {
    const sy = terrainHeightAt(wx) - 1;
    if (wx === x0) ctx.moveTo(wx, sy);
    else ctx.lineTo(wx, sy);
  }
  ctx.stroke();

  // Fill terrain body with gradient
  const grad = ctx.createLinearGradient(0, GROUND_BASE - 80, 0, CANVAS_H);
  grad.addColorStop(0,    '#22c55e');  // bright grass top
  grad.addColorStop(0.06, '#15803d');  // darker grass
  grad.addColorStop(0.18, '#92400e');  // brown earth
  grad.addColorStop(0.5,  '#451a03');  // deep soil
  grad.addColorStop(1,    '#1c0a00');  // dark bottom

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x0, CANVAS_H + 10);
  for (let wx = x0; wx <= x1; wx += 3) {
    ctx.lineTo(wx, terrainHeightAt(wx));
  }
  ctx.lineTo(x1, CANVAS_H + 10);
  ctx.closePath();
  ctx.fill();

  // Thin black outline along terrain edge for crispness
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

────────────────────────────────────────
DRAW: Obstacles  (call INSIDE world-translate block)
────────────────────────────────────────
export function drawObstacles(ctx, cameraX) {
  const now = Date.now();
  for (const obs of OBSTACLES) {
    // Skip if fully off screen
    if (obs.xEnd < cameraX - 20 || obs.xStart > cameraX + CANVAS_W + 20) continue;
    const w = obs.xEnd - obs.xStart;
    const midX = obs.xStart + w / 2;

    if (obs.type === 'lava') {
      // Lava pool sits ON the terrain — draw per-column to follow terrain curve
      // Glow aura behind
      const glow = ctx.createRadialGradient(midX, terrainHeightAt(midX) - 10, 0, midX, terrainHeightAt(midX), w * 0.65);
      glow.addColorStop(0, 'rgba(255,120,0,0.35)');
      glow.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(obs.xStart - 20, terrainHeightAt(midX) - 40, w + 40, 60);

      // Lava surface follows terrain, depth 22px
      ctx.beginPath();
      ctx.moveTo(obs.xStart, CANVAS_H);
      for (let wx = obs.xStart; wx <= obs.xEnd; wx += 3) {
        ctx.lineTo(wx, terrainHeightAt(wx));
      }
      ctx.lineTo(obs.xEnd, CANVAS_H);
      ctx.closePath();
      const lavaGrad = ctx.createLinearGradient(obs.xStart, terrainHeightAt(midX) - 5, obs.xStart, terrainHeightAt(midX) + 25);
      lavaGrad.addColorStop(0, '#ff6b00');
      lavaGrad.addColorStop(0.4,'#cc2200');
      lavaGrad.addColorStop(1, '#770a00');
      ctx.fillStyle = lavaGrad;
      ctx.fill();

      // Animated lava bubbles
      const t = now * 0.003;
      for (let bx = obs.xStart + 14; bx < obs.xEnd - 10; bx += 22) {
        const surfY = terrainHeightAt(bx);
        const by = surfY + 6 + Math.sin(t + bx * 0.18) * 4;
        const alpha = 0.55 + Math.sin(t * 1.8 + bx * 0.25) * 0.3;
        ctx.fillStyle = `rgba(255,160,20,${alpha})`;
        ctx.beginPath();
        ctx.arc(bx, by, 5 + Math.sin(t * 2 + bx) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // "LAVA" label (small, in world space)
      ctx.fillStyle = 'rgba(255,200,100,0.9)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LAVA', midX, terrainHeightAt(midX) - 10);

    } else if (obs.type === 'tar') {
      // Tar pit — dark sticky patch on terrain surface
      ctx.beginPath();
      ctx.moveTo(obs.xStart, CANVAS_H);
      for (let wx = obs.xStart; wx <= obs.xEnd; wx += 3) {
        ctx.lineTo(wx, terrainHeightAt(wx));
      }
      ctx.lineTo(obs.xEnd, CANVAS_H);
      ctx.closePath();
      const tarGrad = ctx.createLinearGradient(0, terrainHeightAt(midX), 0, terrainHeightAt(midX) + 30);
      tarGrad.addColorStop(0, '#2d1b00');
      tarGrad.addColorStop(1, '#0f0800');
      ctx.fillStyle = tarGrad;
      ctx.fill();

      // Tar sheen (slow ripple)
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
      ctx.fillText('TAR', midX, terrainHeightAt(midX) - 8);
    }
  }
}

────────────────────────────────────────
DRAW: Food items  (call INSIDE world-translate block)
────────────────────────────────────────
export function drawFood(ctx, items) {
  const now = Date.now();
  for (const item of items) {
    if (item.collected) continue;
    const bob = Math.sin(now * 0.0022 + item.bobOffset) * 5;
    const x = item.x;
    const y = item.y + bob;
    ctx.save();
    ctx.translate(x, y);

    if (item.type === 'berry') {
      // Cluster of 3 red berries
      ctx.fillStyle = '#e63946';
      ctx.beginPath(); ctx.arc(-5, 2, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, 3, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(-7, -1, 2.5, 0, Math.PI * 2); ctx.fill();
      // Stem
      ctx.strokeStyle = '#4a7c30'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-2, -10); ctx.bezierCurveTo(-4, -18, 2, -22, 4, -16); ctx.stroke();

    } else if (item.type === 'meat') {
      // Cartoon meat chop
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.ellipse(0, 2, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f39c12';
      ctx.beginPath(); ctx.ellipse(2, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
      // Bone handle
      ctx.strokeStyle = '#f5f5f0'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, 22); ctx.stroke();
      ctx.fillStyle = '#f5f5f0';
      ctx.beginPath(); ctx.arc(-3, 23, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, 23, 4, 0, Math.PI * 2); ctx.fill();

    } else if (item.type === 'fish') {
      // Blue fish silhouette
      ctx.fillStyle = '#2980b9';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
      // Tail fin
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-20, -8); ctx.lineTo(-20, 8); ctx.closePath();
      ctx.fill();
      // Shine
      ctx.fillStyle = 'rgba(100,200,255,0.5)';
      ctx.beginPath(); ctx.ellipse(3, -2, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
      // Eye
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(9, -1, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(10, -1, 1.5, 0, Math.PI*2); ctx.fill();

    } else if (item.type === 'leaf') {
      // Green leaf
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.bezierCurveTo(14, -8, 16, 4, 8, 12);
      ctx.bezierCurveTo(4, 16, -4, 16, -8, 12);
      ctx.bezierCurveTo(-16, 4, -14, -8, 0, -12);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1a7a40'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
      // Stem
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(-2, 20); ctx.stroke();

    } else if (item.type === 'mushroom') {
      // Cute mushroom
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(0, -4, 12, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(-5, -8, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -6, 2.5, 0, Math.PI * 2); ctx.fill();
      // Stem
      ctx.fillStyle = '#f5cba7';
      ctx.beginPath();
      ctx.roundRect(-6, -4, 12, 14, 3); ctx.fill();
    }

    // Glow ring under food
    ctx.strokeStyle = 'rgba(255,255,180,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

After writing the file, confirm the exported names.
```

---

## PROMPT 3 — dino.js: player entity

```
I'm building DinoJump in c:\MyGames\DinoJump\ (Canvas 2D platformer).
level.js exports: terrainHeightAt, OBSTACLES, LEVEL_WIDTH, CANVAS_H.
Create c:\MyGames\DinoJump\dino.js — the player Dino class.

────────────────────────────────────────
PHYSICS CONSTANTS (top of file, not exported)
────────────────────────────────────────
const GRAVITY   = 1380;   // px/s²
const JUMP_VY   = -640;   // upward velocity on jump (negative = up)
const MAX_FALL  = 900;    // terminal velocity
const MOVE_SPEED = 200;   // rightward speed px/s

────────────────────────────────────────
CLASS Dino  (exported)
────────────────────────────────────────
constructor():
  this.x = 240          // world X (centre of dino body)
  this.y = 200          // world Y (centre of dino body)
  this.vy = 0
  this.w = 40           // collision width
  this.h = 52           // collision height
  this.onGround = false
  this.jumpsLeft = 2    // allow double-jump
  this.dead = false
  this.won = false
  this.slowMult = 1
  this.slowTimer = 0
  this._animTimer = 0
  this._deathTimer = 0
  this._squish = 1      // scale Y on landing (squish bounce effect)
  this._squishTimer = 0

────────────────────────────────────────
update(dt, obstacles, foodItems)   — returns an event object or null
────────────────────────────────────────
Import terrainHeightAt and LEVEL_WIDTH from './level.js'.

If dead:
  this._deathTimer += dt
  return { type: 'dead' }

this._animTimer += dt

Squish decay:
  if this._squishTimer > 0:
    this._squishTimer -= dt
    this._squish = 1 + Math.sin(this._squishTimer * Math.PI / 0.12) * 0.18
  else:
    this._squish = 1

Slow decay:
  if this.slowTimer > 0:
    this.slowTimer = Math.max(0, this.slowTimer - dt)
    if this.slowTimer === 0: this.slowMult = 1

Apply gravity:
  this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL)

Move:
  this.x += MOVE_SPEED * this.slowMult * dt
  this.y += this.vy * dt

Terrain collision:
  const surfaceY = terrainHeightAt(this.x) - this.h / 2
  const wasInAir = !this.onGround
  if this.y >= surfaceY:
    if wasInAir and this.vy > 80:   // landed with some speed — squish
      this._squish = 0.72
      this._squishTimer = 0.12
    this.y = surfaceY
    this.vy = 0
    this.onGround = true
    this.jumpsLeft = 2
  else:
    this.onGround = false

Obstacle collision:
  const dinoLeft  = this.x - this.w / 2
  const dinoRight = this.x + this.w / 2
  const dinoFoot  = this.y + this.h / 2
  const groundY   = terrainHeightAt(this.x)
  for (const obs of obstacles):
    if dinoRight > obs.xStart and dinoLeft < obs.xEnd and dinoFoot >= groundY - 26:
      if obs.type === 'lava':
        this.dead = true
        return { type: 'dead' }
      if obs.type === 'tar':
        this.slowMult = 0.35
        this.slowTimer = 0.12   // refreshed each frame while inside

Food collection:
  for (const item of foodItems):
    if not item.collected:
      const dx = this.x - item.x
      const dy = this.y - item.y
      if dx*dx + dy*dy < 44*44:
        item.collected = true
        return { type: 'food', item }

Win check:
  if this.x >= LEVEL_WIDTH - 300 and not this.won:
    this.won = true
    return { type: 'win' }

return null

────────────────────────────────────────
jump()
────────────────────────────────────────
  if this.jumpsLeft > 0:
    this.vy = JUMP_VY
    this.jumpsLeft--
    this.onGround = false

────────────────────────────────────────
draw(ctx, cameraX)
────────────────────────────────────────
All drawing in world coordinates (camera translate already applied by game.js).

  const sx = this.x
  const sy = this.y
  const t  = this._animTimer
  const sq = this._squish   // vertical squish (< 1 = squashed, > 1 = stretched)

  ctx.save()
  ctx.translate(sx, sy)
  ctx.scale(1 / sq, sq)   // squish: horizontal expands as vertical squashes

  const legSwing = this.onGround ? Math.sin(t * 9) * 11 : 0
  const inAir    = !this.onGround

  // --- COLORS ---
  const bodyGreen  = '#3da528'
  const darkGreen  = '#2a7a1c'
  const lightGreen = '#72d44a'
  const skinTone   = dead ? '#8b0000' : bodyGreen  // red when dead

  // --- TAIL ---
  ctx.fillStyle = skinTone
  ctx.beginPath()
  ctx.moveTo(-12, 10)
  ctx.bezierCurveTo(-32, 2, -50, 12, -46, 24)
  ctx.bezierCurveTo(-42, 34, -22, 26, -12, 16)
  ctx.closePath()
  ctx.fill()

  // --- BACK LEG ---
  ctx.save()
  ctx.translate(-7, 18)
  ctx.rotate(legSwing * 0.065)
  ctx.fillStyle = darkGreen
  ctx.beginPath()
  ctx.roundRect(-5, 0, 11, 22, [4, 4, 2, 2])
  ctx.fill()
  // Foot
  ctx.beginPath()
  ctx.ellipse(2, 25, 9, 5, 0.15, 0, Math.PI * 2)
  ctx.fill()
  // Claw toes (3 little points)
  ctx.fillStyle = '#1a5212'
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    ctx.moveTo(2 + i * 5, 28)
    ctx.lineTo(2 + i * 5, 34)
    ctx.lineTo(2 + i * 5 + 2, 28)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  // --- BODY ---
  ctx.fillStyle = skinTone
  ctx.beginPath()
  ctx.ellipse(0, 0, 21, 26, 0, 0, Math.PI * 2)
  ctx.fill()

  // --- BELLY PATCH ---
  ctx.fillStyle = lightGreen
  ctx.beginPath()
  ctx.ellipse(5, 6, 11, 15, 0, 0, Math.PI * 2)
  ctx.fill()

  // --- FRONT LEG ---
  ctx.save()
  ctx.translate(7, 18)
  ctx.rotate(-legSwing * 0.065)
  ctx.fillStyle = darkGreen
  ctx.beginPath()
  ctx.roundRect(-5, 0, 11, 22, [4, 4, 2, 2])
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(2, 25, 9, 5, 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a5212'
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    ctx.moveTo(2 + i * 5, 28)
    ctx.lineTo(2 + i * 5, 34)
    ctx.lineTo(2 + i * 5 + 2, 28)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  // --- NECK ---
  ctx.fillStyle = skinTone
  ctx.beginPath()
  ctx.moveTo(10, -16)
  ctx.bezierCurveTo(16, -10, 20, -6, 18, 4)
  ctx.bezierCurveTo(12, 5, 6, 1, 8, -14)
  ctx.closePath()
  ctx.fill()

  // --- HEAD ---
  ctx.beginPath()
  ctx.ellipse(22, -26, 17, 13, 0.15, 0, Math.PI * 2)
  ctx.fill()

  // --- SNOUT (lower jaw) ---
  ctx.beginPath()
  ctx.moveTo(14, -22)
  ctx.bezierCurveTo(24, -20, 40, -21, 38, -14)
  ctx.bezierCurveTo(36, -10, 18, -12, 14, -17)
  ctx.closePath()
  ctx.fill()

  // --- NOSTRIL ---
  ctx.fillStyle = darkGreen
  ctx.beginPath()
  ctx.ellipse(33, -20, 3, 2, 0, 0, Math.PI * 2)
  ctx.fill()

  // --- EYE ---
  if not dead:
    // White sclera
    ctx.fillStyle = 'white'
    ctx.beginPath(); ctx.arc(26, -31, 7, 0, Math.PI * 2); ctx.fill()
    // Pupil
    ctx.fillStyle = '#111828'
    ctx.beginPath(); ctx.arc(27, -30, 4.5, 0, Math.PI * 2); ctx.fill()
    // Shine
    ctx.fillStyle = 'white'
    ctx.beginPath(); ctx.arc(29, -33, 2, 0, Math.PI * 2); ctx.fill()
    // Eyebrow (ridge)
    ctx.strokeStyle = darkGreen; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(20, -36); ctx.lineTo(32, -37); ctx.stroke()
  else:
    // X eyes
    ctx.strokeStyle = '#ff2222'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(20,-36); ctx.lineTo(30,-26); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(30,-36); ctx.lineTo(20,-26); ctx.stroke()

  // --- SPINE SPIKES ---
  ctx.fillStyle = darkGreen
  const spikePositions = [[-12,-22], [-2,-26], [8,-26], [16,-22]]
  for (const [spx, spy] of spikePositions) {
    ctx.beginPath()
    ctx.moveTo(spx - 4, spy + 2)
    ctx.lineTo(spx,     spy - 12)
    ctx.lineTo(spx + 4, spy + 2)
    ctx.closePath()
    ctx.fill()
  }

  // --- TINY T-REX ARMS ---
  ctx.fillStyle = skinTone
  ctx.beginPath()
  ctx.roundRect(10, -10, 10, 7, 3); ctx.fill()
  ctx.beginPath()
  ctx.roundRect(18, -6, 8, 5, 2); ctx.fill()

  // --- DEATH OVERLAY ---
  if this.dead:
    const flash = 0.3 + Math.abs(Math.sin(this._deathTimer * 7)) * 0.4
    ctx.fillStyle = `rgba(180, 0, 0, ${flash})`
    ctx.beginPath()
    ctx.ellipse(0, 0, 28, 34, 0, 0, Math.PI * 2)
    ctx.fill()

  ctx.restore()

NOTE: In the actual JS code, use `this.dead` not `dead`, and `this._squish` not `sq` directly —
replace all variable shorthands consistently. Make sure ctx.roundRect is called correctly
(it's available in modern Chrome/Edge — same target as WebGPU).

After writing the file, list exported symbols.
```

---

## PROMPT 4 — game.js + main.js + landing page

```
I'm building DinoJump in c:\MyGames\DinoJump\ (Canvas 2D platformer, no WebGPU, no build tool).

Files that exist and work:
  level.js  exports: CANVAS_W, CANVAS_H, LEVEL_WIDTH, GROUND_BASE, terrainHeightAt,
                     OBSTACLES, makeFoodItems, drawSky, drawBackgroundHills,
                     drawTerrain, drawObstacles, drawFood
  dino.js   exports: Dino class with update(dt, obstacles, foodItems),
                     jump(), draw(ctx, cameraX)

Create game.js and main.js, then update the landing page.

════════════════════════════════════════
FILE 1: game.js
════════════════════════════════════════
import { Dino } from './dino.js';
import {
  CANVAS_W, CANVAS_H, LEVEL_WIDTH,
  terrainHeightAt, OBSTACLES, makeFoodItems,
  drawSky, drawBackgroundHills, drawTerrain, drawObstacles, drawFood
} from './level.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    this.ctx = canvas.getContext('2d');
    this._state = 'playing';  // 'playing' | 'dead' | 'win'
    this.score = 0;
    this.totalFood = 0;
    this._lives = 3;
    this._cameraX = 0;
    this._restartDelay = 0;
    this._winTimer = 0;
    this._dino = null;
    this._food = null;
    this._deathFlash = 0;   // flicker overlay timer
    this._init();

    // Input
    window.addEventListener('keydown', e => {
      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && this._state === 'playing') {
        this._dino.jump();
      }
      if (e.code === 'Space' && this._state !== 'playing' && this._restartDelay <= 0) {
        this._init();
      }
      if (['Space','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
    });
  }

  _init() {
    this._dino = new Dino();
    this._food = makeFoodItems();
    this.totalFood = this._food.length;
    this.score = 0;
    this._cameraX = 0;
    this._state = 'playing';
    this._restartDelay = 0;
    this._winTimer = 0;
    this._deathFlash = 0;
  }

  update(dt) {
    if (this._state !== 'playing') {
      this._restartDelay = Math.max(0, this._restartDelay - dt);
      if (this._state === 'win') this._winTimer += dt;
      return;
    }

    const event = this._dino.update(dt, OBSTACLES, this._food);
    if (event) {
      if (event.type === 'food') {
        this.score++;
      } else if (event.type === 'dead' || this._dino.dead) {
        this._lives--;
        this._state = 'dead';
        this._restartDelay = 1.4;
        this._deathFlash = 0.6;
      } else if (event.type === 'win' || this._dino.won) {
        this._state = 'win';
        this._restartDelay = 2.0;
      }
    }

    if (this._deathFlash > 0) this._deathFlash -= dt;

    // Camera: keep dino ~300px from left, clamped to level bounds
    const target = this._dino.x - 300;
    this._cameraX = Math.max(0, Math.min(target, LEVEL_WIDTH - CANVAS_W));
  }

  draw() {
    const ctx = this.ctx;
    const cam = this._cameraX;

    // --- SKY (screen coords, no camera offset) ---
    drawSky(ctx);
    drawBackgroundHills(ctx, cam);

    // --- WORLD (apply camera translate) ---
    ctx.save();
    ctx.translate(-cam, 0);

    drawTerrain(ctx, cam);
    drawObstacles(ctx, cam);
    drawFood(ctx, this._food);
    this._dino.draw(ctx, cam);

    // END OF LEVEL flag pole
    const flagX = LEVEL_WIDTH - 200;
    const flagBaseY = terrainHeightAt(flagX);
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(flagX, flagBaseY); ctx.lineTo(flagX, flagBaseY - 90); ctx.stroke();
    ctx.fillStyle = '#f39c12';
    ctx.beginPath(); ctx.moveTo(flagX, flagBaseY - 90); ctx.lineTo(flagX + 32, flagBaseY - 75); ctx.lineTo(flagX, flagBaseY - 60); ctx.closePath(); ctx.fill();

    ctx.restore();

    // --- DEATH FLASH OVERLAY ---
    if (this._deathFlash > 0) {
      ctx.fillStyle = `rgba(200, 0, 0, ${Math.min(0.45, this._deathFlash * 0.7)})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // --- WIN OVERLAY ---
    if (this._state === 'win') {
      ctx.fillStyle = 'rgba(0, 40, 0, 0.52)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // --- HUD (screen coords, drawn last) ---
    this._drawHUD(ctx);
  }

  _drawHUD(ctx) {
    ctx.save();
    // Score pill top-left
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(14, 14, 220, 38, 10); ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`Food: ${this.score} / ${this.totalFood}`, 26, 33);

    // Lives top-right
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(CANVAS_W - 140, 14, 126, 38, 10); ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('♥'.repeat(Math.max(0, this._lives)), CANVAS_W - 20, 33);

    // Controls hint (only near start)
    if (this._dino && this._dino.x < 500) {
      ctx.fillStyle = 'rgba(200,225,255,0.65)';
      ctx.font = '13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SPACE / ↑ to jump   (double-jump!)', CANVAS_W / 2, 24);
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
        ctx.fillText(`${this._lives} ${this._lives === 1 ? 'life' : 'lives'} left`, CANVAS_W / 2, CANVAS_H / 2 + 14);
        if (this._restartDelay <= 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.font = '18px "Courier New", monospace';
          ctx.fillText('Press SPACE to try again', CANVAS_W / 2, CANVAS_H / 2 + 52);
        }
      } else {
        ctx.fillStyle = '#ffcc44';
        ctx.font = 'bold 30px "Courier New", monospace';
        ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 + 14);
        if (this._restartDelay <= 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
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
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '18px "Courier New", monospace';
        ctx.fillText('Press SPACE to play again', CANVAS_W / 2, CANVAS_H / 2 + 52);
      }
    }
    ctx.restore();
  }
}

════════════════════════════════════════
FILE 2: main.js
════════════════════════════════════════
import { Game } from './game.js';

async function main() {
  const canvas   = document.getElementById('game-canvas');
  const noCanvas = document.getElementById('no-webgpu');

  if (!canvas || !canvas.getContext) {
    noCanvas.style.display = 'block';
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
  if (noCanvas) { noCanvas.style.display = 'block'; noCanvas.textContent = `Error: ${err.message}`; }
  console.error(err);
});

════════════════════════════════════════
LANDING PAGE: edit c:\MyGames\index.html
════════════════════════════════════════
Read c:\MyGames\index.html first. Add a third game card inside .games-grid (after the Pixamon card):

  <a class="game-card" href="DinoJump/">
    <div class="card-banner banner-dinojump">
      <div class="card-icon">🦕</div>
    </div>
    <div class="card-body">
      <div class="card-tags">
        <span class="tag">Platformer</span>
        <span class="tag">Action</span>
      </div>
      <h3>Dino Jump</h3>
      <p>Run, jump, and double-jump through a prehistoric world! Collect food, dodge
         glowing lava pools, and push through tar pits across smooth rolling hills.</p>
      <div class="play-btn">▶ Play Now</div>
      <div class="compat-notice">⚠️ Requires Chrome or Edge 113+</div>
    </div>
  </a>

════════════════════════════════════════
LANDING PAGE: edit c:\MyGames\site.css
════════════════════════════════════════
Read c:\MyGames\site.css first. Add after .banner-pixamon:

  .banner-dinojump {
    background: linear-gradient(135deg, #431407 0%, #7c2d12 40%, #14532d 100%);
  }
  .banner-dinojump .card-icon { animation-delay: 3.5s; }

Also update the meta description in index.html to mention Dino Jump.

After all edits, confirm the exact changes made to index.html and site.css.
```

---

## TESTING CHECKLIST

Run from `c:\MyGames`:
```powershell
npx serve . -l 4000
```

Visit:
- `http://localhost:4000` — landing page, 3 game cards including Dino Jump 🦕
- `http://localhost:4000/DinoJump/` — game loads immediately (no WebGPU required — just Canvas 2D!)

Gameplay checks:
- [ ] Terrain is smooth curved hills (not blocky)
- [ ] Dino is drawn with curves/ellipses (not boxes)
- [ ] SPACE / Arrow Up: jumps; second press while airborne: double-jumps
- [ ] Dino squishes on landing
- [ ] Lava pools: contact = death, red flash, "OUCH!"
- [ ] Tar pits: contact = dino slows noticeably
- [ ] Food floats and bobs, collecting increments "Food: X / 20" counter
- [ ] Hearts (♥♥♥) decrement on death; 0 lives = GAME OVER
- [ ] Yellow flag at end of level; reaching it = YOU WIN
- [ ] SPACE restarts after death or win
- [ ] "← Back to Games" link works

---

## COMMON FIXES

**Dino falls through terrain:**
Check `terrainHeightAt` is returning Y (not inverted). Collision: `surfaceY = terrainHeightAt(dino.x) - dino.h/2`. If `dino.y >= surfaceY`, snap to surfaceY.

**ctx.roundRect not a function:**
Requires Chrome 99+. Fallback: replace `ctx.roundRect(x,y,w,h,r); ctx.fill()` with `ctx.rect(x,y,w,h); ctx.fill()`.

**Food items unreachable (too high):**
In `makeFoodItems()`, reduce the height: `y = terrainHeightAt(x) - 55` (not more than 90 above terrain).

**Lava/tar labels appear in wrong position:**
The obstacle draw functions use world X values (inside `ctx.translate(-cameraX)` block). Make sure `drawObstacles` is called between `ctx.save()` + `ctx.translate(-cam, 0)` and `ctx.restore()`.

**Module import errors (bare specifier):**
All imports must be relative: `'./level.js'` not `'level.js'`. All `<script>` tags need `type="module"`.
```
