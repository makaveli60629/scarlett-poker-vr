// /js/move.js — Quest + Mobile locomotion (V26.1.5)
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
    this._forwardYSign = null;
  },

  tick(t, dt) {
    if (!this.rig || !window.THREE) return;
    const delta = (dt || 16) / 1000;

    const ta = window.SCARLETT?.touchAxes;
    const hasTouch = ta && (Math.abs(ta.mx) + Math.abs(ta.my) + Math.abs(ta.tx) > 0.0001);

    const leftGP = hasTouch ? null : this._gpFromEntity(this.leftEnt);
    const rightGP = hasTouch ? null : this._gpFromEntity(this.rightEnt);

    const pads = (!hasTouch && navigator.getGamepads) ? navigator.getGamepads() : [];
    const any = (!hasTouch && pads && pads.length) ? pads.find(p => p && p.axes && p.axes.length >= 2) : null;

    const moveGP = leftGP || any;
    const turnGP = rightGP || any;

    const dz = this.data.deadzone;

    let mx = 0, my = 0, tx = 0;

    if (hasTouch) {
      mx = this._dead(ta.mx, dz);
      my = this._dead(ta.my, dz);
      tx = this._dead(ta.tx, dz);
    } else if (moveGP || turnGP) {
      mx = this._dead((this._axis(moveGP, 2) || this._axis(moveGP, 0)), dz);
      my = this._dead((this._axis(moveGP, 3) || this._axis(moveGP, 1)), dz);
      tx = this._dead((this._axis(turnGP, 2) || this._axis(turnGP, 0)), dz);
    } else {
      return;
    }

    // Determine which sign means "forward" on this controller (Quest can differ).
    // We learn it from the first strong Y input we see.
    if (this._forwardYSign == null && Math.abs(my) > 0.4 && Math.abs(my) >= Math.abs(mx)) {
      this._forwardYSign = (my >= 0) ? 1 : -1;
      // diag helper (optional)
      try { window.__scarlettDiagWrite?.(`[move] learned forwardYSign=${this._forwardYSign}`); } catch(_) {}
    }
    const sign = (this._forwardYSign == null) ? -1 : this._forwardYSign; // default assumes "up is negative"
    const fwd = my * sign; // forward is positive

    // Move relative to where the HMD/camera is facing (world yaw), not just local rotation.
    // This fixes "after teleport/turn, forward moves sideways".
    const dir = new THREE.Vector3();
    this.head.object3D.getWorldDirection(dir); // points forward (-Z)
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
    dir.normalize();

    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();

    const v = new THREE.Vector3();
    v.addScaledVector(forward, fwd * this.data.speed * delta);
    v.addScaledVector(right, mx * this.data.speed * delta);

    this.rig.object3D.position.add(v);

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

  _dead(v, dz){ return (Number.isFinite(v) && Math.abs(v) > dz) ? v : 0; },

  _axis(gp, idx) {
    if (!gp?.axes || gp.axes.length <= idx) return 0;
    const v = gp.axes[idx];
    return Number.isFinite(v) ? v : 0;
  },

  _gpFromEntity(ent){
    try{
      if (!ent) return null;
      const tc = ent.components["tracked-controls"];
      const gp1 = tc?.controller?.gamepad;
      if (gp1) return gp1;

      const oc = ent.components["oculus-touch-controls"];
      const gp2 = oc?.controller?.gamepad;
      if (gp2) return gp2;

      const gc = ent.components["gamepad-controls"];
      const gp3 = gc?.controller?.gamepad;
      if (gp3) return gp3;
    } catch(_) {}
    return null;
  }
});
