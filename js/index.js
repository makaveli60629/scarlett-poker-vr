import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createSunkenPokerSystem } from './world.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f18);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 200);
camera.position.set(0,1.6,8);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// lights
scene.add(new THREE.HemisphereLight(0xffffff,0x223344,1.2));
const d = new THREE.DirectionalLight(0xffffff,1.4);
d.position.set(5,10,6);
scene.add(d);

// helpers
scene.add(new THREE.GridHelper(40,40));
scene.add(new THREE.AxesHelper(2));

const textureLoader = new THREE.TextureLoader();

const pokerSystem = createSunkenPokerSystem({
  scene,
  renderer,
  textureLoader
});

function resetSpawn(){
  camera.position.set(0,1.6,8);
  camera.lookAt(0,1.2,0);
}
document.getElementById('reset').onclick = resetSpawn;

window.addEventListener('resize',()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(()=>{
  pokerSystem.update(clock.getDelta());
  renderer.render(scene,camera);
});
