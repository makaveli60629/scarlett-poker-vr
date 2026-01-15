// /js/boot2.js — Scarlett BOOT2 v2.4 HUD+XR DEBUG (FULL)
// Goals:
// ✅ Always-visible HUD logger (never blank)
// ✅ Manual Enter VR button (requests local-floor + hand-tracking)
// ✅ Calls CONTROLS.update(dt) + WORLD.update(dt) every frame
// ✅ Prints XR session state + inputSources count so we can see why controllers/hands aren't present

const BUILD = "BOOT2_v2_4_HUD_XRDBG";

const nowTs = () => new Date().toLocaleTimeString();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function createHUD() {
  const root = document.createElement("div");
  root.id = "scarlett-hud";
  root.style.position = "fixed";
  root.style.left = "0";
  root.style.top = "0";
  root.style.width = "100%";
  root.style.maxHeight = "45%";
  root.style.overflow = "auto";
  root.style.background = "rgba(0,0,0,0.70)";
  root.style.color = "#8CFF8C";
  root.style.fontFamily = "monospace";
  root.style.fontSize = "12px";
  root.style.zIndex = "99999";
  root.style.pointerEvents = "auto";
  root.style.padding = "8px";
  root.style.boxSizing = "border-box";

  const bar = document.createElement("div");
  bar.style.display = "flex";
  bar.style.gap = "8px";
  bar.style.alignItems = "center";
  bar.style.flexWrap = "wrap";
  bar.style.marginBottom = "6px";

  const title = document.createElement("div");
  title.textContent = `Scarlett HUD • ${BUILD}`;
  title.style.fontWeight = "bold";
  title.style.marginRight = "8px";

  const btn = (label) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.background = "rgba(255,255,255,0.12)";
    b.style.border = "1px solid rgba(255,255,255,0.25)";
    b.style.color = "#fff";
    b.style.borderRadius = "8px";
    b.style.padding = "6px 10px";
    b.style.cursor = "pointer";
    return b;
  };

  const hideBtn = btn("Hide HUD");
  const showBtn = btn("Show HUD");
  showBtn.style.display = "none";

  const copyBtn = btn("Copy Logs");
  const clearBtn = btn("Clear");

  bar.appendChild(title);
  bar.appendChild(hideBtn);
  bar.appendChild(showBtn);
  bar.appendChild(copyBtn);
  bar.appendChild(clearBtn);

  const pre = document.createElement("pre");
  pre.style.margin = "0";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.wordBreak = "break-word";

  root.appendChild(bar);
  root.appendChild(pre);
  document.body.appendChild(root);

  const lines = [];
  const pushLine = (s) => {
    lines.push(s);
    while (lines.length > 400) lines.shift();
    pre.textContent = lines.join("\n");
    root.scrollTop = root.scrollHeight;
  };

  hideBtn.onclick = () => {
    pre.style.display = "none";
    copyBtn.style.display = "none";
    clearBtn.style.display = "none";
    hideBtn.style.display = "none";
    showBtn.style.display = "inline-block";
    root.style.maxHeight = "unset";
    root.style.height = "auto";
  };

  showBtn.onclick = () => {
    pre.style.display = "block";
    copyBtn.style.display = "inline-block";
    clearBtn.style.display = "inline-block";
    hideBtn.style.display = "inline-block";
    showBtn.style.display = "none";
    root.style.maxHeight = "45%";
  };

  clearBtn.onclick = () => {
    lines.length = 0;
    pre.textContent = "";
  };

  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      pushLine(`[${nowTs()}] HUD: copied ✅`);
    } catch (e) {
      pushLine(`[${nowTs()}] HUD: copy failed ❌ ${e?.message || e}`);
    }
  };

  return {
    log: (...a) => pushLine(`[${nowTs()}] ${a.join(" ")}`),
    err: (...a) => pushLine(`[${nowTs()}] ERROR: ${a.join(" ")}`),
    pushLine
  };
}

function diagBasics(hud) {
  const href = location.href;
  const path = location.pathname;
  const base = `/${path.split("/").filter(Boolean)[0] || ""}/`.replace("//", "/");
  hud.log("diag start ✅");
  hud.log("build=", BUILD);
  hud.log("href=", href);
  hud.log("path=", path);
  hud.log("base=", base);
  hud.log("secureContext=", String(window.isSecureContext));
  hud.log("ua=", navigator.userAgent);
  hud.log("navigator.xr=", String(!!navigator.xr));
  return { base };
}

async function safeImport(hud, url, label) {
  hud.log("[boot2] import", url);
  try {
    const mod = await import(url);
    hud.log("[boot2] ok ✅", label || url);
    return mod;
  } catch (e) {
    hud.err("[boot2] import FAILED ❌", label || url, e?.message || e);
    throw e;
  }
}

function ensureHost() {
  let host = document.getElementById("app");
  if (!host) {
    host = document.createElement("div");
    host.id = "app";
    host.style.position = "fixed";
    host.style.left = "0";
    host.style.top = "0";
    host.style.width = "100%";
    host.style.height = "100%";
    host.style.margin = "0";
    host.style.padding = "0";
    host.style.overflow = "hidden";
    document.body.appendChild(host);
  }
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";
  return host;
}

