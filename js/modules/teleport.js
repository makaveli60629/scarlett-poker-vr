// Simple teleport using controller raycaster hits on .teleTarget

export class Teleport {
  constructor({ rig, scene, diag }) {
    this.rig = rig;
    this.scene = scene;
    this.diag = diag || (() => {});
    this.enabled = true;

    this._onClick = this._onClick.bind(this);
  }

  install() {
    // Listen for A-Frame raycaster intersections via controller trigger.
    // laser-controls emit "triggerdown" on many controllers.
    const left = document.getElementById("leftHand");
    const right = document.getElementById("rightHand");

    left?.addEventListener("triggerdown", this._onClick);
    right?.addEventListener("triggerdown", this._onClick);

    // Also allow mouse click on teleport pads (desktop testing)
    this.scene?.addEventListener("click", (e) => {
      if (!this.enabled) return;
      const target = e?.target;
      if (target && target.classList && target.classList.contains("teleTarget")) {
        const p = target.getAttribute("position");
        this._teleportTo(p);
      }
    });

    this.diag("[teleport] module installed ✅");
  }

  setEnabled(v) {
    this.enabled = !!v;
  }

  _onClick(e) {
    if (!this.enabled) return;
    const hand = e?.target;
    if (!hand) return;

    const ray = hand.components?.raycaster;
    const inter = ray?.intersections?.[0];
    const hitEl = inter?.object?.el;

    if (hitEl && hitEl.classList.contains("teleTarget")) {
      const p = hitEl.getAttribute("position");
      this._teleportTo(p);
    }
  }

  _teleportTo(p) {
    if (!p) return;
    // maintain y=0 for rig base, camera height is inside rig
    this.rig.setAttribute("position", `${p.x} 0 ${p.z}`);
    this.diag(`[teleport] to (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) ✅`);
  }
}
