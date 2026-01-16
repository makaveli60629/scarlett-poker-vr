// /js/scarlett1/index.js — GitHub Pages SAFE (Update 4.2)
// Shows errors on screen instead of black

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

// --- On-screen error overlay ---
const overlay = document.createElement("pre");
overlay.style.cssText = `
position:fixed;left:6px;top:6px;right:6px;max-height:45vh;
background:rgba(0,0,0,.8);color:#33ff66;
padding:10px;z-index:99999;
font:12px monospace;white-space:pre-wrap;
border:1px solid #33ff66;
`;
document.body.appendChild(overlay);

const log = (...a) => {
  console.log("[index]", ...a);
  overlay.textContent += "[LOG] " + a.join(" ") + "\n";
};
const err = (...a) => {
  console.error("[index]", ...a);
  overlay.textContent += "[ERR] " + a.join(" ") + "\n";
};

window.addEventListener("error", e => err("window:", e.message));
window.addEventListener("unhandledrejection", e => err("promise:", e.reason?.message || e.reason));

(async function main() {
  try {
    log("start ✅");
    log("secureContext =", window.isSecureContext);
    log("navigator.xr =", !!navigator.xr);

    const host = document.getElementById("app") || document.body;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(innerWidth, innerHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    host.appendChild(renderer.domElement);

    window.addEventListener("resize", () => {
      renderer.setSize(innerWidth, innerHeight);
    });

    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton appended ✅");

    const world = new World({ THREE, renderer });
    await world.init();
    log("world.init ✅");

    renderer.setAnimationLoop((t, frame) => {
      try {
        world.tick(t, frame);
        renderer.render(world.scene, world.camera);
      } catch (e) {
        err("FRAME CRASH:", e.message || e);
        renderer.setAnimationLoop(null);
      }
    });

  } catch (e) {
    err("FATAL:", e.message || e);
  }
})();
