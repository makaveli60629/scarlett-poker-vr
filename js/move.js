// /js/move.js — Quest-correct locomotion: left stick moves, right stick turns.
// Fixes the common issue where only the first gamepad is read (often right controller), causing "no movement".
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
    this.head = document.getElementById("head");
    this.leftEnt = document.getElementById("leftHand");
    this.rightEnt = document.getElementById("rightHand");
    this.lastSnap = 0;
  },

  tick(t, dt) {
    if (!this.rig) return;
    const delta = (dt || 16) / 1000;

    const leftGP = this._gpFromEntity(this.leftEnt);
    const rightGP = this._gpFromEntity(this.rightEnt);

    // If XR isn't providing controller gamepads, fall back to any pads
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const any = (pads && pads.length) ? pads.find(p => p && p.axes && p.axes.length >= 2) : null;

    const moveGP = leftGP || any;
    const turnGP = rightGP || any;
    if (!moveGP && !turnGP) return;

    // Standard Oculus Touch: axes[2,3] = thumbstick on that controller (varies by browser),
    // but in practice Quest Browser provides axes[2,3] for stick.
    const mz = this.data.deadzone;

    const mx = this._dead(this._axis(moveGP, 2) ?? this._axis(moveGP, 0), mz);
    const my = this._dead(this._axis(moveGP, 3) ?? this._axis(moveGP, 1), mz);

    const tx = this._dead(this._axis(turnGP, 2) ?? this._axis(turnGP, 0), mz);

    // Move in head yaw direction
    const yaw = this.head ? this.head.object3D.rotation.y : this.rig.object3D.rotation.y;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const v = new THREE.Vector3();
    v.addScaledVector(forward, -my * this.data.speed * delta);
    v.addScaledVector(right, mx * this.data.speed * delta);

    this.rig.object3D.position.add(v);

    // Turn (snap or smooth)
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

  _dead(v, dz){
    if (!Number.isFinite(v)) return 0;
    return Math.abs(v) > dz ? v : 0;
  },

  _axis(gp, idx) {
    if (!gp?.axes || gp.axes.length <= idx) return 0;
    const v = gp.axes[idx];
    return Number.isFinite(v) ? v : 0;
  },

  _gpFromEntity(ent){
    try{
      if (!ent) return null;

      // laser-controls usually creates tracked-controls internally
      // 1) tracked-controls
      const tc = ent.components["tracked-controls"];
      const gp1 = tc?.controller?.gamepad;
      if (gp1) return gp1;

      // 2) oculus-touch-controls
      const oc = ent.components["oculus-touch-controls"];
      const gp2 = oc?.controller?.gamepad;
      if (gp2) return gp2;

      // 3) generic gamepad-controls
      const gc = ent.components["gamepad-controls"];
      const gp3 = gc?.controller?.gamepad;
      if (gp3) return gp3;

    } catch(_) {}
    return null;
  }
});
