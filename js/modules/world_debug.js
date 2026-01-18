// /js/modules/world_debug.js
export function installWorldDebug({ THREE, scene, rig, camera, dwrite }, { spawnPos }){
  const group = new THREE.Group();
  group.name = "worldDebug";

  // Proof cube (confirms world is rendering)
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.4,0.4,0.4),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  cube.position.set(0, 1.6, 6);
  group.add(cube);

  // Save camera position for billboard helpers
  const tmp = new THREE.Vector3();
  function updateCamCache(){
    camera.getWorldPosition(tmp);
    window.__scarlettCamPosX = tmp.x;
    window.__scarlettCamPosY = tmp.y;
    window.__scarlettCamPosZ = tmp.z;
  }
  updateCamCache();
  setInterval(updateCamCache, 200);

  dwrite?.("[debug] proof cube added");
  return { group };
}
