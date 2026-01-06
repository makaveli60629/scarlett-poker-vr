// /js/controls.js — Scarlett Poker VR Controls (PERMANENT FIX)
// Fixes:
// - Laser is rigged to RIGHT GRIP (stable)
// - Teleport aims by raycasting TeleportFloor (no more broken hits)
// - Floor blinking reduced because ray hit plane is separate (y=0.01)
// - Height lock stays constant seated/standing
// - Smooth move (left stick) + snap turn (right stick)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,

  controllers: { left: null, right: null },
  grips: { left: null, right: null },

  teleportFloor: null,
  floorY: 0.01,

  colliders: [],
  bounds: null,

  moveSpeed: 2.2,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.25,
  _snapT: 0,

  lockHeight: true,
  targetEyeHeight: 1.72,
  baseY: 0.01,

  // teleport
  tpActive: false,
  tpCooldown: 0,
  tpTarget: new THREE.Vector3(),
  tpMaxDist: 25,

  // ray tools
  raycaster: new THREE.Raycaster(),
  _hit: new THREE.Vector3(),

  // visuals
  laser: null,
  laserMat: null,
  targetRing: null,
  targetRingMat: null,

  _tmp: new THREE.Vector3(),

  init(opts) {
    this.renderer = opts.renderer;
    this.camera = opts.camera;
    this.player = opts.player;

    this.controllers = opts.controllers || this.controllers;
    this.grips = opts.grips || this.grips;

    this.colliders = opts.colliders || [];
    this.bounds = opts.bounds || null;

    this.teleportFloor = opts.teleportFloor || null;
    this.floorY = typeof opts.floorY === "number" ? opts.floorY : 0.01;

    this.lockHeight = opts.lockHeight ?? true;
    this.targetEyeHeight = opts.targetEyeHeight ?? 1.72;
    this.baseY = opts.baseY ?? 0.01;

    // -------- LASER (attach to RIGHT GRIP, not controller) --------
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);

    this.laserMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    this.laser = new THREE.Line(geo, this.laserMat);
    this.laser.visible = true;

    // Attach to grip if available (best), else controller right, else player
    const attach = this.grips?.right || this.controllers?.right || this.player;
    attach.add(this.laser);

    // -------- TARGET RING --------
    this.targetRingMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 2.4,
      transparent: true,
      opacity: 0.0,
      roughness: 0.2,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    this.targetRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.38, 72), this.targetRingMat);
    this.targetRing.rotation.x = -Math.PI / 2;
    this.targetRing.position.y = this.floorY + 0.02;

    // add to scene root
    this.player.parent?.add?.(this.targetRing) || this.player.add(this.targetRing);
  },

  update(dt) {
    if (!this.renderer?.xr) return;

    this._snapT = Math.max(0, this._snapT - dt);
    this.tpCooldown = Math.max(0, this.tpCooldown - dt);

    // height lock
    if (this.lockHeight) {
      const camLocalY = this.camera.position.y;
      this.player.position.y = this.baseY + (this.targetEyeHeight - camLocalY);
    }

    const session = this.renderer.xr.getSession?.();
    if (!session) return;

    let left = null, right = null;
    for (const src of session.inputSources || []) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") left = src.gamepad;
      if (src.handedness === "right") right = src.gamepad;
    }

    if (left) this._moveFromStick(left, dt);
    if (right) this._snapTurnFromStick(right);

    if (right) this._teleportAimAndFire(right, dt);
    else this._updateLaserOnly(6);
  },

  _moveFromStick(gp, dt) {
    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

    const dx = Math.abs(ax) < 0.12 ? 0 : ax;
    const dy = Math.abs(ay) < 0.12 ? 0 : ay;
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;

    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    const rightDir = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(fwd, -dy);
    move.addScaledVector(rightDir, dx);
    if (move.lengthSq() > 0.0001) move.normalize();

    const next = this._tmp.copy(this.player.position).addScaledVector(move, this.moveSpeed * dt);
    this._tryMoveTo(next);
  },

  _snapTurnFromStick(gp) {
    if (this._snapT > 0) return;
    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    if (Math.abs(ax) < 0.85) return;

    this._snapT = this.snapCooldown;
    this.player.rotation.y += (ax > 0 ? -this.snapAngle : this.snapAngle);
  },

  _teleportAimAndFire(gp, dt) {
    const trigger = gp.buttons?.[0]?.value ?? 0;
    const aiming = trigger > 0.55 && this.tpCooldown <= 0;

    // Aim raycast
    const hit = this._raycastTeleportFloor();
    const laserLen = hit ? this._laserLenToHit() : 6;

    this._updateLaserOnly(laserLen);

    // ring
    if (aiming && hit) {
      this.targetRing.position.set(this.tpTarget.x, this.floorY + 0.02, this.tpTarget.z);
      this.targetRingMat.opacity = THREE.MathUtils.lerp(this.targetRingMat.opacity, 0.95, Math.min(1, dt * 12));
      this.tpActive = true;
      return;
    }

    // fade ring when not aiming
    this.targetRingMat.opacity = THREE.MathUtils.lerp(this.targetRingMat.opacity, 0.0, Math.min(1, dt * 10));

    // Release teleport
    if (this.tpActive && trigger < 0.15) {
      this.tpActive = false;
      this.tpCooldown = 0.22;
      if (!hit) return;

      const dest = this._tmp.copy(this.tpTarget);
      dest.y = this.player.position.y;
      this._tryMoveTo(dest, true);
    }
  },

  _raycastTeleportFloor() {
    // Use RIGHT GRIP position/direction if available
    const src = this.grips?.right || this.controllers?.right;
    if (!src) return false;

    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0, 0, -1);

    src.getWorldPosition(origin);
    dir.applyQuaternion(src.getWorldQuaternion(new THREE.Quaternion()));
    dir.normalize();

    this.raycaster.set(origin, dir);
    this.raycaster.far = this.tpMaxDist;

    if (this.teleportFloor) {
      const hits = this.raycaster.intersectObject(this.teleportFloor, false);
      if (hits && hits.length) {
        const p = hits[0].point;
        this.tpTarget.set(p.x, this.floorY, p.z);

        // bounds clamp
        if (this.bounds) {
          this.tpTarget.x = THREE.MathUtils.clamp(this.tpTarget.x, this.bounds.min.x, this.bounds.max.x);
          this.tpTarget.z = THREE.MathUtils.clamp(this.tpTarget.z, this.bounds.min.z, this.bounds.max.z);
        }
        return true;
      }
    }

    return false;
  },

  _laserLenToHit() {
    // laser length from right grip to tpTarget
    const src = this.grips?.right || this.controllers?.right;
    if (!src) return 6;
    const origin = new THREE.Vector3();
    src.getWorldPosition(origin);
    return Math.max(0.5, Math.min(this.tpMaxDist, origin.distanceTo(this.tpTarget)));
  },

  _updateLaserOnly(len) {
    if (!this.laser) return;
    const pos = this.laser.geometry.attributes.position;
    pos.setXYZ(0, 0, 0, 0);
    pos.setXYZ(1, 0, 0, -len);
    pos.needsUpdate = true;
    this.laserMat.opacity = 0.95;
  },

  _tryMoveTo(nextPos, isTeleport = false) {
    if (this.bounds) {
      nextPos.x = THREE.MathUtils.clamp(nextPos.x, this.bounds.min.x, this.bounds.max.x);
      nextPos.z = THREE.MathUtils.clamp(nextPos.z, this.bounds.min.z, this.bounds.max.z);
    }

    const r = 0.28;
    for (const c of this.colliders || []) {
      const box = c?.isBox3 ? c : c?.userData?.box;
      if (!box) continue;

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
