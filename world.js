import * as THREE from "three";
export function build(scene,log){
 const floor=new THREE.Mesh(
  new THREE.PlaneGeometry(20,20),
  new THREE.MeshStandardMaterial({color:0x222222})
 );
 floor.rotation.x=-Math.PI/2;
 scene.add(floor);
 const light=new THREE.HemisphereLight(0xffffff,0x444444,1);
 scene.add(light);
 log("[world] ready ✅");
}