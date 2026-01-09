// /js/main.js — Scarlett VR Poker Boot v11.0 (CONTROLLERS FIX + IN-HAND MENU)
// - XR: camera stays at (0,0,0) so controllers align correctly
// - Spawn on teleport circle (world.spawn)
// - Left Y toggles a menu attached to left hand
// - Right hand laser can click menu buttons

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { DealingMix } from "./dealingMix.js";
import { HandsSystem } from "./hands.js";

const logEl = document.getElementById("log");
const log = (m, ...rest) => {
  console.log(m, ...rest);
  if (logEl) logEl.textContent += "\n" + String(m);
};

const BOOT_V = window.__BUILD_V || Date.now().toString();
log("BOOT v=" + BOOT_V);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 4, 95);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Player rig
const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);
player.add(camera);

// Desktop default (XR will override)
camera.position.set(0, 1.65, 0);
player.position.set(0, 0, 3.6);

// Lighting baseline
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(7, 12, 6);
scene.add(dir);

// Controllers + grips
const controllerModelFactory = new XRControllerModelFactory();
const controllers = [];
const grips = [];

function makeLaser(color = 0x00ffcc) {
  const geo = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
  const mat = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 10;
  line.name = "LaserLine";
  return line;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.name = "Controller" + i;
  c.add(makeLaser(i === 0 ? 0xff2d7a : 0x7fe7ff));
  scene.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.name = "Grip" + i;
  g.add(controllerModelFactory.createControllerModel(g));
  scene.add(g);
  grips.push(g);
}
log("[main] controllers ready ✅");

// World
const world = await initWorld({ THREE, scene, log, v: BOOT_V });
log("[main] world loaded ✅");

// Make sure we spawn on the teleport circle
function spawnToWorld() {
  const s = world?.spawn || { x: 0, y: 0, z: 3.6 };
  player.position.set(s.x, s.y ?? 0, s.z);
  player.rotation.set(0, 0, 0);
}
spawnToWorld();

// Controls
const controls = Controls.init({ THREE, renderer, camera, player, controllers, grips, log, world });

// Hands
const hands = HandsSystem.init({ THREE, scene, renderer, log });

// Teleport
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });

// Dealing
const dealing = DealingMix.init({ THREE, scene, log, world });
dealing.setPlayerRig?.(player, camera);
dealing.startHand?.();

// World connect (bots avoid player)
try { world?.connect?.({ playerRig: player, camera, controllers }); } catch {}

// ---------------- IN-HAND MENU (LEFT HAND) ----------------
let menuVisible = false;
let menuRoot = new THREE.Group();
menuRoot.name = "HandMenu";
menuRoot.visible = false;
scene.add(menuRoot);

const menuButtons = []; // {mesh, onClick}
const raycaster = new THREE.Raycaster();
const tmpMat = new THREE.Matrix4();
const tmpDir = new THREE.Vector3();
const tmpPos = new THREE.Vector3();

function makeMenuTexture(lines) {
  const c = document.createElement("canvas");
  c.width = 768; c.height = 512;
  const ctx = c.getContext("2d");

  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  roundRect(ctx, 18, 18, 732, 476, 28, true);

  ctx.fillStyle = "#7fe7ff";
  ctx.font = "bold 44px Arial";
  ctx.fillText("Scarlett Menu", 46, 74);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px Arial";
  let y = 150;
  for (const s of lines) { ctx.fillText(s, 46, y); y += 52; }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;

  function roundRect(ctx,x,y,w,h,r,fill){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
    if(fill) ctx.fill();
  }
}

function rebuildMenu() {
  menuButtons.length = 0;
  while (menuRoot.children.length) menuRoot.remove(menuRoot.children[0]);

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.19),
    new THREE.MeshBasicMaterial({ map: makeMenuTexture([
      "A/X: Action",
      "Y: Toggle Menu",
      "Trigger: Select",
      "Teleport / Move / Snap toggles"
    ]), transparent: true })
  );
  panel.name = "MenuPanel";
  panel.renderOrder = 200;
  menuRoot.add(panel);

  // Button helper
  function addBtn(label, y, onClick) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(20,22,32,0.90)";
    ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle = "rgba(127,231,255,0.45)";
    ctx.lineWidth = 6;
    ctx.strokeRect(8,8,c.width-16,c.height-16);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, c.width/2, c.height/2);

    const tex = new THREE.CanvasTexture(c);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.055),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    mesh.position.set(0, y, 0.001);
    mesh.name = "MenuBtn_" + label;
    menuRoot.add(mesh);
    menuButtons.push({ mesh, onClick });
  }

  addBtn("Teleport", -0.02, () => window.dispatchEvent(new CustomEvent("scarlett-toggle-teleport", { detail: true })));
  addBtn("Recenter", -0.09, () => window.dispatchEvent(new Event("scarlett-recenter")));
  addBtn("Action",   -0.16, () => window.dispatchEvent(new Event("scarlett-action")));
}
rebuildMenu();

function setMenuVisible(v) {
  menuVisible = !!v;
  menuRoot.visible = menuVisible;
}

window.addEventListener("scarlett-toggle-menu", () => setMenuVisible(!menuVisible));

// Recenter
window.addEventListener("scarlett-recenter", () => {
  spawnToWorld();
  log("[main] recentered ✅");
});

// XR session adjustments: keep camera at origin in XR so controllers align
renderer.xr.addEventListener("sessionstart", () => {
  camera.position.set(0, 0, 0); // ✅ IMPORTANT
  log("[main] XR session start ✅ camera=(0,0,0)");
});
renderer.xr.addEventListener("sessionend", () => {
  camera.position.set(0, 1.65, 0); // desktop height restore
  log("[main] XR session end ✅");
});

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- LOOP ----------------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  try { world?.tick?.(dt); } catch (e) { console.error(e); }
  try { controls?.update?.(dt); } catch (e) { console.error(e); }
  try { teleport?.update?.(dt); } catch (e) { console.error(e); }
  try { dealing?.update?.(dt); } catch (e) { console.error(e); }
  try { hands?.update?.(dt); } catch (e) { console.error(e); }

  // Attach menu to LEFT grip (or controller)
  if (renderer.xr.isPresenting && menuRoot.visible) {
    const leftGrip = grips[0] || controllers[0];
    if (leftGrip) {
      leftGrip.getWorldPosition(menuRoot.position);
      leftGrip.getWorldQuaternion(menuRoot.quaternion);
      menuRoot.translateX(-0.05);
      menuRoot.translateY(0.05);
      menuRoot.translateZ(-0.10);
    }
  }

  // Right-hand laser click menu
  if (renderer.xr.isPresenting && menuRoot.visible) {
    const right = controllers[1] || controllers[0];
    if (right) {
      tmpMat.identity().extractRotation(right.matrixWorld);
      tmpDir.set(0, 0, -1).applyMatrix4(tmpMat).normalize();
      tmpPos.setFromMatrixPosition(right.matrixWorld);
      raycaster.set(tmpPos, tmpDir);
      raycaster.far = 4;

      const hits = raycaster.intersectObjects(menuButtons.map(b => b.mesh), true);
      // Click = trigger (selectstart)
      right._menuHit = hits?.[0]?.object || null;
    }
  }

  renderer.render(scene, camera);
});

// Trigger selects menu target
for (const c of controllers) {
  c.addEventListener("selectstart", () => {
    const hit = c._menuHit;
    if (!hit) return;
    const btn = menuButtons.find(b => b.mesh === hit);
    btn?.onClick?.();
  });
}

log("[main] ready ✅");
