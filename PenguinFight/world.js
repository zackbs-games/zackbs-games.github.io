export const CANVAS_W = 960;
export const CANVAS_H = 400;
export const GROUND_Y = 320; // top surface of ground blocks
export const BLOCK    = 16;

// Floating platforms: { x, w, y } — y = top surface Y
export const PLATFORMS = [
  { x: 260, w: 96,  y: 240 },
  { x: 560, w: 80,  y: 200 },
  { x: 760, w: 64,  y: 256 },
];

// Draw a single Minecraft-style block with simple shading
function blk(ctx, sx, sy, face, hi, lo, B = BLOCK) {
  ctx.fillStyle = face; ctx.fillRect(sx, sy, B, B);
  ctx.fillStyle = hi;   ctx.fillRect(sx, sy, B, 2);
  ctx.fillStyle = lo;   ctx.fillRect(sx, sy + B - 2, B, 2);
  ctx.fillStyle = lo;   ctx.fillRect(sx + B - 2, sy, 2, B);
}

export function drawSky(ctx) {
  // Daytime Minecraft sky blue
  ctx.fillStyle = '#78aadc';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Pixelated sun (top-right)
  ctx.fillStyle = '#ffee44';
  ctx.fillRect(880, 20, 48, 48);
  ctx.fillStyle = '#ffff88';
  ctx.fillRect(880, 20, 48, 4);
  ctx.fillRect(880, 20, 4, 48);
}

// Clouds scroll slowly — pass elapsed seconds as t
export function drawClouds(ctx, t) {
  const B = BLOCK;
  const clouds = [{ ox: 80 }, { ox: 380 }, { ox: 660 }];
  for (const c of clouds) {
    const sx = ((c.ox + t * 14) % 1100);
    const sy = 44 + (c.ox % 30);
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(sx,         sy + B, B * 5, B);
    ctx.fillRect(sx + B,     sy,     B * 3, B);
    ctx.fillRect(sx + 2 * B, sy - B, B,     B);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + B, sy + B, B * 3, 6);
  }
}

export function drawGround(ctx) {
  const B = BLOCK;
  for (let sx = 0; sx < CANVAS_W; sx += B) {
    blk(ctx, sx, GROUND_Y,         '#5d9e3d', '#7dc44d', '#3d6e2d'); // grass
    blk(ctx, sx, GROUND_Y + B,     '#8b6340', '#9b7350', '#6b4330'); // dirt
    blk(ctx, sx, GROUND_Y + 2 * B, '#7b5330', '#8b6340', '#5b3320'); // dirt
    blk(ctx, sx, GROUND_Y + 3 * B, '#888888', '#999999', '#666666'); // stone
    blk(ctx, sx, GROUND_Y + 4 * B, '#808080', '#919191', '#606060'); // stone
  }
}

export function drawPlatforms(ctx) {
  const B = BLOCK;
  for (const p of PLATFORMS) {
    const cols = Math.ceil(p.w / B);
    for (let i = 0; i < cols; i++) {
      blk(ctx, p.x + i * B, p.y,         '#5d9e3d', '#7dc44d', '#3d6e2d'); // grass
      blk(ctx, p.x + i * B, p.y + B,     '#8b6340', '#9b7350', '#6b4330'); // dirt
      blk(ctx, p.x + i * B, p.y + 2 * B, '#888888', '#999999', '#666666'); // stone
    }
  }
}
