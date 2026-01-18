import { diagWrite } from "./diagnostics.js";
export function initEnterVR(){
  const btn = document.getElementById("btnEnterVR");
  const scene = document.querySelector("a-scene");
  btn?.addEventListener("click", ()=>{
    try{
      diagWrite("[vr] enter requested…");
      if (scene?.enterVR) scene.enterVR();
      else diagWrite("[vr] scene.enterVR missing");
    }catch(e){
      diagWrite("[vr] enter failed: " + (e?.message||e));
    }
  });
}
