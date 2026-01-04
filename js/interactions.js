// js/interactions.js
import * as THREE from "three";

export const Interactions = {
  init({ scene, camera, renderer, playerGroup, HUD }) {
    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    // Reticle
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.12, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide })
    );
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    scene.add(reticle);

    // Find UI module if present (global find)
    function findUIRoot() {
      return scene.getObjectByName("ui_root");
    }

    function collectClickableUI() {
      const uiRoot = findUIRoot();
      const clickable = [];
      if (!uiRoot) return clickable;
      uiRoot.traverse((obj) => {
        if (obj.userData && obj.userData.isUIButton) clickable.push(obj);
      });
      return clickable;
    }

    // Chips
    function spawnChipsStack(pos) {
      const stack = new THREE.Group();
      stack.name = "chip_stack";

      const colors = [0xff3b30, 0x34c759, 0x0a84ff, 0xffcc00, 0xffffff];

      for (let i = 0; i < 12; i++) {
        const c = colors[i % colors.length];
        const chip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.012, 28),
          new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.1 })
        );
        chip.rotation.x = Math.PI / 2;
        chip.position.y = i * 0.012;
        stack.add(chip);
      }

      stack.position.copy(pos);
      stack.position.y += 0.06;
      scene.add(stack);
    }

    // Teleport
    function teleportTo(point) {
      playerGroup.position.set(point.x, 0, point.z);
    }

    // Floor hit helper
    function findFloor(intersections) {
      for (const hit of intersections) {
        if (hit.face && hit.face.normal.y > 0.7) return hit;
      }
      return null;
    }

    // Build ray from desktop or VR controller
    function setRayFromInput() {
      if (!renderer.xr.isPresenting) {
        // Desktop = center of screen
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        return { mode: "desktop", controller: null };
      } else {
        // VR = controller 0
        const controller = renderer.xr.getController(0);
        if (!controller) return { mode: "vr", controller: null };

        tempMatrix.identity().extractRotation(controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        return { mode: "vr", controller };
      }
    }

    // Run UI action
    function runAction(action, hitPoint) {
      if (!action) return;

      // UI switching
      const uiRoot = findUIRoot();
      const menu = uiRoot?.getObjectByName("ui_menu");
      const store = uiRoot?.getObjectByName("ui_store");

      switch (action) {
        case "open_store":
          if (menu) menu.visible = false;
          if (store) store.visible = true;
          HUD?.log?.("Store opened.");
          break;

        case "close_store":
          if (store) store.visible = false;
          if (menu) menu.visible = true;
          HUD?.log?.("Store closed.");
          break;

        case "teleport_point_A":
          teleportTo(new THREE.Vector3(0, 0, 5));
          break;

        case "teleport_point_B":
          teleportTo(new THREE.Vector3(2.5, 0, 2.5));
          break;

        case "teleport_point_C":
          teleportTo(new THREE.Vector3(-2.5, 0, 2.5));
          break;

        case "spawn_chips":
          spawnChipsStack(hitPoint || playerGroup.position);
          HUD?.log?.("Chips spawned.");
          break;

        case "buy_theme_table":
          HUD?.log?.("Purchased: Table Theme (placeholder).");
          break;

        case "buy_sofa":
          HUD?.log?.("Purchased: Sofa (placeholder).");
          break;

        case "buy_emotes":
          HUD?.log?.("Purchased: Emote Pack (placeholder).");
          break;

        default:
          HUD?.warn?.("Unknown action:", action);
          break;
      }
    }

    function update() {
      if (typeof window.actionId === "undefined") window.actionId = null;

      const input = setRayFromInput();
      const clickableUI = collectClickableUI();

      // 1) UI raycast FIRST (so buttons work)
      let uiHit = null;
      if (clickableUI.length) {
        const uiHits = raycaster.intersectObjects(clickableUI, true);
        if (uiHits && uiHits.length) uiHit = uiHits[0];
      }

      // 2) Floor raycast for reticle (if no UI hit)
      const hits = raycaster.intersectObjects(scene.children, true);
      const floorHit = findFloor(hits);

      if (floorHit && !uiHit) {
        reticle.visible = true;
        reticle.position.copy(floorHit.point);
      } else {
        reticle.visible = false;
      }

      // 3) Handle primary click (VR trigger / desktop click)
      if (window.actionId === "primary_click") {
        if (uiHit && uiHit.object?.userData?.action) {
          // UI action
          runAction(uiHit.object.userData.action, uiHit.point);
        } else if (floorHit) {
          // Teleport if no UI pressed
          teleportTo(floorHit.point);
        }
        window.actionId = null;
      }
    }

    HUD?.log?.("Interactions ready (UI click + teleport + chips).");
    return { update };
  },
};
