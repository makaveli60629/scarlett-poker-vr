// js/audio.js
// Quest + Mobile safe background audio helper (user gesture required)

export function initAudio({
  url = "./assets/lobby_ambience.mp3",
  volume = 0.35,
  loop = true
} = {}) {
  const music = new Audio(url);
  music.loop = loop;
  music.preload = "auto";
  music.crossOrigin = "anonymous";
  music.volume = clamp01(volume);

  let enabled = false;

  async function enable() {
    if (enabled) return true;
    try {
      await music.play(); // must be called after user gesture / XR session start
      enabled = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  function setVolume(v) {
    music.volume = clamp01(v);
  }

  function mute() {
    music.muted = true;
  }

  function unmute() {
    music.muted = false;
  }

  function stop() {
    music.pause();
    music.currentTime = 0;
    enabled = false;
  }

  function isEnabled() {
    return enabled;
  }

  return { enable, setVolume, mute, unmute, stop, isEnabled, music };
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
                              }
