// /boot.js — FULL DIAGNOSTIC BOOT
const now = () => new Date().toTimeString().slice(0, 8);
const logEl = document.getElementById("log");
const xrEl  = document.getElementById("xrstat");
const modeEl= document.getElementById("modestat");

function log(msg){
  console.log(msg);
  if (logEl){
    logEl.textContent += msg + "\n";
    logEl.scrollTop = logEl.scrollHeight;
  }
}

function banner(){
  log(`══════════════════════════════════════`);
  log(`[${now()}] Scarlett Boot Diagnostic`);
  log(`href=${location.href}`);
  log(`secureContext=${window.isSecureContext}`);
  log(`ua=${navigator.userAgent}`);
  log(`navigator.xr=${!!navigator.xr}`);
  log(`══════════════════════════════════════`);
}

function installGlobalErrorCapture(){
  window.addEventListener("error", (e) => {
    log(`[${now()}] [GLOBAL] error ❌ ${e.message}`);
    if (e.filename) log(`[${now()}] [GLOBAL] at ${e.filename}:${e.lineno}:${e.colno}`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = e?.reason?.message || String(e?.reason || "unknown");
    log(`[${now()}] [GLOBAL] unhandledrejection ❌ ${msg}`);
  });

  // Monkey-patch console.error to mirror into HUD log
  const origErr = console.error.bind(console);
  console.error = (...args) => {
    origErr(...args);
    try {
      const txt = args.map(a => (a?.message || a?.stack || String(a))).join(" ");
      log(`[${now()}] [console.error] ${txt}`);
    } catch {}
  };
}

async function pingFile(path){
  try {
    const r = await fetch(path, { cache: "no-store" });
    log(`[${now()}] [PING] ${path} -> ${r.status}`);
    return r.ok;
  } catch (e) {
    log(`[${now()}] [PING] ${path} FAILED ❌ ${e?.message || e}`);
    return false;
  }
}

(async () => {
  installGlobalErrorCapture();
  banner();

  log(`[${now()}] [BOOT] boot.js loaded ✅`);

  if (xrEl) xrEl.textContent = `XR: ${navigator.xr ? "supported" : "not found"}`;
  if (modeEl) modeEl.textContent = `Mode: running`;

  // Buttons
  const copyBtn  = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  if (copyBtn) copyBtn.onclick = async () => { try { await navigator.clipboard.writeText(logEl?.textContent || ""); } catch {} };
  if (clearBtn) clearBtn.onclick = () => { if (logEl) logEl.textContent = ""; };

  // Pre-flight: verify critical files exist
  await pingFile("./boot.js");
  await pingFile("./js/index.js");
  await pingFile("./js/world.js");
  await pingFile("./js/VRButton.js");

  log(`[${now()}] [BOOT] importing ./js/index.js …`);
  try{
    await import("./js/index.js");
    log(`[${now()}] [BOOT] index.js imported ✅`);
  }catch(e){
    log(`[${now()}] [BOOT] index.js import FAILED ❌ ${e?.message || e}`);
    console.error(e);
  }
})();
