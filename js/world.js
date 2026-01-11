// /js/world.js — Scarlett World Recovery v1.0 (SAFE, BRIGHT, NEVER CRASH)
export const World = {
  async init(ctx) {
    const { THREE, scene, logLine } = ctx;
    const log = (m)=>logLine?.("log", m);

    // Big grid floor reference (thin, not blocking teleport)
    const grid = new THREE.GridHelper(120, 120, 0x00ffff, 0x223344);
    grid.position.y = 0.001;
    scene.add(grid);

    // Simple hub marker ring
    const hubRing = new THREE.Mesh(
      new THREE.TorusGeometry(14, 0.08, 16, 160),
      new THREE.MeshStandardMaterial({ color: 0x101320, emissive: 0x7fe7ff, emissiveIntensity: 0.8, roughness: 0.5 })
    );
    hubRing.rotation.x = Math.PI/2;
    hubRing.position.set(0, 0.05, 0);
    hubRing.name = "HubPlate";
    scene.add(hubRing);

    // Center “sunk” table pedestal illusion (safe version)
    const pit = new THREE.Mesh(
      new THREE.CylinderGeometry(6.2, 6.2, 0.35, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 })
    );
    pit.position.set(0, -0.18, 0);
    scene.add(pit);

    const pitRail = new THREE.Mesh(
      new THREE.TorusGeometry(6.2, 0.10, 16, 160),
      new THREE.MeshStandardMaterial({ color: 0x11131c, emissive: 0x5a2cff, emissiveIntensity: 0.6, roughness: 0.55 })
    );
    pitRail.rotation.x = Math.PI/2;
    pitRail.position.set(0, 0.02, 0);
    scene.add(pitRail);

    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 0.14, 48),
      new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.9 })
    );
    table.position.set(0, 0.72, 0);
    table.name = "BossTable";
    scene.add(table);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.09, 16, 120),
      new THREE.MeshStandardMaterial({ color: 0x191b22, roughness: 0.6, metalness: 0.15 })
    );
    rim.rotation.x = Math.PI/2;
    rim.position.set(0, 0.80, 0);
    scene.add(rim);

    // Teleporter anchor behind spawn (visual only)
    const tele = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 2.1, 22),
      new THREE.MeshStandardMaterial({ color: 0x090b14, emissive: 0x9b5cff, emissiveIntensity: 1.2, roughness: 0.4 })
    );
    tele.position.set(0, 1.05, 30.5);
    tele.name = "TeleportMachine";
    scene.add(tele);

    // Spawn point in “south room area” (z=28)
    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, 28);
    scene.add(sp);

    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.12, 36),
      new THREE.MeshStandardMaterial({ color: 0x0a0b12, emissive: 0x00ffff, emissiveIntensity: 0.9 })
    );
    pad.position.set(0, 0.06, 28);
    pad.name = "SpawnPad";
    scene.add(pad);

    // Extra light poles so it’s never dark
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 12);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x121522, roughness: 0.7 });
    const pts = [
      [ 10, 0,  10], [-10, 0,  10],
      [ 10, 0, -10], [-10, 0, -10],
      [ 12, 0,   0], [-12, 0,  0],
      [  0, 0,  12], [  0, 0, -12]
    ];
    pts.forEach((p, i)=>{
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(p[0], 1.6, p[2]);
      scene.add(pole);
      const pl = new THREE.PointLight(i%2?0xff2d7a:0x7fe7ff, 1.2, 22);
      pl.position.set(p[0], 3.25, p[2]);
      scene.add(pl);
    });

    log("[world] Recovery world built ✅ (grid + hub + sunk table + spawn)");
  },

  update(ctx, dt) {
    // safe no-op
  }
};
