import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

export async function start({ modules, log }) {
  log(`[XR] navigator.xr = ${!!navigator.xr}`);
  log(`[XR] secureContext = ${window.isSecureContext}`);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f14);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 800);
  camera.position.set(0, 1.6, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
  log("[XR] VRButton injected ✅ (ENTER VR)");

  const rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x233044, 1));
  const dl = new THREE.DirectionalLight(0xffffff, 0.55);
  dl.position.set(3, 8, 4);
  scene.add(dl);

  const ctx = { scene, rig, camera, renderer, THREE, log, modules };

  if (modules.world?.build) await modules.world.build(ctx);

  let ctl = null;
  if (modules.controls?.setupControls) ctl = await modules.controls.setupControls({ ...ctx });

  let tp = null;
  if (modules.teleport?.setupTeleport) tp = await modules.teleport.setupTeleport({ ...ctx, controls: ctl });

  try { await modules.ui?.init?.(ctx); } catch (e) { log(`[ui] init failed: ${e.message}`); }
  try { await modules.interactions?.setup?.(ctx); } catch (e) { log(`[interactions] setup failed: ${e.message}`); }

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  renderer.setAnimationLoop(() => {
    ctl?.tick?.();
    tp?.tick?.();
    renderer.render(scene, camera);
  });

  log("✅ XR LOOP RUNNING");
}
