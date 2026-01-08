// js/controls.js
import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

export const Controls = {
  init({ scene, camera, renderer, playerGroup, HUD }) {
    if (typeof window.actionId === "undefined") window.actionId = null;

    // Use local-floor so your height + floor makes sense
    try { renderer.xr.setReferenceSpaceType("local-floor"); } catch (e) {}

    // Desktop helpers
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyM") window.actionId = "menu";
    });

    window.addEventListener("mousedown", () => {
      window.actionId = "primary_click";
    });

    const controllerModelFactory = new XRControllerModelFactory();

    function makeLaser() {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1),
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
      const line = new THREE.Line(geo, mat);
      line.name = "laserLine";
      line.scale.z = 10;
      return line;
    }

    function setupController(i) {
      // DO NOT parent controller under playerGroup (prevents “controller far away” bug)
      const controller = renderer.xr.getController(i);
      controller.name = `controller_${i}`;
      controller.add(makeLaser());
      scene.add(controller);

      // Grip model (visual controller model)
      const grip = renderer.xr.getControllerGrip(i);
      grip.name = `controllerGrip_${i}`;
      grip.add(controllerModelFactory.createControllerModel(grip));
      scene.add(grip);

      controller.addEventListener("selectstart", () => {
        window.actionId = "primary_click";
      });

      return { controller, grip };
    }

    const c0 = setupController(0);
    const c1 = setupController(1);

    if (HUD && HUD.log) HUD.log("Controls fixed: controllers attached to scene (no double-transform).");

    function update() {
      if (typeof window.actionId === "undefined") window.actionId = null;
    }

    return { update, controller0: c0.controller, controller1: c1.controller };
  },
};
