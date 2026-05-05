struct VertexInput {
  @location(0) position: vec2f,   // quad corner (-0.5..0.5)
  @location(1) uv: vec2f,
};

struct InstanceInput {
  @location(2) worldPos: vec2f,   // center in world pixels
  @location(3) size: vec2f,
  @location(4) uvOffset: vec2f,   // top-left UV in atlas
  @location(5) uvSize: vec2f,     // UV region size in atlas
  @location(6) tint: vec4f,       // RGBA tint (1,1,1,1 = no tint)
  @location(7) flags: f32,        // bit0 = flipX
};

struct Uniforms {
  viewSize: vec2f,  // canvas size in pixels
  time: f32,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var spriteTexture: texture_2d<f32>;
@group(0) @binding(2) var spriteSampler: sampler;

struct VaryingOutput {
  @builtin(position) clipPos: vec4f,
  @location(0) uv: vec2f,
  @location(1) tint: vec4f,
};

@vertex
fn vs_main(vert: VertexInput, inst: InstanceInput) -> VaryingOutput {
  var out: VaryingOutput;

  var localPos = vert.position;
  // flip X if flagged
  if (inst.flags > 0.5) {
    localPos.x = -localPos.x;
  }

  let worldPos = inst.worldPos + localPos * inst.size;
  // convert to clip space: origin top-left
  let clip = vec2f(
    (worldPos.x / uniforms.viewSize.x) * 2.0 - 1.0,
    1.0 - (worldPos.y / uniforms.viewSize.y) * 2.0
  );
  out.clipPos = vec4f(clip, 0.0, 1.0);
  out.uv = inst.uvOffset + vert.uv * inst.uvSize;
  out.tint = inst.tint;
  return out;
}

@fragment
fn fs_main(in: VaryingOutput) -> @location(0) vec4f {
  let color = textureSample(spriteTexture, spriteSampler, in.uv);
  // discard transparent pixels
  if (color.a < 0.05) { discard; }
  return vec4f(color.rgb * in.tint.rgb, color.a * in.tint.a);
}
