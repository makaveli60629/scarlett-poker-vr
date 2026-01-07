// /js/crown.js — Winner Crown System (GitHub Pages safe)
// Usage:
//   import { Crown } from "./crown.js";
//   const crown = await Crown.create({ textureUrl: "assets/textures/crown_diffuse.png" });
//   crown.attachTo(targetHeadOrGroup);
//   crown.showForMs(60_000);

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const Crown = {
  async create({
    textureUrl = "assets/textures/crown_diffuse.png",
    scale = 1.0,
    yOffset = 0.12,     // how high above the head attach point
    spin = false,       // fun: crown can slowly spin
  } = {}) {
    // Texture (GitHub Pages safe)
    const loader = new THREE.TextureLoader();
    const tex = await new Promise((resolve) => {
      loader.load(
        textureUrl,
        (t) => resolve(t),
        undefined,
        () => resolve(null)
      );
    });

    // Crown group
    const g = new THREE.Group();
    g.name = "WinnerCrown";
    g.visible = false;

    // Material
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      roughness: 0.45,
      metalness: 0.85,
      emissive: 0x1a1206,
      emissiveIntensity: 0.25,
      map: tex || null,
    });

    if (mat.map) {
      mat.map.colorSpace = THREE.SRGBColorSpace;
      mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
      mat.map.repeat.set(1, 1);
      mat.map.needsUpdate = true;
    }

    // Base ring (thin cylinder)
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.11, 0.045, 32, 1, true),
      mat
    );
    base.position.y = 0.03;
    g.add(base);

    // Inner rim (for depth)
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.012, 10, 36),
      mat
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.055;
    g.add(rim);

    // Spikes
    const spikeCount = 6;
    const spikeR = 0.11;
    for (let i = 0; i < spikeCount; i++) {
      const a = (i / spikeCount) * Math.PI * 2;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.03, 0.11, 10),
        mat
      );
      spike.position.set(Math.cos(a) * spikeR, 0.105, Math.sin(a) * spikeR);
      spike.rotation.y = -a + Math.PI / 2;
      g.add(spike);

      // Gem on each spike (small emissive sphere)
      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x2bd7ff,
          roughness: 0.25,
          metalness: 0.1,
          emissive: 0x0a3340,
          emissiveIntensity: 0.8,
        })
      );
      gem.position.set(spike.position.x * 0.92, 0.15, spike.position.z * 0.92);
      g.add(gem);
    }

    // Soft crown light so it always “reads”
    const crownLight = new THREE.PointLight(0xfff2d0, 0.6, 2.2);
    crownLight.position.set(0, 0.22, 0);
    g.add(crownLight);

    // Scaling + offset container
    const root = new THREE.Group();
    root.name = "WinnerCrownRoot";
    root.add(g);
    root.scale.setScalar(scale);
    root.position.set(0, yOffset, 0);

    let timer = null;
    let attachedTo = null;

    const api = {
      object: root,

      attachTo(headOrGroup) {
        // Remove from previous parent
        if (attachedTo && root.parent === attachedTo) attachedTo.remove(root);
        attachedTo = headOrGroup;
        attachedTo.add(root);
        return api;
      },

      setVisible(v) {
        g.visible = !!v;
        return api;
      },

      showForMs(ms = 60_000) {
        api.setVisible(true);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => api.setVisible(false), ms);
        return api;
      },

      hide() {
        if (timer) clearTimeout(timer);
        timer = null;
        api.setVisible(false);
        return api;
      },

      update(dt) {
        if (spin && g.visible) g.rotation.y += dt * 0.6;
      },
    };

    return api;
  },
};
export const Crown = {
  holder: null,        // who currently holds it
  title: "Boss Crown", // later you'll have tiers

  take(from, to) {
    this.holder = to;
    window.dispatchEvent(new CustomEvent("crown_taken", { detail: { from, to, title: this.title } }));
  }
};
