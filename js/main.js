// /js/main.js — Scarlett VR Poker Boot v10.9 (EXPORT-SAFE FINAL)

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { Teleport } from "./teleport.js";
import { HandsSystem } from "./hands.js";

// ✅ IMPORT DEALING AS MODULE (NOT NAMED)
import * as DealingModule from "./dealingMix.js";

/* ---------------- LOG ---------------- */
const logEl = document.getElementById("log");
const statusText = document.getElementById("statusText");

const log = (m) => {
  console.log(m);
  if (logEl) {
    logEl.textContent += "\n" + m;
    logEl.scrollTop = logEl.scrollHeight;
  }
};

const setStatus = (t) => statusText && (statusText.textContent = " " + t);

log("BOOT v=" + (window.__BUILD_V || "dev"));
setStatus("Booting…");

/* ---------------- SCENE ---------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 3, 90);

/* ---------------- CAMERA ---------------- */
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 300);

/* ---------------- RENDERER ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

/* ---------------- PLAYER RIG ---------------- */
const player = new THREE.Group();
player.name = "PlayerRig";
scene.add(player);
player.add(camera);

player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

/* ---------------- LIGHTING ---------------- */
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(6, 12, 5);
scene.add(sun);

/* ---------------- CONTROLLERS (FIXED) ---------------- */
const controllers = [];
const grips = [];
const factory = new XRControllerModelFactory();

function laser() {
  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x00ffcc }));
  l.scale.z = 10;
  return l;
}

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.add(laser());
  player.add(c);
  controllers.push(c);

  const g = renderer.xr.getControllerGrip(i);
  g.add(factory.createControllerModel(g));
  player.add(g);
  grips.push(g);
}

log("[main] controllers attached ✅");

/* ---------------- WORLD ---------------- */
const world = await initWorld({ THREE, scene, log });
log("[main] world ready");

/* ---------------- SYSTEMS ---------------- */
const controls = Controls.init({ THREE, renderer, camera, player, controllers, grips, log, world });
const hands = HandsSystem.init({ THREE, scene, renderer, log });
const teleport = Teleport.init({ THREE, scene, renderer, camera, player, controllers, log, world });

/* ---------------- DEALING (EXPORT SAFE) ---------------- */
function resolveDealing(mod) {
  return mod?.default || mod?.Dealing || mod;
}

let dealing = null;
try {
  const D = resolveDealing(DealingModule);
  if (D?.init) {
    dealing = D.init({ THREE, scene, log, world });
    dealing?.startHand?.();
    log("[main] dealing system ready ✅");
  } else {
    log("[main] dealing module loaded (no init)");
  }
} catch (e) {
  log("⚠️ dealing disabled: " + e.message);
}

/* ---------------- EVENTS ---------------- */
addEventListener("scarlett-recenter", () => {
  player.position.set(0, 0, 3.6);
  player.rotation.set(0, 0, 0);
});

/* ---------------- LOOP ---------------- */
let last = performance.now();
setStatus("Ready ✅");
log("[main] running");

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  world?.tick?.(dt);
  controls?.update?.(dt);
  teleport?.update?.(dt);
  dealing?.update?.(dt);
  hands?.update?.(dt);

  renderer.render(scene, camera);
});
