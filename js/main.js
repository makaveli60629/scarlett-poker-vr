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

// Rig is kept ONLY for placing UI (not moving player in XR)
const rig = new THREE.Group();
rig.position.set(State.anchors?.lobby?.x ?? 0, 0, State.anchors?.lobby?.z ?? 6);
rig.add(camera);
scene.add(rig);

// Controllers
const leftCtrl  = renderer.xr.getController(0);
const rightCtrl = renderer.xr.getController(1);
scene.add(leftCtrl, rightCtrl);

// Build game systems
World.build(scene);
Table.build(scene);
Chairs.build(scene);
Store.build(scene);

WatchUI.build(scene);
WatchUI.attachToController(leftCtrl);

Notify.build(scene);

// XR locomotion
const xr = makeXRLoco(renderer, camera, rig);
scene.add(xr.halo);
scene.add(xr.rangeRing);

// pointers
const lineMatL = new THREE.LineBasicMaterial({ color: 0x00ffaa });
const lineMatR = new THREE.LineBasicMaterial({ color: 0x00aaff });
const rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
const rayL = new THREE.Line(rayGeom, lineMatL); rayL.scale.z = 8;
const rayR = new THREE.Line(rayGeom, lineMatR); rayR.scale.z = 8;
leftCtrl.add(rayL);
rightCtrl.add(rayR);

statusLine.textContent = "Status: Luxury Pass Boot ✅ (Left Teleport / Right Action / Watch Menu)";

// --- Fixed spawn rules ---
function spawnLobby() {
  const a = State.anchors?.lobby ?? { x: 0, z: 7 };
  xr.setSpawn(a.x, a.z, 0);
  WatchUI.close();
  Notify.hide();
  statusLine.textContent = "Status: Spawned Lobby ✅";
}
function spawnStore() {
  const a = State.anchors?.store ?? { x: 10, z: 7 };
  xr.setSpawn(a.x, a.z, 180);
  WatchUI.close();
  statusLine.textContent = "Status: Store ✅";
}
function spawnPoker() {
  const a = State.anchors?.poker ?? { x: 0, z: 0 };
  xr.setSpawn(a.x, a.z, 0);
  WatchUI.close();
  statusLine.textContent = "Status: Poker Room ✅";
}

// Buttons (mobile)
btnReset.addEventListener("click", () => spawnLobby());
btnAudio.addEventListener("click", async () => {
  const res = await AudioSys.toggle();
  statusLine.textContent = `Status: ${res.msg}`;
  WatchUI.setToast(res.msg);
});
btnMenu.addEventListener("click", () => WatchUI.toggle());

// XR session
renderer.xr.addEventListener("sessionstart", () => {
  xr.setBaseRef();
  spawnLobby();
  Notify.show("Welcome back. Left controller teleports. Right controller clicks.");
});
renderer.xr.addEventListener("sessionend", () => {
  statusLine.textContent = "Status: VR Ended ✅";
});

// Watch toggle by Y button (edge-trigger)
let yLatch = false;
function pollYButton(session) {
  if (!session) return;

  // try to find left controller gamepad
  for (const src of session.inputSources || []) {
    if (!src.gamepad) continue;
    const b = src.gamepad.buttons || [];
    const yPressed = !!(b[3]?.pressed || b[4]?.pressed || b[5]?.pressed);
    if (yPressed && !yLatch) {
      WatchUI.toggle();
      yLatch = true;
      WatchUI.setToast(WatchUI.visible ? "Menu Open" : "Menu Closed");
    }
    if (!yPressed) yLatch = false;
    break; // first pad = left
  }
}

// HIT TEST HELPERS
function getRay(ctrl) {
  return xr.getRay(ctrl);
}
function getHitUV(mesh, hitPointWorld) {
  // only works for the watch plane (local plane), quick mapping:
  const local = mesh.worldToLocal(hitPointWorld.clone());
  // mesh is 0.22 x 0.22 — map to 0..1
  const u = (local.x / 0.22) + 0.5;
  const v = (-(local.y) / 0.22) + 0.5;
  return { u, v };
}

// LEFT trigger = teleport jump
leftCtrl.addEventListener("selectstart", () => {
  const session = renderer.xr.getSession();
  if (!session) return;

  // if watch open, ignore teleport (you’re interacting)
  if (WatchUI.visible) return;

  const preview = xr.updateTeleportPreview(leftCtrl);
  if (preview.point) {
    xr.setSpawn(preview.point.x, preview.point.z, THREE.MathUtils.radToDeg(0));
    WatchUI.setToast("Teleported ✅");
  } else {
    WatchUI.setToast("Out of range ❌");
  }
});

// RIGHT trigger = action / click
rightCtrl.addEventListener("selectstart", async () => {
  const session = renderer.xr.getSession();
  if (!session) return;

  const { origin, dir } = getRay(rightCtrl);

  // Notifications OK
  const hitNotify = Notify.hitTest(origin, dir);
  if (hitNotify?.userData?.ui === "notify_ok") {
    Notify.hide();
    WatchUI.setToast("OK ✅");
    return;
  }

  // Watch interaction (click buttons on watch)
  if (WatchUI.visible) {
    // Raycast against watch hit plane
    const ray = new THREE.Raycaster(origin, dir, 0.01, 2.5);
    const hits = ray.intersectObjects(WatchUI.hitPlanes, true);
    if (hits.length) {
      const hp = hits[0].point;
      const uv = getHitUV(hits[0].object, hp);
      const act = WatchUI.hitToAction(uv);
      if (act) {
        if (act === "go_lobby") spawnLobby();
        if (act === "go_store") spawnStore();
        if (act === "go_poker") spawnPoker();
        if (act === "toggle_music") {
          const res = await AudioSys.toggle();
          WatchUI.setToast(res.msg);
          statusLine.textContent = `Status: ${res.msg}`;
        }
        if (act === "mute_music") {
          const res = AudioSys.off();
          WatchUI.setToast(res.msg);
          statusLine.textContent = `Status: ${res.msg}`;
        }
      }
    }
    return;
  }

  // Store item click
  {
    const token = Store.hitTest(origin, dir);
    if (token?.userData?.storeItemId) {
      const res = Store.tryBuy(token.userData.storeItemId);
      Notify.show(res.msg);
      statusLine.textContent = `Status: ${res.msg}`;
      return;
    }
  }

  // Chair join click
  {
    const ring = Chairs.hitTest(origin, dir);
    if (ring?.userData?.seatIndex != null) {
      const t = Chairs.getSeatTransform(ring.userData.seatIndex);
      if (t) {
        xr.setSpawn(t.position.x, t.position.z, 0);
        Notify.show("Seat joined. (Play mode next step.)");
      }
      return;
    }
  }

  // Teleport machine click (optional action)
  // If you want these to open the watch automatically, we can do that.
  // For now: just confirm.
  Notify.show("Action registered ✅");
});

// Animation loop
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const session = renderer.xr.getSession();

  // Right stick snap turn only
  xr.snapTurn(dt, session);

  // Teleport preview always visible from LEFT pointer
  if (session && !WatchUI.visible) xr.updateTeleportPreview(leftCtrl);
  if (WatchUI.visible) {
    xr.halo.visible = false;
    xr.rangeRing.visible = false;
  }

  // Notifications always face you
  Notify.face(camera);

  // Poll Y button
  pollYButton(session);

  renderer.render(scene, camera);
});

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