function makeManualEnterVRButton(hud, renderer) {
  const b = document.createElement("button");
  b.textContent = "Enter VR (Manual)";
  b.style.position = "fixed";
  b.style.right = "10px";
  b.style.bottom = "10px";
  b.style.zIndex = "100000";
  b.style.background = "rgba(0,0,0,0.65)";
  b.style.border = "1px solid rgba(255,255,255,0.25)";
  b.style.color = "#fff";
  b.style.borderRadius = "10px";
  b.style.padding = "10px 14px";
  b.style.cursor = "pointer";
  b.style.pointerEvents = "auto";
  document.body.appendChild(b);

  b.onclick = async () => {
    try {
      if (!navigator.xr) throw new Error("navigator.xr missing");
      const supported = await navigator.xr.isSessionSupported("immersive-vr");
      hud.log("XR supported immersive-vr=", String(supported));
      if (!supported) return;

      const sessionInit = {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
        requiredFeatures: []
      };

      hud.log("requestSession immersive-vr…");
      const session = await navigator.xr.requestSession("immersive-vr", sessionInit);
      hud.log("requestSession ✅");
      await renderer.xr.setSession(session);
      hud.log("renderer.xr.setSession ✅");
    } catch (e) {
      hud.err("Manual Enter VR failed ❌", e?.message || e);
    }
  };

  return b;
}

(async function main() {
  const hud = createHUD();
  const { base } = diagBasics(hud);
  const host = ensureHost();

  // Mirror console into HUD so it is NEVER blank
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a) => { origLog(...a); try { hud.log(...a.map(String)); } catch {} };
  console.error = (...a) => { origErr(...a); try { hud.err(...a.map(String)); } catch {} };

  // 1) Imports
  const THREE = await safeImport(hud, `https://unpkg.com/three@0.158.0/build/three.module.js?v=${Date.now()}`, "three");
  hud.log("three import ✅ r158");

  const VRButtonMod = await safeImport(hud, `https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js?v=${Date.now()}`, "VRButton");
  const XRHandMod = await safeImport(hud, `https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js?v=${Date.now()}`, "XRHandModelFactory");
  const { VRButton } = VRButtonMod;
  const { XRHandModelFactory } = XRHandMod;

  // 2) Scene setup
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local-floor");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.6, 10);

  const playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  playerRig.position.set(0, 0, 10);
  playerRig.add(camera);
  scene.add(playerRig);

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // 3) VR buttons
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    hud.log("VRButton appended ✅");
  } catch (e) {
    hud.err("VRButton append failed ❌", e?.message || e);
  }
  makeManualEnterVRButton(hud, renderer);

  // 4) XR session diagnostics
  renderer.xr.addEventListener("sessionstart", () => hud.log("XR sessionstart ✅"));
  renderer.xr.addEventListener("sessionend", () => hud.log("XR sessionend ✅"));

  // 5) Load world
  let WORLD = null;
  {
    const worldUrl = `${base}js/scarlett1/world.js?v=${Date.now()}`;
    hud.log("world url=", worldUrl);
    const worldMod = await safeImport(hud, worldUrl, "world.js");
    const initWorld = worldMod.initWorld || worldMod.default?.initWorld;
    if (!initWorld) throw new Error("BOOT ERROR: world.js missing export initWorld()");
    hud.log("importing world…");
    WORLD = await initWorld({
      THREE,
      scene,
      renderer,
      camera,
      playerRig,
      log: (...a) => console.log("[world]", ...a),
      quality: "quest"
    });
    hud.log("initWorld() completed ✅");
    hud.log("pads=", String(WORLD?.pads?.length || 0), "teleportSurfaces=", String(WORLD?.teleportSurfaces?.length || 0));
  }

  // 6) Attach XR hands (visual models)
  try {
    const factory = new XRHandModelFactory();
    for (let i = 0; i < 2; i++) {
      const hand = renderer.xr.getHand(i);
      hand.name = `XR_Hand_${i}`;
      scene.add(hand);
      const model = factory.createHandModel(hand, "mesh");
      hand.add(model);
    }
    hud.log("XR hand models attached ✅");
  } catch (e) {
    hud.err("XR hand models attach failed ❌", e?.message || e);
  }

  // 7) Load & init controls (CRITICAL)
  let CONTROLS = null;
  {
    const controlsUrl = `${base}js/core/controls.js?v=${Date.now()}`;
    const controlsMod = await safeImport(hud, controlsUrl, "controls.js");
    const initFn =
      controlsMod.initControls ||
      controlsMod.init ||
      controlsMod.default?.initControls ||
      controlsMod.default?.init ||
      null;

    if (!initFn) throw new Error("BOOT ERROR: controls.js missing initControls/init export");

    CONTROLS = await initFn({
      THREE,
      renderer,
      scene,
      camera,
      playerRig,
      world: WORLD,
      log: (...a) => console.log("[controls]", ...a),
      options: { moveSpeed: 2.6, lookSpeed: 2.0, xrSnapDeg: 30 }
    });

    hud.log("controls init ✅ hasUpdate=", String(!!CONTROLS?.update));
  }

  // 8) Frame loop + XR inputSources debug
  hud.log("render loop start ✅");
  let lastT = performance.now();
  let debugAccum = 0;

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = clamp((now - lastT) / 1000, 0, 0.05);
    lastT = now;

    if (CONTROLS?.update) CONTROLS.update(dt);
    if (WORLD?.update) WORLD.update(dt);

    // XR heartbeat debug every ~1.0s
    debugAccum += dt;
    if (debugAccum >= 1.0) {
      debugAccum = 0;
      const session = renderer.xr.getSession?.() || null;
      const sources = session?.inputSources?.length ?? 0;
      const hand0 = scene.getObjectByName("XR_Hand_0");
      const c0 = scene.getObjectByName("XR_Controller_0");
      hud.log("XR=", String(!!session), "inputSources=", String(sources), "hand0=", String(!!hand0), "ctrl0=", String(!!c0));
    }

    renderer.render(scene, camera);
  });

})().catch((e) => {
  console.error("BOOT FATAL ❌", e?.message || e);
});
