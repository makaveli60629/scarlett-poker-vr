import * as THREE from "three";

export const Controls = {
  init({ scene, camera, renderer, playerGroup, HUD }) {
    if (typeof window.actionId === "undefined") window.actionId = null;

    const tempMatrix = new THREE.Matrix4();

    // Laser for controller
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

    // Desktop: M toggles menu
    window.addEventListener("keydown", function (e) {
      if (e.code === "KeyM") {
        window.actionId = "menu";
      }
    });

    // Desktop click = primary click
    window.addEventListener("mousedown", function () {
      window.actionId = "primary_click";
    });

    // VR controllers (0 + 1)
    function setupController(i) {
      const controller = renderer.xr.getController(i);
      controller.name = "controller_" + i;

      const laser = makeLaser();
      controller.add(laser);

      controller.addEventListener("selectstart", function () {
        window.actionId = "primary_click";
      });

      playerGroup.add(controller);
    }

    setupController(0);
    setupController(1);

    function update() {
      if (typeof window.actionId === "undefined") window.actionId = null;
    }

    if (HUD && HUD.log) HUD.log("Controls ready.");
    return { update: update };
  }
};
