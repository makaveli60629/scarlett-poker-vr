import * as THREE from "three";
import { TextureBank, Textures } from "./textures.js";

export const WatchUI = {
  renderer: null,
  left: null,
  root: null,
  t: 0,
  _latch: false,
  _pulse: 0,

  init(renderer, scene) {
    this.renderer = renderer;

    this.left = renderer.xr.getController(0);
    scene.add(this.left);

    this.root = new THREE.Group();
    this.root.position.set(0.04, 0.02, -0.08);
    this.root.rotation.set(-0.6, 0.2, 0.1);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.055, 0.012),
      TextureBank.standard({ color: 0x222222, roughness: 0.6 })
    );

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.078, 0.048),
      TextureBank.standard({ mapFile: Textures.BRAND, color: 0x0a0a0a, roughness: 1.0 })
    );
    screen.position.z = 0.007;

    this.root.add(frame, screen);
    this.left.add(this.root);

    window.addEventListener("notify", () => { this._pulse = 0.3; });
  },

  update(dt) {
    this.t += dt;
    if (this._pulse > 0) this._pulse = Math.max(0, this._pulse - dt);

    const s = 1 + Math.sin(this.t * 2.0) * 0.02 + (this._pulse * 0.2);
    this.root.scale.setScalar(s);

    // Best-effort: toggle menu using any common left button mapping
    const session = this.renderer.xr.getSession?.();
    if (!session) return;

    for (const src of session.inputSources) {
      if (src.handedness !== "left" || !src.gamepad) continue;
      const gp = src.gamepad;

      // Try X or Menu-ish buttons (varies by browser)
      const pressed = (gp.buttons?.[4]?.pressed) || (gp.buttons?.[3]?.pressed);
      if (pressed && !this._latch) {
        this._latch = true;
        window.dispatchEvent(new Event("nova_toggle_menu"));
      }
      if (!pressed) this._latch = false;
    }
  }
};
