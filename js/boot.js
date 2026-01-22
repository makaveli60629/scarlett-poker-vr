// js/boot.js
(function () {
  const BUILD = "SCARLETT_FULL_1_6_BOOTSAFE";
  const t0 = performance.now();

  const D = (window.SCARLETT_DIAG = window.SCARLETT_DIAG || {});
  D._lines = D._lines || [];
  D._panel = null;

  function panel(){
    if (D._panel) return D._panel;
    D._panel = document.getElementById("diagPanel");
    return D._panel;
  }

  function writeLine(s){
    D._lines.push(s);
    const p = panel();
    if (p && p.style.display !== "none"){
      p.textContent = D._lines.join("\n");
    }
  }

  D.log = D.log || function(s){ writeLine(s); };
  D.warn = D.warn || function(s){ writeLine(s); };
  D.toast = D.toast || function(_s){};

  function now() {
    return ((performance.now() - t0) / 1000).toFixed(3);
  }
  function log(s) {
    D.log(`[${now()}] ${s}`);
  }

  function wireHud(){
    const hud = document.getElementById("hud");
    const btnHideHUD = document.getElementById("btnHideHUD");
    const btnDiag = document.getElementById("btnDiag");
    const btnTeleport = document.getElementById("btnTeleport");
    const btnReset = document.getElementById("btnReset");

    if (btnHideHUD){
      btnHideHUD.onclick = ()=>{ if(hud) hud.style.display = "none"; };
    }
    if (btnDiag){
      btnDiag.onclick = ()=>{
        const p = panel();
        if(!p) return;
        p.style.display = (p.style.display === "none" || !p.style.display) ? "block" : "none";
        if (p.style.display === "block") p.textContent = D._lines.join("\n");
      };
    }
    if (btnTeleport){
      btnTeleport.onclick = ()=>{
        const on = btnTeleport.getAttribute("aria-pressed") !== "true";
        btnTeleport.setAttribute("aria-pressed", on ? "true":"false");
        btnTeleport.textContent = on ? "Teleport: ON" : "Teleport: OFF";
        window.SCARLETT_TELEPORT_ON = on;
      };
    }
    if (btnReset){
      btnReset.onclick = ()=>{
        const rig = document.getElementById("rig");
        if(rig) rig.setAttribute("position","0 0 10");
      };
    }
  }

  async function enterVR(){
    try{
      const scene = document.getElementById("scene");
      if(scene && scene.enterVR) scene.enterVR();
    }catch(e){}
  }

  function wireEnterVR(){
    const btn = document.getElementById("btnEnterVR");
    if(btn) btn.onclick = enterVR;
  }

  wireHud();
  wireEnterVR();

  log(`booting… BUILD=${BUILD}`);

  const scene = document.getElementById("scene");
  if (!scene) {
    log("[boot] ERROR: #scene missing");
    return;
  }

  function tryBuildWorld() {
    if (!window.SCARLETT_WORLD || typeof window.SCARLETT_WORLD.build !== "function") {
      return false;
    }
    try {
      window.SCARLETT_WORLD.build();
      return true;
    } catch (e) {
      log("[world] build threw: " + (e && e.message ? e.message : e));
      return false;
    }
  }

  function startAfterLoaded() {
    let tries = 0;
    const maxTries = 160; // ~8s
    const iv = setInterval(() => {
      tries++;
      const ok = tryBuildWorld();
      if (ok) {
        log("[world] buildWorld() ✅");
        clearInterval(iv);
        return;
      }
      if (tries === 1) log("[world] waiting for SCARLETT_WORLD.build…");
      if (tries >= maxTries) {
        log("[world] ERROR: SCARLETT_WORLD.build missing (timeout)");
        clearInterval(iv);
      }
    }, 50);
  }

  if (scene.hasLoaded) {
    log("[scene] already loaded ✅");
    startAfterLoaded();
  } else {
    scene.addEventListener("loaded", () => {
      log("[scene] loaded ✅");
      startAfterLoaded();
    });
  }
})();
