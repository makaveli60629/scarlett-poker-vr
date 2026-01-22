// js/boot.js
(function(){
  const diagPanel = document.getElementById("diagPanel");

  const D = window.SCARLETT_DIAG = {
    t0: performance.now(),
    lines: [],
    log(msg){
      const t = ((performance.now()-D.t0)/1000).toFixed(3);
      const line = `[${t}] ${msg}`;
      D.lines.push(line);
      if (D.lines.length > 220) D.lines.shift();
      if (diagPanel) diagPanel.textContent = D.lines.join("\n");
      try{ console.log(line); }catch(e){}
    }
  };

  D.log("booting…");
  D.log("BUILD=SCARLETT_FULL_2_0_BOOTSAFE");

  const btnEnterVR = document.getElementById("btnEnterVR");
  const btnTeleport = document.getElementById("btnTeleport");
  const btnReset = document.getElementById("btnReset");
  const btnHideHUD = document.getElementById("btnHideHUD");
  const btnDiag = document.getElementById("btnDiag");
  const btnDemo = document.getElementById("btnDemo");
  const hud = document.getElementById("hud");

  window.SCARLETT_FLAGS = { teleport: true, demo: true };

  btnTeleport?.addEventListener("click", ()=>{
    window.SCARLETT_FLAGS.teleport = !window.SCARLETT_FLAGS.teleport;
    btnTeleport.setAttribute("aria-pressed", window.SCARLETT_FLAGS.teleport ? "true":"false");
    btnTeleport.textContent = window.SCARLETT_FLAGS.teleport ? "Teleport: ON" : "Teleport: OFF";
    D.log(`[teleport] ${window.SCARLETT_FLAGS.teleport ? "ON" : "OFF"}`);
  });

  btnDemo?.addEventListener("click", ()=>{
    window.SCARLETT_FLAGS.demo = !window.SCARLETT_FLAGS.demo;
    btnDemo.setAttribute("aria-pressed", window.SCARLETT_FLAGS.demo ? "true":"false");
    btnDemo.textContent = window.SCARLETT_FLAGS.demo ? "Demo: ON" : "Demo: OFF";
    D.log(`[demo] ${window.SCARLETT_FLAGS.demo ? "ON" : "OFF"}`);
  });

  btnDiag?.addEventListener("click", ()=>{
    diagPanel.style.display = (diagPanel.style.display === "block") ? "none" : "block";
  });

  btnHideHUD?.addEventListener("click", ()=>{
    const isHidden = hud.style.display === "none";
    hud.style.display = isHidden ? "block" : "none";
    const pads = document.getElementById("pads");
    if (pads) pads.style.display = "block";
  });

  function resetToSpawn(){
    const rig = document.getElementById("rig");
    if (!rig) return;
    rig.setAttribute("position", "0 0 18");
    rig.setAttribute("rotation", "0 180 0");
    D.log("[spawn] reset to safe spawn ✅");
  }
  btnReset?.addEventListener("click", resetToSpawn);

  btnEnterVR?.addEventListener("click", async ()=>{
    const scene = document.querySelector("a-scene");
    if (!scene) return;
    try{
      D.log("[vr] enter requested…");
      await scene.enterVR();
      D.log("[vr] enterVR ✅");
    }catch(e){
      D.log("[vr] enterVR FAILED: " + (e && e.message ? e.message : e));
    }
  });

  const scene = document.getElementById("scene");
  scene.addEventListener("loaded", ()=>{
    D.log("[scene] loaded ✅");
    try{
      if (window.SCARLETT_WORLD && typeof window.SCARLETT_WORLD.build === "function") {
        window.SCARLETT_WORLD.build();
        D.log("[world] buildWorld() ✅");
      } else {
        D.log("[world] ERROR: SCARLETT_WORLD.build missing");
      }
    }catch(e){
      D.log("[world] build exception: " + (e && e.message ? e.message : e));
    }
  });

  // Failsafe build retry for slower mobiles
  let tries = 0;
  const iv = setInterval(()=>{
    tries++;
    if (window.SCARLETT_WORLD && typeof window.SCARLETT_WORLD.build === "function") {
      try{
        window.SCARLETT_WORLD.build();
        D.log("[world] auto-build executed ✅");
        clearInterval(iv);
      }catch(e){}
    }
    if (tries > 120) clearInterval(iv);
  }, 120);

  try{ D.log("xr=" + !!navigator.xr); }catch(e){}
})();
