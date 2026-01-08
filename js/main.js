// /js/main.js — Scarlett VR Poker 9.2 (MODULAR CORE + WORLD)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { createRigCore } from "./rig_controls.js";

const log = (m) => (window.__hubLog ? window.__hubLog(m) : console.log(m));
const V = new URL(import.meta.url).searchParams.get("v") || (window.__BUILD_V || "9021");
log("[main] boot v=" + V);

let renderer, scene, camera;
let world = null;
const clock = new THREE.Clock();

let rig = null;

boot().catch((e) => log("❌ boot failed: " + (e?.message || e)));

async function boot() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const btn = VRButton.createButton(renderer);
  btn.id = "VRButton";
  btn.style.position = "fixed";
  btn.style.right = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "2147483647";
  document.body.appendChild(btn);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 350);
  camera.position.set(0, 1.6, 0);

  // base lights (world adds more)
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(6, 10, 4);
  scene.add(key);

  // ✅ permanent rig core
  rig = createRigCore({ THREE, renderer, scene, camera, log });
  rig.setupControllers();

  // load world
  try {
    const mod = await import(`./world.js?v=${encodeURIComponent(V)}`);
    world = await mod.initWorld({ THREE, scene, log, v: V });
    log("[main] world init ✅");
  } catch (e) {
    log("❌ world import/init failed: " + (e?.message || e));
  }

  // spawn at official spawn pad
  const spawn = world?.spawnPads?.[0] || new THREE.Vector3(0, 0, 3.5);
  rig.player.position.set(spawn.x, 0, spawn.z);

  // face table (non-XR)
  faceTable(false);

  // recenter hotkeys / debug
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "i") {
      window.dispatchEvent(new Event("scarlett-toggle-invert-move"));
    }
    if (e.key.toLowerCase() === "r") {
      window.dispatchEvent(new Event("scarlett-recenter"));
    }
  });

  window.addEventListener("scarlett-recenter", () => {
    const s = world?.spawnPads?.[0] || new THREE.Vector3(0, 0, 3.5);
    rig.player.position.set(s.x, 0, s.z);
    faceTable(true);
    log("[main] recenter ✅");
  });

  renderer.xr.addEventListener("sessionstart", () => {
    setTimeout(() => {
      faceTable(true);
      log("[main] sessionstart recenter ✅");
    }, 80);
  });

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(tick);

  log("[main] ready ✅ v=" + V);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function getHeadYaw() {
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  return e.y;
}

function faceTable(xrAware = false) {
  if (!world?.tableFocus) return;

  const pos = new THREE.Vector3(rig.player.position.x, 0, rig.player.position.z);
  const toTable = new THREE.Vector3().subVectors(world.tableFocus, pos);
  const desiredYaw = Math.atan2(toTable.x, toTable.z);

  if (!xrAware) {
    rig.player.rotation.y = desiredYaw;
    return;
  }
  const headYaw = getHeadYaw();
  rig.player.rotation.y += (desiredYaw - headYaw);
}

function tick() {
  const dt = clock.getDelta();

  // rig movement + pointer + teleport visuals
  rig.applyLocomotion(dt, world);

  // ✅ teleporter interaction + floor teleport handled by world
  if (world?.handleTeleportConfirm) {
    world.handleTeleportConfirm({ rig, camera, dt });
  }

  if (world?.tick) world.tick(dt);

  renderer.render(scene, camera);
  }
