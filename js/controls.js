import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  rig: null,
  colliders: [],
  bounds: null,
  floorY: 0,

  moveSpeed: 2.2,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.25,
  _snapT: 0,

  heightLockOn: true,
  heightLockValue: 1.75, // your “standing” feel (tweak later)
  _tmp: new THREE.Vector3(),

  init({ renderer, camera, rig, colliders = [], bounds = null, floorY = 0 }) {
    this.renderer = renderer;
    this.camera = camera;
    this.rig = rig;
    this.colliders = colliders;
    this.bounds = bounds;
    this.floorY = floorY;

    // Lock height to a comfortable “see over table” standing value
    this.heightLockValue = 1.78;

    // Keyboard fallback (if ever used)
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "h") this.toggleHeightLock();
    });
  },

  toggleHeightLock() {
    this.heightLockOn = !this.heightLockOn;
  },

  teleportTo(pos) {
    if (!pos) return;
    const next = this._tmp.copy(pos);
    next.y = 0;
    this._tryMoveTo(next, true);
  },

  update(dt) {
    if (!this.renderer?.xr) return;

    this._snapT = Math.max(0, this._snapT - dt);

    // Height lock (keeps table height consistent)
    if (this.heightLockOn) {
      // Keep rig y such that camera becomes heightLockValue
      const camLocalY = this.camera.position.y;
      const dy = this.heightLockValue - camLocalY;
      this.rig.position.y += dy;
    }

    const session = this.renderer.xr.getSession?.();
    if (!session) return;

    let left = null, right = null;
    for (const src of session.inputSources || []) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") left = src;
      if (src.handedness === "right") right = src;
    }

    if (left?.gamepad) this._moveFromStick(left.gamepad, dt);
    if (right?.gamepad) this._snapTurnFromStick(right.gamepad);
  },

  _moveFromStick(gp, dt) {
    // left stick expected: axes[2]/[3] or [0]/[1]
    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

    // deadzone
    const dx = Math.abs(ax) < 0.12 ? 0 : ax;
    const dy = Math.abs(ay) < 0.12 ? 0 : ay;
    if (dx === 0 && dy === 0) return;

    // camera yaw direction
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    // IMPORTANT: correct mapping (right is +x, left is -x)
    const move = new THREE.Vector3();
    move.addScaledVector(fwd, -dy);  // forward when stick up
    move.addScaledVector(right, dx); // right when stick right
    if (move.lengthSq() < 0.0001) return;
    move.normalize();

    const step = this.moveSpeed * dt;
    const next = this._tmp.copy(this.rig.position).addScaledVector(move, step);
    this._tryMoveTo(next);
  },

  _snapTurnFromStick(gp) {
    if (this._snapT > 0) return;

    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    if (Math.abs(ax) < 0.85) return;

    this._snapT = this.snapCooldown;
    this.rig.rotation.y += (ax > 0 ? -this.snapAngle : this.snapAngle);
  },

  _tryMoveTo(nextPos, isTeleport = false) {
    // bounds clamp
    if (this.bounds) {
      nextPos.x = THREE.MathUtils.clamp(nextPos.x, this.bounds.min.x, this.bounds.max.x);
      nextPos.z = THREE.MathUtils.clamp(nextPos.z, this.bounds.min.z, this.bounds.max.z);
    }

    // simple AABB collision
    const r = 0.28;
    for (const c of this.colliders || []) {
      const box = c.userData?.box;
      if (!box) continue;
      if (
        nextPos.x > box.min.x - r && nextPos.x < box.max.x + r &&
        nextPos.z > box.min.z - r && nextPos.z < box.max.z + r
      ) {
        if (isTeleport) return;
        return;
      }
    }

    // keep on floor plane
    nextPos.y = this.rig.position.y;
    this.rig.position.copy(nextPos);
  },
};
