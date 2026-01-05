// js/controls.js
// XR Controls + Laser + Smooth Locomotion + Optional 45° stick
// Requires importmap for "three" OR use CDN import in your project.

import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "three/addons/webxr/XRHandModelFactory.js";

export const Controls = {
  // public config
  moveSpeed: 2.25,          // meters/sec
  rotateSpeed: 1.6,         // radians/sec (for smooth yaw)
  deadZone: 0.14,
  snap45: true,             // <— your “45-degree angle” preference
  invertStrafe: false,      // if you still feel reversed, flip this true

  // internals
  renderer: null,
  scene: null,
  camera: null,

  rig: null,            // group that moves (player root)
  head: null,           // camera inside rig

  c0: null, c1: null,   // controllers
  g0: null, g1: null,   // controller grips (models)
  h0: null, h1: null,   // hands
  rays: [],

  tmpVec: new THREE.Vector3(),
  tmpQuat: new THREE.Quaternion(),
  tmpMat: new THREE.Matrix4(),

  // stick values per controller
  axes: [
    { x: 0, y: 0, yaw: 0 },
    { x: 0, y: 0, yaw: 0 },
  ],

  init({ renderer, scene, camera }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Build the rig that will move around the world
    this.rig = new THREE.Group();
    this.rig.name = "PlayerRig";
    this.rig.position.set(0, 0, 0);

    this.head = new THREE.Group();
    this.head.name = "HeadAnchor";
    this.head.add(camera);

    this.rig.add(this.head);
    scene.add(this.rig);

    // Controllers
    this.c0 = renderer.xr.getController(0);
    this.c1 = renderer.xr.getController(1);
    this.c0.name = "XRController0";
    this.c1.name = "XRController1";

    // Grips (controller models)
    const cmf = new XRControllerModelFactory();
    this.g0 = renderer.xr.getControllerGrip(0);
    this.g1 = renderer.xr.getControllerGrip(1);
    this.g0.add(cmf.createControllerModel(this.g0));
    this.g1.add(cmf.createControllerModel(this.g1));
    this.g0.name = "XRGrip0";
    this.g1.name = "XRGrip1";

    // Hands (hand tracking)
    const hmf = new XRHandModelFactory();
    this.h0 = renderer.xr.getHand(0);
    this.h1 = renderer.xr.getHand(1);
    this.h0.name = "XRHand0";
    this.h1.name = "XRHand1";
    this.h0.add(hmf.createHandModel(this.h0, "mesh"));
    this.h1.add(hmf.createHandModel(this.h1, "mesh"));

    // ✅ CRITICAL: parent everything to the rig (NOT the scene)
    this.rig.add(this.c0, this.c1, this.g0, this.g1, this.h0, this.h1);

    // Lasers (rays)
    this.rays = [
      this._makeRay("Ray0"),
      this._makeRay("Ray1"),
    ];
    this.c0.add(this.rays[0]);
    this.c1.add(this.rays[1]);

    // Event hookup
    this._bindController(this.c0, 0);
    this._bindController(this.c1, 1);

    // Make sure rays are visible on start
    this._setRayVisible(0, true);
    this._setRayVisible(1, true);
  },

  // Create a simple laser line in controller local space
  _makeRay(name) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ffaa });
    const line = new THREE.Line(geom, mat);
    line.name = name;
    line.scale.z = 8; // length
    line.frustumCulled = false;
    return line;
  },

  _setRayVisible(i, on) {
    if (!this.rays[i]) return;
    this.rays[i].visible = !!on;
  },

  _bindController(ctrl, index) {
    ctrl.addEventListener("connected", (e) => {
      // e.data.gamepad exists on controllers
      // Helpful for debugging:
      // console.log("Controller connected", index, e.data);
    });

    ctrl.addEventListener("disconnected", () => {
      this.axes[index] = { x: 0, y: 0, yaw: 0 };
    });
  },

  // Call every frame
  update(dt) {
    if (!this.renderer?.xr?.isPresenting) return;

    // Read gamepad axes from XR session inputSources
    this._pollGamepads();

    // Apply locomotion using LEFT stick by default.
    // If you want “everything on left controller”, keep it this way.
    this._applyMovement(dt, /*controllerIndex=*/0);

    // Optional: allow yaw from right stick X (controller 1)
    this._applyYaw(dt, /*controllerIndex=*/1);
  },

  _pollGamepads() {
    const session = this.renderer.xr.getSession?.();
    if (!session) return;

    // Reset
    for (let i = 0; i < 2; i++) this.axes[i] = { x: 0, y: 0, yaw: 0 };

    // Find up to 2 input sources with gamepads
    let found = 0;
    for (const src of session.inputSources) {
      if (!src || !src.gamepad) continue;
      const gp = src.gamepad;

      // Heuristic: map first two we find into index 0/1
      const idx = found;
      found++;
      if (idx > 1) break;

      // Most Oculus/Quest controllers: axes[2], axes[3] are thumbstick
      const axX = gp.axes?.[2] ?? gp.axes?.[0] ?? 0;
      const axY = gp.axes?.[3] ?? gp.axes?.[1] ?? 0;

      // Save: x = strafe, y = forward/back (note: many devices use -Y forward)
      this.axes[idx].x = axX;
      this.axes[idx].y = axY;
    }
  },

  _applyMovement(dt, controllerIndex = 0) {
    const a = this.axes[controllerIndex];
    if (!a) return;

    // Deadzone
    let x = a.x;
    let y = a.y;

    if (Math.abs(x) < this.deadZone) x = 0;
    if (Math.abs(y) < this.deadZone) y = 0;

    // If both zero, nothing to do
    if (!x && !y) return;

    // Convert stick to desired direction (Quest typically: forward = -y)
    // So "forward" magnitude:
    let forward = -y;
    let strafe = x;

    // Fix reverse left/right (your request)
    // If you still feel reversed after this update, flip invertStrafe=true.
    if (!this.invertStrafe) {
      // normal: strafe right is +x
      // keep as is
    } else {
      strafe *= -1;
    }

    // Optional: snap to 45° increments
    if (this.snap45) {
      const angle = Math.atan2(strafe, forward); // radians
      const mag = Math.min(1, Math.sqrt(strafe * strafe + forward * forward));
      const step = Math.PI / 4; // 45°
      const snapped = Math.round(angle / step) * step;
      forward = Math.cos(snapped) * mag;
      strafe = Math.sin(snapped) * mag;
    }

    // Movement direction relative to headset yaw (feels natural)
    // Get headset yaw only
    this.camera.getWorldQuaternion(this.tmpQuat);
    const e = new THREE.Euler().setFromQuaternion(this.tmpQuat, "YXZ");
    const yaw = e.y;

    const dir = this.tmpVec.set(strafe, 0, forward);
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    dir.normalize();

    const speed = this.moveSpeed;
    this.rig.position.addScaledVector(dir, speed * dt);
  },

  _applyYaw(dt, controllerIndex = 1) {
    const a = this.axes[controllerIndex];
    if (!a) return;

    // Use right stick X for yaw, if present
    let x = a.x;
    if (Math.abs(x) < this.deadZone) x = 0;
    if (!x) return;

    // Smooth yaw rotate rig around Y
    this.rig.rotation.y -= x * this.rotateSpeed * dt;
  },

  // Helper you can call from world.js to set spawn safely
  setSpawn(x, y, z) {
    if (!this.rig) return;
    this.rig.position.set(x, y, z);
  },

  // Call this once you confirm you want hands visible/hidden
  setHandsEnabled(on) {
    if (this.h0) this.h0.visible = !!on;
    if (this.h1) this.h1.visible = !!on;
  },

  setControllersEnabled(on) {
    if (this.g0) this.g0.visible = !!on;
    if (this.g1) this.g1.visible = !!on;
    if (this.c0) this.c0.visible = !!on;
    if (this.c1) this.c1.visible = !!on;
  },
};
