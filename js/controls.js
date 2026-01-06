// /js/controls.js — Scarlett Poker VR Controls (PERMANENT)
// Fixes:
// - Controller aiming teleport: laser points to floor, ring shows exact destination
// - Trigger hold = aim, release = teleport
// - Height lock: seated/standing doesn't change in-game height
// - Movement ring: stays under feet while moving
// - Collisions: bounds + world colliders

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,

  controllers: { left: null, right: null },
  grips: { left: null, right: null },

  colliders: [],
  bounds: null,

  // movement
  moveSpeed: 2.2,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.25,
  _snapT: 0,

  // height lock
  lockHeight: true,
  targetEyeHeight: 1.72,
  baseY: 0.01,

  // teleport aim
  floorY: 0.0,
  raycaster: new THREE.Raycaster(),
  _rayDir: new THREE.Vector3(),
  _rayOrigin: new THREE.Vector3(),
  tpActive: false,
  tpCooldown: 0,
  tpHold: 0,

  tpTarget: new THREE.Vector3(),
  tpMaxDist: 18,

  // visuals
  laser: null,
  laserMat: null,
  targetRing: null,
  targetRingMat: null,

  // movement ring
  moveRing: null,
  moveRingMat: null,

  // temps
  _tmp: new THREE.Vector3(),
  _tmp2: new THREE.Vector3(),

  init(opts) {
    this.renderer = opts.renderer;
    this.camera = opts.camera;
    this.player = opts.player;

    this.controllers = opts.controllers || this.controllers;
    this.grips = opts.grips || this.grips;

    this.colliders = opts.colliders || [];
    this.bounds = opts.bounds || null;

    this.lockHeight = opts.lockHeight ?? true;
    this.targetEyeHeight = opts.targetEyeHeight ?? 1.72;
    this.baseY = opts.baseY ?? 0.01;

    this.floorY = typeof opts.floorY === "number" ? opts.floorY : 0.0;

    // --- LASER (right controller) ---
    // A simple line that we update each frame.
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    this.laserMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    this.laser = new THREE.Line(geo, this.laserMat);
    this.laser.visible = true;

    // attach to right controller if possible
    if (this.controllers?.right) {
      this.controllers.right.add(this.laser);
    } else {
      this.player.add(this.laser);
    }

    // --- TARGET RING (teleport destination) ---
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
    // add to scene root (player parent usually)
    this.player.parent?.add?.(this.targetRing) || this.player.add(this.targetRing);

    // --- MOVE RING (under feet) ---
    this.moveRingMat = new THREE.MeshStandardMaterial({
      color: 0x2bd7ff,
      emissive: 0x2bd7ff,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.0,
      roughness: 0.2,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    this.moveRing = new THREE.Mesh(new THREE.RingGeometry(0.20, 0.33, 64), this.moveRingMat);
    this.moveRing.rotation.x = -Math.PI / 2;
    this.moveRing.position.y = this.floorY + 0.02;
    this.player.parent?.add?.(this.moveRing) || this.player.add(this.moveRing);
  },

  update(dt) {
    if (!this.renderer?.xr) return;

    this._snapT = Math.max(0, this._snapT - dt);
    this.tpCooldown = Math.max(0, this.tpCooldown - dt);

    // HEIGHT LOCK: keeps in-game eye constant while you sit/stand
    if (this.lockHeight) {
      const camLocalY = this.camera.position.y;
      this.player.position.y = this.baseY + (this.targetEyeHeight - camLocalY);
    }

    const session = this.renderer.xr.getSession?.();
    if (!session) {
      this._updateMoveRing(dt, 0);
      this._updateLaserAndTeleportAim(dt, false);
      return;
    }

    // find gamepads
    let left = null, right = null;
    for (const src of session.inputSources || []) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") left = src.gamepad;
      if (src.handedness === "right") right = src.gamepad;
    }

    // Movement
    let moveMag = 0;
    if (left) moveMag = this._moveFromStick(left, dt);

    // Snap turn
    if (right) this._snapTurnFromStick(right);

    // Teleport aim + execute
    if (right) this._teleportFromRightController(right, dt);
    else this._updateLaserAndTeleportAim(dt, false);

    this._updateMoveRing(dt, moveMag);
  },

  _moveFromStick(gp, dt) {
    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

    const dx = Math.abs(ax) < 0.12 ? 0 : ax;
    const dy = Math.abs(ay) < 0.12 ? 0 : ay;

    const mag = Math.min(1, Math.sqrt(dx * dx + dy * dy));
    if (mag < 0.01) return 0;

    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    const rightDir = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(fwd, -dy);
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

  _teleportFromRightController(gp, dt) {
    const trigger = gp.buttons?.[0]?.value ?? 0; // right trigger on Quest

    const aiming = trigger > 0.55 && this.tpCooldown <= 0;
    this._updateLaserAndTeleportAim(dt, aiming);

    // start hold
    if (aiming) {
      this.tpActive = true;
      this.tpHold += dt;
      this.targetRingMat.opacity = THREE.MathUtils.lerp(this.targetRingMat.opacity, 0.95, Math.min(1, dt * 12));
      return;
    }

    // release teleport
    if (this.tpActive && trigger < 0.15) {
      this.tpActive = false;
      this.tpHold = 0;
      this.tpCooldown = 0.22;

      // fade ring
      this.targetRingMat.opacity = 0.0;

      // teleport to target (XZ), keep current locked Y
      const dest = this._tmp.copy(this.tpTarget);
      dest.y = this.player.position.y;
      this._tryMoveTo(dest, true);
    }
  },

  _updateLaserAndTeleportAim(dt, aiming) {
    const ctrl = this.controllers?.right;
    if (!ctrl) return;

    // Get controller world origin + direction (-Z)
    ctrl.getWorldPosition(this._rayOrigin);
    ctrl.getWorldDirection(this._rayDir); // points forward
    // Controller forward direction in Three is usually -Z; getWorldDirection returns -Z aligned.
    // We still ray along _rayDir.

    // Intersect ray with floor plane y = floorY
    const origin = this._rayOrigin;
    const dir = this._rayDir;

    // If ray is almost parallel to floor, clamp
    const denom = dir.y;
    let hit = false;

    if (Math.abs(denom) > 0.0001) {
      const t = (this.floorY - origin.y) / denom;
      if (t > 0 && t < this.tpMaxDist) {
        // hit point
        this.tpTarget.copy(origin).addScaledVector(dir, t);
        hit = true;

        // bounds clamp
        if (this.bounds) {
          this.tpTarget.x = THREE.MathUtils.clamp(this.tpTarget.x, this.bounds.min.x, this.bounds.max.x);
          this.tpTarget.z = THREE.MathUtils.clamp(this.tpTarget.z, this.bounds.min.z, this.bounds.max.z);
        }

        // update ring
        this.targetRing.position.set(this.tpTarget.x, this.floorY + 0.02, this.tpTarget.z);
      }
    }

    // update laser line
    const endLocal = new THREE.Vector3(0, 0, -1);
    const maxLen = hit ? origin.distanceTo(this.tpTarget) : 8;

    // laser points down controller -Z, so set end point in controller local space
    endLocal.set(0, 0, -maxLen);

    const pos = this.laser.geometry.attributes.position;
    pos.setXYZ(0, 0, 0, 0);
    pos.setXYZ(1, endLocal.x, endLocal.y, endLocal.z);
    pos.needsUpdate = true;

    // opacity: always visible, brighter while aiming
    this.laserMat.opacity = aiming ? 1.0 : 0.65;

    // ring opacity: only while aiming
    if (!aiming) {
      this.targetRingMat.opacity = THREE.MathUtils.lerp(this.targetRingMat.opacity, 0.0, Math.min(1, dt * 10));
    }
  },

  _updateMoveRing(dt, mag) {
    this.moveRing.position.x = this.player.position.x;
    this.moveRing.position.z = this.player.position.z;

    const target = mag > 0.05 ? 0.85 : 0.0;
    this.moveRingMat.opacity = THREE.MathUtils.lerp(this.moveRingMat.opacity, target, Math.min(1, dt * 12));

    const s = 1 + mag * 0.3;
    this.moveRing.scale.set(s, s, s);

    // gentle pulse for visibility
    const t = (performance.now() * 0.001) % 1;
    this.moveRingMat.emissiveIntensity = mag > 0.05 ? 2.2 + 0.8 * Math.sin(t * Math.PI * 2) : 2.0;
  },

  _tryMoveTo(nextPos, isTeleport = false) {
    // bounds clamp
    if (this.bounds) {
      nextPos.x = THREE.MathUtils.clamp(nextPos.x, this.bounds.min.x, this.bounds.max.x);
      nextPos.z = THREE.MathUtils.clamp(nextPos.z, this.bounds.min.z, this.bounds.max.z);
    }

    // collider AABB block
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
