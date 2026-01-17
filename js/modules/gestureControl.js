// /js/modules/pokerAudio.module.js
// SCARLETT MODULE — Poker Audio (Procedural) wrapper (FULL) v1.2 PATH-SAFE
// IMPORTANT: Uses relative imports so it works on GitHub Pages project sites.

import { PokerAudio } from "./audioLogic.js";
import { GestureControl } from "./gestureControl.js";

export default {
  id: "pokerAudio.module.js",

  async init({ DIAG }) {
    const write = (s) => {
      try { DIAG?.write?.(String(s)); } catch (_) {}
      console.log("[pokerAudio.module]", s);
    };

    window.SCARLETT = window.SCARLETT || {};

    // Expose audio engine for debugging
    window.SCARLETT.audio = PokerAudio;

    // Unlock audio on first gesture (Quest/Android requirement)
    const unlockOnce = async () => {
      try {
        PokerAudio.init({ volume: 0.55 });
        await PokerAudio.unlock?.();
        write("PokerAudio unlocked ✅");
      } catch (e) {
        console.error("[pokerAudio.module] unlock failed", e);
      } finally {
        window.removeEventListener("pointerdown", unlockOnce);
        window.removeEventListener("touchstart", unlockOnce);
      }
    };
    window.addEventListener("pointerdown", unlockOnce, { passive: true });
    window.addEventListener("touchstart", unlockOnce, { passive: true });

    // Panel / debug sound test
    window.SCARLETT.audioTest = async () => {
      PokerAudio.init({ volume: 0.55 });
      await PokerAudio.unlock?.();

      PokerAudio.playCardSlide?.();
      setTimeout(() => PokerAudio.playChipSingle?.(), 120);
      setTimeout(() => PokerAudio.playTableKnock?.(), 240);
      setTimeout(() => PokerAudio.playPotVacuum?.({ duration: 1.2 }), 420);

      return { ok: true, module: "pokerAudio.module.js" };
    };

    // Extra alias
    window.__scarlettAudioTest = window.SCARLETT.audioTest;

    // Hooks for game logic
    window.SCARLETT.sfx = {
      card: () => PokerAudio.playCardSlide?.(),
      chip: () => PokerAudio.playChipSingle?.(),
      knock: () => PokerAudio.playTableKnock?.(),
      vacuum: () => GestureControl.triggerPotVacuum?.()
    };

    write("Poker Audio module ready ✅");
  },

  async test() {
    try {
      PokerAudio.init({ volume: 0.55 });
      await PokerAudio.unlock?.();
      PokerAudio.playChipSingle?.();
      return { ok: true, note: "chip sound fired" };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }
};
