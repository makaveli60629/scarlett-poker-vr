// /js/scarlett1/boot.js — Scarlett 1.0 Boot (Permanent Spine)
// Loads Three.js (CDN), creates world, installs XR + Android controls, loads modules.json safely.

import { safeImport } from "./safe_import.js";

const diag = window.SpineDiag;
const BUILD = "SCARLETT1_SPINE_v1_0";

function log(...a){ console.log("[BOOT]", ...a); }
function err(...a){ console.error("[BOOT]", ...a); }

function basePath(){
  // Works on GitHub Pages repo roots (/scarlett-poker-vr/) or custom domains (/)
  const p = location.pathname;
  // If you deploy under repo name, keep that prefix.
  // We assume index.html at site root.
  return p.endsWith("/") ? p : p.replace(/\/[^\/]*$/, "/");
}

async function loadThree(){
  // Use CDN ESM (no "three" bare specifiers)
  // Pin version to avoid breaking changes.
  const src = "https://unpkg.com/three@0.158.0/build/three.module.js";
  const mod = await import(src);
  log("three loaded ✅", src);
  return mod;
}

async function main(){
  try{
    diag?.setStatus?.("Booting…");
    log("start ✅ build=", BUILD);
    log("href=", location.href);
    log("secureContext=", !!window.isSecureContext);
    log("ua=", navigator.userAgent);

    const THREE = await loadThree();

    // Create world
    const worldMod = await import("./world.js");
    const world = await worldMod.createWorld({ THREE, diag });
    window.ScarlettWorld = world;

    // Load modules.json + optional modules
    const modulesUrl = "./modules.json"; // root modules.json
    const res = await fetch(modulesUrl, { cache: "no-store" });
    if(!res.ok) throw new Error("modules.json fetch failed: HTTP "+res.status);
    const cfg = await res.json();
    log("modules.json ✅", cfg?.version || "");
    diag?.log?.("[modules] loaded modules.json");

    // Load each enabled module (skip the core ones that are already imported here)
    const skip = new Set([
      "./js/scarlett1/world.js",
      "./js/scarlett1/spine_xr.js",
      "./js/scarlett1/spine_android.js",
      "./js/scarlett1/spine_hud.js"
    ]);

    const list = Array.isArray(cfg?.modules) ? cfg.modules : [];
    for(const m of list){
      if(m?.enabled === false) continue;
      if(!m?.src) continue;
      if(skip.has(m.src)) continue;
      // If src is relative and points to /js/scarlett1, it will still work.
      await safeImport(m.src, diag);
    }

    // XR
    const xr = await import("./spine_xr.js");
    xr.installXR({ THREE, world, diag });

    // Android / mobile
    const mob = await import("./spine_android.js");
    mob.installAndroidControls({ THREE, world, diag });

    // HUD helpers (optional)
    const hud = await import("./spine_hud.js");
    hud.installHUD({ world, diag });

    diag?.setStatus?.("Booted ✅");
    log("boot complete ✅");
  } catch(e){
    err("boot FAILED ❌", e);
    diag?.setStatus?.("ERROR — check logs");
    diag?.error?.("BOOT FAILED:", e?.message || e);
  }
}

main();
