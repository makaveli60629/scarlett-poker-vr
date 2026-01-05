// js/controls.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Controls = {
  renderer: null,
  camera: null,
  player: null,

  // XR controllers
  left: null,
  right: null,

  // stick state
  axesL: { x: 0, y: 0 },
  axesR: { x: 0, y: 0 },

  // tuning
  moveSpeed: 2.0,      // meters/sec
  deadzone: 0.18,
  strafeInvert: false, // keep false so right = right

  // laser
  rayGroup: null,
  rayLine: null,
  rayEnd: new THREE.Vector3(),

  init(renderer, camera, playerGroup, scene) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = playerGroup;

    // Controllers
    this.left = renderer.xr.getController(0);
    this.right = renderer.xr.getController(1);

    this.left.name = "XR_Left";
    this.right.name = "XR_Right";

    // Input events
    const onConnected = (e) => {
      const gp = e.data?.gamepad;
      // Optional log:
      // console.log("Controller connected:", e.data?.handedness, gp);
    };

    const onDisconnected = () => {};

    this.left.addEventListener("connected", onConnected);
    this.right.addEventListener("connected", onConnected);
    this.left.addEventListener("disconnected", onDisconnected);
    this.right.addEventListener("disconnected", onDisconnected);

    // Build a laser that we can attach to whichever controller is active
    this.rayGroup = new THREE.Group();
    this.rayGroup.name = "controls_ray_group";

    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);

    const mat = new THREE.LineBasicMaterial({ color: 0x00ff66 });
    this.rayLine = new THREE.Line(geom, mat);
    this.rayLine.frustumCulled = false;
    this.rayLine.renderOrder = 999;

    this.rayGroup.add(this.rayLine);

    // Attach to LEFT by default (your preference)
    this.left.add(this.rayGroup);

    if (scene) {
      scene.add(this.left);
      scene.add(this.right);
    }
  },

  _readGamepads() {
    // Read axes safely (Quest gamepads)
    const s = this.renderer?.xr?.getSession?.();
    if (!s) return;

    const sources = s.inputSources || [];
    for (const src of sources) {
      const gp = src.gamepad;
      if (!gp || !gp.axes) continue;

      // Quest: axes usually [x,y] for thumbstick
      const x = gp.axes[2] ?? gp.axes[0] ?? 0;
      const y = gp.axes[3] ?? gp.axes[1] ?? 0;

      if (src.handedness === "left") {
        this.axesL.x = x;
        this.axesL.y = y;
      } else if (src.handedness === "right") {
        this.axesR.x = x;
        this.axesR.y = y;
      }
    }
  },

  _applyDeadzone(v) {
    return Math.abs(v) < this.deadzone ? 0 : v;
  },

  update(dt) {
    if (!this.renderer || !this.camera || !this.player) return;
    this._readGamepads();

    // Use LEFT stick primarily
    let x = this._applyDeadzone(this.axesL.x);
    let y = this._applyDeadzone(this.axesL.y);

    // fallback to right stick if left has no input
    if (x === 0 && y === 0) {
      x = this._applyDeadzone(this.axesR.x);
      y = this._applyDeadzone(this.axesR.y);
    }

    // FIX REVERSE:
    // Strafe should be +x = move right
    // Some setups feel inverted; keep as toggle:
    if (this.strafeInvert) x *= -1;

    // Forward should be -y on most controllers (push up gives negative y)
    // We want push up = move forward, so use (-y)
    const forwardAmt = -y;
    const strafeAmt = x;

    // Direction relative to headset yaw
    const camWorldDir = new THREE.Vector3();
    this.camera.getWorldDirection(camWorldDir);

    // flatten to XZ
    camWorldDir.y = 0;
    camWorldDir.normalize();

    const rightDir = new THREE.Vector3().crossVectors(camWorldDir, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(-1);

    const move = new THREE.Vector3();
    move.addScaledVector(camWorldDir, forwardAmt);
    move.addScaledVector(rightDir, strafeAmt);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(this.moveSpeed * dt);
      this.player.position.add(move);
    }

    // Laser update (prevents “stuck” ray)
    this._updateLaser();
  },

  _updateLaser() {
    // Prefer left controller for laser
    const controller = this.left || this.right;
    if (!controller || !this.rayLine) return;

    // Ensure rayGroup is attached to left (if not already)
    if (this.rayGroup && this.rayGroup.parent !== controller) {
      controller.add(this.rayGroup);
    }

    // Update the line length each frame
    // We'll just draw a 10m ray forward
    this.rayEnd.set(0, 0, -10);

    const posAttr = this.rayLine.geometry.getAttribute("position");
    posAttr.setXYZ(0, 0, 0, 0);
    posAttr.setXYZ(1, this.rayEnd.x, this.rayEnd.y, this.rayEnd.z);
    posAttr.needsUpdate = true;

    this.rayLine.visible = true;
  },
};
