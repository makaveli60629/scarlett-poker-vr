// js/controls.js
import * as THREE from "three";

export const Controls = {
  init({ camera, renderer, playerGroup, HUD }) {

    const controllers = [];
    const tempMatrix = new THREE.Matrix4();

    /* ===============================
       DESKTOP INPUT
    =============================== */
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyM") {
        // Toggle menu safely
        window.actionId = (window.actionId === "menu") ? null : "menu";
        HUD?.log?.("Menu toggle:", window.actionId);
      }
    });

    window.addEventListener("mousedown", () => {
      // Desktop click = teleport request
      window.actionId = "teleport";
    });

    /* ===============================
       VR CONTROLLERS
    =============================== */
    function setupController(i) {
      const controller = renderer.xr.getController(i);
      controller.userData.index = i;

      controller.addEventListener("selectstart", () => {
        window.actionId = "teleport";
      });

      controller.addEventListener("selectend", () => {
        // reset handled by interactions.js
      });

      controller.addEventListener("connected", (event) => {
        HUD?.log?.("Controller connected:", event.data?.handedness || i);
      });

      controller.addEventListener("disconnected", () => {
        HUD?.warn?.("Controller disconnected:", i);
      });

      playerGroup.add(controller);
      controllers.push(controller);
    }

    setupController(0);
    setupController(1);

    /* ===============================
       UPDATE LOOP
    =============================== */
    function update() {
      // HARD SAFETY — never allow undefined
      if (typeof window.actionId === "undefined") {
        window.actionId = null;
      }
    }

    HUD?.log?.("Controls ready.");

    return { update };
  }
};
