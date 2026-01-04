import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { State } from "./state.js";
import { World } from "./world.js";
import { Table } from "./table.js";
import { Chairs } from "./chair.js";
import { UI } from "./ui.js";
import { Store } from "./store.js";
import { AudioSys } from "./audio.js";
import { createMobileJoystick, applyMovement } from "./controls.js";
import { Bots } from "./bots.js";

const statusLine = document.getElementById("statusLine");
const canvasWrap = document.getElementById("canvasWrap");

const btnReset = document.getElementById("btnReset");
const btnAudio = document.getElementById("btnAudio");
const btnMenu  = document.getElementById("btnMenu");

const joyWrap = document.getElementById("joyWrap");
const joyKnob = document.getElementById("joyKnob");
const joy = createMobileJoystick(joyWrap, joyKnob);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
canvasWrap.appendChild(renderer.domElement);

// Scene / camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 220);
scene.add(camera);

// "rig" is used for NON-XR movement & menu placement
const rig = new THREE.Group();
rig.position.set(State.anchors.lobby.x, 0, State.anchors.lobby.z);
rig.add(camera);
scene.add(rig);

// VR button
document.body.appendChild(VRButton.createButton(renderer));

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Build world systems
World.build(scene, textureLoader);
Table.build(scene, textureLoader);
Chairs.build(scene);
Store.build(scene, textureLoader);
UI.build(scene);
Bots.build(scene);

statusLine.textContent = "Status: Running ✅ (XR rig fixed + Bots + Leaderboard)";

// --- XR Reference Space Offset (THIS FIXES YOUR ISSUE) ---
let baseRefSpace = null;
let offsetRefSpace = null;
let xrOffset = new THREE.Vector3(0, 0, 0);
let xrYaw = 0;

function applyXROffset() {
  if (!baseRefSpace || !renderer.xr.getSession()) return;

  // Move the WORLD relative to user by offsetting reference space
  // Negative position means "world moves opposite of user teleport"
  const pos = { x: -xrOffset.x, y: 0, z: -xrOffset.z };

  // Yaw rotation
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), xrYaw);
  const rot = { x: q.x, y: q.y, z: q.z, w: q.w };

  const t = new XRRigidTransform(pos, rot);
  offsetRefSpace = baseRefSpace.getOffsetReferenceSpace(t);
  renderer.xr.setReferenceSpace(offsetRefSpace);
}

renderer.xr.addEventListener("sessionstart", async () => {
  const session = renderer.xr.getSession();
  // capture base reference space
  baseRefSpace = renderer.xr.getReferenceSpace();
  xrOffset.set(0, 0, 0);
  xrYaw = 0;
  applyXROffset();
  statusLine.textContent = "Status: VR session started ✅ (controllers follow you now)";
});

renderer.xr.addEventListener("sessionend", () => {
  baseRefSpace = null;
  offsetRefSpace = null;
  statusLine.textContent = "Status: VR session ended ✅";
});

// --- Teleport halo ---
const halo = new THREE.Mesh(
  new THREE.RingGeometry(0.2, 0.30, 32),
  new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x003355, side: THREE.DoubleSide })
);
halo.rotation.x = -Math.PI / 2;
halo.visible = false;
scene.add(halo);

// Colliders list (simple)
const colliders = [
  ...World.colliders,
  ...(Table.colliders || []),
  ...(Chairs.colliders || [])
].filter(Boolean);

// Utility: anchors
function goAnchor(name) {
  const a = State.anchors[name];
  if (!a) return;

  // XR: move via reference-space offset
  const session = renderer.xr.getSession();
  if (session && baseRefSpace) {
    xrOffset.set(a.x, 0, a.z);
    applyXROffset();
  } else {
    // Non-XR: move rig
    rig.position.set(a.x, 0, a.z);
  }

  UI.close();
}

function toggleAudio() {
  AudioSys.toggle(statusLine);
}

// Mobile buttons
btnReset.addEventListener("click", () => {
  goAnchor("lobby");
  statusLine.textContent = "Status: Reset to Lobby ✅";
});
btnAudio.addEventListener("click", () => toggleAudio());
btnMenu.addEventListener("click", () => UI.toggle(rig));

