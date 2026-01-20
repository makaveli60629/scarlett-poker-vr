// /js/teleport.js — simple, robust teleport using controller raycaster intersections
AFRAME.registerComponent("teleport-ray", {
  init() {
    this.rig = document.getElementById("rig");
    this.raycaster = this.el.components.raycaster;
    this.tmp = new THREE.Vector3();
    this.onSelect = this.onSelect.bind(this);

    // Works across devices (Quest triggers, desktop click)
    this.el.addEventListener("triggerdown", this.onSelect);
    this.el.addEventListener("click", this.onSelect);
    this.el.addEventListener("gripdown", this.onSelect);
    this.el.addEventListener("abuttondown", this.onSelect);
    this.el.addEventListener("xbuttondown", this.onSelect);
  },

  onSelect() {
    if (!window.SCARLETT?.teleportEnabled) return;
    if (!this.rig) return;

    const rc = this.el.components.raycaster;
    if (!rc) return;

    const hits = rc.intersections;
    if (!hits || !hits.length) return;

    const hit = hits[0];
    if (!hit?.point) return;

    // Move rig to hit point, keep Y at 0 (local-floor)
    const pos = this.rig.object3D.position;
    pos.set(hit.point.x, 0, hit.point.z);
    this.rig.object3D.position.copy(pos);
  }
});
