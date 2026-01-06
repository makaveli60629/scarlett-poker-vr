// /js/controls.js — Scarlett Poker VR Controls (PERMANENT)
// - Left stick: smooth move
// - Right stick: snap turn (45°)
// - Right trigger hold/release: teleport (optional target rings)
// - Height lock: keeps your eye height constant (standing/sitting same)
// - Movement ring: visible circle at your feet when moving
// - Collision: simple AABB wall/table blocking

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,

  colliders: [],
  bounds: null,

  // Movement tuning
  moveSpeed: 2.2,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.25,
  _snapT: 0,

  // Height lock
  lockHeight: true,
  targetEyeHeight: 1.72,
  baseY: 0.01,

  // Teleport
  tpHold: 0,
  tpMaxRadius: 6.0,
  tpTarget: new THREE.Vector3(),
  tpRings: null,
  tpBeam: null,
  tpActive: false,
  tpCooldown: 0,

  // Movement ring
  moveRing: null,
  moveRingMat: null,

  // temp
  _tmp: new THREE.Vector3(),
  _tmp2: new THREE.Vector3(),

  init(opts) {
    this.renderer = opts.renderer;
    this.camera = opts.camera;
    this.player = opts.player;
    this.colliders = opts.colliders || [];
    this.bounds = opts.bounds || null;

    this.lockHeight = opts.lockHeight ?? true;
    this.targetEyeHeight = opts.targetEyeHeight ?? 1.72;
    this.baseY = opts.baseY ?? 0.01;

    // If world gives spawn, set XZ; Y handled by height lock
    if (opts.spawn?.position) {
      this.player.position.x = opts.spawn.position.x;
      this.player.position.z = opts.spawn.position.z;
    }
    if (typeof opts.spawn?.yaw === "number") {
      this.player.rotation.y = opts.spawn.yaw;
    }

    // Teleport visuals
    this.tpRings = this._buildTeleportRings();
    this.tpRings.visible = false;
    this.player.parent?.add?.(this.tpRings) || this.player.add(this.tpRings);

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

    // Movement ring (shows when moving)
    this.moveRingMat = new THREE.MeshStandardMaterial({
      color: 0x00ff99,
      emissive: 0x00ff99,
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0.0,
      roughness: 0.2,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    this.moveRing = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.34, 64),
      this.moveRingMat
    );
    this.moveRing.rotation.x = -Math.PI / 2;
    this.moveRing.position.y = 0.03;
    this.moveRing.visible = true;

    // Add ring to scene (parent of player if possible)
    this.player.parent?.add?.(this.moveRing) || this.player.add(this.moveRing);
  },

  _buildTeleportRings() {
    const g = new THREE.Group();
    const mk = (r, c) =>
      new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.03, 10, 48),
        new THREE.MeshStandardMaterial({
          color: c,
          emissive: c,
          emissiveIntensity: 2.2,
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

    this._snapT = Math.max(0, this._snapT - dt);
    this.tpCooldown = Math.max(0, this.tpCooldown - dt);

    // 🔒 Height lock: keep camera world height constant no matter sit/stand
    // In XR, camera.position.y changes with your real head height.
    if (this.lockHeight) {
      const camLocalY = this.camera.position.y;
      // Set player rig Y so camera ends up at targetEyeHeight above the floor
      this.player.position.y = this.baseY + (this.targetEyeHeight - camLocalY);
    }

    const session = this.renderer.xr.getSession?.();
    if (!session) {
      // Non-XR fallback: keep ring at player
      this._updateMoveRing(dt, 0);
      return;
    }

    let left = null, right = null;
    for (const src of session.inputSources || []) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") left = src;
      if (src.handedness === "right") right = src;
    }

    let moveMag = 0;

    // Move
    if (left?.gamepad) {
      moveMag = this._moveFromStick(left.gamepad, dt);
    }

    // Snap turn
    if (right?.gamepad) this._snapTurnFromStick(right.gamepad);

    // Teleport (right trigger hold/release)
    if (right?.gamepad) this._teleportLogic(right.gamepad, dt);

    // Movement ring visibility
    this._updateMoveRing(dt, moveMag);
  },

  _updateMoveRing(dt, mag) {
    // Keep ring under your feet (XZ)
    this.moveRing.position.x = this.player.position.x;
    this.moveRing.position.z = this.player.position.z;

    // Fade in while moving, fade out when not
    const target = mag > 0.05 ? 0.95 : 0.0;
    this.moveRingMat.opacity = THREE.MathUtils.lerp(this.moveRingMat.opacity, target, Math.min(1, dt * 10));

    // Slight pulse when moving
    const s = 1 + mag * 0.35;
    this.moveRing.scale.set(s, s, s);

    // “Rainbow-ish” cycling using emissive intensity (safe, no shaders)
    const t = (performance.now() * 0.001) % 1;
    this.moveRingMat.emissiveIntensity = mag > 0.05 ? 2.0 + 1.0 * Math.sin(t * Math.PI * 2) : 2.2;
  },

  _moveFromStick(gp, dt) {
    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

    const dx = Math.abs(ax) < 0.12 ? 0 : ax;
    const dy = Math.abs(ay) < 0.12 ? 0 : ay;

    const mag = Math.min(1, Math.sqrt(dx * dx + dy * dy));
    if (mag < 0.01) return 0;

    // direction relative to camera yaw
    const camWorldDir = new THREE.Vector3();
    this.camera.getWorldDirection(camWorldDir);
    camWorldDir.y = 0;
    camWorldDir.normalize();

    const rightDir = new THREE.Vector3().crossVectors(camWorldDir, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(camWorldDir, -dy);
    move.addScaledVector(rightDir, dx);
    if (move.lengthSq() > 0.0001) move.normalize();

    const step = this.moveSpeed * dt;
    const next = this._tmp.copy(this.player.position).addScaledVector(move, step);

    this._tryMoveTo(next);
    return mag;
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

      const rightDir = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

      const off = new THREE.Vector3();
      off.addScaledVector(fwd, -ay);
      off.addScaledVector(rightDir, ax);

      if (off.lengthSq() < 0.02) off.copy(fwd);
      off.normalize();

      const dist = THREE.MathUtils.clamp(1.5 + this.tpHold * 3.0, 1.5, this.tpMaxRadius);

      this.tpTarget.copy(this.player.position).addScaledVector(off, dist);
      this.tpTarget.y = 0;

      if (this.bounds) {
        this.tpTarget.x = THREE.MathUtils.clamp(this.tpTarget.x, this.bounds.min.x, this.bounds.max.x);
        this.tpTarget.z = THREE.MathUtils.clamp(this.tpTarget.z, this.bounds.min.z, this.bounds.max.z);
      }

      this.tpRings.visible = true;
      this.tpRings.position.set(this.tpTarget.x, 0.01, this.tpTarget.z);

      // beam
      this.tpBeam.visible = true;
      const beamMid = new THREE.Vector3(this.tpTarget.x, 0.8, this.tpTarget.z);
      this.player.worldToLocal(beamMid);
      const len = beamMid.length();
      this.tpBeam.scale.set(1, len, 1);
      this.tpBeam.position.copy(beamMid.clone().multiplyScalar(0.5));
      this.tpBeam.lookAt(new THREE.Vector3(0, 0, 0));
      return;
    }

    // release -> teleport
    if (this.tpActive && trigger < 0.2) {
      this.tpActive = false;
      this.tpHold = 0;
      this.tpCooldown = 0.25;

      this.tpRings.visible = false;
      this.tpBeam.visible = false;

      const dest = this._tmp.copy(this.tpTarget);
      dest.y = this.player.position.y; // keep current locked height
      this._tryMoveTo(dest, true);
    }
  },

  _tryMoveTo(nextPos, isTeleport = false) {
    // bounds clamp
    if (this.bounds) {
      nextPos.x = THREE.MathUtils.clamp(nextPos.x, this.bounds.min.x, this.bounds.max.x);
      nextPos.z = THREE.MathUtils.clamp(nextPos.z, this.bounds.min.z, this.bounds.max.z);
    }

    // collider block
    const r = 0.28;
    for (const c of this.colliders || []) {
      const box = c?.isBox3 ? c : c?.userData?.box;
      if (!box) continue;

      if (
        nextPos.x > box.min.x - r && nextPos.x < box.max.x + r &&
        nextPos.z > box.min.z - r && nextPos.z < box.max.z + r
      ) {
        if (isTeleport) return; // cancel teleport into blocker
        return; // block movement
      }
    }

    this.player.position.copy(nextPos);
  }
};
