export const AudioSys = {
  audio: null,
  enabled: false,
  loaded: false,

  async init() {
    if (this.loaded) return true;

    try {
      this.audio = new Audio("./assets/audio/lobby_ambience.mp3");
      this.audio.loop = true;
      this.audio.volume = 0.55;

      // try warm load
      this.audio.load();
      this.loaded = true;
      return true;
    } catch (e) {
      console.warn("Audio init failed:", e);
      return false;
    }
  },

  async on() {
    await this.init();
    if (!this.audio) return { ok:false, msg:"Audio object missing." };

    try {
      // browsers require user gesture — call from button/trigger
      await this.audio.play();
      this.enabled = true;
      return { ok:true, msg:"Music ON ✅" };
    } catch (e) {
      console.warn("Audio play blocked:", e);
      this.enabled = false;
      return { ok:false, msg:"Music blocked — press again after interacting." };
    }
  },

  off() {
    if (!this.audio) return { ok:false, msg:"No audio loaded." };
    this.audio.pause();
    this.enabled = false;
    return { ok:true, msg:"Music OFF ✅" };
  },

  async toggle() {
    if (!this.loaded) await this.init();
    if (!this.audio) return { ok:false, msg:"Audio missing." };
    return this.enabled ? this.off() : await this.on();
  }
};
