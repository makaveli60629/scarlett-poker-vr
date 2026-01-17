// /js/modules/gestureControl.js
// Gesture ↔ Audio bridge (FULL)
// Exports: GestureControl (named) + default

import { PokerAudio } from './audioLogic.js';

export const GestureControl = {
  tableHeight: 0.78,
  tableRadius: 1.8,
  tableCenter: { x: 0, y: 0.78, z: -2.0 },

  knockSlack: 0.06,
  knockVelocityY: -0.55,
  knockDebounceMs: 420,

  _knockLock: false,
  _vacuumLock: false,

  // optional gating: only knock near table
  gateToTable: true,

  setTableFromScarlett() {
    const td = window.SCARLETT?.table?.data;
    if (!td) return;
    this.tableHeight = td.center.y;
    this.tableCenter = { x: td.center.x, y: td.center.y, z: td.center.z };
    this.tableRadius = (td.railRadius || td.radius || 1.4) + 0.9;
  },

  _nearTable(pos) {
    if (!pos) return false;
    const dx = pos.x - this.tableCenter.x;
    const dz = pos.z - this.tableCenter.z;
    return (dx * dx + dz * dz) <= (this.tableRadius * this.tableRadius);
  },

  update(handData) {
    if (!handData || !handData.position || !handData.velocity) return;

    const y = handData.position.y;
    const vy = handData.velocity.y;

    if (this.gateToTable && !this._nearTable(handData.position)) return;

    if (!this._knockLock && y < (this.tableHeight + this.knockSlack) && vy < this.knockVelocityY) {
      PokerAudio.playTableKnock?.({ intensity: 1.0 });
      this._knockLock = true;
      setTimeout(() => (this._knockLock = false), this.knockDebounceMs);
    }
  },

  triggerPotVacuum(opts = {}) {
    if (this._vacuumLock) return;
    this._vacuumLock = true;

    PokerAudio.playPotVacuum?.({
      duration: typeof opts.duration === 'number' ? opts.duration : 1.6,
      intensity: typeof opts.intensity === 'number' ? opts.intensity : 1.0
    });

    setTimeout(() => (this._vacuumLock = false), 1800);
  }
};

export default GestureControl;
