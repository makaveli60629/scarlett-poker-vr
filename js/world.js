import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
export function buildWorld(scene, log){
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40,40),
    new THREE.MeshStandardMaterial({color:0x072030})
  );
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:0xff0000})
  );
  box.position.y = 0.5;
  scene.add(box);

  log("world ok");
  return { tick(){} };
}
