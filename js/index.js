// /js/index.js — ScarlettVR Prime Entry (FULL) v14.0
// ✅ Uses ONLY core controls: /js/core/controls.js
// ✅ Does NOT import /js/controls.js (you deleted it — correct)
// ✅ VRButton + Manual ENTER VR fallback
// ✅ Wires HUD buttons (ROOM_SET / UNSTUCK / DEBUG_DUMP) via Signals
// ✅ Runs World.tick() + Controls.update() every frame
// ✅ Loud diagnostics in BOOT log + console

const BUILD = "INDEX_FULL_v14_0";
const stamp = Date.now();

const log = (...a) => console.log("[index]", ...a);
const warn = (...a) => console.warn("[index]", ...a);
const err = (...a) => console.error("[index]", ...a);

function $(id) { return document.getElementById(id); }
function on(id, ev, fn) { const el = $(id); if (el) el.addEventListener(ev, fn); }
function bootAppend(line) {
  const el = document.getElementById("bootLog");
  if (el) el.textContent += "\n" + line;
  console.log(line);
}
function bootStatus(txt) {
  const el = document.getElementById("bootStatus");
  if (el) el.textContent = txt;
}

function detectBase() {
  const p = location.pathname || "/";
  return p.includes("/scarlett-poker-vr/") ? "/scarlett-poker-vr/" : "/";
}
const base = detectBase();

bootAppend(`[index] runtime start ✅ build=${BUILD}`);
bootAppend(`[env] href=${location.href}`);
bootAppend(`[env] secureContext=${!!window.isSecureContext}`);
bootAppend(`[env] ua=${navigator.userAgent}`);
bootAppend(`[env] base=${base}`);

async function safeImport(rel, label) {
  const url = `${base}js/${rel}?v=${stamp}`;
  bootAppend(`[import] ${label} -> ${url}`);
  try {
    const mod = await import(url);
    bootAppend(`[import] ${label} ✅`);
    return mod;
  } catch (e) {
    bootAppend(`[import] ${label} ❌ ${e?.message || e}`);
    warn("import failed:", label, e);
    return null;
  }
}

async function loadThree() {
  // Prefer local wrapper if present
  const local = await safeImport("three.js", "three(local)");
  if (local) {
    const THREE = local.THREE || local.default || local;
    if (THREE?.Scene) return THREE;
  }
  // CDN fallback
  bootAppend("[three] local missing; using CDN ✅");
  try {
    const THREE = await import("https://unpkg.com/three@0.160.0/build/three.module.js");
    bootAppend("[three] CDN loaded ✅");
    return THREE;
  } catch (e) {
    bootAppend(`[three] CDN failed ❌ ${e?.message || e}`);
    return null;
  }
}

async function loadVRButton() {
  const local = await safeImport("VRButton.js", "VRButton(local)");
  if (local?.VRButton?.createButton) return local.VRButton;

  bootAppend("[VRButton] local missing; using CDN ✅");
  try {
    const mod = await import("https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js");
    return mod?.VRButton || null;
  } catch (e) {
    bootAppend(`[VRButton] CDN failed ❌ ${e?.message || e}`);
    return null;
  }
}

function ensureCanvasHost() {
  let wrap = document.getElementById("canvasWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "canvasWrap";
    wrap.style.position = "fixed";
    wrap.style.inset = "0";
    document.body.appendChild(wrap);
  }
  return wrap;
}

function makeRenderer(THREE) {
  const wrap = ensureCanvasHost();
  wrap.innerHTML = "";
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  wrap.appendChild(renderer.domElement);
  return renderer;
}

function makeRig(THREE) {
  const player = new THREE.Group();
  player.name = "PlayerRig";

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 600);
  camera.position.set(0, 1.65, 0);
  player.add(camera);

  return { player, camera };
}

