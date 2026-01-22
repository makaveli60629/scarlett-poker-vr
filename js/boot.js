// js/boot.js
(function(){
  const D = window.SCARLETT_DIAG;
  const scene = document.getElementById("scene");

  function qs(id){ return document.getElementById(id); }

  const btnEnterVR = qs("btnEnterVR");
  const btnTeleport = qs("btnTeleport");
  const btnReset = qs("btnReset");
  const btnHideHUD = qs("btnHideHUD");
  const btnDiag = qs("btnDiag");
  const btnDemo = qs("btnDemo");
  const btnJumbo = qs("btnJumbo");
  const hud = document.getElementById("hud");
  const jumboButtons = document.getElementById("jumboButtons");

  const STATE = window.SCARLETT_STATE = {
    teleportEnabled: true,
    demoEnabled: true,
    spawn: { x: 0, y: 0, z: 6, rotY: 0 },
    seated: false
  };

  function setPressed(btn, pressed){
    if(!btn) return;
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  }


  function hasGamepad(){
    const gps = (navigator.getGamepads && navigator.getGamepads()) || [];
    for (const g of gps){ if(g && g.connected) return true; }
    return false;
  }

  function updateHandsMode(){
    const left = document.getElementById('leftHand');
    const right = document.getElementById('rightHand');
    const gaze = document.getElementById('gazeCursor');
    const anyPad = hasGamepad();

    if(left){
      left.setAttribute('visible', anyPad ? 'true' : 'false');
      left.setAttribute('laser-controls', anyPad ? 'hand: left' : 'hand: left; model: false');
    }
    if(right){
      right.setAttribute('visible', anyPad ? 'true' : 'false');
      right.setAttribute('laser-controls', anyPad ? 'hand: right' : 'hand: right; model: false');
    }
    if(gaze){ gaze.setAttribute('visible', anyPad ? 'false' : 'true'); }

    D.log(anyPad ? '[input] controllers detected ✅' : '[input] NO controllers — gaze UI enabled ✅');
  }

  function enterVR(){
    // A-Frame scene enter
    try {
      if (scene && scene.enterVR) {
        scene.enterVR();
        D.toast("Entering VR…");
      } else {
        D.toast("XR not ready");
      }
    } catch (e){
      D.log("[enterVR] ERROR: " + (e && e.message ? e.message : e));
      D.toast("Enter VR failed");
    }
  }

  function resetToSpawn(){
    const rig = document.getElementById("rig");
    if(!rig) return;
    rig.setAttribute("position", `${STATE.spawn.x} ${STATE.spawn.y} ${STATE.spawn.z}`);
    rig.object3D.rotation.set(0, THREE.MathUtils.degToRad(STATE.spawn.rotY), 0);
    D.toast("Reset to Spawn");
  }

  function toggleHUD(){
    if(!hud) return;
    const hidden = hud.style.display === "none";
    hud.style.display = hidden ? "flex" : "none";
    D.toast(hidden ? "HUD shown" : "HUD hidden");
  }

  function toggleDiag(){
    const p = document.getElementById("diagPanel");
    const show = !(p && p.style.display === "block");
    window.SCARLETT_DIAG.setVisible(show);
    D.toast(show ? "Diagnostics: ON" : "Diagnostics: OFF");
  }

  function toggleTeleport(){
    STATE.teleportEnabled = !STATE.teleportEnabled;
    setPressed(btnTeleport, STATE.teleportEnabled);
    btnTeleport.textContent = `Teleport: ${STATE.teleportEnabled ? "ON" : "OFF"}`;
    D.toast(`Teleport ${STATE.teleportEnabled ? "ON" : "OFF"}`);
  }

  function toggleDemo(){
    STATE.demoEnabled = !STATE.demoEnabled;
    setPressed(btnDemo, STATE.demoEnabled);
    btnDemo.textContent = `Demo: ${STATE.demoEnabled ? "ON" : "OFF"}`;
    D.toast(`Demo ${STATE.demoEnabled ? "ON" : "OFF"}`);
    if (window.SCARLETT_POKER_DEMO && window.SCARLETT_POKER_DEMO.setEnabled) {
      window.SCARLETT_POKER_DEMO.setEnabled(STATE.demoEnabled);
    }
  }

  function toggleJumboButtons(){
    const vis = jumboButtons.getAttribute("visible");
    jumboButtons.setAttribute("visible", !vis);
    D.toast(!vis ? "Jumbotron buttons shown" : "Jumbotron buttons hidden");
  }

  function wireUI(){
    btnEnterVR && btnEnterVR.addEventListener("click", enterVR);
    btnReset && btnReset.addEventListener("click", resetToSpawn);
    btnHideHUD && btnHideHUD.addEventListener("click", toggleHUD);
    btnDiag && btnDiag.addEventListener("click", toggleDiag);
    btnTeleport && btnTeleport.addEventListener("click", toggleTeleport);
    btnDemo && btnDemo.addEventListener("click", toggleDemo);
    btnJumbo && btnJumbo.addEventListener("click", toggleJumboButtons);
    // default
    setPressed(btnTeleport, true);
    setPressed(btnDemo, true);
    window.SCARLETT_DIAG.setVisible(false);
  }

  function onSceneLoaded(){
    D.log("[scene] loaded ✅");
    // build world
    if (window.SCARLETT_WORLD && window.SCARLETT_WORLD.build) {
      D.log("[world] buildWorld()");
      window.SCARLETT_WORLD.build();
      D.log("[world] ready ✅");
    } else {
      D.log("[world] ERROR: SCARLETT_WORLD.build missing");
    }
    // reset spawn
    resetToSpawn();
  }

  scene.addEventListener("loaded", onSceneLoaded);

  updateHandsMode();
  setInterval(updateHandsMode, 1200);

  // Controller hook: allow A button / trigger to toggle teleport or click UI
  scene.addEventListener("enter-vr", ()=>{ D.log("[xr] enter-vr"); });
  scene.addEventListener("exit-vr", ()=>{ D.log("[xr] exit-vr"); });

  wireUI();
})();
