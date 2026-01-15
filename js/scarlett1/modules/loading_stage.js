// /js/scarlett1/modules/loading_stage.js
export class LoadingStage {
  constructor({ THREE, scene, rig, camera }) {
    this.THREE = THREE;
    this.scene = scene;
    this.rig = rig;
    this.camera = camera;
    this.root = null;
  }

  async init() {
    const THREE = this.THREE;

    this.root = new THREE.Group();
    this.root.name = "LoadingStage";
    this.root.visible = true;

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.1),
      new THREE.MeshBasicMaterial({ color: 0x0b0f14 })
    );
    panel.position.set(0, 1.55, -2.3);

    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x33ff66 })
    );
    bar.position.set(0, 1.22, -2.29);

    const bar2 = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x55aaff })
    );
    bar2.position.set(0, 0.98, -2.29);

    this.root.add(panel, bar, bar2);
    this.camera.add(this.root); // lock to view
  }

  show(title, subtitle) {
    // (Text is intentionally “bars only” for Quest safety; no sprite crash.)
    if (this.root) this.root.visible = true;
  }

  hide() {
    if (this.root) this.root.visible = false;
  }

  update({ t }) {
    if (!this.root?.visible) return;
    const tt = (t || performance.now()) * 0.001;
    const s = 0.96 + Math.sin(tt * 3.0) * 0.03;
    this.root.scale.set(s, s, s);
  }
}
