import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { JumbotronManager } from "./jumbotron_manager.js";

export async function buildWorld(scene){
  scene.add(new THREE.HemisphereLight(0xffffff,0x202020,1.1));
  const dl = new THREE.DirectionalLight(0xffffff,0.9);
  dl.position.set(5,8,3);
  scene.add(dl);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40,40),
    new THREE.MeshStandardMaterial({color:0x071017})
  );
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5,2.5,0.2,48),
    new THREE.MeshStandardMaterial({color:0x0cc6c6})
  );
  table.position.y = 0.8;
  scene.add(table);

  const jumbo = new THREE.Mesh(
    new THREE.PlaneGeometry(5,3),
    new THREE.MeshStandardMaterial({color:0x111111, emissive:0x111111, emissiveIntensity:0.25})
  );
  jumbo.position.set(0,2.5,-10);
  jumbo.lookAt(0,2.5,0);
  scene.add(jumbo);

  const jumbos = new JumbotronManager({channelsUrl:"./streams/channels.json"});
  await jumbos.addScreen(jumbo,0);

  return { jumbos };
}
