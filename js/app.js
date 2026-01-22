import { diagInit, diagWrite, diagSetKV, diagDumpEnv, diagSection } from "./diag.js";
import { buildWorld } from "./world.js";
import { applySpawn, armRespawnOnEnterVR } from "./spawn.js";
import { initAndroidPads } from "./android_pads.js";
import { auditModules } from "./module_loader.js";
import "./teleport.js";
import "./move.js";

const BUILD = "SCARLETT_UPDATE_3_0_FULL_RECOVERY";

function $(id){ return document.getElementById(id); }

function showLoaderError(msg){
  const el = $("loaderErr");
  if (!el) return;
  el.style.display = "block";
  el.textContent = String(msg);
}
function hideLoader(){ const el = $("loader"); if (el) el.style.display = "none"; }
function showLoader(){ const el = $("loader"); if (el) el.style.display = "flex"; }

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

  const btnEnterVR = $("btnEnterVR");
  const btnTeleport = $("btnTeleport");
  const btnReset = $("btnReset");
  const btnAudit = $("btnAudit");
  const btnDiag = $("btnDiag");
  const btnHideHUD = $("btnHideHUD");
  const diagPanel = $("diagPanel");
  const diagText3d = $("diagText3d");

  let teleportEnabled = true;
  window.SCARLETT.teleportEnabled = true;

  btnTeleport?.addEventListener("click", () => {
    teleportEnabled = !teleportEnabled;
    window.SCARLETT.teleportEnabled = teleportEnabled;
    btnTeleport.textContent = `Teleport: ${teleportEnabled ? "ON" : "OFF"}`;
    diagSetKV("teleport", teleportEnabled ? "ON" : "OFF");
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
    if (diagText3d) diagText3d.setAttribute("visible", show ? "true" : "false");
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

  const HANG_MS = 12000;
  const hangTimer = setTimeout(() => {
    diagWrite(`[watchdog] world attach timeout after ${HANG_MS}ms`);
    showLoaderError("World attach timeout. Open Diagnostics for details.");
  }, HANG_MS);

  await new Promise((resolve) => {
    if (scene?.hasLoaded) return resolve();
    scene?.addEventListener("loaded", () => resolve(), { once: true });
  });
  diagWrite("[scene] loaded ✅");

  try { initAndroidPads(); diagWrite("[androidPads] armed ✅"); } catch(e){ diagWrite(`[androidPads] error: ${e?.message || e}`); }
  try { armRespawnOnEnterVR({ standingHeight: 1.65 }); diagWrite("[spawn] reapply on enter-vr armed ✅"); } catch(e){ diagWrite(`[spawn] arm error: ${e?.message || e}`); }

  diagSection("MODULE AUDIT (auto)");
  const report = await auditModules({ diagWrite });
  window.SCARLETT.moduleReport = report;
  diagWrite(`[audit] auto done — ok=${report.ok.length} missing=${report.missing.length} error=${report.error.length}`);

  buildWorld(scene);
  diagWrite("[world] buildWorld() ✅");

  try {
    const ok = applySpawn({ standingHeight: 1.65 });
    diagWrite(ok ? "[spawn] applied ✅" : "[spawn] failed (rig missing)");
  } catch (e) {
    diagWrite(`[spawn] error: ${e?.message || e}`);
  }

  diagSection("MODULE BOOT (safe init)");
  const bootList = [
    { label: "pip/jumbotron", path: "./js/modules/jumbotron.js" },
    { label: "audio", path: "./js/modules/audio.js" },
    { label: "bots", path: "./js/modules/bots.js" },
    { label: "cards", path: "./js/modules/cards.js" },
    { label: "chips", path: "./js/modules/chips.js" },
    { label: "scarlett1/index", path: "./js/scarlett1/index.js" },
    { label: "scarlett1/boot", path: "./js/scarlett1/boot.js" }
  ];

  for (const m of bootList) {
    try {
      const mod = await import(new URL(m.path, window.location.href).href);
      if (typeof mod.init === "function") {
        await mod.init({ scene, rig, diagWrite });
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
