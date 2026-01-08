// /js/teleport_machine.js — Scarlett Teleport Machine (TEXTURED + BRIGHT FX)
// ✅ NO imports. THREE is passed in via world.js build({ THREE, scene, texLoader })

export const TeleportMachine = {
  group: null,

  // where the machine lives in the lobby
  padCenter: { x: 0, y: 0, z: 2.2 },

  // texture paths (put the PNGs here)
  TEX_PORTAL: "assets/textures/teleport/teleporter_portal_transparent.png",
  TEX_SCENE:  "assets/textures/teleport/teleporter_portal_scene.png",

  build({ THREE, scene, texLoader = null }) {
    const g = new THREE.Group();
    g.name = "TeleportMachine";
    g.position.set(this.padCenter.x, this.padCenter.y, this.padCenter.z);
    this.group = g;

    // ---------- base ----------
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c12,
      roughness: 0.85,
      metalness: 0.35,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.88, 0.18, 40),
      baseMat
    );
    base.position.y = 0.09;
    base.name = "base";
    g.add(base);

    // ---------- neon rim ----------
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      emissive: 0x66ccff,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.2,
      transparent: true,
      opacity: 0.95,
    });

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.64, 0.06, 16, 70),
      rimMat
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.19;
    rim.name = "rim";
    g.add(rim);

    // ---------- portal plane (your texture) ----------
    let portalTex = null;
    if (texLoader) {
      portalTex = texLoader.load(
        this.TEX_PORTAL,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        },
        undefined,
        () => {}
      );
    }

    // a standing “gate” frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0a0d18,
      roughness: 0.6,
      metalness: 0.55,
      emissive: 0x101020,
      emissiveIntensity: 0.4,
    });

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 2.5, 0.16),
      frameMat
    );
    frame.position.set(0, 1.25, -0.15);
    frame.name = "frame";
    g.add(frame);

    // portal “glass” inside the frame
    const portalMat = new THREE.MeshStandardMaterial({
      map: portalTex || null,
      color: portalTex ? 0xffffff : 0x66ccff,
      transparent: true,
      opacity: portalTex ? 1.0 : 0.85,
      emissive: 0x66ccff,
      emissiveIntensity: 2.8,
      roughness: 0.15,
      metalness: 0.0,
      depthWrite: false,
    });

    const portal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.32, 2.05),
      portalMat
    );
    portal.position.set(0, 1.25, -0.06);
    portal.name = "portal";
    g.add(portal);

    // ---------- bright beacon light ----------
    const beacon = new THREE.PointLight(0x66ccff, 1.2, 14);
    beacon.position.set(0, 1.7, 0.15);
    beacon.name = "beacon";
    g.add(beacon);

    // ---------- purple electricity arcs (BRIGHT) ----------
    const arcGeo = new THREE.BufferGeometry();
    const arcPts = new Float32Array(70 * 3);
    arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPts, 3));

    const arcMat = new THREE.LineBasicMaterial({
      color: 0xb46bff,
      transparent: true,
      opacity: 0.95,
    });

    const arc = new THREE.Line(arcGeo, arcMat);
    arc.position.set(0, 2.35, -0.12);
    arc.name = "arcLine";
    g.add(arc);

    // a second arc for thicker “electricity feel”
    const arc2Geo = new THREE.BufferGeometry();
    const arc2Pts = new Float32Array(70 * 3);
    arc2Geo.setAttribute("position", new THREE.BufferAttribute(arc2Pts, 3));

    const arc2Mat = new THREE.LineBasicMaterial({
      color: 0xff6bff,
      transparent: true,
      opacity: 0.55,
    });

    const arc2 = new THREE.Line(arc2Geo, arc2Mat);
    arc2.position.copy(arc.position);
    arc2.name = "arcLine2";
    g.add(arc2);

    // ---------- spawn ring on the floor (your “ultimate spawn spot”) ----------
    const spawnRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.48, 52),
      new THREE.MeshBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    spawnRing.rotation.x = -Math.PI / 2;
    spawnRing.position.set(0, 0.031, 0.0);
    spawnRing.name = "spawnRing";
    g.add(spawnRing);

    // tick time
    g.userData._t = 0;

    scene.add(g);
    return g;
  },

  tick(dt) {
    if (!this.group) return;
    const g = this.group;
    g.userData._t = (g.userData._t || 0) + dt;
    const t = g.userData._t;

    const rim = g.getObjectByName("rim");
    const beacon = g.getObjectByName("beacon");
    const portal = g.getObjectByName("portal");
    const arc = g.getObjectByName("arcLine");
    const arc2 = g.getObjectByName("arcLine2");
    const spawnRing = g.getObjectByName("spawnRing");

    if (rim) {
      rim.rotation.z += dt * 1.2;
      rim.material.emissiveIntensity = 2.1 + Math.sin(t * 6.0) * 0.55;
      rim.material.opacity = 0.88 + Math.sin(t * 4.0) * 0.08;
    }

    if (beacon) {
      beacon.intensity = 1.0 + Math.sin(t * 5.0) * 0.35;
    }

    if (portal) {
      portal.material.emissiveIntensity = 2.6 + Math.sin(t * 2.8) * 0.55;
      portal.material.opacity = 0.92 + Math.sin(t * 3.2) * 0.06;
    }

    if (spawnRing) {
      spawnRing.material.opacity = 0.75 + Math.sin(t * 3.5) * 0.18;
      spawnRing.rotation.z -= dt * 0.45;
    }

    // electric arcs update
    const writeArc = (line, seed, radius) => {
      if (!line) return;
      const pos = line.geometry.attributes.position.array;
      let idx = 0;
      for (let i = 0; i < 70; i++) {
        const a = (i / 69) * Math.PI * 2;
        const r = radius + Math.sin(t * (10 + seed) + i * 0.9) * 0.07;
        const y = Math.sin(t * (12 + seed) + i * 1.1) * 0.10;
        pos[idx++] = Math.cos(a) * r;
        pos[idx++] = y;
        pos[idx++] = Math.sin(a) * r;
      }
      line.geometry.attributes.position.needsUpdate = true;
    };

    writeArc(arc, 0.0, 0.65);
    writeArc(arc2, 1.7, 0.67);

    if (arc) arc.material.opacity = 0.80 + Math.sin(t * 8.0) * 0.18;
    if (arc2) arc2.material.opacity = 0.45 + Math.sin(t * 9.0) * 0.12;
  },

  // used by world.js/main.js spawn logic
  getSafeSpawn(THREE) {
    return {
      position: new THREE.Vector3(this.padCenter.x, 0, this.padCenter.z + 1.2),
      yaw: 0,
    };
  },
};
