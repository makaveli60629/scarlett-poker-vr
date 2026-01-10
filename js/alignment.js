// /js/alignment.js — Scarlett Poker VR (SAFE)
// Fix: do NOT force rig Y during immersive VR (Quest). Only for mobile preview.

export const Alignment = {
  STANDING_EYE_Y: 1.62,
  EXTRA_Y: 0.10,
  ENABLE_HEIGHT_LOCK: true,

  _ready: false,
  _lastAppliedY: null,

  init(playerGroup, camera) {
    this._ready = true;
    this._lastAppliedY = null;
  },

  update(playerGroup, camera, renderer) {
    if (!this._ready || !this.ENABLE_HEIGHT_LOCK) return;
    if (!playerGroup || !camera) return;

    // If in immersive VR, do NOT override Y
    const session = renderer?.xr?.getSession?.() || null;
    if (session) return;

    // Mobile preview height lock only
    const camLocalY = camera.position?.y ?? 0;
    const targetRigY = (this.STANDING_EYE_Y - camLocalY) + this.EXTRA_Y;

    if (this._lastAppliedY === null || Math.abs(targetRigY - this._lastAppliedY) > 0.002) {
      playerGroup.position.y = targetRigY;
      this._lastAppliedY = targetRigY;
    }
  },

  spawnOnPad(playerGroup, pad) {
    if (!playerGroup || !pad?.position) return;
    playerGroup.position.x = pad.position.x;
    playerGroup.position.z = pad.position.z;
  },
};
