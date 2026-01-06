// /js/alignment.js — Scarlett Poker VR
// GitHub Pages SAFE: NO imports. Pure math + object transforms.
//
// Purpose:
// - Lock "standing height" even when user is sitting
// - Keep player above floor, never stuck in table
// - Provide a single place to tune height / offsets

export const Alignment = {
  // --- Tune these ---
  STANDING_EYE_Y: 1.62,     // "locked" view height (meters). Adjust later if needed.
  EXTRA_Y: 0.10,            // extra lift to clear floor jitter
  SAFE_SPAWN_PAD_Y: 0.0,    // pads are at y=0; we add height via rig
  ENABLE_HEIGHT_LOCK: true, // keep consistent height no matter sit/stand

  // Internal state
  _ready: false,
  _baseRigY: null,
  _lastAppliedY: null,

  /**
   * Call once after XR is available / after you created your playerGroup.
   * @param {THREE.Group} playerGroup - the rig/group you move around (NOT the camera).
   * @param {THREE.Camera} camera
   */
  init(playerGroup, camera) {
    this._ready = true;
    // Keep whatever current rig Y is as baseline (but we will override if enabled)
    this._baseRigY = (playerGroup?.position?.y ?? 0);
    this._lastAppliedY = null;

    // If camera already has some Y from non-XR mode, don’t fight it yet.
    // We’ll apply lock in update().
  },

  /**
   * Call every frame (or at least after entering VR).
   * @param {THREE.Group} playerGroup
   * @param {THREE.Camera} camera
   */
  update(playerGroup, camera) {
    if (!this._ready || !playerGroup || !camera) return;

    if (!this.ENABLE_HEIGHT_LOCK) return;

    // In WebXR, camera.position is usually local to the rig.
    // We want "effective eye height" to feel like standing height.
    // The safest approach: set rig Y so camera ends up at STANDING_EYE_Y.
    const camLocalY = (camera.position?.y ?? 0);

    // Desired rig Y = targetEye - cameraLocal + extra lift
    const targetRigY = (this.STANDING_EYE_Y - camLocalY) + this.EXTRA_Y;

    // Avoid tiny micro-jitter writes
    if (this._lastAppliedY === null || Math.abs(targetRigY - this._lastAppliedY) > 0.002) {
      playerGroup.position.y = targetRigY;
      this._lastAppliedY = targetRigY;
    }
  },

  /**
   * Forces rig to a safe spawn at a teleport pad.
   * @param {THREE.Group} playerGroup
   * @param {{position:{x:number,y:number,z:number}}} pad
   */
  spawnOnPad(playerGroup, pad) {
    if (!playerGroup || !pad?.position) return;
    playerGroup.position.x = pad.position.x;
    playerGroup.position.z = pad.position.z;
    // Y handled by update() lock
  },
};
