import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { State } from "./state.js";

export const UI = {
  menuOpen: false,
  overlay: null,
  buttons: [],
  raycaster: new THREE.Raycaster(),
  tmpVec: new THREE.Vector3(),

  build(scene) {
    // Simple 3D menu board (in-world)
    const group = new THREE.Group();
    group.visible = false;
    group.position.set(0, 1.4, 2.2);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.1 })
    );
    panel.name = "menuPanel";
    group.add(panel);

    const mkBtn = (label, x, y, action) => {
      const btn = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 0.09),
        new THREE.MeshStandardMaterial({ color: 0x1b1b1b })
      );
      btn.position.set(x, y, 0.01);
      btn.userData.action = action;
      btn.userData.label = label;
      btn.name = "menuButton";
      group.add(btn);

      // crude label using canvas texture
      const c = document.createElement("canvas");
      c.width = 512; c.height = 128;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#000"; ctx.fillRect(0,0,c.width,c.height);
      ctx.fillStyle = "#fff"; ctx.font = "bold 54px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, c.width/2, c.height/2);
      const tex = new THREE.CanvasTexture(c);
      btn.material.map = tex;
      btn.material.needsUpdate = true;

      this.buttons.push(btn);
    };

    mkBtn("Lobby", -0.2, 0.12, "goLobby");
    mkBtn("Store",  0.2, 0.12, "goStore");
    mkBtn("Table", -0.2, -0.02, "goTable");
    mkBtn("Audio",  0.2, -0.02, "toggleAudio");
    mkBtn("Close",  0.0, -0.16, "closeMenu");

    this.overlay = group;
    scene.add(group);
  },

  toggle(rig) {
    this.menuOpen = !this.menuOpen;
    if (this.overlay) {
      this.overlay.visible = this.menuOpen;
      if (this.menuOpen && rig) {
        // stick menu in front of player
        this.overlay.position.set(rig.position.x, rig.position.y + 1.4, rig.position.z - 0.5);
      }
    }
  },

  close() {
    this.menuOpen = false;
    if (this.overlay) this.overlay.visible = false;
  },

  // Intersect controller ray or tap ray with menu buttons
  hitTest(pointerOrigin, pointerDir) {
    this.raycaster.set(pointerOrigin, pointerDir);
    const hits = this.raycaster.intersectObjects(this.buttons, false);
    return hits.length ? hits[0].object : null;
  },

  doAction(action, hooks) {
    if (!action) return;
    if (action === "closeMenu") this.close();
    if (action === "goLobby") hooks.goAnchor("lobby");
    if (action === "goStore") hooks.goAnchor("store");
    if (action === "goTable") hooks.goAnchor("table");
    if (action === "toggleAudio") hooks.toggleAudio();
  }
};
