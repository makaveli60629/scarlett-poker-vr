// js/vr_ui_panel.js — Simple VR Menu Panel (8.0.4)
import * as THREE from "./three.js";

export const VRMenu = {
  root: null,
  visible: false,
  _camera: null,

  build(scene, camera) {
    this._camera = camera;

    this.root = new THREE.Group();
    this.root.name = "VRMenu";
    scene.add(this.root);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0x0d1016,
        roughness: 0.85,
        metalness: 0.05,
        emissive: 0x001a14,
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide,
      })
    );

    // little "header" strip
    const header = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 0.6,
        side: THREE.DoubleSide,
      })
    );
    header.position.y = 0.19;

    this.root.add(panel, header);
    this.root.visible = false;
  },

  toggle() {
    this.visible = !this.visible;
    if (this.root) this.root.visible = this.visible;
  },

  update() {
    if (!this.visible || !this.root || !this._camera) return;

    // float 1 meter in front of the headset
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this._camera.quaternion);
    const pos = new THREE.Vector3().copy(this._camera.position).add(dir.multiplyScalar(1.0));

    this.root.position.copy(pos);
    this.root.quaternion.copy(this._camera.quaternion);
  },
};
