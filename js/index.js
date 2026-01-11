// /js/index.js — Scarlett FULL Runtime + Diagnostics + Full VR Panel Support
// ✅ All JS in /js
// ✅ Loud logs to HUD + console
// ✅ SAFE MODE fallback
// ✅ Dump button
// ✅ Diagnostics button runs pings (handled by boot.js) but index also reports runtime state
// ✅ Android dual-stick walk + look (non-XR); walk works in XR too
// ✅ Works with FULL VRButton panel (ENTER VR / DIRECT / END / RECHECK)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js";

const now = () => new Date().toTimeString().slice(0, 8);
const BUILD = "FULL-DIAG 4.9.2 (Full VR Panel + Safe Mode)";

const perfEl = document.getElementById("perf");
const xrEl = document.getElementById("xrstat");
const modeEl = document.getElementById("modestat");

const safeModeEl = document.getElementById("safeMode");
const dumpBtn = document.getElementById("dumpBtn");
const diagBtn = document.getElementById("diagBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");

function log(msg) {
  console.log(msg);
  const el = document.getElementById("log");
  if (!el) return;
  el.textContent += (el.textContent ? "\n" : "") + msg;
  el.scrollTop = el.scrollHeight;
}
window.__scarlettLog = log; // <— VRButton writes into HUD

function tag(t, m) { log(`[${now()}] [${t}] ${m}`); }
function safe(t, fn) {
  try { return fn(); }
  catch (e) {
    console.error(e);
    tag(t, `ERROR ❌ ${e?.message || e}`);
    return null;
  }
}

// Global error capture (extra insurance)
window.addEventListener("error", (e) => {
  tag("GLOBAL", `error ❌ ${e.message}`);
  if (e.filename) tag("GLOBAL", `at ${e.filename}:${e.lineno}:${e.colno}`);
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = e?.reason?.message || String(e?.reason || "unknown");
  tag("GLOBAL", `unhandledrejection ❌ ${msg}`);
});

tag("index", `runtime start ✅ (${BUILD})`);
tag("index", `THREE.REVISION=${THREE.REVISION}`);

// HUD helpers
function setXRText() {
  if (!xrEl) return;
  xrEl.textContent = `XR: ${navigator.xr ? "supported" : "not found"}`;
}
function setModeText(text) {
  if (!modeEl) return;
  modeEl.textContent = text;
}
setXRText();
setModeText("Mode: running");

// Buttons (HUD)
copyBtn?.addEventListener("click", async () => {
  try {
    const el = document.getElementById("log");
    await navigator.clipboard.writeText(el?.textContent || "");
    tag("HUD", "copied ✅");
  } catch (e) {
    tag("HUD", `copy failed ❌ ${e?.message || e}`);
  }
});

clearBtn?.addEventListener("click", () => {
  const el = document.getElementById("log");
  if (el) el.textContent = "";
  tag("HUD", "cleared ✅");
});

diagBtn?.addEventListener("click", () => {
  // boot.js handles fetch pings; here we just print runtime snapshot.
  tag("DIAG", "runtime snapshot:");
  tag("DIAG", `href=${location.href}`);
  tag("DIAG", `secureContext=${window.isSecureContext}`);
  tag("DIAG", `ua=${navigator.userAgent}`);
  tag("DIAG", `xrPresenting=${renderer?.xr?.isPresenting ?? false}`);
  tag("DIAG", `player=(${player?.position?.x?.toFixed?.(2)},${player?.position?.y?.toFixed?.(2)},${player?.position?.z?.toFixed?.(2)})`);
});

// -------------------- THREE CORE --------------------
const renderer = safe("gl", () => {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  r.setSize(innerWidth, innerHeight);
  r.xr.enabled = true;
  document.body.appendChild(r.domElement);
  return r;
});

