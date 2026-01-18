// SCARLETT BOOT — Ultimate Guarded Import (prevents double-loading + SUITS redeclare)
// BUILD: SCARLETT_BOOT_ULTIMATE_v1_7 (compatible)

const BUILD = "SCARLETT_BOOT_ULTIMATE_v1_7";

// ---- diag writer (used by everything) ----
(function initDiag() {
  const panel = document.getElementById("diagPanel");
  window.__scarlettDiagWrite = (msg) => {
    const line = `[${new Date().toLocaleTimeString()}] ${String(msg)}`;
    console.log(line);
    if (panel) panel.textContent += (panel.textContent ? "\n" : "") + line;
  };
  window.__scarlettDiag = () => {
    window.__scarlettDiagWrite("=== SCARLETT ADMIN DIAG REPORT ===");
    window.__scarlettDiagWrite(`BUILD=${BUILD}`);
    window.__scarlettDiagWrite(`HREF=${location.href}`);
    window.__scarlettDiagWrite(`secureContext=${String(window.isSecureContext)}`);
    window.__scarlettDiagWrite(`ua=${navigator.userAgent}`);
    window.__scarlettDiagWrite(`touch=${"ontouchstart" in window} maxTouchPoints=${navigator.maxTouchPoints || 0}`);

    const ids = ["btnEnterVR","btnHideHUD","btnHideUI","btnTeleport","btnDiag","btnSticks","btnAudio"];
    window.__scarlettDiagWrite("");
    window.__scarlettDiagWrite("--- HUD / TOUCH ---");
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) { window.__scarlettDiagWrite(`${id}=MISSING`); continue; }
      const r = el.getBoundingClientRect();
      const midX = r.left + r.width/2, midY = r.top + r.height/2;
      const top = document.elementFromPoint(midX, midY);
      window.__scarlettDiagWrite(`${id}=OK blocked=${top!==el} top=${top ? (top.tagName.toLowerCase() + (top.id?("#"+top.id):"") + (top.className?("." + String(top.className).trim().split(/\s+/).join(".")):"")) : "null"}`);
    }
  };
})();

const dwrite = (m)=>{ try{ window.__scarlettDiagWrite(m);}catch(_){ console.log(m);} };

dwrite(`[status] booting…`);
dwrite(`BUILD=${BUILD}`);
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BOOT_BUILD = BUILD;

// ---- HUD wiring ----
const $ = (id)=>document.getElementById(id);

let teleportOn = false;
let sticksOn = true;
let audioOn = true;
let hudHidden = false;
let uiHidden = false;

function setBtn(id, text){ const b=$(id); if(b) b.textContent=text; }

$("btnDiag")?.addEventListener("click", () => {
  const panel = $("diagPanel");
  if (!panel) return;
  panel.style.display = (panel.style.display === "none" || !panel.style.display) ? "block" : "none";
  window.__scarlettDiag?.();
});

$("btnTeleport")?.addEventListener("click", () => {
  teleportOn = !teleportOn;
  window.SCARLETT.teleportOn = teleportOn;
  setBtn("btnTeleport", `Teleport: ${teleportOn ? "ON" : "OFF"}`);
});

$("btnSticks")?.addEventListener("click", () => {
  sticksOn = !sticksOn;
  window.SCARLETT.sticksOn = sticksOn;
  setBtn("btnSticks", `Sticks: ${sticksOn ? "ON" : "OFF"}`);
});

$("btnAudio")?.addEventListener("click", () => {
  audioOn = !audioOn;
  window.SCARLETT.audioOn = audioOn;
  setBtn("btnAudio", `Audio: ${audioOn ? "ON" : "OFF"}`);
});

$("btnHideHUD")?.addEventListener("click", () => {
  hudHidden = !hudHidden;
  const hud = $("hud");
  if (hud) hud.style.display = hudHidden ? "none" : "flex";
});

$("btnHideUI")?.addEventListener("click", () => {
  uiHidden = !uiHidden;
  const hint = $("pipHint");
  if (hint) hint.style.display = uiHidden ? "none" : "block";
});

// ---- XR button calls into engine when ready ----
$("btnEnterVR")?.addEventListener("click", async () => {
  try {
    if (window.__scarlettEnterVR) await window.__scarlettEnterVR();
    else dwrite("[xr] engine not ready yet");
  } catch (e) {
    dwrite(`[xr] EnterVR failed: ${e?.message || e}`);
  }
});

// ---- IMPORTANT: HARD GUARD prevents double import ----
(async function bootImport() {
  try {
    dwrite("");
    dwrite("--- PREFLIGHT: index.js ---");
    dwrite("import /js/scarlett1/index.js");

    if (window.__SCARLETT1_IMPORTED__) {
      dwrite("[status] boot already imported — skipping");
      return;
    }
    window.__SCARLETT1_IMPORTED__ = true;

    await import("/js/scarlett1/index.js");

    dwrite("[status] ready ✅");
  } catch (e) {
    dwrite("");
    dwrite("[status] BOOT FAILED ❌");
    dwrite(String(e?.stack || e?.message || e));
  }
})();
