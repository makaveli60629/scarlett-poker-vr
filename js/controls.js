// js/controls.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { applyZonesToPlayer } from "./state.js";

export const Controls = {
  renderer: null,
  scene: null,
  camera: null,
  player: null,

  // XR controllers
  c0: null,
  c1: null,

  // Desktop fallback
  keys: { w: false, a: false, s: false, d: false, q: false, e: false },
  yaw: 0,

  // Tuning
  moveSpeed: 2.2,     // meters/sec
  turnSpeed: 1.9,     // radians/sec (smooth turn)
  deadzone: 0.15,

  init({ renderer, scene, camera, player }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.player = player;

    // Desktop keys
    window.addEventListener("keydown", (e) => this._onKey(e, true));
    window.addEventListener("keyup", (e) => this._onKey(e, false));

    // XR controllers
    this.c0 = renderer.xr.getController(0);
    this.c1 = renderer.xr.getController(1);

    this.c0.name = "controller0";
    this.c1.name = "controller1";

    scene.add(this.c0);
    scene.add(this.c1);

    // Tiny rays (visual)
    this._addLaser(this.c0);
    this._addLaser(this.c1);

    // initialize yaw from player
    this.yaw = this.player.rotation.y;
  },

  update(dt) {
    const xr = this.renderer.xr.isPresenting;

    if (xr) {
      this._updateXR(dt);
    } else {
      this._updateDesktop(dt);
    }

    // Apply zone blockers after movement
    applyZonesToPlayer(this.player.position);
  },

  _onKey(e, down) {
    const k = e.key.toLowerCase();
    if (k in this.keys) this.keys[k] = down;
  },

  _updateDesktop(dt) {
    // WASD movement relative to camera yaw
    const dir = new THREE.Vector3();
    const camYaw = this._getHeadYaw();

    const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw) * -1).normalize();
    const right = new THREE.Vector3(forward.z * -1, 0, forward.x).normalize();

    if (this.keys.w) dir.add(forward);
    if (this.keys.s) dir.sub(forward);
    if (this.keys.d) dir.add(right);
    if (this.keys.a) dir.sub(right);

    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(this.moveSpeed * dt);
      this.player.position.add(dir);
    }

    // Q/E turn
    if (this.keys.q) this.player.rotation.y += this.turnSpeed * dt;
    if (this.keys.e) this.player.rotation.y -= this.turnSpeed * dt;
  },

  _updateXR(dt) {
    // We prefer LEFT controller stick for movement (common VR standard)
    // Oculus/Meta mapping: axes[2], axes[3] often left stick; varies by browser, so we probe both controllers.
    const gpL = this._getGamepadByHand("left") || this._getAnyGamepad(this.c0);
    const gpR = this._getGamepadByHand("right") || this._getAnyGamepad(this.c1);

    const moveAxes = this._getStickAxes(gpL) || this._getStickAxes(gpR);
    const turnAxes = this._getStickAxes(gpR) || this._getStickAxes(gpL);

    // Movement (left stick)
    if (moveAxes) {
      // IMPORTANT: user said L/R is reversed — so we keep standard:
      // x>0 means move RIGHT, x<0 means move LEFT.
      // If your build had it reversed, that was a sign flip somewhere else.
      const x = this._dz(moveAxes.x);
      const y = this._dz(moveAxes.y);

      // y is usually forward/back (up is -1), we convert to forward positive:
      const forwardAmt = -y;
      const rightAmt = x;

      const camYaw = this._getHeadYaw();
      const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw) * -1).normalize();
      const right = new THREE.Vector3(forward.z * -1, 0, forward.x).normalize();

      const move = new THREE.Vector3()
        .addScaledVector(forward, forwardAmt)
        .addScaledVector(right, rightAmt);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(this.moveSpeed * dt);
        this.player.position.add(move);
      }
    }

    // Turning (right stick X)
    if (turnAxes) {
      const tx = this._dz(turnAxes.x);
      if (Math.abs(tx) > 0) {
        // tx>0 should turn RIGHT (clockwise), which in three.js is negative Y rotation
        this.player.rotation.y -= tx * this.turnSpeed * dt;
      }
    }
  },

  _getHeadYaw() {
    // derive yaw from camera world direction
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    // yaw around Y: atan2(x, z)
    return Math.atan2(dir.x, dir.z);
  },

  _dz(v) {
    if (!Number.isFinite(v)) return 0;
    return Math.abs(v) < this.deadzone ? 0 : v;
  },

  _getAnyGamepad(controller) {
    const src = controller?.inputSource;
    return src?.gamepad || null;
  },

  _getGamepadByHand(handedness) {
    const session = this.renderer.xr.getSession?.();
    if (!session) return null;

    for (const src of session.inputSources) {
      if (src?.handedness === handedness && src?.gamepad) return src.gamepad;
    }
    return null;
  },

  _getStickAxes(gamepad) {
    if (!gamepad || !Array.isArray(gamepad.axes)) return null;

    const a = gamepad.axes;
    // Common layouts:
    // - Some browsers use [0,1] for left stick
    // - Others use [2,3]
    // We'll choose whichever pair has larger magnitude right now.
    const p01 = { x: a[0] ?? 0, y: a[1] ?? 0 };
    const p23 = { x: a[2] ?? 0, y: a[3] ?? 0 };

    const m01 = p01.x * p01.x + p01.y * p01.y;
    const m23 = p23.x * p23.x + p23.y * p23.y;

    const pick = m23 > m01 ? p23 : p01;
    return { x: pick.x, y: pick.y };
  },

  _addLaser(controller) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ffaa });
    const line = new THREE.Line(geom, mat);
    line.scale.z = 4;
    controller.add(line);
  },
};
