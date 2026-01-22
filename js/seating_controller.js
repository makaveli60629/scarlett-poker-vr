// js/seating_controller.js
// Simple "sit" / "stand" controller:
// - Look at a chair and tap/trigger to sit
// - Tap/trigger again to stand (returns to nearest safe spot)
// This is intentionally lightweight and robust.
(function(){
  const D = window.SCARLETT_DIAG;
  const rigEl = () => document.getElementById("rig");
  const camEl = () => document.getElementById("camera");

  const STATE = window.SCARLETT_STATE || (window.SCARLETT_STATE = {});
  STATE.seated = false;

  function findNearestSeatAnchor(pos){
    const anchors = Array.from(document.querySelectorAll(".SeatAnchor"));
    let best = null;
    let bestD = 1e9;
    for (const a of anchors){
      const o = a.object3D;
      if(!o) continue;
      const wp = new THREE.Vector3();
      o.getWorldPosition(wp);
      const d = wp.distanceTo(pos);
      if(d < bestD){
        bestD = d;
        best = a;
      }
    }
    return { anchor: best, dist: bestD };
  }

  function sitAt(anchorEl){
    const rig = rigEl();
    if(!rig || !anchorEl) return;
    const wp = new THREE.Vector3();
    const wq = new THREE.Quaternion();
    anchorEl.object3D.getWorldPosition(wp);
    anchorEl.object3D.getWorldQuaternion(wq);

    // rig base goes to anchor, camera height remains but feels seated due to anchor height
    rig.object3D.position.set(wp.x, 0, wp.z);
    // face forward (use anchor's yaw)
    const e = new THREE.Euler().setFromQuaternion(wq, "YXZ");
    rig.object3D.rotation.set(0, e.y, 0);

    STATE.seated = true;
    D.toast("Seated (movement locked)");
  }

  function standUp(){
    const rig = rigEl();
    if(!rig) return;
    // stand to a safe ring around table
    const p = rig.object3D.position;
    const out = new THREE.Vector3(p.x, 0, p.z);
    if(out.length() < 4.4) out.setLength(4.6);
    rig.object3D.position.set(out.x, 0, out.z);
    STATE.seated = false;
    D.toast("Standing (movement enabled)");
  }

  function tryToggleSeat(){
    if(STATE.seated){
      standUp();
      return;
    }
    const cam = camEl();
    if(!cam) return;
    const c = cam.getObject3D("camera");
    if(!c) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0,0), c);

    // detect chair entities
    const chairs = Array.from(document.querySelectorAll(".chair"));
    const meshes = [];
    for(const ch of chairs){
      const m = ch.getObject3D("mesh");
      if(m) meshes.push({ el: ch, mesh: m });
      // also allow submeshes created by primitives
      const obj = ch.object3D;
      obj.traverse(o=>{ if(o.isMesh) meshes.push({ el: ch, mesh: o }); });
    }

    // find closest hit
    let best = null;
    for(const {el, mesh} of meshes){
      const hits = raycaster.intersectObject(mesh, true);
      if(hits && hits.length){
        const h = hits[0];
        if(!best || h.distance < best.distance) best = { el, distance: h.distance };
      }
    }
    if(!best || best.distance > 4.0) return; // must be close enough

    const anchor = best.el.querySelector(".SeatAnchor");
    if(anchor) sitAt(anchor);
  }

  // bind on pointer and controller triggers (when near chair)
  window.addEventListener("dblclick", tryToggleSeat);
  window.addEventListener("keydown", (e)=>{ if(e.code==="KeyF") tryToggleSeat(); });

  const lh = document.getElementById("leftHand");
  const rh = document.getElementById("rightHand");
  const bind = (h)=>{ if(!h) return; h.addEventListener("gripdown", tryToggleSeat); h.addEventListener("abuttondown", tryToggleSeat); h.addEventListener("bbuttondown", tryToggleSeat); };
  bind(lh); bind(rh);

  D.log("[seating] ready ✅ (dbl-tap or F or controller grip)");
})();
