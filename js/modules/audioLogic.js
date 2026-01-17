// /js/modules/audioLogic.js
// SCARLETT POKER AUDIO LOGIC (FULL) v1.1
// - Procedural SFX tuned for Quest/Android
// - Master bus with gentle limiter (prevents clipping)
// - Consistent params: { volume, intensity, duration }
// - Safe init/unlock patterns

export const PokerAudio = {
  ctx: null,
  master: null,
  limiter: null,
  post: null,
  _unlocked: false,

  init(opts = {}) {
    if (this.ctx) return this.ctx;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    const volume = typeof opts.volume === "number" ? opts.volume : 0.55;

    // Master gain
    this.master = this.ctx.createGain();
    this.master.gain.value = volume;

    // "Poor-man limiter": waveshaper + post-gain
    // (WebAudio has no native compressor-limiter that’s truly transparent on all devices;
    // this combo is stable on Quest.)
    this.limiter = this.ctx.createWaveShaper();
    this.limiter.curve = this._makeSoftClipCurve(0.90);
    this.limiter.oversample = "4x";

    this.post = this.ctx.createGain();
    this.post.gain.value = 1.0;

    this.master.connect(this.limiter);
    this.limiter.connect(this.post);
    this.post.connect(this.ctx.destination);

    return this.ctx;
  },

  setVolume(v = 0.55) {
    if (!this.master) return;
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.01);
  },

  async unlock() {
    // Call on pointerdown/touchstart to satisfy autoplay policies
    if (!this.ctx) this.init();
    if (this._unlocked) return true;

    try {
      if (this.ctx.state === "suspended") await this.ctx.resume();

      // Silent tick to force audio graph start
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.value = 0.00001;
      o.connect(g);
      g.connect(this.master);
      o.start();
      o.stop(this.ctx.currentTime + 0.02);

      this._unlocked = true;
      return true;
    } catch {
      return false;
    }
  },

  // ---------- SOUND HELPERS ----------
  _makeSoftClipCurve(amount = 0.9) {
    const n = 4096;
    const curve = new Float32Array(n);
    const k = amount * 20; // softness
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
    return curve;
  },

  _env(gainNode, t0, a, d, peak) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + a);
    g.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  },

  _noiseBuffer(seconds = 1.0) {
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * seconds));
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  },

  // ---------- SFX ----------
  // Card slide: noise + bandpass sweep + short env
  playCardSlide(opts = {}) {
    if (!this.ctx) this.init();
    const intensity = typeof opts.intensity === "number" ? opts.intensity : 1.0;
    const duration = typeof opts.duration === "number" ? opts.duration : 0.12;

    const t0 = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(duration);

    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(500, t0);

    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(1600, t0);
    bp.frequency.exponentialRampToValueAtTime(700, t0 + duration);

    const g = this.ctx.createGain();
    this._env(g, t0, 0.005, duration, 0.06 * intensity);

    src.connect(hp);
    hp.connect(bp);
    bp.connect(g);
    g.connect(this.master);

    src.start(t0);
    src.stop(t0 + duration);
  },

  // Chip clink: two sines + tiny noise click
  playChipSingle(opts = {}) {
    if (!this.ctx) this.init();
    const intensity = typeof opts.intensity === "number" ? opts.intensity : 1.0;
    const t0 = this.ctx.currentTime;

    const g = this.ctx.createGain();
    this._env(g, t0, 0.002, 0.09, 0.20 * intensity);

    // Main partial
    const o1 = this.ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.setValueAtTime(2400, t0);
    o1.frequency.exponentialRampToValueAtTime(1200, t0 + 0.08);

    // Secondary partial
    const o2 = this.ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(3200, t0);
    o2.frequency.exponentialRampToValueAtTime(1600, t0 + 0.07);

    // tiny click noise
    const n = this.ctx.createBufferSource();
    n.buffer = this._noiseBuffer(0.02);

    const nlp = this.ctx.createBiquadFilter();
    nlp.type = "lowpass";
    nlp.frequency.setValueAtTime(6000, t0);

    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.06 * intensity, t0);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);

    o1.connect(g);
    o2.connect(g);
    n.connect(nlp);
    nlp.connect(ng);

    g.connect(this.master);
    ng.connect(this.master);

    o1.start(t0); o2.start(t0);
    n.start(t0);

    o1.stop(t0 + 0.10);
    o2.stop(t0 + 0.10);
    n.stop(t0 + 0.03);
  },

  // Table knock: triangle + low boom
  playTableKnock(opts = {}) {
    if (!this.ctx) this.init();
    const intensity = typeof opts.intensity === "number" ? opts.intensity : 1.0;
    const t0 = this.ctx.currentTime;

    const g = this.ctx.createGain();
    this._env(g, t0, 0.002, 0.16, 0.55 * intensity);

    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(170, t0);
    o.frequency.exponentialRampToValueAtTime(55, t0 + 0.16);

    // Low thump
    const o2 = this.ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(90, t0);
    o2.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);

    const g2 = this.ctx.createGain();
    this._env(g2, t0, 0.002, 0.12, 0.25 * intensity);

    o.connect(g);
    o2.connect(g2);

    g.connect(this.master);
    g2.connect(this.master);

    o.start(t0); o2.start(t0);
    o.stop(t0 + 0.18);
    o2.stop(t0 + 0.14);
  },

  // Pot vacuum: noise through sweeping bandpass + subtle sine “pull”
  playPotVacuum(opts = {}) {
    if (!this.ctx) this.init();
    const intensity = typeof opts.intensity === "number" ? opts.intensity : 1.0;
    const duration = typeof opts.duration === "number" ? opts.duration : 1.5;

    const t0 = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(duration);

    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(120, t0);

    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;

    // suction sweep
    bp.frequency.setValueAtTime(220, t0);
    bp.frequency.exponentialRampToValueAtTime(2400, t0 + duration);

    // gentle resonance gain
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.30 * intensity, t0 + 0.10);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    // subtle tonal “pull” layer
    const tone = this.ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.setValueAtTime(140, t0);
    tone.frequency.exponentialRampToValueAtTime(420, t0 + duration);

    const tg = this.ctx.createGain();
    tg.gain.setValueAtTime(0.0001, t0);
    tg.gain.linearRampToValueAtTime(0.07 * intensity, t0 + 0.10);
    tg.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    src.connect(hp);
    hp.connect(bp);
    bp.connect(g);
    g.connect(this.master);

    tone.connect(tg);
    tg.connect(this.master);

    src.start(t0);
    src.stop(t0 + duration);

    tone.start(t0);
    tone.stop(t0 + duration);
  },
};
