// WebGPU instanced sprite renderer
// Each draw call renders all sprites in one instanced drawIndexed.

const MAX_SPRITES = 2048;

// Per-instance layout: worldPos(2) + size(2) + uvOffset(2) + uvSize(2) + tint(4) + flags(1) = 13 floats
const FLOATS_PER_INSTANCE = 13;
const BYTES_PER_INSTANCE = FLOATS_PER_INSTANCE * 4;

export class Renderer {
  constructor(device, context, format, canvasWidth, canvasHeight) {
    this.device = device;
    this.context = context;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this._instanceData = new Float32Array(MAX_SPRITES * FLOATS_PER_INSTANCE);
    this._spriteCount = 0;
    this._pipeline = null;
    this._bindGroup = null;
    this._atlasTexture = null;
    this._uniformBuffer = null;
    this._instanceBuffer = null;
    this._vertexBuffer = null;
    this._indexBuffer = null;

    this._setupBuffers();
  }

  _setupBuffers() {
    const dev = this.device;

    // Unit quad: positions (-0.5..0.5) and UVs (0..1)
    // layout: x, y, u, v
    const quadVerts = new Float32Array([
      -0.5,  0.5,   0.0, 0.0,  // top-left
       0.5,  0.5,   1.0, 0.0,  // top-right
       0.5, -0.5,   1.0, 1.0,  // bottom-right
      -0.5, -0.5,   0.0, 1.0,  // bottom-left
    ]);
    this._vertexBuffer = dev.createBuffer({
      size: quadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    dev.queue.writeBuffer(this._vertexBuffer, 0, quadVerts);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    this._indexBuffer = dev.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    dev.queue.writeBuffer(this._indexBuffer, 0, indices);

    this._instanceBuffer = dev.createBuffer({
      size: MAX_SPRITES * BYTES_PER_INSTANCE,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this._uniformBuffer = dev.createBuffer({
      size: 16, // viewSize(2) + time(1) + pad(1) = 4 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  async init(shaderCode, format = 'bgra8unorm') {
    this._format = format;
    const dev = this.device;

    // Create 1x1 white fallback texture until atlas is loaded
    this._atlasTexture = dev.createTexture({
      size: [1, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    dev.queue.writeTexture(
      { texture: this._atlasTexture },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4 },
      [1, 1]
    );

    this._sampler = dev.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    const module = dev.createShaderModule({ code: shaderCode });

    const bindGroupLayout = dev.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ],
    });

    this._pipeline = dev.createRenderPipeline({
      layout: dev.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: {
        module,
        entryPoint: 'vs_main',
        buffers: [
          {
            // vertex buffer: position + uv
            arrayStride: 4 * 4,
            stepMode: 'vertex',
            attributes: [
              { shaderLocation: 0, offset: 0,     format: 'float32x2' }, // position
              { shaderLocation: 1, offset: 4 * 2, format: 'float32x2' }, // uv
            ],
          },
          {
            // instance buffer
            arrayStride: BYTES_PER_INSTANCE,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 2, offset:  0,      format: 'float32x2' }, // worldPos
              { shaderLocation: 3, offset:  4 * 2,  format: 'float32x2' }, // size
              { shaderLocation: 4, offset:  4 * 4,  format: 'float32x2' }, // uvOffset
              { shaderLocation: 5, offset:  4 * 6,  format: 'float32x2' }, // uvSize
              { shaderLocation: 6, offset:  4 * 8,  format: 'float32x4' }, // tint
              { shaderLocation: 7, offset:  4 * 12, format: 'float32'   }, // flags
            ],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: 'fs_main',
        targets: [{
          format: this._format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one',       dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this._bindGroup = dev.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this._uniformBuffer } },
        { binding: 1, resource: this._atlasTexture.createView() },
        { binding: 2, resource: this._sampler },
      ],
    });

    this._bindGroupLayout = bindGroupLayout;
  }

  async loadAtlas(imageBitmap) {
    const dev = this.device;
    const tex = dev.createTexture({
      size: [imageBitmap.width, imageBitmap.height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    dev.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: tex },
      [imageBitmap.width, imageBitmap.height]
    );
    this._atlasTexture = tex;
    // Rebuild bind group with new texture
    this._bindGroup = dev.createBindGroup({
      layout: this._bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this._uniformBuffer } },
        { binding: 1, resource: this._atlasTexture.createView() },
        { binding: 2, resource: this._sampler },
      ],
    });
  }

  beginFrame(time) {
    this._spriteCount = 0;
    // Update uniforms
    const uniforms = new Float32Array([this.canvasWidth, this.canvasHeight, time, 0]);
    this.device.queue.writeBuffer(this._uniformBuffer, 0, uniforms);
  }

  // Draw a colored rectangle sprite (solid color using white atlas pixel)
  drawRect(cx, cy, w, h, r, g, b, a = 1) {
    this.drawSprite(cx, cy, w, h, 0, 0, 1, 1, r, g, b, a, 0);
  }

  // Full sprite draw
  drawSprite(cx, cy, w, h, uvX, uvY, uvW, uvH, r, g, b, a, flipX) {
    if (this._spriteCount >= MAX_SPRITES) return;
    const i = this._spriteCount * FLOATS_PER_INSTANCE;
    const d = this._instanceData;
    d[i + 0]  = cx;
    d[i + 1]  = cy;
    d[i + 2]  = w;
    d[i + 3]  = h;
    d[i + 4]  = uvX;
    d[i + 5]  = uvY;
    d[i + 6]  = uvW;
    d[i + 7]  = uvH;
    d[i + 8]  = r;
    d[i + 9]  = g;
    d[i + 10] = b;
    d[i + 11] = a;
    d[i + 12] = flipX ? 1 : 0;
    this._spriteCount++;
  }

  endFrame() {
    if (this._spriteCount === 0) return;

    const dev = this.device;
    dev.queue.writeBuffer(
      this._instanceBuffer, 0,
      this._instanceData, 0,
      this._spriteCount * FLOATS_PER_INSTANCE
    );

    const encoder = dev.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.05, g: 0.08, b: 0.12, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    pass.setPipeline(this._pipeline);
    pass.setBindGroup(0, this._bindGroup);
    pass.setVertexBuffer(0, this._vertexBuffer);
    pass.setVertexBuffer(1, this._instanceBuffer);
    pass.setIndexBuffer(this._indexBuffer, 'uint16');
    pass.drawIndexed(6, this._spriteCount, 0, 0, 0);
    pass.end();
    dev.queue.submit([encoder.finish()]);
  }
}
