import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Table } from "./table.js";
import { Chairs } from "./chair.js";
import { Store } from "./store.js";
import { AudioSys } from "./audio.js";

import { makeXRLoco } from "./xr_locomotion.js";
import { WatchUI } from "./watch_ui.js";
import { Notify } from "./notify.js";

const statusLine = document.getElementById("statusLine");
const canvasWrap = document.getElementById("canvasWrap");

const btnReset = document.getElementById("btnReset");
const btnAudio = document.getElementById("btnAudio");
const btnMenu  = document.getElementById("btnMenu");

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
canvasWrap.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Scene / Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 240);
scene.add(camera);

// Build world systems
World.build(scene);
Table.build(scene);
Chairs.build(scene);
Store.build(scene);

WatchUI.build(scene);
Notify.build(scene);

// XR locomotion
const xr = makeXRLoco(renderer, camera);
scene.add(xr.halo);
scene.add(xr.rangeRing);

// Controllers (still use indices; mapping by handedness pads)
const c0 = renderer.xr.getController(0);
const c1 = renderer.xr.getController(1);
scene.add(c0, c1);

// Rays
const rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
const leftRay  = new THREE.Line(rayGeom, new THREE.LineBasicMaterial({ color: 0x00ffaa })); leftRay.scale.z = 8;
const rightRay = new THREE.Line(rayGeom, new THREE.LineBasicMaterial({ color: 0x00aaff })); rightRay.scale.z = 8;

function attachRays() {
  c0.remove(leftRay); c0.remove(rightRay);
  c1.remove(leftRay); c1.remove(rightRay);
  c0.add(leftRay);
  c1.add(rightRay);
}

// Mapped controls
let leftCtrl = c0;
let rightCtrl = c1;
let leftPad = null;
let rightPad = null;

function bindControllersByHandedness(session) {
  leftCtrl = c0; rightCtrl = c1;
  leftPad = null; rightPad = null;

  const sources = session?.inputSources || [];
  for (const src of sources) {
    if (!src.gamepad) continue;
    if (src.handedness === "left") leftPad = src.gamepad;
    if (src.handedness === "right") rightPad = src.gamepad;
  }
}

// Room bounds
const ROOM_BOUNDS = { minX: -16.3, maxX: 16.3, minZ: -11.3, maxZ: 11.3 };

// Spawns (these are the corrected “never on table” spots)
const ANCHORS = {
  lobby: { x: 0.0,  z: 8.6, yawDeg: 180 }, // facing logo wall
  store: { x: 12.0, z: 9.2, yawDeg: 180 }, // inside store side, away from divider
  poker: { x: 0.0,  z: -6.8, yawDeg: 0 },  // spectator side, not on table
};

function spawn(anchorKey) {
  const a = ANCHORS[anchorKey] || ANCHORS.lobby;
  xr.safeSpawn(a, ROOM_BOUNDS);
  WatchUI.close();
  statusLine.textContent = `Status: Spawned ${anchorKey.toUpperCase()} ✅`;
}

btnReset.addEventListener("click", () => spawn("lobby"));
btnAudio.addEventListener("click", async () => {
  const res = await AudioSys.toggle();
  statusLine.textContent = `Status: ${res.msg}`;
  WatchUI.setToast(res.msg);
});
btnMenu.addEventListener("click", () => WatchUI.toggle());

// ==== HANDS ====
// Controller hands (skin colored, always visible)
function addControllerHands(ctrl) {
  const skin = new THREE.MeshStandardMaterial({
    color: 0xC99A7A, roughness: 0.65, metalness: 0.0
  });

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, 0.065), skin);
  palm.position.set(0, -0.02, -0.03);

  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.014, 0.03), skin);
  thumb.position.set(0.03, -0.02, -0.02);
  thumb.rotation.y = 0.4;

  const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.05), skin);
  fingers.position.set(0, -0.013, -0.075);

  const g = new THREE.Group();
  g.add(palm, thumb, fingers);
  g.scale.setScalar(1.0);

  ctrl.add(g);
  return g;
}
addControllerHands(c0);
addControllerHands(c1);

// Hand tracking (if enabled): show joint spheres (lightweight)
const hand0 = renderer.xr.getHand(0);
const hand1 = renderer.xr.getHand(1);
scene.add(hand0, hand1);

function addHandJoints(handObj) {
  const jointGeo = new THREE.SphereGeometry(0.008, 10, 10);
  const jointMat = new THREE.MeshStandardMaterial({ color: 0xC99A7A, roughness: 0.55 });
  const joints = {};

  const jointNames = [
    "wrist",
    "thumb-metacarpal","thumb-phalanx-proximal","thumb-phalanx-distal","thumb-tip",
    "index-finger-metacarpal","index-finger-phalanx-proximal","index-finger-phalanx-intermediate","index-finger-phalanx-distal","index-finger-tip",
    "middle-finger-metacarpal","middle-finger-phalanx-proximal","middle-finger-phalanx-intermediate","middle-finger-phalanx-distal","middle-finger-tip",
    "ring-finger-metacarpal","ring-finger-phalanx-proximal","ring-finger-phalanx-intermediate","ring-finger-phalanx-distal","ring-finger-tip",
    "pinky-finger-metacarpal","pinky-finger-phalanx-proximal","pinky-finger-phalanx-intermediate","pinky-finger-phalanx-distal","pinky-finger-tip",
  ];

  for (const name of jointNames) {
    const j = new THREE.Mesh(jointGeo, jointMat);
    j.visible = false;
    joints[name] = j;
    handObj.add(j);
  }
  return joints;
}
const joints0 = addHandJoints(hand0);
const joints1 = addHandJoints(hand1);

