// /js/index.js — MASTER Runtime (HybridWorld build + frame-compatible)

import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

const L = window.ScarlettLog?.push || console.log;
const setMode = window.ScarlettLog?.setMode?.bind(window.ScarlettLog) || (() => {});

L("[index] runtime start ✅", "ok");
setMode("init");

const app = document.getElementById("app");
if (!app) throw new Error("FATAL: #app missing");

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2000);
camera.position.set(0, 1.6, 3);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.85));

L("[index] renderer/camera/rig ✅", "ok");

// VR button
try{
  const b = VRButton.createButton(renderer);
  document.getElementById("vrSlot")?.appendChild(b);
  L("[index] VRButton appended ✅", "ok");
}catch(e){
  L("[index] VRButton failed: " + (e?.message || e), "warn");
}

window.addEventListener("resize", ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

const controllers = { left:null, right:null, lasers:[] };

let WorldLike = null;
let ctx = null;
let worldFrame = null;

async function loadWorld(){
  setMode("importing world");
  L("[index] importing ./world.js …");
  const mod = await import("./world.js");
  L("[index] world.js exports: " + Object.keys(mod).join(", "), "ok");

  WorldLike = mod.World || mod.HybridWorld || mod.default || null;
  if (!WorldLike) throw new Error("No usable world export found.");

  const methods = Object.keys(WorldLike).filter(k => typeof WorldLike[k] === "function");
  L("[index] world methods: " + (methods.length ? methods.join(", ") : "(none)"), methods.length ? "ok" : "warn");

  if (typeof WorldLike.build !== "function") throw new Error("World export missing build().");
  if (typeof WorldLike.frame === "function") worldFrame = WorldLike.frame.bind(WorldLike);
}

function callWorldFrameSafely(frameFn, ctx, dt, t){
  // Try common signatures without spamming failures.
  // Return true if one signature works (no throw), else false.
  try { frameFn(ctx, dt, t); return true; } catch {}
  try { frameFn(ctx); return true; } catch {}
  try { frameFn(dt); return true; } catch {}
  try { frameFn(t, dt); return true; } catch {}
  try { frameFn(renderer, scene, camera, dt, t); return true; } catch {}
  return false;
}

(async ()=>{
  try{
    setMode("loading world");
    await loadWorld();

    ctx = {
      THREE, scene, renderer, camera, player, controllers,
      log: console.log,
      BUILD: Date.now()
    };

    L("[index] calling world.build() …");
    await WorldLike.build(ctx);

    L("[index] world start ✅","ok");
    setMode("ready");
  }catch(e){
    L("[index] world start FAIL ❌","bad");
    L(String(e?.stack || e), "muted");
    setMode("world fail");
  }
})();

// render loop + world.frame update
const clock = new THREE.Clock();
let elapsed = 0;

// rate-limit log spam
let frameErrCount = 0;
let lastFrameErrAt = 0;

renderer.setAnimationLoop(()=>{
  const dt = clock.getDelta();
  elapsed += dt;

  if (worldFrame && ctx){
    const ok = callWorldFrameSafely(worldFrame, ctx, dt, elapsed);
    if (!ok){
      const now = performance.now();
      frameErrCount++;
      // only log at most once per second
      if (now - lastFrameErrAt > 1000){
        lastFrameErrAt = now;
        console.warn(`[index] world.frame failed (${frameErrCount}x). Check HybridWorld.frame signature.`);
      }
    }
  }

  renderer.render(scene, camera);
});

L("[index] animation loop running ✅","ok");
