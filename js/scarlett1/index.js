// /js/scarlett1/index.js — CRASH-VISIBLE (shows errors on screen)
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const overlay = document.createElement("pre");
overlay.style.cssText = `
position:fixed;left:8px;top:8px;right:8px;max-height:45vh;overflow:auto;
background:rgba(0,0,0,.75);color:#33ff66;padding:10px;z-index:99999;
font:12px/1.25 monospace;white-space:pre-wrap;border:1px solid #33ff66;`;
document.body.appendChild(overlay);

const log = (...a) => { console.log("[index]", ...a); overlay.textContent += "[LOG] " + a.join(" ") + "\n"; };
const err = (...a) => { console.error("[index]", ...a); overlay.textContent += "[ERR] " + a.join(" ") + "\n"; };

window.addEventListener("error", (e) => err("window.error:", e.message));
window.addEventListener("unhandledrejection", (e) => err("promise:", e.reason?.message || String(e.reason)));

(async function main() {
  log("start ✅ href=", location.href);
  log("xr=", String(!!navigator.xr), "secure=", String(window.isSecureContext));

  const host = document.getElementById("app") || document.body;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  host.appendChild(renderer.domElement);

  addEventListener("resize", () => renderer.setSize(innerWidth, innerHeight));

  document.body.appendChild(VRButton.createButton(renderer));
  log("VRButton ✅");

  const world = new World({ THREE, renderer });
  await world.init();
  log("world.init ✅");

  renderer.setAnimationLoop((t, frame) => {
    try {
      world.tick(t, frame);
      renderer.render(world.scene, world.camera);
    } catch (e) {
      err("FRAME CRASH:", e?.message || e);
      renderer.setAnimationLoop(null);
    }
  });

})().catch((e) => err("FATAL:", e?.message || e));
