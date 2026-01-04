import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRHandModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRHandModelFactory.js";

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

// Build systems
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

// Controllers
const c0 = renderer.xr.getController(0);
const c1 = renderer.xr.getController(1);
scene.add(c0, c1);

// Rays (visual only)
const rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
const leftRay  = new THREE.Line(rayGeom, new THREE.LineBasicMaterial({ color: 0x00ffaa })); leftRay.scale.z = 8;
const rightRay = new THREE.Line(rayGeom, new THREE.LineBasicMaterial({ color: 0x00aaff })); rightRay.scale.z = 8;

function attachRays() {
  c0.remove(leftRay); c0.remove(rightRay);
  c1.remove(leftRay); c1.remove(rightRay);
  c0.add(leftRay);
  c1.add(rightRay);
}

// Hand models (realistic)
const handFactory = new XRHandModelFactory();
const h0 = renderer.xr.getHand(0);
const h1 = renderer.xr.getHand(1);
scene.add(h0, h1);
h0.add(handFactory.createHandModel(h0, "mesh"));
h1.add(handFactory.createHandModel(h1, "mesh"));

// Also add controller “hands” so you see hands even holding controllers
function addControllerHand(ctrl) {
  const skin = new THREE.MeshStandardMaterial({ color: 0xC99A7A, roughness: 0.55 });
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.07), skin);
  palm.position.set(0, -0.02, -0.03);
  const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.055), skin);
  fingers.position.set(0, -0.012, -0.08);
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.03), skin);
  thumb.position.set(0.032, -0.02, -0.02);
  thumb.rotation.y = 0.5;
  const g = new THREE.Group();
  g.add(palm, fingers, thumb);
  ctrl.add(g);
}
addControllerHand(c0);
addControllerHand(c1);

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

// Bounds
const ROOM_BOUNDS = { minX: -17.0, maxX: 17.0, minZ: -12.0, maxZ: 12.0 };

// ✅ Spawns (store spawn moved deeper into store; no wall overlap)
const ANCHORS = {
  lobby: { x: 0.0,  z: 9.3,  yawDeg: 180 },
  store: { x: 15.2, z: 10.8, yawDeg: 180 }, // deeper right, inside store zone
  poker: { x: 0.0,  z: -7.2, yawDeg: 0 },
};

function spawn(anchorKey) {
  const a = ANCHORS[anchorKey] || ANCHORS.lobby;
  xr.safeSpawn(a, ROOM_BOUNDS);
  WatchUI.close();
  statusLine.textContent = `Status: Spawned ${anchorKey.toUpperCase()} ✅`;
}

// Buttons
btnReset.addEventListener("click", () => spawn("lobby"));
btnAudio.addEventListener("click", async () => {
  const res = await AudioSys.toggle();
  statusLine.textContent = `Status: ${res.msg}`;
  WatchUI.setToast(res.msg);
});
btnMenu.addEventListener("click", () => WatchUI.toggle());

// Attach watch to c0 (stable)
c0.add(WatchUI.group);

// Helpers
function notify(text) {
  Notify.show(text);
  WatchUI.setToast(text);
}

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

// ✅ Action should only trigger on meaningful targets
function getActionTarget(origin, dir) {
  // 1) Notification OK
  const hitN = Notify.hitTest(origin, dir);
  if (hitN?.userData?.ui === "notify_ok") return { type: "notify_ok", obj: hitN };

  // 2) Watch click
  if (WatchUI.visible) return { type: "watch" };

  // 3) Store items
  const token = Store.hitTest(origin, dir);
  if (token?.userData?.storeItemId) return { type: "store_item", obj: token };

  // 4) Chair seat rings
  const ring = Chairs.hitTest(origin, dir);
  if (ring?.userData?.seatIndex != null) return { type: "seat", obj: ring };

  // 5) Teleport pads (if your teleport_machine marks userData.telepad = true)
  // If not marked, we’ll still allow “teleporter near hit” by checking name keywords.
  const hit = xr.hitTest([ ...scene.children ], origin, dir, 0.01, 10);
  if (hit && (hit.userData?.telepad || String(hit.name || "").toLowerCase().includes("teleport"))) {
    return { type: "telepad", obj: hit };
  }

  return null;
}

function handleVRButtons(session) {
  // Y toggles watch
  const yNow = pollY(session);
  if (yNow && !yLatch) {
    WatchUI.toggle();
    yLatch = true;
  }
  if (!yNow) yLatch = false;

  // Left trigger -> teleport movement
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

  // Right trigger -> action (context-only)
  const rTrig = isPressed(rightPad, TRIGGER);
  if (rTrig && !lastRightTrigger) {
    const { origin, dir } = xr.getRay(rightCtrl);

    const target = getActionTarget(origin, dir);

    // ✅ If nothing meaningful hit, do NOTHING (no popup spam)
    if (!target) {
      lastRightTrigger = rTrig;
      return;
    }

    // Handle targets
    if (target.type === "notify_ok") {
      Notify.hide();
      WatchUI.setToast("OK ✅");
      lastRightTrigger = rTrig;
      return;
    }

    if (target.type === "watch") {
      // WatchUI click
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

    if (target.type === "store_item") {
      const res = Store.tryBuy(target.obj.userData.storeItemId);
      notify(res.msg);
      statusLine.textContent = `Status: ${res.msg}`;
      lastRightTrigger = rTrig;
      return;
    }

    if (target.type === "seat") {
      const t = Chairs.getSeatTransform(target.obj.userData.seatIndex);
      if (t) {
        xr.safeSpawn({ x: t.position.x, z: t.position.z, yawDeg: 0 }, ROOM_BOUNDS);
        notify("Seat joined ✅ (Play mode next)");
      }
      lastRightTrigger = rTrig;
      return;
    }

    if (target.type === "telepad") {
      // ✅ Teleporter action: open the watch menu + show a confirm panel
      WatchUI.toggle();
      notify("Teleport: choose Lobby / Store / Poker on your watch ✅");
      lastRightTrigger = rTrig;
      return;
    }
  }
  lastRightTrigger = rTrig;
}

// XR session events
renderer.xr.addEventListener("sessionstart", async () => {
  await xr.bindBaseRefSpace();
  const session = renderer.xr.getSession();
  bindControllersByHandedness(session);
  attachRays();
  spawn("lobby");
  notify("Welcome ✅ Left=teleport | Right=action | Y=menu");
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

    xr.snapTurn(dt, session, rightPad);

    if (!WatchUI.visible) xr.updateTeleportPreview(leftCtrl);
    else { xr.halo.visible = false; xr.rangeRing.visible = false; }

    handleVRButtons(session);
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

statusLine.textContent = "Status: Boot ✅ (SnapTurn fixed / Store spawn fixed / Action gated / Better hands)";
