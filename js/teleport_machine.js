// /js/teleport_machine.js — Portal Pad (9.0)
// IMPORTANT: NO imports here. We use THREE passed in from world.js.
// Exports TeleportMachine with build/tick/getSafeSpawn.

export const TeleportMachine = {
  group: null,
  padCenter: null, // set in build

  build({ THREE, scene, texLoader = null, log = console.log }) {
    this.padCenter = new THREE.Vector3(0, 0, 3.6);

    const g = new THREE.Group();
    g.name = "TeleportMachine";
    g.position.copy(this.padCenter);

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

    // portal arch (so it looks like your PNG reference vibe)
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x0a1020,
      roughness: 0.55,
      metalness: 0.15,
      emissive: 0x0d2b55,
      emissiveIntensity: 0.25
    });

    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.1, 0.22), archMat);
    leftPillar.position.set(-0.55, 1.05, 0);
    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 0.55;

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.22, 0.22), archMat);
    topBar.position.set(0, 2.0, 0);

    const portalGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 1.75),
      new THREE.MeshStandardMaterial({
        color: 0x99ccff,
        emissive: 0x99ccff,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.35
      })
    );
    portalGlow.position.set(0, 1.18, 0);
    portalGlow.name = "portalGlow";

    const beacon = new THREE.PointLight(0x00ffaa, 0.85, 10);
    beacon.position.set(0, 1.4, 0);
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

    // subtle “electric” arc line
    const arcGeo = new THREE.BufferGeometry();
    const arcPts = new Float32Array(54 * 3);
    arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPts, 3));
    const arc = new THREE.Line(
      arcGeo,
      new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.9 })
    );
    arc.position.y = 2.05;
    arc.name = "arcLine";

    g.add(base, glow, beacon, topCap, leftPillar, rightPillar, topBar, portalGlow, arc);
    scene.add(g);

    g.userData._t = 0;
    this.group = g;

    log("[teleport_machine] build ✅");
    return g;
  },

  tick(dt) {
    if (!this.group) return;
    const THREE = this.group.parent?.__THREE || null; // not required
    const g = this.group;
    g.userData._t = (g.userData._t || 0) + dt;
    const t = g.userData._t;

    const ring = g.getObjectByName("glowRing");
    const beacon = g.getObjectByName("beacon");
    const arc = g.getObjectByName("arcLine");
    const portal = g.getObjectByName("portalGlow");

    if (ring) {
      ring.rotation.z += dt * 0.9;
      ring.material.emissiveIntensity = 1.4 + Math.sin(t * 6.0) * 0.35;
    }
    if (beacon) {
      beacon.intensity = 0.7 + Math.sin(t * 5.0) * 0.25;
    }
    if (portal) {
      portal.material.opacity = 0.28 + (Math.sin(t * 3.8) * 0.06);
    }

    if (arc) {
      const pos = arc.geometry.attributes.position.array;
      let idx = 0;
      for (let i = 0; i < 54; i++) {
        const a = (i / 53) * Math.PI * 2;
        const r = 0.65 + Math.sin(t * 9 + i * 0.9) * 0.05;
        const y = Math.sin(t * 11 + i * 1.2) * 0.06;
        pos[idx++] = Math.cos(a) * r;
        pos[idx++] = y;
        pos[idx++] = Math.sin(a) * r;
      }
      arc.geometry.attributes.position.needsUpdate = true;
      arc.visible = true;
    }
  },

  getSafeSpawn(THREE) {
    const center = this.padCenter || new THREE.Vector3(0, 0, 3.6);
    return {
      position: new THREE.Vector3(center.x, 0, center.z + 1.2),
      yaw: Math.PI // face toward table area
    };
  }
};
