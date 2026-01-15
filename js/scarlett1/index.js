// /js/scarlett1/index.js — Update 4.0 Execution Spine (Permanent)
// Boots the world, shows loading stage, enters XR hands-only.

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

import { World } from "./world.js";

const BUILD = "INDEX_U4_0";

const log = (...a) => console.log("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

(async function main() {
  log("runtime start ✅ build=", BUILD);
  log("href=", location.href);
  log("path=", location.pathname);
  log("secureContext=", String(window.isSecureContext));
  log("ua=", navigator.userAgent);
  log("navigator.xr=", String(!!navigator.xr));

  const host = document.getElementById("app") || document.body;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  host.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // VR Button
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton appended ✅");
  } catch (e) {
    err("VRButton append failed ❌", e?.message || e);
  }

  // World “Brain”
  const world = new World({ THREE, renderer });
  await world.init();

  // Start render loop (world handles loading->active transition)
  renderer.setAnimationLoop((t, frame) => {
    world.tick(t, frame);
    renderer.render(world.scene, world.camera);
  });

})().catch((e) => {
  err("FATAL ❌", e?.message || e);
});
