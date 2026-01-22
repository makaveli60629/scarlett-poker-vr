(function(){
  function getRig(){ return document.getElementById("rig"); }
  function doTeleportFromRay(el){
    const rig = getRig();
    if (!rig) return;
    if (window.SCARLETT && window.SCARLETT.teleportEnabled === false) return;
    const rc = el.components.raycaster;
    const hits = rc?.intersections;
    if (!hits || !hits.length) return;
    const p = hits[0].point;
    if (!p) return;
    rig.object3D.position.set(p.x, 0, p.z);
  }
  AFRAME.registerComponent("teleport-ray", {
    schema: { hand: { default: "left" } },
    init: function(){
      const el = this.el;
      const fire = () => doTeleportFromRay(el);
      el.addEventListener("triggerdown", fire);
      el.addEventListener("mousedown", fire);
    }
  });
})();
