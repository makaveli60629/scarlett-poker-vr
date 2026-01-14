// /js/index.js — Scarlett Quest-Stable Entry (FULL) v13.0
// ✅ GitHub Pages project-base safe
// ✅ Quest safe: loud diagnostics, no silent hangs
// ✅ VRButton + Manual ENTER VR fallback
// ✅ Loads /js/world.js + /js/controls.js (optional)
// ✅ Fixes common spawn-inside-geometry with UNSTUCK
// ✅ Keeps HUD buttons working

const BUILD = "INDEX_FULL_v13_0";
const stamp = Date.now();

const log = (...a) => console.log("[index]", ...a);
const warn = (...a) => console.warn("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

function $(id) { return document.getElementById(id); }
function on(id, ev, fn) { const el = $(id); if (el) el.addEventListener(ev, fn); }

function detectBase() {
  // GitHub project pages: https://makaveli60629.github.io/scarlett-poker-vr/
  const p = location.pathname || "/";
  if (p.includes("/scarlett-poker-vr/")) return "/scarlett-poker-vr/";
  return "/";
}
const base = detectBase();

function setBootStatus(txt) {
  const el = document.getElementById("bootStatus");
  if (el) el.textContent = txt;
}
function appendBoot(txt) {
  const el = document.getElementById("bootLog");
  if (!el) return;
  el.textContent += "\n" + txt;
}

appendBoot(`[index] runtime start ✅ build=${BUILD}`);
appendBoot(`[env] href=${location.href}`);
appendBoot(`[env] secureContext=${!!window.isSecureContext}`);
appendBoot(`[env] ua=${navigator.userAgent}`);
appendBoot(`[env] base=${base}`);

setBootStatus("Starting three…");

// ------------------------------------------------------------
// SAFE IMPORT helper (never hard-crashes the whole app)
// ------------------------------------------------------------
async function safeImport(relPath, label) {
  const url = `${base}js/${relPath}?v=${stamp}`;
  try {
    appendBoot(`[import] ${label} -> ${url}`);
    const mod = await import(url);
    appendBoot(`[import] ${label} ✅`);
    return mod;
  } catch (e) {
    appendBoot(`[import] ${label} ❌ ${e?.message || e}`);
    warn(`Import failed: ${label}`, e);
    return null;
  }
}

// ------------------------------------------------------------
// Load THREE and VRButton from your repo first.
// If missing, fallback to CDN.
// ------------------------------------------------------------
async function loadThree() {
  // Try your local wrapper first: /js/three.js
  const local = await safeImport("three.js", "three(local wrapper)");
  if (local && (local.THREE || local.default || local)) {
    // your wrapper might export {THREE} or default
    const THREE = local.THREE || local.default || local;
    if (THREE?.Scene) return THREE;
  }

  // Fallback to CDN (works on GitHub Pages + Quest)
  appendBoot("[three] local missing; using CDN ✅");
  try {
    const THREE = await import(`https://unpkg.com/three@0.160.0/build/three.module.js`);
    appendBoot("[three] CDN loaded ✅");
    return THREE;
  } catch (e) {
    err("THREE CDN import failed", e);
    appendBoot(`[three] CDN failed ❌ ${e?.message || e}`);
    return null;
  }
}

async function loadVRButton(THREE) {
  // Try your local VRButton first
  const local = await safeImport("VRButton.js", "VRButton(local)");
  if (local?.VRButton) return local.VRButton;

  // Fallback to CDN example VRButton
  appendBoot("[VRButton] local missing; using CDN ✅");
  try {
    const mod = await import(`https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js`);
    appendBoot("[VRButton] CDN loaded ✅");
    return mod?.VRButton || null;
  } catch (e) {
    appendBoot(`[VRButton] CDN failed ❌ ${e?.message || e}`);
    return null;
  }
}

// ------------------------------------------------------------
// Minimal Scene Setup
// ------------------------------------------------------------
function ensureCanvasHost() {
  const wrap = document.getElementById("canvasWrap");
  if (!wrap) {
    const d = document.createElement("div");
    d.id = "canvasWrap";
    d.style.position = "fixed";
    d.style.inset = "0";
    document.body.appendChild(d);
    return d;
  }
  return wrap;
}

function createRenderer(THREE) {
  const wrap = ensureCanvasHost();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  wrap.innerHTML = "";
  wrap.appendChild(renderer.domElement);
  return renderer;
}

function createRig(THREE) {
  // PlayerRig holds camera + controller rays + locomotion transforms.
  const player = new THREE.Group();
  player.name = "PlayerRig";

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.position.set(0, 1.65, 0);
  player.add(camera);

  return { player, camera };
}

// ------------------------------------------------------------
// World + Controls wiring
// ------------------------------------------------------------
async function initWorldAndControls({ THREE, scene, renderer, camera, player }) {
  setBootStatus("Loading world…");

  // World
  const worldMod = await safeImport("world.js", "world");
  if (!worldMod) {
    appendBoot("[world] missing ❌ (world.js did not import)");
    setBootStatus("World import failed ❌");
    return { worldApi: null, controlsApi: null };
  }

  const World = worldMod.World || worldMod.default || worldMod;
  if (!World?.init) {
    appendBoot("[world] invalid export ❌ (expected export const World = { init(){} })");
    setBootStatus("World export invalid ❌");
    return { worldApi: null, controlsApi: null };
  }

  let worldApi = null;
  try {
    worldApi = await World.init({ THREE, scene, renderer, camera, player, log, BUILD });
    appendBoot("[world] init ✅");
  } catch (e) {
    appendBoot(`[world] init FAILED ❌ ${e?.message || e}`);
    err("World.init failed", e);
  }

  // Controls (optional)
  setBootStatus("Loading controls…");
  const controlsMod = await safeImport("controls.js", "controls");
  let controlsApi = null;
  if (controlsMod) {
    const Controls = controlsMod.Controls || controlsMod.default || controlsMod;
    if (Controls?.init) {
      try {
        controlsApi = await Controls.init({ THREE, scene, renderer, camera, player, log, BUILD, world: worldApi });
        appendBoot("[controls] init ✅");
      } catch (e) {
        appendBoot(`[controls] init FAILED ❌ ${e?.message || e}`);
        warn("Controls.init failed", e);
      }
    } else {
      appendBoot("[controls] missing init() (skipping)");
    }
  } else {
    appendBoot("[controls] not found (skipping) ✅");
  }

  setBootStatus("Ready ✅");
  return { worldApi, controlsApi };
}

// ------------------------------------------------------------
// Manual ENTER VR button fallback
// ------------------------------------------------------------
function wireHudButtons({ renderer }) {
  // HUD toggle
  on("btnHud", "click", () => {
    const hud = document.getElementById("hud");
    if (!hud) return;
    const next = hud.style.display === "none" ? "block" : "none";
    hud.style.display = next;
    appendBoot(`[hud] display=${next}`);
  });

  // Manual enter VR button (uses WebXR directly)
  on("btnEnterVR", "click", async () => {
    try {
      if (!navigator.xr) {
        appendBoot("[VR] navigator.xr missing ❌");
        return;
      }
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      if (!ok) {
        appendBoot("[VR] immersive-vr not supported ❌");
        return;
      }
      // This triggers the VR session via three renderer
      await renderer.xr.setSession(await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: [
          "local-floor","bounded-floor","local","viewer",
          "hand-tracking","layers","dom-overlay",
          "hit-test","anchors"
        ],
        domOverlay: { root: document.body }
      }));
      appendBoot("[VR] session started ✅");
    } catch (e) {
      appendBoot(`[VR] session FAILED ❌ ${e?.message || e}`);
    }
  });

  // Resize
  window.addEventListener("resize", () => {
    try {
      const cam = renderer.__scarlett_camera;
      if (cam) {
        cam.aspect = window.innerWidth / window.innerHeight;
        cam.updateProjectionMatrix();
      }
      renderer.setSize(window.innerWidth, window.innerHeight);
    } catch {}
  });
}