// XR Controllers
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
scene.add(controller1, controller2);

const rayLineMat = new THREE.LineBasicMaterial({ color: 0x00aaff });
const rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
const ray1 = new THREE.Line(rayGeom, rayLineMat); ray1.scale.z = 7;
const ray2 = new THREE.Line(rayGeom, rayLineMat); ray2.scale.z = 7;
controller1.add(ray1);
controller2.add(ray2);

// Ray helpers
const tmpOrigin = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpMat4 = new THREE.Matrix4();
const raycaster = new THREE.Raycaster();

function getRayFromController(ctrl) {
  ctrl.updateMatrixWorld(true);
  tmpMat4.identity().extractRotation(ctrl.matrixWorld);
  tmpOrigin.setFromMatrixPosition(ctrl.matrixWorld);
  tmpDir.set(0, 0, -1).applyMatrix4(tmpMat4).normalize();
  return { origin: tmpOrigin.clone(), dir: tmpDir.clone() };
}

function hitFloor(origin, dir) {
  const t = (0 - origin.y) / dir.y;
  if (!isFinite(t) || t < 0) return null;
  return origin.clone().add(dir.clone().multiplyScalar(t));
}

// Controller interact
controller1.addEventListener("selectstart", () => onSelect(controller1));
controller2.addEventListener("selectstart", () => onSelect(controller2));

function onSelect(ctrl) {
  // Menu click
  if (UI.menuOpen) {
    const { origin, dir } = getRayFromController(ctrl);
    const btn = UI.hitTest(origin, dir);
    if (btn) UI.doAction(btn.userData.action, { goAnchor, toggleAudio });
    return;
  }

  // Store buy
  {
    const { origin, dir } = getRayFromController(ctrl);
    const token = Store.hitTest(origin, dir);
    if (token?.userData?.storeItemId) {
      const res = Store.tryBuy(token.userData.storeItemId);
      statusLine.textContent = `Status: ${res.ok ? "✅" : "❌"} ${res.msg} | Chips: ${State.chips} | Event: ${State.eventChips}`;
      return;
    }
  }

  // Chair join
  {
    const { origin, dir } = getRayFromController(ctrl);
    const ring = Chairs.hitTest(origin, dir);
    if (ring?.userData?.seatIndex != null) {
      const seatIndex = ring.userData.seatIndex;
      const t = Chairs.getSeatTransform(seatIndex);
      if (t) {
        // XR: move via offset space
        const session = renderer.xr.getSession();
        if (session && baseRefSpace) {
          xrOffset.set(t.position.x, 0, t.position.z);
          applyXROffset();
        } else {
          rig.position.set(t.position.x, 0, t.position.z);
        }

        State.mode = "seated";
        State.seatedIndex = seatIndex;
        Chairs.setSeatOpen(seatIndex, false);
        statusLine.textContent = `Status: Seated at chair ${seatIndex} ✅`;
      }
      return;
    }
  }

  // Teleport
  {
    const { origin, dir } = getRayFromController(ctrl);
    const p = hitFloor(origin, dir);
    if (p) {
      const session = renderer.xr.getSession();
      if (session && baseRefSpace) {
        xrOffset.set(p.x, 0, p.z);
        applyXROffset();
      } else {
        rig.position.set(p.x, 0, p.z);
      }
      statusLine.textContent = "Status: Teleported ✅";
    }
  }
}

// Mobile tap interaction
renderer.domElement.addEventListener("pointerdown", (e) => {
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera({ x, y }, camera);

  const origin = raycaster.ray.origin.clone();
  const dir = raycaster.ray.direction.clone();

  if (UI.menuOpen) {
    const btn = UI.hitTest(origin, dir);
    if (btn) UI.doAction(btn.userData.action, { goAnchor, toggleAudio });
    return;
  }

  const token = Store.hitTest(origin, dir);
  if (token?.userData?.storeItemId) {
    const res = Store.tryBuy(token.userData.storeItemId);
    statusLine.textContent = `Status: ${res.ok ? "✅" : "❌"} ${res.msg} | Chips: ${State.chips} | Event: ${State.eventChips}`;
    return;
  }

  const ring = Chairs.hitTest(origin, dir);
  if (ring?.userData?.seatIndex != null) {
    const seatIndex = ring.userData.seatIndex;
    const t = Chairs.getSeatTransform(seatIndex);
    if (t) {
      rig.position.set(t.position.x, 0, t.position.z);
      State.mode = "seated";
      State.seatedIndex = seatIndex;
      Chairs.setSeatOpen(seatIndex, false);
      statusLine.textContent = "Status: Seated ✅";
    }
  }
});

