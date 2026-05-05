---
name: Texture Implementation Plan
description: Step-by-step plan for adding texture support to the WebGPU voxel renderer (blocks only, not creatures)
type: project
---

# Texture Implementation Plan

**Why:** Currently all blocks use flat vertex colors. Adding textures will give the world a much richer, hand-crafted feel without needing to redesign the geometry. Creatures are excluded from this phase — they keep their flat colors.

**How to apply:** Follow steps in order. Each step is independently testable before moving to the next.

---

## Block Types & Tile Requirements

Every block type needs textures for its visible faces. Some types use the same tile on all faces; others (grass) need a different top vs. side tile.

| Block type | Top face tile  | Side face tile  | Bottom face tile | Notes                        |
|------------|---------------|-----------------|------------------|------------------------------|
| Grass      | `grass_top`   | `grass_side`    | `dirt`           | Top is green, sides show dirt+grass strip |
| Dirt       | `dirt`        | `dirt`          | `dirt`           | Uniform brown                |
| Stone      | `stone`       | `stone`         | `stone`          | Uniform grey, subtle crack pattern |
| Snow       | `snow_top`    | `snow_side`     | `dirt`           | White top, snow-capped sides |
| Water      | `water`       | `water`         | `water`          | Uniform semi-transparent blue, animated shimmer optional |

**Total unique tiles: 7** (grass_top, grass_side, dirt, stone, snow_top, snow_side, water)

---

## Atlas Layout

Generate a 128×128 PNG atlas at startup using the Canvas 2D API (no external image files needed). Each tile is 16×16 pixels, atlas is 8 tiles wide.

```
Col:  0           1           2       3       4          5          6       7
      grass_top   grass_side  dirt    stone   snow_top   snow_side  water   (spare)
```

All tiles drawn procedurally with pixel-art style noise for variation:
- **grass_top**: solid green base + scattered darker green pixels
- **grass_side**: top 4px green strip, bottom 12px brown dirt
- **dirt**: brown base + scattered dark flecks
- **stone**: mid-grey base + lighter/darker pixel cracks
- **snow_top**: near-white base + faint blue shadow pixels
- **snow_side**: top 4px white, bottom 12px grey stone
- **water**: mid-blue base + lighter diagonal shimmer lines

---

## Approach: Texture Atlas

Single PNG atlas + one new `tileIndex` field per instance. One draw call, no new render passes, no new geometry — same architecture as now. The fragment shader looks up the tile from the atlas using the face normal to pick top vs. side UV.

---

## Steps

### 1. Refactor `addBlock` to accept a tile index instead of color

Currently: `addBlock(instances, position, color)`
After: `addBlock(instances, position, tileIndex)` where tileIndex is a single integer (0–7)

Replace the `blockColors` object with a `blockTiles` object:
```javascript
const blockTiles = {
  grass: 0,   // grass_top on top, grass_side on sides, dirt on bottom
  dirt:  2,
  stone: 3,
  snow:  4,   // snow_top on top, snow_side on sides
  water: 6,
};
```

Update `buildChunkInto` to pass tile indices instead of colors.

### 2. Extend the instance buffer layout (20 → 21 floats)

Add one float per instance: `tileIndex` (float, cast to uint in shader).

| Field       | Floats | Bytes offset |
|-------------|--------|-------------|
| model mat4  | 16     | 0           |
| color rgba  | 4      | 64          |
| tileIndex   | 1      | 80          |
| **Total**   | **21** | **84 bytes**|

Update in `main.js`:
- `buildPipeline`: change instance buffer `arrayStride` from `20 * 4` to `21 * 4`; add attribute `@location(7)` at offset 80
- `updateInstanceBuffer` and `updateDynamicBuffer`: change `Float32Array(n * 20)` → `Float32Array(n * 21)`; write tileIndex after color
- `instanceBuffer` creation: update byte size

Creature instances write `tileIndex = -1.0` (sentinel) so the shader knows to use vertex color instead of atlas sample.

### 3. Generate the atlas texture at startup

