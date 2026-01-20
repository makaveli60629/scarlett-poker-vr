// SCARLETT V26 — FULL SAFE BOOT (A-Frame)
// Goal: never hang on "loader active"; always either show world or show a concrete error.
//
// File: /js/app.js
import { diagInit, diagWrite, diagSetKV, diagDumpEnv } from "./diag.js";
import { buildWorld } from "./world.js";
import "./teleport.js";
import "./move.js";

const BUILD = "SCARLETT_V26_FULL_SAFE_BOOT_v26_0";

function $(id){ return document.getElementById(id); }

function showLoaderError(msg){
  const el = $("loaderErr");
  el.style.display = "block";
  el.textContent = String(msg);
}

function hideLoader(){
  const el = $("loader");
  if (el) el.style.display = "none";
}

function showLoader(){
  const el = $("loader");
  if (el) el.style.display = "flex";
}

function safe(fn, label){
  try { return fn(); }
  catch (e) {
    diagWrite(`[ERR] ${label}: ${e?.message || e}`);
    showLoaderError(`${label}: ${e?.message || e}`);
    throw e;
  }
}

window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;

window.addEventListener("error", (ev) => {
  const msg = ev?.error?.stack || ev?.message || "Unknown error";
  diagWrite(`[window.error] ${msg}`);
  showLoaderError(msg);
});

window.addEventListener("unhandledrejection", (ev) => {
  const msg = ev?.reason?.stack || ev?.reason?.message || String(ev?.reason || "Unhandled rejection");
  diagWrite(`[unhandledrejection] ${msg}`);
  showLoaderError(msg);
});

async function boot(){
  diagInit(BUILD);
  diagWrite(`[0.000] booting… BUILD=${BUILD}`);
  diagDumpEnv();

  const scene = $("scene");
  const rig = $("rig");

  // UI wires
  const btnEnterVR = $("btnEnterVR");
  const btnTeleport = $("btnTeleport");
  const btnReset = $("btnReset");
  const btnDiag = $("btnDiag");
  const btnHideHUD = $("btnHideHUD");
  const diagPanel = $("diagPanel");

  let teleportEnabled = true;
  btnTeleport?.addEventListener("click", () => {
    teleportEnabled = !teleportEnabled;
    window.SCARLETT.teleportEnabled = teleportEnabled;
    btnTeleport.textContent = `Teleport: ${teleportEnabled ? "ON" : "OFF"}`;
    diagSetKV("teleport", teleportEnabled ? "ON" : "OFF");
  });

  btnReset?.addEventListener("click", () => {
    rig?.setAttribute("position", "0 0 3");
    rig?.setAttribute("rotation", "0 0 0");
    diagWrite("[ui] reset to spawn");
  });

  btnDiag?.addEventListener("click", () => {
    const show = diagPanel.style.display !== "block";
    diagPanel.style.display = show ? "block" : "none";
  });

  btnHideHUD?.addEventListener("click", () => {
    const hud = document.getElementById("hud");
    const hidden = hud.style.display === "none";
    hud.style.display = hidden ? "block" : "none";
  });

  // Enter VR (explicit button for Quest reliability)
  btnEnterVR?.addEventListener("click", async () => {
    try {
      // A-Frame uses scene.enterVR()
      scene?.enterVR?.();
      diagWrite("[xr] enterVR requested");
    } catch (e) {
      diagWrite(`[xr] enterVR failed: ${e?.message || e}`);
      showLoaderError(`enterVR failed: ${e?.message || e}`);
    }
  });

  // Global flags the components read
  window.SCARLETT.teleportEnabled = true;

  // Hard timeout: loader must never hang forever
  const HANG_MS = 12000;
  const hangTimer = setTimeout(() => {
    diagWrite(`[watchdog] world attach timeout after ${HANG_MS}ms`);
    showLoaderError("World attach timeout. Open Diagnostics for details.");
    // Keep loader visible, but show error.
  }, HANG_MS);

  // Wait for scene ready (A-Frame lifecycle)
  await new Promise((resolve) => {
    if (scene?.hasLoaded) return resolve();
    scene?.addEventListener("loaded", () => resolve(), { once: true });
  });
  diagWrite("[scene] loaded ✅");

  // Build world (must not throw silently)
  safe(() => buildWorld(scene), "buildWorld()");
  diagWrite("[world] buildWorld() ✅");

  // Ensure there's always something teleportable
  const floor = document.querySelector(".teleportable");
  diagSetKV("teleportableFloor", floor ? "OK" : "MISSING");

  // When first frame is rendered, hide loader
  // A-Frame emits 'renderstart' when renderer begins
  await new Promise((resolve) => {
    const done = () => resolve();
    scene?.addEventListener("renderstart", done, { once: true });
    // If renderstart already happened
    if (scene?.renderer && scene?.renderStarted) resolve();
    // Fallback: hide after a short delay once world exists
    setTimeout(done, 400);
  });

  clearTimeout(hangTimer);
  hideLoader();
  diagWrite("[status] ready ✅");
}

showLoader();
boot().catch((e) => {
  // If boot fails, keep loader and show error
  showLoaderError(e?.stack || e?.message || String(e));
});
