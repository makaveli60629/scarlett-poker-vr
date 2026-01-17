import * as THREE from "three";

export function start({world,controls,log}){
 log("▶ main.start()");
 const scene=new THREE.Scene();
 scene.background=new THREE.Color(0x101010);
 const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,100);
 camera.position.set(0,1.6,3);
 const renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setSize(innerWidth,innerHeight);
 renderer.xr.enabled=true;
 document.body.appendChild(renderer.domElement);
 document.body.appendChild(THREE.WEBXR.createButton(renderer));
 if(world?.build) world.build(scene,log);
 if(controls?.setupControls) controls.setupControls(renderer,camera,scene,log);
 renderer.setAnimationLoop(()=>renderer.render(scene,camera));
 log("✅ XR LOOP RUNNING");
}