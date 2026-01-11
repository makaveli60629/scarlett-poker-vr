// /js/world.js — Scarlett World v5.3 (BEAUTY + WATCH MODE)
// Keeps the hub/pit/neon/jumbos, then tries to attach: table + bots + poker_sim safely.

async function safeImport(path, log, err){
  try { const m = await import(path); log("import ok:", path); return m; }
  catch(e){ err("import fail:", path, String(e?.stack||e)); return null; }
}

export const World = {
  async init({ THREE, scene, renderer, camera, player, controllers, log, BUILD }) {
    const err = (...a) => (window.SCARLETT?.err ? window.SCARLETT.err(...a) : console.error(...a));

    const root = new THREE.Group();
    root.name = "WorldRoot";
    scene.add(root);

    // ---------- LIGHTING (NEVER DARK) ----------
    root.add(new THREE.HemisphereLight(0xbfd9ff, 0x090a14, 1.15));
    root.add(new THREE.AmbientLight(0xffffff, 0.55));

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

    const Y0 = 0;
    const HUB_R = 18;
    const WALL_H = 7.5;

    // ---------- GRID (thin) ----------
    const grid = new THREE.GridHelper(120, 120, 0x1d2a44, 0x101626);
    grid.position.y = Y0 + 0.01;
    root.add(grid);

    // ---------- CIRCLE FLOOR ----------
    const circleFloor = new THREE.Mesh(new THREE.CircleGeometry(HUB_R, 96), matFloor);
    circleFloor.rotation.x = -Math.PI / 2;
    circleFloor.position.y = Y0;
    circleFloor.userData.isFloor = true;
    circleFloor.userData.teleportable = true;
    root.add(circleFloor);

    // ---------- HUB WALL RING ----------
    const wallRing = new THREE.Mesh(new THREE.CylinderGeometry(HUB_R, HUB_R, WALL_H, 96, 1, true), matWall);
    wallRing.position.y = Y0 + WALL_H / 2;
    root.add(wallRing);

    const trimTop = new THREE.Mesh(new THREE.TorusGeometry(HUB_R - 0.25, 0.12, 14, 110), matTrim);
    trimTop.rotation.x = Math.PI / 2;
    trimTop.position.y = Y0 + WALL_H - 0.35;
    root.add(trimTop);

    const trimBottom = new THREE.Mesh(new THREE.TorusGeometry(HUB_R - 0.25, 0.14, 14, 110), matTrim);
    trimBottom.rotation.x = Math.PI / 2;
    trimBottom.position.y = Y0 + 0.10;
    root.add(trimBottom);

    // ---------- ONE MAIN ENTRANCE (+Z) ----------
    const entranceZ = HUB_R - 0.2;
    const pillarGeo = new THREE.BoxGeometry(1.2, WALL_H, 1.2);

    const pL = new THREE.Mesh(pillarGeo, matWall); pL.position.set(-4.5, Y0 + WALL_H/2, entranceZ); root.add(pL);
    const pR = new THREE.Mesh(pillarGeo, matWall); pR.position.set( 4.5, Y0 + WALL_H/2, entranceZ); root.add(pR);

    const glowStripGeo = new THREE.BoxGeometry(0.22, WALL_H - 0.3, 0.22);
    const gL = new THREE.Mesh(glowStripGeo, matTrim); gL.position.set(-4.5, Y0 + (WALL_H/2), entranceZ + 0.62); root.add(gL);
    const gR = new THREE.Mesh(glowStripGeo, matTrim); gR.position.set( 4.5, Y0 + (WALL_H/2), entranceZ + 0.62); root.add(gR);

    // ---------- HALLWAY ----------
    const hallW = 8.5, hallL = 10.0, hallH = 6.2;
    const hall = new THREE.Group();
    hall.position.set(0, 0, HUB_R - 0.5);
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

    const hallLight1 = new THREE.PointLight(0x7fe7ff, 1.1, 22, 2.4);
    hallLight1.position.set(-2.6, 4.2, hallL * 0.35);
    hall.add(hallLight1);

    const hallLight2 = new THREE.PointLight(0xff2d7a, 1.0, 22, 2.4);
    hallLight2.position.set( 2.6, 4.2, hallL * 0.65);
    hall.add(hallLight2);

    // ---------- SUNK PIT ----------
    const pitR = 8.8;
    const pitDepth = 1.6;
    const pitY = Y0 - pitDepth;

    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitR, 80), matFloor);
    pitFloor.rotation.x = -Math.PI/2;
    pitFloor.position.y = pitY;
    pitFloor.userData.isFloor = true;
    pitFloor.userData.teleportable = true;
    root.add(pitFloor);

    const pitWall = new THREE.Mesh(new THREE.CylinderGeometry(pitR, pitR, pitDepth, 80, 1, true), matWall);
    pitWall.position.y = pitY + pitDepth/2;
    root.add(pitWall);

    const pitLip = new THREE.Mesh(new THREE.TorusGeometry(pitR, 0.12, 14, 100), matTrim);
    pitLip.rotation.x = Math.PI/2;
    pitLip.position.y = Y0 + 0.05;
    root.add(pitLip);

    const railR = pitR + 0.45;
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(railR, 0.08, 12, 120),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, metalness: 0.8, roughness: 0.22, emissive: new THREE.Color(0x7fe7ff), emissiveIntensity: 0.25 })
    );
    rail.rotation.x = Math.PI/2;
    rail.position.y = Y0 + 0.95;
    root.add(rail);

    // ---------- Placeholders ----------
    const BossTable = new THREE.Group();
    BossTable.name = "BossTable";
    BossTable.position.set(0, pitY + 0.25, 0);
    root.add(BossTable);

    const tableGlow = new THREE.PointLight(0xffffff, 1.2, 14, 2);
    tableGlow.position.set(0, pitY + 2.8, 0);
    root.add(tableGlow);

    // ---------- TELEPORTER (behind you) ----------
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

    // ---------- Neon signage (stable geometry bars) ----------
    function neonLabel(text, x, z, mat) {
      const g = new THREE.Group();
      g.position.set(x, Y0 + 4.6, z);

      const back = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.1, 0.22), new THREE.MeshStandardMaterial({
        color: 0x060812, metalness: 0.4, roughness: 0.6
      }));
      g.add(back);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.26), mat);
      bar.position.y = 0.18; g.add(bar);

      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.16, 0.26), mat);
      bar2.position.y = -0.18; g.add(bar2);

      const stroke = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.30), mat);
      stroke.position.y = 0.0; g.add(stroke);

      g.userData.label = text;
      return g;
    }

    const pokerSign = neonLabel("POKER", 0, 6.8, matNeonAqua);
    pokerSign.rotation.y = Math.PI;
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

    // ---------- Jumbotrons ----------
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

      return g;
    }
    root.add(jumbotron( 0,  HUB_R - 2.4, Math.PI));
    root.add(jumbotron( 0, -HUB_R + 2.4, 0));
    root.add(jumbotron( HUB_R - 2.4, 0, -Math.PI/2));
    root.add(jumbotron(-HUB_R + 2.4, 0,  Math.PI/2));

    // ---------- Spawn (3 blocks back, face table) ----------
    player.position.set(0, 0, HUB_R + 8.0);
    const target = new THREE.Vector3(0, Y0 + 1.2, 0);
    const look = new THREE.Vector3().subVectors(target, player.position);
    player.rotation.y = Math.atan2(look.x, look.z);

    // ---------- ATTACH REAL TABLE + BOTS + POKER SIM (SAFE) ----------
    // We try several filenames you have in your folder.
    const v = Date.now();
    const bossTableMod = await safeImport(`./boss_table.js?v=${v}`, log, err);
    const tableFactoryMod = await safeImport(`./table_factory.js?v=${v}`, log, err);
    const botsMod = await safeImport(`./bots.js?v=${v}`, log, err);
    const pokerSimMod = await safeImport(`./poker_sim.js?v=${v}`, log, err);

    // Table: prefer BossTable builder, else TableFactory, else keep placeholder
    try {
      if (bossTableMod?.BossTable?.create) {
        const t = await bossTableMod.BossTable.create({ THREE });
        BossTable.add(t);
        log("[table] BossTable.create ✅");
      } else if (tableFactoryMod?.TableFactory?.create) {
        // If your factory needs params, we pass minimal and let it default.
        const t = await tableFactoryMod.TableFactory.create({ THREE, seats: 8, shape: "round" });
        BossTable.add(t);
        log("[table] TableFactory.create ✅ seats=8");
      } else {
        // simple visible placeholder top so you ALWAYS see something
        const top = new THREE.Mesh(
          new THREE.CylinderGeometry(3.9, 4.2, 0.35, 64),
          new THREE.MeshStandardMaterial({ color: 0x0f1630, roughness: 0.35, metalness: 0.45, emissive: new THREE.Color(0x0b1225), emissiveIntensity: 0.25 })
        );
        top.position.y = 0.9;
        BossTable.add(top);
        log("[table] placeholder ✅");
      }
    } catch (e) {
      err("[table] attach failed", String(e?.stack || e));
    }

    // Bots + PokerSim: start “watch mode”
    // We do *not* assume your APIs; we attempt common init patterns.
    const ctx = { THREE, scene, root, camera, player, controllers, log };

    try {
      // Bots
      let bots = null;
      if (botsMod?.Bots?.init) {
        bots = await botsMod.Bots.init({ THREE, scene: root, world: { root }, player, camera, log });
        log("[bots] Bots.init ✅");
      } else if (botsMod?.default?.init) {
        bots = await botsMod.default.init({ THREE, scene: root, world: { root }, player, camera, log });
        log("[bots] default.init ✅");
      } else {
        log("[bots] (skipped) no init export found");
      }

      // PokerSim
      if (pokerSimMod?.PokerSim?.init) {
        await pokerSimMod.PokerSim.init({
          THREE, scene: root, world: { root, targets: { BossTable } },
          table: BossTable,
          bots,
          mode: "spectate",
          log
        });
        log("[poker] PokerSim.init ✅ spectate");
      } else {
        log("[poker] (skipped) PokerSim.init not found");
      }
    } catch (e) {
      err("[watch] bots/poker attach failed", String(e?.stack || e));
    }

    // ---------- Final ----------
    log(`[world] v5.3 built ✅ BEAUTY + WATCH MODE`);
    log(`Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    log(`Facing target ✅ (BossTable)`);

    this.root = root;
    this.targets = { BossTable, Teleporter: tp };
  }
};
