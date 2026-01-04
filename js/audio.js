export const AudioSys = {
  ctx: null,
  gain: null,
  source: null,
  isOn: false,
  url: "./assets/audio/lobby_ambience.mp3",

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.35;
    this.gain.connect(this.ctx.destination);
  },

  async toggle(statusLineEl) {
    try {
      await this.init();

      if (!this.isOn) {
        // Must be called from user gesture (button press) — which we do.
        if (this.ctx.state === "suspended") await this.ctx.resume();

        const res = await fetch(this.url);
        if (!res.ok) throw new Error(`Audio missing: ${this.url}`);
        const buf = await res.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(buf);

        this.source = this.ctx.createBufferSource();
        this.source.buffer = audioBuffer;
        this.source.loop = true;
        this.source.connect(this.gain);
        this.source.start(0);

        this.isOn = true;
        if (statusLineEl) statusLineEl.textContent = "Status: Audio ON ✅";
      } else {
        if (this.source) this.source.stop();
        this.source = null;
        this.isOn = false;
        if (statusLineEl) statusLineEl.textContent = "Status: Audio OFF ✅";
      }
    } catch (e) {
      console.warn(e);
      if (statusLineEl) statusLineEl.textContent = `Status: Audio error ⚠️ (${e.message})`;
    }
  }
};
