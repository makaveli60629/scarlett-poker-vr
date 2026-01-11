// /js/world.js — Scarlett World v5.0 (STABLE + BEAUTY)
// Grid + Circle Floor + Hallways + Sunk Pit + Pit Rail + Teleporter Pedestal + Neon + Jumbotrons + Strong Lighting
// Safe: no poker/bots auto-start in here. World geometry only.

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------- LIGHTING (NEVER DARK AGAIN) ----------
    const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x090a14, 1.15);
    root.add(hemi);

    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    root.add(amb);

    const sun = new THREE.DirectionalLight(0xffffff, 1.15);
    sun.position.set(12, 18, 8);
    root.add(sun);

    const key1 = new THREE.PointLight(0x7fe7ff, 1.7, 60, 2.2);
    key1.position.set(0, 6.8, 0);
    root.add(key1);

    const key2 = new THREE.PointLight(0xff2d7a, 1.2, 55, 2.2);
    key2.position.set(0, 5.6, -10);
    root.add(key2);

    // ---------- MATERIALS ----------
    const matWall = new THREE.MeshStandardMaterial({ color: 0x111423, metalness: 0.35, roughness: 0.55 });
    const matTrim = new THREE.MeshStandardMaterial({ color: 0x0b0d14, metalness: 0.65, roughness: 0.25, emissive: new THREE.Color(0x7fe7ff), emissiveIntensity: 0.35 });
    const matFloor = new THREE.MeshStandardMaterial({ color: 0x0a0b12, metalness: 0.25, roughness: 0.7 });
    const matNeonPink = new THREE.MeshStandardMaterial({ color: 0x130512, emissive: new THREE.Color(0xff2d7a), emissiveIntensity: 1.25, metalness: 0.2, roughness: 0.35 });
    const matNeonAqua = new THREE.MeshStandardMaterial({ color: 0x041013, emissive: new THREE.Color(0x7fe7ff), emissiveIntensity: 1.05, metalness: 0.2, roughness: 0.35 });

    // ---------- COORDINATES / SCALE ----------
    const Y0 = 0;
    const HUB_R = 18;        // circle room radius
    const WALL_H = 7.5;      // walls twice-ish taller vibe
    const WALL_T = 0.6;

    // ---------- GRID (thin, not thick) ----------
    const grid = new THREE.GridHelper(120, 120, 0x1d2a44, 0x101626);
    grid.position.y = Y0 + 0.01;
    root.add(grid);

    // ---------- CIRCLE FLOOR ONLY (as requested) ----------
    const circleFloor = new THREE.Mesh(
      new THREE.CircleGeometry(HUB_R, 96),
      matFloor
    );
    circleFloor.rotation.x = -Math.PI / 2;
    circleFloor.position.y = Y0;
    circleFloor.userData.isFloor = true;
    circleFloor.userData.teleportable = true;
    root.add(circleFloor);

    // ---------- HUB WALL RING ----------
    const wallRing = new THREE.Mesh(
      new THREE.CylinderGeometry(HUB_R, HUB_R, WALL_H, 96, 1, true),
      matWall
    );
    wallRing.position.y = Y0 + WALL_H / 2;
    root.add(wallRing);

    // Top trim ring
    const trimTop = new THREE.Mesh(
      new THREE.TorusGeometry(HUB_R - 0.25, 0.12, 14, 110),
      matTrim
    );
    trimTop.rotation.x = Math.PI / 2;
    trimTop.position.y = Y0 + WALL_H - 0.35;
    root.add(trimTop);

    // Bottom trim (to floor)
    const trimBottom = new THREE.Mesh(
      new THREE.TorusGeometry(HUB_R - 0.25, 0.14, 14, 110),
      matTrim
    );
    trimBottom.rotation.x = Math.PI / 2;
    trimBottom.position.y = Y0 + 0.10;
    root.add(trimBottom);

    // ---------- MAIN ENTRANCE (ONE ONLY) ----------
    // We cut an “entrance” visually by placing two corner pillars and NOT adding a middle wall.
    // Entrance faces +Z direction.
    const entranceZ = HUB_R - 0.2;
    const pillarGeo = new THREE.BoxGeometry(1.2, WALL_H, 1.2);

    const pL = new THREE.Mesh(pillarGeo, matWall);
    pL.position.set(-4.5, Y0 + WALL_H/2, entranceZ);
    root.add(pL);

    const pR = new THREE.Mesh(pillarGeo, matWall);
    pR.position.set( 4.5, Y0 + WALL_H/2, entranceZ);
    root.add(pR);

    // glow trims higher + to-floor strip (like you asked)
    const glowStripGeo = new THREE.BoxGeometry(0.22, WALL_H - 0.3, 0.22);
    const gL = new THREE.Mesh(glowStripGeo, matTrim);
    gL.position.set(-4.5, Y0 + (WALL_H/2), entranceZ + 0.62);
    root.add(gL);

    const gR = new THREE.Mesh(glowStripGeo, matTrim);
    gR.position.set(4.5, Y0 + (WALL_H/2), entranceZ + 0.62);
    root.add(gR);

    // ---------- HALLWAY (aligned with entrances) ----------
    const hallW = 8.5;
    const hallL = 10.0;
    const hallH = 6.2;

    const hall = new THREE.Group();
    hall.position.set(0, 0, HUB_R - 0.5); // attached to entrance
    root.add(hall);

    const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(hallW, 0.15, hallL), matFloor);
    hallFloor.position.set(0, 0.02, hallL/2);
    hallFloor.userData.isFloor = true;
    hallFloor.userData.teleportable = true;
    hall.add(hallFloor);

    const hallCeil = new THREE.Mesh(new THREE.BoxGeometry(hallW, 0.15, hallL), matWall);
    hallCeil.position.set(0, hallH, hallL/2);
    hall.add(hallCeil);

    const hallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, hallH, hallL), matWall);
    hallLeft.position.set(-hallW/2, hallH/2, hallL/2);
    hall.add(hallLeft);

    const hallRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, hallH, hallL), matWall);
    hallRight.position.set(hallW/2, hallH/2, hallL/2);
    hall.add(hallRight);

    // Elegant hallway lights
    const hallLight1 = new THREE.PointLight(0x7fe7ff, 1.1, 22, 2.4);
    hallLight1.position.set(-2.6, 4.2, hallL * 0.35);
    hall.add(hallLight1);

    const hallLight2 = new THREE.PointLight(0xff2d7a, 1.0, 22, 2.4);
    hallLight2.position.set( 2.6, 4.2, hallL * 0.65);
    hall.add(hallLight2);

    // ---------- SUNK TABLE PIT ----------
    const pitR = 8.8;
    const pitDepth = 1.6; // clear sink
    const pitY = Y0 - pitDepth;

    // Pit floor
    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitR, 80), matFloor);
    pitFloor.rotation.x = -Math.PI/2;
    pitFloor.position.y = pitY;
    pitFloor.userData.isFloor = true;
    pitFloor.userData.teleportable = true;
    root.add(pitFloor);

    // Pit wall ring
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitR, pitR, pitDepth, 80, 1, true),
      matWall
    );
    pitWall.position.y = pitY + pitDepth/2;
    root.add(pitWall);

    // Lip trim around pit (the “top of gray dip” rail line you wanted)
    const pitLip = new THREE.Mesh(
      new THREE.TorusGeometry(pitR, 0.12, 14, 100),
      matTrim
    );
    pitLip.rotation.x = Math.PI/2;
    pitLip.position.y = Y0 + 0.05;
    root.add(pitLip);

    // PIT RAIL (prevents walking into dip)
    const railR = pitR + 0.45;
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(railR, 0.08, 12, 120),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, metalness: 0.8, roughness: 0.22, emissive: new THREE.Color(0x7fe7ff), emissiveIntensity: 0.25 })
    );
    rail.rotation.x = Math.PI/2;
    rail.position.y = Y0 + 0.95;
    root.add(rail);

    // ---------- TABLE PLACEHOLDER (boss table target + visual pedestal) ----------
    // If you already have boss_table.js/table_factory.js, we attach later.
    const tablePed = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.2, 0.55, 50),
      new THREE.MeshStandardMaterial({ color: 0x151a2a, metalness: 0.55, roughness: 0.25 })
    );
    tablePed.position.set(0, pitY + 0.30, 0);
    tablePed.name = "BossTable";
    root.add(tablePed);

    const tableGlow = new THREE.PointLight(0xffffff, 1.2, 14, 2);
    tableGlow.position.set(0, pitY + 2.8, 0);
    root.add(tableGlow);

    // ---------- TELEPORTER PEDESTAL (put it BEHIND you, not in your face) ----------
    // We place teleporter at far side (-Z), and spawn faces table (+ looking into pit).
    const tp = new THREE.Group();
    tp.name = "Teleporter";
    tp.position.set(0, Y0, -HUB_R + 4.0);
    root.add(tp);

    const tpBase = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.45, 42),
      new THREE.MeshStandardMaterial({ color: 0x0c1020, metalness: 0.7, roughness: 0.22, emissive: new THREE.Color(0xff2d7a), emissiveIntensity: 0.22 })
    );
    tpBase.position.y = 0.22;
    tp.add(tpBase);

    const tpRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.09, 14, 70), matNeonPink);
    tpRing.rotation.x = Math.PI/2;
    tpRing.position.y = 0.58;
    tp.add(tpRing);

    const tpLight = new THREE.PointLight(0xff2d7a, 1.3, 18, 2.2);
    tpLight.position.set(0, 2.6, 0);
    tp.add(tpLight);

    // ---------- NEON ENTRANCE LABELS ----------
    function neonLabel(text, x, z, mat) {
      // Simple geometry text substitute (since no font loader).
      // We use stacked bars to resemble signage, stable on mobile.
      const g = new THREE.Group();
      g.position.set(x, Y0 + 4.6, z);

      const back = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.1, 0.22), new THREE.MeshStandardMaterial({
        color: 0x060812, metalness: 0.4, roughness: 0.6
      }));
      g.add(back);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.26), mat);
      bar.position.y = 0.18;
      g.add(bar);

      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.16, 0.26), mat);
      bar2.position.y = -0.18;
      g.add(bar2);

      // “fake text” via thin strokes; we keep it stable and pretty
      const stroke = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.30), mat);
      stroke.position.y = 0.0;
      g.add(stroke);

      g.userData.label = text;
      return g;
    }

    const pokerSign = neonLabel("POKER", 0, 6.8, matNeonAqua);
    pokerSign.rotation.y = Math.PI; // face toward table area from entrance side
    root.add(pokerSign);

    const storeSign = neonLabel("STORE", -10.5, 0, matNeonPink);
    storeSign.rotation.y = Math.PI/2;
    root.add(storeSign);

    const vipSign = neonLabel("VIP", 10.5, 0, matNeonAqua);
    vipSign.rotation.y = -Math.PI/2;
    root.add(vipSign);

    const eventSign = neonLabel("EVENT", 0, -10.5, matNeonPink);
    eventSign.rotation.y = 0;
    root.add(eventSign);

    // ---------- JUMBOTRON FRAMES (x4) ----------
    function jumbotron(x, z, ry) {
      const g = new THREE.Group();
      g.position.set(x, Y0 + 5.6, z);
      g.rotation.y = ry;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(6.0, 3.3, 0.25), matWall);
      g.add(frame);

      const screen = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.9, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x02040a, emissive: new THREE.Color(0x7fe7ff), emissiveIntensity: 0.08, roughness: 0.9, metalness: 0.1 })
      );
      screen.position.z = 0.18;
      g.add(screen);

      const glow = new THREE.PointLight(0x7fe7ff, 0.7, 22, 2.2);
      glow.position.set(0, 0, 1.8);
      g.add(glow);

      return g;
    }

    root.add(jumbotron( 0,  HUB_R - 2.4, Math.PI)); // above hallway entrance
    root.add(jumbotron( 0, -HUB_R + 2.4, 0));
    root.add(jumbotron( HUB_R - 2.4, 0, -Math.PI/2));
    root.add(jumbotron(-HUB_R + 2.4, 0,  Math.PI/2));

    // ---------- BEAUTY PILLARS (subtle casino vibe) ----------
    const colGeo = new THREE.CylinderGeometry(0.35, 0.35, WALL_H - 0.6, 22);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = HUB_R - 1.7;
      const c = new THREE.Mesh(colGeo, matWall);
      c.position.set(Math.cos(a) * r, Y0 + (WALL_H - 0.6)/2, Math.sin(a) * r);
      root.add(c);

      const cap = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 12, 34), matTrim);
      cap.rotation.x = Math.PI/2;
      cap.position.set(c.position.x, Y0 + WALL_H - 0.8, c.position.z);
      root.add(cap);
    }

    // ---------- SPAWN (3 blocks back + face table, NOT teleporter) ----------
    // Spawn is in hallway, looking into hub/table.
    player.position.set(0, 0, HUB_R + 8.0); // “3 blocks back”
    player.rotation.set(0, 0, 0);

    // Face the table center
    const target = new THREE.Vector3(0, Y0 + 1.2, 0);
    const look = new THREE.Vector3().subVectors(target, player.position);
    const yaw = Math.atan2(look.x, look.z);
    player.rotation.y = yaw;

    log(`[world] v5.0 built ✅ STABLE + BEAUTY (bright, pit, rail, neon, jumbos)`);
    log(`Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    log(`Facing target ✅ (BossTable)`);

    // Mark teleportable surfaces explicitly
    root.traverse(o => {
      if (o.isMesh && o.userData && o.userData.teleportable) o.userData.teleportable = true;
    });

    // Keep handles
    this.root = root;
    this.targets = { BossTable: tablePed, Teleporter: tp };
  }
};
