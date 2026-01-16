// /js/scarlett1/index.js — Scarlett1 Runtime REAL (safe baseline)

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const o = document.getElementById("overlay");
const log = (...a)=> o && (o.textContent += "\n[LOG] " + a.join(" "));
const err = (...a)=> o && (o.textContent += "\n[ERR] " + a.join(" "));

window.addEventListener("error", (e)=> err("window:", e.message));
window.addEventListener("unhandledrejection", (e)=> err("promise:", e.reason?.message || String(e.reason)));

(async () => {
  try {
    log("scarlett1 runtime start ✅");

    const host = document.getElementById("app") || document.body;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(innerWidth, innerHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    host.appendChild(renderer.domElement);

    addEventListener("resize", () => renderer.setSize(innerWidth, innerHeight));

    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton ready ✅");

    const world = new World({ THREE, renderer });
    await world.init();
    log("world.init OK ✅");

    renderer.setAnimationLoop((t, frame) => {
      try {
        world.tick(t, frame);
        renderer.render(world.scene, world.camera);
      } catch (e) {
        err("FRAME CRASH ❌", e?.message || String(e));
        renderer.setAnimationLoop(null);
      }
    });

    log("render loop started ✅");

  } catch (e) {
    err("FATAL ❌", e?.message || String(e));
  }
})();
