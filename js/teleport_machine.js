// /js/teleport_machine.js — Scarlett Teleporter (9.2 TEXTURED MATCH)
// ✅ NO imports here. world.js passes THREE, scene, texLoader.
// Put textures here:
// /assets/textures/teleporter/teleporter_frame.png  (alpha)
// /assets/textures/teleporter/teleporter_portal.png

export const TeleportMachine = {
  group: null,
  padCenter: { x: 0, y: 0, z: 2.2 },
  radius: 0.95,

  // texture refs
  _tex: {
    frame: null,
    portal: null,
    portal2: null,
  },

  build({ THREE, scene, texLoader = null }) {
    const g = new THREE.Group();
    g.name = "TeleportMachine";
    g.position.set(this.padCenter.x, this.padCenter.y, this.padCenter.z);

    // ---------- base pad (3D) ----------
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.88, 0.14, 36),
      new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: 0.85, metalness: 0.25 })
    );
    base.position.y = 0.07;
    g.add(base);

    // glow ring around pad
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.05, 16, 80),
      new THREE.MeshStandardMaterial({
        color: 0x66ccff,
        emissive: 0x66ccff,
        emissiveIntensity: 2.2,
        roughness: 0.25,
        metalness: 0.05,
        transparent: true,
        opacity: 0.95,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.14;
    ring.name = "padGlow";
    g.add(ring);

    // ---------- load textures ----------
    const frameURL = "assets/textures/teleporter/teleporter_frame.png";
    const portalURL = "assets/textures/teleporter/teleporter_portal.png";

    const safeLoad = (url) =>
      new Promise((resolve) => {
        if (!texLoader) return resolve(null);
        try {
          texLoader.load(
            url,
            (t) => {
              t.colorSpace = THREE.SRGBColorSpace;
              t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
              resolve(t);
            },
            undefined,
            () => resolve(null)
          );
        } catch {
          resolve(null);
        }
      });

    // we build materials once textures arrive (but also show a placeholder instantly)
    const framePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 3.2),
      new THREE.MeshBasicMaterial({
        color: 0x0f1220,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      })
    );
    framePlane.position.set(0, 1.6, 0);
    framePlane.name = "framePlane";
    g.add(framePlane);

    // portal plane behind frame
    const portalPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 2.35),
      new THREE.MeshBasicMaterial({
        color: 0x223344,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      })
    );
    portalPlane.position.set(0, 1.55, -0.03);
    portalPlane.name = "portalPlane";
    g.add(portalPlane);

    // second portal layer for shimmer
    const portalPlane2 = new THREE.Mesh(
      new THREE.PlaneGeometry(1.62, 2.42),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    portalPlane2.position.set(0, 1.55, -0.031);
    portalPlane2.name = "portalPlane2";
    g.add(portalPlane2);

    // soft blue edge light + purple lightning light
    const blue = new THREE.PointLight(0x66ccff, 1.1, 14);
    blue.position.set(0, 1.7, 0.25);
    blue.name = "blueLight";
    g.add(blue);

    const purple = new THREE.PointLight(0xb46bff, 0.95, 12);
    purple.position.set(0, 2.6, 0.1);
    purple.name = "purpleLight";
    g.add(purple);

    // ---------- “electricity” bolts (procedural lines) ----------
    const bolts = makeBolts(THREE);
    bolts.position.set(0, 3.05, 0.02);
    bolts.name = "bolts";
    g.add(bolts);

    // ---------- spawn circle marker (your “ultimate spawn spot”) ----------
    const spawnCircle = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.32, 40),
      new THREE.MeshBasicMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    spawnCircle.rotation.x = -Math.PI / 2;
    spawnCircle.position.set(0, 0.03, 1.25);
    spawnCircle.name = "spawnCircle";
    g.add(spawnCircle);

    // store
    this.group = g;
    scene.add(g);

    // async apply textures
    (async () => {
      const [frameTex, portalTex] = await Promise.all([safeLoad(frameURL), safeLoad(portalURL)]);
      this._tex.frame = frameTex;
      this._tex.portal = portalTex;

      // frame
      if (frameTex) {
        framePlane.material = new THREE.MeshBasicMaterial({
          map: frameTex,
          transparent: true,
          opacity: 1.0,
          depthWrite: false,
        });
      } else {
        // if missing, show something so you know it loaded
        framePlane.material.opacity = 0.35;
      }

      // portal
      if (portalTex) {
        portalTex.wrapS = portalTex.wrapT = THREE.ClampToEdgeWrapping;
        portalPlane.material = new THREE.MeshBasicMaterial({
          map: portalTex,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        });

        // shimmer layer uses same tex but additive, slowly moves
        const p2 = portalTex.clone();
        p2.colorSpace = THREE.SRGBColorSpace;
        p2.wrapS = p2.wrapT = THREE.RepeatWrapping;
        this._tex.portal2 = p2;

        portalPlane2.material = new THREE.MeshBasicMaterial({
          map: p2,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
      }
    })();

    // clock
    g.userData._t = 0;
    return g;
  },

  tick(dt) {
    if (!this.group) return;
    const g = this.group;
    g.userData._t = (g.userData._t || 0) + dt;
    const t = g.userData._t;

    const ring = g.getObjectByName("padGlow");
    const blue = g.getObjectByName("blueLight");
    const purple = g.getObjectByName("purpleLight");
    const bolts = g.getObjectByName("bolts");
    const portal2 = g.getObjectByName("portalPlane2");

    if (ring?.material) {
      ring.rotation.z += dt * 1.2;
      ring.material.emissiveIntensity = 2.0 + Math.sin(t * 5.5) * 0.8;
      ring.material.opacity = 0.75 + Math.sin(t * 3.2) * 0.15;
    }

    if (blue) blue.intensity = 0.95 + Math.sin(t * 2.8) * 0.25;
    if (purple) purple.intensity = 0.85 + Math.sin(t * 6.2) * 0.35;

    // animate bolts
    if (bolts) updateBolts(bolts, t);

    // shimmer scroll
    if (portal2?.material?.map) {
      const m = portal2.material.map;
      m.offset.x = (t * 0.02) % 1;
      m.offset.y = (t * 0.015) % 1;
      portal2.material.opacity = 0.15 + Math.sin(t * 4.0) * 0.08;
    }
  },

  containsPoint(THREE, point) {
    const dx = point.x - this.padCenter.x;
    const dz = point.z - this.padCenter.z;
    return (dx * dx + dz * dz) <= (this.radius * this.radius);
  },

  getSafeSpawn(THREE) {
    return {
      position: new THREE.Vector3(this.padCenter.x, 0, this.padCenter.z + 1.25),
      yaw: 0,
    };
  },
};