// ------------------------------------------------------------
// Main boot
// ------------------------------------------------------------
(async function main() {
  try {
    log("runtime start", BUILD);

    const THREE = await loadThree();
    if (!THREE) {
      setBootStatus("THREE failed ❌");
      appendBoot("[fatal] THREE not available");
      return;
    }

    const renderer = createRenderer(THREE);
    const scene = new THREE.Scene();
    scene.name = "SCENE";

    // basic background so you always see something
    scene.background = new THREE.Color(0x05070d);

    const { player, camera } = createRig(THREE);
    renderer.__scarlett_camera = camera;

    scene.add(player);

    // tiny default light (world usually adds real lights)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223355, 0.8);
    hemi.position.set(0, 10, 0);
    scene.add(hemi);

    // VRButton
    const VRButton = await loadVRButton(THREE);
    if (VRButton?.createButton) {
      try {
        document.body.appendChild(VRButton.createButton(renderer));
        appendBoot("[index] VRButton appended ✅");
      } catch (e) {
        appendBoot(`[index] VRButton append FAILED ❌ ${e?.message || e}`);
      }
    } else {
      appendBoot("[index] VRButton missing (manual ENTER VR still works) ✅");
    }

    wireHudButtons({ renderer });

    // Start the world + controls
    const { worldApi, controlsApi } = await initWorldAndControls({ THREE, scene, renderer, camera, player });

    // Helpful: UNSTUCK always available even if world lacks it
    on("btnUnstuck", "click", () => {
      // crude unstuck: lift + small forward
      player.position.y = 0;
      player.position.x += 0.0;
      player.position.z += 0.6;
      appendBoot("[rm] UNSTUCK ✅ (index fallback)");
    });

    // Animation loop
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      try {
        // tick modules
        worldApi?.tick?.(dt, now / 1000);
        controlsApi?.tick?.(dt, now / 1000);

        renderer.render(scene, camera);
      } catch (e) {
        err("tick/render error", e);
        appendBoot(`[loop] error ❌ ${e?.message || e}`);
        setBootStatus("Runtime error ❌");
        renderer.setAnimationLoop(null);
      }
    });

    appendBoot("[index] setAnimationLoop ✅");
    setBootStatus("Running ✅");
  } catch (e) {
    err("FATAL", e);
    appendBoot(`[fatal] ${e?.message || e}`);
    setBootStatus("Fatal ❌");
  }
})();
