// js/audio.js
export function initAudio({
  url = "./assets/lobby_ambience.mp3",
  volume = 0.35
} = {}) {
  const music = new Audio(url);
  music.loop = true;
  music.preload = "auto";
  music.crossOrigin = "anonymous";
  music.volume = volume;

  let enabled = false;

  async function enable() {
    if (enabled) return true;
    try {
      await music.play();   // must be user-gesture unlocked
      enabled = true;
      return true;
    } catch {
      return false;
    }
  }

  function setVolume(v) {
    music.volume = Math.max(0, Math.min(1, v));
  }

  function stop() {
    music.pause();
    music.currentTime = 0;
    enabled = false;
  }

  return { enable, setVolume, stop, music };
}
