// /js/controls.js — Skylark Poker VR Controls (9.0)
// - Left stick: smooth move
// - Right stick: 45° snap turn
// - Right trigger hold: show teleport target (3 neon rings)
// - Release trigger: teleport
// - Height lock: keeps player at consistent standing height
// - Collision: uses world bounds + collider boxes

import * as THREE from "./three.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,
  colliders: [],
  bounds: null,
  teleport: null,
  spawn: null,

  // tuning
  moveSpeed: 2.2,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.25,
  _snapT: 0,

  // height lock
  targetEyeHeight: 1.65,

  // teleport
  tpActive: false,
  tpHold: 0,
  tpMaxRadius: 6.0,
  tpTarget: new THREE.Vector3(),
  tpRings: null,
  tpBeam: null,
  tpCooldown: 0,

  // state
  _v: new THREE.Vector3(),
  _tmp: new THREE.Vector3(),
  _yawObj: new THREE.Object3D(),

  init({ renderer, camera, player, colliders = [], bounds = null, teleport = null, spawn = null }) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.colliders = colliders;
    this.bounds = bounds;
    this.teleport = teleport;
    this.spawn = spawn;

    // Spawn position + facing
    if (spawn?.position) this.player.position.copy(spawn.position);
    if (typeof spawn?.yaw === "number") this.player.rotation.y = spawn.yaw;

    // Teleport rings (3 neon circles)
    this.tpRings = this._buildTeleportRings();
    this.tpRings.visible = false;
    this.player.parent?.add?.(this.tpRings) || this.player.add(this.tpRings);

    // Soft beam (optional glow ray)
    const beamGeo = new THREE.CylinderGeometry(0.01, 0.02, 1, 10, 1, true);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0.0
    });
    this.tpBeam = new THREE.Mesh(beamGeo, beamMat);
    this.tpBeam.visible = false;
    this.player.add(this.tpBeam);
  },

  _buildTeleportRings() {
    const g = new THREE.Group();
    const mk = (r, c) =>
      new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.03, 10, 48),
        new THREE.MeshStandardMaterial({
          color: c,
          emissive: c,
          emissiveIntensity: 1.8,
          roughness: 0.25,
          metalness: 0.1
        })
      );

    const r1 = mk(0.22, 0xff2bd6);
    const r2 = mk(0.30, 0x2bd7ff);
    const r3 = mk(0.38, 0x00ffaa);

    r1.rotation.x = r2.rotation.x = r3.rotation.x = Math.PI / 2;
    r1.position.y = r2.position.y = r3.position.y = 0.02;

    g.add(r1, r2, r3);
    return g;
  },

  update(dt) {
    if (!this.renderer?.xr) return;

    // Keep snap turn cooldown
    this._snapT = Math.max(0, this._snapT - dt);
    this.tpCooldown = Math.max(0, this.tpCooldown - dt);

    // Height lock (keeps “standing height” even if user crouches/sits)
    // We counter headset Y changes by adjusting player rig Y.
    const camLocalY = this.camera.position.y;
    const dy = this.targetEyeHeight - camLocalY;
    this.player.position.y += dy;

    // Read gamepads
    const session = this.renderer.xr.getSession?.();
    if (!session) return;

    let left = null, right = null;
    for (const src of session.inputSources || []) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") left = src;
      if (src.handedness === "right") right = src;
    }

    // Locomotion
    if (left?.gamepad) this._moveFromStick(left.gamepad, dt);

    // Snap turn
    if (right?.gamepad) this._snapTurnFromStick(right.gamepad);

    // Teleport (right trigger hold)
    if (right?.gamepad) this._teleportLogic(right.gamepad, dt);
  },

  _moveFromStick(gp, dt) {
    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0; // some devices map differently
    const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

    // deadzone
    const dx = Math.abs(ax) < 0.12 ? 0 : ax;
    const dy = Math.abs(ay) < 0.12 ? 0 : ay;

    if (dx === 0 && dy === 0) return;

    // direction relative to camera yaw
    const camWorldDir = new THREE.Vector3();
    this.camera.getWorldDirection(camWorldDir);
    camWorldDir.y = 0;
    camWorldDir.normalize();

    const rightDir = new THREE.Vector3().crossVectors(camWorldDir, new THREE.Vector3(0, 1, 0)).normalize();

    // Forward is -Y on stick
    const move = new THREE.Vector3();
    move.addScaledVector(camWorldDir, -dy);
    move.addScaledVector(rightDir, dx);
    move.normalize();

    const step = this.moveSpeed * dt;
    const next = this._tmp.copy(this.player.position).addScaledVector(move, step);

    this._tryMoveTo(next);
  },

  _snapTurnFromStick(gp) {
    if (this._snapT > 0) return;

    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    if (Math.abs(ax) < 0.85) return;

    this._snapT = this.snapCooldown;
    this.player.rotation.y += (ax > 0 ? -this.snapAngle : this.snapAngle);
  },

  _teleportLogic(gp, dt) {
    const trigger = gp.buttons?.[0]?.value ?? 0;

    // start hold
    if (trigger > 0.75 && this.tpCooldown <= 0) {
      this.tpHold += dt;
      this.tpActive = true;

      // Target selection uses left stick if available, else right stick.
      const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
      const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

      // forward direction from camera
      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();

      const rightDir = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

      // pick a target offset inside radius
      const off = new THREE.Vector3();
      off.addScaledVector(fwd, -ay);
      off.addScaledVector(rightDir, ax);

      if (off.lengthSq() < 0.02) off.copy(fwd); // default forward if no stick
      off.normalize();

      // distance scales with trigger hold
      const dist = THREE.MathUtils.clamp(1.5 + this.tpHold * 3.0, 1.5, this.tpMaxRadius);

      this.tpTarget.copy(this.player.position).addScaledVector(off, dist);
      this.tpTarget.y = 0; // ground

      // keep inside bounds
      if (this.bounds) {
        this.tpTarget.x = THREE.MathUtils.clamp(this.tpTarget.x, this.bounds.min.x, this.bounds.max.x);
        this.tpTarget.z = THREE.MathUtils.clamp(this.tpTarget.z, this.bounds.min.z, this.bounds.max.z);
      }

      // show rings
      this.tpRings.visible = true;
      this.tpRings.position.set(this.tpTarget.x, 0.01, this.tpTarget.z);

      // beam
      this.tpBeam.visible = true;
      const beamMid = new THREE.Vector3(this.tpTarget.x, 0.8, this.tpTarget.z);
      const p0 = new THREE.Vector3(0, 0, 0);
      this.player.worldToLocal(beamMid);
      const len = beamMid.length();
      this.tpBeam.scale.set(1, len, 1);
      this.tpBeam.position.copy(beamMid.clone().multiplyScalar(0.5));
      this.tpBeam.lookAt(p0);
      return;
    }

    // release -> teleport
    if (this.tpActive && trigger < 0.2) {
      this.tpActive = false;
      this.tpHold = 0;
      this.tpCooldown = 0.25;

      this.tpRings.visible = false;
      this.tpBeam.visible = false;

      // final collision-safe teleport
      const dest = this._tmp.copy(this.tpTarget);
      dest.y = this.player.position.y; // keep height system consistent
      this._tryMoveTo(dest, true);
    }
  },

  _tryMoveTo(nextPos, isTeleport = false) {
    // bounds clamp
    if (this.bounds) {
      nextPos.x = THREE.MathUtils.clamp(nextPos.x, this.bounds.min.x, this.bounds.max.x);
      nextPos.z = THREE.MathUtils.clamp(nextPos.z, this.bounds.min.z, this.bounds.max.z);
    }

    // collider AABB simple prevent (player radius)
    const r = 0.28;
    for (const c of this.colliders || []) {
      // collider is Box3 or mesh w/ userData.box
      const box = c.isBox3 ? c : c.userData?.box;
      if (!box) continue;

      if (
        nextPos.x > box.min.x - r && nextPos.x < box.max.x + r &&
        nextPos.z > box.min.z - r && nextPos.z < box.max.z + r
      ) {
        // blocked
        if (isTeleport) return; // cancel teleport into wall
        return;
      }
    }

    this.player.position.copy(nextPos);
  }
};
