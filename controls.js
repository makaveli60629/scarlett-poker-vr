import * as THREE from "three";

export function setupControls(renderer, camera, scene, log) {
  const controllers = [];
  const rays = [];

  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    c.userData.index = i;
    scene.add(c);
    controllers.push(c);

    // Visual ray
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial());
    line.name = "ray";
    line.scale.z = 5;
    c.add(line);
    rays.push(line);

    c.addEventListener("connected", (e) => {
      log(`🎮 Controller ${i} connected: ${e.data.gamepad?.id || "unknown"}`);
    });
    c.addEventListener("disconnected", () => {
      log(`🎮 Controller ${i} disconnected`);
    });
  }

  log("[controls] ready ✅ (controllers + rays)");
  return { controllers, rays };
}
