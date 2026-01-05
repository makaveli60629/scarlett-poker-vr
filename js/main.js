// js/main.js — VIP Boot (Quest-safe, single boot, no double session)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";
import { Controls } from "./controls.js";

if (!window.__SKYLARK__) window.__SKYLARK__ = {};
const S = window.__SKYLARK__;

function hudLog(msg) {
  try { window.__HUD__?.log?.(msg); } catch {}
  console.log(msg);
}

export async function boot() {
  if (S.bootPromise) return S.bootPromise;

  S.bootPromise = (async () => {
    if (S.renderer) return;

    const app = document.getElementById("app") || document.body;

    // Scene
    const scene = new THREE.Scene();

    // Camera & player rig
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
    const player = new THREE.Group();
    player.name = "playerRig";
    player.position.set(0, 0, 0);
    player.add(camera);
    scene.add(player);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // BRIGHT for Quest (prevents “all black”)
    renderer.toneMappingExposure = 1.45;

    renderer.xr.enabled = true;

    app.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Store singletons
    S.scene = scene;
    S.camera = camera;
    S.player = player;
    S.renderer = renderer;

    // XR status (HUD)
    renderer.xr.addEventListener("sessionstart", () => {
      window.__HUD__?.xrPill?.classList?.remove("bad");
      window.__HUD__?.xrPill?.classList?.add("ok");
      if (window.__HUD__?.xrPill) window.__HUD__.xrPill.textContent = "XR: session started";
      hudLog("XR session started");
    });
    renderer.xr.addEventListener("sessionend", () => {
      window.__HUD__?.xrPill?.classList?.remove("ok");
      window.__HUD__?.xrPill?.classList?.add("bad");
      if (window.__HUD__?.xrPill) window.__HUD__.xrPill.textContent = "XR: ended";
      hudLog("XR session ended");
    });

    // Build VIP world (table/rail/chairs/spawn)
    World.build(scene, player);

    // Controls
    Controls.init(renderer, camera, player, scene);

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Loop
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.033);
      Controls.update(dt);
      World.update?.(dt, camera, player);
      renderer.render(scene, camera);
    });

    hudLog("VIP boot running.");
  })();

  return S.bootPromise;
}
