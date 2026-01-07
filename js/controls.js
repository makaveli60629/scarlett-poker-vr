// /js/controls.js — Scarlett Poker VR — Controls v12
// - Left stick: smooth move (NOT inverted)
// - Right stick: 45° snap turn
// - Right trigger hold/release: teleport
// - Height lock: keeps your chosen "standing" height (CAL button)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,
  colliders: [],
  bounds: null,
  floorY: 0,

  moveSpeed: 2.25,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.25,
  _snapT: 0,

  // height lock
  targetEyeHeight: 1.75,
  _calibrated: false,

  // teleport visuals
  tpActive: false,
  tpHold: 0,
  tpMaxRadius: 7.0,
  tpTarget: new THREE.Vector3(),
  tpRings: null,
  tpBeam: null,
  tpCooldown: 0,

  _tmp: new THREE.Vector3(),

  init({ renderer, camera, player, colliders = [], bounds = null, floorY = 0 }) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.colliders = colliders;
    this.bounds = bounds;
    this.floorY = floorY;

    this._buildTeleportViz();
  },

  calibrateHeight() {
    // lock to CURRENT headset height (best when you are standing how you want it)
    this.targetEyeHeight = Math.max(1.6, this.camera.position.y);
    this._calibrated = true;
  },

  _buildTeleportViz() {
    // rings
    const g = new THREE.Group();
    const mk = (r, c) =>
      new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.03, 10, 48),
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.8, roughness: 0.25, metalness: 0.1 })
      );

    const r1 = mk(0.22, 0xff2bd6);
    const r2 = mk(0.30, 0x2bd7ff);
    const r3 = mk(0.38, 0x00ffaa);
    r1.rotation.x = r2.rotation.x = r3.rotation.x = Math.PI / 2;
    r1.position.y = r2.position.y = r3.position.y = 0.02;
    g.add(r1, r2, r3);
    g.visible = false;

    // beam
    const beamGeo = new THREE.CylinderGeometry(0.01, 0.02, 1, 10, 1, true);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 1.2,
      transparent: true, opacity: 0.35, roughness: 0.2
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.visible = false;

    this.tpRings = g;
    this.tpBeam = beam;

    this.player.add(this.tpBeam);
    this.player.parent?.add?.(this.tpRings) || this.player.add(this.tpRings);
  },

  update(dt) {
    if (!this.renderer?.xr) return;

    // if not in VR session, do nothing (Android uses MobileTouch)
    const session = this.renderer.xr.getSession?.();
    if (!session) return;

    // auto-calibrate once (first time entering VR) if user never pressed CAL
    if (!this._calibrated) {
      this.targetEyeHeight = Math.max(1.65, this.camera.position.y);
      this._calibrated = true;
    }

    this._snapT = Math.max(0, this._snapT - dt);
    this.tpCooldown = Math.max(0, this.tpCooldown - dt);

    // height lock (keep consistent)
    const camLocalY = this.camera.position.y;
    const dy = this.targetEyeHeight - camLocalY;
    this.player.position.y += dy;

    // read controllers
    let leftGP = null, rightGP = null;
    for (const src of session.inputSources || []) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") leftGP = src.gamepad;
      if (src.handedness === "right") rightGP = src.gamepad;
    }

    if (leftGP) this._moveFromStick(leftGP, dt);
    if (rightGP) this._snapTurnFromStick(rightGP);
    if (rightGP) this._teleportLogic(rightGP, dt);
  },

  _moveFromStick(gp, dt) {
    // axes mapping fallback
    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0; // strafe
    const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0; // forward/back

    const x = Math.abs(ax) < 0.12 ? 0 : ax;
    const y = Math.abs(ay) < 0.12 ? 0 : ay;

    if (x === 0 && y === 0) return;

    // camera yaw basis
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    // IMPORTANT: forward is -y on stick; NO inversion of x
    const move = new THREE.Vector3();
    move.addScaledVector(fwd, -y);
    move.addScaledVector(right, x);
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

    if (trigger > 0.75 && this.tpCooldown <= 0) {
      this.tpHold += dt;
      this.tpActive = true;

      const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
      const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();

      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

      const off = new THREE.Vector3();
      off.addScaledVector(fwd, -ay);
      off.addScaledVector(right, ax);
      if (off.lengthSq() < 0.02) off.copy(fwd);
      off.normalize();

      const dist = THREE.MathUtils.clamp(1.5 + this.tpHold * 3.0, 1.5, this.tpMaxRadius);

      this.tpTarget.copy(this.player.position).addScaledVector(off, dist);
      this.tpTarget.y = this.player.position.y; // keep rig height system consistent

      if (this.bounds) {
        this.tpTarget.x = THREE.MathUtils.clamp(this.tpTarget.x, this.bounds.min.x, this.bounds.max.x);
        this.tpTarget.z = THREE.MathUtils.clamp(this.tpTarget.z, this.bounds.min.z, this.bounds.max.z);
      }

      // show rings on floor plane
      this.tpRings.visible = true;
      this.tpRings.position.set(this.tpTarget.x, this.floorY + 0.01, this.tpTarget.z);

      // beam
      this.tpBeam.visible = true;
      const targetOnGround = new THREE.Vector3(this.tpTarget.x, this.floorY + 0.8, this.tpTarget.z);
      const beamMid = targetOnGround.clone();
      this.player.worldToLocal(beamMid);

      const len = beamMid.length();
      this.tpBeam.scale.set(1, len, 1);
      this.tpBeam.position.copy(beamMid.clone().multiplyScalar(0.5));
      this.tpBeam.lookAt(new THREE.Vector3(0, 0, 0));
      return;
    }

    if (this.tpActive && trigger < 0.2) {
      this.tpActive = false;
      this.tpHold = 0;
      this.tpCooldown = 0.25;
      this.tpRings.visible = false;
      this.tpBeam.visible = false;

      const dest = this._tmp.copy(this.tpTarget);
      dest.y = this.player.position.y;
      this._tryMoveTo(dest, true);
    }
  },

  _tryMoveTo(nextPos, isTeleport = false) {
    if (this.bounds) {
      nextPos.x = THREE.MathUtils.clamp(nextPos.x, this.bounds.min.x, this.bounds.max.x);
      nextPos.z = THREE.MathUtils.clamp(nextPos.z, this.bounds.min.z, this.bounds.max.z);
    }

    // collider block (simple radius)
    const r = 0.28;
    for (const c of this.colliders || []) {
      const box = new THREE.Box3().setFromObject(c);
      if (
        nextPos.x > box.min.x - r && nextPos.x < box.max.x + r &&
        nextPos.z > box.min.z - r && nextPos.z < box.max.z + r
      ) {
        if (isTeleport) return;
        return;
      }
    }

    this.player.position.copy(nextPos);
  }
};