Add `async function createAtlasTexture(device)` in `main.js`:
1. Create a 128×128 `<canvas>` element (not added to DOM)
2. Draw all 7 tiles using `ctx.fillRect` + per-pixel noise via `ctx.getImageData` / `putImageData`
3. Call `createImageBitmap(canvas)` to get a GPU-uploadable bitmap
4. `device.createTexture({ size: [128,128], format: 'rgba8unorm', usage: TEXTURE_BINDING | COPY_DST | RENDER_ATTACHMENT })`
5. `device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [128,128])`
6. Return `{ texture, sampler }` where sampler uses `minFilter/magFilter: 'nearest'` for pixel-art look

Call this in `initWebGPU` before building the pipeline.

### 4. Add texture bindings to the shader

`shader.wgsl` changes:
```wgsl
@group(0) @binding(1) var atlasSampler : sampler;
@group(0) @binding(2) var atlasTex     : texture_2d<f32>;
```

Add to `VertexInput`:
```wgsl
@location(7) tileIndex : f32,
```

Add to `VertexOutput`:
```wgsl
@location(2) tileIndex : f32,
@location(3) localPos  : vec3<f32>,
```

In vertex shader, pass through `tileIndex` and the pre-scale local position (used for UV generation in the fragment stage).

### 5. Per-face UV mapping in the fragment shader

Use the interpolated `worldNormal` to select top/side/bottom face, then use `localPos` (the untransformed vertex XYZ) to compute UVs within the tile:

```wgsl
// Determine which face
let absN = abs(input.worldNormal);
var uv : vec2<f32>;
if (absN.y > 0.5) {
  uv = fract(input.localPos.xz + 0.5); // top/bottom: use XZ
} else if (absN.x > 0.5) {
  uv = fract(input.localPos.zy + 0.5); // X-facing: use ZY
} else {
  uv = fract(input.localPos.xy + 0.5); // Z-facing: use XY
}

// Select top vs side vs bottom tile within the block's tile group
var col : f32 = tileIndex;
if (absN.y > 0.5 && input.worldNormal.y < 0.0) {
  col = 2.0; // bottom → always dirt
} else if (absN.y < 0.5 && (tileIndex == 0.0 || tileIndex == 4.0)) {
  col = tileIndex + 1.0; // grass/snow sides use next tile
}

// Sample atlas (8 tiles wide, each 1/8 of atlas width)
let atlasUV = vec2<f32>((col + uv.x) / 8.0, uv.y);
let texColor = textureSample(atlasTex, atlasSampler, atlasUV);

// Blend: use texColor for blocks (tileIndex >= 0), vertex color for creatures
let useTexture = step(0.0, tileIndex);
let finalColor = mix(input.color, texColor, useTexture);
return vec4<f32>(finalColor.rgb * light, finalColor.a);
```

### 6. Update `createBindGroupLayout` and `createUniformBindGroup`

Add two new entries to the bind group layout:
```javascript
{ binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
{ binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
```

Pass sampler and texture view into `createUniformBindGroup`.

### 7. Pass `localPos` through the vertex shader

The vertex shader needs to output the pre-model-transform position for UV generation. Add to vertex shader:
```wgsl
output.localPos = input.position; // unit cube coords (-0.5 to +0.5)
```

---

## Instance Buffer Change Summary

| Field       | Old floats | New floats |
|-------------|-----------|------------|
| model mat4  | 16        | 16         |
| color rgba  | 4         | 4          |
| tileIndex   | —         | 1          |
| **Total**   | **20**    | **21**     |

Stride: 80 bytes → 84 bytes  
Update: `buildPipeline` arrayStride, both buffer write functions, `instanceBuffer` size

---

## Key Files to Change

- `main.js` — atlas generation, instance buffer extension, tile index assignment in `addBlock` / `buildChunkInto`, bind group update
- `shader.wgsl` — new bindings, `tileIndex` + `localPos` in VertexOutput, atlas UV logic in fragment shader

---

---

## Step 8: Normal Maps (Bump Mapping) for Sexy Blocks

Every block tile gets a matching normal map tile in a second atlas. The normal map encodes per-pixel surface direction as RGB, allowing the diffuse lighting to react to surface detail even though the geometry is flat cubes.

### Normal map atlas

Second 128×128 atlas (`normalTex`) with the same tile layout as the colour atlas. Each tile is a 16×16 normal map (RGB = XYZ surface normal, stored as 0–255 where 128,128,255 = flat).

