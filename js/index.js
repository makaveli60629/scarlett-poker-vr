// /js/index.js — BLACK SCREEN RESCUE (VR-safe)
// ✅ Guarantees light + visible debug room
// ✅ Creates simple controllers + rays if missing
// ✅ Keeps your HybridWorld build
// ✅ Adds "Reset View" button (2D + VR)

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

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 3000);
camera.position.set(0, 1.6, 3);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// --- FAILSAFE LIGHTING (so you never get black) ---
const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.0);
scene.add(hemi);

// "Headlamp" on camera
const headLamp = new THREE.PointLight(0xffffff, 2.5, 30);
headLamp.position.set(0, 0, 0);
camera.add(headLamp);

// --- FAILSAFE DEBUG ROOM (in case world is missing or you spawn wrong) ---
const debugRoot = new THREE.Group();
debugRoot.name = "DebugRoom";
scene.add(debugRoot);

const grid = new THREE.GridHelper(30, 30);
grid.position.y = 0;
debugRoot.add(grid);

const axes = new THREE.AxesHelper(2);
axes.position.set(0, 0.02, 0);
debugRoot.add(axes);

// Big faint floor disc under you (helps orientation)
const floorDisc = new THREE.Mesh(
  new THREE.CircleGeometry(6, 64),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1, metalness: 0 })
);
floorDisc.rotation.x = -Math.PI / 2;
floorDisc.position.y = -0.01;
debugRoot.add(floorDisc);

L("[index] renderer/camera/rig + failsafes ✅", "ok");

// --- VR UI slot (force visible) ---
function ensureVROverlay() {
  let host = document.getElementById("vrSlot");
  if (!host) {
    host = document.createElement("div");
    host.id = "vrSlot";
    document.body.appendChild(host);
  }
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
  return host;
}
const vrHost = ensureVROverlay();

// Standard VR button
try{
  const b = VRButton.createButton(renderer);
  Object.assign(b.style, {
    fontSize: "16px",
    padding: "12px 18px",
    borderRadius: "14px",
    opacity: "1",
    pointerEvents: "auto"
  });
  vrHost.appendChild(b);
  L("[index] VRButton appended ✅", "ok");
}catch(e){
  L("[index] VRButton failed: " + (e?.message || e), "warn");
}

// Reset button (works in 2D and VR)
const resetBtn = document.createElement("button");
resetBtn.textContent = "RESET VIEW";
Object.assign(resetBtn.style, {
  fontSize: "16px",
  padding: "12px 18px",
  borderRadius: "14px",
  border: "1px solid rgba(127,231,255,.35)",
  background: "rgba(0,0,0,.55)",
  color: "#7fe7ff",
  boxShadow: "0 12px 40px rgba(0,0,0,.45)",
  cursor: "pointer"
});
vrHost.appendChild(resetBtn);

function resetRig() {
  // Put player above the debug floor and centered
  player.position.set(0, 1.6, 3);
  player.rotation.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);
  L("[debug] RESET VIEW ✅", "ok");
}
resetBtn.onclick = resetRig;

// Helpful XR logs
renderer.xr.addEventListener("sessionstart", () => {
  L("[vr] sessionstart ✅", "ok");
  // lift slightly in VR to avoid being under floor
  player.position.y = Math.max(player.position.y, 1.6);
});
renderer.xr.addEventListener("sessionend", () => L("[vr] sessionend", "warn"));

window.addEventListener("resize", ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// --- CONTROLLERS FAILSAFE (simple lines so you see rays even if world doesn’t attach) ---
function makeControllerRay() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 8;
  return line;
}

const controllers = {
  left: renderer.xr.getController(0),
  right: renderer.xr.getController(1),
  lasers: []
};

controllers.left.name = "ControllerLeft";
controllers.right.name = "ControllerRight";
player.add(controllers.left);
player.add(controllers.right);

const lRay = makeControllerRay();
const rRay = makeControllerRay();
controllers.left.add(lRay);
controllers.right.add(rRay);
controllers.lasers.push(lRay, rRay);

L("[index] controller rays installed ✅", "ok");

// --- WORLD LOADER ---
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

// --- RENDER LOOP ---
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
