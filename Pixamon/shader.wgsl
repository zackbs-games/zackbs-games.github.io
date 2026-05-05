@group(0) @binding(0) var<uniform> viewProj  : mat4x4<f32>;
@group(0) @binding(1) var atlasSampler       : sampler;
@group(0) @binding(2) var atlasTex           : texture_2d<f32>;
@group(0) @binding(3) var normalTex          : texture_2d<f32>;

struct VertexInput {
  @location(0) position  : vec3<f32>,
  @location(1) normal    : vec3<f32>,
  @location(2) model0    : vec4<f32>,
  @location(3) model1    : vec4<f32>,
  @location(4) model2    : vec4<f32>,
  @location(5) model3    : vec4<f32>,
  @location(6) color     : vec4<f32>,
  @location(7) tileIndex : f32,
};

struct VertexOutput {
  @builtin(position)              clipPos     : vec4<f32>,
  @location(0)                    color       : vec4<f32>,
  @location(1)                    worldNormal : vec3<f32>,
  @location(2) @interpolate(flat) tileIndex   : f32,
  @location(3)                    localPos    : vec3<f32>,
};

@vertex fn main(input : VertexInput) -> VertexOutput {
  let model    = mat4x4<f32>(input.model0, input.model1, input.model2, input.model3);
  let worldPos = model * vec4<f32>(input.position, 1.0);
  var out : VertexOutput;
  out.clipPos     = viewProj * worldPos;
  out.color       = input.color;
  out.worldNormal = normalize((model * vec4<f32>(input.normal, 0.0)).xyz);
  out.tileIndex   = input.tileIndex;
  out.localPos    = input.position;
  return out;
}

@fragment fn frag(input : VertexOutput) -> @location(0) vec4<f32> {
  let lightDir = normalize(vec3<f32>(0.55, 1.0, 0.35));
  let ambient  = 0.25;
  let N        = normalize(input.worldNormal);
  let absN     = abs(N);

  // --- UV from face orientation ---
  var uv : vec2<f32>;
  if (absN.y > 0.5) {
    uv = fract(input.localPos.xz + 0.5);
  } else if (absN.x > 0.5) {
    uv = fract(input.localPos.zy + 0.5);
  } else {
    uv = fract(input.localPos.xy + 0.5);
  }

  // --- Select atlas column (handle grass/snow face variants) ---
  var col = input.tileIndex;
  if (absN.y > 0.5 && N.y < 0.0) {
    // bottom face of grass or snow → dirt
    if (col == 0.0 || col == 4.0) { col = 2.0; }
  } else if (absN.y < 0.5) {
    // side face of grass or snow → next tile column
    if (col == 0.0 || col == 4.0) { col = col + 1.0; }
  }

  let atlasUV = vec2<f32>((col + uv.x) / 10.0, uv.y / 10.0);

  // --- Sample colour atlas ---
  let texColor = textureSample(atlasTex, atlasSampler, atlasUV);

  // --- Sample & apply normal map ---
  let nSample = textureSample(normalTex, atlasSampler, atlasUV).xyz * 2.0 - 1.0;

  // TBN: tangent aligned with face's horizontal UV axis so normal-map
  // horizontal variation maps to horizontal world perturbation on all faces.
  var T : vec3<f32>;
  if (absN.x > 0.5) {
    // X-face UV: uv.x = localPos.z → tangent along ±Z
    T = vec3<f32>(0.0, 0.0, select(-1.0, 1.0, N.x < 0.0));
  } else {
    T = vec3<f32>(1.0, 0.0, 0.0);
  }
  let B          = cross(N, T);
  let bumpNormal = normalize(T * nSample.x + B * nSample.y + N * nSample.z);

  // --- Blend: atlas for blocks (tileIndex >= 0), vertex color for creatures/dynamic ---
  let useAtlas    = step(0.0, input.tileIndex);
  let finalColor  = mix(input.color, texColor, useAtlas);
  // Only apply bump normal on top/bottom faces — sides look banded with mostly-overhead light
  let applyBump   = useAtlas * step(0.5, absN.y);
  let finalNorm   = mix(N, bumpNormal, applyBump);

  let diffuse = max(dot(finalNorm, lightDir), 0.0);
  let light   = ambient + (1.0 - ambient) * diffuse;

  return vec4<f32>(finalColor.rgb * light, finalColor.a);
}
