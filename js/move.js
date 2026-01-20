// /js/move.js — smooth locomotion + snap turn (Quest thumbsticks) + desktop WASD via A-Frame look-controls
AFRAME.registerComponent("smooth-locomotion", {
  schema: {
    speed: { type: "number", default: 2.2 },
    turnSpeed: { type: "number", default: 2.0 },
    snapTurn: { type: "boolean", default: true },
    snapDegrees: { type: "number", default: 30 },
    deadzone: { type: "number", default: 0.18 }
  },

  init() {
    this.rig = document.getElementById("rig");
    this.lastSnap = 0;
  },

  tick(t, dt) {
    if (!this.rig) return;
    const delta = (dt || 16) / 1000;

    const gp = this._getGamepad();
    if (!gp) return;

    // Standard mapping: left stick = move, right stick = turn (Quest)
    const lx = this._axis(gp, 2); // sometimes 2/3, depends; we try both
    const ly = this._axis(gp, 3);
    const rx = this._axis(gp, 0);
    const ry = this._axis(gp, 1);

    // Prefer common: left stick (0,1) move; right stick (2,3) turn.
    // If 2/3 are near zero but 0/1 non-zero, swap.
    const moveX = (Math.abs(lx) + Math.abs(ly) > 0.01) ? lx : rx;
    const moveY = (Math.abs(lx) + Math.abs(ly) > 0.01) ? ly : ry;
    const turnX = (Math.abs(lx) + Math.abs(ly) > 0.01) ? rx : lx;

    const dz = this.data.deadzone;
    const mx = Math.abs(moveX) > dz ? moveX : 0;
    const my = Math.abs(moveY) > dz ? moveY : 0;
    const tx = Math.abs(turnX) > dz ? turnX : 0;

    // Move in head direction (yaw only)
    const head = document.getElementById("head");
    const yaw = head ? head.object3D.rotation.y : this.rig.object3D.rotation.y;

    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const v = new THREE.Vector3();
    v.addScaledVector(forward, -my * this.data.speed * delta);
    v.addScaledVector(right, mx * this.data.speed * delta);

    this.rig.object3D.position.add(v);

    // Turn
    if (this.data.snapTurn) {
      const now = t || performance.now();
      if (Math.abs(tx) > 0.6 && (now - this.lastSnap) > 250) {
        const dir = tx > 0 ? -1 : 1;
        this.rig.object3D.rotation.y += (dir * this.data.snapDegrees) * (Math.PI / 180);
        this.lastSnap = now;
      }
    } else {
      this.rig.object3D.rotation.y += (-tx * this.data.turnSpeed * delta);
    }
  },

  _getGamepad() {
    // Try to find an XR controller gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (!pads) return null;
    for (const p of pads) {
      if (!p) continue;
      // Heuristic: Quest controllers usually have id with "Oculus" and axes length >= 2
      if (p.axes && p.axes.length >= 2) return p;
    }
    return null;
  },

  _axis(gp, idx) {
    if (!gp?.axes || gp.axes.length <= idx) return 0;
    const v = gp.axes[idx];
    return Number.isFinite(v) ? v : 0;
  }
});
