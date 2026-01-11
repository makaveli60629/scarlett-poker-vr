// /js/world.js — Scarlett WORLD v4.3 (Grid Always Visible + ONE Entrance + Table Guaranteed Visible)

export const World = {
  async init(ctx){
    const { THREE, scene, log } = ctx;

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    const mkMat = (c, emiss=0) => new THREE.MeshStandardMaterial({
      color: c, roughness: 0.78, metalness: 0.06,
      emissive: emiss ? new THREE.Color(c) : new THREE.Color(0x000000),
      emissiveIntensity: emiss
    });

    const MAT_WALL  = mkMat(0x131829, 0.06);
    const MAT_TRIM  = mkMat(0x7fe7ff, 1.25);
    const MAT_TRIM2 = mkMat(0xff2d7a, 1.10);
    const MAT_FLOOR = mkMat(0x0b0e18, 0.02);
    const MAT_PIT   = mkMat(0x070912, 0.02);
    const MAT_TABLE = mkMat(0x123a3a, 0.10);

    // GRID at y=0 so alignment is truthful
    const grid = new THREE.GridHelper(220, 220, 0x2a2f44, 0x141827);
    grid.position.y = 0.0;
    grid.name = "Grid";
    root.add(grid);

    // HUB
    const HUB_R = 16;
    const WALL_H = 9.0;
    const WALL_T = 0.7;

    const hub = new THREE.Group();
    hub.name = "Hub";
    root.add(hub);

    const hubCenter = new THREE.Object3D();
    hubCenter.name = "HubCenter";
    hub.add(hubCenter);

    // Put hub floor slightly BELOW grid so grid remains visible above it
    const hubFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(HUB_R - 0.5, HUB_R - 0.5, 0.06, 64),
      MAT_FLOOR
    );
    hubFloor.position.y = -0.04;
    hubFloor.name = "HubFloor";
    hub.add(hubFloor);

    // ONE entrance only: NORTH entrance.
    // Full wall ring made of 4 blocks; we REMOVE one section at north to create entrance.
    const ring = new THREE.Group();
    ring.name = "HubRingWalls";
    hub.add(ring);

    function addWallBlock(x,z, ry, w){
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, WALL_T), MAT_WALL);
      wall.position.set(x, WALL_H/2, z);
      wall.rotation.y = ry;
      ring.add(wall);

      const trimLow = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, 0.18), MAT_TRIM);
      trimLow.position.set(x, 0.22, z);
      trimLow.rotation.y = ry;
      ring.add(trimLow);

      const trimHigh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, 0.18), MAT_TRIM2);
      trimHigh.position.set(x, WALL_H - 0.35, z);
      trimHigh.rotation.y = ry;
      ring.add(trimHigh);
    }

    // SOUTH (back wall) — this fixes “missing back wall”
    addWallBlock(0,  HUB_R, 0, 24);

    // EAST / WEST
    addWallBlock( HUB_R, 0, Math.PI/2, 24);
    addWallBlock(-HUB_R, 0, Math.PI/2, 24);

    // NORTH wall is split into two with a gap entrance in the middle
    const ENTRANCE_W = 8.0;
    const sideW = (24 - ENTRANCE_W) / 2;
    addWallBlock(- (ENTRANCE_W/2 + sideW/2), -HUB_R, 0, sideW);
    addWallBlock(  (ENTRANCE_W/2 + sideW/2), -HUB_R, 0, sideW);

    // HALLWAY NORTH only (one main entrance)
    const HALL_L = 20;
    const HALL_W = 8.5;
    const HALL_H = 6.4;

    const hall = new THREE.Group();
    hall.name = "Hall_N";

    const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(HALL_W, 0.06, HALL_L), MAT_FLOOR);
    hallFloor.position.set(0, -0.04, -HUB_R - HALL_L/2);
    hall.add(hallFloor);

    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.5, HALL_H, HALL_L), MAT_WALL);
    wallL.position.set(-HALL_W/2, HALL_H/2, -HUB_R - HALL_L/2);
    hall.add(wallL);

    const wallR = wallL.clone();
    wallR.position.x = +HALL_W/2;
    hall.add(wallR);

    const hallTrim = new THREE.Mesh(new THREE.BoxGeometry(HALL_W, 0.22, HALL_L), MAT_TRIM);
    hallTrim.position.set(0, HALL_H - 0.35, -HUB_R - HALL_L/2);
    hall.add(hallTrim);

    root.add(hall);

    // SUNK PIT
    const PIT_R = 7.2;
    const PIT_DEPTH = 2.4;

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(PIT_R, PIT_R, PIT_DEPTH, 64, 1, true),
      MAT_PIT
    );
    pitWall.position.y = -PIT_DEPTH/2;
    hub.add(pitWall);

    const pitBottom = new THREE.Mesh(
      new THREE.CylinderGeometry(PIT_R, PIT_R, 0.06, 64),
      MAT_PIT
    );
    pitBottom.position.y = -PIT_DEPTH;
    hub.add(pitBottom);

    // rails
    const rimRail = new THREE.Mesh(
      new THREE.TorusGeometry(PIT_R + 0.25, 0.08, 12, 90),
      MAT_TRIM2
    );
    rimRail.rotation.x = Math.PI/2;
    rimRail.position.y = 0.90;
    rimRail.name = "PitRimRail";
    hub.add(rimRail);

    const outerRail = new THREE.Mesh(
      new THREE.TorusGeometry(HUB_R - 1.45, 0.10, 14, 110),
      MAT_TRIM
    );
    outerRail.rotation.x = Math.PI/2;
    outerRail.position.y = 1.00;
    outerRail.name = "OuterRail";
    hub.add(outerRail);

    // BossTable anchor + visible table (guaranteed)
    const boss = new THREE.Group();
    boss.name = "BossTable";
    boss.position.set(0, -PIT_DEPTH + 0.15, 0);
    hub.add(boss);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(5.7, 5.7, 0.35, 56), MAT_TABLE);
    top.position.y = 0.95;
    boss.add(top);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.4, 1.4, 32), mkMat(0x1b2034, 0.05));
    base.position.y = 0.35;
    boss.add(base);

    // Teleporter prop placed SOUTH inside hub (you should NOT face it)
    const tp = new THREE.Group();
    tp.name = "TeleportMachine";
    tp.position.set(0, 0, HUB_R - 3.0);
    hub.add(tp);

    const tpRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 10, 40), MAT_TRIM);
    tpRing.rotation.x = Math.PI/2;
    tpRing.position.y = 0.9;
    tp.add(tpRing);

    const tpCore = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.2, 18), MAT_TRIM2);
    tpCore.position.y = 0.6;
    tp.add(tpCore);

    // Simple “jumbotron” placeholder (north above entrance)
    const jumbo = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 4),
      new THREE.MeshBasicMaterial({ color: 0x0a1020, transparent:true, opacity:0.90 })
    );
    jumbo.position.set(0, 6.0, -HUB_R + 0.9);
    jumbo.rotation.y = Math.PI;
    jumbo.name = "Jumbotron_N";
    hub.add(jumbo);

    // Spawn further back in hallway so you walk into hub (and face table)
    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, -HUB_R - 16);
    root.add(sp);

    log?.("[world] v4.3 built ✅ (grid visible + one entrance + table guaranteed)");
  },

  update(ctx, dt){
    const tp = ctx.scene.getObjectByName("TeleportMachine");
    if (tp?.children?.[0]) tp.children[0].rotation.z += dt * 0.9;
  }
};
