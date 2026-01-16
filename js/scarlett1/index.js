// /js/scarlett1/index.js — Scarlett Runtime Entry (Update 4.2 REAL)

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const overlay = document.getElementById("overlay");
const log = (...a)=> overlay && (overlay.textContent += "\n[LOG] " + a.join(" "));
const err = (...a)=> overlay && (overlay.textContent += "\n[ERR] " + a.join(" "));

(async () => {
  try {
    log("Scarlett runtime start ✅");

    const host = document.getElementById("app") || document.body;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(innerWidth, innerHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    host.appendChild(renderer.domElement);

    addEventListener("resize", () =>
      renderer.setSize(innerWidth, innerHeight)
    );

    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton ready ✅");

    const world = new World({ THREE, renderer });
    await world.init();
    log("world.init complete ✅");

    renderer.setAnimationLoop((t, frame) => {
      try {
        world.tick(t, frame);
        renderer.render(world.scene, world.camera);
      } catch (e) {
        err("FRAME CRASH ❌", e?.message || e);
        renderer.setAnimationLoop(null);
      }
    });

  } catch (e) {
    err("FATAL ❌", e?.message || e);
  }
})();
