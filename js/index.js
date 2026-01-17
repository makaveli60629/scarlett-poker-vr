// /js/index.js — ScarlettVR Prime Entry (FULL)
// BUILD: INDEX_FULL_v1
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { createWorld } from "./world.js";

const BUILD = "INDEX_FULL_v1";
const log = (...a) => console.log("[index]", ...a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function deadzone(v, dz = 0.15) {
  const av = Math.abs(v);
  if (av < dz) return 0;
  // rescale so it ramps from 0 at dz -> 1 at 1
  const s = (av - dz) / (1 - dz);
  return Math.sign(v) * clamp(s, 0, 1);
}

export async function boot({ Scarlett, diag }) {
  diag?.write?.(`[index] build=${BUILD}`);

  const app = document.getElementById("app");
  if (!app) throw new Error("Missing #app");

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  app.appendChild(renderer.domElement);

  // Scene / Camera / Rig
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x05060a, 8, 55);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3);

  const userRig = new THREE.Group();
  userRig.name = "userRig";
  userRig.add(camera);
  scene.add(userRig);

  // XR Button
  document.body.appendChild(VRButton.createButton(renderer));

  // World
  const world = createWorld({ THREE, scene, renderer, camera, userRig, Scarlett, diag });

  // Lighting (good defaults)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1a2230, 0.75);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(6, 12, 4);
  key.castShadow = false;
  scene.add(key);

  // Controllers
  const controllerModelFactory = new XRControllerModelFactory();

  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  const g0 = renderer.xr.getControllerGrip(0);
  const g1 = renderer.xr.getControllerGrip(1);

  g0.add(controllerModelFactory.createControllerModel(g0));
  g1.add(controllerModelFactory.createControllerModel(g1));

  scene.add(c0, c1, g0, g1);

  // Rays (for pointing + teleport)
  function makeRay() {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 10;
    return line;
  }
  const ray0 = makeRay();
  const ray1 = makeRay();
  c0.add(ray0);
  c1.add(ray1);

  // Input state
  const input = {
    // locomotion
    moveSpeed: 2.0,           // meters/sec
    snapAngle: Math.PI / 4,   // 45 degrees
    snapCooldown: 0,
    // teleport
    teleportMode: false,
    teleportValid: false,
    teleportPoint: new THREE.Vector3(),
    // UI
    lastY: false,
    lastX: false,
    lastA: false,
    lastB: false,
    lastLeftStickPress: false,
    lastRightStickPress: false
  };

  // Teleport visuals (simple reticle)
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.11, 32),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  scene.add(reticle);

  // Helper: get XR gamepads by handedness
  function getPads() {
    const session = renderer.xr.getSession();
    const pads = { left: null, right: null };
    if (!session) return pads;

    for (const src of session.inputSources) {
      if (!src || !src.gamepad) continue;
      const h = src.handedness;
      if (h === "left") pads.left = src.gamepad;
      if (h === "right") pads.right = src.gamepad;
    }
    return pads;
  }

  // Teleport raycast onto world floor
  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();
  const tmpOrigin = new THREE.Vector3();
  const tmpDir = new THREE.Vector3(0, 0, -1);

  function updateTeleportFromController(ctrl, floorMeshes) {
    // world-space ray
    tmpMat.identity().extractRotation(ctrl.matrixWorld);
    tmpOrigin.setFromMatrixPosition(ctrl.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMat).normalize();

    raycaster.set(tmpOrigin, tmpDir);
    const hits = raycaster.intersectObjects(floorMeshes, true);
    if (hits && hits.length) {
      input.teleportValid = true;
      input.teleportPoint.copy(hits[0].point);
      reticle.visible = true;
      reticle.position.copy(hits[0].point);
    } else {
      input.teleportValid = false;
      reticle.visible = false;
    }
  }

  // Resize
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  // Main loop
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);

    // Update world (animations, chips, etc.)
    world.update?.(dt);

    // XR input
    const pads = getPads();
    const lp = pads.left;
    const rp = pads.right;

    // Oculus Touch common mapping:
    // left: X=buttons[3], Y=buttons[4] (sometimes swapped by UA), stick=axes[0],axes[1], stickPress=buttons[8]
    // right: A=buttons[3], B=buttons[4], stick=axes[2],axes[3] or axes[0],axes[1] depending device; stickPress=buttons[9]
    // We'll detect axes counts and pick safest indices.
    const lAxes = lp?.axes || [];
    const rAxes = rp?.axes || [];

    // Choose move axes:
    // Prefer right stick for movement if present (Quest users often prefer right move).
    // But if only 2 axes exist, use those.
    const rMoveX = deadzone(rAxes.length >= 4 ? rAxes[2] : rAxes[0] || 0);
    const rMoveY = deadzone(rAxes.length >= 4 ? rAxes[3] : rAxes[1] || 0);

    // Snap turn on left stick X (if available), else right stick X.
    const lTurnX = deadzone(lAxes[0] || 0);

    // Buttons (best-effort, tolerant)
    const lButtons = lp?.buttons || [];
    const rButtons = rp?.buttons || [];

    const btnX = !!lButtons[3]?.pressed; // X
    const btnY = !!lButtons[4]?.pressed; // Y
    const btnA = !!rButtons[3]?.pressed; // A
    const btnB = !!rButtons[4]?.pressed; // B

    const lStickPress = !!lButtons[8]?.pressed;
    const rStickPress = !!rButtons[9]?.pressed;

    const lGrip = !!lButtons[1]?.pressed; // grip
    const rGrip = !!rButtons[1]?.pressed; // grip
    const rTrigger = !!rButtons[0]?.pressed;

    // --- Y toggles diagnostics (what you lost) ---
    if (btnY && !input.lastY) {
      Scarlett.flags.showDiag = !Scarlett.flags.showDiag;
      Scarlett.diag?.setEnabled?.(Scarlett.flags.showDiag);
      diag?.write?.(`[ui] diag=${Scarlett.flags.showDiag ? "ON" : "OFF"}`);
    }
    input.lastY = btnY;

    // --- X toggles HUD (world overlay elements) ---
    if (btnX && !input.lastX) {
      Scarlett.flags.showHud = !Scarlett.flags.showHud;
      world.setHudVisible?.(Scarlett.flags.showHud);
      diag?.write?.(`[ui] hud=${Scarlett.flags.showHud ? "ON" : "OFF"}`);
    }
    input.lastX = btnX;

    // --- Teleport mode toggle (B) ---
    if (btnB && !input.lastB) {
      input.teleportMode = !input.teleportMode;
      diag?.write?.(`[move] teleportMode=${input.teleportMode ? "ON" : "OFF"}`);
      if (!input.teleportMode) {
        reticle.visible = false;
        input.teleportValid = false;
      }
    }
    input.lastB = btnB;

    // --- Teleport confirm (right grip) when in teleport mode ---
    if (input.teleportMode) {
      // Update reticle from RIGHT controller
      updateTeleportFromController(c1, world.floorMeshes || []);
      if (rGrip && input.teleportValid) {
        // Move rig so camera ends up over teleportPoint
        // Keep current head offset within rig
        const headPos = new THREE.Vector3();
        camera.getWorldPosition(headPos);

        const rigPos = new THREE.Vector3();
        userRig.getWorldPosition(rigPos);

        const offset = headPos.sub(rigPos); // head offset from rig origin
        userRig.position.set(
          input.teleportPoint.x - offset.x,
          userRig.position.y, // keep y; world floor handles visuals
          input.teleportPoint.z - offset.z
        );

        input.teleportMode = false;
        reticle.visible = false;
        input.teleportValid = false;
        diag?.write?.(`[move] teleported ✅`);
      }
    } else {
      // --- Smooth locomotion (right stick) ---
      // Forward is -Y on stick; invert so pushing forward moves forward
      const forward = -rMoveY;
      const strafe = rMoveX;

      if (forward !== 0 || strafe !== 0) {
        // move in camera heading on XZ plane
        const yaw = new THREE.Quaternion();
        camera.getWorldQuaternion(yaw);

        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(yaw);
        fwd.y = 0; fwd.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yaw);
        right.y = 0; right.normalize();

        const v = new THREE.Vector3()
          .addScaledVector(fwd, forward)
          .addScaledVector(right, strafe)
          .normalize()
          .multiplyScalar(input.moveSpeed * dt);

        userRig.position.add(v);
      }

      // --- Snap turn (left stick X) ---
      input.snapCooldown = Math.max(0, input.snapCooldown - dt);
      if (input.snapCooldown === 0 && Math.abs(lTurnX) > 0.85) {
        userRig.rotation.y -= Math.sign(lTurnX) * input.snapAngle;
        input.snapCooldown = 0.22;
      }
    }

    // Rays visible only when teleport mode is ON (cleaner)
    ray0.visible = false;
    ray1.visible = !!input.teleportMode;

    renderer.render(scene, camera);
  });

  log("boot complete");
}
