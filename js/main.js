// js/main.js — Scarlett Poker VR (PERMANENT BASE)
// GitHub Pages + WebXR SAFE

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const HUB = document.getElementById("hub");
const log = (m) => HUB && (HUB.innerHTML += m + "<br>");
const ok = (m) => log("✅ " + m);
const warn = (m) => log("⚠️ " + m);

log("Scarlett Poker VR — loading...");

(async () => {
  /* ---------------- Scene / Renderer ---------------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);

  const camera = new THREE.PerspectiveCamera(
    70,
    innerWidth / innerHeight,
    0.1,
    100
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  ok("Renderer + VRButton ready");

  /* ---------------- Player Rig ---------------- */
  const playerGroup = new THREE.Group();
  playerGroup.add(camera);
  scene.add(playerGroup);

  /* ---------------- Lighting (ANTI-BLACK) ---------------- */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.1));

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 10, 5);
  scene.add(sun);

  ok("Lighting added");

  /* ---------------- Dynamic Module Loader ---------------- */
  async function load(name) {
    try {
      const mod = await import(`./${name}.js`);
      ok(`Loaded ${name}.js`);
      return mod;
    } catch (e) {
      warn(`Skipped ${name}.js`);
      return null;
    }
  }

  /* ---------------- Load Core Systems ---------------- */
  const World = (await load("world"))?.World;
  const Alignment = (await load("alignment"))?.Alignment;
  const XRLocomotion = (await load("xr_locomotion"))?.XRLocomotion;
  const Controls = (await load("controls"))?.Controls;

  /* ---------------- Build World ---------------- */
  let worldData = null;
  if (World) {
    worldData = World.build(scene, playerGroup);
    ok("World built");
  } else {
    warn("World missing — grid fallback");
    const grid = new THREE.GridHelper(40, 40);
    scene.add(grid);
  }

  /* ---------------- Spawn Fix ---------------- */
  if (Alignment && worldData?.padById?.lobby) {
    Alignment.spawnOnPad(playerGroup, worldData.padById.lobby);
    ok("Spawned on lobby pad");
  }

  if (Alignment) {
    Alignment.init(playerGroup, camera);
    ok("Alignment locked");
  }

  /* ---------------- Locomotion ---------------- */
  if (XRLocomotion) {
    XRLocomotion.init(renderer, playerGroup, camera, worldData);
    ok("XR locomotion ready");
  }

  /* ---------------- Resize ---------------- */
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ---------------- Render Loop ---------------- */
  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    try {
      Alignment?.update(playerGroup, camera);
      XRLocomotion?.update?.(dt);
      Controls?.update?.(dt);
    } catch {}

    renderer.render(scene, camera);
  });

  ok("Main loop running");
})();
