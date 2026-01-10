// /js/ui.js — UI v4 (FULL)
// Provides a working menu with: Lobby / Store / Scorpion / Spectate + Music toggle.

export const UI = {
  init(ctx) {
    const log = ctx.log || console.log;

    // Create a simple audio system (autoplay blocked until user taps)
    const music = makeMusicSystem([
      "./assets/music/lobby1.mp3",
      "./assets/music/lobby2.mp3",
      "./assets/music/devbeat.mp3",
    ], log);

    ctx.systems.ui = { music };

    // Hook HUD buttons if present (your index has these events already)
    // We add menu commands via keyboard shortcuts too.
    window.addEventListener("keydown", (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "1") window.dispatchEvent(new CustomEvent("scarlett-goto", { detail: "lobby" }));
      if (k === "2") window.dispatchEvent(new CustomEvent("scarlett-goto", { detail: "store" }));
      if (k === "3") window.dispatchEvent(new CustomEvent("scarlett-goto", { detail: "scorpion" }));
      if (k === "4") window.dispatchEvent(new CustomEvent("scarlett-goto", { detail: "spectate" }));
      if (k === "m") music.toggle();
    });

    // Add UI events (so your VR panel can call these later)
    window.addEventListener("scarlett-ui", (e) => {
      const cmd = String(e?.detail || "");
      if (cmd === "music") music.toggle();
      if (cmd === "lobby") window.dispatchEvent(new CustomEvent("scarlett-goto", { detail: "lobby" }));
      if (cmd === "store") window.dispatchEvent(new CustomEvent("scarlett-goto", { detail: "store" }));
      if (cmd === "scorpion") window.dispatchEvent(new CustomEvent("scarlett-goto", { detail: "scorpion" }));
      if (cmd === "spectate") window.dispatchEvent(new CustomEvent("scarlett-goto", { detail: "spectate" }));
    });

    log("[ui] init ✅ menu + audio ready");
    return ctx.systems.ui;
  }
};

function makeMusicSystem(list, log) {
  let idx = 0;
  const audio = new Audio();
  audio.loop = false;
  audio.volume = 0.65;

  audio.addEventListener("ended", () => {
    idx = (idx + 1) % list.length;
    audio.src = list[idx];
    audio.play().catch(() => {});
  });

  function play() {
    audio.src = list[idx];
    audio.play().then(() => log("[audio] ▶️ music playing")).catch(() => log("[audio] ⚠️ tap required to start"));
  }
  function stop() {
    audio.pause();
    log("[audio] ⏸️ music paused");
  }
  function toggle() {
    if (audio.paused) play();
    else stop();
  }

  // First user gesture unlock
  const unlock = () => {
    window.removeEventListener("pointerdown", unlock);
    // do nothing; user can press M or menu button
    log("[audio] unlocked ✅ (press M or UI Music)");
  };
  window.addEventListener("pointerdown", unlock, { once: true });

  return { toggle, play, stop, audio };
}
