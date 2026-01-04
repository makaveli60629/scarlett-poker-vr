// js/controls.js
import * as THREE from "three";

export const Controls = {
  init({ scene, camera, renderer, playerGroup, HUD }) {
    // Safety global
    if (typeof window.actionId === "undefined") window.actionId = null;

    const controllers = [];
    const controllerGrips = [];

    // Laser visuals
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

    function makeLaserDot() {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x00ffcc })
      );
      dot.name = "laserDot";
      dot.visible = false;
      return dot;
    }

    // Desktop input
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyM") {
        window.actionId = window.actionId === "menu" ? null : "menu";
        HUD?.log?.("Menu toggle:", window.actionId);
      }
    });

    // Desktop click = try UI click first, else teleport request
    window.addEventListener("mousedown", () => {
      window.actionId = "primary_click";
    });

    // Setup VR controller
    function setupController(i) {
      const controller = renderer.xr.getController(i);
      controller.userData.index = i;

      const laser = makeLaser();
      controller.add(laser);

      const dot = makeLaserDot();
      scene.add(dot);
      controller.userData.laserDot = dot;

      controller.addEventListener("selectstart", () => {
        // One unified input action – Interactions decides what it hits
        window.actionId = "primary_click";
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

    // XR session start: ensure globals exist
    renderer.xr.addEventListener("sessionstart", () => {
      if (typeof window.actionId === "undefined") window.actionId = null;
    });

    function update() {
      // Never allow undefined
      if (typeof window.actionId === "undefined") window.actionId = null;
    }

    HUD?.log?.("Controls ready (laser + input).");
    return { update, controllers };
  },
};