function wireHud({ renderer, Signals, player }) {
  // Hide HUD button (index.html may implement its own; safe here too)
  on("btnHud", "click", () => {
    const hud = document.getElementById("hud") || document.getElementById("ui");
    if (!hud) return;
    const next = hud.style.display === "none" ? "block" : "none";
    hud.style.display = next;
    bootAppend(`[hud] display=${next}`);
  });

  // Manual ENTER VR fallback (works even if VRButton fails)
  on("btnEnterVR", "click", async () => {
    try {
      if (!navigator.xr) return bootAppend("[VR] navigator.xr missing ❌");
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      if (!ok) return bootAppend("[VR] immersive-vr not supported ❌");

      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: [
          "local-floor","bounded-floor","local","viewer",
          "hand-tracking","layers","dom-overlay",
          "hit-test","anchors"
        ],
        domOverlay: { root: document.body }
      });

      await renderer.xr.setSession(session);
      bootAppend("[VR] session started ✅");
    } catch (e) {
      bootAppend(`[VR] session FAILED ❌ ${e?.message || e}`);
    }
  });

  // World navigation buttons -> Signals
  const emitRoom = (room) => Signals?.emit?.("ROOM_SET", { room });
  on("btnSpawn", "click", () => emitRoom("spawn"));
  on("btnLobby", "click", () => emitRoom("lobby"));
  on("btnPoker", "click", () => emitRoom("poker"));
  on("btnStore", "click", () => emitRoom("store"));
  on("btnScorpion", "click", () => emitRoom("scorpion"));
  on("btnSpectate", "click", () => emitRoom("spectate"));

  on("btnUnstuck", "click", () => {
    // Prefer world handler if present
    Signals?.emit?.("UNSTUCK", {});
    // Fallback nudge to escape being spawned inside geometry
    player.position.y = Math.max(0, player.position.y);
    player.position.z += 0.65;
    bootAppend("[rm] UNSTUCK ✅");
  });

  on("btnHealthcheck", "click", () => Signals?.emit?.("DEBUG_DUMP", {}));

  // Resize
  window.addEventListener("resize", () => {
    const cam = renderer.__scarlett_camera;
    if (cam) {
      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

(async function main() {
  try {
    bootStatus("Loading THREE…");

    const THREE = await loadThree();
    if (!THREE) {
      bootStatus("THREE failed ❌");
      return;
    }

    bootStatus("Creating renderer…");
    const renderer = makeRenderer(THREE);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);

    const { player, camera } = makeRig(THREE);
    renderer.__scarlett_camera = camera;
    scene.add(player);

    // baseline light so you always see something
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223355, 0.9);
    hemi.position.set(0, 10, 0);
    scene.add(hemi);

    // VRButton
    bootStatus("Installing VRButton…");
    const VRButton = await loadVRButton();
    if (VRButton?.createButton) {
      try {
        const btn = VRButton.createButton(renderer);
        btn.style.position = "fixed";
        btn.style.left = "12px";
        btn.style.bottom = "12px";
        btn.style.zIndex = "9999";
        document.body.appendChild(btn);
        bootAppend("[index] VRButton appended ✅");
      } catch (e) {
        bootAppend(`[index] VRButton append FAILED ❌ ${e?.message || e}`);
      }
    } else {
      bootAppend("[index] VRButton missing (manual ENTER VR works) ✅");
    }

    // Core signals + debug hud (optional but recommended)
    bootStatus("Loading core…");
    const signalsMod = await safeImport("core/signals.js", "core/signals");
    const debugMod   = await safeImport("core/debug_hud.js", "core/debug_hud");

    const Signals = signalsMod?.Signals || signalsMod?.default || signalsMod || null;
    const DebugHUD = debugMod?.DebugHUD || debugMod?.default || debugMod || null;

    // If DebugHUD exists and supports log, mirror boot logs there too
    const coreLog = (m) => { try { DebugHUD?.log?.(m); } catch {} log(m); };

    // Controls (CORE ONLY)
    bootStatus("Loading core controls…");
    const controlsMod = await safeImport("core/controls.js", "core/controls");
    const Controls = controlsMod?.Controls || controlsMod?.default || controlsMod;
    if (!Controls?.init) {
      bootAppend("[core/controls] invalid export ❌ (expected export const Controls = …)");
      bootStatus("Controls export invalid ❌");
      return;
    }
    Controls.init({ THREE, renderer, camera, player, scene, Signals, log: coreLog });

    // World
    bootStatus("Loading world…");
    const worldMod = await safeImport("world.js", "world");
    const World = worldMod?.World || worldMod?.default || worldMod;
    if (!World?.init) {
      bootAppend("[world] invalid export ❌ (expected export const World = { init(){} })");
      bootStatus("World export invalid ❌");
      return;
    }

    const worldApi = await World.init({ THREE, scene, renderer, camera, player, Signals, log: coreLog, BUILD });
    bootAppend("[world] init ✅");

    // HUD wiring (buttons -> signals)
    wireHud({ renderer, Signals, player });

    // Global error hooks
    window.addEventListener("error", (e) => bootAppend(`[ERR] ${e?.message || e}`));
    window.addEventListener("unhandledrejection", (e) => bootAppend(`[PROMISE ERR] ${e?.reason?.message || e?.reason || e}`));

    bootStatus("Running ✅");

    // Loop
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      try {
        Controls.update(dt);

        // Prefer tick(dt,t) style, but allow update(dt,t) too
        if (worldApi?.tick) worldApi.tick(dt, now / 1000);
        else if (worldApi?.update) worldApi.update(dt, now / 1000);

        // HUD live
        if (DebugHUD?.setXR) DebugHUD.setXR(renderer.xr.isPresenting ? "XR:on" : "XR:off");
        if (DebugHUD?.setPos) DebugHUD.setPos(`x:${player.position.x.toFixed(2)} y:${player.position.y.toFixed(2)} z:${player.position.z.toFixed(2)}`);

        const hudStatus = document.getElementById("hudStatus");
        if (hudStatus) {
          const pad = Controls.getPadDebug?.() || "";
          const btns = Controls.getButtonDebug?.() || "";
          hudStatus.textContent =
            `XR:${renderer.xr.isPresenting ? "on" : "off"}  ` +
            `pos x:${player.position.x.toFixed(2)} y:${player.position.y.toFixed(2)} z:${player.position.z.toFixed(2)}\n` +
            `${pad}\n${btns}`;
        }

        renderer.render(scene, camera);
      } catch (e) {
        err("loop error", e);
        bootAppend(`[loop] error ❌ ${e?.message || e}`);
        bootStatus("Runtime error ❌");
        renderer.setAnimationLoop(null);
      }
    });

    bootAppend("[index] setAnimationLoop ✅");
  } catch (e) {
    err("fatal", e);
    bootAppend(`[fatal] ${e?.message || e}`);
    bootStatus("Fatal ❌");
  }
})();