safe("gl", () => {
  const gl = renderer.getContext();
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
  const rend = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  tag("gl", `vendor=${vendor}`);
  tag("gl", `renderer=${rend}`);
  tag("gl", `maxTextureSize=${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`);
});

// scene/camera/player
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 900);
camera.position.set(0, 1.6, 6);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
player.position.set(0, 0, 0);
scene.add(player);

// lights
safe("lights", () => {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 0.9));
  const d = new THREE.DirectionalLight(0xffffff, 0.85);
  d.position.set(6, 12, 4);
  scene.add(d);
  tag("lights", "installed ✅");
});

// controllers + laser-only (visual)
const controllers = [];
safe("input", () => {
  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    c.name = `controller_${i}`;
    player.add(c);
    controllers.push(c);

    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fe7ff }));
    line.scale.z = 10;
    c.add(line);
  }
  tag("input", "controller rays installed ✅ (laser only)");
});

// FULL VR panel (replaces basic button; returns a panel div)
safe("vr", () => {
  const vrUI = VRButton.createButton(renderer);
  document.body.appendChild(vrUI);
  tag("vr", "FULL VR panel appended ✅");
});

// XR session presence logs
safe("xr", () => {
  renderer.xr.addEventListener("sessionstart", () => {
    tag("XR", "sessionstart ✅");
    setModeText("Mode: XR");
  });
  renderer.xr.addEventListener("sessionend", () => {
    tag("XR", "sessionend ✅");
    setModeText("Mode: running");
  });
});

// -------------------- ANDROID DUAL-STICK --------------------
const touch = {
  left: { id: null, x: 0, y: 0, active: false },
  right: { id: null, x: 0, y: 0, active: false },
};

function bindStick(el, key) {
  const s = touch[key];
  const rect = () => el.getBoundingClientRect();

  const setFrom = (cx, cy) => {
    const r = rect();
    const nx = (cx - (r.left + r.width * 0.5)) / (r.width * 0.5);
    const ny = (cy - (r.top + r.height * 0.5)) / (r.height * 0.5);
    s.x = Math.max(-1, Math.min(1, nx));
    s.y = Math.max(-1, Math.min(1, ny));
  };

  el.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      s.id = t.identifier;
      s.active = true;
      setFrom(t.clientX, t.clientY);
      e.preventDefault();
    },
    { passive: false }
  );

  el.addEventListener(
    "touchmove",
    (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === s.id) {
          setFrom(t.clientX, t.clientY);
          break;
        }
      }
      e.preventDefault();
    },
    { passive: false }
  );

  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === s.id) {
        s.id = null;
        s.active = false;
        s.x = 0;
        s.y = 0;
        break;
      }
    }
    e.preventDefault();
  };

  el.addEventListener("touchend", end, { passive: false });
  el.addEventListener("touchcancel", end, { passive: false });
}

safe("android", () => {
  const L = document.getElementById("stickL");
  const R = document.getElementById("stickR");
  if (L && R) {
    bindStick(L, "left");
    bindStick(R, "right");
    tag("android", "dual-stick ready ✅");
  } else {
    tag("android", "dual-stick missing");
  }
});

// -------------------- WORLD + SAFE MODE --------------------
const world = { group: new THREE.Group() };
world.group.name = "WorldRoot";
scene.add(world.group);

function buildFallbackWorld() {
  while (world.group.children.length) world.group.remove(world.group.children[0]);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x070a14 })
  );
  floor.name = "fallback_floor";
  world.group.add(floor);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0x14224a, roughness: 0.7, metalness: 0.1 })
  );
  box.position.set(0, 1, 0);
  box.name = "fallback_box";
  world.group.add(box);

  player.position.set(0, 0, 6);
  tag("fallback", "built ✅ (SAFE MODE)");
}

