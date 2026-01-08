// /js/teleport_machine.js — Teleport Pad + FX (GitHub Pages safe)
// ✅ NO imports. THREE is passed in.

export const TeleportMachine = {
  group: null,
  padCenter: { x: 0, y: 0, z: 3.6 },

  build({ THREE, scene, texLoader = null }) {
    this.group = new THREE.Group();
    this.group.name = "TeleportMachine";
    this.group.position.set(this.padCenter.x, this.padCenter.y, this.padCenter.z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.74, 0.14, 36),
      new THREE.MeshStandardMaterial({ color: 0x0c0d12, roughness: 0.85, metalness: 0.25 })
    );
    base.position.y = 0.07;

    let ringMat = new THREE.MeshStandardMaterial({
      color: 0x7fe7ff, emissive: 0x45d7ff, emissiveIntensity: 2.2,
      roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.98
    });

    if (texLoader) {
      try {
        const t = texLoader.load("assets/textures/teleporter/teleporter_portal_transparent.png", (tt) => {
          tt.colorSpace = THREE.SRGBColorSpace;
        });
        ringMat = new THREE.MeshStandardMaterial({
          map: t, color: 0xffffff,
          emissive: 0x79e0ff, emissiveIntensity: 2.0,
          roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.98
        });
      } catch {}
    }

    const glow = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.05, 14, 72), ringMat);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.14;
    glow.name = "glowRing";

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 1.75),
      new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0x7fe7ff, emissiveIntensity: 1.1,
        transparent: true, opacity: 0.95, depthWrite: false
      })
    );
    plane.position.set(0, 1.05, 0);
    plane.name = "portalPlane";

    if (texLoader) {
      try {
        const ptex = texLoader.load("assets/textures/teleporter/teleporter_portal_scene.png", (tt) => {
          tt.colorSpace = THREE.SRGBColorSpace;
        });
        plane.material.map = ptex;
        plane.material.needsUpdate = true;
      } catch {}
    }

    const beacon = new THREE.PointLight(0x79e0ff, 1.0, 14);
    beacon.position.set(0, 1.7, 0);
    beacon.name = "beacon";

    const arcGeo = new THREE.BufferGeometry();
    const arcPts = new Float32Array(52 * 3);
    arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPts, 3));
    const arc = new THREE.Line(
      arcGeo,
      new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.95 })
    );
    arc.position.y = 0.30;
    arc.name = "arcLine";

    this.group.add(base, glow, plane, beacon, arc);
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
    const arc = g.getObjectByName("arcLine");
    const plane = g.getObjectByName("portalPlane");

    if (ring) {
      ring.rotation.z += dt * 0.9;
      ring.material.emissiveIntensity = 1.8 + Math.sin(t * 6.0) * 0.45;
    }
    if (beacon) beacon.intensity = 0.9 + Math.sin(t * 5.0) * 0.35;
    if (plane) {
      plane.material.opacity = 0.85 + Math.sin(t * 2.8) * 0.10;
      plane.rotation.y = Math.sin(t * 0.9) * 0.08;
    }

    if (arc) {
      const pos = arc.geometry.attributes.position.array;
      let idx = 0;
      for (let i = 0; i < 52; i++) {
        const a = (i / 51) * Math.PI * 2;
        const r = 0.40 + Math.sin(t * 10 + i * 0.9) * 0.04;
        const y = Math.sin(t * 13 + i * 1.1) * 0.06;
        pos[idx++] = Math.cos(a) * r;
        pos[idx++] = y;
        pos[idx++] = Math.sin(a) * r;
      }
      arc.geometry.attributes.position.needsUpdate = true;
    }
  }
};
