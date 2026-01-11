// /js/index.js — MASTER Runtime + GUARANTEED ENTER VR

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

// ---------- VR UI (force visible) ----------
function ensureVROverlay() {
  let host = document.getElementById("vrSlot");
  if (!host) {
    host = document.createElement("div");
    host.id = "vrSlot";
    document.body.appendChild(host);
  }

  // FORCE it visible and clickable
  Object.assign(host.style, {
    position: "fixed",
    left: "0",
    right: "0",
    bottom: "18px",
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    zIndex: "99999",
    pointerEvents: "auto"
  });

  // Create a manual Enter VR button (always)
  let manual = document.getElementById("btnEnterVR");
  if (!manual) {
    manual = document.createElement("button");
    manual.id = "btnEnterVR";
    manual.textContent = "ENTER VR";
    Object.assign(manual.style, {
      fontSize: "16px",
      padding: "12px 18px",
      borderRadius: "14px",
      border: "1px solid rgba(127,231,255,.35)",
      background: "rgba(0,0,0,.55)",
      color: "#7fe7ff",
      boxShadow: "0 12px 40px rgba(0,0,0,.45)",
      cursor: "pointer"
    });
    host.appendChild(manual);
  }

  manual.onclick = async () => {
    try {
      L("[vr] manual ENTER VR pressed");
      if (!navigator.xr) throw new Error("navigator.xr missing");

      const ok = await navigator.xr.isSessionSupported?.("immersive-vr");
      if (!ok) throw new Error("immersive-vr not supported");

      // Request session directly (Quest will prompt)
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: [
          "local-floor",
          "bounded-floor",
          "local",
          "viewer",
          "hand-tracking",
          "layers",
          "dom-overlay"
        ],
        domOverlay: { root: document.body }
      });

      await renderer.xr.setSession(session);
      L("[vr] session started ✅", "ok");
    } catch (e) {
      L("[vr] manual ENTER VR failed ❌", "bad");
      L(String(e?.stack || e), "muted");
      alert("ENTER VR failed: " + (e?.message || e));
    }
  };

  return host;
}

const vrHost = ensureVROverlay();

// Add standard VRButton too (fallback)
try {
  const b = VRButton.createButton(renderer);

  // Make VRButton visible no matter what
  Object.assign(b.style, {
    fontSize: "16px",
    padding: "12px 18px",
    borderRadius: "14px",
    marginLeft: "10px",
    opacity: "1",
    pointerEvents: "auto"
  });

  vrHost.appendChild(b);
  L("[index] VRButton appended ✅", "ok");
} catch (e) {
  L("[index] VRButton failed: " + (e?.message || e), "warn");
}

// Log XR session starts/ends
renderer.xr.addEventListener("sessionstart", () => L("[vr] renderer sessionstart ✅", "ok"));
renderer.xr.addEventListener("sessionend", () => L("[vr] renderer sessionend", "warn"));

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- World ----------
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
  try { frameFn(ctx, dt, t); return true; } catch {}
  try { frameFn(ctx); return true; } catch {}
  try { frameFn(dt); return true; } catch {}
  try { frameFn(t, dt); return true; } catch {}
  try { frameFn(ctx.renderer, ctx.scene, ctx.camera, dt, t); return true; } catch {}
  return false;
}

(async ()=>{
  try{
    setMode("loading world");
    await loadWorld();

    ctx = { THREE, scene, renderer, camera, player, controllers, log: console.log, BUILD: Date.now() };

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

// ---------- Render loop ----------
const clock = new THREE.Clock();
let elapsed = 0;
let lastFrameWarn = 0;

renderer.setAnimationLoop(()=>{
  const dt = clock.getDelta();
  elapsed += dt;

  if (worldFrame && ctx){
    const ok = callWorldFrameSafely(worldFrame, ctx, dt, elapsed);
    if (!ok){
      const now = performance.now();
      if (now - lastFrameWarn > 1200){
        lastFrameWarn = now;
        console.warn("[index] world.frame signature mismatch (still running)");
      }
    }
  }

  renderer.render(scene, camera);
});

L("[index] animation loop running ✅","ok");
