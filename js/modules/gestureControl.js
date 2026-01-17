// /js/modules/gestureControl.js
import { PokerAudio } from "/js/modules/audioLogic.js";

export const GestureControl = {
  // You should set this from world.js when the table is created:
  // GestureControl.tableHeight = WORLD.tableHeight;
  tableHeight: 0.8,

  // thresholds
  knockYSlack: 0.06,
  knockVelocityY: -0.55,
  knockDebounceMs: 420,

  _knockLock: false,
  _vacuumLock: false,

  update(handData) {
    if (!handData || !handData.position || !handData.velocity) return;

    const y = handData.position.y;
    const vy = handData.velocity.y;

    // Knock: downward hand “hits” table plane
    if (!this._knockLock && y <= (this.tableHeight + this.knockYSlack) && vy < this.knockVelocityY) {
      PokerAudio.playTableKnock({ intensity: 1.0 });
      this._knockLock = true;
      setTimeout(() => (this._knockLock = false), this.knockDebounceMs);
    }
  },

  triggerPotVacuum() {
    if (this._vacuumLock) return;
    this._vacuumLock = true;

    PokerAudio.playPotVacuum({ duration: 1.6, intensity: 1.0 });

    setTimeout(() => (this._vacuumLock = false), 1800);
  }
};
