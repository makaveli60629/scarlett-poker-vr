// /js/main.js
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { initWorld } from "./world.js";
import { Controls } from "./controls.js";
import { UI } from "./ui.js";
import { Interactions } from "./interactions.js";
import { DealingMix } from "./dealingMix.js";

const logEl = document.getElementById("log");
const log = (m)=>{ if (logEl) logEl.textContent += "\n" + m; console.log(m); };

log("[main] loaded ✅");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 1, 50);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 250);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const player = new THREE.Group();
player.add(camera);
scene.add(player);

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(7,12,6);
scene.add(dir);

// build world (your world.js)
const world = await initWorld({ THREE, scene, log, v: window.__BUILD_V || "v" });

// controls / ui / interactions (these can be minimal stubs initially)
const controls = Controls?.init ? Controls.init({ THREE, scene, camera, renderer, player, world, log }) : null;
const ui = UI?.init ? UI.init({ THREE, scene, camera, renderer, player, world, log }) : null;
const interactions = Interactions?.init ? Interactions.init({ THREE, scene, camera, renderer, player, world, ui, log }) : null;

// Dealing mix
const dealingMix = DealingMix?.init ? DealingMix.init({ THREE, scene, log, v: window.__BUILD_V || "v", world }) : null;
dealingMix?.startHand?.();

addEventListener("resize", () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now-last)/1000);
  last = now;

  try { world?.tick?.(dt); } catch {}
  try { controls?.update?.(dt); } catch {}
  try { ui?.update?.(dt); } catch {}
  try { interactions?.update?.(dt); } catch {}
  try { dealingMix?.update?.(dt); } catch {}

  renderer.render(scene, camera);
});
