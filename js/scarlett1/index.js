// /js/scarlett1/index.js — Scarlett1 Runtime (FULL)
// BUILD: SCARLETT1_FULL_v1_0
// CRITICAL: No "import ... from 'three'". Always use CDN URLs in browsers.

export function boot() {
  main().catch((e) => {
    console.error("[scarlett1] fatal ❌", e?.stack || e);
    writeHud(`[ERR] ${e?.stack || e?.message || e}`);
  });
}

const BUILD = "SCARLETT1_FULL_v1_0";

const log = (...a) => console.log("[scarlett1]", ...a);
const err = (...a) => console.error("[scarlett1]", ...a);

function writeHud(line) {
  const id = "scarlett-mini-hud";
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent += `\n${line}`;
}

async function main() {
  writeHud(`[LOG] scarlett1 starting… build=${BUILD}`);

  // --- Three.js imports (CDN) ---
  const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
  const { VRButton } = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js");
  writeHud("[LOG] three loaded ✅");
  writeHud("[LOG] VRButton loaded ✅");

  // --- Scene setup ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    200
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  // attach
  const mount = document.getElementById("app") || document.body;
  mount.appendChild(renderer.domElement);

  // XR button
  document.body.appendChild(VRButton.createButton(renderer));
  writeHud("[LOG] VRButton appended ✅");

  // --- Lights ---
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(2, 6, 3);
  scene.add(dir);

  // --- Player rig (so we can move camera cleanly later) ---
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.position.set(0, 1.65, 3.0); // spawn slightly back so you see center
  rig.add(camera);
  scene.add(rig);

  // --- Basic floor so Quest never shows pure black ---
  const floorGeo = new THREE.PlaneGeometry(50, 50);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 1, metalness: 0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = false;
  scene.add(floor);

  // --- Load world module (local) ---
  writeHud("[LOG] importing world.js …");
  const worldMod = await import("./world.js");
  if (worldMod?.buildWorld) {
    worldMod.buildWorld({ THREE, scene, rig, renderer, camera, log, err, writeHud });
    writeHud("[LOG] world built ✅");
  } else {
    writeHud("[ERR] world.js missing export buildWorld()");
  }

  // --- Resize ---
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Render loop ---
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    // (future: update hands/locomotion here)
    renderer.render(scene, camera);
  });

  // --- XR session diagnostics ---
  if (navigator.xr) {
    renderer.xr.addEventListener("sessionstart", () => {
      writeHud("[LOG] XR session start ✅");
      log("XR session start ✅");
    });
    renderer.xr.addEventListener("sessionend", () => {
      writeHud("[LOG] XR session end ✅");
      log("XR session end ✅");
    });
  }

  writeHud("[LOG] scarlett1 runtime start ✅");
  log("runtime start ✅", BUILD);
      }
