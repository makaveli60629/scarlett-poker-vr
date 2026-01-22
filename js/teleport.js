// js/teleport.js
(function(){
  const D = window.SCARLETT_DIAG;
  const scene = document.getElementById("scene");
  const rig = () => document.getElementById("rig");

  function getState(){ return window.SCARLETT_STATE || { teleportEnabled: true }; }

  function teleportTo(point){
    const r = rig();
    if(!r || !point) return;
    // keep y at 0 (rig base)
    r.object3D.position.set(point.x, 0, point.z);
    D.toast("Teleported");
  }

  // Use raycaster intersection from controllers
  function bindControllerTeleport(handId){
    const hand = document.getElementById(handId);
    if(!hand) return;

    function tryTeleport(){
      const st = getState();
      if(!st.teleportEnabled) return;

      const rc = hand.components && hand.components.raycaster;
      if(!rc) return;
      const inter = rc.intersections && rc.intersections[0];
      if(!inter) return;
      teleportTo(inter.point);
    }

    // "triggerdown" is emitted by laser-controls
    hand.addEventListener("triggerdown", tryTeleport);
    // some devices emit "click"
    hand.addEventListener("click", tryTeleport);
  }

  bindControllerTeleport("leftHand");
  bindControllerTeleport("rightHand");

  // Touch / mouse teleport: tap the floor while teleport enabled
  function onPointer(e){
    const st = getState();
    if(!st.teleportEnabled) return;

    // Ignore if interacting with HUD
    const path = e.composedPath ? e.composedPath() : [];
    if (path.some(n => n && n.id === "hud")) return;

    // raycast from camera center
    const camEl = document.getElementById("camera");
    if(!camEl) return;
    const camObj = camEl.getObject3D("camera");
    if(!camObj) return;

    const mouse = new THREE.Vector2(0,0); // center
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camObj);

    const floorEl = document.querySelector(".teleportable");
    if(!floorEl) return;
    const mesh = floorEl.getObject3D("mesh");
    if(!mesh) return;

    const hits = raycaster.intersectObject(mesh, true);
    if(!hits || !hits.length) return;

    teleportTo(hits[0].point);
  }

  window.addEventListener("pointerup", onPointer, {passive:true});

  D.log("[teleport] ON");
})();
