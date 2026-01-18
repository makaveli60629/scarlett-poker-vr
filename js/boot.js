// SCARLETT BOOT — QuickWalk v2.0 (upload-ready)
// Purpose: Always boot + show diag + load engine once.

const BUILD = "SCARLETT_BOOT_QUICKWALK_v2_0";

(function initDiag(){
  const panel = document.getElementById("diagPanel");
  window.__scarlettDiagWrite = (msg) => {
    const line = `[${new Date().toLocaleTimeString()}] ${String(msg)}`;
    console.log(line);
    if (panel) panel.textContent += (panel.textContent ? "\n" : "") + line;
  };

  window.__scarlettDiag = () => {
    const d = window.__scarlettDiagWrite;
    d("=== SCARLETT ADMIN DIAG REPORT ===");
    d(`BUILD=${BUILD}`);
    d(`HREF=${location.href}`);
    d(`secureContext=${String(window.isSecureContext)}`);
    d(`ua=${navigator.userAgent}`);
    d(`touch=${"ontouchstart" in window} maxTouchPoints=${navigator.maxTouchPoints||0}`);
    d("");
    d("--- HUD / TOUCH ---");
    for (const id of ["btnEnterVR","btnHideHUD","btnHideUI","btnTeleport","btnDiag","btnSticks","btnAudio"]) {
      const el = document.getElementById(id);
      if (!el) { d(`${id}=MISSING`); continue; }
      const r = el.getBoundingClientRect();
      const midX = r.left + r.width/2, midY = r.top + r.height/2;
      const top = document.elementFromPoint(midX, midY);
      d(`${id}=OK blocked=${top!==el} top=${top ? (top.tagName.toLowerCase() + (top.id?('#'+top.id):'')) : 'null'}`);
    }
  };
})();

const dwrite = (m)=>{ try{ window.__scarlettDiagWrite(m);}catch(_){ console.log(m);} };

window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BOOT_BUILD = BUILD;
window.SCARLETT.teleportOn = true;
window.SCARLETT.sticksOn = true;
window.SCARLETT.audioOn = true;

const $ = (id)=>document.getElementById(id);
const setBtn = (id, text)=>{ const b=$(id); if (b) b.textContent = text; };

// HUD wiring
let hudHidden = false;
let uiHidden = false;

$("btnDiag")?.addEventListener("click", () => {
  const panel = $("diagPanel");
  if (!panel) return;
  panel.style.display = (panel.style.display === "none" || !panel.style.display) ? "block" : "none";
  window.__scarlettDiag?.();
});

$("btnTeleport")?.addEventListener("click", () => {
  window.SCARLETT.teleportOn = !window.SCARLETT.teleportOn;
  setBtn("btnTeleport", `Teleport: ${window.SCARLETT.teleportOn ? "ON" : "OFF"}`);
  window.__scarlettAudioPlay?.("click");
});

$("btnSticks")?.addEventListener("click", () => {
  window.SCARLETT.sticksOn = !window.SCARLETT.sticksOn;
  setBtn("btnSticks", `Sticks: ${window.SCARLETT.sticksOn ? "ON" : "OFF"}`);
  window.__scarlettAudioPlay?.("click");
});

$("btnAudio")?.addEventListener("click", () => {
  window.SCARLETT.audioOn = !window.SCARLETT.audioOn;
  setBtn("btnAudio", `Audio: ${window.SCARLETT.audioOn ? "ON" : "OFF"}`);
  window.__scarlettAudioPlay?.("click");
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

$("btnEnterVR")?.addEventListener("click", async () => {
  try {
    if (window.__scarlettEnterVR) await window.__scarlettEnterVR();
    else dwrite("[xr] engine not ready yet");
  } catch (e) {
    dwrite(`[xr] EnterVR failed: ${e?.message || e}`);
  }
});

// Boot
(async function bootImport(){
  try {
    dwrite("[status] booting…");
    dwrite("");
    dwrite("--- PREFLIGHT: index.js ---");
    dwrite("import ./scarlett1/index.js");

    if (window.__SCARLETT1_IMPORTED__) {
      dwrite("[boot] scarlett1 already imported — skipping");
      return;
    }
    window.__SCARLETT1_IMPORTED__ = true;

    await import("./scarlett1/index.js");
    dwrite("[status] ready ✅");
  } catch (e) {
    dwrite("");
    dwrite("[status] BOOT FAILED ❌");
    dwrite(String(e?.stack || e));
  }
})();
