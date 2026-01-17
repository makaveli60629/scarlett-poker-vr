import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

export async function start({ modules, log }) {
  log(`[XR] navigator.xr = ${!!navigator.xr}`);
  log(`[XR] secureContext = ${window.isSecureContext}`);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b11);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1200);
  camera.position.set(0, 1.6, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
  log("[XR] VRButton injected ✅ (ENTER VR)");

  // Player rig (move rig; camera stays child)
  const rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  // Base lights (modules add more)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x233044, 1.0));
  const dl = new THREE.DirectionalLight(0xffffff, 0.55);
  dl.position.set(6, 10, 5);
  scene.add(dl);

  const ctx = { scene, rig, camera, renderer, THREE, log, modules };

  // World build (adapter will call modules safely)
  if (modules.world?.build) await modules.world.build(ctx);

  // Controls: Quest OR Android touch overlay
  const ctl = modules.controls?.setupControls ? await modules.controls.setupControls(ctx) : null;

  // Teleport: keeps working in VR; Android uses joystick
  const tp = modules.teleport?.setupTeleport ? await modules.teleport.setupTeleport({ ...ctx, controls: ctl }) : null;

  // UI / interactions
  try { await modules.ui?.init?.(ctx); } catch (e) { log(`[ui] init failed: ${e.message}`); }
  try { await modules.interactions?.setup?.(ctx); } catch (e) { log(`[interactions] setup failed: ${e.message}`); }

  // Avatar apparel module hooks
  try { await modules.apparel?.initAvatarApparel?.(ctx); } catch (e) { log(`[apparel] init failed: ${e.message}`); }

  // Bots (lightweight sim) — does NOT gamble, just demo logic + state machine
  try { await modules.bots?.initBots?.(ctx); } catch (e) { log(`[bots] init failed: ${e.message}`); }

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  renderer.setAnimationLoop(() => {
    ctl?.tick?.();
    tp?.tick?.();
    modules.apparel?.tick?.(ctx);
    modules.bots?.tick?.(ctx);
    renderer.render(scene, camera);
  });

  log("✅ XR LOOP RUNNING");
}
