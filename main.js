import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

export function start(mods) {
  const { world, controls, log } = mods;

  // Basic sanity checks
  log(`[XR] navigator.xr = ${!!navigator.xr}`);
  log(`[XR] secureContext = ${window.isSecureContext}`);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  document.body.appendChild(renderer.domElement);

  // ✅ Correct way to create the Enter VR button for module builds
  const btn = VRButton.createButton(renderer);
  document.body.appendChild(btn);
  log("[XR] VRButton injected ✅ (look for 'ENTER VR')");

  // Lights + world
  const hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1.0);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(2, 6, 3);
  scene.add(dir);

  if (world?.build) world.build(scene, log);
  if (controls?.setupControls) controls.setupControls(renderer, camera, scene, log);

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  log("✅ XR LOOP RUNNING");
}
