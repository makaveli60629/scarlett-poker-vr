export const AudioSystem = {
  audio: null,
  hub: null,

  init({ hub }) {
    this.hub = hub;
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.volume = 0.35;

    // Safe: if missing, it won’t crash
    this.audio.src = "./assets/audio/lobby_ambience.mp3";
    this.audio.addEventListener("canplay", () => hub?.addLine?.("✅ Audio loaded"));
    this.audio.addEventListener("error", () => hub?.addLine?.("⚠️ Audio missing: assets/audio/lobby_ambience.mp3 (safe)"));

    // Must be user-gesture to start on mobile: click anywhere once
    window.addEventListener("pointerdown", () => {
      this.audio?.play?.().catch(() => {});
    }, { once: true });

    // UI toggle hotkey (if keyboard exists)
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "p") {
        if (this.audio.paused) this.audio.play().catch(() => {});
        else this.audio.pause();
      }
    });
  },

  update() {},
};
