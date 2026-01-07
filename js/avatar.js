// /js/avatar.js — Simple Avatar v1 (open for future upgrades)
// Provides: group + API methods for cosmetics

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function createAvatar({ name="BOT", height=1.78 } = {}) {
  const group = new THREE.Group();
  group.userData.name = name;

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b, roughness: 0.85 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x00ffaa, roughness: 0.75, metalness: 0.05 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd8b79a, roughness: 0.9 });

  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.55, 6, 12), bodyMat);
  leg.position.y = 0.55;
  group.add(leg);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 12), shirtMat);
  torso.position.y = 1.25;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), headMat);
  head.position.y = 1.78;
  group.add(head);

  // face plane
  const faceMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.10), faceMat);
  face.position.set(0, 1.78, 0.165);
  group.add(face);

  // gear holders
  const gear = {
    hat: null,
    glasses: null,
    aura: null,
  };

  // scale to requested height
  const baseHeight = 1.85;
  const s = height / baseHeight;
  group.scale.setScalar(s);

  const api = {
    group,

    clearGear() {
      if (gear.hat) group.remove(gear.hat);
      if (gear.glasses) group.remove(gear.glasses);
      if (gear.aura) group.remove(gear.aura);
      gear.hat = gear.glasses = gear.aura = null;
    },

    setShirtColor(color) {
      if (typeof color === "number") shirtMat.color.setHex(color);
    },

    setFace(type) {
      // super-safe: draw simple “styles” using colors (no canvas)
      if (type === "smile") faceMat.color.setHex(0x00ffaa);
      else faceMat.color.setHex(0x111111);
    },

    equipHat(data) {
      if (gear.hat) group.remove(gear.hat);
      if (!data || data.type === "none") { gear.hat = null; return; }

      if (data.type === "cap") {
        const cap = new THREE.Group();
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 18, 18, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: data.color ?? 0x111111, roughness: 0.6 })
        );
        dome.position.set(0, 1.90, 0);
        cap.add(dome);

        const brim = new THREE.Mesh(
          new THREE.BoxGeometry(0.20, 0.03, 0.10),
          new THREE.MeshStandardMaterial({ color: data.color ?? 0x111111, roughness: 0.6 })
        );
        brim.position.set(0, 1.86, 0.13);
        cap.add(brim);

        gear.hat = cap;
        group.add(cap);
      }
    },

    equipGlasses(data) {
      if (gear.glasses) group.remove(gear.glasses);
      if (!data || data.type === "none") { gear.glasses = null; return; }

      if (data.type === "basic") {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: data.color ?? 0x111111, roughness: 0.4, metalness: 0.2 });
        const lensGeo = new THREE.BoxGeometry(0.08, 0.04, 0.01);

        const l1 = new THREE.Mesh(lensGeo, mat);
        l1.position.set(-0.05, 1.78, 0.17);
        const l2 = new THREE.Mesh(lensGeo, mat);
        l2.position.set(0.05, 1.78, 0.17);

        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.01), mat);
        bridge.position.set(0, 1.78, 0.17);

        g.add(l1, l2, bridge);
        gear.glasses = g;
        group.add(g);
      }
    },

    setAura(data) {
      if (gear.aura) group.remove(gear.aura);
      if (!data || data.type === "none") { gear.aura = null; return; }

      if (data.type === "ring") {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.30, 0.02, 10, 36),
          new THREE.MeshStandardMaterial({
            color: data.color ?? 0x00ffaa,
            emissive: data.color ?? 0x00ffaa,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.85
          })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.1;
        gear.aura = ring;
        group.add(ring);
      }
    }
  };

  return api;
}