// Snap turn + left stick movement + Y button menu (VR)
let snapCooldown = 0;
let yMenuLatch = false;

function handleXRInput(dt) {
  const session = renderer.xr.getSession();
  if (!session) return;

  // Read gamepads
  let leftAxes = null;
  let rightAxes = null;
  let leftButtons = null;

  for (const src of session.inputSources || []) {
    if (!src.gamepad) continue;
    const axes = src.gamepad.axes || [];
    const buttons = src.gamepad.buttons || [];

    // Heuristic: first controller encountered = left
    if (!leftAxes) { leftAxes = axes; leftButtons = buttons; }
    else if (!rightAxes) rightAxes = axes;
  }

  // Left stick locomotion
  if (leftAxes) {
    const lx = leftAxes[0] || 0;
    const ly = leftAxes[1] || 0;
    const dz = 0.15;
    const mx = Math.abs(lx) > dz ? lx : 0;
    const mz = Math.abs(ly) > dz ? ly : 0;

    // In XR, move by changing offset (not rig)
    if (baseRefSpace) {
      // move relative to camera yaw (approx using world forward)
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0; forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const vel = new THREE.Vector3()
        .addScaledVector(right, mx)
        .addScaledVector(forward, -mz);

      if (vel.lengthSq() > 0.0001) {
        vel.normalize().multiplyScalar(2.1 * dt);
        xrOffset.add(vel);
        applyXROffset();
      }
    }
  }

  // Right stick snap turn
  if (rightAxes && snapCooldown <= 0) {
    const rx = rightAxes[2] ?? rightAxes[0] ?? 0;
    if (rx > 0.7) { xrYaw -= THREE.MathUtils.degToRad(45); snapCooldown = 0.22; applyXROffset(); }
    if (rx < -0.7) { xrYaw += THREE.MathUtils.degToRad(45); snapCooldown = 0.22; applyXROffset(); }
  }
  snapCooldown -= dt;

  // Y button menu toggle (Quest left controller Y is commonly buttons[3] or [4] depending)
  // We'll check a few typical indices and edge-trigger it.
  const yPressed = !!(leftButtons && (
    leftButtons[3]?.pressed ||  // common
    leftButtons[4]?.pressed ||  // some mappings
    leftButtons[5]?.pressed     // fallback
  ));

  if (yPressed && !yMenuLatch) {
    // place menu near player (in XR we position it using rig as anchor, so update rig to match offset for menu only)
    rig.position.set(xrOffset.x, 0, xrOffset.z);
    UI.toggle(rig);
    yMenuLatch = true;
  }
  if (!yPressed) yMenuLatch = false;

  // Halo preview
  const ctrl = controller2 || controller1;
  const { origin, dir } = getRayFromController(ctrl);
  const p = hitFloor(origin, dir);
  if (p) {
    halo.visible = true;
    halo.position.set(p.x, 0.02, p.z);
  } else {
    halo.visible = false;
  }
}

// Non-XR clamp (keep inside room)
function clampNonXR() {
  if (renderer.xr.getSession()) return;
  rig.position.y = 0;
  rig.position.x = Math.max(-16, Math.min(16, rig.position.x));
  rig.position.z = Math.max(-10.5, Math.min(10.5, rig.position.z));
}

// Animation loop
let last = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const session = renderer.xr.getSession();

  // Mobile movement (non-XR)
  applyMovement({
    dt,
    rig,
    camera,
    xrSession: session,
    joy,
    speed: 2.2
  });

  // XR movement (reference space)
  handleXRInput(dt);

  // Bots
  Bots.update(dt);

  clampNonXR();
  renderer.render(scene, camera);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
