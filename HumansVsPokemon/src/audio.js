// Procedural audio using Web Audio API — no sound files required.
// AudioContext is created lazily on first user interaction (browser policy).

export class AudioManager {
  constructor() {
    this._ctx    = null;
    this.volume  = 0.35;
    this.muted   = false;
    // Per-sound cooldowns (seconds) to avoid ear-splitting stacking
    this._cooldowns = {};
  }

  // Must be called from a user gesture to unlock the AudioContext
  resume() {
    const ctx = this._getCtx();
    if (ctx.state === 'suspended') ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._ctx;
  }

  // Returns a master gain node wired to destination
  _out() {
    const ctx = this._getCtx();
    const g = ctx.createGain();
    g.gain.value = this.muted ? 0 : this.volume;
    g.connect(ctx.destination);
    return { ctx, out: g };
  }

  // Rate-limit a sound; returns false if on cooldown
  _throttle(id, minGap) {
    const now = this._getCtx().currentTime;
    if (this._cooldowns[id] && now < this._cooldowns[id]) return false;
    this._cooldowns[id] = now + minGap;
    return true;
  }

  // Sine/triangle oscillator with frequency sweep and gain envelope
  _tone(freq, endFreq, type, duration, vol, delayS = 0) {
    const { ctx, out } = this._out();
    const t   = ctx.currentTime + delayS;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t + duration);
    }
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // White-noise burst through a biquad filter
  _noise(duration, filterFreq, filterType, vol, delayS = 0) {
    const { ctx, out } = this._out();
    const t  = ctx.currentTime + delayS;
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.ceil(sr * duration), sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    const src  = ctx.createBufferSource();
    src.buffer = buf;

    const filt = ctx.createBiquadFilter();
    filt.type  = filterType || 'bandpass';
    filt.frequency.value = filterFreq;
    filt.Q.value = 1.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);

    src.connect(filt);
    filt.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  // ── Game sounds ──────────────────────────────────────────────────────────────

  berry() {
    if (!this._throttle('berry', 0.05)) return;
    this._tone(880,  1320, 'sine', 0.07, 0.35);
    this._tone(1320, 1760, 'sine', 0.06, 0.25, 0.07);
  }

  place() {
    this._tone(280, 460, 'sine', 0.12, 0.45);
    this._noise(0.08, 1800, 'highpass', 0.15);
  }

  sell() {
    this._tone(600, 220, 'sine',   0.20, 0.40);
    this._tone(380, 180, 'triangle', 0.14, 0.25, 0.05);
  }

  evolve() {
    [440, 554, 659, 880, 1100].forEach((f, i) => {
      this._tone(f, f * 1.04, 'sine', 0.13, 0.5, i * 0.09);
    });
    this._noise(0.35, 5000, 'highpass', 0.12, 0.35);
  }

  // Pokemon projectile sounds — keyed by soundType on the projectile
  shoot(soundType) {
    if (!this._throttle('shoot_' + soundType, 0.06)) return;
    switch (soundType) {
      case 'leaf':
        this._noise(0.10, 3800, 'bandpass', 0.40);
        this._tone(700, 1000, 'sine', 0.08, 0.18);
        break;
      case 'water':
        this._noise(0.16, 700, 'bandpass', 0.30);
        this._tone(260, 180, 'sine', 0.16, 0.22);
        break;
      case 'thunder':
        this._noise(0.05, 9000, 'highpass', 0.65);
        this._tone(500, 80,  'sawtooth', 0.07, 0.45);
        break;
      case 'rock':
        this._tone(70, 35, 'sine',   0.24, 0.70);
        this._noise(0.14, 280, 'lowpass', 0.40);
        break;
      case 'ember':
        this._noise(0.14, 2200, 'bandpass', 0.50);
        this._tone(320, 180, 'sawtooth', 0.12, 0.35);
        this._noise(0.10, 4000, 'highpass', 0.20, 0.06);
        break;
      case 'confuse':
        this._tone(440, 660, 'sine',     0.18, 0.40);
        this._tone(330, 220, 'triangle', 0.18, 0.30, 0.06);
        this._tone(550, 440, 'sine',     0.14, 0.25, 0.12);
        break;
    }
  }

  pokeball() {
    if (!this._throttle('pokeball', 0.08)) return;
    this._noise(0.14, 1100, 'bandpass', 0.32);
    this._tone(340, 130, 'sine', 0.14, 0.28);
  }

  hitPokemon() {
    if (!this._throttle('hitPokemon', 0.04)) return;
    this._noise(0.10, 450, 'bandpass', 0.45);
    this._tone(280, 70, 'sine', 0.14, 0.35);
  }

  hitHuman() {
    if (!this._throttle('hitHuman', 0.04)) return;
    this._tone(480, 180, 'sine',   0.10, 0.45);
    this._noise(0.07, 2200, 'bandpass', 0.28);
  }

  denHit() {
    // Deep alarming boom — no throttle, always plays
    this._tone(52,  38,  'sine', 0.65, 0.85);
    this._tone(104, 78,  'sine', 0.45, 0.55);
    this._noise(0.30, 180, 'lowpass', 0.45);
  }
}
