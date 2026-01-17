// /js/modules/audioLogic.js
// SCARLETT PokerAudio — WebAudio procedural SFX (FULL)
// Exports: PokerAudio (named) + default

export const PokerAudio = {
  ctx: null,
  master: null,
  _unlocked: false,
  _lastInit: 0,

  async init(opts = {}) {
    if (this.ctx) {
      if (typeof opts.volume === 'number') this.setVolume(opts.volume);
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = typeof opts.volume === 'number' ? opts.volume : 0.55;
    this.master.connect(this.ctx.destination);
    this._lastInit = Date.now();
    return true;
  },

  setVolume(v = 0.55) {
    if (!this.master || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), t, 0.02);
  },

  async unlock() {
    if (!this.ctx) return false;
    if (this._unlocked) return true;
    try {
      // Resume is required on Quest/Android
      await this.ctx.resume();
      // tiny silent buffer to fully unlock
      const buf = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.master);
      src.start(0);
      this._unlocked = true;
      return true;
    } catch (_) {
      return false;
    }
  },

  // ---- helpers ----
  _env(gain, t0, a = 0.001, d = 0.08, s = 0.0, r = 0.12, peak = 0.3) {
    // ADSR-ish envelope on GainNode
    gain.gain.cancelScheduledValues(t0);
    gain.gain.setValueAtTime(0.00001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.00002, peak), t0 + a);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.00002, peak * 0.35), t0 + a + d);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.00002, peak * s), t0 + a + d + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.00001, t0 + a + d + r);
  },

  // ---- SFX ----
  playTableKnock({ intensity = 1.0 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t0);
    osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t0);
    filter.frequency.exponentialRampToValueAtTime(220, t0 + 0.12);

    const peak = 0.55 * Math.max(0.2, Math.min(1.5, intensity));
    this._env(gain, t0, 0.001, 0.06, 0.0, 0.14, peak);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start(t0);
    osc.stop(t0 + 0.18);
  },

  playChipSingle({ intensity = 1.0 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const bp = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, t0);
    osc.frequency.exponentialRampToValueAtTime(3400, t0 + 0.02);

    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3000, t0);
    bp.Q.setValueAtTime(8, t0);

    const peak = 0.20 * Math.max(0.2, Math.min(1.8, intensity));
    gain.gain.setValueAtTime(peak, t0);
    gain.gain.exponentialRampToValueAtTime(0.00001, t0 + 0.09);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(this.master);

    osc.start(t0);
    osc.stop(t0 + 0.10);
  },

  playCardSlide({ intensity = 1.0 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;

    const noiseDur = 0.10;
    const bufferSize = Math.floor(this.ctx.sampleRate * noiseDur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(400, t0);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2200, t0);
    lp.frequency.exponentialRampToValueAtTime(900, t0 + noiseDur);

    const gain = this.ctx.createGain();
    const peak = 0.10 * Math.max(0.2, Math.min(1.8, intensity));
    gain.gain.setValueAtTime(peak, t0);
    gain.gain.exponentialRampToValueAtTime(0.00001, t0 + noiseDur);

    src.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(this.master);

    src.start(t0);
    src.stop(t0 + noiseDur);
  },

  // Vacuum: white noise through sweeping bandpass
  playPotVacuum({ duration = 1.6, intensity = 1.0 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const dur = Math.max(0.4, Math.min(3.0, duration));

    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.setValueAtTime(7, t0);
    bp.frequency.setValueAtTime(180, t0);
    bp.frequency.exponentialRampToValueAtTime(2400, t0 + dur);

    const gain = this.ctx.createGain();
    const peak = 0.30 * Math.max(0.2, Math.min(2.0, intensity));
    gain.gain.setValueAtTime(0.00001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.00001, t0 + dur);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.master);

    src.start(t0);
    src.stop(t0 + dur);
  }
};

export default PokerAudio;
