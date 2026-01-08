// /js/teleport_machine.js — PORTAL TELEPORTER (FINAL, IMAGE-MATCHED)
// Uses CDN THREE (NO local three.js)

export const TeleportMachine = {
  group: null,
  padCenter: { x: 0, y: 0, z: 3.6 },

  build(scene, texLoader) {
    const THREE = scene.constructor.prototype.isObject3D
      ? scene.children[0].constructor
      : window.THREE;

    const g = new THREE.Group();
    g.name = "TeleportPortal";
    g.position.set(this.padCenter.x, 0, this.padCenter.z);
    scene.add(g);
    this.group = g;

    /* =========================
       FLOOR TELEPORT RING
    ========================= */
    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.78, 64),
      new THREE.MeshStandardMaterial({
        color: 0x6aa6ff,
        emissive: 0x6aa6ff,
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      })
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.02;
    g.add(floorRing);

    /* =========================
       PORTAL FRAME
    ========================= */
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0b1322,
      roughness: 0.35,
      metalness: 0.8
    });

    const sideGeom = new THREE.BoxGeometry(0.28, 2.6, 0.28);
    const left = new THREE.Mesh(sideGeom, frameMat);
    const right = new THREE.Mesh(sideGeom, frameMat);
    left.position.set(-0.9, 1.3, 0);
    right.position.set(0.9, 1.3, 0);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.28, 0.28),
      frameMat
    );
    top.position.set(0, 2.75, 0);

    g.add(left, right, top);

    /* =========================
       INNER ENERGY PLANE
    ========================= */
    const portalPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.3),
      new THREE.MeshStandardMaterial({
        color: 0xbfdcff,
        emissive: 0xbfdcff,
        emissiveIntensity: 1.25,
        transparent: true,
        opacity: 0.9
      })
    );
    portalPlane.position.set(0, 1.25, 0);
    g.add(portalPlane);

    /* =========================
       ELECTRIC ARC (TOP)
    ========================= */
    const arcGeo = new THREE.BufferGeometry();
    const arcPts = new Float32Array(48 * 3);
    arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPts, 3));

    const arc = new THREE.Line(
      arcGeo,
      new THREE.LineBasicMaterial({
        color: 0xb46bff,
        transparent: true,
        opacity: 0.95
      })
    );
    arc.position.y = 2.75;
    g.add(arc);

    /* =========================
       PARTICLE DEBRIS
    ========================= */
    const pCount = 80;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3 + 0] = (Math.random() - 0.5) * 1.6;
      pPos[i * 3 + 1] = Math.random() * 2.2;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));

    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: 0xcaa2ff,
        size: 0.045,
        transparent: true,
        opacity: 0.85
      })
    );
    g.add(particles);

    /* =========================
       LIGHTING
    ========================= */
    const glow = new THREE.PointLight(0x8f6bff, 1.2, 6);
    glow.position.set(0, 1.6, 0.3);
    g.add(glow);

    /* =========================
       FX STATE
    ========================= */
    g.userData = {
      t: 0,
      floorRing,
      portalPlane,
      arc,
      arcPts,
      particles,
      glow
    };

    return g;
  },

  tick(dt) {
    if (!this.group) return;
    const u = this.group.userData;
    u.t += dt;

    // pulse portal
    u.portalPlane.material.emissiveIntensity =
      1.1 + Math.sin(u.t * 4.5) * 0.25;

    // rotate floor glyph
    u.floorRing.rotation.z += dt * 0.6;

    // electric arc animation
    let i = 0;
    for (let n = 0; n < 48; n++) {
      const a = (n / 47) * Math.PI * 2;
      const r = 0.9 + Math.sin(u.t * 10 + n) * 0.05;
      u.arcPts[i++] = Math.cos(a) * r;
      u.arcPts[i++] = Math.sin(u.t * 8 + n) * 0.06;
      u.arcPts[i++] = Math.sin(a) * 0.02;
    }
    u.arc.geometry.attributes.position.needsUpdate = true;

    // particle drift
    const p = u.particles.geometry.attributes.position.array;
    for (let j = 0; j < p.length; j += 3) {
      p[j + 1] += dt * 0.25;
      if (p[j + 1] > 2.4) p[j + 1] = 0;
    }
    u.particles.geometry.attributes.position.needsUpdate = true;

    // light pulse
    u.glow.intensity = 1.0 + Math.sin(u.t * 5) * 0.35;
  },

  getSafeSpawn() {
    return {
      position: { x: this.padCenter.x, y: 0, z: this.padCenter.z + 1.4 },
      yaw: 0
    };
  }
};