// ---------- bolts helpers ----------
function makeBolts(THREE) {
  const g = new THREE.Group();

  // create 2 bolt lines (left + right)
  const mk = () => {
    const geo = new THREE.BufferGeometry();
    const pts = new Float32Array(18 * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.95 })
    );
    line.userData.pts = pts;
    return line;
  };

  const left = mk();
  left.position.set(-0.85, 0, 0);

  const right = mk();
  right.position.set(0.85, 0, 0);

  g.add(left, right);
  return g;
}

function updateBolts(boltsGroup, t) {
  for (const line of boltsGroup.children) {
    const pts = line.userData.pts;
    let idx = 0;

    // bolt goes downward + slight inward/outward jitter
    const height = 0.65;
    for (let i = 0; i < 18; i++) {
      const a = i / 17;
      const y = -a * height;
      const x = Math.sin(t * 18 + i * 2.2) * 0.06 + Math.sin(t * 6 + i) * 0.03;
      const z = Math.cos(t * 11 + i * 1.7) * 0.02;

      pts[idx++] = x;
      pts[idx++] = y;
      pts[idx++] = z;
    }
    line.geometry.attributes.position.needsUpdate = true;

    // flicker
    line.material.opacity = 0.55 + Math.sin(t * 22 + line.position.x * 2.0) * 0.35;
  }
     }
