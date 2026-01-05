// js/avatar_shop.js — Patch 6.4
// Cosmetic preview mannequin near store kiosk.
// (Player can't see their own head in VR, so we show a preview in-world.)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { Inventory } from "./inventory.js";

export const AvatarShop = {
  group: null,
  mannequin: null,
  hat: null,
  glasses: null,
  fx: null,
  t: 0,

  build(scene, pos = { x: -6.5, y: 0, z: 4.0 }) {
    this.group = new THREE.Group();
    this.group.name = "AvatarShopPreview";
    this.group.position.set(pos.x, pos.y, pos.z);

    // Base pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.18, 22),
      new THREE.MeshStandardMaterial({
        color: 0x121212,
        roughness: 0.8,
        emissive: 0x001015,
        emissiveIntensity: 0.35
      })
    );
    pedestal.position.y = 0.09;

    // Simple mannequin (head + torso)
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.55, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.9 })
    );
    torso.position.y = 0.75;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 22, 18),
      new THREE.MeshStandardMaterial({ color: 0x3b4252, roughness: 0.85 })
    );
    head.position.y = 1.25;

    // Spotlight
    const spot = new THREE.SpotLight(0x00ffaa, 0.85, 8, Math.PI / 7, 0.5, 1.0);
    spot.position.set(0.8, 2.2, 0.8);
    spot.target.position.set(0, 1.0, 0);
    this.group.add(spot, spot.target);

    // Neon ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.06, 10, 44),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.3,
        roughness: 0.35,
        transparent: true,
        opacity: 0.22
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;

    this.mannequin = new THREE.Group();
    this.mannequin.add(torso, head);
    this.mannequin.position.set(0, 0, 0);

    this.group.add(pedestal, ring, this.mannequin);
    scene.add(this.group);

    // Create cosmetic slots
    this.hat = this._makeHat();
    this.hat.position.set(0, 1.43, 0);
    this.mannequin.add(this.hat);

    this.glasses = this._makeGlasses();
    this.glasses.position.set(0, 1.25, 0.14);
    this.mannequin.add(this.glasses);

    this.fx = this._makeCrownFx();
    this.fx.position.set(0, 1.58, 0);
    this.mannequin.add(this.fx);

    // Apply initial equipped cosmetics
    this.apply(Inventory.equipped());

    return this.group;
  },

  _makeHat() {
    const g = new THREE.Group();
    g.name = "Hat";

    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    brim.rotation.x = Math.PI / 2;

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 0.14, 20),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    cap.position.y = 0.07;

    g.add(brim, cap);
    return g;
  },

  _makeGlasses() {
    const g = new THREE.Group();
    g.name = "Glasses";

    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.2,
      roughness: 0.35,
      transparent: true,
      opacity: 0.65
    });

    const left = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 10, 16), mat);
    left.position.x = -0.075;
    left.rotation.y = Math.PI / 2;

    const right = left.clone();
    right.position.x = 0.075;

    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 10), mat);
    bridge.rotation.z = Math.PI / 2;

    g.add(left, right, bridge);
    return g;
  },

  _makeCrownFx() {
    const g = new THREE.Group();
    g.name = "CrownFX";

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.02, 10, 18),
      new THREE.MeshStandardMaterial({
        color: 0xffd04a,
        emissive: 0xffd04a,
        emissiveIntensity: 1.0,
        roughness: 0.35,
        transparent: true,
        opacity: 0.55
      })
    );
    ring.rotation.x = Math.PI / 2;

    const glow = new THREE.PointLight(0xffd04a, 0.35, 2.5);
    glow.position.y = 0.08;

    g.add(ring, glow);
    return g;
  },

  apply(equipped) {
    // Hat
    const hatOn = equipped?.hat === "hat_black";
    this.hat.visible = !!hatOn;

    // Glasses
    const glassesOn = equipped?.glasses === "glasses_neon";
    this.glasses.visible = !!glassesOn;

    // FX
    const fxOn = equipped?.fx === "crown_fx";
    this.fx.visible = !!fxOn;
  },

  update(dt) {
    if (!this.group) return;
    this.t += dt;

    // slow showroom spin
    this.mannequin.rotation.y += dt * 0.35;

    // fx pulse
    if (this.fx?.visible) {
      const ring = this.fx.children?.[0];
      if (ring?.material) ring.material.opacity = 0.45 + Math.sin(this.t * 2.0) * 0.10;
    }
  }
};
