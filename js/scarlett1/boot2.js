// /js/scarlett1/boot2.js — Scarlett Boot2 (Hardened) v2.2
// - Robust dynamic imports with timeout + hard logs
// - VRButton always shows if possible
// - World always loads even if hands fail
// - Hands are OPTIONAL (models only). Pinch/teleport remains handled elsewhere.
// - No "three" bare imports in your local files.

const BUILD = "BOOT2_v2_2";
const NOW = () => new Date();
const ts = () => {
  const d = NOW();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `[${hh}:${mm}:${ss}]`;
};

// ---------- Diagnostics UI hooks (safe no-op if missing) ----------
const diag = (() => {
  const state = {
    elLog: null,
    elStatus: null,
    started: false
  };

  const init = () => {
    state.elLog = document.getElementById("diagLog");
    state.elStatus = document.getElementById("diagStatus");
    const btnCopy = document.getElementById("btnCopy");
    const btnClear = document.getElementById("btnClear");
    const btnReload = document.getElementById("btnReload");
    const btnHide = document.getElementById("btnHideHud");
    const btnShow = document.getElementById("btnShowHud");

    if (btnCopy) btnCopy.onclick = () => {
      try {
        const txt = state.elLog ? state.elLog.innerText : "";
        navigator.clipboard.writeText(txt);
        log("copied ✅");
      } catch (e) {
        log("copy failed ❌", e?.message || e);
      }
    };
    if (btnClear) btnClear.onclick = () => {
      if (state.elLog) state.elLog.innerText = "";
      log("cleared ✅");
    };
    if (btnReload) btnReload.onclick = () => location.reload();

    if (btnHide) btnHide.onclick = () => document.body.classList.add("hudHidden");
    if (btnShow) btnShow.onclick = () => document.body.classList.remove("hudHidden");

    state.started = true;
  };

  const setStatus = (txt, ok = null) => {
    if (!state.started) init();
    if (!state.elStatus) return;
    const b = ok === true ? "World running ✅" : ok === false ? "BOOT FAILED ❌" : txt;
    state.elStatus.innerHTML = `STATUS: <b>${b}</b>`;
  };

  const log = (...a) => {
    const line = `${ts()} ${a.map(x => (typeof x === "string" ? x : (x?.message || JSON.stringify(x)))).join(" ")}`;
    console.log(line);
    if (!state.started) init();
    if (state.elLog) {
      state.elLog.innerText += (state.elLog.innerText ? "\n" : "") + line;
      state.elLog.scrollTop = state.elLog.scrollHeight;
    }
  };

  return { log, setStatus };
})();

const log = (...a) => diag.log(...a);

