import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";

const d=window.__scarlettDiagWrite;
d("[scarlett1] LIVE_FINGERPRINT ✓ WALKABLE");

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x020308);

const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,0.1,100);
camera.position.set(0,1.6,3);

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.xr.enabled=true;
document.getElementById("app").appendChild(renderer.domElement);

window.addEventListener("resize",()=>{
camera.aspect=innerWidth/innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(innerWidth,innerHeight);
});

const light=new THREE.HemisphereLight(0xffffff,0x222222,1);
scene.add(light);

const floor=new THREE.Mesh(
new THREE.PlaneGeometry(20,20),
new THREE.MeshStandardMaterial({color:0x103820})
);
floor.rotation.x=-Math.PI/2;
scene.add(floor);

const table=new THREE.Mesh(
new THREE.CylinderGeometry(1.2,1.2,0.2,32),
new THREE.MeshStandardMaterial({color:0x0c2b18})
);
table.position.y=0.9;
scene.add(table);

window.__scarlettEnterVR=async()=>{
if(!navigator.xr){d("[xr] no xr");return;}
await renderer.xr.setSession(await navigator.xr.requestSession("immersive-vr",{requiredFeatures:["local-floor"]}));
d("[xr] session started");
};

renderer.setAnimationLoop(()=>{
renderer.render(scene,camera);
});

d("[status] world ready ✓");
