const BUILD="SCARLETT_BOOT_QUEST_SAFE_v2_0";
(function(){const p=document.getElementById("diagPanel");
window.__scarlettDiagWrite=function(m){const l="["+new Date().toLocaleTimeString()+"] "+m;
console.log(l);if(p)p.textContent+=(p.textContent?"\n":"")+l;};})();
const d=window.__scarlettDiagWrite;
d("[status] booting...");
window.SCARLETT={teleportOn:false,sticksOn:true,audioOn:true};
function $(i){return document.getElementById(i);}
$("btnTeleport").onclick=()=>{$("btnTeleport").textContent="Teleport: "+(SCARLETT.teleportOn=!SCARLETT.teleportOn?"ON":"OFF");};
$("btnSticks").onclick=()=>{$("btnSticks").textContent="Sticks: "+(SCARLETT.sticksOn=!SCARLETT.sticksOn?"ON":"OFF");};
$("btnAudio").onclick=()=>{$("btnAudio").textContent="Audio: "+(SCARLETT.audioOn=!SCARLETT.audioOn?"ON":"OFF");};
$("btnEnterVR").onclick=()=>window.__scarlettEnterVR&&window.__scarlettEnterVR();
$("btnDiag").onclick=()=>{d("=== SCARLETT ADMIN DIAG REPORT ===");d("HREF="+location.href);};
(async()=>{try{if(window.__SCARLETT1_IMPORTED)return;window.__SCARLETT1_IMPORTED=true;
await import("./scarlett1/index.js");d("[status] ready ✓");}catch(e){d("[BOOT FAIL] "+e);}})();