// ---------- Helpers ----------
const withTimeout = (promise, ms, label) => {
  let to;
  const timeout = new Promise((_, rej) => {
    to = setTimeout(() => rej(new Error(`timeout after ${ms}ms :: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(to));
};

const q = (u) => {
  // Cache-buster (keeps logs readable)
  const v = Date.now();
  return u.includes("?") ? `${u}&v=${v}` : `${u}?v=${v}`;
};

async function importHard(url, name, timeoutMs = 12000) {
  log(`[boot2] import ${url}`);
  try {
    const mod = await withTimeout(import(url), timeoutMs, name);
    log(`[boot2] ok ✅ ${name}`);
    return mod;
  } catch (e) {
    log(`[boot2] fail ❌ ${name} :: ${e?.message || e}`);
    throw e;
  }
}

async function importSoft(url, name, timeoutMs = 12000) {
  log(`[boot2] import ${url}`);
  try {
    const mod = await withTimeout(import(url), timeoutMs, name);
    log(`[boot2] ok ✅ ${name}`);
    return mod;
  } catch (e) {
    log(`[boot2] fail ❌ ${name} :: ${e?.message || e}`);
    return null;
  }
}

// ---------- Boot ----------
(async function main() {
  diag.setStatus("Booting…", null);

  log(`diag start ✅`);
  log(`build=${BUILD}`);

  try {
    log(`href=${location.href}`);
    log(`path=${location.pathname}`);
    const base = "/" + location.pathname.split("/").filter(Boolean)[0] + "/";
    log(`base=${base}`);
    log(`secureContext=${String(window.isSecureContext)}`);
    log(`ua=${navigator.userAgent}`);
    log(`navigator.xr=${String(!!navigator.xr)}`);

    // THREE
    const THREE = await importHard(
      q("https://unpkg.com/three@0.158.0/build/three.module.js"),
      "three",
      15000
    );
    log(`[boot2] three import ✅ r${THREE.REVISION}`);

    // VRButton
    const { VRButton } = await importHard(
      q("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js"),
      "VRButton",
      15000
    );

    // Create renderer + scene + camera (world may override)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070c);

    const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 4000);
    camera.position.set(0, 1.6, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Minimal ambient so you always see something
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223355, 0.9);
    scene.add(hemi);

    // Resize
    addEventListener("resize", () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // Attach VRButton
    document.body.appendChild(VRButton.createButton(renderer));
    log(`VRButton ready ✅`);

    // OPTIONAL: Hand Model Factory (models only)
    // Requires importmap in index.html mapping "three" -> CDN
    const XRHands = await importSoft(
      q("https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js"),
      "XRHandModelFactory",
      15000
    );

    let handFactory = null;
    if (XRHands && XRHands.XRHandModelFactory) {
      handFactory = new XRHands.XRHandModelFactory();
      log(`XR hand model factory ready ✅`);
    } else {
      log(`XR hand models skipped (ok)`);
    }

    // World
    // IMPORTANT: your world.js must NOT "import ... from 'three'" unless you rely on importmap.
    // If it does, keep the importmap in index.html.
    const worldURL = q(`${base}js/scarlett1/world.js`);
    log(`[boot2] world url=${worldURL}`);

    const worldMod = await importHard(worldURL, "world.js", 15000);
    if (!worldMod || typeof worldMod.initWorld !== "function") {
      throw new Error("world.js missing export initWorld()");
    }

    // initWorld signature support:
    // initWorld({ THREE, scene, renderer, camera, log, base })
    // or initWorld(THREE, scene, renderer, camera, log)
    log(`importing world…`);
    let world = null;
    try {
      world = await worldMod.initWorld({ THREE, scene, renderer, camera, log, base });
    } catch (e) {
      // fallback old signature
      world = await worldMod.initWorld(THREE, scene, renderer, camera, log);
    }
    log(`initWorld() completed ✅`);

    // If world provided its own camera/scene/rig, respect it
    const wScene = world?.scene || scene;
    const wCamera = world?.camera || camera;

    // Create XR hands (actual tracked hands + optional visual model)
    // This DOES NOT affect your pinch teleport code; it only adds visuals if supported.
    const leftHand = renderer.xr.getHand(0);
    const rightHand = renderer.xr.getHand(1);
    wScene.add(leftHand);
    wScene.add(rightHand);

    if (handFactory) {
      try {
        leftHand.add(handFactory.createHandModel(leftHand, "mesh"));
        rightHand.add(handFactory.createHandModel(rightHand, "mesh"));
        log(`XR hand models attached ✅`);
      } catch (e) {
        log(`XR hand model attach skipped (ok) :: ${e?.message || e}`);
      }
    }

    // Quest locomotion module (your repo module) — OPTIONAL
    // This is where stick movement usually comes from.
    // NOTE: it must NOT bare-import "three" unless importmap exists.
    const controlsURL = q(`${base}js/core/controls.js`);
    const controlsMod = await importSoft(controlsURL, "controls", 12000);
    if (controlsMod && typeof controlsMod.initControls === "function") {
      try {
        controlsMod.initControls({ THREE, scene: wScene, renderer, camera: wCamera, world, log });
        log(`Quest locomotion module ready ✅`);
      } catch (e) {
        log(`controls init failed (skipping) :: ${e?.message || e}`);
      }
    }

    // Android sticks module (debug only)
    const androidURL = q(`${base}js/scarlett1/spine_android.js`);
    const androidMod = await importSoft(androidURL, "spine_android", 12000);
    if (androidMod && typeof androidMod.initAndroidSticks === "function") {
      try {
        androidMod.initAndroidSticks({ THREE, scene: wScene, camera: wCamera, renderer, world, log });
        log(`Android sticks READY ✅`);
      } catch (e) {
        log(`Android sticks init failed (skipping) :: ${e?.message || e}`);
      }
    } else if (androidMod) {
      log(`spine_android loaded, but no initAndroidSticks() (skipping)`);
    }

    // Render loop
    renderer.setAnimationLoop(() => {
      if (world && typeof world.update === "function") world.update();
      renderer.render(wScene, wCamera);
    });
    log(`render loop start ✅`);

    diag.setStatus("World running ✅", true);

  } catch (e) {
    diag.setStatus("BOOT FAILED ❌", false);
    log(`BOOT ERROR: ${e?.message || e}`);
  }
})();
