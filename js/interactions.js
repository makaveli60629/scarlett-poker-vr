import * as THREE from "three";

export const Interactions = {
  init({ scene, camera, renderer, playerGroup, HUD, uiClickable }) {
    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    // Reticle for teleport
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.12, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide })
    );
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    scene.add(reticle);

    function setRayFromInput() {
      if (!renderer.xr.isPresenting) {
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        return;
      }
      const controller = renderer.xr.getController(0);
      if (!controller) return;

      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    }

    function findFloor(intersections) {
      for (let i = 0; i < intersections.length; i++) {
        const hit = intersections[i];
        if (hit.face && hit.face.normal && hit.face.normal.y > 0.7) return hit;
        if (hit.object && hit.object.name === "floor") return hit;
      }
      return null;
    }

    function teleportTo(point) {
      playerGroup.position.set(point.x, 0, point.z);
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

    function runAction(action, hitPoint) {
      const uiRoot = scene.getObjectByName("ui_root");
      const menu = uiRoot ? uiRoot.getObjectByName("ui_menu") : null;
      const store = uiRoot ? uiRoot.getObjectByName("ui_store") : null;

      if (action === "open_store") {
        if (menu) menu.visible = false;
        if (store) store.visible = true;
        if (HUD && HUD.log) HUD.log("Store opened.");
        return;
      }
      if (action === "close_store") {
        if (store) store.visible = false;
        if (menu) menu.visible = true;
        if (HUD && HUD.log) HUD.log("Store closed.");
        return;
      }

      if (action === "teleport_point_A") { teleportTo(new THREE.Vector3(0, 0, 5)); return; }
      if (action === "teleport_point_B") { teleportTo(new THREE.Vector3(2.5, 0, 2.5)); return; }
      if (action === "teleport_point_C") { teleportTo(new THREE.Vector3(-2.5, 0, 2.5)); return; }

      if (action === "spawn_chips") {
        spawnChipsStack(hitPoint || playerGroup.position);
        if (HUD && HUD.log) HUD.log("Chips spawned.");
        return;
      }

      if (HUD && HUD.log) HUD.log("Purchased (placeholder):", action);
    }

    function update() {
      if (typeof window.actionId === "undefined") window.actionId = null;

      setRayFromInput();

      // UI hit first
      let uiHit = null;
      const clickable = uiClickable || [];
      if (clickable.length) {
        const uiHits = raycaster.intersectObjects(clickable, true);
        if (uiHits && uiHits.length) uiHit = uiHits[0];
      }

      // Floor hit
      const hits = raycaster.intersectObjects(scene.children, true);
      const floorHit = findFloor(hits);

      if (floorHit && !uiHit) {
        reticle.visible = true;
        reticle.position.copy(floorHit.point);
      } else {
        reticle.visible = false;
      }

      // Primary click (desktop click / VR trigger)
      if (window.actionId === "primary_click") {
        if (uiHit && uiHit.object && uiHit.object.userData && uiHit.object.userData.action) {
          runAction(uiHit.object.userData.action, uiHit.point);
        } else if (floorHit) {
          teleportTo(floorHit.point);
        }
        window.actionId = null;
      }
    }

    if (HUD && HUD.log) HUD.log("Interactions ready.");
    return { update: update };
  }
};