Procedurally generated normal maps per tile:
- **grass_top**: bumpy lumpy surface — random height field → finite-difference normals, strong Y component
- **grass_side**: vertical grooves + clumped dirt texture
- **dirt**: soft rolling bumps, moderate variation
- **stone**: sharp cracks and chipped edges — high contrast height field
- **snow_top**: gentle smooth drifts — low frequency noise
- **snow_side**: icy ridges running vertically
- **water**: ripple pattern — sine-wave height field baked to normals

### Shader changes for normal mapping

Add to shader bindings:
```wgsl
@group(0) @binding(3) var normalTex : texture_2d<f32>;
```

In the fragment shader, after sampling `texColor`:
```wgsl
// Sample normal map, decode from [0,1] to [-1,1]
let nSample = textureSample(normalTex, atlasSampler, atlasUV).xyz * 2.0 - 1.0;

// Build TBN matrix from face normal to transform tangent-space normal to world space
// For axis-aligned cube faces the TBN is deterministic from worldNormal
let N = normalize(input.worldNormal);
let T = normalize(select(vec3(1,0,0), vec3(0,1,0), absN.x > 0.5)); // tangent
let B = cross(N, T);
let worldBumpNormal = normalize(T * nSample.x + B * nSample.y + N * nSample.z);

// Replace flat normal with bump normal in lighting calculation
let diffuse = max(dot(worldBumpNormal, lightDir), 0.0);
let light   = ambient + (1.0 - ambient) * diffuse;
```

The TBN (Tangent-Bitangent-Normal) matrix for axis-aligned cube faces is trivially derivable from `worldNormal` — no extra per-vertex data needed.

### Additional bind group entries

```javascript
{ binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
```

Pass `normalTexture.createView()` into the bind group alongside the colour atlas.

### Visual impact per block

| Block      | Normal map effect                                              |
|------------|----------------------------------------------------------------|
| Grass top  | Lumpy organic surface that catches side-light beautifully      |
| Grass side | Vertical soil grooves, grass tufts casting micro-shadows       |
| Dirt       | Soft rolling bumps, reads as freshly turned earth              |
| Stone      | Sharp angular cracks, chips — looks carved and solid           |
| Snow top   | Gentle drifts with soft highlights — cinematic snow feel       |
| Snow side  | Icy ridged texture, light catches the vertical striations      |
| Water      | Ripple normals make the flat water surface shimmer dynamically |

---

## Gaps & Watch-outs

### Water alpha blending
Water uses `alpha: 0.9` but the WebGPU pipeline is currently configured with `alphaMode: 'opaque'` and no blend state. To render water transparently:
- Add `blend` to the fragment target in `buildPipeline`:
```javascript
targets: [{ format, blend: {
  color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one',       dstFactor: 'zero',                operation: 'add' },
}}]
```
- Draw order matters: render all opaque blocks first, water blocks last (or accept minor sorting artefacts for now).

### `@interpolate(flat)` for tileIndex
`tileIndex` is a per-instance constant — every vertex of the same cube shares the same value. Without `flat` interpolation the GPU will interpolate it across the triangle, potentially producing fractional tile indices. In WGSL:
```wgsl
@location(2) @interpolate(flat) tileIndex : f32,
```

### `toggleBlock` needs updating
`toggleBlock` in `main.js` calls `addBlock(worldInstances, target, blockColors.stone)`. When `addBlock` switches from color to tileIndex this will break. Update to:
```javascript
addBlock(worldInstances, target, blockTiles.stone);
```

### Instance object structure change
The instance objects pushed to `worldInstances` and `out` in `buildDynamicInstances` currently have shape `{ model, color }`. After the change:
- **Terrain blocks**: `{ model, tileIndex }` — no color field needed (color comes from atlas)
- **Dynamic instances** (creatures, sun, player body): `{ model, color, tileIndex: -1 }` — keep color, sentinel tileIndex
Update `updateInstanceBuffer` and `updateDynamicBuffer` to write the new field order: model (16) → color (4) → tileIndex (1).

---

## Out of Scope (this phase)

- Creature textures — kept as flat vertex colors via the `tileIndex = -1` sentinel
- Animated water — ripple normal map gives shimmer; full UV animation is a later addition
- Specular / PBR — normal maps + existing diffuse is the target; full PBR is a future step
