import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { State } from "./state.js";
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

// --- renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
canvasWrap.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- scene/camera ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 240);
scene.add(camera);

// IMPORTANT: do NOT “move camera rig” in XR. Keep it simple.
camera.position.set(0, 1.6, 3);

// --- build world ---
World.build(scene);
Table.build(scene);
Chairs.build(scene);
Store.build(scene);

WatchUI.build(scene);
Notify.build(scene);

// --- XR locomotion ---
const xr = makeXRLoco(renderer, camera);
scene.add(xr.halo);
scene.add(xr.rangeRing);

// --- controllers (we still create indices, but we will map by handedness) ---
const c0 = renderer.xr.getController(0);
const c1 = renderer.xr.getController(1);
scene.add(c0, c1);

// pointers
const rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
const leftRay  = new THREE.Line(rayGeom, new THREE.LineBasicMaterial({ color: 0x00ffaa })); leftRay.scale.z = 8;
const rightRay = new THREE.Line(rayGeom, new THREE.LineBasicMaterial({ color: 0x00aaff })); rightRay.scale.z = 8;

// our mapped controls
let leftCtrl = c0;
let rightCtrl = c1;
let leftPad = null;
let rightPad = null;

function bindControllersByHandedness(session) {
  // Default
  leftCtrl = c0; rightCtrl = c1;
  leftPad = null; rightPad = null;

  // Use inputSources handedness
  const sources = session?.inputSources || [];
  for (const src of sources) {
    if (!src.gamepad) continue;
    if (src.handedness === "left") leftPad = src.gamepad;
    if (src.handedness === "right") rightPad = src.gamepad;
  }

  // If we can detect left/right, also align which controller index likely matches:
  // Heuristic: if only one controller exists, keep defaults.
  // Otherwise: keep ray visuals on both, but treat "left trigger" as teleport and "right trigger" as action using handedness pads.
}

function attachRays() {
  // Ensure rays aren't duplicated
  c0.remove(leftRay); c0.remove(rightRay);
  c1.remove(leftRay); c1.remove(rightRay);

  // Put green ray on left controller, blue ray on right controller (visual only)
  // We can’t perfectly map object to handedness, but we can show both.
  c0.add(leftRay);
  c1.add(rightRay);
}

// --- spawn safety ---
const ROOM_BOUNDS = { minX: -16.5, maxX: 16.5, minZ: -11.5, maxZ: 11.5 };
const LOBBY_ANCHOR = { x: 0, z: 7.2, yawDeg: 180 }; // ALWAYS same safe spot

function spawnLobbySafe() {
  xr.safeSpawn(LOBBY_ANCHOR, ROOM_BOUNDS);
  statusLine.textContent = "Status: Spawned Lobby ✅";
}

// --- Watch placement: attach to whichever controller is “left” visually
function attachWatchToLeft() {
  // remove from both first
  c0.remove(WatchUI.group);
  c1.remove(WatchUI.group);

  // attach to c0 by default (Quest usually maps left to index 0)
  // If your device swapped, you can swap here later.
  // This keeps it stable and prevents “watch floating away”.
  c0.add(WatchUI.group);
}

// --- UI / buttons ---
btnReset.addEventListener("click", () => spawnLobbySafe());
btnAudio.addEventListener("click", async () => {
  const res = await AudioSys.toggle();
  statusLine.textContent = `Status: ${res.msg}`;
  WatchUI.setToast(res.msg);
});
btnMenu.addEventListener("click", () => WatchUI.toggle());

// --- notifications ---
function notify(text) {
  Notify.show(text);
  WatchUI.setToast(text);
}

// --- input helpers ---
function pollYButton(session) {
  // Use leftPad if available
  const pad = leftPad;
  if (!pad) return false;
  const b = pad.buttons || [];

  // Quest left Y is commonly button[3] (varies). We'll check several.
  const yPressed = !!(b[3]?.pressed || b[4]?.pressed || b[5]?.pressed);
  return yPressed;
}

let yLatch = false;

// LEFT trigger teleport and RIGHT trigger action (by handedness pads)
function isPressed(pad, indices) {
  if (!pad) return false;
  const b = pad.buttons || [];
  for (const i of indices) if (b[i]?.pressed) return true;
  return false;
}

// Common trigger indices:
const TRIGGER = [0, 1]; // some pads use 0 for trigger, some use 1

let lastLeftTrigger = false;
let lastRightTrigger = false;

function handleVRButtons(session) {
  if (!session) return;

  // Y toggles watch
  const yNow = pollYButton(session);
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

    // Watch click if open
    if (WatchUI.visible) {
      const ray = new THREE.Raycaster(origin, dir, 0.01, 2.5);
      const hits = ray.intersectObjects(WatchUI.hitPlanes, true);
      if (hits.length) {
        const mesh = hits[0].object;
        const hp = hits[0].point;

        const local = mesh.worldToLocal(hp.clone());
        const u = (local.x / 0.22) + 0.5;
        const v = (-(local.y) / 0.22) + 0.5;

        const act = WatchUI.hitToAction({ u, v });
        if (act === "go_lobby") spawnLobbySafe();
        if (act === "go_store") xr.safeSpawn({ x: 10, z: 7.2, yawDeg: 180 }, ROOM_BOUNDS);
        if (act === "go_poker") xr.safeSpawn({ x: 0, z: 0, yawDeg: 0 }, ROOM_BOUNDS);
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
        notify("Seat joined ✅ (play mode next step)");
      }
      lastRightTrigger = rTrig;
      return;
    }

    notify("Action ✅");
  }
  lastRightTrigger = rTrig;
}

// --- VR session start/end ---
renderer.xr.addEventListener("sessionstart", async () => {
  const session = renderer.xr.getSession();
  await xr.bindBaseRefSpace(); // THIS is the permanent alignment fix
  bindControllersByHandedness(session);
  attachRays();
  attachWatchToLeft();
  spawnLobbySafe();
  notify("Welcome back ✅ Left = teleport | Right = action");
});

renderer.xr.addEventListener("sessionend", () => {
  statusLine.textContent = "Status: VR ended ✅";
});

// --- loop ---
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const session = renderer.xr.getSession();
  if (session) {
    // refresh mapping in case Quest swaps inputSources later
    bindControllersByHandedness(session);

    // snap turn from right stick only (needs rightPad)
    xr.snapTurn(dt, session, rightPad);

    // show teleport preview from left controller
    if (!WatchUI.visible) xr.updateTeleportPreview(leftCtrl);
    else { xr.halo.visible = false; xr.rangeRing.visible = false; }

    // button logic
    handleVRButtons(session);
  }

  // Notifications always face you
  Notify.face(camera);

  renderer.render(scene, camera);
});

// resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
