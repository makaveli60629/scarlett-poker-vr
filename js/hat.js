// /js/hat.js
// Scarlett Poker VR — Hat System v1
// - Builds a simple "cap" hat from geometry (no Blender required)
// - Attaches to an avatar "head" anchor (Object3D) reliably
// - You can later swap this for a GLB hat model with the same API

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const HatSystem = {
  create({ color = 0x111111, accent = 0x00ffaa, logoTextureUrl = null } = {}) {
    const loader = new THREE.TextureLoader();

    let logoMap = null;
    if (logoTextureUrl) {
      try {
        logoMap = loader.load(
          logoTextureUrl,
          (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          },
          undefined,
          () => console.warn("Hat logo texture missing:", logoTextureUrl)
        );
      } catch (e) {
        console.warn("Hat logo texture load error:", e);
      }
    }

    const capMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.05,
    });

    const brimMat = new THREE.MeshStandardMaterial({
      color: accent,
      roughness: 0.7,
      metalness: 0.08,
      emissive: new THREE.Color(accent),
      emissiveIntensity: 0.25,
    });

    const logoMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: logoMap,
      transparent: true,
      roughness: 0.9,
      metalness: 0.0,
    });

    function buildHatMesh() {
      const g = new THREE.Group();
      g.name = "Hat";

      // Cap dome (scaled sphere top)
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), capMat);
      dome.scale.set(1.12, 0.75, 1.12);
      dome.position.y = 0.06;
      g.add(dome);

      // Cap band
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 24), capMat);
      band.position.y = 0.03;
      g.add(band);

      // Brim
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.012, 28, 1, false, Math.PI * 0.1, Math.PI * 0.8), brimMat);
      brim.rotation.x = Math.PI / 2;
      brim.position.set(0, 0.035, 0.12);
      g.add(brim);

      // Logo plane (front)
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.04), logoMat);
      logo.position.set(0, 0.05, 0.11);
      logo.rotation.y = Math.PI;
      g.add(logo);

      // Tiny button on top
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.01, 12, 8), brimMat);
      btn.position.set(0, 0.11, 0);
      g.add(btn);

      return g;
    }

    // Attach hat to a head anchor
    // headAnchor should be an Object3D at the head position (or a head bone in GLTF)
    function attachToHead(headAnchor, {
      y = 0.02,
      forward = 0.0,
      scale = 1.0,
      rotateY = 0.0
    } = {}) {
      if (!headAnchor) return null;

      const hat = buildHatMesh();
      hat.position.set(0, y, forward);
      hat.rotation.y = rotateY;
      hat.scale.setScalar(scale);

      headAnchor.add(hat);
      return hat;
    }

    return { attachToHead };
  },
};
