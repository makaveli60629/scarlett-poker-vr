// /js/boot.js — Scarlett Diagnostic Boot (ALL JS IN /js)
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
  if (modeEl) modeEl.textContent = "Mode: running";
}
function url(path){ return new URL(path, location.href).toString(); }

async function ping(u){
  try{
    const r = await fetch(u, { cache: "no-store" });
    log(`[${now()}] [PING] ${u} -> ${r.status}`);
    return r.ok;
  }catch(e){
    log(`[${now()}] [PING] ${u} FAILED ❌ ${e?.message || e}`);
    return false;
  }
}

// Global error capture (so it never goes silent)
window.addEventListener("error", (e) => {
  log(`[${now()}] [GLOBAL] error ❌ ${e.message}`);
  if (e.filename) log(`[${now()}] [GLOBAL] at ${e.filename}:${e.lineno}:${e.colno}`);
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = e?.reason?.message || String(e?.reason || "unknown");
  log(`[${now()}] [GLOBAL] unhandledrejection ❌ ${msg}`);
});

log(`[${now()}] [BOOT] boot.js loaded ✅`);
log(`[${now()}] [BOOT] href=${location.href}`);
log(`[${now()}] [BOOT] secureContext=${window.isSecureContext}`);
log(`[${now()}] [BOOT] ua=${navigator.userAgent}`);
log(`[${now()}] [BOOT] navigator.xr=${!!navigator.xr}`);
setStatus();

// Buttons work even if runtime fails
document.getElementById("copyBtn")?.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(logEl?.textContent || ""); } catch {}
});
document.getElementById("clearBtn")?.addEventListener("click", () => {
  if (logEl) logEl.textContent = "";
  log(`[${now()}] [BOOT] log cleared ✅`);
});

document.getElementById("diagBtn")?.addEventListener("click", async () => {
  log(`[${now()}] [DIAG] click ✅`);
  await ping(url("./js/boot.js"));
  await ping(url("./js/index.js"));
  await ping(url("./js/world.js"));
  await ping(url("./js/VRButton.js"));
  log(`[${now()}] [DIAG] done ✅`);
});

(async () => {
  // Pre-flight file existence
  await ping(url("./js/index.js"));
  await ping(url("./js/world.js"));
  await ping(url("./js/VRButton.js"));

  // Cache-bust runtime import (Quest caches modules hard)
  const v = Date.now();
  const runtime = url(`./js/index.js?v=${v}`);

  log(`[${now()}] [BOOT] importing ${runtime} …`);
  try{
    await import(runtime);
    log(`[${now()}] [BOOT] index.js imported ✅`);
  }catch(e){
    log(`[${now()}] [BOOT] index.js import FAILED ❌ ${e?.message || e}`);
    console.error(e);
  }
})();
