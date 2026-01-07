// /js/teleport_machine.js — Stable Teleport Pad + FX (9.x)
// Uses ./three.js bridge (CDN-backed)
import * as THREE from "./three.js";

export const TeleportMachine = {
  group: null,
  padCenter: new THREE.Vector3(0, 0, 3.6),

  build(scene, texLoader = null) {
    this.group = new THREE.Group();
    this.group.name = "TeleportMachine";
    this.group.position.copy(this.padCenter);

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x101018,
      roughness: 0.9,
      metalness: 0.2
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.12, 28),
      baseMat
    );
    base.position.y = 0.06;

    // glow ring (texture optional)
    let glowMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 2.2,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95
    });

    if (texLoader) {
      try {
        const t = texLoader.load(
          "assets/textures/Teleport glow.jpg",
          (tt) => {
            tt.wrapS = tt.wrapT = THREE.RepeatWrapping;
            tt.repeat.set(1, 1);
            tt.colorSpace = THREE.SRGBColorSpace;
          },
          undefined,
          () => {}
        );
        glowMat = new THREE.MeshStandardMaterial({
          map: t,
          color: 0xffffff,
          emissive: 0x00ffaa,
          emissiveIntensity: 1.6,
          roughness: 0.35,
          metalness: 0.1,
          transparent: true,
          opacity: 0.95
        });
      } catch (e) {}
    }

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.04, 12, 48),
      glowMat
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.12;
    glow.name = "glowRing";

    const beacon = new THREE.PointLight(0x00ffaa, 0.85, 12);
    beacon.position.set(0, 1.6, 0);
    beacon.name = "beacon";

    const topCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.06, 18),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 0.9,
        roughness: 0.35,
        metalness: 0.35
      })
    );
    topCap.position.set(0, 0.18, 0);

    // subtle “electric” arc line (not extreme)
    const arcGeo = new THREE.BufferGeometry();
    const arcPts = new Float32Array(42 * 3);
    arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPts, 3));
    const arc = new THREE.Line(
      arcGeo,
      new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.85 })
    );
    arc.position.y = 0.26;
    arc.name = "arcLine";

    this.group.add(base, glow, beacon, topCap, arc);
    scene.add(this.group);

    // fx state
    this.group.userData._t = 0;

    return this.group;
  },

  tick(dt) {
    if (!this.group) return;
    const g = this.group;
    g.userData._t = (g.userData._t || 0) + dt;
    const t = g.userData._t;

    const ring = g.getObjectByName("glowRing");
    const beacon = g.getObjectByName("beacon");
    const arc = g.getObjectByName("arcLine");

    if (ring) {
      ring.rotation.z += dt * 0.9;
      ring.material.emissiveIntensity = 1.4 + Math.sin(t * 6.0) * 0.35;
    }

    if (beacon) {
      beacon.intensity = 0.7 + Math.sin(t * 5.0) * 0.25;
    }

    if (arc) {
      const pos = arc.geometry.attributes.position.array;
      let idx = 0;
      for (let i = 0; i < 42; i++) {
        const a = (i / 41) * Math.PI * 2;
        const r = 0.34 + Math.sin(t * 9 + i * 0.9) * 0.03;
        const y = Math.sin(t * 11 + i * 1.2) * 0.04;
        pos[idx++] = Math.cos(a) * r;
        pos[idx++] = y;
        pos[idx++] = Math.sin(a) * r;
      }
      arc.geometry.attributes.position.needsUpdate = true;
      arc.visible = true;
    }
  },

  getSafeSpawn() {
    return {
      position: new THREE.Vector3(this.padCenter.x, 0, this.padCenter.z + 1.2),
      yaw: 0
    };
  }
};
