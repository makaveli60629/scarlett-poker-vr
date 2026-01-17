// /js/modules/pokerAudio.module.js
// SCARLETT MODULE — Poker Audio (Procedural) wrapper (FULL)

import { PokerAudio } from "/js/modules/audioLogic.js";
import { GestureControl } from "/js/modules/gestureControl.js";

export default {
  id: "pokerAudio.module.js",

  async init({ DIAG }) {
    const log = (s) => DIAG?.write?.(String(s)) || console.log("[pokerAudio.module]", s);

    window.SCARLETT = window.SCARLETT || {};

    // Unlock audio on first gesture (Quest/Android requirement)
    const unlockOnce = async () => {
      try {
        await PokerAudio.init({ volume: 0.55 });
        await PokerAudio.unlock?.();
        log("PokerAudio unlocked ✅");
      } catch (e) {
        console.error("[pokerAudio.module] unlock failed", e);
      } finally {
        window.removeEventListener("pointerdown", unlockOnce);
        window.removeEventListener("touchstart", unlockOnce);
      }
    };
    window.addEventListener("pointerdown", unlockOnce, { passive: true });
    window.addEventListener("touchstart", unlockOnce, { passive: true });

    // Panel + game hooks
    window.SCARLETT.audioTest = async () => {
      await PokerAudio.init({ volume: 0.55 });
      PokerAudio.playCardSlide();
      setTimeout(() => PokerAudio.playChipSingle(), 120);
      setTimeout(() => PokerAudio.playTableKnock(), 240);
      setTimeout(() => PokerAudio.playPotVacuum({ duration: 1.2 }), 420);
      return { ok: true, module: "pokerAudio.module.js" };
    };

    window.SCARLETT.sfx = {
      card: () => PokerAudio.playCardSlide(),
      chip: () => PokerAudio.playChipSingle(),
      knock: () => PokerAudio.playTableKnock(),
      vacuum: () => GestureControl.triggerPotVacuum()
    };

    log("Poker Audio module ready ✅");
  },

  async test() {
    try {
      await PokerAudio.init({ volume: 0.55 });
      PokerAudio.playChipSingle();
      return { ok: true, note: "chip sound fired" };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }
};
