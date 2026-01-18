const BUILD="SCARLETT_BOOT_COMFORT_v2_1";
(function(){const p=document.getElementById("diagPanel");
window.__scarlettDiagWrite=function(m){const l="["+new Date().toLocaleTimeString()+"] "+m;
console.log(l);if(p)p.textContent+=(p.textContent?"\n":"")+l;};})();
const d=window.__scarlettDiagWrite;
d("[status] booting…");
(async()=>{
 try{
  await import("./scarlett1/index.js");
  d("[status] ready ✓");
 }catch(e){
  d("[BOOT FAIL] "+e);
 }
})();
