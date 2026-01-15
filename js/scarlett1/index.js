import { makeHUD } from "./spine_hud.js";
import { makeDiag } from "./spine_diag.js";
import { makeXR } from "./spine_xr.js";
import { makeAndroid } from "./spine_android.js";
import { makeSafeModules } from "./spine_modules.js";

async function loadThree(ROOT, log) {
  // Prefer your repo’s /js/three.js (you have it)
  const local = `${ROOT}three.js?v=${Date.now()}`;
  try {
    log("THREE import(local):", local);
    return await import(local);
  } catch (e) {
    const cdn = `https://unpkg.com/three@0.158.0/build/three.module.js`;
    log("THREE local failed, fallback CDN:", e?.message || e);
    log("THREE import(cdn):", cdn);
    return await import(cdn);
  }
}

export async function start(ctx) {
  const { V, ROOT, log } = ctx;

  // HUD (DOM overlay) with hide/show + copy logs
  makeHUD({ log });

  const THREE = await loadThree(ROOT, log);

  // Scene basics
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;
  document.getElementById("app").innerHTML = "";
  document.getElementById("app").appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 300);

  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.add(camera);
  scene.add(rig);

  // Light
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(3, 6, 2);
  scene.add(dir);

  // Diagnostics core
  const diag = makeDiag({ log });

  // Controls: Android + XR (both active, but only one drives at a time)
  const android = makeAndroid({ THREE, rig, camera, log });
  const xr = makeXR({ THREE, scene, renderer, rig, camera, log });

  // World/Game is loaded SAFELY as modules (so it can’t crash the spine)
  const modules = makeSafeModules({
    ROOT,
    log,
    THREE,
    scene,
    renderer,
    camera,
    rig,
    diag
  });

  // Load module list
  await modules.loadList(`./modules.json?v=${V}`);

  // Render loop
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);

    // Update control stacks
    xr.update(dt);
    android.update(dt);

    // Update modules
    modules.update(dt);

    // Update diagnostics
    diag.update({
      dt,
      renderer,
      rig,
      xr,
      android,
      modules
    });

    renderer.render(scene, camera);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  log("Scarlett 1.0 Spine running ✅");
}