function buildWorld() {
  const safeMode = !!safeModeEl?.checked;
  while (world.group.children.length) world.group.remove(world.group.children[0]);

  if (safeMode) {
    buildFallbackWorld();
    return;
  }

  tag("world", "calling World.build() …");
  const ok = safe("world", () =>
    World.build({
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      world,
      tag,
      BUILD,
    })
  );

  if (ok === null) {
    tag("world", "World.build failed -> switching to SAFE MODE fallback");
    if (safeModeEl) safeModeEl.checked = true;
    buildFallbackWorld();
  } else {
    tag("world", "build complete ✅");
  }
}

buildWorld();
safeModeEl?.addEventListener("change", () => buildWorld());

// Dump scene
dumpBtn?.addEventListener("click", () => {
  let count = 0;
  const lines = [];
  scene.traverse((o) => {
    count++;
    lines.push(`${o.type}${o.name ? ` "${o.name}"` : ""}`);
  });
  tag("dump", `scene objects=${count}`);
  lines.slice(0, 220).forEach((l) => log(`[tree] ${l}`));
  if (count > 220) tag("dump", "tree truncated (showing 220)");
});

// World bounds helper for diagnostics
function logWorldBounds() {
  try {
    const box = new THREE.Box3().setFromObject(world.group);
    const size = new THREE.Vector3();
    const ctr = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(ctr);
    tag("diag", `world bounds size=(${size.x.toFixed(2)},${size.y.toFixed(2)},${size.z.toFixed(2)})`);
    tag("diag", `world bounds center=(${ctr.x.toFixed(2)},${ctr.y.toFixed(2)},${ctr.z.toFixed(2)})`);
  } catch (e) {
    tag("diag", `world bounds failed ❌ ${e?.message || e}`);
  }
}
diagBtn?.addEventListener("click", logWorldBounds);

// -------------------- RESIZE --------------------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  tag("gl", `resize -> ${innerWidth}x${innerHeight}`);
});

// -------------------- LOOP: PERF + WALK/LOOK --------------------
let lastT = performance.now();
let frameCount = 0;
let accTime = 0;

const tmpQ = new THREE.Quaternion();
const eul = new THREE.Euler(0, 0, 0, "YXZ");
const tmpV = new THREE.Vector3();

function yawFromCamera() {
  camera.getWorldQuaternion(tmpQ);
  eul.setFromQuaternion(tmpQ);
  return eul.y;
}

renderer.setAnimationLoop(() => {
  const t = performance.now();
  const dt = Math.min(0.033, (t - lastT) / 1000);
  lastT = t;

  // perf counter
  frameCount++;
  accTime += dt;
  if (accTime >= 1.0) {
    const fps = frameCount / accTime;
    if (perfEl) perfEl.textContent = `Perf: ${fps.toFixed(0)} fps`;
    frameCount = 0;
    accTime = 0;
  }

  // stick input
  const moveX = touch.left.x;
  const moveZ = -touch.left.y;
  const lookX = touch.right.x;
  const lookY = touch.right.y;

  // look only when not in XR
  if (!renderer.xr.isPresenting) {
    camera.getWorldQuaternion(tmpQ);
    eul.setFromQuaternion(tmpQ);
    eul.y -= lookX * 1.8 * dt;
    eul.x = THREE.MathUtils.clamp(eul.x - lookY * 1.2 * dt, -1.2, 1.2);
    eul.z = 0;
    camera.quaternion.setFromEuler(eul);
  }

  // walk
  const yaw = yawFromCamera();
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const rgt = new THREE.Vector3(fwd.z, 0, -fwd.x);

  tmpV.set(0, 0, 0);
  tmpV.addScaledVector(fwd, moveZ);
  tmpV.addScaledVector(rgt, moveX);

  if (tmpV.lengthSq() > 1e-6) tmpV.normalize().multiplyScalar(3.0 * dt);

  player.position.add(tmpV);
  player.position.y = 0;

  safe("world", () => World.update?.({ dt, time: t / 1000 }));

  renderer.render(scene, camera);
});

tag("index", "ready ✅");
