// /js/teleport_machine.js — Scarlett Teleport Machine 9.2 (NO THREE import)

export const TeleportMachine = (() => {
  let _root = null;
  let _arcs = [];
  let _t = 0;

  function build({ THREE, scene, texLoader }) {
    _root = new THREE.Group();
    _root.name = "TeleportMachine";

    // base pad
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.08, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0c0f18,
        roughness: 0.35,
        metalness: 0.25,
        emissive: 0x071022,
        emissiveIntensity: 0.25
      })
    );
    base.position.y = 0.04;
    _root.add(base);

    // glowing ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.03, 12, 90),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        emissive: 0x2bd7ff,
        emissiveIntensity: 1.6,
        roughness: 0.2,
        metalness: 0.05,
        transparent: true,
        opacity: 0.95
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.085;
    _root.add(ring);

    // portal “frame”
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 2.05, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x0d1220,
        roughness: 0.35,
        metalness: 0.35
      })
    );
    frame.position.set(0, 1.05, -0.55);
    _root.add(frame);

    // portal plane (uses your transparent portal texture if present)
    const portalTex = texLoader?.load("assets/textures/teleporter/teleporter_portal_transparent.png", (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
    });

    const portal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.10, 1.70),
      new THREE.MeshStandardMaterial({
        map: portalTex || null,
        color: portalTex ? 0xffffff : 0x4ad5ff,
        transparent: true,
        opacity: 0.95,
        emissive: 0x2bd7ff,
        emissiveIntensity: 1.25,
        side: THREE.DoubleSide
      })
    );
    portal.position.set(0, 1.05, -0.49);
    _root.add(portal);

    // purple electricity arcs (simple line lightning)
    const arcMat = new THREE.LineBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.95 });

    function makeArc(x) {
      const pts = [];
      for (let i = 0; i < 18; i++) pts.push(new THREE.Vector3(0, 0, 0));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, arcMat);
      line.position.set(x, 2.05, -0.55);
      _root.add(line);
      _arcs.push({ line, geo });
    }

    makeArc(-0.58);
    makeArc(0.58);

    // a little purple point light for glow
    const pl = new THREE.PointLight(0xb46bff, 0.9, 8);
    pl.position.set(0, 2.0, -0.55);
    _root.add(pl);

    return _root;
  }

  function tick(dt) {
    _t += dt;

    // animate arcs
    for (const a of _arcs) {
      const arr = a.geo.attributes.position.array;
      let idx = 0;
      const baseX = a.line.position.x;
      for (let i = 0; i < 18; i++) {
        const yy = 0.0 - i * 0.09;
        const xx = Math.sin(_t * 18 + i * 1.3) * 0.06;
        const zz = Math.cos(_t * 12 + i * 1.7) * 0.02;

        arr[idx++] = xx;
        arr[idx++] = yy;
        arr[idx++] = zz;
      }
      a.geo.attributes.position.needsUpdate = true;
      a.line.material.opacity = 0.65 + Math.sin(_t * 10) * 0.30;
    }
  }

  return { build, tick };
})();
