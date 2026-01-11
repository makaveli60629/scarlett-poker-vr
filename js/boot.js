// /boot.js — Quest/Oculus-SAFE Diagnostic Boot vQ1
window.__BOOT_OK__ = true;

const now = () => new Date().toTimeString().slice(0, 8);
const logEl = document.getElementById("log");
const xrEl  = document.getElementById("xrstat");
const modeEl= document.getElementById("modestat");

function log(msg){
  console.log(msg);
  if (logEl){
    logEl.textContent += (logEl.textContent ? "\n" : "") + msg;
    logEl.scrollTop = logEl.scrollHeight;
  }
}

function setStatus(){
  if (xrEl) xrEl.textContent = `XR: ${navigator.xr ? "supported" : "not found"}`;
  if (modeEl) modeEl.textContent = `Mode: running`;
}

async function ping(url){
  try{
    const r = await fetch(url, { cache: "no-store" });
    log(`[${now()}] [PING] ${url} -> ${r.status}`);
    return r.ok;
  }catch(e){
    log(`[${now()}] [PING] ${url} FAILED ❌ ${e?.message || e}`);
    return false;
  }
}

// Resolve URLs safely for GitHub Pages project sites
function resolve(path){
  // Ensures correct base even if you are on /scarlett-poker-vr/
  return new URL(path, location.href).toString();
}

(async () => {
  log(`[${now()}] [BOOT] boot.js loaded ✅ (Quest-safe)`);
  log(`[${now()}] [BOOT] href=${location.href}`);
  log(`[${now()}] [BOOT] origin=${location.origin}`);
  log(`[${now()}] [BOOT] pathname=${location.pathname}`);
  log(`[${now()}] [BOOT] secureContext=${window.isSecureContext}`);
  log(`[${now()}] [BOOT] ua=${navigator.userAgent}`);
  log(`[${now()}] [BOOT] navigator.xr=${!!navigator.xr}`);

  setStatus();

  // Buttons should work even if imports fail
  document.getElementById("copyBtn")?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(logEl?.textContent || ""); } catch {}
  });
  document.getElementById("clearBtn")?.addEventListener("click", () => {
    if (logEl) logEl.textContent = "";
    log(`[${now()}] [BOOT] log cleared ✅`);
  });

  // IMPORTANT: resolve to absolute URLs
  const urlIndex = resolve("./js/index.js");
  const urlWorld = resolve("./js/world.js");
  const urlVRBtn = resolve("./js/VRButton.js");

  log(`[${now()}] [BOOT] RESOLVED index=${urlIndex}`);
  log(`[${now()}] [BOOT] RESOLVED world=${urlWorld}`);
  log(`[${now()}] [BOOT] RESOLVED vrbtn=${urlVRBtn}`);

  // Pre-flight pings (shows if Quest can reach the files)
  await ping(resolve("./boot.js"));
  await ping(urlIndex);
  await ping(urlWorld);
  await ping(urlVRBtn);

  // Cache-busted import (Quest caches aggressively)
  const v = Date.now();
  const importUrl = `${urlIndex}${urlIndex.includes("?") ? "&" : "?"}v=${v}`;

  log(`[${now()}] [BOOT] importing ${importUrl} …`);
  try{
    await import(importUrl);
    log(`[${now()}] [BOOT] index.js imported ✅`);
  }catch(e){
    log(`[${now()}] [BOOT] index.js import FAILED ❌ ${e?.message || e}`);
    // extra hint
    log(`[${now()}] [BOOT] If status=404 above → file missing or wrong folder on GitHub Pages.`);
    console.error(e);
  }
})();
