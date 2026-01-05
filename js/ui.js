import * as THREE from "three";
import { TextureBank, Textures } from "./textures.js";

export const UI = {
  panel: null,
  visible: false,
  camera: null,

  init(scene, camera) {
    this.camera = camera;

    const geo = new THREE.PlaneGeometry(1.35, 0.7);
    const mat = TextureBank.standard({ color: 0x111111, roughness: 1.0 });
    mat.transparent = true;
    mat.opacity = 0.92;

    this.panel = new THREE.Mesh(geo, mat);
    this.panel.position.set(0, 1.6, -2);
    this.panel.visible = false;
    scene.add(this.panel);

    const holo = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.55),
      TextureBank.standard({ mapFile: Textures.UI_WINNER, color: 0x222222, roughness: 1.0 })
    );
    holo.position.set(0, 0, 0.01);
    this.panel.add(holo);

    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "m") this.toggle();
    });

    window.addEventListener("nova_toggle_menu", () => this.toggle());
  },

  toggle() {
    this.visible = !this.visible;
    if (this.panel) this.panel.visible = this.visible;
  },

  update() {
    if (!this.panel || !this.panel.visible) return;
    this.panel.lookAt(this.camera.position);
  }
};
