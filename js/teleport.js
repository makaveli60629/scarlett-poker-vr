// /js/teleport.js — robust teleport + visible floor reticle
AFRAME.registerComponent("teleport-ray", {
  schema: { hand: { type: "string", default: "" } },

  init() {
    this.rig = document.getElementById("rig");
    this.rc = this.el.components.raycaster;

    // Reticle shown on valid hits
    this.reticle = document.createElement("a-ring");
    this.reticle.setAttribute("rotation", "-90 0 0");
    this.reticle.setAttribute("radius-inner", "0.12");
    this.reticle.setAttribute("radius-outer", "0.18");
    this.reticle.setAttribute("material", "color:#7ad3ff; opacity:0.9; emissive:#7ad3ff; emissiveIntensity:0.45; side:double");
    this.reticle.setAttribute("visible", "false");
    this.el.sceneEl.appendChild(this.reticle);

    this.onSelect = this.onSelect.bind(this);

    this.el.addEventListener("triggerdown", this.onSelect);
    this.el.addEventListener("click", this.onSelect);
    this.el.addEventListener("gripdown", this.onSelect);
    this.el.addEventListener("abuttondown", this.onSelect);
    this.el.addEventListener("xbuttondown", this.onSelect);
  },

  tick() {
    const rc = this.el.components.raycaster;
    const hits = rc?.intersections;
    if (!hits || !hits.length){
      this.reticle.setAttribute("visible", "false");
      return;
    }
    const hit = hits[0];
    if (!hit?.point){
      this.reticle.setAttribute("visible", "false");
      return;
    }
    this.reticle.object3D.position.set(hit.point.x, 0.02, hit.point.z);
    this.reticle.setAttribute("visible", "true");
  },

  onSelect() {
    if (!window.SCARLETT?.teleportEnabled) return;
    if (!this.rig) return;

    const rc = this.el.components.raycaster;
    const hits = rc?.intersections;
    if (!hits || !hits.length) return;

    const hit = hits[0];
    if (!hit?.point) return;

    this.rig.object3D.position.set(hit.point.x, 0, hit.point.z);
  }
});
