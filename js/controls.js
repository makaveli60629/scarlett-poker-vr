// /js/controls.js — Scarlett Poker VR — Controls v2 (Quest-ready)
// VR: left stick move, right stick snap turn, right trigger teleport
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,
  colliders: [],
  bounds: null,
  controllers: null,

  moveSpeed: 2.2,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.25,
  snapT: 0,

  tpActive: false,
  tpHold: 0,
  tpMaxRadius: 6.0,
  tpTarget: new THREE.Vector3(),
  tpRings: null,
  tpCooldown: 0,

  _dir: new THREE.Vector3(),
  _right: new THREE.Vector3(),
  _tmp: new THREE.Vector3(),
  _yAxis: new THREE.Vector3(0,1,0),

  init({ renderer, camera, player, colliders = [], bounds = null, controllers = null }) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.colliders = colliders;
    this.bounds = bounds;
    this.controllers = controllers;

    this.tpRings = this._buildTeleportRings();
    this.tpRings.visible = false;
    this.player.parent?.add?.(this.tpRings) || this.player.add(this.tpRings);
  },

  update(dt) {
    const session = this.renderer?.xr?.getSession?.();
    if (!session) return;

    this.snapT = Math.max(0, this.snapT - dt);
    this.tpCooldown = Math.max(0, this.tpCooldown - dt);

    let left = null, right = null;
    for (const src of session.inputSources || []) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") left = src.gamepad;
      if (src.handedness === "right") right = src.gamepad;
    }

    if (left) this._move(left, dt);
    if (right) this._snap(right);
    if (right) this._teleport(right, dt);
  },

  _move(gp, dt) {
    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

    const dx = Math.abs(ax) < 0.12 ? 0 : ax;
    const dy = Math.abs(ay) < 0.12 ? 0 : ay;
    if (dx === 0 && dy === 0) return;

    this.camera.getWorldDirection(this._dir);
    this._dir.y = 0;
    this._dir.normalize();

    this._right.crossVectors(this._dir, this._yAxis).normalize();

    const move = new THREE.Vector3()
      .addScaledVector(this._dir, -dy)
      .addScaledVector(this._right, dx)
      .normalize();

    const next = this._tmp.copy(this.player.position).addScaledVector(move, this.moveSpeed * dt);
    this._tryMoveTo(next, false);
  },

  _snap(gp) {
    if (this.snapT > 0) return;
    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    if (Math.abs(ax) < 0.85) return;

    this.snapT = this.snapCooldown;
    this.player.rotation.y += (ax > 0 ? -this.snapAngle : this.snapAngle);
  },

  _teleport(gp, dt) {
    const trigger = gp.buttons?.[0]?.value ?? 0;

    if (trigger > 0.75 && this.tpCooldown <= 0) {
      this.tpHold += dt;
      this.tpActive = true;

      const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
      const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

      this.camera.getWorldDirection(this._dir);
      this._dir.y = 0;
      this._dir.normalize();
      this._right.crossVectors(this._dir, this._yAxis).normalize();

      const off = new THREE.Vector3()
        .addScaledVector(this._dir, -ay)
        .addScaledVector(this._right, ax);

      if (off.lengthSq() < 0.02) off.copy(this._dir);
      off.normalize();

      const dist = THREE.MathUtils.clamp(1.5 + this.tpHold * 3.0, 1.5, this.tpMaxRadius);
      this.tpTarget.copy(this.player.position).addScaledVector(off, dist);

      if (this.bounds) {
        this.tpTarget.x = THREE.MathUtils.clamp(this.tpTarget.x, this.bounds.min.x, this.bounds.max.x);
        this.tpTarget.z = THREE.MathUtils.clamp(this.tpTarget.z, this.bounds.min.z, this.bounds.max.z);
      }

      this.tpRings.visible = true;
      this.tpRings.position.set(this.tpTarget.x, 0.01, this.tpTarget.z);
      return;
    }

    if (this.tpActive && trigger < 0.2) {
      this.tpActive = false;
      this.tpHold = 0;
      this.tpCooldown = 0.25;

      this.tpRings.visible = false;
      const dest = this._tmp.copy(this.tpTarget);
      dest.y = this.player.position.y;
      this._tryMoveTo(dest, true);
    }
  },

  _buildTeleportRings() {
    const g = new THREE.Group();
    const mk = (r, c) =>
      new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.03, 10, 48),
        new THREE.MeshStandardMaterial({
          color: c,
          emissive: c,
          emissiveIntensity: 1.6,
          roughness: 0.25,
          metalness: 0.05,
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

  _tryMoveTo(nextPos, isTeleport) {
    if (this.bounds) {
      nextPos.x = THREE.MathUtils.clamp(nextPos.x, this.bounds.min.x, this.bounds.max.x);
      nextPos.z = THREE.MathUtils.clamp(nextPos.z, this.bounds.min.z, this.bounds.max.z);
    }

    // Simple collision vs collider boxes (if provided)
    const r = 0.28;
    for (const c of this.colliders || []) {
      const box = c.userData?.box;
      if (!box) continue;

      // refresh box (colliders don't move, but safe)
      box.setFromObject(c);

      if (
        nextPos.x > box.min.x - r && nextPos.x < box.max.x + r &&
        nextPos.z > box.min.z - r && nextPos.z < box.max.z + r
      ) {
        if (isTeleport) return;
        return;
      }
    }

    this.player.position.copy(nextPos);
  },
};
