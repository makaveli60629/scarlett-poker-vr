// /js/modules/audioLogic.js
// ScarlettVR Poker — Poker Audio Module (Procedural)
// ES Module — GitHub Pages safe imports (no bare specifiers)

export const PokerAudio = {
  ctx: null,
  master: null,
  sfxBus: null,
  limiter: null,
  _noiseBuffer: null,
  _unlocked: false,

  // Call on first user gesture (pointerdown/touchstart/controller select)
  async init({ volume = 0.55 } = {}) {
    if (this.ctx) return;

    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();

    // Master
    this.master = this.ctx.createGain();
    this.master.gain.value = volume;

    // SFX bus + limiter (Quest-friendly)
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 1.0;

    // Soft limiter / compressor to prevent clipping
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -14; // dB
    this.limiter.knee.value = 18;
    this.limiter.ratio.value = 6;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.12;

    this.sfxBus.connect(this.limiter);
    this.limiter.connect(this.master);
    this.master.connect(this.ctx.destination);

    this._noiseBuffer = this._makeNoiseBuffer(1.0); // 1s reusable
    await this.unlock();
  },

  async unlock() {
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch (_) {}
    }

    // “Prime” audio graph with a silent click to satisfy some devices
    if (!this._unlocked) {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      osc.frequency.setValueAtTime(30, t);
      osc.connect(g);
      g.connect(this.sfxBus);
      osc.start(t);
      osc.stop(t + 0.01);
      this._unlocked = true;
    }
  },

  setVolume(v) {
    if (!this.master) return;
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.02);
  },

  // ---------- Helpers ----------
  _makeNoiseBuffer(seconds = 1.0) {
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * seconds));
    const buffer = this.ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
    return buffer;
  },

  _env(gainNode, t, a = 0.005, d = 0.12, peak = 0.3, end = 0.0008) {
    // Click-safe envelope
    gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.setValueAtTime(0.00001, t);
    gainNode.gain.linearRampToValueAtTime(peak, t + a);
    gainNode.gain.exponentialRampToValueAtTime(end, t + a + d);
  },

  _rand(min, max) {
    return min + Math.random() * (max - min);
  },

  // ---------- SFX ----------
  playCardSlide({ intensity = 1.0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();

    osc.type = "sawtooth";
    lp.type = "lowpass";
    lp.Q.value = 0.6;

    const baseF = 420 * this._rand(0.9, 1.12);
    osc.frequency.setValueAtTime(baseF, t);
    osc.frequency.exponentialRampToValueAtTime(140 * this._rand(0.95, 1.1), t + 0.10);

    lp.frequency.setValueAtTime(1200, t);
    lp.frequency.exponentialRampToValueAtTime(650, t + 0.10);

    this._env(g, t, 0.003, 0.11, 0.06 * intensity, 0.0006);

    osc.connect(lp);
    lp.connect(g);
    g.connect(this.sfxBus);

    osc.start(t);
    osc.stop(t + 0.12);
  },

  playChipSingle({ intensity = 1.0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = "sine";
    const f = 2600 * this._rand(0.92, 1.12);
    osc.frequency.setValueAtTime(f, t);
    // tiny pitch drop = “clink”
    osc.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.06);

    this._env(g, t, 0.002, 0.07, 0.18 * intensity, 0.001);

    osc.connect(g);
    g.connect(this.sfxBus);

    osc.start(t);
    osc.stop(t + 0.08);
  },

  playTableKnock({ intensity = 1.0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    lp.type = "lowpass";
    lp.frequency.value = 260;

    const f0 = 160 * this._rand(0.9, 1.15);
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.14);

    this._env(g, t, 0.002, 0.14, 0.55 * intensity, 0.001);

    osc.connect(lp);
    lp.connect(g);
    g.connect(this.sfxBus);

    osc.start(t);
    osc.stop(t + 0.16);
  },

  // “Vacuum / Pot Win” — noise + sweeping bandpass + mild resonance
  playPotVacuum({ duration = 1.5, intensity = 1.0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Reused noise buffer (loop)
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;

    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = this._rand(2.5, 7.0);

    const g = this.ctx.createGain();

    // Sweep feels more “suction” if it starts low-mid and rises
    const fStart = this._rand(160, 260);
    const fEnd = this._rand(1600, 2800);

    bp.frequency.setValueAtTime(fStart, t);
    bp.frequency.exponentialRampToValueAtTime(fEnd, t + duration);

    // Envelope: smooth in, then tail out
    g.gain.setValueAtTime(0.00001, t);
    g.gain.linearRampToValueAtTime(0.26 * intensity, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0008, t + duration);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxBus);

    src.start(t);
    src.stop(t + duration + 0.05);
  }
};
