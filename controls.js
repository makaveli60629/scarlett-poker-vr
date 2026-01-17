import * as THREE from "three";
export function setupControls(renderer,camera,scene,log){
 for(let i=0;i<2;i++){
  const c=renderer.xr.getController(i);
  scene.add(c);
  c.addEventListener("connected",e=>log(`🎮 Controller ${i} connected`));
 }
}