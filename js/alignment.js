// /js/alignment.js — Scarlett Poker VR
// GitHub Pages SAFE: NO imports. Pure math + transforms.

export const Alignment = {
  // Set your "locked standing height" here:
  STANDING_EYE_Y: 1.62,     // raise to 1.70 if you want taller later
  EXTRA_Y: 0.10,            // small lift to stop floor jitter
  ENABLE_HEIGHT_LOCK: true,

  _ready: false,
  _lastAppliedY: null,

  init(playerGroup, camera) {
    this._ready = true;
    this._lastAppliedY = null;
    // We apply lock in update() once XR camera has a local Y.
  },

  update(playerGroup, camera) {
    if (!this._ready || !this.ENABLE_HEIGHT_LOCK) return;
    if (!playerGroup || !camera) return;

    // In WebXR camera.position.y is LOCAL inside the rig.
    // We set rig Y so that "eye height" feels like standing.
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
    // Y handled by update() lock.
  },
};
