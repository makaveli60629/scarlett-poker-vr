// js/main.js — VIP Boot with versioned imports (forces refresh on Quest)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

if (!window.__SKYLARK__) window.__SKYLARK__ = {};
const S = window.__SKYLARK__;

function hudLog(msg) {
  try { window.__HUD__?.log?.(msg); } catch {}
  console.log(msg);
}

// Pull the version string from HUD
const V = (window.__HUD__?.V) ? window.__HUD__.V : String(Date.now());

export async function boot() {
  if (S.bootPromise) return S.bootPromise;

  S.bootPromise = (async () => {
    if (S.renderer) return;

    const app = document.getElementById("app") || document.body;

    // Dynamic imports with SAME version to defeat caching
    const { World } = await import("./world.js?v=" + V);
    const { Controls } = await import("./controls.js?v=" + V);

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
    renderer.toneMappingExposure = 1.45;
    renderer.xr.enabled = true;

    app.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    S.scene = scene;
    S.camera = camera;
    S.player = player;
    S.renderer = renderer;

    // Build world
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

    hudLog("VIP boot running (v=" + V + ").");
  })();

  return S.bootPromise;
}
