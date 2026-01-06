// /js/controls.js — Scarlett Poker VR — Controls v1 (Guaranteed Working)
// Desktop: WASD + mouse look (hold right mouse to look)
// VR: left stick move, right stick snap turn, right trigger teleport
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,
  colliders: [],
  bounds: null,

  // Desktop state
  keys: { w:0,a:0,s:0,d:0 },
  mouseLook: false,
  yaw: 0,

  // VR tuning
  moveSpeed: 2.2,
  snapAngle: THREE.MathUtils.degToRad(45),
  snapCooldown: 0.25,
  snapT: 0,

  // Teleport
  tpActive: false,
  tpHold: 0,
  tpMaxRadius: 6.0,
  tpTarget: new THREE.Vector3(),
  tpRings: null,
  tpCooldown: 0,

  // Helpers
  _tmp: new THREE.Vector3(),
  _dir: new THREE.Vector3(),
  _right: new THREE.Vector3(),
  _yAxis: new THREE.Vector3(0,1,0),

  init({ renderer, camera, player, colliders = [], bounds = null }) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.colliders = colliders;
    this.bounds = bounds;

    // Desktop keys
    window.addEventListener("keydown", (e) => this._key(e, 1));
    window.addEventListener("keyup", (e) => this._key(e, 0));

    // Mouse look (right button)
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("mousedown", (e) => { if (e.button === 2) this.mouseLook = true; });
    window.addEventListener("mouseup", (e) => { if (e.button === 2) this.mouseLook = false; });
    window.addEventListener("mousemove", (e) => {
      if (!this.mouseLook) return;
      this.yaw -= e.movementX * 0.0022;
      this.player.rotation.y = this.yaw;
    });

    // Teleport rings
    this.tpRings = this._buildTeleportRings();
    this.tpRings.visible = false;
    this.player.parent?.add?.(this.tpRings) || this.player.add(this.tpRings);
  },

  update(dt) {
    if (!this.renderer) return;

    // Desktop move always works (even without VR session)
    this._desktopMove(dt);

    // VR controls only when in session
    const session = this.renderer.xr.getSession?.();
    if (!session) return;

    this.snapT = Math.max(0, this.snapT - dt);
    this.tpCooldown = Math.max(0, this.tpCooldown - dt);

    let left = null, right = null;
    for (const src of session.inputSources || []) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") left = src.gamepad;
      if (src.handedness === "right") right = src.gamepad;
    }

    if (left) this._vrMove(left, dt);
    if (right) this._vrSnapTurn(right);
    if (right) this._vrTeleport(right, dt);
  },

  // ---------------- Desktop ----------------
  _key(e, v){
    const k = (e.key || "").toLowerCase();
    if (k === "w") this.keys.w = v;
    if (k === "a") this.keys.a = v;
    if (k === "s") this.keys.s = v;
    if (k === "d") this.keys.d = v;
  },

  _desktopMove(dt){
    const x = (this.keys.d - this.keys.a);
    const z = (this.keys.w - this.keys.s);
    if (x === 0 && z === 0) return;

    // forward from camera yaw
    this.camera.getWorldDirection(this._dir);
    this._dir.y = 0; this._dir.normalize();
    this._right.crossVectors(this._dir, this._yAxis).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(this._dir, z);
    move.addScaledVector(this._right, x);
    move.normalize();

    const next = this._tmp.copy(this.player.position).addScaledVector(move, dt * 2.2);
    this._tryMoveTo(next, false);
  },

  // ---------------- VR Move/Snap/Teleport ----------------
  _vrMove(gp, dt){
    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

    const dx = Math.abs(ax) < 0.12 ? 0 : ax;
    const dy = Math.abs(ay) < 0.12 ? 0 : ay;
    if (dx === 0 && dy === 0) return;

    this.camera.getWorldDirection(this._dir);
    this._dir.y = 0; this._dir.normalize();
    this._right.crossVectors(this._dir, this._yAxis).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(this._dir, -dy);
    move.addScaledVector(this._right, dx);
    move.normalize();

    const next = this._tmp.copy(this.player.position).addScaledVector(move, this.moveSpeed * dt);
    this._tryMoveTo(next, false);
  },

  _vrSnapTurn(gp){
    if (this.snapT > 0) return;
    const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
    if (Math.abs(ax) < 0.85) return;

    this.snapT = this.snapCooldown;
    this.player.rotation.y += (ax > 0 ? -this.snapAngle : this.snapAngle);
    this.yaw = this.player.rotation.y;
  },

  _vrTeleport(gp, dt){
    const trigger = gp.buttons?.[0]?.value ?? 0;

    if (trigger > 0.75 && this.tpCooldown <= 0) {
      this.tpHold += dt;
      this.tpActive = true;

      const ax = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
      const ay = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

      this.camera.getWorldDirection(this._dir);
      this._dir.y = 0; this._dir.normalize();
      this._right.crossVectors(this._dir, this._yAxis).normalize();

      const off = new THREE.Vector3();
      off.addScaledVector(this._dir, -ay);
      off.addScaledVector(this._right, ax);
      if (off.lengthSq() < 0.02) off.copy(this._dir);
      off.normalize();

      const dist = THREE.MathUtils.clamp(1.5 + this.tpHold * 3.0, 1.5, this.tpMaxRadius);

      this.tpTarget.copy(this.player.position).addScaledVector(off, dist);
      this.tpTarget.y = this.player.position.y;

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
      this._tryMoveTo(dest, true);
    }
  },

  _buildTeleportRings(){
    const g = new THREE.Group();
    const mk = (r, c) =>
      new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.03, 10, 48),
        new THREE.MeshStandardMaterial({
          color: c, emissive: c, emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.05
        })
      );
    const r1 = mk(0.22, 0xff2bd6);
    const r2 = mk(0.30, 0x2bd7ff);
    const r3 = mk(0.38, 0x00ffaa);
    r1.rotation.x = r2.rotation.x = r3.rotation.x = Math.PI/2;
    r1.position.y = r2.position.y = r3.position.y = 0.02;
    g.add(r1,r2,r3);
    return g;
  },

  // ---------------- Collision/Bounds ----------------
  _tryMoveTo(nextPos, isTeleport){
    if (this.bounds) {
      nextPos.x = THREE.MathUtils.clamp(nextPos.x, this.bounds.min.x, this.bounds.max.x);
      nextPos.z = THREE.MathUtils.clamp(nextPos.z, this.bounds.min.z, this.bounds.max.z);
    }

    const r = 0.28;
    for (const c of this.colliders || []) {
      const box = c.isBox3 ? c : c.userData?.box;
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
