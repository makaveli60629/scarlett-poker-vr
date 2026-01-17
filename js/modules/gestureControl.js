// /js/modules/gestureControl.js
// SCARLETT VR POKER — Gesture ↔ Audio bridge (FULL) v1.1
// - Uses hand position + velocity
// - Debounced knock detection
// - Safe vacuum trigger

import { PokerAudio } from "/js/modules/audioLogic.js";

export const GestureControl = {
  tableHeight: 0.8,

  // tuning
  knockSlack: 0.06,
  knockVelocityY: -0.55,
  knockDebounceMs: 420,

  _knockLock: false,
  _vacuumLock: false,

  update(handData) {
    if (!handData || !handData.position || !handData.velocity) return;

    const y = handData.position.y;
    const vy = handData.velocity.y;

    // Knock if hand is close to table and moving downward fast enough
    if (!this._knockLock &&
        y < (this.tableHeight + this.knockSlack) &&
        vy < this.knockVelocityY) {

      PokerAudio.playTableKnock({ intensity: 1.0 });

      this._knockLock = true;
      setTimeout(() => (this._knockLock = false), this.knockDebounceMs);
    }
  },

  triggerPotVacuum(opts = {}) {
    if (this._vacuumLock) return;
    this._vacuumLock = true;

    PokerAudio.playPotVacuum({
      duration: typeof opts.duration === "number" ? opts.duration : 1.6,
      intensity: typeof opts.intensity === "number" ? opts.intensity : 1.0
    });

    setTimeout(() => (this._vacuumLock = false), 1800);
  }
};
