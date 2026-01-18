// SCARLETT BOOT — v1.8 Hotfix (GitHub Pages relative paths + always-on diag)
// BUILD: SCARLETT_BOOT_ULTIMATE_v1_8

const BUILD = "SCARLETT_BOOT_ULTIMATE_v1_8";

(function initDiag(){
  const panel = document.getElementById("diagPanel");
  const lines = [];

  function push(line){
    lines.push(line);
    // keep last 220 lines
    while(lines.length > 220) lines.shift();
    if (panel) panel.textContent = lines.join("\n");
  }

  window.__scarlettDiagWrite = (msg) => {
    const line = `[${new Date().toLocaleTimeString()}] ${String(msg)}`;
    console.log(line);
    push(line);
  };

  window.__scarlettDiag = () => {
    const w = window.__scarlettDiagWrite;
    w("=== SCARLETT ADMIN DIAG REPORT ===");
    w(`BUILD=${BUILD}`);
    w(`HREF=${location.href}`);
    w(`secureContext=${String(window.isSecureContext)}`);
    w(`ua=${navigator.userAgent}`);
    w(`touch=${"ontouchstart" in window} maxTouchPoints=${navigator.maxTouchPoints || 0}`);

    const ids = ["btnEnterVR","btnHideHUD","btnHideUI","btnTeleport","btnDiag","btnSticks","btnAudio"];
    w("");
    w("--- HUD / TOUCH ---");
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) { w(`${id}=MISSING`); continue; }
      const r = el.getBoundingClientRect();
      const midX = r.left + r.width/2, midY = r.top + r.height/2;
      const top = document.elementFromPoint(midX, midY);
      w(`${id}=OK blocked=${top!==el} top=${top ? (top.tagName.toLowerCase() + (top.id?('#'+top.id):'') + (top.className?('.'+String(top.className).trim().split(/\s+/).join('.')):'')) : 'null'}`);
    }
  };

  // show boot line immediately
  window.__scarlettDiagWrite(`[status] booting…`);
})();

const dwrite = (m)=>{ try{ window.__scarlettDiagWrite?.(m);}catch(_){ console.log(m);} };

window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BOOT_BUILD = BUILD;

// ---- HUD wiring ----
const $ = (id)=>document.getElementById(id);
let teleportOn=false, sticksOn=true, audioOn=true, hudHidden=false, uiHidden=false;

function setBtn(id, text){ const b=$(id); if(b) b.textContent=text; }

$("btnDiag")?.addEventListener("click", ()=>window.__scarlettDiag?.());

$("btnTeleport")?.addEventListener("click", ()=>{
  teleportOn=!teleportOn;
  window.SCARLETT.teleportOn=teleportOn;
  setBtn("btnTeleport", `Teleport: ${teleportOn?"ON":"OFF"}`);
  dwrite(`[ui] teleport=${teleportOn?"ON":"OFF"}`);
});

$("btnSticks")?.addEventListener("click", ()=>{
  sticksOn=!sticksOn;
  window.SCARLETT.sticksOn=sticksOn;
  setBtn("btnSticks", `Sticks: ${sticksOn?"ON":"OFF"}`);
  dwrite(`[ui] sticks=${sticksOn?"ON":"OFF"}`);
});

$("btnAudio")?.addEventListener("click", ()=>{
  audioOn=!audioOn;
  window.SCARLETT.audioOn=audioOn;
  setBtn("btnAudio", `Audio: ${audioOn?"ON":"OFF"}`);
  dwrite(`[ui] audio=${audioOn?"ON":"OFF"}`);
  try{ window.__scarlettAudioSetEnabled?.(audioOn); }catch(_){ }
});

$("btnHideHUD")?.addEventListener("click", ()=>{
  hudHidden=!hudHidden;
  const hud = $("hud");
  if (hud) hud.style.display = hudHidden ? "none" : "flex";
});

$("btnHideUI")?.addEventListener("click", ()=>{
  uiHidden=!uiHidden;
  const hint = $("pipHint");
  if (hint) hint.style.display = uiHidden ? "none" : "block";
});

$("btnEnterVR")?.addEventListener("click", async ()=>{
  try{
    if (window.__scarlettEnterVR) await window.__scarlettEnterVR();
    else dwrite("[xr] engine not ready yet");
  }catch(e){
    dwrite(`[xr] EnterVR failed: ${e?.message||e}`);
  }
});

(async function bootImport(){
  try{
    dwrite("");
    dwrite("--- PREFLIGHT: index.js ---");
    dwrite("import ./scarlett1/index.js");

    if (window.__SCARLETT1_IMPORTED__) {
      dwrite("[status] boot already imported — skipping");
      return;
    }
    window.__SCARLETT1_IMPORTED__ = true;

    // IMPORTANT: relative import so GitHub Pages subpath works
    await import("./scarlett1/index.js");

    dwrite("[status] ready ✅");
  }catch(e){
    dwrite("");
    dwrite("[status] BOOT FAILED ❌");
    dwrite(String(e?.stack || e?.message || e));
  }
})();
