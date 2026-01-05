// js/audio.js — Safe Audio module
export const Audio = {
  ctx: null,
  gain: null,
  el: null,
  enabled: false,

  async init(url = "assets/lobby_ambience.mp3", volume = 0.35) {
    try {
      // Create HTML audio element
      this.el = new window.Audio(url);
      this.el.loop = true;
      this.el.crossOrigin = "anonymous";
      this.el.volume = Math.max(0, Math.min(1, volume));

      // WebAudio bridge (optional, safer on Quest)
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        const source = this.ctx.createMediaElementSource(this.el);
        this.gain = this.ctx.createGain();
        this.gain.gain.value = this.el.volume;
        source.connect(this.gain).connect(this.ctx.destination);
      }

      this.enabled = true;
      return true;
    } catch (e) {
      console.warn("Audio.init failed:", e);
      this.enabled = false;
      return false;
    }
  },

  async play() {
    try {
      if (!this.enabled || !this.el) return false;
      if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
      await this.el.play();
      return true;
    } catch (e) {
      // Usually blocked until a user gesture
      console.warn("Audio.play blocked:", e);
      return false;
    }
  },

  stop() {
    try {
      if (this.el) this.el.pause();
    } catch {}
  },

  setVolume(v) {
    const vol = Math.max(0, Math.min(1, v));
    if (this.el) this.el.volume = vol;
    if (this.gain) this.gain.gain.value = vol;
  }
};
