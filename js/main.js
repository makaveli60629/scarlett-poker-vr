import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { buildWorld } from "./world.js";

export async function startApp(){
  const canvas = document.getElementById("c");
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.xr.enabled = true;
  document.body.appendChild(VRButton.createButton(renderer));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02070b);

  const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.05, 200);
  camera.position.set(0,1.6,8);

  const world = await buildWorld(scene);

  document.getElementById("watchBtn").onclick = async ()=>{
    await world.jumbos.startAll();
    document.getElementById("watchPanel").style.display = "block";
  };

  document.getElementById("watchPanel").innerHTML = `
    <button onclick="window.TV_NEXT()">Next</button>
    <button onclick="window.TV_PREV()">Prev</button>
    <button onclick="window.TV_MUTE()">Mute</button>
  `;

  window.TV_NEXT = ()=>world.jumbos.nextChannelActive();
  window.TV_PREV = ()=>world.jumbos.prevChannelActive();
  window.TV_MUTE = ()=>world.jumbos.toggleMuteActive();

  window.addEventListener("resize", ()=>{
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  renderer.setAnimationLoop(()=>renderer.render(scene,camera));
}
