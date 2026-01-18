const BUILD="SCARLETT_BOOT_FULL_v2_2";
(function(){
  const panel=document.getElementById("diagPanel");
  window.__scarlettDiagWrite=function(msg){
    const line="["+new Date().toLocaleTimeString()+"] "+String(msg);
    console.log(line);
    if(panel) panel.textContent+=(panel.textContent?"\n":"")+line;
  };
})();
const d=window.__scarlettDiagWrite;

d("=== SCARLETT ADMIN DIAG REPORT ===");
d("BUILD="+BUILD);
d("HREF="+location.href);
d("secureContext="+window.isSecureContext);
d("ua="+navigator.userAgent);
d("touch="+(("ontouchstart" in window)?"true":"false")+" maxTouchPoints="+(navigator.maxTouchPoints||0));

window.SCARLETT=window.SCARLETT||{};
window.SCARLETT.teleportOn=true;
window.SCARLETT.sticksOn=true;

function $(id){return document.getElementById(id);}
function bindPress(el, fn){
  if(!el) return;
  el.addEventListener("pointerdown", function(e){ try{e.preventDefault();}catch(_){ } fn(e); }, {passive:false});
  el.addEventListener("touchstart", function(e){ try{e.preventDefault();}catch(_){ } fn(e); }, {passive:false});
  el.addEventListener("click", fn);
}

bindPress($("btnDiag"), function(){
  const p=$("diagPanel");
  if(p) p.style.display=(p.style.display==="none"||!p.style.display)?"block":"none";
  d("--- HUD/STATE ---");
  d("teleportOn="+(window.SCARLETT.teleportOn?"true":"false"));
  d("sticksOn="+(window.SCARLETT.sticksOn?"true":"false"));
  d("xr="+(navigator.xr?"true":"false"));
});

bindPress($("btnTeleport"), function(){
  window.SCARLETT.teleportOn=!window.SCARLETT.teleportOn;
  $("btnTeleport").textContent="Teleport: "+(window.SCARLETT.teleportOn?"ON":"OFF");
});

bindPress($("btnSticks"), function(){
  window.SCARLETT.sticksOn=!window.SCARLETT.sticksOn;
  $("btnSticks").textContent="Sticks: "+(window.SCARLETT.sticksOn?"ON":"OFF");
});

bindPress($("btnHideHUD"), function(){
  const hud=$("hud");
  if(!hud) return;
  hud.style.display=(hud.style.display==="none")?"flex":"none";
});

bindPress($("btnHideUI"), function(){
  const ui=$("pipHint");
  if(!ui) return;
  ui.style.display=(ui.style.display==="none")?"block":"none";
});

bindPress($("btnEnterVR"), function(){
  d("[ui] Enter VR pressed");
  if(window.__scarlettEnterVR){
    window.__scarlettEnterVR().catch(function(e){
      d("[xr] Enter VR failed: "+(e&&e.message?e.message:String(e)));
    });
  }else{
    d("[ui] XR not ready yet");
  }
});

(async function(){
  try{
    d("--- PREFLIGHT: main.js ---");
    if(window.__SCARLETT_MAIN_IMPORTED){ d("[boot] main already imported"); return; }
    window.__SCARLETT_MAIN_IMPORTED=true;
    await import("./main.js");
    d("[status] ready ✅");
  }catch(e){
    d("[status] BOOT FAILED ❌");
    d(String(e&&e.stack?e.stack:e));
  }
})();
