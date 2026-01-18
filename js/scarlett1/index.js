import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { buildWorld } from "../world.js";

const app = document.getElementById("app");
const diagText = document.getElementById("diagText");

function log(m){ diagText.textContent += m+"\n"; console.log(m); }

log("boot");

const r = new THREE.WebGLRenderer();
r.setSize(innerWidth, innerHeight);
r.xr.enabled = true;
app.appendChild(r.domElement);

const s = new THREE.Scene();
s.background = new THREE.Color(0x05070a);
const c = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 200);
c.position.set(0,1.6,3);

s.add(new THREE.AmbientLight(0xffffff,0.7));
const d = new THREE.DirectionalLight(0xffffff,0.8);
d.position.set(4,8,4);
s.add(d);

const world = buildWorld(s, log);

document.getElementById("btnEnterVR").onclick = async ()=>{
  if(!navigator.xr) return alert("no xr");
  const ses = await navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor"]});
  r.xr.setSession(ses);
};

r.setAnimationLoop(()=>{ r.render(s,c); });
