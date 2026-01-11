// /js/world.js — Scarlett WORLD v4.2 (HUB + HALLWAYS + SUNK PIT + RAILS + BRIGHT TRIMS)
// Safe geometry-only build. No dependency on any optional deleted modules.

export const World = {
  async init(ctx){
    const { THREE, scene, log } = ctx;

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---- helpers ----
    const mkMat = (c, emiss=0) => new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.75,
      metalness: 0.05,
      emissive: emiss ? new THREE.Color(c) : new THREE.Color(0x000000),
      emissiveIntensity: emiss
    });

    const MAT_WALL  = mkMat(0x151a26, 0.10);
    const MAT_TRIM  = mkMat(0x7fe7ff, 1.15);
    const MAT_TRIM2 = mkMat(0xff2d7a, 1.05);
    const MAT_FLOOR = mkMat(0x0d1018, 0.05);
    const MAT_PIT   = mkMat(0x0b0d14, 0.07);

    // ---- GRID FLOOR (debug) ----
    const grid = new THREE.GridHelper(220, 220, 0x2a2f44, 0x141827);
    grid.position.y = 0.001;
    grid.name = "Grid";
    root.add(grid);

    // ---- HUB DIMENSIONS ----
    const HUB_R = 16;
    const WALL_H = 8.0;      // “twice as big” feel
    const WALL_T = 0.7;

    const hub = new THREE.Group();
    hub.name = "Hub";
    root.add(hub);

    const hubCenter = new THREE.Object3D();
    hubCenter.name = "HubCenter";
    hub.add(hubCenter);

    // ---- CIRCULAR FLOOR (ONLY in hub as you requested earlier; grid remains visible) ----
    const hubFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(HUB_R - 0.4, HUB_R - 0.4, 0.18, 64),
      MAT_FLOOR
    );
    hubFloor.position.y = 0.09;
    hubFloor.name = "HubFloor";
    hub.add(hubFloor);

    // ---- HUB WALL RING with 4 entrances (N/E/S/W) ----
    // We build the ring as 4 curved segments with gaps centered on axes.
    const ring = new THREE.Group();
    ring.name = "HubRingWalls";
    hub.add(ring);

    const ENTRANCE_W = 7.4; // single entrance (no “two doors + middle wall”)
    const gapAngle = ENTRANCE_W / HUB_R; // approx

    function addArcWall(a0, a1){
      const mid = (a0 + a1) * 0.5;
      const arcLen = (a1 - a0) * HUB_R;
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(arcLen, WALL_H, WALL_T),
        MAT_WALL
      );
      // place and rotate around ring
      wall.position.set(Math.sin(mid) * HUB_R, WALL_H/2, Math.cos(mid) * HUB_R);
      wall.rotation.y = mid;
      ring.add(wall);

      // trims: one near floor, one near top
      const trimLow = new THREE.Mesh(
        new THREE.BoxGeometry(arcLen, 0.22, 0.18),
        MAT_TRIM
      );
      trimLow.position.copy(wall.position);
      trimLow.position.y = 0.22;
      trimLow.rotation.copy(wall.rotation);
      ring.add(trimLow);

      const trimHigh = new THREE.Mesh(
        new THREE.BoxGeometry(arcLen, 0.22, 0.18),
        MAT_TRIM2
      );
      trimHigh.position.copy(wall.position);
      trimHigh.position.y = WALL_H - 0.35;
      trimHigh.rotation.copy(wall.rotation);
      ring.add(trimHigh);
    }

    // Build 4 segments between the 4 gaps (N, E, S, W)
    // Gaps centered at 0 (north), pi/2 (east), pi (south), -pi/2 (west)
    const gaps = [0, Math.PI/2, Math.PI, -Math.PI/2];
    const sorted = gaps.map(a => (a + Math.PI*2) % (Math.PI*2)).sort((a,b)=>a-b);

    for (let i=0;i<sorted.length;i++){
      const g = sorted[i];
      const gNext = sorted[(i+1)%sorted.length] + (i===sorted.length-1 ? Math.PI*2 : 0);
      const a0 = g + gapAngle/2;
      const a1 = gNext - gapAngle/2;
      addArcWall(a0, a1);
    }

    // ---- HALLWAYS (N/E/S/W) aligned & guaranteed above ground ----
    const HALL_L = 18;
    const HALL_W = 8.0;
    const HALL_H = 6.2;

    function buildHall(name, dirX, dirZ){
      const g = new THREE.Group();
      g.name = name;

      // floor
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(HALL_W, 0.18, HALL_L),
        MAT_FLOOR
      );
      floor.position.set(dirX*(HUB_R + HALL_L/2), 0.09, dirZ*(HUB_R + HALL_L/2));
      g.add(floor);

      // walls
      const wallL = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, HALL_H, HALL_L),
        MAT_WALL
      );
      wallL.position.set(
        dirX*(HUB_R + HALL_L/2) + (dirZ*1.0 + dirX*0.0) * (HALL_W/2),
        HALL_H/2,
        dirZ*(HUB_R + HALL_L/2) + (-dirX*1.0 + dirZ*0.0) * (HALL_W/2)
      );
      wallL.rotation.y = Math.atan2(dirX, dirZ);
      g.add(wallL);

      const wallR = wallL.clone();
      wallR.position.x -= (dirZ*1.0) * HALL_W;
      wallR.position.z -= (-dirX*1.0) * HALL_W;
      g.add(wallR);

      // ceiling trims (soft light)
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(HALL_W, 0.22, HALL_L),
        MAT_TRIM
      );
      trim.position.set(dirX*(HUB_R + HALL_L/2), HALL_H - 0.35, dirZ*(HUB_R + HALL_L/2));
      g.add(trim);

      root.add(g);
    }

    buildHall("Hall_N", 0, -1);
    buildHall("Hall_S", 0,  1);
    buildHall("Hall_E", 1,  0);
    buildHall("Hall_W",-1,  0);

    // ---- SUNK PIT (table goes DOWN) ----
    const PIT_R = 7.0;
    const PIT_DEPTH = 2.2;

    // pit “hole” volume (visual)
    const pit = new THREE.Mesh(
      new THREE.CylinderGeometry(PIT_R, PIT_R, PIT_DEPTH, 64, 1, true),
      MAT_PIT
    );
    pit.position.y = -PIT_DEPTH/2 + 0.09;
    pit.name = "Pit";
    hub.add(pit);

    // pit bottom
    const pitBottom = new THREE.Mesh(
      new THREE.CylinderGeometry(PIT_R, PIT_R, 0.18, 64),
      MAT_PIT
    );
    pitBottom.position.y = -PIT_DEPTH + 0.09;
    hub.add(pitBottom);

    // rim rail (prevents walking into the dip)
    const rimRail = new THREE.Mesh(
      new THREE.TorusGeometry(PIT_R + 0.25, 0.08, 12, 90),
      MAT_TRIM2
    );
    rimRail.rotation.x = Math.PI/2;
    rimRail.position.y = 0.95;
    rimRail.name = "PitRimRail";
    hub.add(rimRail);

    // outer “spectator” rail ring
    const outerRail = new THREE.Mesh(
      new THREE.TorusGeometry(HUB_R - 1.4, 0.10, 14, 110),
      MAT_TRIM
    );
    outerRail.rotation.x = Math.PI/2;
    outerRail.position.y = 1.05;
    outerRail.name = "OuterRail";
    hub.add(outerRail);

    // ---- BOSS TABLE placeholder anchor (your real table module can replace this later) ----
    const boss = new THREE.Group();
    boss.name = "BossTable";
    boss.position.set(0, -PIT_DEPTH + 0.45, 0);
    hub.add(boss);

    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.2, 0.45, 48),
      mkMat(0x123032, 0.12)
    );
    tableTop.position.y = 0.85;
    boss.add(tableTop);

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 2.2, 1.2, 32),
      mkMat(0x20263a, 0.08)
    );
    tableBase.position.y = 0.35;
    boss.add(tableBase);

    // ---- TELEPORT MACHINE prop (for visuals) ----
    const tp = new THREE.Group();
    tp.name = "TeleportMachine";
    tp.position.set(0, 0, HUB_R - 3.0); // south side inside hub
    hub.add(tp);

    const tpRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.12, 10, 40),
      MAT_TRIM
    );
    tpRing.rotation.x = Math.PI/2;
    tpRing.position.y = 0.9;
    tp.add(tpRing);

    const tpCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 1.2, 18),
      MAT_TRIM2
    );
    tpCore.position.y = 0.6;
    tp.add(tpCore);

    // ---- ENTRANCE LABELS (simple 3D placards) ----
    function addLabel(text, x,z, ry){
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 128;
      const g = canvas.getContext("2d");
      g.fillStyle = "rgba(10,12,18,0.0)";
      g.clearRect(0,0,canvas.width,canvas.height);
      g.font = "900 64px system-ui, Arial";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#7fe7ff";
      g.shadowColor = "#7fe7ff";
      g.shadowBlur = 18;
      g.fillText(text, canvas.width/2, canvas.height/2);

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.8), mat);
      plane.position.set(x, 5.2, z);
      plane.rotation.y = ry;
      root.add(plane);
    }

    addLabel("STORE", -HUB_R - 8, 0, Math.PI/2);
    addLabel("EVENTS",  HUB_R + 8, 0, -Math.PI/2);
    addLabel("VIP",     0, -HUB_R - 10, 0);
    addLabel("POKER",   0,  HUB_R + 10, Math.PI);

    // ---- SPAWN POINT (move back 3 grid blocks, in south hallway approach) ----
    const sp = new THREE.Object3D();
    sp.name = "SpawnPoint";
    sp.position.set(0, 0, HUB_R + 18); // further back so welcome HUD can be in view
    root.add(sp);

    // ---- extra light fixtures around hub for “elegant” feel ----
    const ringLight = new THREE.PointLight(0xffffff, 1.2, 60);
    ringLight.position.set(0, 7.5, 0);
    hub.add(ringLight);

    log?.("[world] v4.2 built ✅ (hub+hallways+sunk pit+rails+labels)");
  },

  update(ctx, dt){
    // optional: subtle animation on teleporter ring
    const tp = ctx.scene.getObjectByName("TeleportMachine");
    if (tp) {
      const ring = tp.children?.[0];
      if (ring) ring.rotation.z += dt * 0.9;
    }
  }
};
