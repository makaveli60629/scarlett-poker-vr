// /js/scarlett1/boot.js — Scarlett 1.0 Boot (Permanent Spine)
// Loads THREE (CDN), loads world.js, wires diagnostics + HUD, never hard-crashes.

const BOOT_BUILD = "SCARLETT1_BOOT_v1_0";

function qs(sel) { return document.querySelector(sel); }

function nowStamp() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour12: true });
}

// ---- HUD/DIAG bridge (works even if spine_diag/hud changed) ----
function getDiagAPI() {
  return window.ScarlettDiag || null;
}

function diagLog(...a) {
  try {
    const msg = a.map(v => (typeof v === "string" ? v : JSON.stringify(v))).join(" ");
    const line = `[${nowStamp()}] ${msg}`;
    console.log(line);
    const D = getDiagAPI();
    D?.log?.(line);
  } catch (e) {
    console.log("[diagLog fail]", e);
  }
}

function diagStatus(s) {
  try { getDiagAPI()?.status?.(s); } catch {}
}

async function safeImport(url) {
  try {
    return await import(url);
  } catch (e) {
    diagLog("IMPORT FAILED:", url);
    diagLog(String(e?.stack || e));
    throw e;
  }
}

function withCacheBust(url) {
  const v = Date.now();
  return `${url}${url.includes("?") ? "&" : "?"}v=${v}`;
}

(async function boot() {
  const href = location.href;
  const path = location.pathname;
  const base = path.includes("/scarlett-poker-vr/") ? "/scarlett-poker-vr/" : "/";
  const scarlettBase = `${base}js/scarlett1/`;

  // expose for debugging
  window.SCARLETT1 = window.SCARLETT1 || {};
  window.SCARLETT1.base = base;
  window.SCARLETT1.scarlettBase = scarlettBase;
  window.SCARLETT1.BOOT_BUILD = BOOT_BUILD;

  diagLog(`href=${href}`);
  diagLog(`path=${path}`);
  diagLog(`base=${base}`);
  diagLog(`secureContext=${window.isSecureContext}`);
  diagLog(`ua=${navigator.userAgent}`);
  diagLog(`navigator.xr=${!!navigator.xr}`);

  diagStatus("boot start ✅");

  // Load THREE from CDN
  diagStatus("Loading three.js…");
  const THREE_URL = "https://unpkg.com/three@0.158.0/build/three.module.js";
  let THREE = null;

  try {
    THREE = await safeImport(THREE_URL);
    diagLog("three import ✅", THREE_URL);
  } catch (e) {
    diagStatus("Boot failed: THREE import");
    diagLog("ERROR BOOT FAILED: three import");
    return;
  }

  // Load spine_xr (controllers/rig helpers)
  const xrURL = withCacheBust(`${scarlettBase}spine_xr.js`);
  let XR = null;
  try {
    XR = await safeImport(xrURL);
    diagLog("xr import ✅", xrURL);
  } catch (e) {
    diagLog("xr import failed (continuing safe)");
  }

  // Load world module
  diagStatus("Loading world.js…");
  const worldURL = withCacheBust(`${scarlettBase}world.js`);
  diagLog("world url=", worldURL);

  let worldMod = null;
  try {
    worldMod = await safeImport(worldURL);
    diagLog("world import ✅");
  } catch (e) {
    diagStatus("BOOT FAILED (world import)");
    diagLog("ERROR BOOT FAILED:", String(e?.stack || e));
    return;
  }

  // Hard requirement: initWorld must exist
  const initWorld = worldMod?.initWorld || worldMod?.default?.initWorld || null;
  if (typeof initWorld !== "function") {
    diagStatus("BOOT FAILED (initWorld missing)");
    diagLog("ERROR BOOT FAILED: worldMod.initWorld is not a function");
    return;
  }

  // Start world
  diagStatus("Starting world…");
  diagLog("initWorld() start");

  try {
    await initWorld({
      THREE,
      XR,              // optional helpers
      base,
      scarlettBase,
      build: BOOT_BUILD,
      log: diagLog,
      status: diagStatus
    });

    diagStatus("World running ✅");
  } catch (e) {
    diagStatus("BOOT FAILED ❌ (see log)");
    diagLog("ERROR BOOT FAILED:", String(e?.stack || e));
  }
})();
