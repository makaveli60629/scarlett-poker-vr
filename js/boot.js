// SCARLETT BOOT — QUEST SAFE
const BUILD = "SCARLETT_BOOT_QUEST_SAFE_v2_0";

(function initDiag(){
  const panel = document.getElementById("diagPanel");
  window.__scarlettDiagWrite = function(msg){
    const line = "[" + new Date().toLocaleTimeString() + "] " + msg;
    console.log(line);
    if(panel){
      panel.textContent += (panel.textContent ? "\n" : "") + line;
    }
  };
})();

const dwrite = window.__scarlettDiagWrite;

dwrite("[status] booting…");
dwrite("BUILD=" + BUILD);

window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.teleportOn = false;
window.SCARLETT.sticksOn = true;
window.SCARLETT.audioOn = true;

// HUD buttons
function $(id){ return document.getElementById(id); }

$("btnDiag").onclick = function(){
  dwrite("=== SCARLETT ADMIN DIAG REPORT ===");
  dwrite("HREF=" + location.href);
  dwrite("secureContext=" + window.isSecureContext);
  dwrite("ua=" + navigator.userAgent);
};

$("btnTeleport").onclick = function(){
  window.SCARLETT.teleportOn = !window.SCARLETT.teleportOn;
  $("btnTeleport").textContent =
    "Teleport: " + (window.SCARLETT.teleportOn ? "ON" : "OFF");
};

$("btnSticks").onclick = function(){
  window.SCARLETT.sticksOn = !window.SCARLETT.sticksOn;
  $("btnSticks").textContent =
    "Sticks: " + (window.SCARLETT.sticksOn ? "ON" : "OFF");
};

$("btnAudio").onclick = function(){
  window.SCARLETT.audioOn = !window.SCARLETT.audioOn;
  $("btnAudio").textContent =
    "Audio: " + (window.SCARLETT.audioOn ? "ON" : "OFF");
};

$("btnHideHUD").onclick = function(){
  $("hud").style.display =
    $("hud").style.display === "none" ? "flex" : "none";
};

$("btnHideUI").onclick = function(){
  $("pipHint").style.display =
    $("pipHint").style.display === "none" ? "block" : "none";
};

$("btnEnterVR").onclick = function(){
  if(window.__scarlettEnterVR){
    window.__scarlettEnterVR();
  }else{
    dwrite("[xr] engine not ready");
  }
};

// guarded import
(async function(){
  try{
    dwrite("");
    dwrite("--- PREFLIGHT: index.js ---");
    dwrite("import ./scarlett1/index.js");

    if(window.__SCARLETT1_IMPORTED){
      dwrite("[boot] already imported");
      return;
    }
    window.__SCARLETT1_IMPORTED = true;

    await import("./scarlett1/index.js");
    dwrite("[status] ready ✅");
  }catch(e){
    dwrite("[status] BOOT FAILED ❌");
    dwrite(String(e));
  }
})();
