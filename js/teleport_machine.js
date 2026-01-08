// /js/teleport_machine.js — Scarlett Teleporter (NO three import)

export const TeleportMachine = (() => {
  let _THREE = null;
  let _portalMat = null;
  let _electric = [];
  let _t = 0;

  function build({ THREE, scene, texLoader, log = console.log }) {
    _THREE = THREE;

    const g = new THREE.Group();
    g.name = "TeleportMachine";

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.12, 46),
      new THREE.MeshStandardMaterial({ color: 0x0e1220, roughness: 0.5, metalness: 0.2, emissive: 0x05060a })
    );
    base.position.y = 0.06;
    g.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.04, 12, 90),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        emissive: 0x2bd7ff,
        emissiveIntensity: 1.6,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.14;
    g.add(ring);

    // Portal “frame”
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 2.1, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x0c1020, roughness: 0.4, metalness: 0.15 })
    );
    frame.position.set(0, 1.12, -0.55);
    g.add(frame);

    // Portal plane (transparent texture)
    const texA = texLoader.load("assets/textures/teleporter/teleporter_portal_transparent.png");
    texA.colorSpace = THREE.SRGBColorSpace;

    _portalMat = new THREE.MeshBasicMaterial({
      map: texA,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.85), _portalMat);
    portal.position.set(0, 1.12, -0.46);
    g.add(portal);

    // Purple “electricity” arcs
    _electric = [];
    for (let i = 0; i < 8; i++) {
      const bolt = new THREE.Mesh(
        new THREE.TorusGeometry(0.10 + i * 0.01, 0.008, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.65 })
      );
      bolt.position.set((i % 2 ? 0.45 : -0.45), 2.10, -0.55);
      bolt.rotation.y = i * 0.4;
      bolt.rotation.x = 0.5 + i * 0.1;
      g.add(bolt);
      _electric.push(bolt);
    }

    // Add a soft purple point light
    const p = new THREE.PointLight(0xb46bff, 1.15, 6);
    p.position.set(0, 2.05, -0.55);
    g.add(p);

    // store references
    g.userData._ring = ring;
    g.userData._portal = portal;
    g.userData._light = p;

    log("[teleporter] build ✅");
    return g;
  }

  function tick(dt) {
    _t += dt;

    if (_portalMat) {
      _portalMat.opacity = 0.90 + Math.sin(_t * 2.4) * 0.08;
    }

    for (const e of _electric) {
      e.rotation.z += dt * 2.2;
      e.material.opacity = 0.45 + (Math.sin(_t * 8.0 + e.rotation.y) * 0.20);
    }
  }

  return { build, tick };
})();
