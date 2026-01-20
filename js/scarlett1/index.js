const BUILD = "SCARLETT_UPDATE_21_FULL_GH";
import { createDiag, hookDiagUI } from "../modules/diag.js";
import { initWorld } from "../world.js";
import { installTeleport } from "../modules/teleport.js";
import { installMovement } from "../modules/movement.js";
function qs(id){ return document.getElementById(id); }

async function main(){
  const diag=createDiag(); hookDiagUI(diag);
  diag.write(`[0.000] booting… BUILD=${BUILD}`);
  diag.write(`[0.001] href=${location.href}`);
  diag.write(`[0.002] secureContext=${window.isSecureContext}`);
  diag.write(`[0.003] ua=${navigator.userAgent}`);
  diag.write(`[0.004] xr=${!!navigator.xr}`);

  const scene=document.querySelector("a-scene");
  const rig=qs("rig"); const camera=qs("camera");
  if(!scene||!rig||!camera){ diag.write("[fatal] missing scene/rig/camera ❌"); return; }

  await new Promise((res)=>{ if(scene.renderer) return res(); scene.addEventListener("renderstart",()=>res(),{once:true}); });
  diag.write("[scene] renderstart ✅");

  rig.object3D.position.set(0,0,0);
  rig.object3D.rotation.set(0,0,0);
  diag.write("[spawn] rig=(0,0,0) facing -Z ✅");

  initWorld({diag});
  installTeleport({scene,rig,diag});
  installMovement({rig,camera,diag});

  qs("btnEnterVR")?.addEventListener("click", async ()=>{
    try{ diag.write("[xr] Enter VR clicked…"); await scene.enterVR(); diag.write("[xr] enterVR ✅"); }
    catch(e){ diag.write("[xr] enterVR failed ❌ "+(e?.message||e)); }
  });
  scene.addEventListener("enter-vr", ()=>diag.write("[xr] enter-vr event ✅"));
  scene.addEventListener("exit-vr", ()=>diag.write("[xr] exit-vr event"));
  diag.write("[ready] ✅");
}
main().catch(e=>{ try{ window.__scarlettDiagWrite?.("[fatal] "+(e?.message||e)); }catch(_){} });
