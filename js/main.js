// js/main.js — GitHub Pages SAFE + exports boot
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { setCamera, setPlayerRig, setScene } from "./state.js";
import { RoomManager } from "./room_manager.js";
import { TeleportMachine } from "./teleport_machine.js";

let Controls = null;
let Interactions = null;
let UI = null;
let BossBots = null;

function overlay(msg) {
  let el = document.getElementById("dbg");
  if (!el) {
    el = document.createElement("div");
    el.id = "dbg";
    el.style.position = "fixed";
    el.style.left = "10px";
    el.style.top = "10px";
    el.style.padding = "10px 12px";
    el.style.background = "rgba(0,0,0,0.55)";
    el.style.color = "#fff";
    el.style.fontFamily = "Arial, sans-serif";
    el.style.fontSize = "14px";
    el.style.borderRadius = "12px";
    el.style.zIndex = "99999";
    document.body.appendChild(el);
  }
  el.textContent = msg;
}

async function safeImport(path) {
  try {
    // cache-bust so Quest/GitHub don't serve stale modules
    return await import(`${path}?v=bootfix`);
  } catch (e) {
    console.warn("Module failed:", path, e);
    return null;
  }
}

/**
 * Exported boot() for HTML that does: import { boot } from './js/main.js'
 * Also auto-runs at bottom if HTML doesn't call it.
 */
export async function boot() {
  overlay("Booting…");

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.xr.enabled = true;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  setScene(scene);

  // Rig + camera
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  const playerRig = new THREE.Group();
  playerRig.add(camera);
  scene.add(playerRig);

  setCamera(camera);
  setPlayerRig(playerRig);

  // Build rooms/world
  RoomManager.init(scene);

  // Teleport + safe spawn
  TeleportMachine.init(scene, playerRig);
  const spawn = TeleportMachine.getSafeSpawn();
  if (spawn) {
    playerRig.position.copy(spawn.position);
    playerRig.rotation.y = spawn.rotationY || 0;
  } else {
    playerRig.position.set(0, 0, 6);
  }

  // Optional modules (won’t crash if missing)
  const c = await safeImport("./controls.js");
  const i = await safeImport("./interactions.js");
  const u = await safeImport("./ui.js");
  const b = await safeImport("./boss_bots.js");

  Controls = c?.Controls || null;
  Interactions = i?.Interactions || null;
  UI = u?.UI || null;
  BossBots = b?.BossBots || null;

  try { Controls?.init?.(renderer, camera, playerRig); } catch {}
  try { Interactions?.init?.(renderer, scene, camera); } catch {}
  try { UI?.init?.(); } catch {}
  try { BossBots?.init?.(scene, camera, { count: 5 }); } catch {}

  overlay("World loaded ✅ (enter VR)");

  const clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    try { Controls?.update?.(dt, () => UI?.toggle?.()); } catch {}
    try { BossBots?.update?.(dt); } catch {}
    renderer.render(scene, camera);
  });

  // Return useful handles (optional)
  return { renderer, scene, camera, playerRig };
}

// Auto-run in case HTML doesn't call boot()
if (!window.__SCARLETT_BOOTED__) {
  window.__SCARLETT_BOOTED__ = true;
  boot().catch((e) => {
    console.error(e);
    overlay("IMPORT FAILED ❌ (open console)");
  });
}
