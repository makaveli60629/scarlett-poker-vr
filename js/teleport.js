import * as THREE from "three";
export async function setupTeleport({ scene, rig, camera, renderer, THREE, log, controls }) {
  const rc = new THREE.Raycaster(), m = new THREE.Matrix4(), d = new THREE.Vector3(), p = new THREE.Vector3();
  const ret = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.24, 32),
    new THREE.MeshStandardMaterial({ color: 0x00ff66 })
  );
  ret.rotation.x = -Math.PI / 2;
  ret.visible = false;
  scene.add(ret);

  const floors = () => scene.children.filter(o => o.userData?.isFloor);
  const right = controls?.controllers?.[1] || renderer.xr.getController(1);

  const cast = () => {
    m.identity().extractRotation(right.matrixWorld);
    d.set(0, 0, -1).applyMatrix4(m).normalize();
    right.getWorldPosition(p);
    rc.set(p, d);
    return rc.intersectObjects(floors(), true)[0] || null;
  };

  right.addEventListener("selectend", () => {
    const h = cast();
    if (h) {
      rig.position.set(h.point.x, 0, h.point.z);
      log("✅ teleport");
    }
  });

  function tick() {
    const h = cast();
    if (h) { ret.position.copy(h.point); ret.visible = true; }
    else ret.visible = false;
  }

  log("[teleport] ready ✓");
  return { tick };
}
