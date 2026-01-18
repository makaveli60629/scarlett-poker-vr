// /js/modules/hud_diag.js
export function installHud({ THREE, renderer, rig, camera, dwrite, getTeleportEnabled, setTeleportEnabled, resetToSpawn }){
  const hud = document.getElementById("hud");
  const diag = document.getElementById("diag");
  const btnEnterVR = document.getElementById("btnEnterVR");
  const btnTeleport = document.getElementById("btnTeleport");
  const btnReset = document.getElementById("btnReset");
  const btnHide = document.getElementById("btnHide");
  const btnDiag = document.getElementById("btnDiag");

  function syncTeleportLabel(){
    btnTeleport.textContent = `Teleport: ${getTeleportEnabled() ? "ON" : "OFF"}`;
  }
  syncTeleportLabel();

  btnHide.addEventListener("click", ()=>{
    diag.classList.toggle("hidden");
  });

  btnDiag.addEventListener("click", ()=>{
    dwrite("--- DIAG SNAPSHOT ---");
    dwrite(`rig=(${rig.position.x.toFixed(2)},${rig.position.y.toFixed(2)},${rig.position.z.toFixed(2)})`);
    dwrite(`yaw=${rig.rotation.y.toFixed(3)} presentingXR=${String(renderer.xr.isPresenting)}`);
    dwrite(`teleport=${String(getTeleportEnabled())}`);
  });

  btnReset.addEventListener("click", ()=>resetToSpawn());

  btnTeleport.addEventListener("click", ()=>{
    setTeleportEnabled(!getTeleportEnabled());
    syncTeleportLabel();
  });

  btnEnterVR.addEventListener("click", async ()=>{
    if (!navigator.xr){
      dwrite("[xr] navigator.xr not available");
      return;
    }
    try{
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures:["local-floor","bounded-floor","hand-tracking","layers"]
      });
      renderer.xr.setReferenceSpaceType("local-floor");
      await renderer.xr.setSession(session);
      dwrite("[xr] session started ✅");
    }catch(err){
      dwrite("[xr] requestSession failed: " + (err?.message || err));
    }
  });
}
