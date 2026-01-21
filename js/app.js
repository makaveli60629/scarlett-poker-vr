// SCARLETT V26.1 — SAFE BOOT + MODULE AUDIT + BETTER MOVEMENT
import { diagInit, diagWrite, diagSetKV, diagDumpEnv, diagSection } from "./diag.js";
import { buildWorld } from "./world.js";
import { applySpawn, armRespawnOnEnterVR } from "./spawn.js";
import { initAndroidPads } from "./android_pads.js";
import { auditModules } from "./module_loader.js";
import { scanRepo } from "./repo_scanner.js";
import { loadModules, safeSet, scarlett1Set, autoStage2, autoStage3 } from "./module_manager.js";
import "./teleport.js";
import "./move.js";

const BUILD = "SCARLETT_V27_1_AUTO_STAGE_LOADER_v27_1";

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
  const btnScanRepo = $("btnScanRepo");
  btnScanRepo?.addEventListener("click", async () => {
    diagSection("REPO SCAN (GitHub API)");
    const rep = await scanRepo({ diagWrite });
    window.SCARLETT.repoScan = rep;
    diagWrite(`[scan] candidates=${rep.candidates.length} present=${rep.present.length} missing=${rep.missing.length}`);
  });

  const btnLoadSafe = $("btnLoadSafe");
  btnLoadSafe?.addEventListener("click", async () => {
    diagSection("LOAD SAFE SET");
    const ctx = { scene, rig };
    const rep = await loadModules(safeSet(), { diagWrite, ctx });
    window.SCARLETT.loadSafe = rep;
    diagWrite(`[load] safe ok=${rep.ok.length} fail=${rep.fail.length}`);
  });

  const btnLoadScarlett1 = $("btnLoadScarlett1");
  btnLoadScarlett1?.addEventListener("click", async () => {
    diagSection("LOAD SCARLETT1");
    const ctx = { scene, rig };
    const rep = await loadModules(scarlett1Set(), { diagWrite, ctx });
    window.SCARLETT.loadScarlett1 = rep;
    diagWrite(`[load] scarlett1 ok=${rep.ok.length} fail=${rep.fail.length}`);
  });
  const btnLoadStage2 = $("btnLoadStage2");
  btnLoadStage2?.addEventListener("click", async () => {
    diagSection("LOAD STAGE 2 (auto)");
    const ctx = { scene, rig };
    const list = autoStage2();
    diagWrite(`[stage2] candidates=${list.length} (run Scan Repo first)`);
    const rep = await loadModules(list, { diagWrite, ctx });
    window.SCARLETT.loadStage2 = rep;
    diagWrite(`[stage2] ok=${rep.ok.length} loaded=${rep.loaded.length} skipped=${rep.skipped.length} fail=${rep.fail.length}`);
  });

  const btnLoadStage3 = $("btnLoadStage3");
  btnLoadStage3?.addEventListener("click", async () => {
    diagSection("LOAD STAGE 3 (auto)");
    const ctx = { scene, rig };
    const list = autoStage3();
    diagWrite(`[stage3] candidates=${list.length} (run Scan Repo first)`);
    const rep = await loadModules(list, { diagWrite, ctx });
    window.SCARLETT.loadStage3 = rep;
    diagWrite(`[stage3] ok=${rep.ok.length} loaded=${rep.loaded.length} skipped=${rep.skipped.length} fail=${rep.fail.length}`);
  });

  const btnLoadAll = $("btnLoadAll");
  btnLoadAll?.addEventListener("click", async () => {
    diagSection("LOAD ALL (Safe→Stage2→Stage3)");
    const ctx = { scene, rig };
    const rep1 = await loadModules(safeSet(), { diagWrite, ctx });
    const rep2 = await loadModules(autoStage2(), { diagWrite, ctx });
    const rep3 = await loadModules(autoStage3(), { diagWrite, ctx });
    window.SCARLETT.loadAll = { rep1, rep2, rep3 };
    diagWrite(`[all] safe ok=${rep1.ok.length} fail=${rep1.fail.length}`);
    diagWrite(`[all] stage2 ok=${rep2.ok.length} fail=${rep2.fail.length}`);
    diagWrite(`[all] stage3 ok=${rep3.ok.length} fail=${rep3.fail.length}`);
  });



  btnReset?.addEventListener("click", () => {
    try{
      const ok = applySpawn({ standingHeight: 1.65 });
      diagWrite(ok ? "[ui] reset to spawn ✅" : "[ui] reset failed");
    } catch(e){ diagWrite(`[ui] reset error: ${e?.message || e}`); }
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
  try { initAndroidPads(); diagWrite("[androidPads] armed ✅"); } catch(e){ diagWrite(`[androidPads] error: ${e?.message || e}`); }
  try { armRespawnOnEnterVR({ standingHeight: 1.65 }); diagWrite("[spawn] reapply on enter-vr armed ✅"); } catch(e){ diagWrite(`[spawn] arm error: ${e?.message || e}`); }


  // Auto-audit at boot (won't crash if missing)
  diagSection("MODULE AUDIT (auto)");
  const report = await auditModules({ diagWrite });
  window.SCARLETT.moduleReport = report;
  diagWrite(`[audit] auto done — ok=${report.ok.length} missing=${report.missing.length} error=${report.error.length}`);

  // Build world
  safe(() => buildWorld(scene), "buildWorld()");
  diagWrite("[world] buildWorld() ✅");
  // Apply authoritative spawn AFTER world exists (spawnPad is created in world.js)
  try {
    const ok = applySpawn({ standingHeight: 1.65 });
    diagWrite(ok ? "[spawn] applied ✅" : "[spawn] failed (rig missing)");
  } catch (e) {
    diagWrite(`[spawn] error: ${e?.message || e}`);
  }

  // Boot optional modules in a safe order (won't crash the main loop)
  diagSection("MODULE BOOT (safe init)");
  const bootList = [
    { label: "pip/jumbotron", path: "./js/modules/jumbotron.js" },
    { label: "audio", path: "./js/modules/audio.js" },
    { label: "bots", path: "./js/modules/bots.js" },
    { label: "cards", path: "./js/modules/cards.js" },
    { label: "chips", path: "./js/modules/chips.js" }
  ];

  for (const m of bootList) {
    try {
      const mod = await import(new URL(m.path, window.location.href).href);
      if (typeof mod.init === "function") {
        await mod.init({ scene, rig });
        diagWrite(`[boot] init OK: ${m.label}`);
      } else {
        diagWrite(`[boot] loaded (no init): ${m.label}`);
      }
    } catch (e) {
      diagWrite(`[boot] init FAIL: ${m.label} (${e?.message || e})`);
    }
  }


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