// notifications
function notify(text) {
  Notify.show(text);
  WatchUI.setToast(text);
}

// Watch attach: keep on controller index 0 (works fine for Quest)
c0.add(WatchUI.group);

// Input helpers
function isPressed(pad, indices) {
  if (!pad) return false;
  const b = pad.buttons || [];
  for (const i of indices) if (b[i]?.pressed) return true;
  return false;
}
const TRIGGER = [0, 1];

function pollY(session) {
  const pad = leftPad;
  if (!pad) return false;
  const b = pad.buttons || [];
  return !!(b[3]?.pressed || b[4]?.pressed || b[5]?.pressed);
}

let yLatch = false;
let lastLeftTrigger = false;
let lastRightTrigger = false;

function handleVRButtons(session) {
  // Y toggles watch
  const yNow = pollY(session);
  if (yNow && !yLatch) {
    WatchUI.toggle();
    yLatch = true;
  }
  if (!yNow) yLatch = false;

  // Left trigger -> teleport
  const lTrig = isPressed(leftPad, TRIGGER);
  if (lTrig && !lastLeftTrigger && !WatchUI.visible) {
    const preview = xr.updateTeleportPreview(leftCtrl);
    if (preview.point) {
      xr.safeSpawn({ x: preview.point.x, z: preview.point.z, yawDeg: 0 }, ROOM_BOUNDS);
      WatchUI.setToast("Teleported ✅");
    } else {
      WatchUI.setToast("Out of range ❌");
    }
  }
  lastLeftTrigger = lTrig;

  // Right trigger -> action
  const rTrig = isPressed(rightPad, TRIGGER);
  if (rTrig && !lastRightTrigger) {
    const { origin, dir } = xr.getRay(rightCtrl);

    // Notification OK
    const hitN = Notify.hitTest(origin, dir);
    if (hitN?.userData?.ui === "notify_ok") {
      Notify.hide();
      WatchUI.setToast("OK ✅");
      lastRightTrigger = rTrig;
      return;
    }

    // Watch click
    if (WatchUI.visible) {
      const ray = new THREE.Raycaster(origin, dir, 0.01, 2.5);
      const hits = ray.intersectObjects(WatchUI.hitPlanes, true);
      if (hits.length) {
        const mesh = hits[0].object;
        const hp = hits[0].point;

        const local = mesh.worldToLocal(hp.clone());
        const u = (local.x / 0.24) + 0.5;
        const v = (-(local.y) / 0.24) + 0.5;

        const act = WatchUI.hitToAction({ u, v });
        if (act === "go_lobby") spawn("lobby");
        if (act === "go_store") spawn("store");
        if (act === "go_poker") spawn("poker");
        if (act === "toggle_music") AudioSys.toggle().then(res => WatchUI.setToast(res.msg));
        if (act === "mute_music") WatchUI.setToast(AudioSys.off().msg);
      }
      lastRightTrigger = rTrig;
      return;
    }

    // Store click
    const token = Store.hitTest(origin, dir);
    if (token?.userData?.storeItemId) {
      const res = Store.tryBuy(token.userData.storeItemId);
      notify(res.msg);
      statusLine.textContent = `Status: ${res.msg}`;
      lastRightTrigger = rTrig;
      return;
    }

    // Chair join click
    const ring = Chairs.hitTest(origin, dir);
    if (ring?.userData?.seatIndex != null) {
      const t = Chairs.getSeatTransform(ring.userData.seatIndex);
      if (t) {
        xr.safeSpawn({ x: t.position.x, z: t.position.z, yawDeg: 0 }, ROOM_BOUNDS);
        notify("Seat joined ✅ (Play mode next step)");
      }
      lastRightTrigger = rTrig;
      return;
    }

    // Teleport machine click (optional, we can use it later)
    notify("Action ✅");
  }
  lastRightTrigger = rTrig;
}

// Update hand joints each frame (if tracking active)
function updateHandJoints(handObj, jointsMap) {
  // if joint nodes exist, three.js sets them by name as children
  for (const name in jointsMap) {
    const jointMesh = jointsMap[name];
    const joint = handObj.getObjectByName(name);
    if (joint) {
      jointMesh.visible = true;
      jointMesh.position.copy(joint.position);
      jointMesh.quaternion.copy(joint.quaternion);
    } else {
      jointMesh.visible = false;
    }
  }
}

// XR start/end
renderer.xr.addEventListener("sessionstart", async () => {
  await xr.bindBaseRefSpace();
  const session = renderer.xr.getSession();
  bindControllersByHandedness(session);
  attachRays();
  spawn("lobby");
  notify("Welcome ✅ Left = teleport | Right = action | Y = menu");
});

renderer.xr.addEventListener("sessionend", () => {
  statusLine.textContent = "Status: VR ended ✅";
});

// Loop
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const session = renderer.xr.getSession();
  if (session) {
    bindControllersByHandedness(session);

    // snap turn + teleport preview
    xr.snapTurn(dt, session, rightPad);
    if (!WatchUI.visible) xr.updateTeleportPreview(leftCtrl);
    else { xr.halo.visible = false; xr.rangeRing.visible = false; }

    handleVRButtons(session);

    // hand tracking joints
    updateHandJoints(hand0, joints0);
    updateHandJoints(hand1, joints1);
  }

  Notify.face(camera);
  renderer.render(scene, camera);
});

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

statusLine.textContent = "Status: Boot ✅ (Spawns fixed / Walls / Luxury world / Hands)";
