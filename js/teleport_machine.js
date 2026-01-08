// /js/teleport_machine.js — Scarlett Teleport Pad + FX (9.2 ACTIVE)
// ✅ NO imports here.

export const TeleportMachine = {
  group: null,
  padCenter: { x: 0, y: 0, z: 2.2 },
  radius: 0.85,

  build({ THREE, scene, texLoader = null }) {
    this.group = new THREE.Group();
    this.group.name = "TeleportMachine";
    this.group.position.set(this.padCenter.x, this.padCenter.y, this.padCenter.z);

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x101018,
      roughness: 0.85,
      metalness: 0.25
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.78, 0.14, 32),
      baseMat
    );
    base.position.y = 0.07;

    // glow ring (stronger)
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 2.6,
      roughness: 0.25,
      metalness: 0.15,
      transparent: true,
      opacity: 0.98
    });

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.05, 16, 64),
      glowMat
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.14;
    glow.name = "glowRing";

    // beacon
    const beacon = new THREE.PointLight(0x00ffaa, 1.1, 14);
    beacon.position.set(0, 1.6, 0);
    beacon.name = "beacon";

    // top cap
    const topCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.30, 0.30, 0.07, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        emissive: 0xffd27a,
        emissiveIntensity: 1.1,
        roughness: 0.35,
        metalness: 0.35
      })
    );
    topCap.position.set(0, 0.20, 0);

    // ✅ BIGGER / BRIGHTER purple electricity arc
    const arcGeo = new THREE.BufferGeometry();
    const arcPts = new Float32Array(64 * 3);
    arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPts, 3));
    const arc = new THREE.Line(
      arcGeo,
      new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.95 })
    );
    arc.position.y = 0.30;
    arc.name = "arcLine";

    // extra purple glow
    const purpleGlow = new THREE.PointLight(0xb46bff, 0.65, 10);
    purpleGlow.position.set(0, 1.2, 0);
    purpleGlow.name = "purpleGlow";

    this.group.add(base, glow, beacon, topCap, arc, purpleGlow);
    scene.add(this.group);

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
    const purpleGlow = g.getObjectByName("purpleGlow");
    const arc = g.getObjectByName("arcLine");

    if (ring) {
      ring.rotation.z += dt * 1.1;
      ring.material.emissiveIntensity = 2.2 + Math.sin(t * 6.0) * 0.6;
    }

    if (beacon) {
      beacon.intensity = 0.95 + Math.sin(t * 5.0) * 0.35;
    }

    if (purpleGlow) {
      purpleGlow.intensity = 0.55 + Math.sin(t * 7.0) * 0.25;
    }

    if (arc) {
      const pos = arc.geometry.attributes.position.array;
      let idx = 0;
      for (let i = 0; i < 64; i++) {
        const a = (i / 63) * Math.PI * 2;
        const r = 0.40 + Math.sin(t * 10 + i * 0.8) * 0.045;
        const y = Math.sin(t * 12 + i * 1.1) * 0.055;
        pos[idx++] = Math.cos(a) * r;
        pos[idx++] = y;
        pos[idx++] = Math.sin(a) * r;
      }
      arc.geometry.attributes.position.needsUpdate = true;
    }
  },

  // used by world for interaction checks
  containsPoint(THREE, point) {
    const dx = point.x - this.padCenter.x;
    const dz = point.z - this.padCenter.z;
    return (dx * dx + dz * dz) <= (this.radius * this.radius);
  },

  getSafeSpawn(THREE) {
    return {
      position: new THREE.Vector3(this.padCenter.x, 0, this.padCenter.z + 1.25),
      yaw: 0
    };
  }
};
