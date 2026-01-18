const BUILD="SCARLETT_BOOT_FULL_v2_5_NEXT";
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
window.SCARLETT.mobileMove={x:0,y:0};
window.SCARLETT.spawnId=0;

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

bindPress($("btnRespawn"), function(){
  window.SCARLETT.spawnId = (window.SCARLETT.spawnId+1)%3;
  d("[spawn] cycling to pad "+window.SCARLETT.spawnId);
  if(window.__scarlettRespawn) window.__scarlettRespawn(window.SCARLETT.spawnId);
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
  }else d("[ui] XR not ready yet");
});

// Virtual joystick
(function(){
  const wrap=$("joyWrap"), stick=$("joyStick");
  if(!wrap || !stick) return;
  let active=false, pid=null, cx=0, cy=0;

  function setStick(nx, ny){
    window.SCARLETT.mobileMove.x = nx;
    window.SCARLETT.mobileMove.y = ny;
    stick.style.transform = "translate("+(nx*44)+"px,"+(ny*44)+"px)";
  }
  function center(){ active=false; pid=null; setStick(0,0); stick.style.transform="translate(0px,0px)"; }

  wrap.addEventListener("pointerdown", function(e){
    active=true; pid=e.pointerId;
    const r=wrap.getBoundingClientRect();
    cx=r.left + r.width/2; cy=r.top + r.height/2;
    wrap.setPointerCapture(pid);
    e.preventDefault();
  }, {passive:false});

  wrap.addEventListener("pointermove", function(e){
    if(!active || e.pointerId!==pid) return;
    const dx=e.clientX-cx, dy=e.clientY-cy;
    const max=60;
    const nx=Math.max(-1, Math.min(1, dx/max));
    const ny=Math.max(-1, Math.min(1, dy/max));
    setStick(nx, ny);
    e.preventDefault();
  }, {passive:false});

  wrap.addEventListener("pointerup", function(e){ if(e.pointerId===pid) center(); }, {passive:true});
  wrap.addEventListener("pointercancel", function(e){ if(e.pointerId===pid) center(); }, {passive:true});
})();

(async function(){
  try{
    d("--- PREFLIGHT: main.js ---");
    await import("./main.js");
    d("[status] ready ✅");
  }catch(e){
    d("[status] BOOT FAILED ❌");
    d(String(e&&e.stack?e.stack:e));
  }
})();