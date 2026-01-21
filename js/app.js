// SCARLETT V26.1 — SAFE BOOT + MODULE AUDIT + BETTER MOVEMENT
import { diagInit, diagWrite, diagSetKV, diagDumpEnv, diagSection } from "./diag.js";
import { buildWorld } from "./world.js";
import { auditModules } from "./module_loader.js";
import "./teleport.js";
import "./move.js";

const BUILD = "SCARLETT_V26_1_1_SAFE_BOOT_AUDIT_FIX_v26_1_1";

function $(id){ return document.getElementById(id); }

function showLoaderError(msg){
  const el = $("loaderErr");
  el.style.display = "block";
  el.textContent = String(msg);
}
function hideLoader(){ const el = $("loader"); if (el) el.style.display = "none"; }
function showLoader(){ const el = $("loader"); if (el) el.style.display = "flex"; }

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

  // UI
  const btnEnterVR = $("btnEnterVR");
  const btnTeleport = $("btnTeleport");
  const btnReset = $("btnReset");
  const btnAudit = $("btnAudit");
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

  btnAudit?.addEventListener("click", async () => {
    diagSection("MODULE AUDIT (manual)");
    const report = await auditModules({ diagWrite });
    window.SCARLETT.moduleReport = report;
    diagWrite(`[audit] done — ok=${report.ok.length} missing=${report.missing.length} error=${report.error.length}`);
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

  btnEnterVR?.addEventListener("click", async () => {
    try {
      scene?.enterVR?.();
      diagWrite("[xr] enterVR requested");
    } catch (e) {
      diagWrite(`[xr] enterVR failed: ${e?.message || e}`);
      showLoaderError(`enterVR failed: ${e?.message || e}`);
    }
  });

  window.SCARLETT.teleportEnabled = true;

  // Watchdog
  const HANG_MS = 12000;
  const hangTimer = setTimeout(() => {
    diagWrite(`[watchdog] world attach timeout after ${HANG_MS}ms`);
    showLoaderError("World attach timeout. Open Diagnostics for details.");
  }, HANG_MS);

  // Wait for A-Frame ready
  await new Promise((resolve) => {
    if (scene?.hasLoaded) return resolve();
    scene?.addEventListener("loaded", () => resolve(), { once: true });
  });
  diagWrite("[scene] loaded ✅");

  // Auto-audit at boot (won't crash if missing)
  diagSection("MODULE AUDIT (auto)");
  const report = await auditModules({ diagWrite });
  window.SCARLETT.moduleReport = report;
  diagWrite(`[audit] auto done — ok=${report.ok.length} missing=${report.missing.length} error=${report.error.length}`);

  // Build world
  safe(() => buildWorld(scene), "buildWorld()");
  diagWrite("[world] buildWorld() ✅");

  const floor = document.querySelector(".teleportable");
  diagSetKV("teleportableFloor", floor ? "OK" : "MISSING");

  // Hide loader after renderstart
  await new Promise((resolve) => {
    const done = () => resolve();
    scene?.addEventListener("renderstart", done, { once: true });
    setTimeout(done, 450);
  });

  clearTimeout(hangTimer);
  hideLoader();
  diagWrite("[status] ready ✅");
}

showLoader();
boot().catch((e) => showLoaderError(e?.stack || e?.message || String(e)));
