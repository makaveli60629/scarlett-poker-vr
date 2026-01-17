// /js/modules/pokerAudio.module.js
// Scarlett module wrapper for PokerAudio + global SCARLETT.sfx hooks (FULL)

import { PokerAudio } from './audioLogic.js';
import { GestureControl } from './gestureControl.js';

export default {
  id: 'pokerAudio.module.js',

  async init({ log }) {
    await PokerAudio.init({ volume: 0.55 });

    // unlock on first interaction (Quest requirement)
    const unlock = async () => {
      try {
        await PokerAudio.init({ volume: 0.55 });
        await PokerAudio.unlock();
      } catch (_) {}
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.sfx = window.SCARLETT.sfx || {};

    window.SCARLETT.sfx.card = () => PokerAudio.playCardSlide();
    window.SCARLETT.sfx.chip = () => PokerAudio.playChipSingle();
    window.SCARLETT.sfx.knock = () => PokerAudio.playTableKnock();
    window.SCARLETT.sfx.vacuum = () => GestureControl.triggerPotVacuum();

    window.SCARLETT.audioTest = async () => {
      await PokerAudio.init({ volume: 0.55 });
      await PokerAudio.unlock?.();
      PokerAudio.playCardSlide();
      setTimeout(() => PokerAudio.playChipSingle(), 120);
      setTimeout(() => PokerAudio.playTableKnock(), 240);
      setTimeout(() => PokerAudio.playPotVacuum({ duration: 1.2 }), 420);
      return { ok: true, time: new Date().toISOString() };
    };

    log?.('pokerAudio.module ✅');
  },

  test() {
    const ok = !!window.SCARLETT?.sfx?.chip;
    return { ok, note: ok ? 'sfx hooks present' : 'sfx missing' };
  }
};
