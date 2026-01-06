// /js/controls.js — Update 9.0 Fix Pack A
// - Player height boost (so you can see the table)
// - Snap turn 45° on RIGHT stick
// - Smooth locomotion on LEFT stick
// - Teleport with LEFT trigger: show rainbow ray + 3 neon circles, release to teleport
// - Collision against World.colliders + bounds

import * as THREE from "./three.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,
  colliders: [],
  bounds: null,
  teleport: null,
  spawn: null,

  // movement
  moveSpeed: 2.1,
  snapAngle: Math.PI / 4, // 45 degrees
  snapCooldown: 0,
  snapCooldownTime: 0.28,

  // height
  heightBoost: 0.35, // YOU REQUESTED "taller"

  // teleport visuals
  ray: null,
  rayGlow: null,
  reticle: null,
  teleportActive: false,
  teleportPoint: new THREE.Vector3(),

  // input state
  _leftSource: null,
  _rightSource: null,

  init(opts) {
    this.renderer = opts.renderer;
    this.camera = opts.camera;
    this.player = opts.player;
    this.colliders = opts.colliders || [];
    this.bounds = opts.bounds || { minX: -12, maxX: 12, minZ: -12, maxZ: 12 };
    this.teleport = opts.teleport || null;
    this.spawn = opts.spawn || { position: new THREE.Vector3(0, 0, 4), yaw: Math.PI };

    // spawn
    this.player.position.copy(this.spawn.position);
    this.player.rotation.y = this.spawn.yaw || 0;
    this.player.position.y = 0; // floor baseline

    this.buildTeleportVisuals();
  },

  buildTeleportVisuals() {
    // Rainbow ray (line with vertex colors) + glow line
    const pts = [new THREE.Vector3(), new THREE.Vector3(0, 0, -1)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);

    // vertex colors (approx rainbow)
    const colors = new Float32Array([
      1, 0, 0,  // red
      0.6, 0, 1 // violet
    ]);
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
    this.ray = new THREE.Line(geo, mat);
    this.ray.visible = false;

    const glowMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
    this.rayGlow = new THREE.Line(geo.clone(), glowMat);
    this.rayGlow.visible = false;
    this.rayGlow.scale.set(1.02, 1.02, 1.02);

    // 3 neon circles reticle
    this.reticle = new THREE.Group();
    this.reticle.visible = false;

    const mkRing = (r, c, e) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.012, 10, 64),
        new THREE.MeshStandardMaterial({
          color: c,
          emissive: c,
          emissiveIntensity: e,
          roughness: 0.25
        })
      );
      ring.rotation.x = Math.PI / 2;
      return ring;
    };

    this.reticle.add(
      mkRing(0.18, 0xff2bd6, 1.1),
      mkRing(0.26, 0x2bd7ff, 1.1),
      mkRing(0.34, 0x00ffaa, 1.1)
    );

    const dot = new THREE.PointLight(0x2bd7ff, 0.65, 5);
    dot.position.set(0, 0.2, 0);
    this.reticle.add(dot);

    // attach visuals to player (not controllers—stable)
    this.player.add(this.ray);
    this.player.add(this.rayGlow);
    this.player.add(this.reticle);
  },

  update(dt) {
    this.snapCooldown = Math.max(0, this.snapCooldown - dt);

    const session = this.renderer.xr.getSession?.();
    if (session) this.readXRInput(session);

    // Always keep "standing height" stable:
    // We can’t force headset height, but we can raise the rig to keep you taller consistently.
    // This adds a constant boost.
    this.player.position.y = 0 + this.heightBoost;

    // locomotion + snap turn
    this.updateMovement(dt);

    // teleport mode
    this.updateTeleport(dt);
  },

  readXRInput(session) {
    this._leftSource = null;
    this._rightSource = null;

    for (const src of session.inputSources || []) {
      if (!src || !src.gamepad) continue;
      if (src.handedness === "left") this._leftSource = src;
      if (src.handedness === "right") this._rightSource = src;
    }
  },

  updateMovement(dt) {
    const ls = this._leftSource?.gamepad;
    const rs = this._rightSource?.gamepad;

    // LEFT stick movement
    if (ls && ls.axes && ls.axes.length >= 2) {
      const x = ls.axes[0];
      const y = ls.axes[1];

      const dead = 0.14;
      const mx = Math.abs(x) > dead ? x : 0;
      const my = Math.abs(y) > dead ? y : 0;

      if (mx !== 0 || my !== 0) {
        // forward based on camera yaw
        const yaw = this.player.rotation.y;
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

        const move = new THREE.Vector3();
        move.addScaledVector(forward, -my);
        move.addScaledVector(right, mx);
        move.normalize().multiplyScalar(this.moveSpeed * dt);

        this.tryMove(move);
      }
    }

    // RIGHT stick snap turn (45 degrees)
    if (rs && rs.axes && rs.axes.length >= 2) {
      const x = rs.axes[0];
      const dead = 0.60;
      if (this.snapCooldown <= 0) {
        if (x > dead) {
          this.player.rotation.y -= this.snapAngle;
          this.snapCooldown = this.snapCooldownTime;
        } else if (x < -dead) {
          this.player.rotation.y += this.snapAngle;
          this.snapCooldown = this.snapCooldownTime;
        }
      }
    }
  },

  updateTeleport(dt) {
    const ls = this._leftSource?.gamepad;
    if (!ls) return;

    const trigger = ls.buttons?.[0]?.value || 0; // left trigger
    const held = trigger > 0.55;

    if (held && !this.teleportActive) {
      this.teleportActive = true;
      this.ray.visible = true;
      this.rayGlow.visible = true;
      this.reticle.visible = true;
    }

    if (!held && this.teleportActive) {
      // release => teleport
      this.teleportActive = false;
      this.ray.visible = false;
      this.rayGlow.visible = false;
      this.reticle.visible = false;

      // move player to teleportPoint (keep height boost)
      const target = this.teleportPoint.clone();
      target.y = 0 + this.heightBoost;

      // final clamp + collision-safe nudge
      target.x = THREE.MathUtils.clamp(target.x, this.bounds.minX + 0.4, this.bounds.maxX - 0.4);
      target.z = THREE.MathUtils.clamp(target.z, this.bounds.minZ + 0.4, this.bounds.maxZ - 0.4);

      // avoid teleporting into colliders by backing off
      const safe = this.findSafePoint(target);
      this.player.position.copy(safe);
    }

    if (this.teleportActive) {
      // Aim ray downward (your request: circle stays on floor)
      // We'll cast from camera forward but tilt down
      const yaw = this.player.rotation.y;
      const origin = this.player.position.clone();
      origin.y = 1.6 + this.heightBoost;

      const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
      dir.y = -0.85;
      dir.normalize();

      // intersect with floor y = heightBoost (visual floor)
      const t = (this.heightBoost - origin.y) / dir.y;
      const hit = origin.clone().addScaledVector(dir, Math.max(0.0, t));

      this.teleportPoint.copy(hit);

      // update line geometry
      const a = new THREE.Vector3(0, 0, 0);
      const b = hit.clone().sub(this.player.position);

      const pts = [a, b];
      this.ray.geometry.setFromPoints(pts);
      this.rayGlow.geometry.setFromPoints(pts);

      // put reticle on floor
      this.reticle.position.copy(hit);
      this.reticle.position.y = this.heightBoost + 0.02;

      // pulsing glow
      const pulse = 1.0 + Math.sin(performance.now() * 0.01) * 0.25;
      this.rayGlow.material.opacity = 0.14 * pulse;
    }
  },

  tryMove(delta) {
    const next = this.player.position.clone().add(delta);

    // clamp bounds
    next.x = THREE.MathUtils.clamp(next.x, this.bounds.minX + 0.35, this.bounds.maxX - 0.35);
    next.z = THREE.MathUtils.clamp(next.z, this.bounds.minZ + 0.35, this.bounds.maxZ - 0.35);

    // collision check against AABBs (treat player as small capsule)
    if (this.isBlocked(next)) return;

    this.player.position.copy(next);
  },

  isBlocked(pos) {
    const p = new THREE.Vector3(pos.x, 0.9, pos.z);
    const r = 0.35; // player radius

    for (const box of this.colliders) {
      const clamped = new THREE.Vector3(
        THREE.MathUtils.clamp(p.x, box.min.x, box.max.x),
        THREE.MathUtils.clamp(p.y, box.min.y, box.max.y),
        THREE.MathUtils.clamp(p.z, box.min.z, box.max.z)
      );
      const d = clamped.distanceTo(p);
      if (d < r) return true;
    }
    return false;
  },

  findSafePoint(pos) {
    // If inside a collider, step backwards a bit
    if (!this.isBlocked(pos)) return pos;

    const back = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0,1,0), this.player.rotation.y);
    let test = pos.clone();
    for (let i = 0; i < 18; i++) {
      test.addScaledVector(back, 0.15);
      if (!this.isBlocked(test)) return test;
    }
    return this.player.position.clone();
  }
};
